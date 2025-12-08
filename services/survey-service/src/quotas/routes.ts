import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  createQuotaPlan,
  generateQuotaPlan,
  getQuotaPlans,
  getQuotaPlan,
  updateQuotaPlan,
  deleteQuotaPlan,
  createQuotaBucket,
  updateQuotaBucket,
  deleteQuotaBucket,
  getQuotaStats
} from './index';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Quota Plan routes
router.post('/:surveyId/quotas', createQuotaPlan);
router.post('/:surveyId/quotas/generate', generateQuotaPlan);
router.get('/:surveyId/quotas', getQuotaPlans);
router.get('/:surveyId/quotas/:planId', getQuotaPlan);
router.put('/:surveyId/quotas/:planId', updateQuotaPlan);
router.delete('/:surveyId/quotas/:planId', deleteQuotaPlan);
router.get('/:surveyId/quotas/stats', getQuotaStats);

// Quota Bucket routes
router.post('/:surveyId/quotas/:planId/buckets', createQuotaBucket);
router.put('/:surveyId/quotas/:planId/buckets/:bucketId', updateQuotaBucket);
router.delete('/:surveyId/quotas/:planId/buckets/:bucketId', deleteQuotaBucket);

export default router;

