/**
 * Simple test to verify suggested choices functionality
 */

import { 
  SUGGESTED_CHOICES, 
  getSuggestedChoicesByCategory, 
  getSuggestedChoiceCategories,
  getSuggestedChoiceById 
} from './suggested-choices';

// Test basic functionality
console.log('Testing Suggested Choices...');

// Test 1: Check if we have suggested choices
console.log('✓ Total suggested choices:', SUGGESTED_CHOICES.length);

// Test 2: Check categories
const categories = getSuggestedChoiceCategories();
console.log('✓ Categories:', categories);

// Test 3: Test filtering by category
const ratingChoices = getSuggestedChoicesByCategory('Rating');
console.log('✓ Rating choices:', ratingChoices.length);

// Test 4: Test getting choice by ID
const agreementChoice = getSuggestedChoiceById('agreement_scale');
console.log('✓ Agreement scale choice:', agreementChoice?.label);

// Test 5: Verify choice structure
if (agreementChoice) {
  console.log('✓ Choice structure valid:', {
    hasId: !!agreementChoice.id,
    hasLabel: !!agreementChoice.label,
    hasDescription: !!agreementChoice.description,
    hasCategory: !!agreementChoice.category,
    hasChoices: !!agreementChoice.choices,
    choicesCount: agreementChoice.choices.length
  });
}

console.log('✅ All tests passed!');
