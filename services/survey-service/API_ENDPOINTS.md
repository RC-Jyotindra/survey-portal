# Survey Service API Endpoints

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Survey Management

### GET /api/surveys
List all surveys for the authenticated tenant
- **Role Required**: VIEWER
- **Query Parameters**:
  - `status` (optional): Filter by status (DRAFT, PUBLISHED, CLOSED, ARCHIVED)
  - `limit` (optional): Number of results (default: 50, max: 100)
  - `offset` (optional): Pagination offset (default: 0)

### GET /api/surveys/:id
Get a specific survey with all its pages, questions, and logic
- **Role Required**: VIEWER

### POST /api/surveys
Create a new survey
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "title": "string (required)",
    "description": "string (optional)",
    "slug": "string (optional)",
    "defaultLanguage": "string (optional, default: 'en')",
    "settings": "object (optional)"
  }
  ```

### PUT /api/surveys/:id
Update survey metadata
- **Role Required**: EDITOR

### DELETE /api/surveys/:id
Delete a survey (only if DRAFT status)
- **Role Required**: MANAGER

### POST /api/surveys/:id/publish
Publish a survey (change status from DRAFT to PUBLISHED)
- **Role Required**: MANAGER

### POST /api/surveys/:id/duplicate
Create a copy of an existing survey
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "title": "string (optional)"
  }
  ```

## Page Management

### GET /api/surveys/:id/pages
List all pages for a survey
- **Role Required**: VIEWER

### POST /api/surveys/:id/pages
Create a new page in a survey
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "titleTemplate": "string (optional)",
    "descriptionTemplate": "string (optional)",
    "questionOrderMode": "SEQUENTIAL|RANDOM|GROUP_RANDOM|WEIGHTED (default: SEQUENTIAL)",
    "visibleIfExpressionId": "uuid (optional)"
  }
  ```

### GET /api/surveys/:id/pages/:pageId
Get a specific page with its questions
- **Role Required**: VIEWER

### PUT /api/surveys/:id/pages/:pageId
Update a page
- **Role Required**: EDITOR

### DELETE /api/surveys/:id/pages/:pageId
Delete a page (only if survey is DRAFT)
- **Role Required**: MANAGER

### POST /api/surveys/:id/pages/:pageId/reorder
Reorder pages within a survey
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "newIndex": "number (required)"
  }
  ```

## Question Management

### GET /api/surveys/:id/questions
List all questions for a survey
- **Role Required**: VIEWER

### POST /api/surveys/:id/questions
Create a new question in a survey
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "pageId": "uuid (required)",
    "type": "SINGLE_CHOICE|MULTIPLE_CHOICE|DROPDOWN|TEXT|TEXTAREA|NUMBER|DECIMAL|DATE|TIME|BOOLEAN|RANK|SLIDER|MATRIX|DESCRIPTIVE|FILE_UPLOAD (required)",
    "variableName": "string (optional, auto-generated if not provided)",
    "titleTemplate": "string (required)",
    "helpTextTemplate": "string (optional)",
    "required": "boolean (default: false)",
    "validation": "object (optional)",
    "optionOrderMode": "SEQUENTIAL|RANDOM|GROUP_RANDOM|WEIGHTED (default: SEQUENTIAL)",
    "optionsSource": "STATIC|CARRY_FORWARD (default: STATIC)",
    "carryForwardQuestionId": "uuid (optional)",
    "carryForwardFilterExprId": "uuid (optional)",
    "visibleIfExpressionId": "uuid (optional)"
  }
  ```

### GET /api/surveys/:id/questions/:questionId
Get a specific question with its options/items/scales
- **Role Required**: VIEWER

### PUT /api/surveys/:id/questions/:questionId
Update a question
- **Role Required**: EDITOR

### DELETE /api/surveys/:id/questions/:questionId
Delete a question (only if survey is DRAFT)
- **Role Required**: MANAGER

## Question Options Management

### POST /api/surveys/:id/questions/:questionId/options
Add an option to a question
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "questionId": "uuid (required)",
    "value": "string (required)",
    "labelTemplate": "string (required)",
    "exclusive": "boolean (default: false)",
    "groupKey": "string (optional)",
    "weight": "number (optional)",
    "visibleIfExpressionId": "uuid (optional)"
  }
  ```

### PUT /api/surveys/:id/questions/:questionId/options/:optionId
Update a question option
- **Role Required**: EDITOR

### DELETE /api/surveys/:id/questions/:questionId/options/:optionId
Delete a question option
- **Role Required**: EDITOR

## Matrix Items Management (for MATRIX_SINGLE and MATRIX_MULTIPLE questions)

