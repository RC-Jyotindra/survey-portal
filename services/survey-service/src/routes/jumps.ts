import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { JumpLogicEvaluator } from '../jump-logic';
import { validateRequest } from '../lib/validation';
import {
  createQuestionJumpSchema,
  updateQuestionJumpSchema,
  createPageJumpSchema,
  updatePageJumpSchema,
  evaluateJumpLogicSchema,
  testJumpLogicSchema
} from '../lib/jump-validation';

const router = Router();
const prisma = new PrismaClient();
const jumpEvaluator = new JumpLogicEvaluator(prisma);

// ========================================================
// ================= Question Jump Routes ===============
// ========================================================

/**
 * @route GET /api/surveys/:surveyId/question-jumps
 * @desc Get all question jumps for a survey
 */
router.get('/surveys/:surveyId/question-jumps', requireAuth, async (req: any, res: any) => {
  try {
    const { surveyId } = req.params;
    
    const questionJumps = await prisma.questionJump.findMany({
      where: {
        surveyId,
        tenantId: req.user?.tenantId || (req as any).tenantId
      },
      include: {
        fromQuestion: {
          select: { id: true, variableName: true, titleTemplate: true }
        },
        toQuestion: {
          select: { id: true, variableName: true, titleTemplate: true }
        },
        toPage: {
          select: { id: true, titleTemplate: true, index: true }
        },
        condition: {
          select: { id: true, dsl: true, description: true }
        }
      },
      orderBy: [
        { fromQuestionId: 'asc' },
        { priority: 'asc' }
      ]
    });

    res.json({ questionJumps });
  } catch (error) {
    console.error('Error fetching question jumps:', error);
    res.status(500).json({ error: 'Failed to fetch question jumps' });
  }
});

/**
 * @route POST /api/surveys/:surveyId/question-jumps
 * @desc Create a new question jump
 */
