/**
 * Validation Engine
 * 
 * Handles the "Validate" step of the runtime engine:
 * - Enforces required fields, type validation, ranges, file limits
 * - Matrix rules, constant-sum totals, formats
 * - Returns structured violations for display
 */

export interface ValidationViolation {
  questionId: string;
  code: string;
  message: string;
  field?: string; // for matrix questions, which cell
}

export interface ValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
}

export interface AnswerData {
  questionId: string;
  choices?: string[];
  textValue?: string;
  numericValue?: number;
  decimalValue?: number;
  booleanValue?: boolean;
  emailValue?: string;
  phoneValue?: string;
  urlValue?: string;
  dateValue?: Date;
  timeValue?: Date;
  fileUrls?: string[];
  signatureUrl?: string;
  paymentId?: string;
  paymentStatus?: string;
  jsonValue?: any; // for matrix, rank, etc.
}

export interface QuestionConfig {
  id: string;
  type: string;
  required: boolean;
  validation?: any;
  minValue?: number;
  maxValue?: number;
  stepValue?: number;
  maxSelections?: number;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  minDate?: Date;
  maxDate?: Date;
  phoneFormat?: string;
  countryCode?: string;
  urlProtocol?: string;
  totalPoints?: number;
  allowZero?: boolean;
  matrixType?: string;
  showHeaders?: boolean;
  randomizeRows?: boolean;
  randomizeColumns?: boolean;
  requireSignature?: boolean;
  collectName?: boolean;
  collectEmail?: boolean;
  collectPhone?: boolean;
  collectCompany?: boolean;
  collectAddress?: boolean;
  groupSize?: number;
  groupLabel?: string;
}

/**
 * Validate a set of answers against their question configurations
 */
export function validateAnswers(
  answers: AnswerData[],
  questions: QuestionConfig[]
): ValidationResult {
  const violations: ValidationViolation[] = [];
  
  // Create a map of questions for quick lookup
  const questionMap = new Map(questions.map(q => [q.id, q]));
  
  // Validate each answer
  for (const answer of answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      violations.push({
        questionId: answer.questionId,
        code: 'QUESTION_NOT_FOUND',
        message: 'Question not found'
      });
      continue;
    }
    
    const answerViolations = validateAnswer(answer, question);
    violations.push(...answerViolations);
  }
  
  // Check for missing required answers
  const answeredQuestionIds = new Set(answers.map(a => a.questionId));
  for (const question of questions) {
    if (question.required && !answeredQuestionIds.has(question.id)) {
      violations.push({
        questionId: question.id,
        code: 'REQUIRED',
        message: 'This field is required'
      });
    }
  }
  
  return {
    isValid: violations.length === 0,
    violations
  };
}

/**
 * Validate a single answer against its question configuration
 */
function validateAnswer(
  answer: AnswerData,
  question: QuestionConfig
): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  // Check if answer is empty (but not for non-required questions)
  if (isEmpty(answer) && question.required) {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'This field is required'
    });
    return violations; // No point in further validation if required field is empty
  }
  
  // Skip validation for empty non-required answers
  if (isEmpty(answer) && !question.required) {
    return violations;
  }
  
  // Type-specific validation
  switch (question.type) {
    case 'SINGLE_CHOICE':
    case 'DROPDOWN':
    case 'YES_NO':
      violations.push(...validateSingleChoice(answer, question));
      break;
    
    case 'MULTIPLE_CHOICE':
      violations.push(...validateMultipleChoice(answer, question));
      break;
    
    case 'TEXT':
    case 'TEXTAREA':
      violations.push(...validateText(answer, question));
      break;
    
    case 'EMAIL':
      violations.push(...validateEmail(answer, question));
      break;
    
    case 'PHONE_NUMBER':
      violations.push(...validatePhone(answer, question));
      break;
    
    case 'WEBSITE':
      violations.push(...validateUrl(answer, question));
      break;
    
    case 'NUMBER':
    case 'DECIMAL':
      violations.push(...validateNumber(answer, question));
      break;
    
    case 'SLIDER':
    case 'OPINION_SCALE':
      violations.push(...validateSlider(answer, question));
      break;
    
    case 'CONSTANT_SUM':
      violations.push(...validateConstantSum(answer, question));
      break;
    
    case 'DATE':
      violations.push(...validateDate(answer, question));
      break;
    
    case 'TIME':
      violations.push(...validateTime(answer, question));
      break;
    
    case 'DATETIME':
      violations.push(...validateDateTime(answer, question));
      break;
    
    case 'FILE_UPLOAD':
    case 'PHOTO_CAPTURE':
      violations.push(...validateFileUpload(answer, question));
      break;
    
    case 'MATRIX_SINGLE':
    case 'MATRIX_MULTIPLE':
    case 'BIPOLAR_MATRIX':
      violations.push(...validateMatrix(answer, question));
      break;
    
    case 'RANK':
      violations.push(...validateRank(answer, question));
      break;
    
    case 'PICTURE_CHOICE':
      violations.push(...validatePictureChoice(answer, question));
      break;
    
    case 'PAYMENT':
      violations.push(...validatePayment(answer, question));
      break;
    
    case 'SIGNATURE':
      violations.push(...validateSignature(answer, question));
      break;
    
    case 'CONSENT_AGREEMENT':
      violations.push(...validateConsent(answer, question));
      break;
    
    case 'CONTACT_FORM':
      violations.push(...validateContactForm(answer, question));
      break;
    
    case 'GROUP_RANK':
    case 'GROUP_RATING':
      violations.push(...validateGroupRank(answer, question));
      break;
    
    default:
      // For unknown types, just check if it's not empty
      if (isEmpty(answer)) {
        violations.push({
          questionId: question.id,
          code: 'INVALID_TYPE',
          message: 'Invalid answer format'
        });
      }
  }
  
  return violations;
}

