import { Router } from "express";
import { prisma } from "@repo/database";
import { requireSurveyBuilder } from "../middleware/auth";
import { validateRequest, createPageSchema, updatePageSchema } from "../lib/validation";

const router = Router();

/**
 * GET /surveys/:id/pages
 * List all pages for a survey
 * Requires: SB access with VIEWER role
 */
router.get("/:id/pages", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
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

    const pages = await prisma.surveyPage.findMany({
      where: { surveyId, tenantId },
      include: {
        _count: {
          select: { questions: true }
        }
      },
      orderBy: { index: "asc" }
    });

    return res.json({ pages });
  } catch (error) {
    console.error("Error fetching pages:", error);
    return res.status(500).json({ error: "Failed to fetch pages" });
  }
});

/**
 * POST /surveys/:id/pages
 * Create a new page in a survey
 * Requires: SB access with EDITOR role
 */
router.post("/:id/pages", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const surveyId = req.params.id;

    // Validate request body
    const validation = validateRequest(createPageSchema, req.body);
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

    // Get next index
    const pageCount = await prisma.surveyPage.count({
      where: { surveyId, tenantId }
    });

    const page = await prisma.surveyPage.create({
      data: {
        tenantId,
        surveyId,
        index: pageCount + 1,
        titleTemplate: data.titleTemplate || null,
        descriptionTemplate: data.descriptionTemplate || null,
        questionOrderMode: data.questionOrderMode,
        groupOrderMode: data.groupOrderMode,
        visibleIfExpressionId: data.visibleIfExpressionId || null
      },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    return res.status(201).json({ page });
  } catch (error) {
    console.error("Error creating page:", error);
    return res.status(500).json({ error: "Failed to create page" });
  }
});

/**
 * GET /surveys/:id/pages/:pageId
 * Get a specific page with its questions
 * Requires: SB access with VIEWER role
 */
router.get("/:id/pages/:pageId", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, pageId } = req.params;

    const page = await prisma.surveyPage.findFirst({
      where: { 
        id: pageId, 
        surveyId, 
        tenantId 
      },
      include: {
        questions: {
          orderBy: { index: "asc" },
          include: {
            options: { orderBy: { index: "asc" } },
            items: { orderBy: { index: "asc" } },
            scales: { orderBy: { index: "asc" } }
          }
        }
      }
    });

    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    return res.json({ page });
  } catch (error) {
    console.error("Error fetching page:", error);
    return res.status(500).json({ error: "Failed to fetch page" });
  }
});

/**
 * PUT /surveys/:id/pages/:pageId
 * Update a page
 * Requires: SB access with EDITOR role
 */
router.put("/:id/pages/:pageId", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, pageId } = req.params;

    // Validate request body
    const validation = validateRequest(updatePageSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const data = validation.data;

    // Verify page exists and belongs to tenant
    const existingPage = await prisma.surveyPage.findFirst({
      where: { id: pageId, surveyId, tenantId }
    });

    if (!existingPage) {
      return res.status(404).json({ error: "Page not found" });
    }

    const updateData: any = {};
    if (data.titleTemplate !== undefined) updateData.titleTemplate = data.titleTemplate;
    if (data.descriptionTemplate !== undefined) updateData.descriptionTemplate = data.descriptionTemplate;
    if (data.questionOrderMode !== undefined) updateData.questionOrderMode = data.questionOrderMode;
    if (data.groupOrderMode !== undefined) updateData.groupOrderMode = data.groupOrderMode;
    if (data.visibleIfExpressionId !== undefined) updateData.visibleIfExpressionId = data.visibleIfExpressionId;

    const page = await prisma.surveyPage.update({
      where: { id: pageId },
      data: updateData,
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    return res.json({ page });
  } catch (error) {
    console.error("Error updating page:", error);
    return res.status(500).json({ error: "Failed to update page" });
  }
});

/**
 * DELETE /surveys/:id/pages/:pageId
 * Delete a page (only if survey is DRAFT)
 * Requires: SB access with MANAGER role
 */
