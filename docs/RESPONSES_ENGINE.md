# RESPONSES_ENGINE.md

## Purpose
This document explains how our **survey runtime & responses engine** works, where the code lives (`runtime/` folder of `services/survey-service`), how survey links (collectors) are generated and used, and the exact request/response flow from the **Admin UI** and the **Respondent UI**.  
It is written to be implementation-ready without drowning you in code.

---

## 0) TL;DR

- Keep everything runtime + responses inside **`services/survey-service`** (port `3002`).
- The engine has **5 responsibilities**: **Guard → Resolve → Validate → Route → Quota**.
- Links are issued via **Collectors** (`SurveyCollector`, `CollectorInvite`).

**Distribution types:**
- **PUBLIC** – open link, no auth  
- **SINGLE_USE** – invite-only token  
- **INTERNAL** – only authenticated tenant members (RBAC)  
- **PANEL** – placeholder (coming soon)

---

## 1) Where does the code live?

services/survey-service/
  src/
    runtime/                  # The engine (pure logic)
      resolvePage.ts          # visibility, groups, shuffles, carry-forward, loop ctx
      validate.ts             # per-type validation (authoritative)
      router.ts               # question jumps, page jumps, loop step
      quota.ts                # reserve/finalize/release
      dsl.ts                  # Expression DSL evaluation helpers
      random.ts               # deterministic PRNG + seeding
    collectors/               # Survey link management
      createCollector.ts
      invites.ts
      admission.ts            # collector window/cap/identity checks
    controllers/
      runtime.controller.ts   # REST handlers glue runtime modules
      collectors.controller.ts
    routes.ts                 # Express router
    index.ts                  # server bootstrap (port 3002)
  prisma/                     # schema, migrations



**Guiding principle:** the engine modules are **pure functions**. Controllers handle orchestration + DB transactions.

---

## 2) Data we rely on (already in your schema)

- **Survey / SurveyPage / Question / QuestionOption / Expression**
- **Group & Randomization**: `PageQuestionGroup`, `SurveyPage.groupOrderMode`, `Question.optionOrderMode`
- **Loops**: `LoopBattery`, `LoopDatasetItem`
- **Sessions & Answers**: `SurveySession` (includes `renderState`, `meta`), `Answer`
- **Quotas**: `SurveyTarget`, `QuotaPlan`, `QuotaBucket`, `QuotaReservation`
- **Collectors (links):**

