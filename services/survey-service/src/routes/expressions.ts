import { Router } from "express";
import { prisma } from "@repo/database";
import { requireSurveyBuilder } from "../middleware/auth";
import { 
  validateRequest, 
  createExpressionSchema, 
  updateExpressionSchema,
  validateExpressionSchema
} from "../lib/validation";
import { validateDSL, testDSL, ExpressionContext } from "../expressions";

const router = Router();

/**
 * GET /surveys/:id/expressions
 * List all expressions for a survey
 * Requires: SB access with VIEWER role
 */
router.get("/:id/expressions", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
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

    const expressions = await prisma.expression.findMany({
      where: { surveyId, tenantId },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ expressions });
  } catch (error) {
    console.error("Error fetching expressions:", error);
    return res.status(500).json({ error: "Failed to fetch expressions" });
  }
});

/**
 * POST /surveys/:id/expressions
 * Create a new expression
 * Requires: SB access with EDITOR role
 */
router.post("/:id/expressions", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const surveyId = req.params.id;

    // Validate request body
    const validation = validateRequest(createExpressionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data;

    // Verify survey exists and belongs to tenant
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, tenantId }
    });

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    // Validate DSL syntax
    const dslValidation = validateDSL(data.dsl);
    if (!dslValidation.valid) {
      return res.status(400).json({ 
        error: "Invalid DSL syntax", 
        details: dslValidation.error 
      });
    }

    const expression = await prisma.expression.create({
      data: {
        tenantId,
        surveyId,
        dsl: data.dsl,
        description: data.description || null
      }
    });

    return res.status(201).json({ expression });
  } catch (error) {
    console.error("Error creating expression:", error);
    return res.status(500).json({ error: "Failed to create expression" });
  }
});

/**
 * GET /surveys/:id/expressions/:expressionId
 * Get a specific expression
 * Requires: SB access with VIEWER role
 */
router.get("/:id/expressions/:expressionId", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, expressionId } = req.params;

    const expression = await prisma.expression.findFirst({
      where: { 
        id: expressionId, 
        surveyId, 
        tenantId 
      }
    });

    if (!expression) {
      return res.status(404).json({ error: "Expression not found" });
    }

    return res.json({ expression });
  } catch (error) {
    console.error("Error fetching expression:", error);
    return res.status(500).json({ error: "Failed to fetch expression" });
  }
});

/**
 * PUT /surveys/:id/expressions/:expressionId
 * Update an expression
 * Requires: SB access with EDITOR role
 */
router.put("/:id/expressions/:expressionId", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, expressionId } = req.params;

    // Validate request body
    const validation = validateRequest(updateExpressionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data;

    // Verify expression exists and belongs to tenant
    const existingExpression = await prisma.expression.findFirst({
      where: { id: expressionId, surveyId, tenantId }
    });

    if (!existingExpression) {
      return res.status(404).json({ error: "Expression not found" });
    }

    // Validate DSL syntax if being updated
    if (data.dsl) {
      const dslValidation = validateDSL(data.dsl);
      if (!dslValidation.valid) {
        return res.status(400).json({ 
          error: "Invalid DSL syntax", 
          details: dslValidation.error 
        });
      }
    }

    const updateData: any = {};
    if (data.dsl !== undefined) updateData.dsl = data.dsl;
    if (data.description !== undefined) updateData.description = data.description;

    const expression = await prisma.expression.update({
      where: { id: expressionId },
      data: updateData
    });

    return res.json({ expression });
  } catch (error) {
    console.error("Error updating expression:", error);
    return res.status(500).json({ error: "Failed to update expression" });
  }
});

/**
 * DELETE /surveys/:id/expressions/:expressionId
 * Delete an expression
 * Requires: SB access with MANAGER role
 */
router.delete("/:id/expressions/:expressionId", requireSurveyBuilder("MANAGER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, expressionId } = req.params;

    // Verify expression exists and belongs to tenant
    const expression = await prisma.expression.findFirst({
      where: { id: expressionId, surveyId, tenantId }
    });

    if (!expression) {
      return res.status(404).json({ error: "Expression not found" });
    }

    // Check if expression is being used by any questions, pages, or options
    const [pageUsage, questionUsage, optionUsage, jumpUsage] = await Promise.all([
      prisma.surveyPage.count({ where: { visibleIfExpressionId: expressionId } }),
      prisma.question.count({ 
        where: { 
          OR: [
            { visibleIfExpressionId: expressionId },
            { carryForwardFilterExprId: expressionId }
          ]
        } 
      }),
      prisma.questionOption.count({ where: { visibleIfExpressionId: expressionId } }),
      prisma.pageJump.count({ 
        where: { 
          OR: [
            { conditionExpressionId: expressionId }
          ]
        } 
      })
    ]);

    const totalUsage = pageUsage + questionUsage + optionUsage + jumpUsage;
    if (totalUsage > 0) {
      return res.status(400).json({ 
        error: "Cannot delete expression that is currently in use",
        usage: {
          pages: pageUsage,
          questions: questionUsage,
          options: optionUsage,
          jumps: jumpUsage
        }
      });
    }

    await prisma.expression.delete({
      where: { id: expressionId }
    });

    return res.json({ message: "Expression deleted successfully" });
  } catch (error) {
    console.error("Error deleting expression:", error);
    return res.status(500).json({ error: "Failed to delete expression" });
  }
});

