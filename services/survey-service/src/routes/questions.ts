import { Router } from "express";
import { prisma } from "@repo/database";
import { requireSurveyBuilder } from "../middleware/auth";
import { 
  validateRequest, 
  createQuestionSchema, 
  updateQuestionSchema,
  createQuestionOptionSchema,
  updateQuestionOptionSchema,
  createQuestionItemSchema,
  updateQuestionItemSchema,
  createQuestionScaleSchema,
  updateQuestionScaleSchema
} from "../lib/validation";
import { 
  SUGGESTED_CHOICES, 
  getSuggestedChoicesByCategory, 
  getSuggestedChoiceCategories,
  getSuggestedChoiceById 
} from "../lib/suggested-choices";

const router = Router();

/**
 * GET /surveys/:id/questions
 * List all questions for a survey
 * Requires: SB access with VIEWER role
 */
router.get("/:id/questions", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const surveyId = req.params.id;

    // Verify survey exists and belongs to tenant
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, tenantId }
    });

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    const questions = await prisma.question.findMany({
      where: { surveyId, tenantId },
      include: {
        page: {
          select: { id: true, index: true, titleTemplate: true }
        },
        options: { 
          orderBy: { index: "asc" },
          include: {
            visibleIf: {
              select: { id: true, dsl: true, description: true }
            }
          }
        },
        items: { 
          orderBy: { index: "asc" },
          include: {
            visibleIf: {
              select: { id: true, dsl: true, description: true }
            }
          }
        },
        scales: { 
          orderBy: { index: "asc" },
          include: {
            visibleIf: {
              select: { id: true, dsl: true, description: true }
            }
          }
        },
        terminateIf: {
          select: { id: true, dsl: true, description: true }
        },
        fromJumps: {
          include: {
            condition: {
              select: { id: true, dsl: true, description: true }
            },
            toQuestion: {
              select: { id: true, variableName: true, titleTemplate: true }
            },
            toPage: {
              select: { id: true, titleTemplate: true, index: true }
            }
          },
          orderBy: { priority: "asc" }
        }
      },
      orderBy: [
        { page: { index: "asc" } },
        { index: "asc" }
      ]
    });

    return res.json({ questions });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({ error: "Failed to fetch questions" });
  }
});

/**
 * POST /surveys/:id/questions
 * Create a new question in a survey
 * Requires: SB access with EDITOR role
 */
