import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const prisma = new PrismaClient();

// Validation schemas
const createQuestionGroupSchema = z.object({
  pageId: z.string().uuid('Invalid page ID'),
  key: z.string().optional(),
  titleTemplate: z.string().optional(),
  descriptionTemplate: z.string().optional(),
  visibleIfExpressionId: z.string().uuid().optional(),
  innerOrderMode: z.enum(['SEQUENTIAL', 'RANDOM', 'GROUP_RANDOM', 'WEIGHTED']).default('SEQUENTIAL')
});

const updateQuestionGroupSchema = z.object({
  key: z.string().optional(),
  titleTemplate: z.string().optional(),
  descriptionTemplate: z.string().optional(),
  visibleIfExpressionId: z.string().uuid().optional(),
  innerOrderMode: z.enum(['SEQUENTIAL', 'RANDOM', 'GROUP_RANDOM', 'WEIGHTED']).optional()
});

const addQuestionToGroupSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  groupIndex: z.number().int().min(0).optional() // position within group
});

const reorderGroupQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1, 'At least one question ID is required')
});

const updatePageGroupOrderSchema = z.object({
  groupOrderMode: z.enum(['SEQUENTIAL', 'RANDOM', 'GROUP_RANDOM', 'WEIGHTED']).default('SEQUENTIAL')
});

/**
 * Create a new question group
 * POST /api/surveys/:surveyId/pages/:pageId/groups
 */