### POST /api/surveys/:id/questions/:questionId/items
Add a matrix item (row) to a question
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "value": "string (required) - Internal value for the item",
    "label": "string (required) - Display label for the item"
  }
  ```

### PUT /api/surveys/:id/questions/:questionId/items/:itemId
Update a matrix item
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "value": "string (optional) - Updated internal value",
    "label": "string (optional) - Updated display label"
  }
  ```

### DELETE /api/surveys/:id/questions/:questionId/items/:itemId
Delete a matrix item
- **Role Required**: EDITOR

## Matrix Scales Management (for MATRIX_SINGLE and MATRIX_MULTIPLE questions)

### POST /api/surveys/:id/questions/:questionId/scales
Add a matrix scale (column) to a question
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "value": "string (required) - Internal value for the scale",
    "label": "string (required) - Display label for the scale"
  }
  ```

### PUT /api/surveys/:id/questions/:questionId/scales/:scaleId
Update a matrix scale
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "value": "string (optional) - Updated internal value",
    "label": "string (optional) - Updated display label"
  }
  ```

### DELETE /api/surveys/:id/questions/:questionId/scales/:scaleId
Delete a matrix scale
- **Role Required**: EDITOR

## Expression Management

### GET /api/surveys/:id/expressions
List all expressions for a survey
- **Role Required**: VIEWER

### POST /api/surveys/:id/expressions
Create a new expression
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "dsl": "string (required) - DSL expression like 'equals(answer('Q1'), 'Yes')'",
    "description": "string (optional) - Human readable description"
  }
  ```

### GET /api/surveys/:id/expressions/:expressionId
Get a specific expression
- **Role Required**: VIEWER

### PUT /api/surveys/:id/expressions/:expressionId
Update an expression
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "dsl": "string (optional) - Updated DSL expression",
    "description": "string (optional) - Updated description"
  }
  ```

### DELETE /api/surveys/:id/expressions/:expressionId
Delete an expression (only if not in use)
- **Role Required**: MANAGER

### POST /api/surveys/:id/expressions/validate
Validate DSL syntax and optionally test with sample data
- **Role Required**: VIEWER
- **Body**:
  ```json
  {
    "dsl": "string (required) - DSL expression to validate",
    "testAnswers": "object (optional) - Sample answers for testing"
  }
  ```

### GET /api/surveys/:id/expressions/:expressionId/usage
Get usage information for an expression
- **Role Required**: VIEWER

## Jump Logic Management

### GET /api/surveys/:surveyId/question-jumps
Get all question jumps for a survey
- **Role Required**: VIEWER

### POST /api/surveys/:surveyId/question-jumps
Create a new question jump
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "fromQuestionId": "uuid (required)",
    "toPageId": "uuid (optional)",
    "toQuestionId": "uuid (optional)",
    "conditionExpressionId": "uuid (optional)",
    "priority": "number (default: 0)"
  }
  ```
- **Note**: Either `toPageId` or `toQuestionId` must be provided

### GET /api/surveys/:surveyId/question-jumps/:jumpId
Get a specific question jump
- **Role Required**: VIEWER

### PUT /api/surveys/:surveyId/question-jumps/:jumpId
Update a question jump
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "toPageId": "uuid (optional)",
    "toQuestionId": "uuid (optional)",
    "conditionExpressionId": "uuid (optional)",
    "priority": "number (optional)"
  }
  ```

### DELETE /api/surveys/:surveyId/question-jumps/:jumpId
Delete a question jump
- **Role Required**: MANAGER

### GET /api/surveys/:surveyId/page-jumps
Get all page jumps for a survey
- **Role Required**: VIEWER

### POST /api/surveys/:surveyId/page-jumps
Create a new page jump
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "fromPageId": "uuid (required)",
    "toPageId": "uuid (required)",
    "conditionExpressionId": "uuid (optional)",
    "priority": "number (default: 0)"
  }
  ```

### GET /api/surveys/:surveyId/page-jumps/:jumpId
Get a specific page jump
- **Role Required**: VIEWER

### PUT /api/surveys/:surveyId/page-jumps/:jumpId
Update a page jump
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "toPageId": "uuid (optional)",
    "conditionExpressionId": "uuid (optional)",
    "priority": "number (optional)"
  }
  ```

### DELETE /api/surveys/:surveyId/page-jumps/:jumpId
Delete a page jump
- **Role Required**: MANAGER