function isEmpty(answer: AnswerData): boolean {
  // Special handling for contact form JSON values
  if (answer.jsonValue && typeof answer.jsonValue === 'object') {
    const hasContactData = Object.values(answer.jsonValue).some(value => 
      value && typeof value === 'string' && value.trim() !== ''
    );
    if (hasContactData) return false;
  }
  
  return (
    (!answer.choices || answer.choices.length === 0) &&
    (!answer.textValue || answer.textValue.trim() === '') &&
    answer.numericValue === undefined &&
    answer.decimalValue === undefined &&
    answer.booleanValue === undefined &&
    (!answer.emailValue || answer.emailValue.trim() === '') &&
    (!answer.phoneValue || answer.phoneValue.trim() === '') &&
    (!answer.urlValue || answer.urlValue.trim() === '') &&
    !answer.dateValue &&
    !answer.timeValue &&
    (!answer.fileUrls || answer.fileUrls.length === 0) &&
    (!answer.signatureUrl || answer.signatureUrl.trim() === '') &&
    (!answer.paymentId || answer.paymentId.trim() === '') &&
    !answer.jsonValue
  );
}

function validateSingleChoice(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.choices || answer.choices.length === 0) {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Please select an option'
    });
  } else if (answer.choices.length > 1) {
    violations.push({
      questionId: question.id,
      code: 'TOO_MANY_SELECTIONS',
      message: 'Please select only one option'
    });
  }
  
  return violations;
}

function validateMultipleChoice(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.choices || answer.choices.length === 0) {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Please select at least one option'
    });
  } else if (question.maxSelections && answer.choices.length > question.maxSelections) {
    violations.push({
      questionId: question.id,
      code: 'TOO_MANY_SELECTIONS',
      message: `Please select no more than ${question.maxSelections} options`
    });
  }
  
  return violations;
}

function validateText(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.textValue || answer.textValue.trim() === '') {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'This field is required'
    });
    return violations;
  }
  
  const text = answer.textValue.trim();
  
  // Check length constraints
  if (question.validation?.minLength && text.length < question.validation.minLength) {
    violations.push({
      questionId: question.id,
      code: 'TOO_SHORT',
      message: `Text must be at least ${question.validation.minLength} characters`
    });
  }
  
  if (question.validation?.maxLength && text.length > question.validation.maxLength) {
    violations.push({
      questionId: question.id,
      code: 'TOO_LONG',
      message: `Text must be no more than ${question.validation.maxLength} characters`
    });
  }
  
  // Check pattern
  if (question.validation?.pattern) {
    const regex = new RegExp(question.validation.pattern);
    if (!regex.test(text)) {
      violations.push({
        questionId: question.id,
        code: 'INVALID_PATTERN',
        message: question.validation.patternMessage || 'Invalid format'
      });
    }
  }
  
  return violations;
}

