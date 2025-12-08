/**
 * Survey Settings Routes
 * 
 * Provides survey settings information to the frontend before session starts
 * - GET /api/survey-settings/:slug - Get survey settings for a collector slug (PUBLIC)
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { simpleAuthMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Note: No authentication middleware applied - this is a PUBLIC endpoint
// The tenant ID is determined from the survey slug, not from headers

/**
 * Get survey settings for a collector slug
 * GET /api/survey-settings/:slug
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    console.log(`🔧 [SURVEY_SETTINGS] Getting settings for slug: ${slug} (PUBLIC ACCESS)`);

    // First, let's check if any collectors exist with this slug
    const allCollectorsWithSlug = await prisma.surveyCollector.findMany({
      where: { slug },
      select: { id: true, slug: true, tenantId: true, status: true }
    });
    console.log(`🔧 [SURVEY_SETTINGS] All collectors with slug '${slug}':`, allCollectorsWithSlug);

    // Find the collector by slug (no tenant ID filter - this is public access)
    const collector = await prisma.surveyCollector.findFirst({
      where: {
        slug,
        status: 'active'
      },
      include: {
        survey: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            settings: true
          }
        }
      }
    });

    if (!collector) {
      console.log(`❌ [SURVEY_SETTINGS] Collector not found for slug: ${slug}`);
      return res.status(404).json({ error: 'Survey not found' });
    }

    // Allow both PUBLISHED and DRAFT surveys for testing
    if (collector.survey.status !== 'PUBLISHED' && collector.survey.status !== 'DRAFT') {
      console.log(`❌ [SURVEY_SETTINGS] Survey not available: ${collector.survey.status}`);
      return res.status(404).json({ error: 'Survey not available' });
    }
    
    console.log(`✅ [SURVEY_SETTINGS] Survey found with status: ${collector.survey.status}`);

    const settings = collector.survey.settings as any || {};
    const security = settings?.security || {};
    const responses = settings?.responses || {};

    // Extract relevant settings for frontend
    const surveySettings = {
      // Basic survey info
      surveyId: collector.survey.id,
      tenantId: collector.tenantId, // Include tenant ID for runtime endpoints
      title: collector.survey.title,
      description: collector.survey.description,
      
      // Security settings
      security: {
        passwordProtected: security.passwordProtected || false,
        referralWebsite: security.referralWebsite || false,
        surveyAccess: security.surveyAccess || 'PUBLIC'
      },
      
      // Response settings
      responses: {
        surveyAvailability: responses.surveyAvailability || 'open',
        surveyStartDate: responses.surveyStartDate,
        surveyStartTime: responses.surveyStartTime,
        surveyEndDate: responses.surveyEndDate,
        surveyEndTime: responses.surveyEndTime,
        backButton: responses.backButton !== false, // Default to true
        allowFinishLater: responses.allowFinishLater !== false, // Default to true
        customErrorMessages: responses.customErrorMessages || false,
        customErrorMessageText: responses.customErrorMessageText
      },
      
      // UI settings
      ui: {
        progressBar: settings?.progressBar !== false,
        showQuestionNumbers: settings?.showQuestionNumbers !== false,
        showPageNumbers: settings?.showPageNumbers !== false,
        theme: settings?.theme || 'default'
      },
      
      // Post-survey settings
      postSurvey: {
        redirectUrl: settings?.postSurvey?.redirectUrl,
        thankYouEmail: settings?.postSurvey?.thankYouEmail || false,
        completionMessage: settings?.postSurvey?.completionMessage,
        showResults: settings?.postSurvey?.showResults || false
      },
      
      // Collector info
      collector: {
        id: collector.id,
        type: collector.type,
        opensAt: collector.opensAt,
        closesAt: collector.closesAt
      }
    };

    console.log(`✅ [SURVEY_SETTINGS] Settings retrieved for survey: ${collector.survey.id}`);
    console.log(`🔧 [SURVEY_SETTINGS] Security settings:`, {
      passwordProtected: surveySettings.security.passwordProtected,
      referralWebsite: surveySettings.security.referralWebsite,
      surveyAccess: surveySettings.security.surveyAccess
    });

    res.json(surveySettings);

  } catch (error) {
    console.error('❌ [SURVEY_SETTINGS] Error getting survey settings:', error);
    res.status(500).json({ error: 'Failed to get survey settings' });
  }
});

export default router;
