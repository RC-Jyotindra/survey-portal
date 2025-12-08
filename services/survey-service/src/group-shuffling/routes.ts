import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getShuffledQuestions,
  previewShuffledOrder,
  getGroupStats
} from './index';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Group Shuffling routes
router.get('/:surveyId/pages/:pageId/shuffled-questions', getShuffledQuestions);
router.post('/:surveyId/pages/:pageId/preview-shuffle', previewShuffledOrder);
router.get('/:surveyId/pages/:pageId/group-stats', getGroupStats);

export default router;