router.post("/:id/questions", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const surveyId = req.params.id;

    // Validate request body
    const validation = validateRequest(createQuestionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data;

    // Verify survey and page exist and belong to tenant
    const [survey, page] = await Promise.all([
      prisma.survey.findFirst({ where: { id: surveyId, tenantId } }),
      prisma.surveyPage.findFirst({ where: { id: data.pageId, surveyId, tenantId } })
    ]);

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    // If groupId is provided, verify the group exists and belongs to the same page
    if (data.groupId) {
      const group = await prisma.pageQuestionGroup.findFirst({
        where: { id: data.groupId, pageId: data.pageId, tenantId }
      });

      if (!group) {
        return res.status(404).json({ error: "Question group not found or does not belong to this page" });
      }
    }

    // Get next index within the page
    const questionCount = await prisma.question.count({
      where: { pageId: data.pageId, tenantId }
    });

    // Auto-generate variableName if not provided
    let variableName = data.variableName;
    if (!variableName) {
      const surveyQuestionCount = await prisma.question.count({
        where: { surveyId, tenantId }
      });
      variableName = `Q${surveyQuestionCount + 1}`;
    }

    // Verify variableName is unique within survey
    const existingQuestion = await prisma.question.findFirst({
      where: { surveyId, tenantId, variableName }
    });

    if (existingQuestion) {
      return res.status(409).json({ error: "Variable name already exists in this survey" });
    }

    const question = await prisma.question.create({
      data: {
        tenantId,
        surveyId,
        pageId: data.pageId,
        groupId: data.groupId || null,
        groupIndex: data.groupIndex || null,
        index: questionCount + 1,
        type: data.type,
        variableName,
        titleTemplate: data.titleTemplate,
        helpTextTemplate: data.helpTextTemplate || null,
        required: data.required,
        validation: data.validation || null,
        optionOrderMode: data.optionOrderMode,
        optionsSource: data.optionsSource,
        carryForwardQuestionId: data.carryForwardQuestionId || null,
        carryForwardFilterExprId: data.carryForwardFilterExprId || null,
        visibleIfExpressionId: data.visibleIfExpressionId || null,
        
        // Type-specific configuration fields
        minValue: data.minValue || null,
        maxValue: data.maxValue || null,
        stepValue: data.stepValue || null,
        defaultValue: data.defaultValue || null,
        scaleMinLabel: data.scaleMinLabel || null,
        scaleMaxLabel: data.scaleMaxLabel || null,
        scaleSteps: data.scaleSteps || null,
        maxSelections: data.maxSelections || null,
        allowOther: data.allowOther,
        otherLabel: data.otherLabel || null,
        allowedFileTypes: data.allowedFileTypes,
        maxFileSize: data.maxFileSize || null,
        maxFiles: data.maxFiles,
        dateFormat: data.dateFormat || null,
        timeFormat: data.timeFormat || null,
        minDate: data.minDate ? new Date(data.minDate) : null,
        maxDate: data.maxDate ? new Date(data.maxDate) : null,
        phoneFormat: data.phoneFormat || null,
        countryCode: data.countryCode,
        urlProtocol: data.urlProtocol,
        paymentAmount: data.paymentAmount || null,
        currency: data.currency,
        paymentMethods: data.paymentMethods,
        imageLayout: data.imageLayout,
        imageSize: data.imageSize,
        matrixType: data.matrixType,
        showHeaders: data.showHeaders,
        randomizeRows: data.randomizeRows,
        randomizeColumns: data.randomizeColumns,
        totalPoints: data.totalPoints,
        allowZero: data.allowZero,
        signatureWidth: data.signatureWidth,
        signatureHeight: data.signatureHeight,
        signatureColor: data.signatureColor,
        consentText: data.consentText || null,
        requireSignature: data.requireSignature,
        collectName: data.collectName,
        collectEmail: data.collectEmail,
        collectPhone: data.collectPhone,
        collectCompany: data.collectCompany,
        collectAddress: data.collectAddress,
        groupSize: data.groupSize,
        groupLabel: data.groupLabel || null
      },
      include: {
        page: {
          select: { id: true, index: true, titleTemplate: true }
        },
        options: { orderBy: { index: "asc" } },
        items: { orderBy: { index: "asc" } },
        scales: { orderBy: { index: "asc" } }
      }
    });

    return res.status(201).json({ question });
  } catch (error) {
    console.error("Error creating question:", error);
    return res.status(500).json({ error: "Failed to create question" });
  }
});

/**
 * GET /surveys/:id/questions/:questionId
 * Get a specific question with its options/items/scales
 * Requires: SB access with VIEWER role
 */
router.get("/:id/questions/:questionId", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, questionId } = req.params;

    const question = await prisma.question.findFirst({
      where: { 
        id: questionId, 
        surveyId, 
        tenantId 
      },
      include: {
        page: {
          select: { id: true, index: true, titleTemplate: true }
        },
        options: { orderBy: { index: "asc" } },
        items: { orderBy: { index: "asc" } },
        scales: { orderBy: { index: "asc" } },
        terminateIf: {
          select: { id: true, dsl: true, description: true }
        },
        fromJumps: {
          include: {
            condition: {
              select: { id: true, dsl: true, description: true }
            },
            toQuestion: {
              select: { id: true, variableName: true, titleTemplate: true }
            },
            toPage: {
              select: { id: true, titleTemplate: true, index: true }
            }
          },
          orderBy: { priority: "asc" }
        }
      }
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    return res.json({ question });
  } catch (error) {
    console.error("Error fetching question:", error);
    return res.status(500).json({ error: "Failed to fetch question" });
  }
});

/**
 * PUT /surveys/:id/questions/:questionId
 * Update a question
 * Requires: SB access with EDITOR role
 */
