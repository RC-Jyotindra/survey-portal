/**
 * Quota Engine
 * 
 * Handles the "Quota" step of the runtime engine:
 * - Synchronous & atomic quota reservation
 * - Reserve/finalize/release quota buckets
 * - Handle overquota scenarios
 */

import { PrismaClient } from '@prisma/client';
import { evaluateExpression } from './dsl';

export interface QuotaReservation {
  id: string;
  bucketId: string;
  sessionId: string;
  status: 'ACTIVE' | 'RELEASED' | 'FINALIZED';
  expiresAt?: Date;
}

export interface QuotaBucket {
  id: string;
  planId: string;
  label: string;
  questionId?: string;
  optionValue?: string;
  conditionExprId?: string;
  targetN: number;
  filledN: number;
  reservedN: number;
  maxOverfill: number;
}

export interface QuotaCheckResult {
  canProceed: boolean;
  reason?: 'OVERQUOTA' | 'BUCKET_FULL' | 'NO_MATCHING_BUCKET';
  bucketId?: string;
  message?: string;
}

export interface QuotaReservationResult {
  success: boolean;
  reservationId?: string;
  bucketId?: string;
  reason?: string;
}

/**
 * Check if a session can proceed based on quota constraints
 */
export async function checkQuota(
  prisma: PrismaClient,
  sessionId: string,
  surveyId: string,
  tenantId: string,
  answers: Map<string, any>,
  loopContext?: Map<string, any>
): Promise<QuotaCheckResult> {
  // Get active quota plans for this survey
  const quotaPlans = await prisma.quotaPlan.findMany({
    where: {
      surveyId,
      tenantId,
      state: 'OPEN'
    },
    include: {
      buckets: {
        include: { condition: true }
      }
    }
  });

  if (quotaPlans.length === 0) {
    // No quota constraints
    return { canProceed: true };
  }

  // Find matching buckets for each plan
  const matchingBuckets: QuotaBucket[] = [];
  
  for (const plan of quotaPlans) {
    for (const bucket of plan.buckets) {
      if (await isBucketMatch(bucket, answers, loopContext)) {
        matchingBuckets.push({
          id: bucket.id,
          planId: bucket.planId,
          label: bucket.label,
          questionId: bucket.questionId || undefined,
          optionValue: bucket.optionValue || undefined,
          conditionExprId: bucket.conditionExprId || undefined,
          targetN: bucket.targetN,
          filledN: bucket.filledN,
          reservedN: bucket.reservedN,
          maxOverfill: bucket.maxOverfill
        });
      }
    }
  }

  if (matchingBuckets.length === 0) {
    // No matching buckets means this question doesn't have quota constraints
    // Allow the user to proceed
    return { canProceed: true };
  }

  // Check if any matching bucket has capacity
  for (const bucket of matchingBuckets) {
    const totalUsed = bucket.filledN + bucket.reservedN;
    const maxCapacity = bucket.targetN + bucket.maxOverfill;
    
    if (totalUsed < maxCapacity) {
      return { canProceed: true };
    }
  }

  // All matching buckets are full
  return {
    canProceed: false,
    reason: 'OVERQUOTA',
    message: 'Survey quota has been reached'
  };
}

/**
 * Reserve a quota bucket for a session
 */
