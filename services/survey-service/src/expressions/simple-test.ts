import { ExpressionEvaluator, validateDSL } from './index';

// Simple test to verify basic functionality
function simpleTest() {
  console.log('🧪 Simple Expression Test...\n');

  // Test 1: Basic validation
  console.log('Test 1: Basic DSL Validation');
  const validDSL = "equals(answer('Q1'), 'Yes')";
  const result = validateDSL(validDSL);
  console.log(`✅ Valid DSL: ${result.valid}`);
  if (!result.valid) {
    console.log(`❌ Error: ${result.error}`);
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

  console.log('\n🎉 Simple test completed!');
}

simpleTest();