router.delete("/:id/pages/:pageId", requireSurveyBuilder("MANAGER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, pageId } = req.params;

    // Verify survey exists and is in DRAFT status
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, tenantId }
    });

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    if (survey.status !== "DRAFT") {
      return res.status(400).json({ 
        error: "Only pages in draft surveys can be deleted",
        currentStatus: survey.status
      });
    }

    // Verify page exists
    const page = await prisma.surveyPage.findFirst({
      where: { id: pageId, surveyId, tenantId }
    });

    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    await prisma.surveyPage.delete({
      where: { id: pageId }
    });

    return res.json({ message: "Page deleted successfully" });
  } catch (error) {
    console.error("Error deleting page:", error);
    return res.status(500).json({ error: "Failed to delete page" });
  }
});

/**
 * POST /surveys/:id/pages/:pageId/reorder
 * Reorder pages within a survey
 * Requires: SB access with EDITOR role
 */
router.post("/:id/pages/:pageId/reorder", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, pageId } = req.params;
    const { newIndex } = req.body;

    if (typeof newIndex !== 'number' || newIndex < 1) {
      return res.status(400).json({ error: "newIndex must be a positive number" });
    }

    // Verify page exists
    const page = await prisma.surveyPage.findFirst({
      where: { id: pageId, surveyId, tenantId }
    });

    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    // Get total page count
    const totalPages = await prisma.surveyPage.count({
      where: { surveyId, tenantId }
    });

    if (newIndex > totalPages) {
      return res.status(400).json({ error: "newIndex exceeds total page count" });
    }

    // Reorder pages in transaction
    await prisma.$transaction(async (tx) => {
      // Get all pages ordered by index
      const pages = await tx.surveyPage.findMany({
        where: { surveyId, tenantId },
        orderBy: { index: "asc" }
      });

      const currentIndex = page.index;
      const targetIndex = newIndex;

      if (currentIndex === targetIndex) {
        return; // No change needed
      }

      // Update indices
      for (const p of pages) {
        let newPageIndex = p.index;
        
        if (currentIndex < targetIndex) {
          // Moving down: shift pages up
          if (p.index > currentIndex && p.index <= targetIndex) {
            newPageIndex = p.index - 1;
          }
        } else {
          // Moving up: shift pages down
          if (p.index >= targetIndex && p.index < currentIndex) {
            newPageIndex = p.index + 1;
          }
        }

        if (p.id === pageId) {
          newPageIndex = targetIndex;
        }

        if (newPageIndex !== p.index) {
          await tx.surveyPage.update({
            where: { id: p.id },
            data: { index: newPageIndex }
          });
        }
      }
    });

    return res.json({ message: "Page reordered successfully" });
  } catch (error) {
    console.error("Error reordering page:", error);
    return res.status(500).json({ error: "Failed to reorder page" });
  }
});

/**
 * PUT /surveys/:id/pages/:pageId/randomization
 * Update question randomization settings for a page
 * Requires: SB access with EDITOR role
 */
router.put("/:id/pages/:pageId/randomization", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id: surveyId, pageId } = req.params;
    const { questionOrderMode } = req.body;

    // Validate questionOrderMode
    const validModes = ['SEQUENTIAL', 'RANDOM', 'GROUP_RANDOM', 'WEIGHTED'];
    if (!validModes.includes(questionOrderMode)) {
      return res.status(400).json({ 
        error: "Invalid questionOrderMode", 
        validModes 
      });
    }

    // Verify page exists and belongs to tenant
    const page = await prisma.surveyPage.findFirst({
      where: { 
        id: pageId, 
        surveyId, 
        tenantId 
      }
    });

    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    // Update the page's question order mode
    const updatedPage = await prisma.surveyPage.update({
      where: { id: pageId },
      data: { questionOrderMode },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    return res.json({ 
      message: "Question randomization settings updated successfully",
      page: updatedPage
    });
  } catch (error) {
    console.error("Error updating page randomization:", error);
    return res.status(500).json({ error: "Failed to update page randomization" });
  }
});

export default router;