router.put("/:id/questions/:questionId", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, questionId } = req.params;

    // Validate request body
    const validation = validateRequest(updateQuestionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data;

    // Verify question exists and belongs to tenant
    const existingQuestion = await prisma.question.findFirst({
      where: { id: questionId, surveyId, tenantId }
    });

    if (!existingQuestion) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Check variableName uniqueness if being changed
    if (data.variableName && data.variableName !== existingQuestion.variableName) {
      const duplicateQuestion = await prisma.question.findFirst({
        where: { 
          surveyId, 
          tenantId, 
          variableName: data.variableName,
          id: { not: questionId }
        }
      });

      if (duplicateQuestion) {
        return res.status(409).json({ error: "Variable name already exists in this survey" });
      }
    }

    // If groupId is being changed, verify the group exists and belongs to the same page
    if (data.groupId !== undefined && data.groupId !== existingQuestion.groupId) {
      if (data.groupId) {
        const group = await prisma.pageQuestionGroup.findFirst({
          where: { id: data.groupId, pageId: existingQuestion.pageId, tenantId }
        });

        if (!group) {
          return res.status(404).json({ error: "Question group not found or does not belong to this page" });
        }
      }
    }

    const updateData: any = {};
    if (data.groupId !== undefined) updateData.groupId = data.groupId;
    if (data.groupIndex !== undefined) updateData.groupIndex = data.groupIndex;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.variableName !== undefined) updateData.variableName = data.variableName;
    if (data.titleTemplate !== undefined) updateData.titleTemplate = data.titleTemplate;
    if (data.helpTextTemplate !== undefined) updateData.helpTextTemplate = data.helpTextTemplate;
    if (data.required !== undefined) updateData.required = data.required;
    if (data.validation !== undefined) updateData.validation = data.validation;
    if (data.optionOrderMode !== undefined) updateData.optionOrderMode = data.optionOrderMode;
    if (data.optionsSource !== undefined) updateData.optionsSource = data.optionsSource;
    if (data.carryForwardQuestionId !== undefined) updateData.carryForwardQuestionId = data.carryForwardQuestionId;
    if (data.carryForwardFilterExprId !== undefined) updateData.carryForwardFilterExprId = data.carryForwardFilterExprId;
    if (data.visibleIfExpressionId !== undefined) updateData.visibleIfExpressionId = data.visibleIfExpressionId;
    if (data.terminateIfExpressionId !== undefined) updateData.terminateIfExpressionId = data.terminateIfExpressionId;
    
    // Type-specific configuration fields
    if (data.minValue !== undefined) updateData.minValue = data.minValue;
    if (data.maxValue !== undefined) updateData.maxValue = data.maxValue;
    if (data.stepValue !== undefined) updateData.stepValue = data.stepValue;
    if (data.defaultValue !== undefined) updateData.defaultValue = data.defaultValue;
    if (data.scaleMinLabel !== undefined) updateData.scaleMinLabel = data.scaleMinLabel;
    if (data.scaleMaxLabel !== undefined) updateData.scaleMaxLabel = data.scaleMaxLabel;
    if (data.scaleSteps !== undefined) updateData.scaleSteps = data.scaleSteps;
    if (data.maxSelections !== undefined) updateData.maxSelections = data.maxSelections;
    if (data.allowOther !== undefined) updateData.allowOther = data.allowOther;
    if (data.otherLabel !== undefined) updateData.otherLabel = data.otherLabel;
    if (data.allowedFileTypes !== undefined) updateData.allowedFileTypes = data.allowedFileTypes;
    if (data.maxFileSize !== undefined) updateData.maxFileSize = data.maxFileSize;
    if (data.maxFiles !== undefined) updateData.maxFiles = data.maxFiles;
    if (data.dateFormat !== undefined) updateData.dateFormat = data.dateFormat;
    if (data.timeFormat !== undefined) updateData.timeFormat = data.timeFormat;
    if (data.minDate !== undefined) updateData.minDate = data.minDate ? new Date(data.minDate) : null;
    if (data.maxDate !== undefined) updateData.maxDate = data.maxDate ? new Date(data.maxDate) : null;
    if (data.phoneFormat !== undefined) updateData.phoneFormat = data.phoneFormat;
    if (data.countryCode !== undefined) updateData.countryCode = data.countryCode;
    if (data.urlProtocol !== undefined) updateData.urlProtocol = data.urlProtocol;
    if (data.paymentAmount !== undefined) updateData.paymentAmount = data.paymentAmount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.paymentMethods !== undefined) updateData.paymentMethods = data.paymentMethods;
    if (data.imageLayout !== undefined) updateData.imageLayout = data.imageLayout;
    if (data.imageSize !== undefined) updateData.imageSize = data.imageSize;
    if (data.matrixType !== undefined) updateData.matrixType = data.matrixType;
    if (data.showHeaders !== undefined) updateData.showHeaders = data.showHeaders;
    if (data.randomizeRows !== undefined) updateData.randomizeRows = data.randomizeRows;
    if (data.randomizeColumns !== undefined) updateData.randomizeColumns = data.randomizeColumns;
    if (data.totalPoints !== undefined) updateData.totalPoints = data.totalPoints;
    if (data.allowZero !== undefined) updateData.allowZero = data.allowZero;
    if (data.signatureWidth !== undefined) updateData.signatureWidth = data.signatureWidth;
    if (data.signatureHeight !== undefined) updateData.signatureHeight = data.signatureHeight;
    if (data.signatureColor !== undefined) updateData.signatureColor = data.signatureColor;
    if (data.consentText !== undefined) updateData.consentText = data.consentText;
    if (data.requireSignature !== undefined) updateData.requireSignature = data.requireSignature;
    if (data.collectName !== undefined) updateData.collectName = data.collectName;
    if (data.collectEmail !== undefined) updateData.collectEmail = data.collectEmail;
    if (data.collectPhone !== undefined) updateData.collectPhone = data.collectPhone;
    if (data.collectCompany !== undefined) updateData.collectCompany = data.collectCompany;
    if (data.collectAddress !== undefined) updateData.collectAddress = data.collectAddress;
    if (data.showIpsosBranding !== undefined) updateData.showIpsosBranding = data.showIpsosBranding;
    if (data.groupSize !== undefined) updateData.groupSize = data.groupSize;
    if (data.groupLabel !== undefined) updateData.groupLabel = data.groupLabel;

    const question = await prisma.question.update({
      where: { id: questionId },
      data: updateData,
      include: {
        page: {
          select: { id: true, index: true, titleTemplate: true }
        },
        options: { orderBy: { index: "asc" } },
        items: { orderBy: { index: "asc" } },
        scales: { orderBy: { index: "asc" } },
        terminateIf: {
          select: { id: true, dsl: true, description: true }
        }
      }
    });

    return res.json({ question });
  } catch (error) {
    console.error("Error updating question:", error);
    return res.status(500).json({ error: "Failed to update question" });
  }
});

