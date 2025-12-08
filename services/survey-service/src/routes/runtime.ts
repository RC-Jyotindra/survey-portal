/**
 * Runtime Routes
 * 
 * Survey runtime endpoints for respondents:
 * - POST /runtime/start - Start a new session
 * - GET /runtime/:sessionId/pages/:pageId/layout - Get page layout
 * - POST /runtime/:sessionId/answers - Submit answers
 * - POST /runtime/:sessionId/complete - Complete session
 * - POST /runtime/:sessionId/terminate - Terminate session
 * - GET /runtime/:sessionId/resume - Resume session from where user left off
 * - GET /runtime/:sessionId/status - Get session status
 */

import { Router } from 'express';
import {
  startSession,
  getPageLayout,
  submitAnswers,
  completeSession,
  terminateSession,
  getSessionStatus,
  resumeSession
} from '../controllers/runtime.controller';

const router = Router();

/**
 * Start a new survey session
 * POST /runtime/start?slug=:slug[&t=:token]
 */
router.post('/start', startSession);

/**
 * Get page layout for rendering
 * GET /runtime/:sessionId/pages/:pageId/layout
 */
router.get('/:sessionId/pages/:pageId/layout', getPageLayout);

/**
 * Submit answers and get next page
 * POST /runtime/:sessionId/answers
 */
router.post('/:sessionId/answers', submitAnswers);

/**
 * Complete a session
 * POST /runtime/:sessionId/complete
 */
router.post('/:sessionId/complete', completeSession);

/**
 * Terminate a session
 * POST /runtime/:sessionId/terminate
 */
router.post('/:sessionId/terminate', terminateSession);

/**
 * Resume a session from where user left off
 * GET /runtime/:sessionId/resume
 */
router.get('/:sessionId/resume', resumeSession);

/**
 * Get session status
 * GET /runtime/:sessionId/status
 */
router.get('/:sessionId/status', getSessionStatus);

export default router;
