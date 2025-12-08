import { ExpressionEvaluator, validateDSL, testDSL, ExpressionContext } from './index';

// Test the DSL parser and evaluator
function runTests() {
  console.log('🧪 Testing Expression Service...\n');

  // Test 1: Basic DSL validation
  console.log('Test 1: DSL Validation');
  const validDSL = "equals(answer('Q1'), 'Yes')";
  const invalidDSL = "equals(answer('Q1'), 'Yes'"; // Missing closing paren
  
  console.log(`✅ Valid DSL: ${validateDSL(validDSL).valid}`);
  console.log(`❌ Invalid DSL: ${validateDSL(invalidDSL).valid} - ${validateDSL(invalidDSL).error}\n`);

  // Test 2: Simple expression evaluation
  console.log('Test 2: Simple Expression Evaluation');
  const context: ExpressionContext = {
    answers: {
      'q1-id': 'Yes',
      'q2-id': 25
    },
    questions: [
      { id: 'q1-id', variableName: 'Q1', type: 'SINGLE_CHOICE' },
      { id: 'q2-id', variableName: 'Q2', type: 'NUMBER' }
    ]
  };

  const evaluator = new ExpressionEvaluator(context);
  
  console.log(`equals(answer('Q1'), 'Yes'): ${evaluator.evaluate("equals(answer('Q1'), 'Yes')")}`);
  console.log(`equals(answer('Q1'), 'No'): ${evaluator.evaluate("equals(answer('Q1'), 'No')")}`);
  console.log(`greaterThan(answer('Q2'), 18): ${evaluator.evaluate("greaterThan(answer('Q2'), 18)")}`);
  console.log(`lessThan(answer('Q2'), 30): ${evaluator.evaluate("lessThan(answer('Q2'), 30)")}\n`);

  // Test 3: Complex expressions with logical operators
  console.log('Test 3: Complex Expressions');
  console.log(`Q1='Yes' AND Q2>18: ${evaluator.evaluate("equals(answer('Q1'), 'Yes') && greaterThan(answer('Q2'), 18)")}`);
  console.log(`Q1='No' OR Q2>30: ${evaluator.evaluate("equals(answer('Q1'), 'No') || greaterThan(answer('Q2'), 30)")}`);
  console.log(`NOT Q1='No': ${evaluator.evaluate("!(equals(answer('Q1'), 'No'))")}\n`);

  // Test 4: Multiple choice functions
  console.log('Test 4: Multiple Choice Functions');
  const multiChoiceContext: ExpressionContext = {
    answers: {
      'q1-id': ['Apple', 'Banana'],
      'q2-id': 'Orange'
    },
    questions: [
      { id: 'q1-id', variableName: 'Q1', type: 'MULTIPLE_CHOICE' },
      { id: 'q2-id', variableName: 'Q2', type: 'SINGLE_CHOICE' }
    ]
  };

  const multiChoiceEvaluator = new ExpressionEvaluator(multiChoiceContext);
  
  console.log(`anySelected('Q1', ['Apple', 'Banana']): ${multiChoiceEvaluator.evaluate("anySelected('Q1', ['Apple', 'Banana'])")}`);
  console.log(`allSelected('Q1', ['Apple', 'Banana']): ${multiChoiceEvaluator.evaluate("allSelected('Q1', ['Apple', 'Banana'])")}`);
  console.log(`noneSelected('Q1', ['Orange', 'Grape']): ${multiChoiceEvaluator.evaluate("noneSelected('Q1', ['Orange', 'Grape'])")}\n`);

  // Test 5: Text functions
  console.log('Test 5: Text Functions');
  const textContext: ExpressionContext = {
    answers: {
      'q1-id': 'john.doe@example.com',
      'q2-id': 'Mr. John Doe'
    },
    questions: [
      { id: 'q1-id', variableName: 'Q1', type: 'TEXT' },
      { id: 'q2-id', variableName: 'Q2', type: 'TEXT' }
    ]
  };

  const textEvaluator = new ExpressionEvaluator(textContext);
  
  console.log(`contains(answer('Q1'), 'email'): ${textEvaluator.evaluate("contains(answer('Q1'), 'email')")}`);
  console.log(`startsWith(answer('Q2'), 'Mr.'): ${textEvaluator.evaluate("startsWith(answer('Q2'), 'Mr.')")}\n`);

  // Test 6: Test DSL function
  console.log('Test 6: Test DSL Function');
  const testResult = testDSL(
    "equals(answer('Q1'), 'Yes') && greaterThan(answer('Q2'), 18)",
    { 'q1-id': 'Yes', 'q2-id': 25 },
    [
      { id: 'q1-id', variableName: 'Q1', type: 'SINGLE_CHOICE' },
      { id: 'q2-id', variableName: 'Q2', type: 'NUMBER' }
    ]
  );
  
  console.log(`Test result: ${testResult.result}`);
  if (testResult.error) {
    console.log(`Test error: ${testResult.error}`);
  }

  console.log('\n🎉 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

export { runTests };