/**
 * DELETE /surveys/:id/questions/:questionId
 * Delete a question (only if survey is DRAFT)
 * Requires: SB access with MANAGER role
 */
router.delete("/:id/questions/:questionId", requireSurveyBuilder("MANAGER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, questionId } = req.params;

    // Verify survey exists and is in DRAFT status
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, tenantId }
    });

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    if (survey.status !== "DRAFT") {
      return res.status(400).json({ 
        error: "Only questions in draft surveys can be deleted",
        currentStatus: survey.status
      });
    }

    // Verify question exists
    const question = await prisma.question.findFirst({
      where: { id: questionId, surveyId, tenantId }
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    await prisma.question.delete({
      where: { id: questionId }
    });

    return res.json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    return res.status(500).json({ error: "Failed to delete question" });
  }
});

/**
 * POST /surveys/:id/questions/:questionId/options
 * Add an option to a question
 * Requires: SB access with EDITOR role
 */
router.post("/:id/questions/:questionId/options", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, questionId } = req.params;

    // Validate request body
    const validation = validateRequest(createQuestionOptionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data;

    // Verify question exists and belongs to tenant
    const question = await prisma.question.findFirst({
      where: { id: questionId, surveyId, tenantId }
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Get next index
    const optionCount = await prisma.questionOption.count({
      where: { questionId, tenantId }
    });

    // Check value uniqueness within question
    const existingOption = await prisma.questionOption.findFirst({
      where: { questionId, tenantId, value: data.value }
    });

    if (existingOption) {
      return res.status(409).json({ error: "Option value already exists for this question" });
    }

    const option = await prisma.questionOption.create({
      data: {
        tenantId,
        surveyId,
        questionId,
        index: optionCount + 1,
        value: data.value,
        labelTemplate: data.labelTemplate,
        exclusive: data.exclusive,
        groupKey: data.groupKey || null,
        weight: data.weight || null,
        visibleIfExpressionId: data.visibleIfExpressionId || null,
        
        // Picture choice specific fields
        imageUrl: data.imageUrl || null,
        imageAlt: data.imageAlt || null,
        imageWidth: data.imageWidth || null,
        imageHeight: data.imageHeight || null
      }
    });

    return res.status(201).json({ option });
  } catch (error) {
    console.error("Error creating option:", error);
    return res.status(500).json({ error: "Failed to create option" });
  }
});

