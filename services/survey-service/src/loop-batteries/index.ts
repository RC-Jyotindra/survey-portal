import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@repo/database';
import { LoopSourceType } from '@prisma/client';

// Validation schemas
const createLoopBatterySchema = z.object({
  name: z.string().min(1, 'Loop battery name is required'),
  startPageId: z.string().uuid('Invalid start page ID'),
  endPageId: z.string().uuid('Invalid end page ID'),
  sourceType: z.nativeEnum(LoopSourceType),
  sourceQuestionId: z.string().uuid('Invalid source question ID').optional(),
  maxItems: z.number().int().positive().optional(),
  randomize: z.boolean().default(true),
  sampleWithoutReplacement: z.boolean().default(true)
});

const updateLoopBatterySchema = z.object({
  name: z.string().min(1).optional(),
  startPageId: z.string().uuid('Invalid start page ID').optional(),
  endPageId: z.string().uuid('Invalid end page ID').optional(),
  sourceType: z.nativeEnum(LoopSourceType).optional(),
  sourceQuestionId: z.string().uuid('Invalid source question ID').optional(),
  maxItems: z.number().int().positive().optional(),
  randomize: z.boolean().optional(),
  sampleWithoutReplacement: z.boolean().optional()
});

const createDatasetItemSchema = z.object({
  key: z.string().min(1, 'Item key is required'),
  attributes: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().default(true),
  sortIndex: z.number().int().optional()
});

const updateDatasetItemSchema = z.object({
  key: z.string().min(1).optional(),
  attributes: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
  sortIndex: z.number().int().optional()
});

/**
 * Create a new loop battery
 */
export const createLoopBattery = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { surveyId } = req.params;
    const validatedData = createLoopBatterySchema.parse(req.body);

    // Verify survey exists and belongs to tenant
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, tenantId }
    });

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    // Validate that start and end pages exist and belong to the survey
    const [startPage, endPage] = await Promise.all([
      prisma.surveyPage.findFirst({
        where: { id: validatedData.startPageId, surveyId, tenantId }
      }),
      prisma.surveyPage.findFirst({
        where: { id: validatedData.endPageId, surveyId, tenantId }
      })
    ]);

    if (!startPage || !endPage) {
      return res.status(400).json({ 
        error: 'Start page or end page not found or does not belong to this survey' 
      });
    }

    // Validate that start page comes before end page
    if (startPage.index >= endPage.index) {
      return res.status(400).json({ 
        error: 'Start page must come before end page' 
      });
    }

    // For ANSWER source type, validate source question exists
    if (validatedData.sourceType === LoopSourceType.ANSWER) {
      if (!validatedData.sourceQuestionId) {
        return res.status(400).json({ 
          error: 'Source question ID is required for ANSWER source type' 
        });
      }

      const sourceQuestion = await prisma.question.findFirst({
        where: { 
          id: validatedData.sourceQuestionId, 
          surveyId, 
          tenantId,
          type: { in: ['MULTIPLE_CHOICE', 'SINGLE_CHOICE'] } // Only multi-select questions
        }
      });

      if (!sourceQuestion) {
        return res.status(400).json({ 
          error: 'Source question not found or is not a multi-select question' 
        });
      }

      // Validate that source question comes before start page
      if (sourceQuestion.pageId === startPage.id || sourceQuestion.pageId === endPage.id) {
        return res.status(400).json({ 
          error: 'Source question must come before the loop battery pages' 
        });
      }
    }

    // Check for overlapping loop batteries
    const overlappingBattery = await prisma.loopBattery.findFirst({
      where: {
        surveyId,
        tenantId,
        OR: [
          {
            AND: [
              { startPageId: { lte: validatedData.startPageId } },
              { endPageId: { gte: validatedData.startPageId } }
            ]
          },
          {
            AND: [
              { startPageId: { lte: validatedData.endPageId } },
              { endPageId: { gte: validatedData.endPageId } }
            ]
          },
          {
            AND: [
              { startPageId: { gte: validatedData.startPageId } },
              { endPageId: { lte: validatedData.endPageId } }
            ]
          }
        ]
      }
    });

    if (overlappingBattery) {
      return res.status(400).json({ 
        error: 'Loop battery pages overlap with existing loop battery' 
      });
    }

    const loopBattery = await prisma.loopBattery.create({
      data: {
        tenantId,
        surveyId: surveyId!,
        ...validatedData
      },
      include: {
        startPage: true,
        endPage: true,
        sourceQuestion: {
          include: {
            options: true
          }
        },
        datasetItems: {
          orderBy: { sortIndex: 'asc' }
        }
      }
    });

    return res.status(201).json({ loopBattery });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.issues 
      });
    }
    console.error('Error creating loop battery:', error);
    return res.status(500).json({ error: 'Failed to create loop battery' });
  }
};

