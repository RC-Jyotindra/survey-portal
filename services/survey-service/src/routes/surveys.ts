import { Router } from "express";
import { prisma } from "@repo/database";
import { requireSurveyBuilder, requireAction } from "../middleware/auth";
import { SurveyStatus } from "@prisma/client";

const router = Router();

/**
 * GET /surveys
 * List all surveys for the authenticated tenant
 * Requires: SB access with VIEWER role
 */
router.get("/", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { status, limit = 50, offset = 0 } = req.query;

    const where: any = { tenantId };
    if (status && typeof status === "string") {
      where.status = status as SurveyStatus;
    }

    const surveys = await prisma.survey.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        version: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        createdByUserId: true,
        _count: {
          select: {
            pages: true,
            questions: true,
            sessions: true
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: Math.min(Number(limit), 100),
      skip: Number(offset)
    });

    const total = await prisma.survey.count({ where });

    return res.json({
      surveys,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + surveys.length < total
      }
    });
  } catch (error) {
    console.error("Error fetching surveys:", error);
    return res.status(500).json({ error: "Failed to fetch surveys" });
  }
});

/**
 * GET /surveys/:id
 * Get a specific survey by ID
 * Requires: SB access with VIEWER role
 */
router.get("/:id", requireSurveyBuilder("VIEWER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    const survey = await prisma.survey.findFirst({
      where: { id, tenantId },
      include: {
        pages: {
          orderBy: { index: "asc" },
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
        },
        pageJumps: {
          orderBy: { priority: "asc" }
        },
        questionJumps: {
          orderBy: { priority: "asc" }
        },
        expressions: true,
        _count: {
          select: {
            pages: true,
            questions: true,
            sessions: true
          }
        }
      }
    });

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    return res.json({ survey });
  } catch (error) {
    console.error("Error fetching survey:", error);
    return res.status(500).json({ error: "Failed to fetch survey" });
  }
});

/**
 * POST /surveys
 * Create a new survey
 * Requires: SB access with EDITOR role
 */
router.post("/", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = req.user?.userId || (req as any).userId;
    const { title, description, slug, defaultLanguage, settings } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Check slug uniqueness if provided
    if (slug) {
      const existing = await prisma.survey.findFirst({
        where: { tenantId, slug }
      });
      if (existing) {
        return res.status(409).json({ error: "Slug already exists in this tenant" });
      }
    }

    const survey = await prisma.survey.create({
      data: {
        tenantId,
        title: title.trim(),
        description: description?.trim(),
        slug: slug?.trim(),
        defaultLanguage,
        settings: settings || {},
        createdByUserId: userId,
        status: SurveyStatus.DRAFT
      },
      include: {
        _count: {
          select: { pages: true, questions: true, sessions: true }
        }
      }
    });

    return res.status(201).json({ survey });
  } catch (error) {
    console.error("Error creating survey:", error);
    return res.status(500).json({ error: "Failed to create survey" });
  }
});

/**
 * PUT /surveys/:id
 * Update survey metadata
 * Requires: SB access with EDITOR role
 */
router.put("/:id", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const { title, description, slug, defaultLanguage, settings } = req.body;

    // Check if survey exists and belongs to tenant
    const existing = await prisma.survey.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: "Survey not found" });
    }

    // Check slug uniqueness if changed
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.survey.findFirst({
        where: { tenantId, slug, id: { not: id } }
      });
      if (slugExists) {
        return res.status(409).json({ error: "Slug already exists in this tenant" });
      }
    }

    // Validate VPN settings if provided
    if (settings?.security?.vpnDetection) {
      const vpnSettings = settings.security.vpnDetection;
      
      // Validate thresholds
      if (vpnSettings.blockThreshold !== undefined && (vpnSettings.blockThreshold < 0 || vpnSettings.blockThreshold > 100)) {
        return res.status(400).json({ error: "Block threshold must be between 0 and 100" });
      }
      
      if (vpnSettings.challengeThreshold !== undefined && (vpnSettings.challengeThreshold < 0 || vpnSettings.challengeThreshold > 100)) {
        return res.status(400).json({ error: "Challenge threshold must be between 0 and 100" });
      }
      
      // Ensure block threshold is higher than challenge threshold
      if (vpnSettings.blockThreshold !== undefined && vpnSettings.challengeThreshold !== undefined && 
          vpnSettings.blockThreshold <= vpnSettings.challengeThreshold) {
        return res.status(400).json({ error: "Block threshold must be higher than challenge threshold" });
      }
      
      // Validate custom message length
      if (vpnSettings.customMessage && vpnSettings.customMessage.length > 500) {
        return res.status(400).json({ error: "Custom message must be 500 characters or less" });
      }
      
      console.log('✅ [SURVEY] VPN settings validated:', {
        surveyId: id,
        enabled: vpnSettings.enabled,
        blockThreshold: vpnSettings.blockThreshold,
        challengeThreshold: vpnSettings.challengeThreshold
      });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (slug !== undefined) updateData.slug = slug?.trim();
    if (defaultLanguage !== undefined) updateData.defaultLanguage = defaultLanguage;
    if (settings !== undefined) updateData.settings = settings;

    const survey = await prisma.survey.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { pages: true, questions: true, sessions: true }
        }
      }
    });

    return res.json({ survey });
  } catch (error) {
    console.error("Error updating survey:", error);
    return res.status(500).json({ error: "Failed to update survey" });
  }
});

