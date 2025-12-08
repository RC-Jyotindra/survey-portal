/**
 * Collectors Routes
 * 
 * Collector management endpoints for admins:
 * - POST /authoring/surveys/:surveyId/collectors - Create collector
 * - GET /authoring/surveys/:surveyId/collectors - List collectors
 * - GET /authoring/collectors/:collectorId - Get collector
 * - PUT /authoring/collectors/:collectorId - Update collector
 * - DELETE /authoring/collectors/:collectorId - Delete collector
 * - GET /authoring/collectors/:collectorId/stats - Get collector stats
 * - POST /authoring/collectors/:collectorId/invites - Create invites
 * - GET /authoring/collectors/:collectorId/invites - List invites
 * - GET /authoring/collectors/:collectorId/invites/stats - Get invite stats
 * - POST /authoring/invites/:inviteId/revoke - Revoke invite
 * - POST /authoring/invites/:inviteId/extend - Extend invite
 * - POST /authoring/invites/:inviteId/resend - Resend invite
 * - POST /authoring/collectors/:collectorId/invites/bulk-revoke - Bulk revoke
 * - GET /authoring/collectors/:collectorId/invites/export - Export invites
 */

import { Router } from 'express';
import { simpleAuthMiddleware } from '../middleware/auth';
import {
  createCollectorHandler,
  updateCollectorHandler,
  deleteCollectorHandler,
  getCollectorsHandler,
  getCollectorHandler,
  getCollectorStatsHandler,
  getCollectorAnalytics,
  getDetailedResponses,
  createInvitesHandler,
  getInvitesHandler,
  getInviteStatsHandler,
  revokeInviteHandler,
  extendInviteHandler,
  resendInviteHandler,
  bulkRevokeInvitesHandler,
  exportInvitesHandler,
  exportCollectorResponsesHandler,
  exportCollectorSummaryHandler,
  exportCollectorSummaryPdfHandler,
  exportCollectorIndividualResponsesPdfHandler
} from '../controllers/collectors.controller';

const router = Router();

// Apply authentication middleware to all routes
router.use(simpleAuthMiddleware);

/**
 * Create a new collector
 * POST /authoring/surveys/:surveyId/collectors
 */
router.post('/surveys/:surveyId/collectors', createCollectorHandler);

/**
 * Get collectors for a survey
 * GET /authoring/surveys/:surveyId/collectors
 */
router.get('/surveys/:surveyId/collectors', getCollectorsHandler);

/**
 * Get a single collector
 * GET /authoring/collectors/:collectorId
 */
router.get('/collectors/:collectorId', getCollectorHandler);

/**
 * Update a collector
 * PUT /authoring/collectors/:collectorId
 */
router.put('/collectors/:collectorId', updateCollectorHandler);

/**
 * Delete a collector
 * DELETE /authoring/collectors/:collectorId
 */
router.delete('/collectors/:collectorId', deleteCollectorHandler);

/**
 * Get collector statistics
 * GET /authoring/collectors/:collectorId/stats
 */
router.get('/collectors/:collectorId/stats', getCollectorStatsHandler);

/**
 * Get comprehensive collector analytics
 * GET /authoring/collectors/:collectorId/analytics
 */
router.get('/collectors/:collectorId/analytics', getCollectorAnalytics);

/**
 * Get detailed individual responses for a collector
 * GET /authoring/collectors/:collectorId/detailed-responses
 */
router.get('/collectors/:collectorId/detailed-responses', getDetailedResponses);

/**
 * Create invites for a single-use collector
 * POST /authoring/collectors/:collectorId/invites
 */
router.post('/collectors/:collectorId/invites', createInvitesHandler);

/**
 * Get invites for a collector
 * GET /authoring/collectors/:collectorId/invites
 */
router.get('/collectors/:collectorId/invites', getInvitesHandler);

/**
 * Get invite statistics
 * GET /authoring/collectors/:collectorId/invites/stats
 */
router.get('/collectors/:collectorId/invites/stats', getInviteStatsHandler);

/**
 * Revoke an invite
 * POST /authoring/invites/:inviteId/revoke
 */
router.post('/invites/:inviteId/revoke', revokeInviteHandler);

/**
 * Extend an invite
 * POST /authoring/invites/:inviteId/extend
 */
router.post('/invites/:inviteId/extend', extendInviteHandler);

/**
 * Resend an invite
 * POST /authoring/invites/:inviteId/resend
 */
router.post('/invites/:inviteId/resend', resendInviteHandler);

/**
 * Bulk revoke invites
 * POST /authoring/collectors/:collectorId/invites/bulk-revoke
 */
router.post('/collectors/:collectorId/invites/bulk-revoke', bulkRevokeInvitesHandler);

/**
 * Export invites to CSV
 * GET /authoring/collectors/:collectorId/invites/export
 */
router.get('/collectors/:collectorId/invites/export', exportInvitesHandler);


router.get('/collectors/:collectorId/responses/export', exportCollectorResponsesHandler);

/**
 * Export collector summary to CSV
 * GET /authoring/collectors/:collectorId/summary/export
 */
router.get('/collectors/:collectorId/summary/export', exportCollectorSummaryHandler);

/**
 * Export collector summary to PDF
 * GET /authoring/collectors/:collectorId/summary/export-pdf
 */
router.get('/collectors/:collectorId/summary/export-pdf', exportCollectorSummaryPdfHandler);

/**
 * Export individual responses to PDF (one page per response)
 * GET /authoring/collectors/:collectorId/responses/export-pdf
 */
router.get('/collectors/:collectorId/responses/export-pdf', exportCollectorIndividualResponsesPdfHandler);


export default router;