/**
 * Get all loop batteries for a survey
 */
export const getLoopBatteries = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { surveyId } = req.params;

    // Verify survey exists and belongs to tenant
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, tenantId }
    });

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const loopBatteries = await prisma.loopBattery.findMany({
      where: { surveyId, tenantId },
      include: {
        startPage: {
          select: { id: true, index: true, titleTemplate: true }
        },
        endPage: {
          select: { id: true, index: true, titleTemplate: true }
        },
        sourceQuestion: {
          select: { 
            id: true, 
            variableName: true, 
            titleTemplate: true,
            type: true 
          }
        },
        datasetItems: {
          orderBy: { sortIndex: 'asc' }
        },
        _count: {
          select: { datasetItems: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({ loopBatteries });
  } catch (error) {
    console.error('Error fetching loop batteries:', error);
    return res.status(500).json({ error: 'Failed to fetch loop batteries' });
  }
};

/**
 * Get a specific loop battery
 */
export const getLoopBattery = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { surveyId, batteryId } = req.params;

    const loopBattery = await prisma.loopBattery.findFirst({
      where: { 
        id: batteryId, 
        surveyId, 
        tenantId 
      },
      include: {
        startPage: true,
        endPage: true,
        sourceQuestion: {
          include: {
            options: true
          }
        },
        datasetItems: {
          orderBy: { sortIndex: 'asc' }
        }
      }
    });

    if (!loopBattery) {
      return res.status(404).json({ error: 'Loop battery not found' });
    }

    return res.json({ loopBattery });
  } catch (error) {
    console.error('Error fetching loop battery:', error);
    return res.status(500).json({ error: 'Failed to fetch loop battery' });
  }
};

/**
 * Update a loop battery
 */
export const updateLoopBattery = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { surveyId, batteryId } = req.params;
    const validatedData = updateLoopBatterySchema.parse(req.body);

    // Check if loop battery exists
    const existingBattery = await prisma.loopBattery.findFirst({
      where: { id: batteryId, surveyId, tenantId }
    });

    if (!existingBattery) {
      return res.status(404).json({ error: 'Loop battery not found' });
    }

    // If updating pages, validate they exist and don't create overlaps
    if (validatedData.startPageId || validatedData.endPageId) {
      const startPageId = validatedData.startPageId || existingBattery.startPageId;
      const endPageId = validatedData.endPageId || existingBattery.endPageId;

      const [startPage, endPage] = await Promise.all([
        prisma.surveyPage.findFirst({
          where: { id: startPageId, surveyId, tenantId }
        }),
        prisma.surveyPage.findFirst({
          where: { id: endPageId, surveyId, tenantId }
        })
      ]);

      if (!startPage || !endPage) {
        return res.status(400).json({ 
          error: 'Start page or end page not found' 
        });
      }

      if (startPage.index >= endPage.index) {
        return res.status(400).json({ 
          error: 'Start page must come before end page' 
        });
      }

      // Check for overlapping loop batteries (excluding current one)
      const overlappingBattery = await prisma.loopBattery.findFirst({
        where: {
          id: { not: batteryId },
          surveyId,
          tenantId,
          OR: [
            {
              AND: [
                { startPageId: { lte: startPageId } },
                { endPageId: { gte: startPageId } }
              ]
            },
            {
              AND: [
                { startPageId: { lte: endPageId } },
                { endPageId: { gte: endPageId } }
              ]
            },
            {
              AND: [
                { startPageId: { gte: startPageId } },
                { endPageId: { lte: endPageId } }
              ]
            }
          ]
        }
      });

      if (overlappingBattery) {
        return res.status(400).json({ 
          error: 'Loop battery pages overlap with existing loop battery' 
        });
      }
    }

    // If updating source question, validate it exists and is appropriate
    if (validatedData.sourceQuestionId) {
      const sourceQuestion = await prisma.question.findFirst({
        where: { 
          id: validatedData.sourceQuestionId, 
          surveyId, 
          tenantId,
          type: { in: ['MULTIPLE_CHOICE', 'SINGLE_CHOICE'] }
        }
      });

      if (!sourceQuestion) {
        return res.status(400).json({ 
          error: 'Source question not found or is not a multi-select question' 
        });
      }
    }

    const updatedBattery = await prisma.loopBattery.update({
      where: { id: batteryId },
      data: validatedData,
      include: {
        startPage: true,
        endPage: true,
        sourceQuestion: {
          include: {
            options: true
          }
        },
        datasetItems: {
          orderBy: { sortIndex: 'asc' }
        }
      }
    });

    return res.json({ loopBattery: updatedBattery });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.issues 
      });
    }
    console.error('Error updating loop battery:', error);
    return res.status(500).json({ error: 'Failed to update loop battery' });
  }
};

