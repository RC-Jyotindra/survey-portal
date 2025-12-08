import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  assignQuota,
  releaseQuota,
  completeSession,
  getQuotaStatus,
  checkSurveyAvailability
} from './index';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Runtime Quota Management routes
router.post('/:sessionId/quota/assign', assignQuota);
router.post('/:sessionId/quota/release', releaseQuota);
router.get('/:sessionId/quota/status', getQuotaStatus);
router.post('/:sessionId/complete', completeSession);

// Survey Availability routes
router.get('/:surveyId/availability', checkSurveyAvailability);

export default router;

