import { ExpressionEvaluator, validateDSL } from './index';

// Quick test to verify the fixes work
function quickTest() {
  console.log('🧪 Quick Expression Test...\n');

  // Test 1: Basic validation
  console.log('Test 1: DSL Validation');
  const validDSL = "equals(answer('Q1'), 'Yes')";
  const result = validateDSL(validDSL);
  console.log(`✅ Valid DSL: ${result.valid}`);
  if (!result.valid) {
    console.log(`❌ Error: ${result.error}`);
    return;
  }

  // Test 2: Simple evaluation
  console.log('\nTest 2: Simple Evaluation');
  const context = {
    answers: { 'q1-id': 'Yes' },
    questions: [{ id: 'q1-id', variableName: 'Q1', type: 'SINGLE_CHOICE' as any }]
  };

  const evaluator = new ExpressionEvaluator(context);
  const result2 = evaluator.evaluate(validDSL);
  console.log(`✅ Expression result: ${result2}`);

  // Test 3: Multiple choice
  console.log('\nTest 3: Multiple Choice');
  const multiChoiceDSL = "anySelected('Q1', ['Apple', 'Banana'])";
  const multiChoiceContext = {
    answers: { 'q1-id': ['Apple', 'Orange'] },
    questions: [{ id: 'q1-id', variableName: 'Q1', type: 'MULTIPLE_CHOICE' as any }]
  };

  const multiChoiceEvaluator = new ExpressionEvaluator(multiChoiceContext);
  const result3 = multiChoiceEvaluator.evaluate(multiChoiceDSL);
  console.log(`✅ Multiple choice result: ${result3}`);

  console.log('\n🎉 Quick test completed successfully!');
}

quickTest();
