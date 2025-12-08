# DSL Function Testing Guide

## Overview

This guide provides comprehensive test scenarios to validate that all DSL functions are working correctly in both frontend preview and backend runtime environments.

## Test Scenarios

### 1. Basic Comparison Functions

#### equals() Function
- **Test**: `equals(answer('Q1'), 'Yes')`
- **Expected**: Returns true when Q1 answer is exactly 'Yes'
- **Test Cases**:
  - Single choice question with 'Yes' selected → true
  - Single choice question with 'No' selected → false
  - Multiple choice question with ['Yes', 'No'] → false
  - Text question with 'Yes' → true
  - Text question with 'yes' (lowercase) → false

#### notEquals() Function
- **Test**: `notEquals(answer('Q1'), 'No')`
- **Expected**: Returns true when Q1 answer is NOT 'No'
- **Test Cases**:
  - Single choice question with 'Yes' selected → true
  - Single choice question with 'No' selected → false
  - Multiple choice question with ['Yes', 'No'] → true

### 2. Multiple Choice Functions

#### anySelected() Function
- **Test**: `anySelected('Q2', ['Option1', 'Option2'])`
- **Expected**: Returns true if ANY of the specified options are selected
- **Test Cases**:
  - Q2 has ['Option1'] → true
  - Q2 has ['Option2'] → true
  - Q2 has ['Option1', 'Option2'] → true
  - Q2 has ['Option3'] → false
  - Q2 has [] (no selection) → false
  - Q2 has ['Option1', 'Option3'] → true

#### allSelected() Function
- **Test**: `allSelected('Q2', ['Option1', 'Option2'])`
- **Expected**: Returns true if ALL specified options are selected
- **Test Cases**:
  - Q2 has ['Option1', 'Option2'] → true
  - Q2 has ['Option1'] → false
  - Q2 has ['Option2'] → false
  - Q2 has ['Option1', 'Option2', 'Option3'] → true
  - Q2 has ['Option3'] → false
  - Q2 has [] (no selection) → false

#### noneSelected() Function
- **Test**: `noneSelected('Q2', ['Option1', 'Option2'])`
- **Expected**: Returns true if NONE of the specified options are selected
- **Test Cases**:
  - Q2 has ['Option3'] → true
  - Q2 has [] (no selection) → true
  - Q2 has ['Option1'] → false
  - Q2 has ['Option2'] → false
  - Q2 has ['Option1', 'Option2'] → false
  - Q2 has ['Option1', 'Option3'] → false

### 3. String Functions

#### contains() Function
- **Test**: `contains(answer('Q3'), 'test')`
- **Expected**: Returns true if the answer contains the substring
- **Test Cases**:
  - Q3 answer is 'This is a test' → true
  - Q3 answer is 'Testing' → true
  - Q3 answer is 'No match' → false
  - Q3 answer is 'TEST' (uppercase) → false

#### startsWith() Function
- **Test**: `startsWith(answer('Q3'), 'Hello')`
- **Expected**: Returns true if the answer starts with the prefix
- **Test Cases**:
  - Q3 answer is 'Hello World' → true
  - Q3 answer is 'Hello' → true
  - Q3 answer is 'Say Hello' → false
  - Q3 answer is 'hello' (lowercase) → false

### 4. Numeric Functions

#### greaterThan() Function
- **Test**: `greaterThan(answer('Q4'), 5)`
- **Expected**: Returns true if the numeric answer is greater than 5
- **Test Cases**:
  - Q4 answer is 6 → true
  - Q4 answer is 5 → false
  - Q4 answer is 4 → false
  - Q4 answer is '6' (string) → true

#### lessThan() Function
- **Test**: `lessThan(answer('Q4'), 10)`
- **Expected**: Returns true if the numeric answer is less than 10
- **Test Cases**:
  - Q4 answer is 9 → true
  - Q4 answer is 10 → false
  - Q4 answer is 11 → false

### 5. Complex Logic

#### AND Logic
- **Test**: `and(equals(answer('Q1'), 'Yes'), anySelected('Q2', ['Option1']))`
- **Expected**: Returns true only if BOTH conditions are met
- **Test Cases**:
  - Q1='Yes', Q2=['Option1'] → true
  - Q1='No', Q2=['Option1'] → false
  - Q1='Yes', Q2=['Option2'] → false
  - Q1='No', Q2=['Option2'] → false

#### OR Logic
- **Test**: `or(equals(answer('Q1'), 'Yes'), anySelected('Q2', ['Option1']))`
- **Expected**: Returns true if EITHER condition is met
- **Test Cases**:
  - Q1='Yes', Q2=['Option1'] → true
  - Q1='No', Q2=['Option1'] → true
  - Q1='Yes', Q2=['Option2'] → true
  - Q1='No', Q2=['Option2'] → false

