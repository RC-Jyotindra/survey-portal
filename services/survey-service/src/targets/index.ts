import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const prisma = new PrismaClient();

// Validation schemas
const createTargetSchema = z.object({
  totalN: z.number().int().positive('Total N must be a positive integer'),
  softCloseN: z.number().int().positive().optional(),
  hardClose: z.boolean().default(true)
});

const updateTargetSchema = z.object({
  totalN: z.number().int().positive().optional(),
  softCloseN: z.number().int().positive().optional(),
  hardClose: z.boolean().optional()
});

/**
 * Create or update survey target (sample size)
 * POST /api/surveys/:surveyId/target
 */
export const createOrUpdateTarget = async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const body = createTargetSchema.parse(req.body);

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

    // Validate softCloseN if provided
    if (body.softCloseN && body.softCloseN > body.totalN) {
      return res.status(400).json({ 
        error: 'Soft close N cannot be greater than total N' 
      });
    }

    // Upsert target
    const target = await prisma.surveyTarget.upsert({
      where: { surveyId: surveyId! },
      update: {
        totalN: body.totalN,
        softCloseN: body.softCloseN,
        hardClose: body.hardClose
      },
      create: {
        surveyId: surveyId!,
        tenantId,
        totalN: body.totalN,
        softCloseN: body.softCloseN,
        hardClose: body.hardClose
      }
    });

    res.status(201).json({
      message: 'Survey target created/updated successfully',
      target
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error creating/updating survey target:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get survey target
 * GET /api/surveys/:surveyId/target
 */
export const getTarget = async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const target = await prisma.surveyTarget.findFirst({
      where: {
        surveyId,
        tenantId
      },
      include: {
        survey: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    if (!target) {
      return res.status(404).json({ error: 'Survey target not found' });
    }

    // Get current completion count
    const completedCount = await prisma.surveySession.count({
      where: {
        surveyId,
        status: 'COMPLETED'
      }
    });

    res.json({
      target: {
        ...target,
        completedCount,
        remainingCount: target.totalN - completedCount,
        isSoftClose: target.softCloseN ? completedCount >= target.softCloseN : false,
        isHardClose: completedCount >= target.totalN && target.hardClose
      }
    });

  } catch (error) {
    console.error('Error fetching survey target:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update survey target
 * PUT /api/surveys/:surveyId/target
 */
export const updateTarget = async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const body = updateTargetSchema.parse(req.body);

    // Verify target exists
    const existingTarget = await prisma.surveyTarget.findFirst({
      where: {
        surveyId,
        tenantId
      }
    });

    if (!existingTarget) {
      return res.status(404).json({ error: 'Survey target not found' });
    }

    // Validate softCloseN if provided
    if (body.softCloseN && body.totalN && body.softCloseN > body.totalN) {
      return res.status(400).json({ 
        error: 'Soft close N cannot be greater than total N' 
      });
    }

    const target = await prisma.surveyTarget.update({
      where: { id: existingTarget.id },
      data: body
    });

    res.json({
      message: 'Survey target updated successfully',
      target
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error updating survey target:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete survey target
 * DELETE /api/surveys/:surveyId/target
 */
export const deleteTarget = async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const target = await prisma.surveyTarget.findFirst({
      where: {
        surveyId,
        tenantId
      }
    });

    if (!target) {
      return res.status(404).json({ error: 'Survey target not found' });
    }

    await prisma.surveyTarget.delete({
      where: { id: target.id }
    });

    res.json({ message: 'Survey target deleted successfully' });

  } catch (error) {
    console.error('Error deleting survey target:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get survey target statistics
 * GET /api/surveys/:surveyId/target/stats
 */
export const getTargetStats = async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const target = await prisma.surveyTarget.findFirst({
      where: {
        surveyId,
        tenantId
      }
    });

    if (!target) {
      return res.status(404).json({ error: 'Survey target not found' });
    }

    // Get session statistics
    const [completedCount, inProgressCount, terminatedCount] = await Promise.all([
      prisma.surveySession.count({
        where: { surveyId, status: 'COMPLETED' }
      }),
      prisma.surveySession.count({
        where: { surveyId, status: 'IN_PROGRESS' }
      }),
      prisma.surveySession.count({
        where: { surveyId, status: 'TERMINATED' }
      })
    ]);

    const totalSessions = completedCount + inProgressCount + terminatedCount;
    const completionRate = totalSessions > 0 ? (completedCount / totalSessions) * 100 : 0;

    res.json({
      target: {
        totalN: target.totalN,
        softCloseN: target.softCloseN,
        hardClose: target.hardClose
      },
      stats: {
        completedCount,
        inProgressCount,
        terminatedCount,
        totalSessions,
        completionRate: Math.round(completionRate * 100) / 100,
        remainingCount: target.totalN - completedCount,
        isSoftClose: target.softCloseN ? completedCount >= target.softCloseN : false,
        isHardClose: completedCount >= target.totalN && target.hardClose
      }
    });

  } catch (error) {
    console.error('Error fetching target statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
