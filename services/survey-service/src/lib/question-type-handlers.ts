import { z } from 'zod';

// Type definitions for question configurations
export interface QuestionTypeConfig {
  type: string;
  requiresOptions: boolean;
  requiresItems: boolean;
  requiresScales: boolean;
  hasSpecialValidation: boolean;
  defaultConfig: Record<string, any>;
}

// Question type configurations
export const QUESTION_TYPE_CONFIGS: Record<string, QuestionTypeConfig> = {
  // Basic Choice Types
  SINGLE_CHOICE: {
    type: 'SINGLE_CHOICE',
    requiresOptions: true,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: false,
    defaultConfig: {
      allowOther: false,
      maxSelections: 1
    }
  },
  MULTIPLE_CHOICE: {
    type: 'MULTIPLE_CHOICE',
    requiresOptions: true,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      allowOther: false,
      maxSelections: null // unlimited
    }
  },
  DROPDOWN: {
    type: 'DROPDOWN',
    requiresOptions: true,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: false,
    defaultConfig: {
      allowOther: false,
      maxSelections: 1
    }
  },
  YES_NO: {
    type: 'YES_NO',
    requiresOptions: true,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: false,
    defaultConfig: {
      allowOther: false,
      maxSelections: 1
    }
  },

  // Text Input Types
  TEXT: {
    type: 'TEXT',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {}
  },
  TEXTAREA: {
    type: 'TEXTAREA',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {}
  },
  EMAIL: {
    type: 'EMAIL',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {}
  },
  PHONE_NUMBER: {
    type: 'PHONE_NUMBER',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      phoneFormat: 'US',
      countryCode: 'US'
    }
  },
  WEBSITE: {
    type: 'WEBSITE',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      urlProtocol: 'https'
    }
  },

  // Numeric Types
  NUMBER: {
    type: 'NUMBER',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {}
  },
  DECIMAL: {
    type: 'DECIMAL',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {}
  },
  SLIDER: {
    type: 'SLIDER',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      minValue: 0,
      maxValue: 100,
      stepValue: 1,
      defaultValue: 50
    }
  },
  OPINION_SCALE: {
    type: 'OPINION_SCALE',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      scaleSteps: 5,
      scaleMinLabel: 'Poor',
      scaleMaxLabel: 'Excellent'
    }
  },
  CONSTANT_SUM: {
    type: 'CONSTANT_SUM',
    requiresOptions: true,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      totalPoints: 100,
      allowZero: true
    }
  },

  // Date/Time Types
  DATE: {
    type: 'DATE',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      dateFormat: 'MM/DD/YYYY'
    }
  },
  TIME: {
    type: 'TIME',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      timeFormat: '12h'
    }
  },
  DATETIME: {
    type: 'DATETIME',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h'
    }
  },

  // Advanced Types
  RANK: {
    type: 'RANK',
    requiresOptions: true,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {}
  },
  MATRIX_SINGLE: {
    type: 'MATRIX_SINGLE',
    requiresOptions: false,
    requiresItems: true,
    requiresScales: true,
    hasSpecialValidation: true,
    defaultConfig: {
      matrixType: 'single',
      showHeaders: true,
      randomizeRows: false,
      randomizeColumns: false
    }
  },
  MATRIX_MULTIPLE: {
    type: 'MATRIX_MULTIPLE',
    requiresOptions: false,
    requiresItems: true,
    requiresScales: true,
    hasSpecialValidation: true,
    defaultConfig: {
      matrixType: 'multiple',
      showHeaders: true,
      randomizeRows: false,
      randomizeColumns: false
    }
  },
  BIPOLAR_MATRIX: {
    type: 'BIPOLAR_MATRIX',
    requiresOptions: false,
    requiresItems: true,
    requiresScales: true,
    hasSpecialValidation: true,
    defaultConfig: {
      matrixType: 'rating',
      showHeaders: true,
      randomizeRows: false,
      randomizeColumns: false,
      scaleMinLabel: 'Strongly Disagree',
      scaleMaxLabel: 'Strongly Agree',
      scaleSteps: 5
    }
  },
  GROUP_RANK: {
    type: 'GROUP_RANK',
    requiresOptions: true,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      groupSize: 3,
      groupLabel: 'Group'
    }
  },
  GROUP_RATING: {
    type: 'GROUP_RATING',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: true,
    hasSpecialValidation: true,
    defaultConfig: {
      groupSize: 3,
      groupLabel: 'Group',
      scaleSteps: 5,
      scaleMinLabel: 'Poor',
      scaleMaxLabel: 'Excellent'
    }
  },

  // File Types
  FILE_UPLOAD: {
    type: 'FILE_UPLOAD',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      maxFileSize: 10485760, // 10MB
      maxFiles: 1
    }
  },
  PHOTO_CAPTURE: {
    type: 'PHOTO_CAPTURE',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      allowedFileTypes: ['jpg', 'jpeg', 'png'],
      maxFileSize: 5242880, // 5MB
      maxFiles: 1
    }
  },

  // Special Types
  PICTURE_CHOICE: {
    type: 'PICTURE_CHOICE',
    requiresOptions: true,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      imageLayout: 'grid',
      imageSize: 'medium',
      maxSelections: 1
    }
  },
  PAYMENT: {
    type: 'PAYMENT',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      currency: 'USD',
      paymentMethods: ['card']
    }
  },
  SIGNATURE: {
    type: 'SIGNATURE',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: false,
    defaultConfig: {
      signatureWidth: 400,
      signatureHeight: 200,
      signatureColor: '#000000'
    }
  },
  CONSENT_AGREEMENT: {
    type: 'CONSENT_AGREEMENT',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: true,
    defaultConfig: {
      requireSignature: false
    }
  },
  MESSAGE: {
    type: 'MESSAGE',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: false,
    defaultConfig: {}
  },
  CONTACT_FORM: {
    type: 'CONTACT_FORM',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: false,
    defaultConfig: {
      collectName: true,
      collectEmail: true,
      collectPhone: false,
      collectCompany: false,
      collectAddress: false,
      showIpsosBranding: false
    }
  },
  DESCRIPTIVE: {
    type: 'DESCRIPTIVE',
    requiresOptions: false,
    requiresItems: false,
    requiresScales: false,
    hasSpecialValidation: false,
    defaultConfig: {}
  }
};

