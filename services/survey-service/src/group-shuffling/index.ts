import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const prisma = new PrismaClient();

// Validation schemas
const shuffleGroupsSchema = z.object({
  sessionId: z.string().uuid().optional(), // For preview mode
  preview: z.boolean().default(false) // If true, return shuffled order without saving
});

const getShuffledPageSchema = z.object({
  sessionId: z.string().uuid().optional(),
  includeUngrouped: z.boolean().default(true)
});

/**
 * Get shuffled question order for a page based on group configuration
 * This is the core logic for GROUP_RANDOM shuffling
 * GET /api/surveys/:surveyId/pages/:pageId/shuffled-questions
 */
export const getShuffledQuestions = async (req: Request, res: Response) => {
  try {
    const { surveyId, pageId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const query = getShuffledPageSchema.parse(req.query);

    // Get page with groups and questions
    const page = await prisma.surveyPage.findFirst({
      where: {
        id: pageId,
        surveyId,
        tenantId
      },
      include: {
        questionGroups: {
          include: {
            questions: {
              orderBy: { groupIndex: 'asc' },
              include: {
                options: true,
                items: true,
                scales: true
              }
            }
          },
          orderBy: { index: 'asc' }
        },
        questions: {
          where: {
            groupId: null // Ungrouped questions
          },
          orderBy: { index: 'asc' },
          include: {
            options: true,
            items: true,
            scales: true
          }
        }
      }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    let shuffledQuestions: any[] = [];

    // Handle different order modes
    switch (page.groupOrderMode) {
      case 'SEQUENTIAL':
        // Groups in order, questions within groups in order
        shuffledQuestions = getSequentialOrder(page, query.includeUngrouped);
        break;

      case 'RANDOM':
        // All questions randomized individually
        shuffledQuestions = getRandomOrder(page, query.includeUngrouped);
        break;

      case 'GROUP_RANDOM':
        // Groups shuffled, questions within groups in order
        shuffledQuestions = getGroupRandomOrder(page, query.includeUngrouped, query.sessionId);
        break;

      case 'WEIGHTED':
        // Groups shuffled based on weights (if implemented)
        shuffledQuestions = getWeightedOrder(page, query.includeUngrouped);
        break;

      default:
        shuffledQuestions = getSequentialOrder(page, query.includeUngrouped);
    }

    res.json({
      pageId,
      groupOrderMode: page.groupOrderMode,
      totalQuestions: shuffledQuestions.length,
      questions: shuffledQuestions
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error getting shuffled questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Generate sequential order (default)
 */
function getSequentialOrder(page: any, includeUngrouped: boolean): any[] {
  const questions: any[] = [];

  // Add grouped questions in order
  page.questionGroups.forEach((group: any) => {
    questions.push(...group.questions);
  });

  // Add ungrouped questions if requested
  if (includeUngrouped) {
    questions.push(...page.questions);
  }

  return questions;
}

/**
 * Generate random order (all questions randomized)
 */
function getRandomOrder(page: any, includeUngrouped: boolean): any[] {
  const questions: any[] = [];

  // Collect all questions
  page.questionGroups.forEach((group: any) => {
    questions.push(...group.questions);
  });

  if (includeUngrouped) {
    questions.push(...page.questions);
  }

  // Shuffle all questions
  return shuffleArray(questions);
}

/**
 * Generate group random order (groups shuffled, questions within groups in order)
 * This is the key feature for intra-page grouping
 */
function getGroupRandomOrder(page: any, includeUngrouped: boolean, sessionId?: string): any[] {
  const questions: any[] = [];

  // Shuffle groups but keep questions within groups in order
  const shuffledGroups = shuffleArray([...page.questionGroups]);

  // Add questions from shuffled groups
  shuffledGroups.forEach((group: any) => {
    questions.push(...group.questions);
  });

  // Add ungrouped questions if requested
  if (includeUngrouped) {
    questions.push(...page.questions);
  }

  return questions;
}

/**
 * Generate weighted order (placeholder for future implementation)
 */
function getWeightedOrder(page: any, includeUngrouped: boolean): any[] {
  // For now, fall back to group random
  return getGroupRandomOrder(page, includeUngrouped);
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * Uses sessionId as seed for consistent shuffling per session
 */
function shuffleArray<T>(array: T[], sessionId?: string): T[] {
  const shuffled = [...array];
  
  if (sessionId) {
    // Use sessionId as seed for consistent shuffling
    const seed = hashString(sessionId);
    const random = seededRandom(seed);
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
  } else {
    // Pure random shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
  }
  
  return shuffled;
}

/**
 * Simple hash function for sessionId
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Seeded random number generator
 */
function seededRandom(seed: number): () => number {
  let currentSeed = seed;
  return function() {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
}

/**
 * Preview shuffled order without saving
 * POST /api/surveys/:surveyId/pages/:pageId/preview-shuffle
 */
export const previewShuffledOrder = async (req: Request, res: Response) => {
  try {
    const { surveyId, pageId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const body = shuffleGroupsSchema.parse(req.body);

    // Get page with groups and questions
    const page = await prisma.surveyPage.findFirst({
      where: {
        id: pageId,
        surveyId,
        tenantId
      },
      include: {
        questionGroups: {
          include: {
            questions: {
              orderBy: { groupIndex: 'asc' },
              select: {
                id: true,
                index: true,
                variableName: true,
                titleTemplate: true,
                type: true,
                groupIndex: true
              }
            }
          },
          orderBy: { index: 'asc' }
        },
        questions: {
          where: {
            groupId: null
          },
          orderBy: { index: 'asc' },
          select: {
            id: true,
            index: true,
            variableName: true,
            titleTemplate: true,
            type: true
          }
        }
      }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Generate preview based on current group order mode
    let previewQuestions: any[] = [];

    switch (page.groupOrderMode) {
      case 'SEQUENTIAL':
        previewQuestions = getSequentialOrder(page, true);
        break;
      case 'RANDOM':
        previewQuestions = getRandomOrder(page, true);
        break;
      case 'GROUP_RANDOM':
        previewQuestions = getGroupRandomOrder(page, true, body.sessionId);
        break;
      default:
        previewQuestions = getSequentialOrder(page, true);
    }

    res.json({
      pageId,
      groupOrderMode: page.groupOrderMode,
      preview: true,
      groups: page.questionGroups.map((group: any) => ({
        id: group.id,
        index: group.index,
        titleTemplate: group.titleTemplate,
        questionCount: group.questions.length,
        questions: group.questions.map((q: any) => ({
          id: q.id,
          variableName: q.variableName,
          titleTemplate: q.titleTemplate
        }))
      })),
      shuffledOrder: previewQuestions.map((q: any, index: number) => ({
        position: index + 1,
        id: q.id,
        variableName: q.variableName,
        titleTemplate: q.titleTemplate,
        type: q.type,
        groupId: q.groupId || null
      }))
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error previewing shuffled order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get group statistics for a page
 * GET /api/surveys/:surveyId/pages/:pageId/group-stats
 */
export const getGroupStats = async (req: Request, res: Response) => {
  try {
    const { surveyId, pageId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const page = await prisma.surveyPage.findFirst({
      where: {
        id: pageId,
        surveyId,
        tenantId
      },
      include: {
        questionGroups: {
          include: {
            _count: {
              select: { questions: true }
            }
          },
          orderBy: { index: 'asc' }
        },
        _count: {
          select: { 
            questions: true,
            questionGroups: true
          }
        }
      }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const ungroupedQuestions = await prisma.question.count({
      where: {
        pageId,
        groupId: null,
        surveyId,
        tenantId
      }
    });

    const stats = {
      pageId,
      totalQuestions: page._count.questions,
      totalGroups: page._count.questionGroups,
      ungroupedQuestions,
      groupOrderMode: page.groupOrderMode,
      groups: page.questionGroups.map((group: any) => ({
        id: group.id,
        index: group.index,
        titleTemplate: group.titleTemplate,
        questionCount: group._count.questions,
        innerOrderMode: group.innerOrderMode
      }))
    };

    res.json({ stats });

  } catch (error) {
    console.error('Error getting group stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
