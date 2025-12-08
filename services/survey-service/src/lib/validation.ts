import { z } from 'zod';

// Common validation schemas
export const uuidSchema = z.string().uuid();
export const tenantIdSchema = z.string().uuid();

// Survey Page validation
export const createPageSchema = z.object({
  titleTemplate: z.string().optional().nullable(),
  descriptionTemplate: z.string().optional().nullable(),
  questionOrderMode: z.enum(['SEQUENTIAL', 'RANDOM', 'GROUP_RANDOM', 'WEIGHTED']).default('SEQUENTIAL'),
  groupOrderMode: z.enum(['SEQUENTIAL', 'RANDOM', 'GROUP_RANDOM', 'WEIGHTED']).default('SEQUENTIAL'),
  visibleIfExpressionId: z.string().uuid().optional().nullable()
});

export const updatePageSchema = z.object({
  titleTemplate: z.string().optional().nullable(),
  descriptionTemplate: z.string().optional().nullable(),
  questionOrderMode: z.enum(['SEQUENTIAL', 'RANDOM', 'GROUP_RANDOM', 'WEIGHTED']).optional(),
  groupOrderMode: z.enum(['SEQUENTIAL', 'RANDOM', 'GROUP_RANDOM', 'WEIGHTED']).optional(),
  visibleIfExpressionId: z.string().uuid().optional().nullable()
});

// Question validation
export const questionTypeSchema = z.enum([
  // Basic Choice Types
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE', 
  'DROPDOWN',
  'YES_NO',
  
  // Text Input Types
  'TEXT',
  'TEXTAREA',
  'EMAIL',
  'PHONE_NUMBER',
  'WEBSITE',
  
  // Numeric Types
  'NUMBER',
  'DECIMAL',
  'SLIDER',
  'OPINION_SCALE',
  'CONSTANT_SUM',
  
  // Date/Time Types
  'DATE',
  'TIME',
  'DATETIME',
  
  // Advanced Types
  'RANK',
  'MATRIX_SINGLE',
  'MATRIX_MULTIPLE',
  'BIPOLAR_MATRIX',
  'GROUP_RANK',
  'GROUP_RATING',
  
  // File Types
  'FILE_UPLOAD',
  'PHOTO_CAPTURE',
  
  // Special Types
  'PICTURE_CHOICE',
  'PAYMENT',
  'SIGNATURE',
  'CONSENT_AGREEMENT',
  'MESSAGE',
  'CONTACT_FORM',
  'DESCRIPTIVE'
]);

export const createQuestionSchema = z.object({
  pageId: uuidSchema,
  groupId: z.string().uuid().optional().nullable(),
  groupIndex: z.number().int().min(0).optional().nullable(),
  type: questionTypeSchema,
  variableName: z.string().regex(/^Q[0-9]+$/).optional(),
  titleTemplate: z.string().min(1, 'Title is required'),
  helpTextTemplate: z.string().optional().nullable(),
  required: z.boolean().default(false),
  validation: z.any().optional(),
  optionOrderMode: z.enum(['SEQUENTIAL', 'RANDOM', 'GROUP_RANDOM', 'WEIGHTED']).default('SEQUENTIAL'),
  optionsSource: z.enum(['STATIC', 'CARRY_FORWARD']).default('STATIC'),
  carryForwardQuestionId: z.string().uuid().optional().nullable(),
  carryForwardFilterExprId: z.string().uuid().optional().nullable(),
  visibleIfExpressionId: z.string().uuid().optional().nullable(),
  
  // Type-specific configuration fields
  // Numeric/Slider/Rating configuration
  minValue: z.number().optional().nullable(),
  maxValue: z.number().optional().nullable(),
  stepValue: z.number().optional().nullable(),
  defaultValue: z.number().optional().nullable(),
  
  // Scale configuration
  scaleMinLabel: z.string().optional().nullable(),
  scaleMaxLabel: z.string().optional().nullable(),
  scaleSteps: z.number().int().min(2).max(11).optional().nullable(),
  
  // Multiple choice configuration
  maxSelections: z.number().int().min(1).optional().nullable(),
  allowOther: z.boolean().default(false),
  otherLabel: z.string().optional().nullable(),
  
  // File upload configuration
  allowedFileTypes: z.array(z.string()).default([]),
  maxFileSize: z.number().int().min(1).optional().nullable(),
  maxFiles: z.number().int().min(1).default(1),
  
  // Date/Time configuration
  dateFormat: z.string().optional().nullable(),
  timeFormat: z.enum(['12h', '24h']).optional().nullable(),
  minDate: z.string().datetime().optional().nullable(),
  maxDate: z.string().datetime().optional().nullable(),
  
  // Phone number configuration
  phoneFormat: z.enum(['US', 'INTERNATIONAL', 'E164']).optional().nullable(),
  countryCode: z.string().default('US'),
  
  // Website/URL configuration
  urlProtocol: z.enum(['http', 'https', 'both']).default('https'),
  
  // Payment configuration
  paymentAmount: z.number().min(0).optional().nullable(),
  currency: z.string().default('USD'),
  paymentMethods: z.array(z.enum(['card', 'paypal', 'bank'])).default(['card']),
  
  // Picture choice configuration
  imageLayout: z.enum(['grid', 'list', 'carousel']).default('grid'),
  imageSize: z.enum(['small', 'medium', 'large']).default('medium'),
  
  // Matrix configuration
  matrixType: z.enum(['single', 'multiple', 'rating']).default('single'),
  showHeaders: z.boolean().default(true),
  randomizeRows: z.boolean().default(false),
  randomizeColumns: z.boolean().default(false),
  
  // Constant sum configuration
  totalPoints: z.number().int().min(1).default(100),
  allowZero: z.boolean().default(true),
  
  // Signature configuration
  signatureWidth: z.number().int().min(100).max(800).default(400),
  signatureHeight: z.number().int().min(100).max(600).default(200),
  signatureColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  
  // Consent/Agreement configuration
  consentText: z.string().optional().nullable(),
  requireSignature: z.boolean().default(false),
  
  // Contact form configuration
  collectName: z.boolean().default(true),
  collectEmail: z.boolean().default(true),
  collectPhone: z.boolean().default(false),
  collectCompany: z.boolean().default(false),
  collectAddress: z.boolean().default(false),
  showIpsosBranding: z.boolean().default(false),
  
  // Group ranking/rating configuration
  groupSize: z.number().int().min(2).max(10).default(3),
  groupLabel: z.string().optional().nullable()
});