### POST /api/surveys/:surveyId/jump-logic/evaluate
Evaluate jump logic for given answers and current position
- **Role Required**: VIEWER
- **Body**:
  ```json
  {
    "answers": "object (required) - Current survey answers",
    "currentQuestionId": "uuid (optional) - Current question ID",
    "currentPageId": "uuid (optional) - Current page ID"
  }
  ```

### POST /api/surveys/:surveyId/jump-logic/test
Test a specific jump condition
- **Role Required**: VIEWER
- **Body**:
  ```json
  {
    "jumpId": "uuid (required) - Jump ID to test",
    "jumpType": "question|page (required) - Type of jump",
    "testAnswers": "object (required) - Sample answers for testing"
  }
  ```

### GET /api/surveys/:surveyId/jump-logic/summary
Get all jump logic for a survey
- **Role Required**: VIEWER

## DSL Expression Syntax

The DSL (Domain Specific Language) supports the following functions:

### Comparison Functions
- `equals(answer('Q1'), 'Yes')` - Check if Q1 equals 'Yes'
- `notEquals(answer('Q1'), 'No')` - Check if Q1 does not equal 'No'
- `greaterThan(answer('Q2'), 18)` - Check if Q2 is greater than 18
- `lessThan(answer('Q2'), 65)` - Check if Q2 is less than 65

### Text Functions
- `contains(answer('Q3'), 'email')` - Check if Q3 contains 'email'
- `startsWith(answer('Q3'), 'Mr.')` - Check if Q3 starts with 'Mr.'

### Multiple Choice Functions
- `anySelected('Q1', ['Apple', 'Banana'])` - Check if Q1 has Apple OR Banana selected
- `allSelected('Q1', ['Apple', 'Banana'])` - Check if Q1 has Apple AND Banana selected
- `noneSelected('Q1', ['Apple', 'Banana'])` - Check if Q1 has neither Apple nor Banana

### Logical Operators
- `&&` - AND operator
- `||` - OR operator
- `!` - NOT operator
- `()` - Grouping parentheses

### Examples
```
equals(answer('Q1'), 'Yes')
greaterThan(answer('Q2'), 18) && equals(answer('Q3'), 'Premium')
anySelected('Q1', ['Apple', 'Banana']) || contains(answer('Q2'), 'fruit')
!(equals(answer('Q1'), 'No'))
```

## Jump Logic vs Display Logic

### Display Logic (Skip Logic)
Controls **whether** a question/page is shown based on conditions:
- Uses `visibleIfExpressionId` field
- Evaluated **before** display
- Hides/shows elements
- Example: "Show Q2 only if Q1 = 'Yes'"

### Jump Logic (Navigation Logic)
Controls **where** the user goes next based on conditions:
- Uses `QuestionJump` and `PageJump` tables
- Evaluated **after** answering
- Redirects navigation
- Example: "If Q1 = 'Yes', jump to Q5; otherwise continue to Q2"

### Priority System
- Lower priority number = higher precedence (0 = highest priority)
- Question jumps evaluated before page jumps
- First matching condition wins

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

## Validation

All endpoints use Zod for request validation with comprehensive error messages. Validation errors include field-specific details:

```json
{
  "error": "titleTemplate: Title is required, type: Invalid question type"
}
```

## Randomization & Shuffling Endpoints

### Page Question Randomization

#### PUT /api/surveys/:id/pages/:pageId/randomization
Update question randomization settings for a page.
- **Role Required**: EDITOR
- **Request Body**:
  ```json
  {
    "questionOrderMode": "SEQUENTIAL" | "RANDOM" | "GROUP_RANDOM" | "WEIGHTED"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Question randomization settings updated successfully",
    "page": {
      "id": "page-uuid",
      "questionOrderMode": "RANDOM",
      "_count": { "questions": 4 }
    }
  }
  ```

### Question Option Shuffling

#### PUT /api/surveys/:id/questions/:questionId/shuffling
Update option shuffling settings for a question.
- **Role Required**: EDITOR
- **Request Body**:
  ```json
  {
    "optionOrderMode": "SEQUENTIAL" | "RANDOM" | "GROUP_RANDOM" | "WEIGHTED"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Option shuffling settings updated successfully",
    "question": {
      "id": "question-uuid",
      "optionOrderMode": "RANDOM",
      "options": [...],
      "fromJumps": [...]
    }
  }
  ```

### Randomization Modes

#### SEQUENTIAL
- **Questions**: Display in page order (Q1, Q2, Q3, Q4)
- **Options**: Display in question order (Option A, B, C, D)

#### RANDOM
- **Questions**: Randomize all questions within the page
- **Options**: Randomize all options within the question

