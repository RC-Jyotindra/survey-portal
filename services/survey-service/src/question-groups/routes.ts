import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  createQuestionGroup,
  getQuestionGroups,
  getQuestionGroup,
  updateQuestionGroup,
  deleteQuestionGroup,
  addQuestionToGroup,
  removeQuestionFromGroup,
  reorderGroupQuestions,
  updatePageGroupOrder,
  getPageGroupOrder
} from './index';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Question Group routes
router.post('/:surveyId/pages/:pageId/groups', createQuestionGroup);
router.get('/:surveyId/pages/:pageId/groups', getQuestionGroups);
router.get('/:surveyId/pages/:pageId/groups/:groupId', getQuestionGroup);
router.put('/:surveyId/pages/:pageId/groups/:groupId', updateQuestionGroup);
router.delete('/:surveyId/pages/:pageId/groups/:groupId', deleteQuestionGroup);

// Question Group Management routes
router.post('/:surveyId/pages/:pageId/groups/:groupId/questions', addQuestionToGroup);
router.delete('/:surveyId/pages/:pageId/groups/:groupId/questions/:questionId', removeQuestionFromGroup);
router.put('/:surveyId/pages/:pageId/groups/:groupId/questions/reorder', reorderGroupQuestions);

// Page Group Order (Shuffling) routes
router.get('/:surveyId/pages/:pageId/group-order', getPageGroupOrder);
router.put('/:surveyId/pages/:pageId/group-order', updatePageGroupOrder);

export default router;