export const updateQuestionSchema = z.object({
  groupId: z.string().uuid().optional().nullable(),
  groupIndex: z.number().int().min(0).optional().nullable(),
  type: questionTypeSchema.optional(),
  variableName: z.string().regex(/^Q[0-9]+$/).optional(),
  titleTemplate: z.string().min(1).optional(),
  helpTextTemplate: z.string().optional().nullable(),
  required: z.boolean().optional(),
  validation: z.any().optional(),
  optionOrderMode: z.enum(['SEQUENTIAL', 'RANDOM', 'GROUP_RANDOM', 'WEIGHTED']).optional(),
  optionsSource: z.enum(['STATIC', 'CARRY_FORWARD']).optional(),
  carryForwardQuestionId: z.string().uuid().optional().nullable(),
  carryForwardFilterExprId: z.string().uuid().optional().nullable(),
  visibleIfExpressionId: z.string().uuid().optional().nullable(),
  terminateIfExpressionId: z.string().uuid().optional().nullable(),
  
  // Type-specific configuration fields (all optional for updates)
  minValue: z.number().optional().nullable(),
  maxValue: z.number().optional().nullable(),
  stepValue: z.number().optional().nullable(),
  defaultValue: z.number().optional().nullable(),
  scaleMinLabel: z.string().optional().nullable(),
  scaleMaxLabel: z.string().optional().nullable(),
  scaleSteps: z.number().int().min(2).max(11).optional().nullable(),
  maxSelections: z.number().int().min(1).optional().nullable(),
  allowOther: z.boolean().optional(),
  otherLabel: z.string().optional().nullable(),
  allowedFileTypes: z.array(z.string()).optional(),
  maxFileSize: z.number().int().min(1).optional().nullable(),
  maxFiles: z.number().int().min(1).optional(),
  dateFormat: z.string().optional().nullable(),
  timeFormat: z.enum(['12h', '24h']).optional().nullable(),
  minDate: z.string().datetime().optional().nullable(),
  maxDate: z.string().datetime().optional().nullable(),
  phoneFormat: z.enum(['US', 'INTERNATIONAL', 'E164']).optional().nullable(),
  countryCode: z.string().optional(),
  urlProtocol: z.enum(['http', 'https', 'both']).optional(),
  paymentAmount: z.number().min(0).optional().nullable(),
  currency: z.string().optional(),
  paymentMethods: z.array(z.enum(['card', 'paypal', 'bank'])).optional(),
  imageLayout: z.enum(['grid', 'list', 'carousel']).optional(),
  imageSize: z.enum(['small', 'medium', 'large']).optional(),
  matrixType: z.enum(['single', 'multiple', 'rating']).optional(),
  showHeaders: z.boolean().optional(),
  randomizeRows: z.boolean().optional(),
  randomizeColumns: z.boolean().optional(),
  totalPoints: z.number().int().min(1).optional(),
  allowZero: z.boolean().optional(),
  signatureWidth: z.number().int().min(100).max(800).optional(),
  signatureHeight: z.number().int().min(100).max(600).optional(),
  signatureColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  consentText: z.string().optional().nullable(),
  requireSignature: z.boolean().optional(),
  collectName: z.boolean().optional(),
  collectEmail: z.boolean().optional(),
  collectPhone: z.boolean().optional(),
  collectCompany: z.boolean().optional(),
  collectAddress: z.boolean().optional(),
  showIpsosBranding: z.boolean().optional(),
  groupSize: z.number().int().min(2).max(10).optional(),
  groupLabel: z.string().optional().nullable()
});

