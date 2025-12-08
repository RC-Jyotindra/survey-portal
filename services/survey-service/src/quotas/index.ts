import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const prisma = new PrismaClient();

// Validation schemas
const createQuotaPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  strategy: z.enum(['MANUAL', 'EQUAL', 'RANDOM']).default('MANUAL'),
  totalN: z.number().int().positive('Total N must be a positive integer'),
  state: z.enum(['OPEN', 'CLOSED']).default('OPEN')
});

const updateQuotaPlanSchema = z.object({
  name: z.string().min(1).optional(),
  strategy: z.enum(['MANUAL', 'EQUAL', 'RANDOM']).optional(),
  totalN: z.number().int().positive().optional(),
  state: z.enum(['OPEN', 'CLOSED']).optional()
});

const createQuotaBucketSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  label: z.string().min(1, 'Bucket label is required'),
  questionId: z.string().uuid().optional(),
  optionValue: z.string().optional(),
  conditionExprId: z.string().uuid().optional(),
  targetN: z.number().int().positive('Target N must be a positive integer'),
  maxOverfill: z.number().int().min(0).default(0)
});

const updateQuotaBucketSchema = z.object({
  label: z.string().min(1).optional(),
  questionId: z.string().uuid().optional(),
  optionValue: z.string().optional(),
  conditionExprId: z.string().uuid().optional(),
  targetN: z.number().int().positive().optional(),
  maxOverfill: z.number().int().min(0).optional()
});

const generateQuotaPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  strategy: z.enum(['EQUAL', 'RANDOM']),
  totalN: z.number().int().positive('Total N must be a positive integer'),
  source: z.object({
    type: z.literal('QUESTION_OPTIONS'),
    questionId: z.string().uuid('Invalid question ID')
  })
});

/**
 * Create a new quota plan
 * POST /api/surveys/:surveyId/quotas
 */
