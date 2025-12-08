# Loop Battery API Documentation

This document describes the API endpoints for managing loop batteries in the survey service.

## Overview

Loop batteries allow you to repeat a contiguous set of pages multiple times, once for each item in a list. Items can come from:
- **Answer-driven loops**: User's responses to a previous multi-select question
- **Dataset-driven loops**: Static dataset items with custom attributes

## Base URL
All endpoints are prefixed with `/api/surveys/{surveyId}`

## Authentication
All endpoints require Survey Builder access with appropriate roles:
- **VIEWER**: Can read loop batteries and dataset items
- **EDITOR**: Can create, update, and delete loop batteries and dataset items
- **MANAGER**: Can delete loop batteries

---

## Loop Battery Endpoints

### Create Loop Battery
**POST** `/api/surveys/{surveyId}/loop-batteries`

Creates a new loop battery for a survey.

**Request Body:**
```json
{
  "name": "Brand Satisfaction Loop",
  "startPageId": "uuid-of-start-page",
  "endPageId": "uuid-of-end-page",
  "sourceType": "ANSWER",
  "sourceQuestionId": "uuid-of-source-question",
  "maxItems": 5,
  "randomize": true,
  "sampleWithoutReplacement": true
}
```

**Response:**
```json
{
  "loopBattery": {
    "id": "uuid",
    "name": "Brand Satisfaction Loop",
    "startPageId": "uuid-of-start-page",
    "endPageId": "uuid-of-end-page",
    "sourceType": "ANSWER",
    "sourceQuestionId": "uuid-of-source-question",
    "maxItems": 5,
    "randomize": true,
    "sampleWithoutReplacement": true,
    "startPage": { "id": "uuid", "index": 2, "titleTemplate": "Page 2" },
    "endPage": { "id": "uuid", "index": 4, "titleTemplate": "Page 4" },
    "sourceQuestion": {
      "id": "uuid",
      "variableName": "Q1",
      "titleTemplate": "Which brands do you own?",
      "type": "MULTIPLE_CHOICE",
      "options": [...]
    },
    "datasetItems": []
  }
}
```

### Get All Loop Batteries
**GET** `/api/surveys/{surveyId}/loop-batteries`

Retrieves all loop batteries for a survey.

**Response:**
```json
{
  "loopBatteries": [
    {
      "id": "uuid",
      "name": "Brand Satisfaction Loop",
      "startPage": { "id": "uuid", "index": 2, "titleTemplate": "Page 2" },
      "endPage": { "id": "uuid", "index": 4, "titleTemplate": "Page 4" },
      "sourceQuestion": {
        "id": "uuid",
        "variableName": "Q1",
        "titleTemplate": "Which brands do you own?",
        "type": "MULTIPLE_CHOICE"
      },
      "datasetItems": [...],
      "_count": { "datasetItems": 3 }
    }
  ]
}
```

### Get Loop Battery
**GET** `/api/surveys/{surveyId}/loop-batteries/{batteryId}`

Retrieves a specific loop battery with full details.

**Response:**
```json
{
  "loopBattery": {
    "id": "uuid",
    "name": "Brand Satisfaction Loop",
    "startPageId": "uuid-of-start-page",
    "endPageId": "uuid-of-end-page",
    "sourceType": "ANSWER",
    "sourceQuestionId": "uuid-of-source-question",
    "maxItems": 5,
    "randomize": true,
    "sampleWithoutReplacement": true,
    "startPage": { "id": "uuid", "index": 2, "titleTemplate": "Page 2" },
    "endPage": { "id": "uuid", "index": 4, "titleTemplate": "Page 4" },
    "sourceQuestion": {
      "id": "uuid",
      "variableName": "Q1",
      "titleTemplate": "Which brands do you own?",
      "type": "MULTIPLE_CHOICE",
      "options": [
        { "id": "uuid", "value": "Apple", "labelTemplate": "Apple" },
        { "id": "uuid", "value": "Samsung", "labelTemplate": "Samsung" }
      ]
    },
    "datasetItems": [
      {
        "id": "uuid",
        "key": "Apple",
        "attributes": { "brand": "Apple", "price": "$999" },
        "isActive": true,
        "sortIndex": 1
      }
    ]
  }
}
```

### Update Loop Battery
**PUT** `/api/surveys/{surveyId}/loop-batteries/{batteryId}`

Updates an existing loop battery.

**Request Body:**
```json
{
  "name": "Updated Brand Loop",
  "maxItems": 3,
  "randomize": false
}
```

**Response:** Same as Get Loop Battery

### Delete Loop Battery
**DELETE** `/api/surveys/{surveyId}/loop-batteries/{batteryId}`

Deletes a loop battery. Only allowed for draft surveys.

**Response:**
```json
{
  "message": "Loop battery deleted successfully"
}
```

---

## Dataset Items Endpoints

### Create Dataset Item
**POST** `/api/surveys/{surveyId}/loop-batteries/{batteryId}/dataset-items`

Creates a new dataset item for a loop battery.

**Request Body:**
```json
{
  "key": "PROD001",
  "attributes": {
    "productName": "Smart Water Bottle",
    "price": "$29.99",
    "category": "Health",
    "imageUrl": "https://example.com/image.jpg"
  },
  "isActive": true,
  "sortIndex": 1
}
```

