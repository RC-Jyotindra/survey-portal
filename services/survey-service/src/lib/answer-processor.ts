import { QuestionTypeHandler } from './question-type-handlers';

export interface ProcessedAnswer {
  choices?: string[];
  textValue?: string;
  numericValue?: number;
  decimalValue?: number;
  dateValue?: Date;
  timeValue?: Date;
  jsonValue?: any;
  booleanValue?: boolean;
  emailValue?: string;
  phoneValue?: string;
  urlValue?: string;
  fileUrls?: string[];
  signatureUrl?: string;
  paymentId?: string;
  paymentStatus?: string;
}

export class AnswerProcessor {
  /**
   * Process and validate an answer based on question type and configuration
   */
  static processAnswer(
    questionType: string,
    rawAnswer: any,
    questionConfig: any
  ): { success: boolean; processedAnswer?: ProcessedAnswer; error?: string } {
    try {
      // Validate the answer first
      const validation = QuestionTypeHandler.validateAnswer(questionType, rawAnswer, questionConfig);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      const processedAnswer: ProcessedAnswer = {};

      switch (questionType) {
        case 'SINGLE_CHOICE':
        case 'DROPDOWN':
        case 'YES_NO':
          processedAnswer.choices = Array.isArray(rawAnswer.choices) ? rawAnswer.choices : [rawAnswer.choices];
          break;

        case 'MULTIPLE_CHOICE':
        case 'PICTURE_CHOICE':
          processedAnswer.choices = Array.isArray(rawAnswer.choices) ? rawAnswer.choices : [];
          break;

        case 'TEXT':
        case 'TEXTAREA':
        case 'MESSAGE':
        case 'DESCRIPTIVE':
          processedAnswer.textValue = rawAnswer.textValue || rawAnswer.text || '';
          break;

        case 'EMAIL':
          processedAnswer.emailValue = rawAnswer.emailValue || rawAnswer.textValue || '';
          break;

        case 'PHONE_NUMBER':
          processedAnswer.phoneValue = rawAnswer.phoneValue || rawAnswer.textValue || '';
          break;

        case 'WEBSITE':
          processedAnswer.urlValue = rawAnswer.urlValue || rawAnswer.textValue || '';
          break;

        case 'NUMBER':
          processedAnswer.numericValue = rawAnswer.numericValue || parseInt(rawAnswer.textValue) || null;
          break;

        case 'DECIMAL':
          processedAnswer.decimalValue = rawAnswer.decimalValue || parseFloat(rawAnswer.textValue) || null;
          break;

        case 'SLIDER':
          processedAnswer.numericValue = rawAnswer.numericValue || rawAnswer.decimalValue || null;
          break;

        case 'OPINION_SCALE':
          processedAnswer.numericValue = rawAnswer.numericValue || parseInt(rawAnswer.textValue) || null;
          break;

        case 'DATE':
          processedAnswer.dateValue = rawAnswer.dateValue ? new Date(rawAnswer.dateValue) : undefined;
          break;

        case 'TIME':
          processedAnswer.timeValue = rawAnswer.timeValue ? new Date(rawAnswer.timeValue) : undefined;
          break;

        case 'DATETIME':
          processedAnswer.dateValue = rawAnswer.dateValue ? new Date(rawAnswer.dateValue) : undefined;
          break;

        case 'RANK':
        case 'GROUP_RANK':
          processedAnswer.jsonValue = rawAnswer.jsonValue || rawAnswer.choices || [];
          break;

        case 'MATRIX_SINGLE':
        case 'MATRIX_MULTIPLE':
        case 'BIPOLAR_MATRIX':
          processedAnswer.jsonValue = rawAnswer.jsonValue || rawAnswer.matrixValue || {};
          break;

        case 'GROUP_RATING':
          processedAnswer.jsonValue = rawAnswer.jsonValue || {};
          break;

        case 'CONSTANT_SUM':
          processedAnswer.jsonValue = rawAnswer.jsonValue || {};
          break;

        case 'FILE_UPLOAD':
        case 'PHOTO_CAPTURE':
          processedAnswer.fileUrls = Array.isArray(rawAnswer.fileUrls) ? rawAnswer.fileUrls : [];
          break;

        case 'SIGNATURE':
          processedAnswer.signatureUrl = rawAnswer.signatureUrl || '';
          break;

        case 'PAYMENT':
          processedAnswer.paymentId = rawAnswer.paymentId || '';
          processedAnswer.paymentStatus = rawAnswer.paymentStatus || 'pending';
          break;

        case 'CONSENT_AGREEMENT':
          processedAnswer.booleanValue = rawAnswer.booleanValue || rawAnswer.choices?.includes('agree') || false;
          if (questionConfig.requireSignature) {
            processedAnswer.signatureUrl = rawAnswer.signatureUrl || '';
          }
          break;

        case 'CONTACT_FORM':
          // Handle both nested jsonValue structure and direct properties
          if (rawAnswer.jsonValue && typeof rawAnswer.jsonValue === 'object') {
            processedAnswer.jsonValue = {
              name: rawAnswer.jsonValue.name || '',
              email: rawAnswer.jsonValue.email || '',
              phone: rawAnswer.jsonValue.phone || '',
              company: rawAnswer.jsonValue.company || '',
              address: rawAnswer.jsonValue.address || ''
            };
          } else {
            processedAnswer.jsonValue = {
              name: rawAnswer.name || '',
              email: rawAnswer.email || '',
              phone: rawAnswer.phone || '',
              company: rawAnswer.company || '',
              address: rawAnswer.address || ''
            };
          }
          break;

        default:
          // Fallback to text value
          processedAnswer.textValue = rawAnswer.textValue || rawAnswer.text || '';
      }

      return { success: true, processedAnswer };
    } catch (error) {
      return { success: false, error: 'Failed to process answer' };
    }
  }

