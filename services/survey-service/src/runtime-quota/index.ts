import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const prisma = new PrismaClient();

// Validation schemas
const assignQuotaSchema = z.object({
  answersSoFar: z.record(z.string(), z.any()).optional() // answers from the session
});

const releaseQuotaSchema = z.object({
  bucketIds: z.array(z.string().uuid()).optional() // specific buckets to release, or all if not provided
});

const completeSessionSchema = z.object({
  finalAnswers: z.record(z.string(), z.any()).optional()
});

/**
 * Assign quota reservations for a session
 * POST /api/runtime/:sessionId/quota/assign
 */
export const assignQuota = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const body = assignQuotaSchema.parse(req.body);

    // Get session and verify access
    const session = await prisma.surveySession.findFirst({
      where: {
        id: sessionId,
        tenantId
      },
      include: {
        survey: {
          include: {
            quotaPlans: {
              where: { state: 'OPEN' },
              include: {
                buckets: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Session is not in progress' });
    }

    const assigned = [];
    const denied = [];

    // Process each quota plan
    for (const plan of session.survey.quotaPlans) {
      let assignedBucket = null;

      // Find matching bucket for this plan
      for (const bucket of plan.buckets) {
        let matches = false;

        // Check if bucket matches based on questionId + optionValue
        if (bucket.questionId && bucket.optionValue) {
          const answer = body.answersSoFar?.[bucket.questionId];
          if (Array.isArray(answer)) {
            matches = answer.includes(bucket.optionValue);
          } else {
            matches = answer === bucket.optionValue;
          }
        }
        // TODO: Add support for conditionExprId evaluation

        if (matches) {
          assignedBucket = bucket;
          break;
        }
      }

      if (assignedBucket) {
        try {
          // Try to reserve a spot in this bucket
          const result = await prisma.$transaction(async (tx) => {
            // Check capacity
            const bucket = await tx.quotaBucket.findUnique({
              where: { id: assignedBucket.id }
            });

            if (!bucket) {
              throw new Error('Bucket not found');
            }

            const totalUsed = bucket.filledN + bucket.reservedN;
            const maxCapacity = bucket.targetN + bucket.maxOverfill;

            if (totalUsed >= maxCapacity) {
              throw new Error('Bucket is full');
            }

            // Reserve the spot
            await tx.quotaBucket.update({
              where: { id: assignedBucket.id },
              data: { reservedN: { increment: 1 } }
            });

            // Create or update reservation
            const reservation = await tx.quotaReservation.upsert({
              where: {
                sessionId_bucketId: {
                  sessionId: sessionId!,
                  bucketId: assignedBucket.id
                }
              },
              update: {
                status: 'ACTIVE',
                expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
              },
              create: {
                bucketId: assignedBucket.id,
                sessionId: sessionId!,
                surveyId: session.surveyId,
                tenantId,
                status: 'ACTIVE',
                expiresAt: new Date(Date.now() + 30 * 60 * 1000)
              }
            });

            return { bucket, reservation };
          });

          assigned.push({
            planId: plan.id,
            bucketId: assignedBucket.id,
            label: assignedBucket.label
          });

        } catch (error) {
          denied.push({
            planId: plan.id,
            reason: 'FULL'
          });
        }
      } else {
        denied.push({
          planId: plan.id,
          reason: 'NO_MATCH'
        });
      }
    }

    res.json({
      assigned,
      denied: denied.length > 0 ? denied : undefined
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error assigning quota:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Release quota reservations for a session
 * POST /api/runtime/:sessionId/quota/release
 */
export const releaseQuota = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const body = releaseQuotaSchema.parse(req.body);

    // Get session and verify access
    const session = await prisma.surveySession.findFirst({
      where: {
        id: sessionId,
        tenantId
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get active reservations for this session
    const whereClause: any = {
      sessionId,
      status: 'ACTIVE'
    };

    if (body.bucketIds && body.bucketIds.length > 0) {
      whereClause.bucketId = { in: body.bucketIds };
    }

    const reservations = await prisma.quotaReservation.findMany({
      where: whereClause,
      include: {
        bucket: true
      }
    });

    if (reservations.length === 0) {
      return res.json({ 
        message: 'No active reservations to release',
        released: []
      });
    }

    // Release reservations in a transaction
    const released = await prisma.$transaction(async (tx) => {
      const releasedReservations = [];

      for (const reservation of reservations) {
        // Update bucket reserved count
        await tx.quotaBucket.update({
          where: { id: reservation.bucketId },
          data: { reservedN: { decrement: 1 } }
        });

        // Update reservation status
        const updatedReservation = await tx.quotaReservation.update({
          where: { id: reservation.id },
          data: { status: 'RELEASED' }
        });

        releasedReservations.push({
          bucketId: reservation.bucketId,
          label: reservation.bucket.label
        });
      }

      return releasedReservations;
    });

    res.json({
      message: 'Quota reservations released successfully',
      released
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error releasing quota:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Complete a session and finalize quota reservations
 * POST /api/runtime/:sessionId/complete
 */
export const completeSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const body = completeSessionSchema.parse(req.body);

    // Get session and verify access
    const session = await prisma.surveySession.findFirst({
      where: {
        id: sessionId,
        tenantId
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Session is not in progress' });
    }

    // Finalize reservations and complete session in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get active reservations
      const reservations = await tx.quotaReservation.findMany({
        where: {
          sessionId,
          status: 'ACTIVE'
        },
        include: {
          bucket: true
        }
      });

      // Finalize each reservation
      for (const reservation of reservations) {
        // Update bucket counts
        await tx.quotaBucket.update({
          where: { id: reservation.bucketId },
          data: {
            reservedN: { decrement: 1 },
            filledN: { increment: 1 }
          }
        });

        // Mark reservation as finalized
        await tx.quotaReservation.update({
          where: { id: reservation.id },
          data: { status: 'FINALIZED' }
        });
      }

      // Update session status
      const updatedSession = await tx.surveySession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          finalizedAt: new Date()
        }
      });

      return {
        session: updatedSession,
        finalizedReservations: reservations.map(r => ({
          bucketId: r.bucketId,
          label: r.bucket.label
        }))
      };
    });

    // Send completion notification email (non-blocking)
    try {
      const { sendCompletionNotificationForSession } = await import('../lib/completion-notifications.js');
      const surveyId = result.session.surveyId;
      if (surveyId) {
        await sendCompletionNotificationForSession(
          prisma,
          tenantId,
          surveyId,
          sessionId!
        );
      } else {
        console.warn(`⚠️ Session ${sessionId} has no surveyId - skipping completion notification`);
      }
    } catch (error) {
      // Don't fail the request if email sending fails
      console.error('❌ [EMAIL_ERROR] Failed to send completion notification:', error);
    }

    res.json({
      message: 'Session completed successfully',
      session: result.session,
      finalizedReservations: result.finalizedReservations
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error completing session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get quota status for a session
 * GET /api/runtime/:sessionId/quota/status
 */
export const getQuotaStatus = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get session and verify access
    const session = await prisma.surveySession.findFirst({
      where: {
        id: sessionId,
        tenantId
      },
      include: {
        survey: {
          include: {
            quotaPlans: {
              include: {
                buckets: {
                  include: {
                    reservations: {
                      where: { sessionId }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const quotaStatus = session.survey.quotaPlans.map(plan => ({
      planId: plan.id,
      name: plan.name,
      strategy: plan.strategy,
      state: plan.state,
      buckets: plan.buckets.map(bucket => {
        const reservation = bucket.reservations[0];
        return {
          bucketId: bucket.id,
          label: bucket.label,
          targetN: bucket.targetN,
          filledN: bucket.filledN,
          reservedN: bucket.reservedN,
          maxOverfill: bucket.maxOverfill,
          available: bucket.targetN + bucket.maxOverfill - bucket.filledN - bucket.reservedN,
          isFull: (bucket.filledN + bucket.reservedN) >= (bucket.targetN + bucket.maxOverfill),
          hasReservation: !!reservation,
          reservationStatus: reservation?.status
        };
      })
    }));

    res.json({ quotaStatus });

  } catch (error) {
    console.error('Error fetching quota status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check if survey is open for new sessions
 * GET /api/runtime/:surveyId/availability
 */
export const checkSurveyAvailability = async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get survey target
    const target = await prisma.surveyTarget.findFirst({
      where: {
        surveyId,
        tenantId
      }
    });

    if (!target) {
      return res.json({
        available: true,
        reason: 'NO_TARGET_SET'
      });
    }

    // Get completed count
    const completedCount = await prisma.surveySession.count({
      where: {
        surveyId,
        status: 'COMPLETED'
      }
    });

    const isHardClose = completedCount >= target.totalN && target.hardClose;
    const isSoftClose = target.softCloseN ? completedCount >= target.softCloseN : false;

    res.json({
      available: !isHardClose,
      reason: isHardClose ? 'HARD_CLOSED' : isSoftClose ? 'SOFT_CLOSE' : 'OPEN',
      completedCount,
      targetN: target.totalN,
      softCloseN: target.softCloseN,
      remainingCount: target.totalN - completedCount,
      closingSoon: isSoftClose
    });

  } catch (error) {
    console.error('Error checking survey availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