## Question ID Resolution Tests

### Variable Name Resolution
- **Test**: Use variable names like 'Q1', 'Q2' instead of UUIDs
- **Expected**: Functions should resolve variable names to actual question IDs
- **Test Cases**:
  - `anySelected('Q1', ['Option1'])` should work with question variable name 'Q1'
  - `equals(answer('Q2'), 'Yes')` should work with question variable name 'Q2'

## Data Structure Tests

### Answer Format Validation
- **Test**: Ensure answers are stored with proper structure
- **Expected**: Multiple choice answers should have `choices` property
- **Test Cases**:
  - Multiple choice answer: `{ questionId: 'uuid', choices: ['Option1', 'Option2'] }`
  - Single text answer: `{ questionId: 'uuid', textValue: 'answer' }`
  - Numeric answer: `{ questionId: 'uuid', numericValue: 123 }`

## Frontend vs Backend Consistency

### Preview vs Runtime
- **Test**: Same DSL expressions should return same results in both environments
- **Expected**: Frontend preview should match backend runtime behavior
- **Test Cases**:
  - All DSL functions should work identically in both environments
  - Question ID resolution should work the same way
  - Data structure handling should be consistent

## Error Handling Tests

### Invalid DSL
- **Test**: Malformed DSL expressions
- **Expected**: Should return false (fail-safe) and log warnings
- **Test Cases**:
  - `anySelected('Q1', [])` (empty array)
  - `equals(answer(''), 'value')` (empty question ID)
  - `unknownFunction('Q1')` (unknown function)

### Missing Data
- **Test**: DSL functions with missing answers or questions
- **Expected**: Should return false and log warnings
- **Test Cases**:
  - `anySelected('Q999', ['Option1'])` (non-existent question)
  - `equals(answer('Q1'), 'value')` when Q1 has no answer

## Logging Validation

### Backend Logging
- **Expected Logs**:
  ```
  [DSL_EVAL] evaluateExpression: 'anySelected('Q1', ['Option1'])'
  [DSL_EVAL] evaluateFunction: anySelected(Q1, Option1)
  [DSL_EVAL] anySelected: questionId='Q1', options=[Option1]
  [DSL_EVAL] Mapped variable name 'Q1' -> 'actual-uuid-here'
  [DSL_EVAL] Found answer: { choices: ['Option1'] }
  [DSL_EVAL] anySelected result: true
  [DSL_EVAL] evaluateExpression result: true
  ```

### Frontend Logging
- **Expected Logs**:
  ```
  [PREVIEW_DSL] evaluateExpression: 'anySelected('Q1', ['Option1'])'
  [PREVIEW_DSL] anySelected: questionVar='Q1', valuesStr='Option1'
  [PREVIEW_DSL] anySelected response: ['Option1'] values: ['Option1']
  [PREVIEW_DSL] anySelected result: true
  [PREVIEW_DSL] evaluateExpression result: true
  ```

## Jump Logic Tests

### Question Jumps
- **Test**: Jump logic with various DSL functions
- **Expected**: Jumps should execute when conditions are met
- **Test Cases**:
  - Jump to page 2 if `anySelected('Q1', ['Option1'])`
  - Jump to question 5 if `equals(answer('Q2'), 'Yes')`
  - Jump to end if `allSelected('Q3', ['Option1', 'Option2'])`

### Termination Logic
- **Test**: Termination logic with various DSL functions
- **Expected**: Survey should terminate when conditions are met
- **Test Cases**:
  - Terminate if `anySelected('Q1', ['Terminate'])`
  - Terminate if `equals(answer('Q2'), 'No')`
  - Terminate if `noneSelected('Q3', ['Continue'])`

## Performance Tests

### Large Surveys
- **Test**: DSL evaluation with many questions and complex logic
- **Expected**: Should perform efficiently without timeouts
- **Test Cases**:
  - Survey with 100+ questions
  - Complex nested logic with multiple AND/OR operations
  - Multiple jump rules with different priorities

## Success Criteria

All tests should pass with:
- ✅ Correct boolean results for all DSL functions
- ✅ Proper question ID resolution (variable names → UUIDs)
- ✅ Consistent behavior between frontend and backend
- ✅ Comprehensive logging for debugging
- ✅ Fail-safe error handling (return false on errors)
- ✅ Jump logic working with all DSL functions
- ✅ Termination logic working with all DSL functions

## Debugging Tips

1. **Check Console Logs**: Look for `[DSL_EVAL]` and `[PREVIEW_DSL]` logs
2. **Verify Data Structure**: Ensure answers have proper `choices` property
3. **Question ID Mapping**: Check that `questionIdMap` is populated correctly
4. **Function Implementation**: Verify all DSL functions are implemented in both environments
5. **Error Handling**: Look for warning messages about missing data or failed evaluations