  /**
   * Get the appropriate answer field name for a question type
   */
  static getAnswerFieldName(questionType: string): string {
    switch (questionType) {
      case 'SINGLE_CHOICE':
      case 'MULTIPLE_CHOICE':
      case 'DROPDOWN':
      case 'PICTURE_CHOICE':
      case 'RANK':
      case 'GROUP_RANK':
        return 'choices';
      
      case 'TEXT':
      case 'TEXTAREA':
      case 'MESSAGE':
      case 'DESCRIPTIVE':
        return 'textValue';
      
      case 'EMAIL':
        return 'emailValue';
      
      case 'PHONE_NUMBER':
        return 'phoneValue';
      
      case 'WEBSITE':
        return 'urlValue';
      
      case 'NUMBER':
      case 'SLIDER':
      case 'OPINION_SCALE':
        return 'numericValue';
      
      case 'DECIMAL':
        return 'decimalValue';
      
      case 'DATE':
        return 'dateValue';
      
      case 'TIME':
        return 'timeValue';
      
      case 'DATETIME':
        return 'dateValue';
      
      case 'MATRIX_SINGLE':
      case 'MATRIX_MULTIPLE':
      case 'BIPOLAR_MATRIX':
      case 'GROUP_RATING':
      case 'CONSTANT_SUM':
      case 'CONTACT_FORM':
        return 'jsonValue';
      
      case 'FILE_UPLOAD':
      case 'PHOTO_CAPTURE':
        return 'fileUrls';
      
      case 'SIGNATURE':
        return 'signatureUrl';
      
      case 'PAYMENT':
        return 'paymentId';
      
      case 'CONSENT_AGREEMENT':
        return 'booleanValue';
      
      default:
        return 'textValue';
    }
  }