**Response:**
```json
{
  "datasetItem": {
    "id": "uuid",
    "batteryId": "uuid",
    "key": "PROD001",
    "attributes": {
      "productName": "Smart Water Bottle",
      "price": "$29.99",
      "category": "Health",
      "imageUrl": "https://example.com/image.jpg"
    },
    "isActive": true,
    "sortIndex": 1
  }
}
```

### Get Dataset Items
**GET** `/api/surveys/{surveyId}/loop-batteries/{batteryId}/dataset-items`

Retrieves all dataset items for a loop battery.

**Response:**
```json
{
  "datasetItems": [
    {
      "id": "uuid",
      "batteryId": "uuid",
      "key": "PROD001",
      "attributes": {
        "productName": "Smart Water Bottle",
        "price": "$29.99",
        "category": "Health"
      },
      "isActive": true,
      "sortIndex": 1
    },
    {
      "id": "uuid",
      "batteryId": "uuid",
      "key": "PROD002",
      "attributes": {
        "productName": "Wireless Earbuds",
        "price": "$79.99",
        "category": "Tech"
      },
      "isActive": true,
      "sortIndex": 2
    }
  ]
}
```

### Update Dataset Item
**PUT** `/api/surveys/{surveyId}/loop-batteries/{batteryId}/dataset-items/{itemId}`

Updates an existing dataset item.

**Request Body:**
```json
{
  "attributes": {
    "productName": "Updated Product Name",
    "price": "$39.99"
  },
  "isActive": false
}
```

**Response:** Same as Create Dataset Item

### Delete Dataset Item
**DELETE** `/api/surveys/{surveyId}/loop-batteries/{batteryId}/dataset-items/{itemId}`

Deletes a dataset item.

**Response:**
```json
{
  "message": "Dataset item deleted successfully"
}
```

---

## Loop Template Variables

When creating questions and pages within a loop battery, you can use these template variables:

### Basic Loop Variables
- `{{loop.key}}` - The current item's unique identifier
- `{{loop.label}}` - The current item's display label
- `{{loop.index}}` - Current iteration number (1-based)
- `{{loop.total}}` - Total number of iterations

### Loop Status Variables
- `{{loop.isFirst}}` - True if this is the first iteration
- `{{loop.isLast}}` - True if this is the last iteration
- `{{loop.isFirstIteration}}` - Alias for isFirst
- `{{loop.isLastIteration}}` - Alias for isLast

### Progress Variables
- `{{loop.progress}}` - Progress percentage (rounded)
- `{{loop.progressPercent}}` - Progress percentage (with decimals)

### Custom Attributes
- `{{loop.attributeName}}` - Access any custom attribute
- `{{loop.attributes.attributeName}}` - Alternative syntax for attributes

### Example Usage

**Question Title:**
```
How satisfied are you with {{loop.brand}}?
```

**Question Help Text:**
```
This is question {{loop.index}} of {{loop.total}} about {{loop.brand}}.
```

**Page Description:**
```
You're currently rating {{loop.productName}} ({{loop.price}}).
This is iteration {{loop.index}} of {{loop.total}}.
```

---

## Error Responses

### Validation Errors
```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "Loop battery name is required",
      "path": ["name"]
    }
  ]
}
```

### Business Logic Errors
```json
{
  "error": "Start page must come before end page"
}
```

```json
{
  "error": "Loop battery pages overlap with existing loop battery"
}
```

```json
{
  "error": "Source question not found or is not a multi-select question"
}
```

---

## Loop Battery Configuration

### Source Types

#### ANSWER
- Items come from user's responses to a previous multi-select question
- `sourceQuestionId` is required
- Source question must be a `MULTIPLE_CHOICE` or `SINGLE_CHOICE` type
- Source question must come before the loop battery pages

#### DATASET
- Items come from static dataset items
- `sourceQuestionId` is not used
- Dataset items are managed via the dataset items endpoints

### Loop Behavior Options

- **maxItems**: Limit the number of items shown per respondent
- **randomize**: Shuffle the order of items (deterministic per respondent)
- **sampleWithoutReplacement**: When sampling, don't reuse items

### Page Constraints

- Start page must come before end page in the survey
- Loop battery pages cannot overlap with other loop batteries
- Pages within a loop battery are contiguous (no gaps)

---

## Runtime Behavior

### Loop Plan Generation
1. When a respondent reaches the start page of a loop battery, a loop plan is generated
2. For ANSWER loops: Items are derived from the respondent's answers to the source question
3. For DATASET loops: Items come from active dataset items
4. Randomization and sampling are applied based on configuration
5. The plan is stored in the session's render state

### Loop Execution
1. Respondent sees the loop battery pages with the first item's context
2. Template variables are resolved using the current item's data
3. When reaching the end page, the loop advances to the next item
4. If more items remain, respondent returns to the start page
5. If all items are complete, respondent continues after the loop battery

### Answer Management
- Each loop iteration creates separate answer records
- Answers are tagged with loop context for analysis
- If source question answers change, loop plans are recalculated

---

## Best Practices

1. **Keep loop batteries short**: 1-3 pages work best
2. **Use meaningful keys**: Make dataset item keys descriptive
3. **Test thoroughly**: Use preview mode to test loop behavior
4. **Consider respondent fatigue**: Use maxItems to limit iterations
5. **Plan your data**: Think about how you'll analyze loop responses
6. **Validate templates**: Ensure all loop variables are available in context