/**
 * PUT /surveys/:id/questions/:questionId/options/:optionId
 * Update a question option
 * Requires: SB access with EDITOR role
 */
router.put("/:id/questions/:questionId/options/:optionId", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, questionId, optionId } = req.params;

    // Validate request body
    const validation = validateRequest(updateQuestionOptionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data;

    // Verify option exists and belongs to tenant
    const existingOption = await prisma.questionOption.findFirst({
      where: { id: optionId, questionId, surveyId, tenantId }
    });

    if (!existingOption) {
      return res.status(404).json({ error: "Option not found" });
    }

    // Check value uniqueness if being changed
    if (data.value && data.value !== existingOption.value) {
      const duplicateOption = await prisma.questionOption.findFirst({
        where: { 
          questionId, 
          tenantId, 
          value: data.value,
          id: { not: optionId }
        }
      });

      if (duplicateOption) {
        return res.status(409).json({ error: "Option value already exists for this question" });
      }
    }

    const updateData: any = {};
    if (data.value !== undefined) updateData.value = data.value;
    if (data.labelTemplate !== undefined) updateData.labelTemplate = data.labelTemplate;
    if (data.exclusive !== undefined) updateData.exclusive = data.exclusive;
    if (data.groupKey !== undefined) updateData.groupKey = data.groupKey;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.visibleIfExpressionId !== undefined) updateData.visibleIfExpressionId = data.visibleIfExpressionId;
    
    // Picture choice specific fields
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.imageAlt !== undefined) updateData.imageAlt = data.imageAlt;
    if (data.imageWidth !== undefined) updateData.imageWidth = data.imageWidth;
    if (data.imageHeight !== undefined) updateData.imageHeight = data.imageHeight;

    const option = await prisma.questionOption.update({
      where: { id: optionId },
      data: updateData
    });

    return res.json({ option });
  } catch (error) {
    console.error("Error updating option:", error);
    return res.status(500).json({ error: "Failed to update option" });
  }
});

/**
 * DELETE /surveys/:id/questions/:questionId/options/:optionId
 * Delete a question option
 * Requires: SB access with EDITOR role
 */
router.delete("/:id/questions/:questionId/options/:optionId", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, questionId, optionId } = req.params;

    // Verify option exists and belongs to tenant
    const option = await prisma.questionOption.findFirst({
      where: { id: optionId, questionId, surveyId, tenantId }
    });

    if (!option) {
      return res.status(404).json({ error: "Option not found" });
    }

    await prisma.questionOption.delete({
      where: { id: optionId }
    });

    return res.json({ message: "Option deleted successfully" });
  } catch (error) {
    console.error("Error deleting option:", error);
    return res.status(500).json({ error: "Failed to delete option" });
  }
});

/**
 * PUT /surveys/:id/questions/:questionId/shuffling
 * Update option shuffling settings for a question
 * Requires: SB access with EDITOR role
 */
