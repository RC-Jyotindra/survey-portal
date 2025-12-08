import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  createOrUpdateTarget,
  getTarget,
  updateTarget,
  deleteTarget,
  getTargetStats
} from './index';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Survey Target routes
router.post('/:surveyId/target', createOrUpdateTarget);
router.get('/:surveyId/target', getTarget);
router.put('/:surveyId/target', updateTarget);
router.delete('/:surveyId/target', deleteTarget);
router.get('/:surveyId/target/stats', getTargetStats);

export default router;