// Question Option validation
export const createQuestionOptionSchema = z.object({
  questionId: uuidSchema,
  value: z.string().min(1, 'Value is required'),
  labelTemplate: z.string().min(1, 'Label is required'),
  exclusive: z.boolean().default(false),
  groupKey: z.string().optional().nullable(),
  weight: z.number().int().positive().optional().nullable(),
  visibleIfExpressionId: z.string().uuid().optional().nullable(),
  
  // Picture choice specific fields
  imageUrl: z.string().url().optional().nullable(),
  imageAlt: z.string().optional().nullable(),
  imageWidth: z.number().int().min(1).max(2000).optional().nullable(),
  imageHeight: z.number().int().min(1).max(2000).optional().nullable()
});

export const updateQuestionOptionSchema = z.object({
  value: z.string().min(1).optional(),
  labelTemplate: z.string().min(1).optional(),
  exclusive: z.boolean().optional(),
  groupKey: z.string().optional().nullable(),
  weight: z.number().int().positive().optional().nullable(),
  visibleIfExpressionId: z.string().uuid().optional().nullable(),
  
  // Picture choice specific fields
  imageUrl: z.string().url().optional().nullable(),
  imageAlt: z.string().optional().nullable(),
  imageWidth: z.number().int().min(1).max(2000).optional().nullable(),
  imageHeight: z.number().int().min(1).max(2000).optional().nullable()
});

// Question Item validation (for MATRIX questions)
export const createQuestionItemSchema = z.object({
  questionId: uuidSchema,
  value: z.string().min(1, 'Value is required'),
  label: z.string().min(1, 'Label is required')
});

export const updateQuestionItemSchema = z.object({
  value: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  visibleIfExpressionId: z.string().uuid().optional().nullable()
});

// Question Scale validation (for MATRIX questions)
export const createQuestionScaleSchema = z.object({
  questionId: uuidSchema,
  value: z.string().min(1, 'Value is required'),
  label: z.string().min(1, 'Label is required')
});

export const updateQuestionScaleSchema = z.object({
  value: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  visibleIfExpressionId: z.string().uuid().optional().nullable()
});

// Expression validation
export const createExpressionSchema = z.object({
  dsl: z.string().min(1, 'DSL expression is required'),
  description: z.string().optional().nullable()
});

export const updateExpressionSchema = z.object({
  dsl: z.string().min(1).optional(),
  description: z.string().optional().nullable()
});

// Answer validation
export const createAnswerSchema = z.object({
  sessionId: uuidSchema,
  questionId: uuidSchema,
  choices: z.array(z.string()).default([]),
  textValue: z.string().optional().nullable(),
  numericValue: z.number().int().optional().nullable(),
  decimalValue: z.number().optional().nullable(),
  dateValue: z.string().datetime().optional().nullable(),
  timeValue: z.string().datetime().optional().nullable(),
  jsonValue: z.any().optional().nullable(),
  
  // Additional answer fields for new question types
  booleanValue: z.boolean().optional().nullable(),
  emailValue: z.string().email().optional().nullable(),
  phoneValue: z.string().optional().nullable(),
  urlValue: z.string().url().optional().nullable(),
  fileUrls: z.array(z.string().url()).default([]),
  signatureUrl: z.string().url().optional().nullable(),
  paymentId: z.string().optional().nullable(),
  paymentStatus: z.enum(['pending', 'completed', 'failed', 'refunded']).optional().nullable()
});

export const updateAnswerSchema = z.object({
  choices: z.array(z.string()).optional(),
  textValue: z.string().optional().nullable(),
  numericValue: z.number().int().optional().nullable(),
  decimalValue: z.number().optional().nullable(),
  dateValue: z.string().datetime().optional().nullable(),
  timeValue: z.string().datetime().optional().nullable(),
  jsonValue: z.any().optional().nullable(),
  booleanValue: z.boolean().optional().nullable(),
  emailValue: z.string().email().optional().nullable(),
  phoneValue: z.string().optional().nullable(),
  urlValue: z.string().url().optional().nullable(),
  fileUrls: z.array(z.string().url()).optional(),
  signatureUrl: z.string().url().optional().nullable(),
  paymentId: z.string().optional().nullable(),
  paymentStatus: z.enum(['pending', 'completed', 'failed', 'refunded']).optional().nullable()
});

export const validateExpressionSchema = z.object({
  dsl: z.string().min(1, 'DSL expression is required'),
  testAnswers: z.record(z.string(), z.any()).optional() // For testing expressions with sample data
});

// Validation helper function
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Validation failed' };
  }
}