// Validation schemas for different question types
export const QUESTION_TYPE_VALIDATIONS: Record<string, z.ZodSchema> = {
  MULTIPLE_CHOICE: z.object({
    maxSelections: z.number().int().min(1).optional(),
    allowOther: z.boolean().optional()
  }),
  
  TEXT: z.object({
    validation: z.object({
      minLength: z.number().int().min(0).optional(),
      maxLength: z.number().int().min(1).optional(),
      pattern: z.string().optional()
    }).optional()
  }),
  
  TEXTAREA: z.object({
    validation: z.object({
      minLength: z.number().int().min(0).optional(),
      maxLength: z.number().int().min(1).optional()
    }).optional()
  }),
  
  EMAIL: z.object({
    validation: z.object({
      domainWhitelist: z.array(z.string()).optional(),
      domainBlacklist: z.array(z.string()).optional()
    }).optional()
  }),
  
  PHONE_NUMBER: z.object({
    phoneFormat: z.enum(['US', 'INTERNATIONAL', 'E164']).optional(),
    countryCode: z.string().optional()
  }),
  
  WEBSITE: z.object({
    urlProtocol: z.enum(['http', 'https', 'both']).optional(),
    validation: z.object({
      allowedDomains: z.array(z.string()).optional(),
      blockedDomains: z.array(z.string()).optional()
    }).optional()
  }),
  
  NUMBER: z.object({
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().optional()
    }).optional()
  }),
  
  DECIMAL: z.object({
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().optional(),
      decimalPlaces: z.number().int().min(0).max(10).optional()
    }).optional()
  }),
  
  SLIDER: z.object({
    minValue: z.number(),
    maxValue: z.number(),
    stepValue: z.number().min(0.01).optional(),
    defaultValue: z.number().optional()
  }),
  
  OPINION_SCALE: z.object({
    scaleSteps: z.number().int().min(2).max(11),
    scaleMinLabel: z.string().optional(),
    scaleMaxLabel: z.string().optional()
  }),
  
  CONSTANT_SUM: z.object({
    totalPoints: z.number().int().min(1),
    allowZero: z.boolean().optional()
  }),
  
  DATE: z.object({
    dateFormat: z.string().optional(),
    minDate: z.string().datetime().optional(),
    maxDate: z.string().datetime().optional()
  }),
  
  TIME: z.object({
    timeFormat: z.enum(['12h', '24h']).optional()
  }),
  
  DATETIME: z.object({
    dateFormat: z.string().optional(),
    timeFormat: z.enum(['12h', '24h']).optional(),
    minDate: z.string().datetime().optional(),
    maxDate: z.string().datetime().optional()
  }),
  
  RANK: z.object({
    validation: z.object({
      minRankings: z.number().int().min(1).optional(),
      maxRankings: z.number().int().min(1).optional()
    }).optional()
  }),
  
  MATRIX_SINGLE: z.object({
    matrixType: z.enum(['single', 'multiple', 'rating']).optional(),
    showHeaders: z.boolean().optional(),
    randomizeRows: z.boolean().optional(),
    randomizeColumns: z.boolean().optional()
  }),
  
  MATRIX_MULTIPLE: z.object({
    matrixType: z.enum(['single', 'multiple', 'rating']).optional(),
    showHeaders: z.boolean().optional(),
    randomizeRows: z.boolean().optional(),
    randomizeColumns: z.boolean().optional()
  }),
  
  BIPOLAR_MATRIX: z.object({
    matrixType: z.enum(['single', 'multiple', 'rating']).optional(),
    showHeaders: z.boolean().optional(),
    randomizeRows: z.boolean().optional(),
    randomizeColumns: z.boolean().optional(),
    scaleSteps: z.number().int().min(2).max(11).optional(),
    scaleMinLabel: z.string().optional(),
    scaleMaxLabel: z.string().optional()
  }),
  
  GROUP_RANK: z.object({
    groupSize: z.number().int().min(2).max(10).optional(),
    groupLabel: z.string().optional()
  }),
  
  GROUP_RATING: z.object({
    groupSize: z.number().int().min(2).max(10).optional(),
    groupLabel: z.string().optional(),
    scaleSteps: z.number().int().min(2).max(11).optional(),
    scaleMinLabel: z.string().optional(),
    scaleMaxLabel: z.string().optional()
  }),
  
  FILE_UPLOAD: z.object({
    allowedFileTypes: z.array(z.string()).min(1).optional(),
    maxFileSize: z.number().int().min(1).optional(),
    maxFiles: z.number().int().min(1).optional()
  }),
  
  PHOTO_CAPTURE: z.object({
    allowedFileTypes: z.array(z.string()).min(1).optional(),
    maxFileSize: z.number().int().min(1).optional(),
    maxFiles: z.number().int().min(1).optional()
  }),
  
  PICTURE_CHOICE: z.object({
    imageLayout: z.enum(['grid', 'list', 'carousel']).optional(),
    imageSize: z.enum(['small', 'medium', 'large']).optional(),
    maxSelections: z.number().int().min(1).optional()
  }),
  
  PAYMENT: z.object({
    paymentAmount: z.number().min(0).optional(),
    currency: z.string().optional(),
    paymentMethods: z.array(z.enum(['card', 'paypal', 'bank'])).min(1).optional()
  }),
  
  SIGNATURE: z.object({
    signatureWidth: z.number().int().min(100).max(800).optional(),
    signatureHeight: z.number().int().min(100).max(600).optional(),
    signatureColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
  }),
  
  CONSENT_AGREEMENT: z.object({
    consentText: z.string().min(1).optional(),
    requireSignature: z.boolean().optional()
  }),
  
  CONTACT_FORM: z.object({
    collectName: z.boolean().optional(),
    collectEmail: z.boolean().optional(),
    collectPhone: z.boolean().optional(),
    collectCompany: z.boolean().optional(),
    collectAddress: z.boolean().optional(),
    showIpsosBranding: z.boolean().optional()
  })
};

