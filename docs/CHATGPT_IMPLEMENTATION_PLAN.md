Events & Outbox — Implementation Checklist (v1)

Goal: emit reliable domain events without risking the respondent path. All critical gates (validation, routing, quota reserve/finalize) stay synchronous in Postgres. Events are produced via the Transactional Outbox and published to a managed bus (Kafka recommended).

0) Quick decisions

Source of truth: Postgres (sessions, answers, quotas).

Bus: Managed Kafka (Confluent/MSK/Aiven). If on GCP, Pub/Sub is fine (map concepts accordingly).

Cache: Redis for definition cache + rate limiting (never for quota truth).

Delivery semantics: At-least-once with idempotent consumers.

1) Minimal data model (add to schema.prisma)
model OutboxEvent {
  id           String   @id @default(uuid())
  tenantId     String
  surveyId     String?
  sessionId    String?
  type         String     // e.g., "session.completed"
  payload      Json       // small, self-contained
  occurredAt   DateTime   @default(now()) // event timestamp
  availableAt  DateTime   @default(now()) // next retry time
  attempts     Int        @default(0)
  lockedAt     DateTime?
  processedAt  DateTime?

  @@index([processedAt, availableAt])
  @@index([tenantId, surveyId, type])
}


Keep payload minimal (IDs + a few fields). Large blobs belong in storage, not the bus.

2) Event envelope (contract)

Every message published to the bus must follow this JSON shape:

{
  "eventId": "uuid",           // use OutboxEvent.id
  "type": "session.completed", // see list below
  "version": 1,
  "occurredAt": "ISO-8601",
  "tenantId": "t1",
  "surveyId": "s1",
  "sessionId": "sess1",
  "payload": { /* tiny, additive */ }
}


Idempotency: consumers upsert/dedupe on eventId.

Evolution: bump version only for breaking changes.

3) Topics & partition keys

Create narrow topics and choose keys that preserve ordering where it matters:

Topic	Key	Examples of type
runtime.sessions	sessionId	session.started, session.completed, session.terminated
runtime.answers	sessionId	answer.upserted (per page)
runtime.quota	bucketId	quota.reserved, quota.released, quota.finalized, quota.bucket_closed
collectors.events	collectorId	collector.opened, collector.paused, invite.consumed

Do not key by surveyId only; you’ll bottleneck a hot study into a few partitions.

4) Where to write OutboxEvent (inside the same DB tx)

Emit after you’ve mutated state (answers/quotas/sessions) and before commit:

POST /runtime/start

session.started

POST /runtime/:sessionId/answers

answer.upserted (one per page submission)

quota.reserved / quota.released (if any)

POST /runtime/:sessionId/complete

quota.finalized (for each active reservation)

session.completed

POST /runtime/:sessionId/terminate

session.terminated (+ quota.released if needed)

Collector lifecycle (authoring):

collector.opened|paused|closed, invite.consumed

Never publish to Kafka directly from the request handler. Only insert OutboxEvent rows here.

5) Outbox relay (tiny worker)

Location: services/survey-service/src/workers/outbox-relay.ts

Responsibilities:

In a loop, fetch a small batch:

SELECT ... FROM OutboxEvent WHERE processedAt IS NULL AND availableAt <= now() FOR UPDATE SKIP LOCKED LIMIT N;

Build the envelope and publish to the right topic with the right key.

On success → set processedAt=now().

On failure → increment attempts, set availableAt = now() + backoff(attempts).

After N attempts, publish to DLQ topic and mark processedAt.

Expose Prometheus metrics: fetched, published, retried, DLQ’d, lag.

One relay per service instance is fine; SKIP LOCKED prevents double processing.

6) Consumers (the first two you actually need)

realtime-dash (stateless)

Subscribes to runtime.sessions and runtime.answers.

Maintains in-memory counters and periodically writes to a cache or TSDB for dashboards.

Idempotent on eventId.

webhook-dispatcher (stateful) — optional for v1

Subscribes to all topics, fans out to per-tenant webhooks with retries.

Tracks deliveries in its own table for at-least-once semantics.

Add analytics/warehouse exporter later; you can always replay from Kafka.

7) What stays synchronous (request path)

Admission (collector window/cap, invite token, internal auth)

Page resolve & validation

Quota reserve/finalize (single atomic SQL UPDATE … WHERE gate)

Answer upsert

OutboxEvent insert (same tx)

If Kafka is down, respondents still succeed; events pile up in Outbox.

8) Operational SLOs & alerts

Relay lag: time since newest unprocessed OutboxEvent < 60s

DLQ rate: near zero; alert if > 0.1% over 5 min

Consumer lag: per topic & consumer group < threshold

Overfill safety: reservedN + filledN must never exceed targetN + maxOverfill (DB constraint + alert)

Publish success rate: > 99.9%

9) Failure semantics (cheat sheet)
Failure	What happens	Why it’s safe
Kafka down	Outbox rows accumulate; relay retries	Request path never waits on Kafka
Relay down	Outbox rows accumulate	Start another relay; resume
Consumer down	Kafka retains; no loss	Replay from offsets
Duplicate messages	Consumers dedupe on eventId	At-least-once delivery
Poison message	Relay retries → DLQ	Investigate DLQ, reprocess manually
10) Testing plan (must pass before go-live)

Load test 1k RPS page submits against a nearly full bucket; verify:

No overfill; reservations are accurate under contention

Outbox size/relay lag stay bounded

Replay drill: stop a consumer, build up lag, restart and ensure catch-up without double effects (idempotency).

Bus outage drill: stop Kafka (or block network), run 5 minutes of traffic, bring it back; relay drains all events.

Schema evolution: bump envelope version, deploy consumer first, then producer.

11) What not to do

Don’t gate quotas through Kafka/Redis. The SQL gate is the only source of truth.

Don’t publish directly to Kafka from the request handler.

Don’t dump huge payloads or PII into events; keep IDs + small fields.

Don’t key by surveyId for hot studies; use sessionId / bucketId.

12) Minimal rollout plan (1 sprint)

Add OutboxEvent model & migration.

Implement outbox-relay worker with DLQ and metrics.

Produce events at the points in §4.

Stand up Kafka (managed) with topics in §3; create consumer groups.

Build realtime-dash consumer only; verify replay & idempotency.

Add alerts & dashboards for relay lag, DLQ count, consumer lag.

Run the test battery in §10 → ship.

This design gives you:

Zero coupling between respondent latency and your event fabric.

Perfect quota correctness under burst.

Durable, replayable streams for analytics/webhooks—without rewriting the app as “event-sourced.”