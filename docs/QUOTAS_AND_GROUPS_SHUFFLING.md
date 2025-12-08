## Survey Quotas & Question Grouping — Design Guide

- This doc explains how sample size & quotas and question grouping/shuffling work in our Survey Builder. It maps 1:1 to our Prisma schema and shows what endpoints to build in the survey-service (port 3002). Keep this close while coding.

### Why this exists

- SurveyTarget controls global sample size (e.g., “collect 200 completes”).
- QuotaPlan / QuotaBucket / QuotaReservation control how those completes are distributed across cells (e.g., Gender, Region).
- Question Grouping keeps sets of questions together and supports shuffling groups deterministically, like Qualtrics’ “randomizer,” but inside a page.

### Quick glossary

- Complete: a SurveySession that ends with status=COMPLETED.
- Admission: letting a respondent start or continue after screeners.
- Reservation: temporary hold of a quota seat to avoid overfill under concurrency.
- Bucket: a quota cell (e.g., “Male”, “North”, or complex rule via expression).
- Group: a set of questions on a page kept together; groups themselves can be shuffled.

### Data Model
- Sample Size & Quotas

### SurveyTarget
- surveyId, tenantId
- totalN — global completes goal
- softCloseN — show “closing soon” once completed >= softCloseN (no gating)
- hardClose — if true, block new sessions when completed >= totalN

### QuotaPlan

- name (e.g., “Gender”)
- strategy — MANUAL | EQUAL | RANDOM (how targets are assigned to buckets)
- totalN — sum of bucket targets (validate to match)
- state — OPEN | CLOSED

### QuotaBucket
- label — e.g., “Male”
- Targeting (choose one):
- questionId + optionValue (simple “option = bucket”)
- conditionExprId → Expression.dsl that resolves to boolean
- targetN — target completes for the bucket
- filledN — finalized completes
- reservedN — in-flight holds
- maxOverfill — allowed slack above targetN (default 0)

### QuotaReservation

- Links a SurveySession to a QuotaBucket
- status — ACTIVE | RELEASED | FINALIZED
- Optional expiresAt for reservation timeout

Why reservations?
They prevent race conditions (“2 seats left” → 3 servers admit at once) and let us release holds on timeout or when a user backtracks and changes qualifying answers.

### Behavior & lifecycle
Global admission (SurveyTarget)

`At /runtime/start:`
completed = count(SurveySession where status='COMPLETED' and surveyId=...)

If hardClose && completed >= totalN → deny with { closed: true }.

If softCloseN && completed >= softCloseN → allow, return { closingSoon: true }.

Global admission is based on completed only. We keep it simple; per-bucket concurrency is handled by reservations.

### Quota assignment (per plan/bucket)

When?
As soon as we have the defining answers (usually right after screeners). If answers change later, release old reservation and re-assign.

How? (single DB transaction)

`
1) Determine bucket (one per OPEN plan):
   - If questionId+optionValue is set: bucket matches if respondent selected this option.
   - Else evaluate conditionExprId (Expression.dsl) → boolean.

2) Reserve (capacity check):
   UPDATE QuotaBucket
   SET reservedN = reservedN + 1
   WHERE id = $bucketId
     AND (reservedN + filledN) < (targetN + maxOverfill);

   If rowCount == 0 → bucket full → screen out or alternate path.

3) Insert QuotaReservation { status: 'ACTIVE', sessionId, bucketId }
`

On completion (terminal page):
reservedN -= 1; filledN += 1; reservation.status = 'FINALIZED'.

On timeout/backtrack/screenout:
reservedN -= 1; reservation.status = 'RELEASED'.

Always use a transaction for 2 & 3. Multi-node safe; no in-memory locks.

# Survey Authoring & Runtime API Specification
This document outlines the minimal, **role-gated endpoints** required for survey **authoring** and **runtime** operations.

---

## 🔐 Authorization

- **Requirement:** SB role
- **Authoring:** ≥ `EDITOR`
- **Runtime:** ≥ `VIEWER` (or **public** later if collectors are added)
---

## ✍️ Authoring — Sample Size & Quotas

### Set Sample Size
```http
POST /:surveyId/target
{
  "totalN": number,
  "softCloseN": number?, 
  "hardClose": boolean?
}

POST /:surveyId/quotas/generate
{
  "name": "Gender",
  "strategy": "EQUAL",
  "totalN": 200,
  "source": { 
    "type": "QUESTION_OPTIONS", 
    "questionId": "<uuid>" 
  }
}

GET    /authoring/:surveyId/quotas
PATCH  /authoring/quotas/:planId 
PATCH  /authoring/quotas/:planId/buckets/:bucketId

PATCH /authoring/quotas/:planId body:

{
  "state": "OPEN" | "CLOSED",
  "name": "string?",
  "totalN": number?,
  "strategy": "string?"
}


PATCH /authoring/quotas/:planId/buckets/:bucketId body:

{
  "targetN": number?,
  "maxOverfill": number?
}

Stats
GET /authoring/:surveyId/quotas/stats

Assign Quotas
POST /runtime/:sessionId/quota/assign


Body:

{ "answersSoFar": { ... } }


(or server reads from DB)

Response:

{
  "assigned": [
    { "planId": "id", "bucketId": "id", "label": "string" }
  ],
  "denied": { "planId": "id", "reason": "FULL" }?
}

Release Reservation
POST /runtime/:sessionId/quota/release


Server computes which reservations to release

Finalize
POST /runtime/:sessionId/complete


Finalizes active reservations

Marks session COMPLETED

Error Codes

409 CONFLICT → bucket full on reserve

423 LOCKED → survey hard-closed

400 BAD_REQUEST → missing screener answers for plan