router.put("/:id/questions/:questionId/shuffling", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, questionId } = req.params;
    const { optionOrderMode } = req.body;

    // Validate optionOrderMode
    const validModes = ['SEQUENTIAL', 'RANDOM', 'GROUP_RANDOM', 'WEIGHTED'];
    if (!validModes.includes(optionOrderMode)) {
      return res.status(400).json({ 
        error: "Invalid optionOrderMode", 
        validModes 
      });
    }

    // Verify question exists and belongs to tenant
    const question = await prisma.question.findFirst({
      where: { 
        id: questionId, 
        surveyId, 
        tenantId 
      },
      include: {
        page: {
          select: { id: true, index: true, titleTemplate: true }
        },
        options: { orderBy: { index: "asc" } },
        items: { orderBy: { index: "asc" } },
        scales: { orderBy: { index: "asc" } },
        terminateIf: {
          select: { id: true, dsl: true, description: true }
        },
        fromJumps: {
          include: {
            condition: {
              select: { id: true, dsl: true, description: true }
            },
            toQuestion: {
              select: { id: true, variableName: true, titleTemplate: true }
            },
            toPage: {
              select: { id: true, titleTemplate: true, index: true }
            }
          },
          orderBy: { priority: "asc" }
        }
      }
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Update the question's option order mode
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: { optionOrderMode },
      include: {
        page: {
          select: { id: true, index: true, titleTemplate: true }
        },
        options: { orderBy: { index: "asc" } },
        items: { orderBy: { index: "asc" } },
        scales: { orderBy: { index: "asc" } },
        terminateIf: {
          select: { id: true, dsl: true, description: true }
        },
        fromJumps: {
          include: {
            condition: {
              select: { id: true, dsl: true, description: true }
            },
            toQuestion: {
              select: { id: true, variableName: true, titleTemplate: true }
            },
            toPage: {
              select: { id: true, titleTemplate: true, index: true }
            }
          },
          orderBy: { priority: "asc" }
        }
      }
    });

    return res.json({ 
      message: "Option shuffling settings updated successfully",
      question: updatedQuestion
    });
  } catch (error) {
    console.error("Error updating question shuffling:", error);
    return res.status(500).json({ error: "Failed to update question shuffling" });
  }
});

/**
 * GET /surveys/:id/suggested-choices
 * Get all available suggested choice types
 * Requires: SB access with VIEWER role
 */
router.get("/:id/suggested-choices", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const { category } = req.query;
    
    const suggestedChoices = getSuggestedChoicesByCategory(category);
    const categories = getSuggestedChoiceCategories();

    return res.json({
      suggestedChoices,
      categories
    });
  } catch (error) {
    console.error("Error fetching suggested choices:", error);
    return res.status(500).json({ error: "Failed to fetch suggested choices" });
  }
});

/**
 * POST /surveys/:id/questions/:questionId/populate-choices
 * Populate question choices from a suggested choice type
 * Requires: SB access with EDITOR role
 */