export async function reserveQuota(
  prisma: PrismaClient,
  sessionId: string,
  surveyId: string,
  tenantId: string,
  answers: Map<string, any>,
  loopContext?: Map<string, any>
): Promise<QuotaReservationResult> {
  return await prisma.$transaction(async (tx) => {
    // Get active quota plans
    const quotaPlans = await tx.quotaPlan.findMany({
      where: {
        surveyId,
        tenantId,
        state: 'OPEN'
      },
      include: {
        buckets: {
          include: { condition: true }
        }
      }
    });

    if (quotaPlans.length === 0) {
      return { success: true };
    }

    // Find matching buckets
    const matchingBuckets: any[] = [];
    
    for (const plan of quotaPlans) {
      for (const bucket of plan.buckets) {
        if (await isBucketMatch(bucket, answers, loopContext)) {
          matchingBuckets.push(bucket);
        }
      }
    }

    if (matchingBuckets.length === 0) {
      // No matching buckets means this question doesn't have quota constraints
      // Allow the reservation to succeed (no quota to reserve)
      return { success: true };
    }

    // Try to reserve in the first available bucket
    for (const bucket of matchingBuckets) {
      const totalUsed = bucket.filledN + bucket.reservedN;
      const maxCapacity = bucket.targetN + bucket.maxOverfill;
      
      if (totalUsed < maxCapacity) {
        // Try to increment reserved count atomically
        const updateResult = await tx.quotaBucket.updateMany({
          where: {
            id: bucket.id,
            // Ensure we don't exceed capacity
            filledN: { lt: maxCapacity - bucket.reservedN }
          },
          data: {
            reservedN: { increment: 1 }
          }
        });

        if (updateResult.count > 0) {
          // Create reservation record
          const reservation = await tx.quotaReservation.create({
            data: {
              bucketId: bucket.id,
              sessionId,
              surveyId,
              tenantId,
              status: 'ACTIVE',
              expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
            }
          });

          return {
            success: true,
            reservationId: reservation.id,
            bucketId: bucket.id
          };
        }
      }
    }

    return {
      success: false,
      reason: 'All matching quota buckets are full'
    };
  });
}

/**
 * Finalize a quota reservation (session completed)
 */
export async function finalizeQuota(
  prisma: PrismaClient,
  sessionId: string
): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    // Get active reservations for this session
    const reservations = await tx.quotaReservation.findMany({
      where: {
        sessionId,
        status: 'ACTIVE'
      }
    });

    if (reservations.length === 0) {
      return true; // No reservations to finalize
    }

    // Update each reservation and bucket
    for (const reservation of reservations) {
      // Mark reservation as finalized
      await tx.quotaReservation.update({
        where: { id: reservation.id },
        data: { status: 'FINALIZED' }
      });

      // Update bucket: decrement reserved, increment filled
      await tx.quotaBucket.update({
        where: { id: reservation.bucketId },
        data: {
          reservedN: { decrement: 1 },
          filledN: { increment: 1 }
        }
      });
    }

    return true;
  });
}

/**
 * Release a quota reservation (session terminated/abandoned)
 */
export async function releaseQuota(
  prisma: PrismaClient,
  sessionId: string
): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    // Get active reservations for this session
    const reservations = await tx.quotaReservation.findMany({
      where: {
        sessionId,
        status: 'ACTIVE'
      }
    });

    if (reservations.length === 0) {
      return true; // No reservations to release
    }

    // Update each reservation and bucket
    for (const reservation of reservations) {
      // Mark reservation as released
      await tx.quotaReservation.update({
        where: { id: reservation.id },
        data: { status: 'RELEASED' }
      });

      // Update bucket: decrement reserved count
      await tx.quotaBucket.update({
        where: { id: reservation.bucketId },
        data: {
          reservedN: { decrement: 1 }
        }
      });
    }

    return true;
  });
}

/**
 * Check if a quota bucket matches the current answers
 */
async function isBucketMatch(
  bucket: any,
  answers: Map<string, any>,
  loopContext?: Map<string, any>
): Promise<boolean> {
  // If bucket has a condition expression, evaluate it
  if (bucket.condition) {
    return await evaluateExpression(bucket.condition.dsl, answers, loopContext);
  }

  // If bucket is tied to a specific question/option
  if (bucket.questionId && bucket.optionValue) {
    const answer = answers.get(bucket.questionId);
    if (!answer) return false;
    
    if (answer.choices) {
      return answer.choices.includes(bucket.optionValue);
    }
    
    return answer.textValue === bucket.optionValue ||
           answer.numericValue?.toString() === bucket.optionValue ||
           answer.booleanValue?.toString() === bucket.optionValue;
  }

  // If bucket is tied to a question but no specific option
  if (bucket.questionId) {
    const answer = answers.get(bucket.questionId);
    return answer !== undefined && !isEmpty(answer);
  }

  // Default bucket (no conditions) - matches everyone
  return true;
}

/**
 * Check if an answer is empty
 */