#### GROUP_RANDOM
- **Questions**: Keep question groups together, shuffle groups
- **Options**: Keep option groups together, shuffle groups

#### WEIGHTED
- **Questions**: Use question weights for ordering (higher weight = higher priority)
- **Options**: Use option weights for ordering (higher weight = higher priority)

## Survey Targets (Sample Size Management)

### POST /api/surveys/:surveyId/target
Create or update survey target (sample size)
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "totalN": "number (required) - Total target completes",
    "softCloseN": "number (optional) - Show 'closing soon' threshold",
    "hardClose": "boolean (default: true) - Block new sessions when target reached"
  }
  ```

### GET /api/surveys/:surveyId/target
Get survey target with current completion statistics
- **Role Required**: VIEWER

### PUT /api/surveys/:surveyId/target
Update survey target
- **Role Required**: EDITOR

### DELETE /api/surveys/:surveyId/target
Delete survey target
- **Role Required**: MANAGER

### GET /api/surveys/:surveyId/target/stats
Get detailed target statistics including completion rates
- **Role Required**: VIEWER

## Quota Management

### POST /api/surveys/:surveyId/quotas
Create a new quota plan
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "name": "string (required) - Plan name (e.g., 'Gender')",
    "strategy": "MANUAL|EQUAL|RANDOM (default: MANUAL)",
    "totalN": "number (required) - Total quota target",
    "state": "OPEN|CLOSED (default: OPEN)"
  }
  ```

### POST /api/surveys/:surveyId/quotas/generate
Generate quota plan from question options
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "name": "string (required) - Plan name",
    "strategy": "EQUAL|RANDOM",
    "totalN": "number (required) - Total target",
    "source": {
      "type": "QUESTION_OPTIONS",
      "questionId": "uuid (required) - Question to generate quotas from"
    }
  }
  ```

### GET /api/surveys/:surveyId/quotas
Get all quota plans for a survey
- **Role Required**: VIEWER

### GET /api/surveys/:surveyId/quotas/:planId
Get a specific quota plan with buckets
- **Role Required**: VIEWER

### PUT /api/surveys/:surveyId/quotas/:planId
Update a quota plan
- **Role Required**: EDITOR

### DELETE /api/surveys/:surveyId/quotas/:planId
Delete a quota plan
- **Role Required**: MANAGER

### POST /api/surveys/:surveyId/quotas/:planId/buckets
Create a quota bucket
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "planId": "uuid (required)",
    "label": "string (required) - Bucket label",
    "questionId": "uuid (optional) - Question for simple matching",
    "optionValue": "string (optional) - Option value for matching",
    "conditionExprId": "uuid (optional) - Expression for complex matching",
    "targetN": "number (required) - Target completes for this bucket",
    "maxOverfill": "number (default: 0) - Allowed overfill"
  }
  ```

### PUT /api/surveys/:surveyId/quotas/:planId/buckets/:bucketId
Update a quota bucket
- **Role Required**: EDITOR

### DELETE /api/surveys/:surveyId/quotas/:planId/buckets/:bucketId
Delete a quota bucket
- **Role Required**: EDITOR

### GET /api/surveys/:surveyId/quotas/stats
Get quota statistics with current fills and availability
- **Role Required**: VIEWER

## Question Groups & Shuffling

### POST /api/surveys/:surveyId/pages/:pageId/groups
Create a new question group
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "pageId": "uuid (required)",
    "key": "string (optional) - Stable reference key",
    "titleTemplate": "string (optional) - Group title",
    "descriptionTemplate": "string (optional) - Group description",
    "visibleIfExpressionId": "uuid (optional) - Visibility condition",
    "innerOrderMode": "SEQUENTIAL|RANDOM|GROUP_RANDOM|WEIGHTED (default: SEQUENTIAL)"
  }
  ```

### GET /api/surveys/:surveyId/pages/:pageId/groups
Get all question groups for a page
- **Role Required**: VIEWER

### GET /api/surveys/:surveyId/pages/:pageId/groups/:groupId
Get a specific question group with questions
- **Role Required**: VIEWER

### PUT /api/surveys/:surveyId/pages/:pageId/groups/:groupId
Update a question group
- **Role Required**: EDITOR

### DELETE /api/surveys/:surveyId/pages/:pageId/groups/:groupId
Delete a question group (only if empty)
- **Role Required**: MANAGER

### POST /api/surveys/:surveyId/pages/:pageId/groups/:groupId/questions
Add a question to a group
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "questionId": "uuid (required)",
    "groupIndex": "number (optional) - Position within group"
  }
  ```

### DELETE /api/surveys/:surveyId/pages/:pageId/groups/:groupId/questions/:questionId
Remove a question from a group
- **Role Required**: EDITOR