  /**
   * Format answer for display/export
   */
  static formatAnswerForDisplay(questionType: string, answer: ProcessedAnswer, questionConfig?: any): string {
    switch (questionType) {
      case 'SINGLE_CHOICE':
      case 'DROPDOWN':
      case 'YES_NO':
        return answer.choices?.[0] || '';
      
      case 'MULTIPLE_CHOICE':
      case 'PICTURE_CHOICE':
        return answer.choices?.join(', ') || '';
      
      case 'TEXT':
      case 'TEXTAREA':
      case 'MESSAGE':
      case 'DESCRIPTIVE':
        return answer.textValue || '';
      
      case 'EMAIL':
        return answer.emailValue || '';
      
      case 'PHONE_NUMBER':
        return answer.phoneValue || '';
      
      case 'WEBSITE':
        return answer.urlValue || '';
      
      case 'NUMBER':
      case 'SLIDER':
      case 'OPINION_SCALE':
        return answer.numericValue?.toString() || '';
      
      case 'DECIMAL':
        return answer.decimalValue?.toString() || '';
      
      case 'DATE':
        return answer.dateValue?.toLocaleDateString() || '';
      
      case 'TIME':
        return answer.timeValue?.toLocaleTimeString() || '';
      
      case 'DATETIME':
        return answer.dateValue?.toLocaleString() || '';
      
      case 'RANK':
      case 'GROUP_RANK':
        return Array.isArray(answer.jsonValue) ? answer.jsonValue.join(' → ') : '';
      
      case 'MATRIX_SINGLE':
      case 'MATRIX_MULTIPLE':
      case 'BIPOLAR_MATRIX':
      case 'GROUP_RATING':
        return typeof answer.jsonValue === 'object' ? JSON.stringify(answer.jsonValue) : '';
      
      case 'CONSTANT_SUM':
        if (typeof answer.jsonValue === 'object') {
          const entries = Object.entries(answer.jsonValue);
          return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
        }
        return '';
      
      case 'FILE_UPLOAD':
      case 'PHOTO_CAPTURE':
        return answer.fileUrls?.join(', ') || '';
      
      case 'SIGNATURE':
        return answer.signatureUrl ? 'Signature provided' : '';
      
      case 'PAYMENT':
        return answer.paymentId ? `Payment ID: ${answer.paymentId} (${answer.paymentStatus})` : '';
      
      case 'CONSENT_AGREEMENT':
        return answer.booleanValue ? 'Agreed' : 'Not agreed';
      
      case 'CONTACT_FORM':
        if (typeof answer.jsonValue === 'object') {
          const contact = answer.jsonValue;
          const parts = [];
          if (contact.name) parts.push(`Name: ${contact.name}`);
          if (contact.email) parts.push(`Email: ${contact.email}`);
          if (contact.phone) parts.push(`Phone: ${contact.phone}`);
          if (contact.company) parts.push(`Company: ${contact.company}`);
          if (contact.address) parts.push(`Address: ${contact.address}`);
          return parts.join(', ');
        }
        return '';
      
      default:
        return answer.textValue || '';
    }
  }

  /**
   * Check if a question type requires file upload handling
   */
  static requiresFileUpload(questionType: string): boolean {
    return ['FILE_UPLOAD', 'PHOTO_CAPTURE', 'SIGNATURE'].includes(questionType);
  }

  /**
   * Check if a question type requires payment processing
   */
  static requiresPaymentProcessing(questionType: string): boolean {
    return questionType === 'PAYMENT';
  }

  /**
   * Get file validation rules for file upload questions
   */
  static getFileValidationRules(questionType: string, questionConfig: any): {
    allowedTypes: string[];
    maxSize: number;
    maxFiles: number;
  } {
    const defaultRules = {
      allowedTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      maxSize: 10485760, // 10MB
      maxFiles: 1
    };

    if (questionType === 'PHOTO_CAPTURE') {
      return {
        allowedTypes: ['jpg', 'jpeg', 'png'],
        maxSize: 5242880, // 5MB
        maxFiles: 1
      };
    }

    return {
      allowedTypes: questionConfig.allowedFileTypes || defaultRules.allowedTypes,
      maxSize: questionConfig.maxFileSize || defaultRules.maxSize,
      maxFiles: questionConfig.maxFiles || defaultRules.maxFiles
    };
  }
}