export const createQuotaPlan = async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const body = createQuotaPlanSchema.parse(req.body);

    if (!surveyId) {
      return res.status(400).json({ error: 'Survey ID is required' });
    }

    // Verify survey exists and user has access
    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        tenantId,
        status: { in: ['DRAFT', 'PUBLISHED'] }
      }
    });

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found or not accessible' });
    }

    const quotaPlan = await prisma.quotaPlan.create({
      data: {
        surveyId: surveyId as string,
        tenantId,
        name: body.name,
        strategy: body.strategy,
        totalN: body.totalN,
        state: body.state
      }
    });

    res.status(201).json({
      message: 'Quota plan created successfully',
      quotaPlan
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error creating quota plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Generate quota plan from question options
 * POST /api/surveys/:surveyId/quotas/generate
 */
export const generateQuotaPlan = async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const body = generateQuotaPlanSchema.parse(req.body);

    if (!surveyId) {
      return res.status(400).json({ error: 'Survey ID is required' });
    }

    // Verify survey and question exist
    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        tenantId,
        status: { in: ['DRAFT', 'PUBLISHED'] }
      }
    });

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found or not accessible' });
    }

    const question = await prisma.question.findFirst({
      where: {
        id: body.source.questionId,
        surveyId,
        tenantId
      },
      include: {
        options: {
          orderBy: { index: 'asc' }
        }
      }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (question.options.length === 0) {
      return res.status(400).json({ error: 'Question has no options to generate quotas from' });
    }

    // Calculate target per bucket
    const targetPerBucket = Math.floor(body.totalN / question.options.length);
    const remainder = body.totalN % question.options.length;

    // Create quota plan
    const quotaPlan = await prisma.quotaPlan.create({
      data: {
        surveyId: surveyId as string,
        tenantId,
        name: body.name,
        strategy: body.strategy,
        totalN: body.totalN,
        state: 'OPEN'
      }
    });

    // Create buckets for each option
    const buckets = await Promise.all(
      question.options.map(async (option, index) => {
        const targetN = targetPerBucket + (index < remainder ? 1 : 0);
        
        return prisma.quotaBucket.create({
          data: {
            planId: quotaPlan.id,
            tenantId,
            label: option.labelTemplate,
            questionId: question.id,
            optionValue: option.value,
            targetN,
            maxOverfill: 0
          }
        });
      })
    );

    res.status(201).json({
      message: 'Quota plan generated successfully',
      quotaPlan: {
        ...quotaPlan,
        buckets
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error generating quota plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all quota plans for a survey
 * GET /api/surveys/:surveyId/quotas
 */
export const getQuotaPlans = async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const quotaPlans = await prisma.quotaPlan.findMany({
      where: {
        surveyId,
        tenantId
      },
      include: {
        buckets: {
          orderBy: { label: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ quotaPlans });

  } catch (error) {
    console.error('Error fetching quota plans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a specific quota plan
 * GET /api/surveys/:surveyId/quotas/:planId
 */
export const getQuotaPlan = async (req: Request, res: Response) => {
  try {
    const { surveyId, planId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const quotaPlan = await prisma.quotaPlan.findFirst({
      where: {
        id: planId,
        surveyId,
        tenantId
      },
      include: {
        buckets: {
          orderBy: { label: 'asc' }
        }
      }
    });

    if (!quotaPlan) {
      return res.status(404).json({ error: 'Quota plan not found' });
    }

    res.json({ quotaPlan });

  } catch (error) {
    console.error('Error fetching quota plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update a quota plan
 * PUT /api/surveys/:surveyId/quotas/:planId
 */
export const updateQuotaPlan = async (req: Request, res: Response) => {
  try {
    const { surveyId, planId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const body = updateQuotaPlanSchema.parse(req.body);

    const quotaPlan = await prisma.quotaPlan.findFirst({
      where: {
        id: planId,
        surveyId,
        tenantId
      }
    });

    if (!quotaPlan) {
      return res.status(404).json({ error: 'Quota plan not found' });
    }

    const updatedPlan = await prisma.quotaPlan.update({
      where: { id: planId },
      data: body
    });

    res.json({
      message: 'Quota plan updated successfully',
      quotaPlan: updatedPlan
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error updating quota plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a quota plan
 * DELETE /api/surveys/:surveyId/quotas/:planId
 */
export const deleteQuotaPlan = async (req: Request, res: Response) => {
  try {
    const { surveyId, planId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const quotaPlan = await prisma.quotaPlan.findFirst({
      where: {
        id: planId,
        surveyId,
        tenantId
      }
    });

    if (!quotaPlan) {
      return res.status(404).json({ error: 'Quota plan not found' });
    }

    await prisma.quotaPlan.delete({
      where: { id: planId }
    });

    res.json({ message: 'Quota plan deleted successfully' });

  } catch (error) {
    console.error('Error deleting quota plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a quota bucket
 * POST /api/surveys/:surveyId/quotas/:planId/buckets
 */
export const createQuotaBucket = async (req: Request, res: Response) => {
  try {
    const { surveyId, planId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const body = createQuotaBucketSchema.parse(req.body);

    if (!surveyId || !planId) {
      return res.status(400).json({ error: 'Survey ID and Plan ID are required' });
    }

    // Verify quota plan exists
    const quotaPlan = await prisma.quotaPlan.findFirst({
      where: {
        id: planId,
        surveyId,
        tenantId
      }
    });

    if (!quotaPlan) {
      return res.status(404).json({ error: 'Quota plan not found' });
    }

    // Validate that either questionId+optionValue OR conditionExprId is provided
    if (!body.questionId && !body.conditionExprId) {
      return res.status(400).json({ 
        error: 'Either questionId+optionValue or conditionExprId must be provided' 
      });
    }

    if (body.questionId && !body.optionValue) {
      return res.status(400).json({ 
        error: 'optionValue is required when questionId is provided' 
      });
    }

    const bucket = await prisma.quotaBucket.create({
      data: {
        planId: planId as string,
        tenantId,
        label: body.label,
        questionId: body.questionId,
        optionValue: body.optionValue,
        conditionExprId: body.conditionExprId,
        targetN: body.targetN,
        maxOverfill: body.maxOverfill
      }
    });

    res.status(201).json({
      message: 'Quota bucket created successfully',
      bucket
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error creating quota bucket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update a quota bucket
 * PUT /api/surveys/:surveyId/quotas/:planId/buckets/:bucketId
 */
export const updateQuotaBucket = async (req: Request, res: Response) => {
  try {
    const { surveyId, planId, bucketId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const body = updateQuotaBucketSchema.parse(req.body);

    const bucket = await prisma.quotaBucket.findFirst({
      where: {
        id: bucketId,
        planId,
        tenantId
      }
    });

    if (!bucket) {
      return res.status(404).json({ error: 'Quota bucket not found' });
    }

    const updatedBucket = await prisma.quotaBucket.update({
      where: { id: bucketId },
      data: body
    });

    res.json({
      message: 'Quota bucket updated successfully',
      bucket: updatedBucket
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error updating quota bucket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a quota bucket
 * DELETE /api/surveys/:surveyId/quotas/:planId/buckets/:bucketId
 */
export const deleteQuotaBucket = async (req: Request, res: Response) => {
  try {
    const { surveyId, planId, bucketId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const bucket = await prisma.quotaBucket.findFirst({
      where: {
        id: bucketId,
        planId,
        tenantId
      }
    });

    if (!bucket) {
      return res.status(404).json({ error: 'Quota bucket not found' });
    }

    await prisma.quotaBucket.delete({
      where: { id: bucketId }
    });

    res.json({ message: 'Quota bucket deleted successfully' });

  } catch (error) {
    console.error('Error deleting quota bucket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get quota statistics
 * GET /api/surveys/:surveyId/quotas/stats
 */
export const getQuotaStats = async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const quotaPlans = await prisma.quotaPlan.findMany({
      where: {
        surveyId,
        tenantId
      },
      include: {
        buckets: {
          include: {
            reservations: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    });

    const stats = quotaPlans.map(plan => ({
      planId: plan.id,
      name: plan.name,
      strategy: plan.strategy,
      state: plan.state,
      totalN: plan.totalN,
      buckets: plan.buckets.map(bucket => ({
        bucketId: bucket.id,
        label: bucket.label,
        targetN: bucket.targetN,
        filledN: bucket.filledN,
        reservedN: bucket.reservedN,
        maxOverfill: bucket.maxOverfill,
        available: bucket.targetN + bucket.maxOverfill - bucket.filledN - bucket.reservedN,
        isFull: (bucket.filledN + bucket.reservedN) >= (bucket.targetN + bucket.maxOverfill)
      }))
    }));

    res.json({ stats });

  } catch (error) {
    console.error('Error fetching quota statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