router.post("/:id/questions/:questionId/populate-choices", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, questionId } = req.params;
    const { suggestedChoiceId, replaceExisting = false } = req.body;

    // Validate suggestedChoiceId
    if (!suggestedChoiceId) {
      return res.status(400).json({ error: "suggestedChoiceId is required" });
    }

    // Get the suggested choice
    const suggestedChoice = getSuggestedChoiceById(suggestedChoiceId);
    if (!suggestedChoice) {
      return res.status(404).json({ error: "Suggested choice not found" });
    }

    // Verify question exists and belongs to tenant
    const question = await prisma.question.findFirst({
      where: { id: questionId, surveyId, tenantId },
      include: { options: { orderBy: { index: "asc" } } }
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Check if question type supports options
    const choiceQuestionTypes = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'YES_NO'];
    if (!choiceQuestionTypes.includes(question.type)) {
      return res.status(400).json({ 
        error: "Question type does not support choices",
        supportedTypes: choiceQuestionTypes
      });
    }

    await prisma.$transaction(async (tx) => {
      // Delete existing options if replaceExisting is true
      if (replaceExisting) {
        await tx.questionOption.deleteMany({
          where: { questionId, tenantId }
        });
      }

      // Create new options from suggested choice
      const existingOptionCount = await tx.questionOption.count({
        where: { questionId, tenantId }
      });

      for (let i = 0; i < suggestedChoice.choices.length; i++) {
        const choice = suggestedChoice.choices[i];
        if (choice) {
          await tx.questionOption.create({
            data: {
              tenantId,
              surveyId,
              questionId,
              index: existingOptionCount + i + 1,
              value: choice.value,
              labelTemplate: choice.label,
              exclusive: false
            }
          });
        }
      }
    });

    // Fetch updated question with new options
    const updatedQuestion = await prisma.question.findFirst({
      where: { id: questionId, surveyId, tenantId },
      include: {
        page: {
          select: { id: true, index: true, titleTemplate: true }
        },
        options: { orderBy: { index: "asc" } },
        items: { orderBy: { index: "asc" } },
        scales: { orderBy: { index: "asc" } }
      }
    });

    return res.json({
      message: "Choices populated successfully",
      question: updatedQuestion,
      suggestedChoice: suggestedChoice
    });
  } catch (error) {
    console.error("Error populating choices:", error);
    return res.status(500).json({ error: "Failed to populate choices" });
  }
});

/**
 * Matrix Items Management
 */

/**
 * POST /surveys/:id/questions/:questionId/items
 * Add a matrix item (row) to a question
 * Requires: SB access with EDITOR role
 */
router.post("/:id/questions/:questionId/items", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const surveyId = req.params.id;
    const questionId = req.params.questionId;
    const data = req.body;

    // Validate request
    const validation = createQuestionItemSchema.safeParse(data);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: validation.error.issues 
      });
    }

    // Verify question exists and belongs to tenant
    const question = await prisma.question.findFirst({
      where: { id: questionId, surveyId, tenantId }
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Get current item count for index
    const itemCount = await prisma.questionItem.count({
      where: { questionId, tenantId }
    });

    const item = await prisma.questionItem.create({
      data: {
        tenantId,
        surveyId,
        questionId,
        index: itemCount,
        value: data.value,
        label: data.label
      }
    });

    return res.status(201).json({ item });
  } catch (error) {
    console.error("Error creating matrix item:", error);
    return res.status(500).json({ error: "Failed to create matrix item" });
  }
});

/**
 * PUT /surveys/:id/questions/:questionId/items/:itemId
 * Update a matrix item
 * Requires: SB access with EDITOR role
 */
router.put("/:id/questions/:questionId/items/:itemId", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const surveyId = req.params.id;
    const questionId = req.params.questionId;
    const itemId = req.params.itemId;
    const data = req.body;

    // Validate request
    const validation = updateQuestionItemSchema.safeParse(data);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: validation.error.issues 
      });
    }

    // Verify item exists and belongs to tenant
    const item = await prisma.questionItem.findFirst({
      where: { id: itemId, questionId, surveyId, tenantId }
    });

    if (!item) {
      return res.status(404).json({ error: "Matrix item not found" });
    }

    const updatedItem = await prisma.questionItem.update({
      where: { id: itemId },
      data: {
        value: data.value,
        label: data.label,
        visibleIfExpressionId: data.visibleIfExpressionId
      }
    });

    return res.json({ item: updatedItem });
  } catch (error) {
    console.error("Error updating matrix item:", error);
    return res.status(500).json({ error: "Failed to update matrix item" });
  }
});

/**
 * DELETE /surveys/:id/questions/:questionId/items/:itemId
 * Delete a matrix item
 * Requires: SB access with EDITOR role
 */
