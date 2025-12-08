# Looping & Merge Logic — Survey Builder Design Guide

This doc explains from first principles what **Looping** and **Merge** mean in surveys, how they work at the page level, how they use our schema, and how to implement them cleanly without overengineering. It’s written so you can hand it to Cursor and build confidently.

---

## Why do researchers use Looping & Merge?

- **Looping**: Ask the same pages of questions repeatedly — once per item (e.g., per brand a respondent buys).
- **Merge**: While looping, inject the current item’s attributes (name, price, image…) into page/question text and options so the questions read naturally.

Think of it as:  

> “Repeat this mini section for each thing we care about, and while doing so, mention that thing by name with its details.”

---

## 1. First principles: page-level Looping & Merge

### Looping (page-level)

- You choose a contiguous page range (a **battery**) — e.g., Pages 5–7.  
- The engine displays Pages 5–7 multiple times, once per item in a list:
  - Items can come from **answers** (answer-driven loop), or  
  - From an **authored dataset** (dataset-driven loop).  
- The engine can randomize which items are asked and/or the order of those items, but it’s **deterministic per respondent**.

### Merge (content personalization)

- When rendering those pages for the current item, text tokens like `{{loop.brand}}` or `{{loop.price}}` are resolved.  
- Merge works anywhere we already support templates:
  - Page titles  
  - Question titles/help  
  - Option labels  
  - Descriptive blocks  

**Important**:  
- **Looping** is flow control (repeat pages).  
- **Merge** is content substitution (fill in this item’s fields).  
- They’re separate but complementary.  

---

## 2. Concrete examples (easy to picture)

### Example A — Answer-driven “Brand Battery”

- **P1 (multi-select)**: “Which brands did you buy last month?” Options: BrandA, BrandB, BrandC.  
- **P2–P3 — Loop Battery**:  
  - P2: “How satisfied are you with {{loop.brand}}?”  
  - P3: “Where do you usually buy {{loop.brand}}?”  

**Respondent selects on P1**: BrandC and BrandA.  
- **Flow executed**:
    - P2 (for BrandC) → P3 (for BrandC)
    - P2 (for BrandA) → P3 (for BrandA)
    - → then proceed to P4…


Options:
- `maxItems = 1` → only ask about one selected brand (random per respondent).  
- Randomize item order → some see BrandA first, others BrandC first.  

---

### Example B — Dataset-driven “SKU Test”

- You upload **20 SKUs** with fields `{ sku, brand, price, imageUrl }`.  
- **P10–P11 — Loop Battery**:  
  - P10: “Rate the value for money of {{loop.brand}} (₹{{loop.price}}).”  
  - P11: “Would you consider buying {{loop.brand}} next month?”  

**Runtime plan**:
- Randomly sample 3 SKUs per respondent (no replacement).  
- For each selected SKU, run P10 → P11 with `{{loop.*}}` filled from that SKU row.  

---

## 3. The schema (what to add and how it relates)

These are **additive models**; they don’t break existing logic. They make loops first-class and keep authoring simple.