// Helper functions for question type processing
export class QuestionTypeHandler {
  static getConfig(questionType: string): QuestionTypeConfig {
    return QUESTION_TYPE_CONFIGS[questionType] || QUESTION_TYPE_CONFIGS.TEXT!;
  }

  static validateQuestionConfig(questionType: string, config: any): { success: boolean; error?: string } {
    const validationSchema = QUESTION_TYPE_VALIDATIONS[questionType];
    if (!validationSchema) {
      return { success: true }; // No specific validation needed
    }

    try {
      validationSchema.parse(config);
      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        return { success: false, error: errorMessage };
      }
      return { success: false, error: 'Validation failed' };
    }
  }

  static getDefaultConfig(questionType: string): Record<string, any> {
    const config = this.getConfig(questionType);
    return config.defaultConfig;
  }

  static requiresOptions(questionType: string): boolean {
    const config = this.getConfig(questionType);
    return config.requiresOptions;
  }

  static requiresItems(questionType: string): boolean {
    const config = this.getConfig(questionType);
    return config.requiresItems;
  }

  static requiresScales(questionType: string): boolean {
    const config = this.getConfig(questionType);
    return config.requiresScales;
  }

  static hasSpecialValidation(questionType: string): boolean {
    const config = this.getConfig(questionType);
    return config.hasSpecialValidation;
  }

  // Auto-generate default options for certain question types
  static generateDefaultOptions(questionType: string): Array<{ value: string; labelTemplate: string }> {
    switch (questionType) {
      case 'YES_NO':
        return [
          { value: 'yes', labelTemplate: 'Yes' },
          { value: 'no', labelTemplate: 'No' }
        ];
      
      case 'OPINION_SCALE':
        // This will be handled by the scale configuration, not options
        return [];
      
      default:
        return [];
    }
  }

  // Auto-generate default scales for rating questions
  static generateDefaultScales(questionType: string, scaleSteps: number = 5): Array<{ value: string; label: string }> {
    switch (questionType) {
      case 'OPINION_SCALE':
      case 'BIPOLAR_MATRIX':
      case 'GROUP_RATING':
        const scales = [];
        for (let i = 1; i <= scaleSteps; i++) {
          scales.push({
            value: i.toString(),
            label: i.toString()
          });
        }
        return scales;
      
      default:
        return [];
    }
  }

  // Validate answer based on question type
  static validateAnswer(questionType: string, answer: any, questionConfig: any): { success: boolean; error?: string } {
    switch (questionType) {
      case 'EMAIL':
        if (answer.emailValue && !z.string().email().safeParse(answer.emailValue).success) {
          return { success: false, error: 'Invalid email format' };
        }
        break;
      
      case 'PHONE_NUMBER':
        if (answer.phoneValue) {
          // Basic phone validation - can be enhanced with specific format validation
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          if (!phoneRegex.test(answer.phoneValue.replace(/[\s\-\(\)]/g, ''))) {
            return { success: false, error: 'Invalid phone number format' };
          }
        }
        break;
      
      case 'WEBSITE':
        if (answer.urlValue && !z.string().url().safeParse(answer.urlValue).success) {
          return { success: false, error: 'Invalid URL format' };
        }
        break;
      
      case 'NUMBER':
      case 'DECIMAL':
        if (answer.numericValue !== undefined || answer.decimalValue !== undefined) {
          const value = answer.numericValue ?? answer.decimalValue;
          if (questionConfig.validation?.min !== undefined && value < questionConfig.validation.min) {
            return { success: false, error: `Value must be at least ${questionConfig.validation.min}` };
          }
          if (questionConfig.validation?.max !== undefined && value > questionConfig.validation.max) {
            return { success: false, error: `Value must be at most ${questionConfig.validation.max}` };
          }
        }
        break;
      
      case 'SLIDER':
        if (answer.numericValue !== undefined || answer.decimalValue !== undefined) {
          const value = answer.numericValue ?? answer.decimalValue;
          if (questionConfig.minValue !== undefined && value < questionConfig.minValue) {
            return { success: false, error: `Value must be at least ${questionConfig.minValue}` };
          }
          if (questionConfig.maxValue !== undefined && value > questionConfig.maxValue) {
            return { success: false, error: `Value must be at most ${questionConfig.maxValue}` };
          }
        }
        break;
      
      case 'MULTIPLE_CHOICE':
        if (answer.choices && questionConfig.maxSelections && answer.choices.length > questionConfig.maxSelections) {
          return { success: false, error: `Maximum ${questionConfig.maxSelections} selections allowed` };
        }
        break;
      
      case 'CONSTANT_SUM':
        if (answer.jsonValue && questionConfig.totalPoints) {
          const allocations = answer.jsonValue;
          const total = Object.values(allocations).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
          if (Math.abs(total - questionConfig.totalPoints) > 0.01) {
            return { success: false, error: `Total must equal ${questionConfig.totalPoints}` };
          }
        }
        break;
      
      case 'FILE_UPLOAD':
      case 'PHOTO_CAPTURE':
        if (answer.fileUrls && questionConfig.maxFiles && answer.fileUrls.length > questionConfig.maxFiles) {
          return { success: false, error: `Maximum ${questionConfig.maxFiles} files allowed` };
        }
        break;
    }
    
    return { success: true };
  }
}