router.delete("/:id/questions/:questionId/items/:itemId", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const surveyId = req.params.id;
    const questionId = req.params.questionId;
    const itemId = req.params.itemId;

    // Verify item exists and belongs to tenant
    const item = await prisma.questionItem.findFirst({
      where: { id: itemId, questionId, surveyId, tenantId }
    });

    if (!item) {
      return res.status(404).json({ error: "Matrix item not found" });
    }

    await prisma.questionItem.delete({
      where: { id: itemId }
    });

    // Reorder remaining items
    const remainingItems = await prisma.questionItem.findMany({
      where: { questionId, tenantId },
      orderBy: { index: "asc" }
    });

    for (let i = 0; i < remainingItems.length; i++) {
      const item = remainingItems[i];
      if (item) {
        await prisma.questionItem.update({
          where: { id: item.id },
          data: { index: i }
        });
      }
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting matrix item:", error);
    return res.status(500).json({ error: "Failed to delete matrix item" });
  }
});

/**
 * Matrix Scales Management
 */

/**
 * POST /surveys/:id/questions/:questionId/scales
 * Add a matrix scale (column) to a question
 * Requires: SB access with EDITOR role
 */
router.post("/:id/questions/:questionId/scales", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const surveyId = req.params.id;
    const questionId = req.params.questionId;
    const data = req.body;

    // Validate request
    const validation = createQuestionScaleSchema.safeParse(data);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: validation.error.issues 
      });
    }

    // Verify question exists and belongs to tenant
    const question = await prisma.question.findFirst({
      where: { id: questionId, surveyId, tenantId }
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Get current scale count for index
    const scaleCount = await prisma.questionScale.count({
      where: { questionId, tenantId }
    });

    const scale = await prisma.questionScale.create({
      data: {
        tenantId,
        surveyId,
        questionId,
        index: scaleCount,
        value: data.value,
        label: data.label
      }
    });

    return res.status(201).json({ scale });
  } catch (error) {
    console.error("Error creating matrix scale:", error);
    return res.status(500).json({ error: "Failed to create matrix scale" });
  }
});

/**
 * PUT /surveys/:id/questions/:questionId/scales/:scaleId
 * Update a matrix scale
 * Requires: SB access with EDITOR role
 */
router.put("/:id/questions/:questionId/scales/:scaleId", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const surveyId = req.params.id;
    const questionId = req.params.questionId;
    const scaleId = req.params.scaleId;
    const data = req.body;

    // Validate request
    const validation = updateQuestionScaleSchema.safeParse(data);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: validation.error.issues 
      });
    }

    // Verify scale exists and belongs to tenant
    const scale = await prisma.questionScale.findFirst({
      where: { id: scaleId, questionId, surveyId, tenantId }
    });

    if (!scale) {
      return res.status(404).json({ error: "Matrix scale not found" });
    }

    const updatedScale = await prisma.questionScale.update({
      where: { id: scaleId },
      data: {
        value: data.value,
        label: data.label,
        visibleIfExpressionId: data.visibleIfExpressionId
      }
    });

    return res.json({ scale: updatedScale });
  } catch (error) {
    console.error("Error updating matrix scale:", error);
    return res.status(500).json({ error: "Failed to update matrix scale" });
  }
});

/**
 * DELETE /surveys/:id/questions/:questionId/scales/:scaleId
 * Delete a matrix scale
 * Requires: SB access with EDITOR role
 */
router.delete("/:id/questions/:questionId/scales/:scaleId", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const surveyId = req.params.id;
    const questionId = req.params.questionId;
    const scaleId = req.params.scaleId;

    // Verify scale exists and belongs to tenant
    const scale = await prisma.questionScale.findFirst({
      where: { id: scaleId, questionId, surveyId, tenantId }
    });

    if (!scale) {
      return res.status(404).json({ error: "Matrix scale not found" });
    }

    await prisma.questionScale.delete({
      where: { id: scaleId }
    });

    // Reorder remaining scales
    const remainingScales = await prisma.questionScale.findMany({
      where: { questionId, tenantId },
      orderBy: { index: "asc" }
    });

    for (let i = 0; i < remainingScales.length; i++) {
      const scale = remainingScales[i];
      if (scale) {
        await prisma.questionScale.update({
          where: { id: scale.id },
          data: { index: i }
        });
      }
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting matrix scale:", error);
    return res.status(500).json({ error: "Failed to delete matrix scale" });
  }
});

export default router;