/**
 * DELETE /surveys/:id
 * Delete a survey (only if DRAFT status)
 * Requires: SB access with MANAGER role
 */
router.delete("/:id", requireSurveyBuilder("MANAGER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    const survey = await prisma.survey.findFirst({
      where: { id, tenantId }
    });

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    if (survey.status !== SurveyStatus.DRAFT) {
      return res.status(400).json({ 
        error: "Only draft surveys can be deleted",
        currentStatus: survey.status
      });
    }

    await prisma.survey.delete({
      where: { id }
    });

    return res.json({ message: "Survey deleted successfully" });
  } catch (error) {
    console.error("Error deleting survey:", error);
    return res.status(500).json({ error: "Failed to delete survey" });
  }
});

/**
 * POST /surveys/:id/publish
 * Publish a survey (change status from DRAFT to PUBLISHED)
 * Requires: SB access with MANAGER role
 */
router.post("/:id/publish", requireSurveyBuilder("MANAGER"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    const survey = await prisma.survey.findFirst({
      where: { id, tenantId },
      include: {
        pages: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    if (survey.status !== SurveyStatus.DRAFT) {
      return res.status(400).json({ 
        error: "Only draft surveys can be published",
        currentStatus: survey.status
      });
    }

    // Basic validation: survey must have at least one page with one question
    if (survey.pages.length === 0) {
      return res.status(400).json({ error: "Survey must have at least one page to publish" });
    }

    const hasQuestions = survey.pages.some(page => page.questions.length > 0);
    if (!hasQuestions) {
      return res.status(400).json({ error: "Survey must have at least one question to publish" });
    }

    const updatedSurvey = await prisma.survey.update({
      where: { id },
      data: { 
        status: SurveyStatus.PUBLISHED,
        version: { increment: 1 }
      },
      include: {
        _count: {
          select: { pages: true, questions: true, sessions: true }
        }
      }
    });

    return res.json({ 
      survey: updatedSurvey,
      message: "Survey published successfully"
    });
  } catch (error) {
    console.error("Error publishing survey:", error);
    return res.status(500).json({ error: "Failed to publish survey" });
  }
});

/**
 * POST /surveys/:id/duplicate
 * Create a copy of an existing survey
 * Requires: SB access with EDITOR role
 */
router.post("/:id/duplicate", requireSurveyBuilder("EDITOR"), async (req: any, res: any) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = req.user?.userId || (req as any).userId;
    const { id } = req.params;
    const { title } = req.body;

    const originalSurvey = await prisma.survey.findFirst({
      where: { id, tenantId },
      include: {
        pages: {
          include: {
            questions: {
              include: {
                options: true,
                items: true,
                scales: true
              }
            }
          }
        },
        expressions: true,
        pageJumps: true,
        questionJumps: true
      }
    });

    if (!originalSurvey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    const newSurvey = await prisma.$transaction(async (tx) => {
      // Create new survey
      const survey = await tx.survey.create({
        data: {
          tenantId,
          title: title || `${originalSurvey.title} (Copy)`,
          description: originalSurvey.description,
          defaultLanguage: originalSurvey.defaultLanguage,
          settings: originalSurvey.settings || {},
          createdByUserId: userId,
          status: SurveyStatus.DRAFT
        },
        include: {
          _count: {
            select: { pages: true, questions: true, sessions: true }
          }
        }
      });

      // TODO: Copy pages, questions, expressions, etc.
      // This would be a complex operation requiring mapping of IDs
      // For now, just return the empty survey

      return survey;
    });

    return res.status(201).json({ 
      survey: newSurvey,
      message: "Survey duplicated successfully. Content duplication coming soon."
    });
  } catch (error) {
    console.error("Error duplicating survey:", error);
    return res.status(500).json({ error: "Failed to duplicate survey" });
  }
});

export default router;