/**
 * POST /surveys/:id/expressions/validate
 * Validate DSL syntax
 * Requires: SB access with VIEWER role
 */
router.post("/:id/expressions/validate", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const surveyId = req.params.id;

    // Validate request body
    const validation = validateRequest(validateExpressionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data;

    // Verify survey exists and belongs to tenant
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, tenantId }
    });

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    // Validate DSL syntax
    const dslValidation = validateDSL(data.dsl);
    
    if (!dslValidation.valid) {
      return res.json({ 
        isValid: false, 
        error: dslValidation.error 
      });
    }

    // If test answers provided, test the expression
    if (data.testAnswers) {
      // Get questions for context
      const questions = await prisma.question.findMany({
        where: { surveyId, tenantId },
        select: {
          id: true,
          variableName: true,
          type: true,
          options: {
            select: { value: true, labelTemplate: true }
          }
        }
      });

      const questionContext = questions.map(q => ({
        id: q.id,
        variableName: q.variableName,
        type: q.type,
        options: q.options.map(opt => ({
          value: opt.value,
          label: opt.labelTemplate
        }))
      }));

      const testResult = testDSL(data.dsl, data.testAnswers, questionContext);
      
      return res.json({
        isValid: true,
        result: testResult.result,
        error: testResult.error
      });
    }

    return res.json({ isValid: true });
  } catch (error) {
    console.error("Error validating expression:", error);
    return res.status(500).json({ error: "Failed to validate expression" });
  }
});

/**
 * GET /surveys/:id/expressions/:expressionId/usage
 * Get usage information for an expression
 * Requires: SB access with VIEWER role
 */
router.get("/:id/expressions/:expressionId/usage", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, expressionId } = req.params;

    // Verify expression exists and belongs to tenant
    const expression = await prisma.expression.findFirst({
      where: { id: expressionId, surveyId, tenantId }
    });

    if (!expression) {
      return res.status(404).json({ error: "Expression not found" });
    }

    // Get usage information
    const [pages, questions, options, pageJumps, questionJumps] = await Promise.all([
      prisma.surveyPage.findMany({
        where: { visibleIfExpressionId: expressionId },
        select: { id: true, index: true, titleTemplate: true }
      }),
      prisma.question.findMany({
        where: { 
          OR: [
            { visibleIfExpressionId: expressionId },
            { carryForwardFilterExprId: expressionId }
          ]
        },
        select: { 
          id: true, 
          variableName: true, 
          titleTemplate: true,
          visibleIfExpressionId: true,
          carryForwardFilterExprId: true
        }
      }),
      prisma.questionOption.findMany({
        where: { visibleIfExpressionId: expressionId },
        select: { 
          id: true, 
          value: true, 
          labelTemplate: true,
          question: {
            select: { variableName: true, titleTemplate: true }
          }
        }
      }),
      prisma.pageJump.findMany({
        where: { conditionExpressionId: expressionId },
        select: { 
          id: true, 
          priority: true,
          fromPage: { select: { index: true } },
          toPage: { select: { index: true } }
        }
      }),
      prisma.questionJump.findMany({
        where: { conditionExpressionId: expressionId },
        select: { 
          id: true, 
          priority: true,
          fromQuestion: { select: { variableName: true, titleTemplate: true } }
        }
      })
    ]);

    return res.json({
      expression,
      usage: {
        pages: pages.map(p => ({ ...p, usageType: 'page_visibility' })),
        questions: questions.map(q => ({
          ...q,
          usageType: q.visibleIfExpressionId === expressionId ? 'question_visibility' : 'carry_forward_filter'
        })),
        options: options.map(o => ({ ...o, usageType: 'option_visibility' })),
        pageJumps: pageJumps.map(j => ({ ...j, usageType: 'page_jump_condition' })),
        questionJumps: questionJumps.map(j => ({ ...j, usageType: 'question_jump_condition' }))
      }
    });
  } catch (error) {
    console.error("Error fetching expression usage:", error);
    return res.status(500).json({ error: "Failed to fetch expression usage" });
  }
});

export default router;