### PUT /api/surveys/:surveyId/pages/:pageId/groups/:groupId/questions/reorder
Reorder questions within a group
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "questionIds": "array of uuids (required) - New order"
  }
  ```

### GET /api/surveys/:surveyId/pages/:pageId/group-order
Get page group shuffling configuration
- **Role Required**: VIEWER

### PUT /api/surveys/:surveyId/pages/:pageId/group-order
Update page group order mode (shuffling)
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "groupOrderMode": "SEQUENTIAL|RANDOM|GROUP_RANDOM|WEIGHTED (default: SEQUENTIAL)"
  }
  ```

## Runtime Quota Management

### POST /api/runtime/:sessionId/quota/assign
Assign quota reservations for a session
- **Role Required**: VIEWER (or public for runtime)
- **Body**:
  ```json
  {
    "answersSoFar": "object (optional) - Current session answers"
  }
  ```
- **Response**:
  ```json
  {
    "assigned": [
      { "planId": "uuid", "bucketId": "uuid", "label": "string" }
    ],
    "denied": [{ "planId": "uuid", "reason": "FULL|NO_MATCH" }]
  }
  ```

### POST /api/runtime/:sessionId/quota/release
Release quota reservations for a session
- **Role Required**: VIEWER (or public for runtime)
- **Body**:
  ```json
  {
    "bucketIds": "array of uuids (optional) - Specific buckets to release"
  }
  ```

### GET /api/runtime/:sessionId/quota/status
Get quota status for a session
- **Role Required**: VIEWER (or public for runtime)

### POST /api/runtime/:sessionId/complete
Complete a session and finalize quota reservations
- **Role Required**: VIEWER (or public for runtime)
- **Body**:
  ```json
  {
    "finalAnswers": "object (optional) - Final session answers"
  }
  ```

### GET /api/runtime/:surveyId/availability
Check if survey is open for new sessions
- **Role Required**: VIEWER (or public for runtime)
- **Response**:
  ```json
  {
    "available": "boolean",
    "reason": "OPEN|SOFT_CLOSE|HARD_CLOSED|NO_TARGET_SET",
    "completedCount": "number",
    "targetN": "number",
    "remainingCount": "number",
    "closingSoon": "boolean"
  }
  ```

## Group Shuffling & Question Ordering

### GET /api/surveys/:surveyId/pages/:pageId/shuffled-questions
Get questions in shuffled order based on group configuration
- **Role Required**: VIEWER
- **Query Parameters**:
  - `sessionId` (optional): For consistent shuffling per session
  - `includeUngrouped` (optional): Include ungrouped questions (default: true)
- **Response**:
  ```json
  {
    "pageId": "string",
    "groupOrderMode": "SEQUENTIAL|RANDOM|GROUP_RANDOM|WEIGHTED",
    "totalQuestions": "number",
    "questions": [
      {
        "id": "string",
        "index": "number",
        "variableName": "string",
        "titleTemplate": "string",
        "type": "string",
        "groupId": "string|null",
        "groupIndex": "number|null",
        "options": [...],
        "items": [...],
        "scales": [...]
      }
    ]
  }
  ```

### POST /api/surveys/:surveyId/pages/:pageId/preview-shuffle
Preview shuffled question order without saving
- **Role Required**: EDITOR
- **Body**:
  ```json
  {
    "sessionId": "string (optional)",
    "preview": "boolean (default: false)"
  }
  ```
- **Response**:
  ```json
  {
    "pageId": "string",
    "groupOrderMode": "string",
    "preview": "true",
    "groups": [
      {
        "id": "string",
        "index": "number",
        "titleTemplate": "string",
        "questionCount": "number",
        "questions": [...]
      }
    ],
    "shuffledOrder": [
      {
        "position": "number",
        "id": "string",
        "variableName": "string",
        "titleTemplate": "string",
        "type": "string",
        "groupId": "string|null"
      }
    ]
  }
  ```

### GET /api/surveys/:surveyId/pages/:pageId/group-stats
Get statistics about question groups on a page
- **Role Required**: VIEWER
- **Response**:
  ```json
  {
    "stats": {
      "pageId": "string",
      "totalQuestions": "number",
      "totalGroups": "number",
      "ungroupedQuestions": "number",
      "groupOrderMode": "string",
      "groups": [
        {
          "id": "string",
          "index": "number",
          "titleTemplate": "string",
          "questionCount": "number",
          "innerOrderMode": "string"
        }
      ]
    }
  }
  ```

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: Rate limit information included in response headers