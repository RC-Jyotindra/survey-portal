import { QuestionWithDetails } from './api/questions-api';

// Generate mock responses for testing piping in preview mode
export function generateMockResponses(questions: QuestionWithDetails[]): Record<string, any> {
  const responses: Record<string, any> = {};
  
  questions.forEach((question) => {
    switch (question.type) {
      case 'SINGLE_CHOICE':
        if (question.options.length > 0) {
          const selectedOption = question.options[0];
          responses[question.variableName] = {
            value: selectedOption?.value,
            choiceText: selectedOption?.labelTemplate
          };
        }
        break;
        
      case 'MULTIPLE_CHOICE':
        if (question.options.length > 0) {
          const selectedOptions = question.options.slice(0, 2);
          responses[question.variableName] = {
            value: selectedOptions.map(opt => opt.value),
            choiceText: selectedOptions.map(opt => opt.labelTemplate).join(', ')
          };
        }
        break;
        
      case 'TEXT':
      case 'TEXTAREA':
        responses[question.variableName] = {
          value: `Sample response for ${question.variableName}`,
          choiceText: `Sample response for ${question.variableName}`
        };
        break;
        
      case 'NUMBER':
        responses[question.variableName] = {
          value: Math.floor(Math.random() * 100) + 1,
          choiceText: String(Math.floor(Math.random() * 100) + 1)
        };
        break;
        
      case 'DROPDOWN':
        if (question.options.length > 0) {
          const selectedOption = question.options[Math.floor(Math.random() * question.options.length)];
          responses[question.variableName] = {
            value: selectedOption?.value,
            choiceText: selectedOption?.labelTemplate
          };
        }
        break;
        
      default:
        responses[question.variableName] = {
          value: 'Sample Value',
          choiceText: 'Sample Value'
        };
    }
  });
  
  return responses;
}

// Generate mock embedded data for testing
export function generateMockEmbeddedData(): Record<string, any> {
  return {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    company: 'Research Connect',
    department: 'Engineering',
    userId: 'user_12345',
    customField1: 'Value 1',
    customField2: 'Value 2'
  };
}

// Generate mock GeoIP data for testing
export function generateMockGeoIPData(): Record<string, any> {
  return {
    country: 'United States',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    region: 'North America',
    timezone: 'EST'
  };
}

// Extract piping dependencies from a question
export function extractPipingDependencies(question: QuestionWithDetails): string[] {
  const tokenRegex = /\$\{pipe:question:([^:]+):[^}]+\}/g;
  const dependencies: string[] = [];
  let match;
  
  const textToSearch = `${question.titleTemplate} ${question.helpTextTemplate || ''}`;
  
  while ((match = tokenRegex.exec(textToSearch)) !== null) {
    const variableName = match[1];
    if (variableName && !dependencies.includes(variableName)) {
      dependencies.push(variableName);
    }
  }
  
  return dependencies;
}

// Check if a question can be piped (has responses from previous questions)
export function canPipeFromQuestions(
  currentQuestion: QuestionWithDetails,
  allQuestions: QuestionWithDetails[]
): QuestionWithDetails[] {
  const currentIndex = allQuestions.findIndex(q => q.id === currentQuestion.id);
  if (currentIndex === -1) return [];
  
  // Return all previous questions (questions that appear before this one)
  return allQuestions.slice(0, currentIndex);
}

// Validate piping tokens and return errors
export function validateQuestionPiping(
  question: QuestionWithDetails,
  availableQuestions: QuestionWithDetails[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const availableVariables = new Set(availableQuestions.map(q => q.variableName));
  
  const dependencies = extractPipingDependencies(question);
  
  for (const dep of dependencies) {
    if (!availableVariables.has(dep)) {
      errors.push(`Referenced question "${dep}" is not available for piping`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