/**
 * Delete a loop battery
 */
export const deleteLoopBattery = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { surveyId, batteryId } = req.params;

    // Check if loop battery exists
    const existingBattery = await prisma.loopBattery.findFirst({
      where: { id: batteryId, surveyId, tenantId }
    });

    if (!existingBattery) {
      return res.status(404).json({ error: 'Loop battery not found' });
    }

    // Check if survey is published (prevent deletion of published surveys)
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, tenantId }
    });

    if (survey?.status === 'PUBLISHED') {
      return res.status(400).json({ 
        error: 'Cannot delete loop battery from published survey' 
      });
    }

    await prisma.loopBattery.delete({
      where: { id: batteryId }
    });

    return res.json({ message: 'Loop battery deleted successfully' });
  } catch (error) {
    console.error('Error deleting loop battery:', error);
    return res.status(500).json({ error: 'Failed to delete loop battery' });
  }
};

/**
 * Create a dataset item for a loop battery
 */
export const createDatasetItem = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { surveyId, batteryId } = req.params;
    const validatedData = createDatasetItemSchema.parse(req.body);

    // Verify loop battery exists and belongs to survey
    const loopBattery = await prisma.loopBattery.findFirst({
      where: { id: batteryId, surveyId, tenantId }
    });

    if (!loopBattery) {
      return res.status(404).json({ error: 'Loop battery not found' });
    }

    // Check if key already exists for this battery
    const existingItem = await prisma.loopDatasetItem.findFirst({
      where: { batteryId, key: validatedData.key }
    });

    if (existingItem) {
      return res.status(409).json({ 
        error: 'Dataset item with this key already exists' 
      });
    }

    const datasetItem = await prisma.loopDatasetItem.create({
      data: {
        batteryId: batteryId!,
        ...validatedData
      } as any
    });

    return res.status(201).json({ datasetItem });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.issues 
      });
    }
    console.error('Error creating dataset item:', error);
    return res.status(500).json({ error: 'Failed to create dataset item' });
  }
};

/**
 * Update a dataset item
 */
export const updateDatasetItem = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { surveyId, batteryId, itemId } = req.params;
    const validatedData = updateDatasetItemSchema.parse(req.body);

    // Verify dataset item exists and belongs to the battery
    const existingItem = await prisma.loopDatasetItem.findFirst({
      where: { 
        id: itemId, 
        battery: { 
          id: batteryId, 
          surveyId, 
          tenantId 
        } 
      }
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Dataset item not found' });
    }

    // If updating key, check for uniqueness
    if (validatedData.key && validatedData.key !== existingItem.key) {
      const duplicateItem = await prisma.loopDatasetItem.findFirst({
        where: { 
          batteryId, 
          key: validatedData.key,
          id: { not: itemId }
        }
      });

      if (duplicateItem) {
        return res.status(409).json({ 
          error: 'Dataset item with this key already exists' 
        });
      }
    }

    const updatedItem = await prisma.loopDatasetItem.update({
      where: { id: itemId },
      data: validatedData as any
    });

    return res.json({ datasetItem: updatedItem });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.issues 
      });
    }
    console.error('Error updating dataset item:', error);
    return res.status(500).json({ error: 'Failed to update dataset item' });
  }
};

/**
 * Delete a dataset item
 */
export const deleteDatasetItem = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { surveyId, batteryId, itemId } = req.params;

    // Verify dataset item exists and belongs to the battery
    const existingItem = await prisma.loopDatasetItem.findFirst({
      where: { 
        id: itemId, 
        battery: { 
          id: batteryId, 
          surveyId, 
          tenantId 
        } 
      }
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Dataset item not found' });
    }

    await prisma.loopDatasetItem.delete({
      where: { id: itemId }
    });

    return res.json({ message: 'Dataset item deleted successfully' });
  } catch (error) {
    console.error('Error deleting dataset item:', error);
    return res.status(500).json({ error: 'Failed to delete dataset item' });
  }
};

/**
 * Get all dataset items for a loop battery
 */
export const getDatasetItems = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { surveyId, batteryId } = req.params;

    // Verify loop battery exists
    const loopBattery = await prisma.loopBattery.findFirst({
      where: { id: batteryId, surveyId, tenantId }
    });

    if (!loopBattery) {
      return res.status(404).json({ error: 'Loop battery not found' });
    }

    const datasetItems = await prisma.loopDatasetItem.findMany({
      where: { batteryId },
      orderBy: { sortIndex: 'asc' }
    });

    return res.json({ datasetItems });
  } catch (error) {
    console.error('Error fetching dataset items:', error);
    return res.status(500).json({ error: 'Failed to fetch dataset items' });
  }
};