export const createQuestionGroup = async (req: Request, res: Response) => {
  try {
    const { surveyId, pageId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const body = createQuestionGroupSchema.parse(req.body);

    // Verify page exists and user has access
    if (!surveyId || !pageId) {
      return res.status(400).json({ error: 'Survey ID and Page ID are required' });
    }

    const page = await prisma.surveyPage.findFirst({
      where: {
        id: pageId,
        surveyId,
        tenantId
      }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found or not accessible' });
    }

    // Get the next index for the group
    const lastGroup = await prisma.pageQuestionGroup.findFirst({
      where: { pageId },
      orderBy: { index: 'desc' }
    });

    const nextIndex = (lastGroup?.index || 0) + 1;

    const group = await prisma.pageQuestionGroup.create({
      data: {
        pageId: pageId as string,
        tenantId,
        surveyId: surveyId as string,
        index: nextIndex,
        key: body.key,
        titleTemplate: body.titleTemplate,
        descriptionTemplate: body.descriptionTemplate,
        visibleIfExpressionId: body.visibleIfExpressionId,
        innerOrderMode: body.innerOrderMode
      }
    });

    res.status(201).json({
      message: 'Question group created successfully',
      group
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error creating question group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all question groups for a page
 * GET /api/surveys/:surveyId/pages/:pageId/groups
 */
export const getQuestionGroups = async (req: Request, res: Response) => {
  try {
    const { surveyId, pageId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const groups = await prisma.pageQuestionGroup.findMany({
      where: {
        pageId,
        surveyId,
        tenantId
      },
      include: {
        questions: {
          orderBy: { groupIndex: 'asc' },
          include: {
            options: true,
            items: true,
            scales: true
          }
        },
        visibleIf: {
          select: {
            id: true,
            dsl: true,
            description: true
          }
        }
      },
      orderBy: { index: 'asc' }
    });

    res.json({ groups });

  } catch (error) {
    console.error('Error fetching question groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a specific question group
 * GET /api/surveys/:surveyId/pages/:pageId/groups/:groupId
 */
export const getQuestionGroup = async (req: Request, res: Response) => {
  try {
    const { surveyId, pageId, groupId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const group = await prisma.pageQuestionGroup.findFirst({
      where: {
        id: groupId,
        pageId,
        surveyId,
        tenantId
      },
      include: {
        questions: {
          orderBy: { groupIndex: 'asc' },
          include: {
            options: true,
            items: true,
            scales: true
          }
        },
        visibleIf: {
          select: {
            id: true,
            dsl: true,
            description: true
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Question group not found' });
    }

    res.json({ group });

  } catch (error) {
    console.error('Error fetching question group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update a question group
 * PUT /api/surveys/:surveyId/pages/:pageId/groups/:groupId
 */
export const updateQuestionGroup = async (req: Request, res: Response) => {
  try {
    const { surveyId, pageId, groupId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const body = updateQuestionGroupSchema.parse(req.body);

    const group = await prisma.pageQuestionGroup.findFirst({
      where: {
        id: groupId,
        pageId,
        surveyId,
        tenantId
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Question group not found' });
    }

    const updatedGroup = await prisma.pageQuestionGroup.update({
      where: { id: groupId },
      data: body
    });

    res.json({
      message: 'Question group updated successfully',
      group: updatedGroup
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error updating question group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a question group
 * DELETE /api/surveys/:surveyId/pages/:pageId/groups/:groupId
 */
export const deleteQuestionGroup = async (req: Request, res: Response) => {
  try {
    const { surveyId, pageId, groupId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const group = await prisma.pageQuestionGroup.findFirst({
      where: {
        id: groupId,
        pageId,
        surveyId,
        tenantId
      },
      include: {
        questions: true
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Question group not found' });
    }

    if (group.questions.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete group with questions. Move questions out first.' 
      });
    }

    await prisma.pageQuestionGroup.delete({
      where: { id: groupId }
    });

    res.json({ message: 'Question group deleted successfully' });

  } catch (error) {
    console.error('Error deleting question group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Add a question to a group
 * POST /api/surveys/:surveyId/pages/:pageId/groups/:groupId/questions
 */
export const addQuestionToGroup = async (req: Request, res: Response) => {
  try {
    const { surveyId, pageId, groupId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const body = addQuestionToGroupSchema.parse(req.body);

    // Verify group exists
    const group = await prisma.pageQuestionGroup.findFirst({
      where: {
        id: groupId,
        pageId,
        surveyId,
        tenantId
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Question group not found' });
    }

    // Verify question exists and is on the same page
    const question = await prisma.question.findFirst({
      where: {
        id: body.questionId,
        pageId,
        surveyId,
        tenantId
      }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Get the next group index if not specified
    let groupIndex = body.groupIndex;
    if (groupIndex === undefined) {
      const lastQuestion = await prisma.question.findFirst({
        where: { groupId },
        orderBy: { groupIndex: 'desc' }
      });
      groupIndex = (lastQuestion?.groupIndex || -1) + 1;
    }

    // Update the question to be in this group
    const updatedQuestion = await prisma.question.update({
      where: { id: body.questionId },
      data: {
        groupId,
        groupIndex
      }
    });

    res.json({
      message: 'Question added to group successfully',
      question: updatedQuestion
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error adding question to group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Remove a question from a group
 * DELETE /api/surveys/:surveyId/pages/:pageId/groups/:groupId/questions/:questionId
 */
export const removeQuestionFromGroup = async (req: Request, res: Response) => {
  try {
    const { surveyId, pageId, groupId, questionId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    // Verify question exists and is in this group
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        groupId,
        pageId,
        surveyId,
        tenantId
      }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found in this group' });
    }

    // Remove question from group
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        groupId: null,
        groupIndex: null
      }
    });

    res.json({
      message: 'Question removed from group successfully',
      question: updatedQuestion
    });

  } catch (error) {
    console.error('Error removing question from group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Reorder questions within a group
 * PUT /api/surveys/:surveyId/pages/:pageId/groups/:groupId/questions/reorder
 */
export const reorderGroupQuestions = async (req: Request, res: Response) => {
  try {
    const { surveyId, pageId, groupId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const body = reorderGroupQuestionsSchema.parse(req.body);

    // Verify group exists
    const group = await prisma.pageQuestionGroup.findFirst({
      where: {
        id: groupId,
        pageId,
        surveyId,
        tenantId
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Question group not found' });
    }

    // Update question order within the group
    await Promise.all(
      body.questionIds.map((questionId, index) =>
        prisma.question.updateMany({
          where: {
            id: questionId,
            groupId,
            pageId,
            surveyId,
            tenantId
          },
          data: { groupIndex: index }
        })
      )
    );

    res.json({ message: 'Questions reordered successfully' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error reordering group questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update page group order mode (shuffling)
 * PUT /api/surveys/:surveyId/pages/:pageId/group-order
 */
export const updatePageGroupOrder = async (req: Request, res: Response) => {
  try {
    const { surveyId, pageId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const body = updatePageGroupOrderSchema.parse(req.body);

    // Verify page exists
    const page = await prisma.surveyPage.findFirst({
      where: {
        id: pageId,
        surveyId,
        tenantId
      }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const updatedPage = await prisma.surveyPage.update({
      where: { id: pageId },
      data: {
        groupOrderMode: body.groupOrderMode
      }
    });

    res.json({
      message: 'Page group order mode updated successfully',
      page: updatedPage
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    
    console.error('Error updating page group order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get page group shuffling configuration
 * GET /api/surveys/:surveyId/pages/:pageId/group-order
 */
export const getPageGroupOrder = async (req: Request, res: Response) => {
  try {
    const { surveyId, pageId } = req.params;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const page = await prisma.surveyPage.findFirst({
      where: {
        id: pageId,
        surveyId,
        tenantId
      },
      select: {
        id: true,
        index: true,
        titleTemplate: true,
        groupOrderMode: true,
        questionOrderMode: true,
        questionGroups: {
          select: {
            id: true,
            index: true,
            key: true,
            titleTemplate: true,
            innerOrderMode: true,
            _count: {
              select: { questions: true }
            }
          },
          orderBy: { index: 'asc' }
        }
      }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({ page });

  } catch (error) {
    console.error('Error fetching page group order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