function isEmpty(answer: any): boolean {
  if (!answer) return true;
  
  if (answer.choices && answer.choices.length > 0) return false;
  if (answer.textValue && answer.textValue.trim() !== '') return false;
  if (answer.numericValue !== undefined && answer.numericValue !== null) return false;
  if (answer.decimalValue !== undefined && answer.decimalValue !== null) return false;
  if (answer.booleanValue !== undefined) return false;
  if (answer.emailValue && answer.emailValue.trim() !== '') return false;
  if (answer.phoneValue && answer.phoneValue.trim() !== '') return false;
  if (answer.urlValue && answer.urlValue.trim() !== '') return false;
  if (answer.dateValue) return false;
  if (answer.timeValue) return false;
  if (answer.fileUrls && answer.fileUrls.length > 0) return false;
  if (answer.signatureUrl && answer.signatureUrl.trim() !== '') return false;
  if (answer.paymentId && answer.paymentId.trim() !== '') return false;
  if (answer.jsonValue) return false;
  
  return true;
}

/**
 * Clean up expired reservations
 */
export async function cleanupExpiredReservations(
  prisma: PrismaClient
): Promise<number> {
  const now = new Date();
  
  const expiredReservations = await prisma.quotaReservation.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lt: now }
    }
  });

  if (expiredReservations.length === 0) {
    return 0;
  }

  await prisma.$transaction(async (tx) => {
    for (const reservation of expiredReservations) {
      // Mark as released
      await tx.quotaReservation.update({
        where: { id: reservation.id },
        data: { status: 'RELEASED' }
      });

      // Decrement reserved count
      await tx.quotaBucket.update({
        where: { id: reservation.bucketId },
        data: {
          reservedN: { decrement: 1 }
        }
      });
    }
  });

  return expiredReservations.length;
}

/**
 * Get quota status for a survey
 */
export async function getQuotaStatus(
  prisma: PrismaClient,
  surveyId: string,
  tenantId: string
): Promise<any[]> {
  const quotaPlans = await prisma.quotaPlan.findMany({
    where: {
      surveyId,
      tenantId,
      state: 'OPEN'
    },
    include: {
      buckets: {
        include: { condition: true }
      }
    }
  });

  const status = [];
  
  for (const plan of quotaPlans) {
    for (const bucket of plan.buckets) {
      const totalUsed = bucket.filledN + bucket.reservedN;
      const maxCapacity = bucket.targetN + bucket.maxOverfill;
      const percentage = maxCapacity > 0 ? (totalUsed / maxCapacity) * 100 : 0;
      
      status.push({
        planId: plan.id,
        planName: plan.name,
        bucketId: bucket.id,
        bucketLabel: bucket.label,
        targetN: bucket.targetN,
        filledN: bucket.filledN,
        reservedN: bucket.reservedN,
        maxOverfill: bucket.maxOverfill,
        totalUsed,
        maxCapacity,
        percentage: Math.round(percentage * 100) / 100,
        isFull: totalUsed >= maxCapacity,
        isNearFull: percentage >= 90
      });
    }
  }

  return status;
}

/**
 * Check if survey should be closed due to quota
 */
export async function shouldCloseSurvey(
  prisma: PrismaClient,
  surveyId: string,
  tenantId: string
): Promise<{ shouldClose: boolean; reason?: string }> {
  const surveyTarget = await prisma.surveyTarget.findUnique({
    where: { surveyId }
  });

  if (!surveyTarget) {
    return { shouldClose: false };
  }

  // Check hard close condition
  if (surveyTarget.hardClose) {
    const totalCompleted = await prisma.surveySession.count({
      where: {
        surveyId,
        tenantId,
        status: 'COMPLETED'
      }
    });

    if (totalCompleted >= surveyTarget.totalN) {
      return {
        shouldClose: true,
        reason: `Survey has reached its target of ${surveyTarget.totalN} responses`
      };
    }
  }

  // Check quota-based closure
  const quotaStatus = await getQuotaStatus(prisma, surveyId, tenantId);
  const allBucketsFull = quotaStatus.every(bucket => bucket.isFull);
  
  if (allBucketsFull && quotaStatus.length > 0) {
    return {
      shouldClose: true,
      reason: 'All quota buckets are full'
    };
  }

  return { shouldClose: false };
}