function validateEmail(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.emailValue || answer.emailValue.trim() === '') {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Email address is required'
    });
    return violations;
  }
  
  const email = answer.emailValue.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    violations.push({
      questionId: question.id,
      code: 'INVALID_EMAIL',
      message: 'Please enter a valid email address'
    });
  }
  
  return violations;
}

function validatePhone(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.phoneValue || answer.phoneValue.trim() === '') {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Phone number is required'
    });
    return violations;
  }
  
  const phone = answer.phoneValue.trim();
  
  // Basic phone validation (can be enhanced based on format)
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
    violations.push({
      questionId: question.id,
      code: 'INVALID_PHONE',
      message: 'Please enter a valid phone number'
    });
  }
  
  return violations;
}

function validateUrl(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.urlValue || answer.urlValue.trim() === '') {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Website URL is required'
    });
    return violations;
  }
  
  const url = answer.urlValue.trim();
  
  try {
    const urlObj = new URL(url);
    
    // Check protocol if specified
    if (question.urlProtocol === 'https' && urlObj.protocol !== 'https:') {
      violations.push({
        questionId: question.id,
        code: 'INVALID_PROTOCOL',
        message: 'URL must use HTTPS'
      });
    }
  } catch {
    violations.push({
      questionId: question.id,
      code: 'INVALID_URL',
      message: 'Please enter a valid URL'
    });
  }
  
  return violations;
}

function validateNumber(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  const value = answer.numericValue ?? answer.decimalValue;
  
  if (value === undefined || value === null) {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Number is required'
    });
    return violations;
  }
  
  if (isNaN(value)) {
    violations.push({
      questionId: question.id,
      code: 'INVALID_NUMBER',
      message: 'Please enter a valid number'
    });
    return violations;
  }
  
  // Check range constraints
  if (question.minValue !== undefined && value < question.minValue) {
    violations.push({
      questionId: question.id,
      code: 'TOO_SMALL',
      message: `Value must be at least ${question.minValue}`
    });
  }
  
  if (question.maxValue !== undefined && value > question.maxValue) {
    violations.push({
      questionId: question.id,
      code: 'TOO_LARGE',
      message: `Value must be no more than ${question.maxValue}`
    });
  }
  
  return violations;
}

function validateSlider(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  return validateNumber(answer, question);
}

function validateConstantSum(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.jsonValue || !Array.isArray(answer.jsonValue)) {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Please allocate points to all options'
    });
    return violations;
  }
  
  const totalPoints = question.totalPoints || 100;
  const sum = answer.jsonValue.reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
  
  if (Math.abs(sum - totalPoints) > 0.01) { // Allow small floating point errors
    violations.push({
      questionId: question.id,
      code: 'INVALID_TOTAL',
      message: `Points must total exactly ${totalPoints}`
    });
  }
  
  // Check for negative values
  if (answer.jsonValue.some((val: any) => Number(val) < 0)) {
    violations.push({
      questionId: question.id,
      code: 'NEGATIVE_VALUES',
      message: 'Points cannot be negative'
    });
  }
  
  // Check if zero is allowed
  if (!question.allowZero && answer.jsonValue.some((val: any) => Number(val) === 0)) {
    violations.push({
      questionId: question.id,
      code: 'ZERO_NOT_ALLOWED',
      message: 'All options must have at least 1 point'
    });
  }
  
  return violations;
}

function validateDate(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.dateValue) {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Date is required'
    });
    return violations;
  }
  
  const date = new Date(answer.dateValue);
  
  if (isNaN(date.getTime())) {
    violations.push({
      questionId: question.id,
      code: 'INVALID_DATE',
      message: 'Please enter a valid date'
    });
    return violations;
  }
  
  // Check date range
  if (question.minDate && date < new Date(question.minDate)) {
    violations.push({
      questionId: question.id,
      code: 'DATE_TOO_EARLY',
      message: `Date must be after ${new Date(question.minDate).toLocaleDateString()}`
    });
  }
  
  if (question.maxDate && date > new Date(question.maxDate)) {
    violations.push({
      questionId: question.id,
      code: 'DATE_TOO_LATE',
      message: `Date must be before ${new Date(question.maxDate).toLocaleDateString()}`
    });
  }
  
  return violations;
}