```ts
enum CollectorType { PUBLIC, SINGLE_USE, PANEL, INTERNAL }

model SurveyCollector {
  id, tenantId, surveyId, type, name, slug, status,
  opensAt, closesAt, maxResponses,
  allowMultiplePerDevice, allowTest, ...
}

model CollectorInvite {
  id, collectorId, token, email?, externalId?,
  expiresAt?, consumedAt?, status
}

👉 If SurveyCollector / CollectorInvite are not yet added, add them first.

# 3) What the runtime engine does (one page at a time)
- 3.1 Guard (admission)
Check collector (by slug): status, date window, response cap, token if SINGLE_USE, signin if INTERNAL.

Check SurveyTarget:

hardClose: if completed ≥ totalN → block new sessions.

softClose: allow but flag closingSoon.

Create SurveySession (IN_PROGRESS) with metadata:
{
  "collectorId": "...",
  "inviteId": "...",
  "utm_*": "...",
  "refererHash": "...",
  "ipHash": "...",
  "deviceId": "..."
}
Optional: kind = LIVE or TEST.

- 3.2 Resolve (layout)

Evaluate visibility (page/group/question) via Expression.dsl.

Apply carry-forward (build options from prior answers).

Apply piping & merge tokens ({{Q1}}, {{loop.brand}}).

Compute deterministic order:

Page: group order

Group: question order

Question: option order

Persist realized order in SurveySession.renderState. Never reshuffle on client.

- 3.3 Validate (authoritative)

For every posted answer:

Enforce required, type, ranges, file limits, matrix rules, constant-sum totals, formats.

Return structured violations:

[{ "questionId": "Q7", "code": "REQUIRED", "message": "This field is required." }]

- 3.4 Route (next step)

After valid answers:

Check QuestionJump → evaluate by priority (first true wins).

Else check PageJump.

Else → next visible page.

Loop manager: if end page and more items → jump back to start.

- 3.5 Quota (synchronous & atomic)

On defining answers (screeners), try to reserve:
UPDATE QuotaBucket
SET reservedN = reservedN + 1
WHERE id = $bucket
  AND (reservedN + filledN) < (targetN + maxOverfill);

If no row updated → bucket full → terminate with OVERQUOTA.

Create QuotaReservation.

On complete: reservedN--, filledN++, mark FINALIZED.

On backtrack/screenout: reservedN--, mark RELEASED.

4) API surface (minimal, stable)
4.1 Admin — Collectors

Create collector
POST /authoring/surveys/:surveyId/collectors
Body: { type, name, slug, opensAt?, closesAt?, maxResponses?, allowMultiplePerDevice?, allowTest? }
Returns: collector + public URL

Generate invites (SINGLE_USE)
POST /authoring/collectors/:collectorId/invites
Body: { emails?: string[], count?: number, ttlHours?: number }
Returns: tokens + URLs

List
GET /authoring/surveys/:surveyId/collectors
GET /authoring/collectors/:collectorId/invites

4.2 Respondent — Runtime

Start session
POST /runtime/start?slug=:slug[&t=:token]
Returns:

{ "sessionId": "uuid", "firstPageId": "uuid", "closingSoon": false }


Get layout
GET /runtime/:sessionId/pages/:pageId/layout

Post answers
POST /runtime/:sessionId/answers
Returns { next: { pageId } } or { complete: true } or { violations: [...] }

Complete
POST /runtime/:sessionId/complete

Terminate
POST /runtime/:sessionId/terminate { reason }

5) How Admin creates links (end-to-end)

Frontend flow:

Admin → Survey Builder → Distribute tab.

Choose distribution type (PUBLIC / SINGLE_USE / INTERNAL / PANEL).

Fill settings (open/close, cap, allow multiple, allow test).

Create link → calls backend API.

For SINGLE_USE → generate invites.

Backend flow:

Creates SurveyCollector with slug.

For single-use: creates CollectorInvite + tokens.

Returns URLs.

6) How a respondent fills the survey

Open link → /c/:slug (frontend route).

Web calls POST /runtime/start.

On success → store sessionId, route /s/:sessionId.

Fetch layout → render.

On “Next” → post answers.

Repeat until { complete: true }.

Finalize quotas + show thank-you.

Notes:

INTERNAL → requires auth.
PUBLIC → nothing
SINGLE_USE → check token used/expired.

7) Engine details

Deterministic randomization: PRNG seeded with sessionId + pageId/groupId/questionId.

Visibility: evaluate all visibleIf conditions with DSL.

Loops: manage iteration plans, provide {{loop.*}} context.

Validation: table-driven per Question.type.

Quotas: enforce atomic correctness.

8) Collector admission rules

PUBLIC → open, cap/device rules optional.

SINGLE_USE → valid token required, single completion.

INTERNAL → must be authenticated tenant member.

PANEL → future (redirect back to panel).

9) Frontend must / must not

Must:

Follow backend flow (start → layout → answers → complete).

Render backend payload exactly.

Keep “Next” disabled until server validates.

Must NOT:

Do client-side randomization, jumps, or quota logic.

10) Observability & testing

Log each step: { sessionId, pageId, action, ms, result }.

Counters: started, completed, terminated, overquota hits, validation errors.

Load test near-full quotas.

Test loops & backtracking.

11) Future (not required v1)

Outbox events for analytics/webhooks.

Fraud scoring & fingerprinting.

Export service (BigQuery/S3).

PANEL collectors with redirects & crediting.

12) Example Sequences:
Web(Admin) → survey-service: POST /authoring/surveys/:id/collectors
                                         body: {type:"PUBLIC", name, slug, ...}

survey-service → DB: insert SurveyCollector
survey-service → Web(Admin): { id, slug, publicUrl: "https://app/c/:slug", ... }

Respondent Session:
Web(Resp) → POST /runtime/start?slug=:slug
survey-service: guard() → create SurveySession(IN_PROGRESS)
survey-service → Web: { sessionId, firstPageId }

Web → GET /runtime/:sessionId/pages/:pageId/layout
survey-service: resolve → renderState
survey-service → Web: { groups, questions, options, texts }

Web → POST /runtime/:sessionId/answers { pageId, answers }
survey-service: validate → save → route
survey-service → Web: { next:{pageId} | complete:true }
Repeat until complete.

13) Summary checklist (to implement now)

 Add SurveyCollector & CollectorInvite models; run migration.

 Implement Admin endpoints (create collectors & invites).

 Implement Runtime endpoints: start, layout, answers, complete, terminate.

 Implement Guard, Resolve, Validate, Route, Quota engine pieces in src/runtime /`*`.

- Wire frontend:

/c/:slug → start → bootstrap /s/:sessionId.

Respondent flow uses layout/answers/complete.

Admin Distribute tab → collector endpoints.