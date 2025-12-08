import { QuestionWithDetails } from './api/questions-api';
import { CarryForwardConfig } from '../components/survey-builder/carry-forward-modal';

export interface CarryForwardOption {
  id: string;
  value: string;
  labelTemplate: string;
  originalQuestionId: string;
  isCarriedForward: true;
}

/**
 * Resolve carry forward options for a question based on responses
 */
export function resolveCarryForwardOptions(
  question: QuestionWithDetails,
  allQuestions: QuestionWithDetails[],
  responses: Record<string, any> = {},
  config?: CarryForwardConfig
): CarryForwardOption[] {
  if (question.optionsSource !== 'CARRY_FORWARD' || !question.carryForwardQuestionId) {
    return [];
  }

  // Find the source question
  const sourceQuestion = allQuestions.find(q => q.id === question.carryForwardQuestionId);
  if (!sourceQuestion || !sourceQuestion.options) {
    return [];
  }

  // Get the response for the source question
  const sourceResponse = responses[sourceQuestion.id] || responses[sourceQuestion.variableName];
  
  // Default filter type if not provided
  const filterType = config?.filterType || 'SELECTED_CHOICES';
  
  // Filter options based on the filter type
  let filteredOptions = sourceQuestion.options;
  
  switch (filterType) {
    case 'ALL_CHOICES':
      // Include all choices regardless of display or selection
      filteredOptions = sourceQuestion.options;
      break;
      
    case 'DISPLAYED_CHOICES':
      // TODO: This would require tracking which options were actually displayed
      // For now, assume all options were displayed
      filteredOptions = sourceQuestion.options;
      break;
      
    case 'NOT_DISPLAYED_CHOICES':
      // TODO: This would require tracking which options were hidden
      // For now, return empty array
      filteredOptions = [];
      break;
      
    case 'SELECTED_CHOICES':
      if (!sourceResponse) {
        filteredOptions = [];
      } else {
        // Handle both direct values and nested value objects
        let selectedValues;
        if (sourceResponse.value !== undefined) {
          selectedValues = Array.isArray(sourceResponse.value) 
            ? sourceResponse.value 
            : [sourceResponse.value];
        } else {
          selectedValues = Array.isArray(sourceResponse) 
            ? sourceResponse 
            : [sourceResponse];
        }
        filteredOptions = sourceQuestion.options.filter(opt => 
          selectedValues.includes(opt.value)
        );
      }
      break;
      
    case 'UNSELECTED_CHOICES':
      if (!sourceResponse) {
        filteredOptions = sourceQuestion.options;
      } else {
        const selectedValues = Array.isArray(sourceResponse.value) 
          ? sourceResponse.value 
          : [sourceResponse.value];
        filteredOptions = sourceQuestion.options.filter(opt => 
          !selectedValues.includes(opt.value)
        );
      }
      break;
  }

  // Convert to carry forward options
  return filteredOptions.map((option, index) => ({
    id: `cf_${option.id}`,
    value: option.value,
    labelTemplate: option.labelTemplate,
    originalQuestionId: sourceQuestion.id,
    isCarriedForward: true as const
  }));
}

/**
 * Get carry forward configuration from question data
 */
export function getCarryForwardConfig(question: QuestionWithDetails): CarryForwardConfig | null {
  if (question.optionsSource !== 'CARRY_FORWARD' || !question.carryForwardQuestionId) {
    return null;
  }

  // TODO: Parse filter type from carryForwardFilterExprId
  // For now, default to SELECTED_CHOICES
  return {
    sourceQuestionId: question.carryForwardQuestionId,
    filterType: 'SELECTED_CHOICES'
  };
}

/**
 * Check if a question can be used as a carry forward source
 */
export function canBeCarryForwardSource(question: QuestionWithDetails): boolean {
  return (
    (question.type === 'SINGLE_CHOICE' || 
     question.type === 'MULTIPLE_CHOICE' || 
     question.type === 'DROPDOWN') &&
    question.options && 
    question.options.length > 0
  );
}

/**
 * Get available questions for carry forward (previous questions with choices)
 */
export function getAvailableCarryForwardSources(
  currentQuestion: QuestionWithDetails,
  allQuestions: QuestionWithDetails[]
): QuestionWithDetails[] {
  const currentIndex = allQuestions.findIndex(q => q.id === currentQuestion.id);
  if (currentIndex === -1) return [];

  // Get previous questions that can be sources
  return allQuestions
    .slice(0, currentIndex)
    .filter(canBeCarryForwardSource);
}

/**
 * Validate carry forward configuration
 */
export function validateCarryForward(
  question: QuestionWithDetails,
  allQuestions: QuestionWithDetails[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (question.optionsSource !== 'CARRY_FORWARD') {
    return { isValid: true, errors: [] };
  }

  if (!question.carryForwardQuestionId) {
    errors.push('Carry forward source question is not specified');
    return { isValid: false, errors };
  }

  const sourceQuestion = allQuestions.find(q => q.id === question.carryForwardQuestionId);
  if (!sourceQuestion) {
    errors.push('Carry forward source question not found');
    return { isValid: false, errors };
  }

  if (!canBeCarryForwardSource(sourceQuestion)) {
    errors.push('Source question must be Single Choice, Multiple Choice, or Dropdown with options');
    return { isValid: false, errors };
  }

  // Check if source question comes before current question
  const currentIndex = allQuestions.findIndex(q => q.id === question.id);
  const sourceIndex = allQuestions.findIndex(q => q.id === question.carryForwardQuestionId);
  
  if (sourceIndex >= currentIndex) {
    errors.push('Source question must appear before the current question');
    return { isValid: false, errors };
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Generate mock carry forward options for testing/preview
 */
export function generateMockCarryForwardOptions(
  question: QuestionWithDetails,
  allQuestions: QuestionWithDetails[]
): CarryForwardOption[] {
  if (question.optionsSource !== 'CARRY_FORWARD' || !question.carryForwardQuestionId) {
    return [];
  }

  const sourceQuestion = allQuestions.find(q => q.id === question.carryForwardQuestionId);
  if (!sourceQuestion || !sourceQuestion.options) {
    return [];
  }

  // For mock/preview, show first 2-3 options as "selected" to demonstrate carry forward
  const mockSelectedOptions = sourceQuestion.options.slice(0, Math.min(3, sourceQuestion.options.length));
  
  return mockSelectedOptions.map(option => ({
    id: `cf_mock_${option.id}`,
    value: option.value,
    labelTemplate: option.labelTemplate,
    originalQuestionId: sourceQuestion.id,
    isCarriedForward: true as const
  }));
}