function validateTime(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.timeValue) {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Time is required'
    });
    return violations;
  }
  
  const time = new Date(answer.timeValue);
  
  if (isNaN(time.getTime())) {
    violations.push({
      questionId: question.id,
      code: 'INVALID_TIME',
      message: 'Please enter a valid time'
    });
  }
  
  return violations;
}

function validateDateTime(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.dateValue && !answer.timeValue) {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Date and time are required'
    });
    return violations;
  }
  
  // Combine date and time validation
  if (answer.dateValue) {
    violations.push(...validateDate(answer, question));
  }
  
  if (answer.timeValue) {
    violations.push(...validateTime(answer, question));
  }
  
  return violations;
}

function validateFileUpload(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.fileUrls || answer.fileUrls.length === 0) {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Please upload at least one file'
    });
    return violations;
  }
  
  // Check file count
  if (question.maxFiles && answer.fileUrls.length > question.maxFiles) {
    violations.push({
      questionId: question.id,
      code: 'TOO_MANY_FILES',
      message: `Please upload no more than ${question.maxFiles} files`
    });
  }
  
  // Note: File type and size validation would typically be done
  // during upload, not during answer validation
  
  return violations;
}

function validateMatrix(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.jsonValue || typeof answer.jsonValue !== 'object') {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Please complete all required fields'
    });
    return violations;
  }
  
  // Matrix validation would depend on the specific matrix structure
  // This is a simplified version
  
  return violations;
}

function validateRank(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.jsonValue || !Array.isArray(answer.jsonValue)) {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Please rank all items'
    });
    return violations;
  }
  
  // Check for duplicate ranks
  const ranks = answer.jsonValue.map((item: any) => item.rank).filter((r: any) => r !== undefined);
  const uniqueRanks = new Set(ranks);
  
  if (ranks.length !== uniqueRanks.size) {
    violations.push({
      questionId: question.id,
      code: 'DUPLICATE_RANKS',
      message: 'Each item must have a unique rank'
    });
  }
  
  return violations;
}

function validatePictureChoice(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  // Picture choice validation is similar to single/multiple choice
  if (question.type === 'PICTURE_CHOICE') {
    return validateSingleChoice(answer, question);
  }
  return [];
}

function validatePayment(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.paymentId || answer.paymentId.trim() === '') {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Payment is required'
    });
    return violations;
  }
  
  // Check payment status
  if (answer.paymentStatus !== 'completed') {
    violations.push({
      questionId: question.id,
      code: 'PAYMENT_FAILED',
      message: 'Payment was not successful'
    });
  }
  
  return violations;
}

function validateSignature(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.signatureUrl || answer.signatureUrl.trim() === '') {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Signature is required'
    });
  }
  
  return violations;
}

function validateConsent(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.booleanValue) {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'You must agree to continue'
    });
  }
  
  return violations;
}

function validateContactForm(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  // Contact form stores data as JSON object
  const contactData = answer.jsonValue || {};
  
  // Contact form validation depends on which fields are enabled
  if (question.collectName && (!contactData.name || contactData.name.trim() === '')) {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Name is required'
    });
  }
  
  if (question.collectEmail) {
    if (!contactData.email || contactData.email.trim() === '') {
      violations.push({
        questionId: question.id,
        code: 'REQUIRED',
        message: 'Email is required'
      });
    } else {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactData.email)) {
        violations.push({
          questionId: question.id,
          code: 'INVALID_FORMAT',
          message: 'Invalid email format'
        });
      }
    }
  }
  
  if (question.collectPhone) {
    if (!contactData.phone || contactData.phone.trim() === '') {
      violations.push({
        questionId: question.id,
        code: 'REQUIRED',
        message: 'Phone is required'
      });
    } else {
      // Basic phone validation
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const cleanPhone = contactData.phone.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        violations.push({
          questionId: question.id,
          code: 'INVALID_FORMAT',
          message: 'Invalid phone number format'
        });
      }
    }
  }
  
  if (question.collectCompany && (!contactData.company || contactData.company.trim() === '')) {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Company is required'
    });
  }
  
  return violations;
}

function validateGroupRank(answer: AnswerData, question: QuestionConfig): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  if (!answer.jsonValue || !Array.isArray(answer.jsonValue)) {
    violations.push({
      questionId: question.id,
      code: 'REQUIRED',
      message: 'Please complete the ranking'
    });
    return violations;
  }
  
  // Group rank validation would check that all groups are ranked
  // and that ranks are unique within each group
  
  return violations;
}