router.post('/surveys/:surveyId/question-jumps', requireAuth, async (req: any, res: any) => {
  try {
    const { surveyId } = req.params;
    const validation = validateRequest(createQuestionJumpSchema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data;
    
    // Verify the question belongs to this survey and tenant
    const fromQuestion = await prisma.question.findFirst({
      where: {
        id: data.fromQuestionId,
        surveyId,
        tenantId: req.user?.tenantId || (req as any).tenantId
      }
    });

    if (!fromQuestion) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Verify destination exists and belongs to this survey
    if (data.toQuestionId) {
      const toQuestion = await prisma.question.findFirst({
        where: {
          id: data.toQuestionId,
          surveyId,
          tenantId: req.user?.tenantId || (req as any).tenantId
        }
      });
      if (!toQuestion) {
        return res.status(404).json({ error: 'Destination question not found' });
      }
    }

    if (data.toPageId) {
      const toPage = await prisma.surveyPage.findFirst({
        where: {
          id: data.toPageId,
          surveyId,
          tenantId: req.user?.tenantId || (req as any).tenantId
        }
      });
      if (!toPage) {
        return res.status(404).json({ error: 'Destination page not found' });
      }
    }

    // Verify expression exists if provided
    if (data.conditionExpressionId) {
      const expression = await prisma.expression.findFirst({
        where: {
          id: data.conditionExpressionId,
          surveyId,
          tenantId: req.user?.tenantId || (req as any).tenantId
        }
      });
      if (!expression) {
        return res.status(404).json({ error: 'Condition expression not found' });
      }
    }

    const questionJump = await prisma.questionJump.create({
      data: {
        ...data,
        surveyId,
        tenantId: req.user?.tenantId || (req as any).tenantId
      },
      include: {
        fromQuestion: {
          select: { id: true, variableName: true, titleTemplate: true }
        },
        toQuestion: {
          select: { id: true, variableName: true, titleTemplate: true }
        },
        toPage: {
          select: { id: true, titleTemplate: true, index: true }
        },
        condition: {
          select: { id: true, dsl: true, description: true }
        }
      }
    });

    res.status(201).json({ questionJump });
  } catch (error) {
    console.error('Error creating question jump:', error);
    res.status(500).json({ error: 'Failed to create question jump' });
  }
});

/**
 * @route GET /api/surveys/:surveyId/question-jumps/:jumpId
 * @desc Get a specific question jump
 */
router.get('/surveys/:surveyId/question-jumps/:jumpId', requireAuth, async (req: any, res: any) => {
  try {
    const { surveyId, jumpId } = req.params;
    
    const questionJump = await prisma.questionJump.findFirst({
      where: {
        id: jumpId,
        surveyId,
        tenantId: req.user?.tenantId || (req as any).tenantId
      },
      include: {
        fromQuestion: {
          select: { id: true, variableName: true, titleTemplate: true }
        },
        toQuestion: {
          select: { id: true, variableName: true, titleTemplate: true }
        },
        toPage: {
          select: { id: true, titleTemplate: true, index: true }
        },
        condition: {
          select: { id: true, dsl: true, description: true }
        }
      }
    });

    if (!questionJump) {
      return res.status(404).json({ error: 'Question jump not found' });
    }

    res.json({ questionJump });
  } catch (error) {
    console.error('Error fetching question jump:', error);
    res.status(500).json({ error: 'Failed to fetch question jump' });
  }
});

/**
 * @route PUT /api/surveys/:surveyId/question-jumps/:jumpId
 * @desc Update a question jump
 */
router.put('/surveys/:surveyId/question-jumps/:jumpId', requireAuth, async (req: any, res: any) => {
  try {
    const { surveyId, jumpId } = req.params;
    const validation = validateRequest(updateQuestionJumpSchema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data;

    // Verify the jump exists and belongs to this survey and tenant
    const existingJump = await prisma.questionJump.findFirst({
      where: {
        id: jumpId,
        surveyId,
        tenantId: req.user?.tenantId || (req as any).tenantId
      }
    });

    if (!existingJump) {
      return res.status(404).json({ error: 'Question jump not found' });
    }

    // Verify destination exists if provided
    if (data.toQuestionId) {
      const toQuestion = await prisma.question.findFirst({
        where: {
          id: data.toQuestionId,
          surveyId,
          tenantId: req.user?.tenantId || (req as any).tenantId
        }
      });
      if (!toQuestion) {
        return res.status(404).json({ error: 'Destination question not found' });
      }
    }

    if (data.toPageId) {
      const toPage = await prisma.surveyPage.findFirst({
        where: {
          id: data.toPageId,
          surveyId,
          tenantId: req.user?.tenantId || (req as any).tenantId
        }
      });
      if (!toPage) {
        return res.status(404).json({ error: 'Destination page not found' });
      }
    }

    // Verify expression exists if provided
    if (data.conditionExpressionId) {
      const expression = await prisma.expression.findFirst({
        where: {
          id: data.conditionExpressionId,
          surveyId,
          tenantId: req.user?.tenantId || (req as any).tenantId
        }
      });
      if (!expression) {
        return res.status(404).json({ error: 'Condition expression not found' });
      }
    }

    const questionJump = await prisma.questionJump.update({
      where: { id: jumpId },
      data,
      include: {
        fromQuestion: {
          select: { id: true, variableName: true, titleTemplate: true }
        },
        toQuestion: {
          select: { id: true, variableName: true, titleTemplate: true }
        },
        toPage: {
          select: { id: true, titleTemplate: true, index: true }
        },
        condition: {
          select: { id: true, dsl: true, description: true }
        }
      }
    });

    res.json({ questionJump });
  } catch (error) {
    console.error('Error updating question jump:', error);
    res.status(500).json({ error: 'Failed to update question jump' });
  }
});

/**
 * @route DELETE /api/surveys/:surveyId/question-jumps/:jumpId
 * @desc Delete a question jump
 */
router.delete('/surveys/:surveyId/question-jumps/:jumpId', requireAuth, async (req: any, res: any) => {
  try {
    const { surveyId, jumpId } = req.params;

    // Verify the jump exists and belongs to this survey and tenant
    const existingJump = await prisma.questionJump.findFirst({
      where: {
        id: jumpId,
        surveyId,
        tenantId: req.user?.tenantId || (req as any).tenantId
      }
    });

    if (!existingJump) {
      return res.status(404).json({ error: 'Question jump not found' });
    }

    await prisma.questionJump.delete({
      where: { id: jumpId }
    });

    res.json({ message: 'Question jump deleted successfully' });
  } catch (error) {
    console.error('Error deleting question jump:', error);
    res.status(500).json({ error: 'Failed to delete question jump' });
  }
});

// ========================================================
// ================= Page Jump Routes ===================
// ========================================================

/**
 * @route GET /api/surveys/:surveyId/page-jumps
 * @desc Get all page jumps for a survey
 */
router.get('/surveys/:surveyId/page-jumps', requireAuth, async (req: any, res: any) => {
  try {
    const { surveyId } = req.params;
    
    const pageJumps = await prisma.pageJump.findMany({
      where: {
        surveyId,
        tenantId: req.user?.tenantId || (req as any).tenantId
      },
      include: {
        fromPage: {
          select: { id: true, titleTemplate: true, index: true }
        },
        toPage: {
          select: { id: true, titleTemplate: true, index: true }
        },
        condition: {
          select: { id: true, dsl: true, description: true }
        }
      },
      orderBy: [
        { fromPageId: 'asc' },
        { priority: 'asc' }
      ]
    });

    res.json({ pageJumps });
  } catch (error) {
    console.error('Error fetching page jumps:', error);
    res.status(500).json({ error: 'Failed to fetch page jumps' });
  }
});

/**
 * @route POST /api/surveys/:surveyId/page-jumps
 * @desc Create a new page jump
 */
router.post('/surveys/:surveyId/page-jumps', requireAuth, async (req: any, res: any) => {
  try {
    const { surveyId } = req.params;
    const validation = validateRequest(createPageJumpSchema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data;
    
    // Verify the pages belong to this survey and tenant
    const [fromPage, toPage] = await Promise.all([
      prisma.surveyPage.findFirst({
        where: {
          id: data.fromPageId,
          surveyId,
          tenantId: req.user?.tenantId || (req as any).tenantId
        }
      }),
      prisma.surveyPage.findFirst({
        where: {
          id: data.toPageId,
          surveyId,
          tenantId: req.user?.tenantId || (req as any).tenantId
        }
      })
    ]);

    if (!fromPage) {
      return res.status(404).json({ error: 'Source page not found' });
    }

    if (!toPage) {
      return res.status(404).json({ error: 'Destination page not found' });
    }

    // Verify expression exists if provided
    if (data.conditionExpressionId) {
      const expression = await prisma.expression.findFirst({
        where: {
          id: data.conditionExpressionId,
          surveyId,
          tenantId: req.user?.tenantId || (req as any).tenantId
        }
      });
      if (!expression) {
        return res.status(404).json({ error: 'Condition expression not found' });
      }
    }

    const pageJump = await prisma.pageJump.create({
      data: {
        ...data,
        surveyId,
        tenantId: req.user?.tenantId || (req as any).tenantId
      },
      include: {
        fromPage: {
          select: { id: true, titleTemplate: true, index: true }
        },
        toPage: {
          select: { id: true, titleTemplate: true, index: true }
        },
        condition: {
          select: { id: true, dsl: true, description: true }
        }
      }
    });

    res.status(201).json({ pageJump });
  } catch (error) {
    console.error('Error creating page jump:', error);
    res.status(500).json({ error: 'Failed to create page jump' });
  }
});

/**
 * @route GET /api/surveys/:surveyId/page-jumps/:jumpId
 * @desc Get a specific page jump
 */
router.get('/surveys/:surveyId/page-jumps/:jumpId', requireAuth, async (req: any, res: any) => {
  try {
    const { surveyId, jumpId } = req.params;
    
    const pageJump = await prisma.pageJump.findFirst({
      where: {
        id: jumpId,
        surveyId,
        tenantId: req.user?.tenantId || (req as any).tenantId
      },
      include: {
        fromPage: {
          select: { id: true, titleTemplate: true, index: true }
        },
        toPage: {
          select: { id: true, titleTemplate: true, index: true }
        },
        condition: {
          select: { id: true, dsl: true, description: true }
        }
      }
    });

    if (!pageJump) {
      return res.status(404).json({ error: 'Page jump not found' });
    }

    res.json({ pageJump });
  } catch (error) {
    console.error('Error fetching page jump:', error);
    res.status(500).json({ error: 'Failed to fetch page jump' });
  }
});

/**
 * @route PUT /api/surveys/:surveyId/page-jumps/:jumpId
 * @desc Update a page jump
 */
router.put('/surveys/:surveyId/page-jumps/:jumpId', requireAuth, async (req: any, res: any) => {
  try {
    const { surveyId, jumpId } = req.params;
    const validation = validateRequest(updatePageJumpSchema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data;

    // Verify the jump exists and belongs to this survey and tenant
    const existingJump = await prisma.pageJump.findFirst({
      where: {
        id: jumpId,
        surveyId,
        tenantId: req.user?.tenantId || (req as any).tenantId
      }
    });

    if (!existingJump) {
      return res.status(404).json({ error: 'Page jump not found' });
    }

    // Verify destination page exists if provided
    if (data.toPageId) {
      const toPage = await prisma.surveyPage.findFirst({
        where: {
          id: data.toPageId,
          surveyId,
          tenantId: req.user?.tenantId || (req as any).tenantId
        }
      });
      if (!toPage) {
        return res.status(404).json({ error: 'Destination page not found' });
      }
    }

    // Verify expression exists if provided
    if (data.conditionExpressionId) {
      const expression = await prisma.expression.findFirst({
        where: {
          id: data.conditionExpressionId,
          surveyId,
          tenantId: req.user?.tenantId || (req as any).tenantId
        }
      });
      if (!expression) {
        return res.status(404).json({ error: 'Condition expression not found' });
      }
    }

    const pageJump = await prisma.pageJump.update({
      where: { id: jumpId },
      data,
      include: {
        fromPage: {
          select: { id: true, titleTemplate: true, index: true }
        },
        toPage: {
          select: { id: true, titleTemplate: true, index: true }
        },
        condition: {
          select: { id: true, dsl: true, description: true }
        }
      }
    });

    res.json({ pageJump });
  } catch (error) {
    console.error('Error updating page jump:', error);
    res.status(500).json({ error: 'Failed to update page jump' });
  }
});

/**
 * @route DELETE /api/surveys/:surveyId/page-jumps/:jumpId
 * @desc Delete a page jump
 */
router.delete('/surveys/:surveyId/page-jumps/:jumpId', requireAuth, async (req: any, res: any) => {
  try {
    const { surveyId, jumpId } = req.params;

    // Verify the jump exists and belongs to this survey and tenant
    const existingJump = await prisma.pageJump.findFirst({
      where: {
        id: jumpId,
        surveyId,
        tenantId: req.user?.tenantId || (req as any).tenantId
      }
    });

    if (!existingJump) {
      return res.status(404).json({ error: 'Page jump not found' });
    }

    await prisma.pageJump.delete({
      where: { id: jumpId }
    });

    res.json({ message: 'Page jump deleted successfully' });
  } catch (error) {
    console.error('Error deleting page jump:', error);
    res.status(500).json({ error: 'Failed to delete page jump' });
  }
});

// ========================================================
// ================= Jump Logic Evaluation ==============
// ========================================================

/**
 * @route POST /api/surveys/:surveyId/jump-logic/evaluate
 * @desc Evaluate jump logic for given answers and current position
 */
router.post('/surveys/:surveyId/jump-logic/evaluate', requireAuth, async (req: any, res: any) => {
  try {
    const { surveyId } = req.params;
    const validation = validateRequest(evaluateJumpLogicSchema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { answers, currentQuestionId, currentPageId } = validation.data;

    const context = {
      surveyId,
      answers,
      currentQuestionId,
      currentPageId
    };

    const jumpResult = await jumpEvaluator.getNextDestination(context);

    res.json({ 
      jumpResult: jumpResult || { shouldJump: false }
    });
  } catch (error) {
    console.error('Error evaluating jump logic:', error);
    res.status(500).json({ error: 'Failed to evaluate jump logic' });
  }
});

/**
 * @route POST /api/surveys/:surveyId/jump-logic/test
 * @desc Test a specific jump condition
 */
router.post('/surveys/:surveyId/jump-logic/test', requireAuth, async (req: any, res: any) => {
  try {
    const validation = validateRequest(testJumpLogicSchema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { jumpId, jumpType, testAnswers } = validation.data;

    const testResult = await jumpEvaluator.testJumpCondition(jumpId, jumpType, testAnswers);

    res.json({ testResult });
  } catch (error) {
    console.error('Error testing jump logic:', error);
    res.status(500).json({ error: 'Failed to test jump logic' });
  }
});

/**
 * @route GET /api/surveys/:surveyId/jump-logic/summary
 * @desc Get all jump logic for a survey
 */
router.get('/surveys/:surveyId/jump-logic/summary', requireAuth, async (req: any, res: any) => {
  try {
    const { surveyId } = req.params;

    const jumpSummary = await jumpEvaluator.getSurveyJumps(surveyId);

    res.json({ ...jumpSummary });
  } catch (error) {
    console.error('Error fetching jump logic summary:', error);
    res.status(500).json({ error: 'Failed to fetch jump logic summary' });
  }
});

export default router;
