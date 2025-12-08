import { z } from 'zod';
import { uuidSchema } from './validation';

// ========================================================
// ================= Jump Logic Validation ==============
// ========================================================

// Question Jump validation
export const createQuestionJumpSchema = z.object({
  fromQuestionId: uuidSchema,
  toPageId: uuidSchema.optional(),
  toQuestionId: uuidSchema.optional(),
  conditionExpressionId: uuidSchema.optional(),
  priority: z.number().int().min(0).default(0)
}).refine(
  (data) => data.toPageId || data.toQuestionId,
  {
    message: "Either toPageId or toQuestionId must be provided",
    path: ["toPageId"]
  }
);

export const updateQuestionJumpSchema = z.object({
  toPageId: uuidSchema.optional(),
  toQuestionId: uuidSchema.optional(),
  conditionExpressionId: uuidSchema.optional().nullable(),
  priority: z.number().int().min(0).optional()
}).refine(
  (data) => data.toPageId || data.toQuestionId,
  {
    message: "Either toPageId or toQuestionId must be provided",
    path: ["toPageId"]
  }
);

// Page Jump validation
export const createPageJumpSchema = z.object({
  fromPageId: uuidSchema,
  toPageId: uuidSchema,
  conditionExpressionId: uuidSchema.optional(),
  priority: z.number().int().min(0).default(0)
});

export const updatePageJumpSchema = z.object({
  toPageId: uuidSchema.optional(),
  conditionExpressionId: uuidSchema.optional().nullable(),
  priority: z.number().int().min(0).optional()
});

// Jump Logic evaluation schemas
export const evaluateJumpLogicSchema = z.object({
  answers: z.record(z.string(), z.any()),
  currentQuestionId: uuidSchema.optional(),
  currentPageId: uuidSchema.optional()
});

export const testJumpLogicSchema = z.object({
  jumpId: uuidSchema,
  jumpType: z.enum(['question', 'page']),
  testAnswers: z.record(z.string(), z.any())
});