### New enum
```prisma
enum LoopSourceType {
  ANSWER   // items come from a previous multi-select question
  DATASET  // items come from authored dataset rows
}


**New Models**:
model LoopBattery {
  id            String          @id @default(uuid())
  tenantId      String
  surveyId      String
  name          String          // e.g., "Brand Battery"

  // The contiguous page span to repeat
  startPageId   String
  endPageId     String

  // Item source
  sourceType    LoopSourceType
  sourceQuestionId String?      // required when sourceType=ANSWER

  // Per-respondent behavior
  maxItems      Int?
  randomize     Boolean         @default(true)
  sampleWithoutReplacement Boolean @default(true)

  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  survey        Survey          @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  startPage     SurveyPage      @relation("LoopStartPage", fields: [startPageId], references: [id], onDelete: Cascade)
  endPage       SurveyPage      @relation("LoopEndPage",   fields: [endPageId],   references: [id], onDelete: Cascade)

  datasetItems  LoopDatasetItem[]

  @@index([tenantId, surveyId])
}

model LoopDatasetItem {
  id         String     @id @default(uuid())
  batteryId  String
  key        String     // stable code: e.g., "BrandA" or "SKU-123"
  attributes Json?
  isActive   Boolean    @default(true)
  sortIndex  Int?

  battery    LoopBattery @relation(fields: [batteryId], references: [id], onDelete: Cascade)

  @@unique([batteryId, key])
  @@index([batteryId])
}

- **Connections to existing logic**
    - Pages/Questions/Options: unchanged.
    - Templates: Existing template fields can now also use {{loop.*}}.
    - Sessions/Answers: Store loop plan & progress in SurveySession.renderState. Tag answers with loopKey + index for clarity.

- Implementation outline
Authoring (UI)

- Select start & end pages.


### Authoring Flow

1. **Choose Source Type**
    - **ANSWER**: Select a previous multi-select question as the source of loop items.
    - **DATASET**: Manage a static list of dataset rows (each row becomes a loop item).

2. **Configure Loop Behavior**
    - Set options for:
        - Randomization (`randomize`)
        - Maximum number of items per respondent (`maxItems`)
        - Sampling mode (`sampleWithoutReplacement`)

---

### Runtime Logic (Engine)

1. **On Entering `startPage`**
    - Build the list of loop items for the respondent:
        - If `sourceType = ANSWER`: Use selected answers from the source question.
        - If `sourceType = DATASET`: Use all active dataset rows.
    - Apply deterministic ordering and sampling based on configuration.
    - Store the generated loop plan in `SurveySession.renderState`.

2. **During Rendering**
    - For each loop iteration, resolve template fields using the current `loopContext` (e.g., `{{loop.key}}`, `{{loop.attributes.brand}}`).

3. **On Leaving `endPage`**
    - Advance to the next item in the loop, or exit the loop if all items are complete.

---

### Backtracking & Edits

- If the respondent changes their answers to the source question:
    - Recompute the set of loop keys.
    - Remove any loop items that are no longer present.
    - Add new items as needed.
    - Preserve the deterministic order of items for consistency.

---

**Note:**  
- Pages, questions, and options remain unchanged.
- Templates can reference `{{loop.*}}` variables within the loop span.
- All loop progress and plans are stored per session in `renderState`, and answers are tagged with `loopKey` and index for clarity.


## 5. Answer-Driven Loops

- **Loop keys** are derived from a respondent’s answers to a multi-select source question.
- **No selections?** The loop battery is skipped for that respondent.
- **Selections present?** A loop plan is generated at runtime, iterating once per selected item.
- **If answers to the source question change:**  
  - The loop plan is recalculated to match the new selections.
  - Any answers for removed items are cleaned up to maintain consistency.

---

## 6. Merge Logic (Simple & Predictable)

- **Merge** allows you to pipe loop item data into templates using a special `loop` object:
  - `{{loop.key}}` — the item’s unique code.
  - `{{loop.label}}` — the option label (for answer-driven) or dataset label.
  - `{{loop.*}}` — any dataset attribute (for dataset-driven loops).
- **Templates**: These variables can be used anywhere template fields are supported.
- **Missing attributes**: If a referenced attribute is missing, the field is hidden or a fallback is used.
- **Security**: All attributes are treated as untrusted and must be HTML-escaped.

---

## 7. Interactions with Other Features

- **Branching/Jumps**: Work normally inside the loop battery.
- **Visibility rules**: Evaluated per loop iteration.
- **Shuffling (options/groups)**: Remain deterministic for each respondent.
- **Quotas**: Applied per respondent (future: can extend to per-item quotas).

---

## 8. Authoring Tips

- Keep loop batteries short (ideally 1–3 pages).
- Use `maxItems` to limit the number of loop iterations for large source lists.
- Place instructions outside the loop battery for clarity.
- Avoid nested loops in v1.
- Provide a Preview mode that uses a seeded, deterministic order for testing.

---

## 9. Minimal Runtime Logic

- **On entering the loop:**
  - If no plan exists, resolve the loop keys, apply shuffling/sampling as configured, and save the plan as `{ keys, index: 0 }`.
- **Before rendering each page:**
  - Build the `loopContext` and resolve all `{{loop.*}}` template variables.
- **On leaving the end page of the loop:**
  - If more items remain, increment the index and return to the start page.
  - If all items are complete, continue after the end page.
- **On backtracking and edits:**
  - Recompute loop keys and clean up answers as needed.

---

## Glossary

- **Loop Battery**: The contiguous set of pages that repeat for each loop item.
- **Loop Key**: The stable identifier for the current loop item.
- **Merge Attributes**: Per-item fields available for template piping.
- **Answer-driven**: Loop items come from a respondent’s multi-select answers.
- **Dataset-driven**: Loop items come from a static authored dataset.

---

**Bottom line:**  
A loop battery repeats a page span for each item, and Merge lets you fill those pages with the current item’s attributes using template variables.