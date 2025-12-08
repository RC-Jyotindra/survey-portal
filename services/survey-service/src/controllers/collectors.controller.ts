/**
 * Collectors Controller
 * 
 * Handles collector management endpoints:
 * - Create collectors
 * - Update collectors
 * - Delete collectors
 * - List collectors
 * - Get collector stats
 * - Manage invites
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  createCollector,
  updateCollector, 
  deleteCollector, 
  getCollectors, 
  getCollector, 
  getCollectorStats 
} from '../collectors/createCollector';
import {
  createInvites,
  getInvites,
  getInviteStats,
  revokeInvite,
  extendInvite,
  resendInvite,
  bulkRevokeInvites,
  exportInvites 
} from '../collectors/invites';

const prisma = new PrismaClient();

const MATRIX_QUESTION_TYPES: string[] = ['MATRIX_SINGLE', 'MATRIX_MULTIPLE', 'BIPOLAR_MATRIX', 'LIKERT_SCALE'];

const isMatrixQuestionType = (type?: string | null) => !!type && MATRIX_QUESTION_TYPES.includes(type);

function formatMatrixAnswer(jsonValue: any, question: any): string {
  try {
    if (!jsonValue || typeof jsonValue !== 'object') {
      return 'No response provided';
    }

    const items = question?.items || [];
    const scales = question?.scales || [];

    const itemMap = new Map(items.map((item: any) => [String(item.id), item.label]));
    const scaleMap = new Map(scales.map((scale: any) => [String(scale.id), scale.label]));

    const entries = Object.entries(jsonValue).map(([itemId, value]) => {
      const itemLabel = itemMap.get(String(itemId)) || String(itemId);

      if (Array.isArray(value)) {
        if (value.length === 0) {
          return `${itemLabel}: No selection`;
        }
        const labels = value.map((val) => scaleMap.get(String(val)) || String(val));
        return `${itemLabel}: [${labels.join(', ')}]`;
      }

      if (value === null || value === undefined || value === '') {
        return `${itemLabel}: No selection`;
      }

      const scaleLabel = scaleMap.get(String(value)) || String(value);
      return `${itemLabel}: ${scaleLabel}`;
    });

    return entries.length ? entries.join(' | ') : 'No response provided';
  } catch (error) {
    console.error('Error formatting matrix/likert answer:', error);
    return 'Error formatting response';
  }
}

/**
 * Format SIDE_BY_SIDE_MATRIX answer data into human-readable format
 */
function formatSideBySideMatrixAnswer(jsonValue: any, question: any): string {
  try {
    if (!jsonValue || typeof jsonValue !== 'object') {
      return 'No response provided';
    }

    const matrixTables = question.config?.matrixTables || [];
    const items = question.items || [];
    
    // Create lookup maps for better performance
    const itemMap = new Map(items.map((item: any) => [item.id, item.label]));
    const tableMap = new Map(matrixTables.map((table: any) => [table.id, table.label]));

    const formattedResponses: string[] = [];

    // Process each item's responses
    for (const [itemId, itemResponses] of Object.entries(jsonValue)) {
      const itemLabel = itemMap.get(itemId) || `Item ${itemId}`;
      
      if (typeof itemResponses === 'object' && itemResponses !== null) {
        const tableResponses: string[] = [];
        
        // Process each table's response for this item
        for (const [tableId, rating] of Object.entries(itemResponses)) {
          const tableLabel = tableMap.get(tableId) || `Table ${tableId}`;
          if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
            tableResponses.push(`${tableLabel}: ${rating}`);
          }
        }
        
        if (tableResponses.length > 0) {
          formattedResponses.push(`${itemLabel}: ${tableResponses.join(', ')}`);
        } else {
          formattedResponses.push(`${itemLabel}: No response`);
        }
      }
    }

    return formattedResponses.length > 0 
      ? formattedResponses.join(' | ') 
      : 'No responses provided';
  } catch (error) {
    console.error('Error formatting side-by-side matrix answer:', error);
    return 'Error formatting response';
  }
}

/**
 * Format CONJOINT answer data into human-readable format
 */
function formatConjointAnswer(jsonValue: any, question: any): string {
  try {
    if (!jsonValue || typeof jsonValue !== 'object') {
      return 'No response provided';
    }

    const config = question.config || {};
    const profiles = config.profiles || [];
    const attributes = config.attributes || [];
    
    // Create lookup maps
    const profileMap = new Map(profiles.map((profile: any) => [profile.id, profile]));
    const attributeMap = new Map(attributes.map((attr: any) => [attr.id, attr]));
    
    const taskResults: string[] = [];
    
    // Process each task
    Object.keys(jsonValue).forEach(key => {
      if (key.startsWith('task') && jsonValue[key]?.selectedProfileId) {
        const taskNumber = parseInt(key.replace('task', ''));
        const selectedProfileId = jsonValue[key].selectedProfileId;
        
        if (selectedProfileId === 'none') {
          taskResults.push(`Task ${taskNumber}: None of these options`);
        } else {
          const profile = profileMap.get(selectedProfileId);
          if (profile) {
            // Build attribute string
            const attributeValues: string[] = [];
            Object.entries((profile as any).combination || {}).forEach(([attrId, value]) => {
              const attribute = attributeMap.get(attrId);
              if (attribute) {
                attributeValues.push(`${(attribute as any).name}: ${value}`);
              }
            });
            
            const profileName = (profile as any).name || `Profile ${selectedProfileId}`;
            const attributesStr = attributeValues.length > 0 ? ` (${attributeValues.join(', ')})` : '';
            taskResults.push(`Task ${taskNumber}: ${profileName}${attributesStr}`);
          } else {
            taskResults.push(`Task ${taskNumber}: Unknown profile (${selectedProfileId})`);
          }
        }
      }
    });
    
    return taskResults.length > 0 ? taskResults.join(' | ') : 'No tasks completed';
    
  } catch (error) {
    console.error('Error formatting conjoint answer:', error);
    return 'Error formatting response';
  }
}

/**
 * Create a new collector
 */
export async function createCollectorHandler(req: Request, res: Response) {
  try {
    const { surveyId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!surveyId) {
      return res.status(400).json({ error: 'Survey ID is required' });
    }

    const {
      type,
      name,
      slug,
      opensAt,
      closesAt,
      maxResponses,
      allowMultiplePerDevice,
      allowTest
    } = req.body;

    if (!type || !name) {
      return res.status(400).json({ error: 'Type and name are required' });
    }

    const request = {
      tenantId,
      surveyId,
      type,
      name,
      slug,
      opensAt: opensAt ? new Date(opensAt) : undefined,
      closesAt: closesAt ? new Date(closesAt) : undefined,
      maxResponses,
      allowMultiplePerDevice,
      allowTest
    };

    const collector = await createCollector(prisma, request);

    res.status(201).json(collector);

  } catch (error) {
    console.error('Create collector error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create collector' });
  }
}

/**
 * Update a collector
 */
export async function updateCollectorHandler(req: Request, res: Response) {
  try {
    const { collectorId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!collectorId) {
      return res.status(400).json({ error: 'Collector ID is required' });
    }

    const {
      name,
      slug,
      opensAt,
      closesAt,
      maxResponses,
      allowMultiplePerDevice,
      allowTest
    } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (opensAt !== undefined) updates.opensAt = opensAt ? new Date(opensAt) : null;
    if (closesAt !== undefined) updates.closesAt = closesAt ? new Date(closesAt) : null;
    if (maxResponses !== undefined) updates.maxResponses = maxResponses;
    if (allowMultiplePerDevice !== undefined) updates.allowMultiplePerDevice = allowMultiplePerDevice;
    if (allowTest !== undefined) updates.allowTest = allowTest;

    const collector = await updateCollector(prisma, collectorId, tenantId, updates);

    res.json(collector);

  } catch (error) {
    console.error('Update collector error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update collector' });
  }
}

/**
 * Delete a collector
 */
export async function deleteCollectorHandler(req: Request, res: Response) {
  try {
    const { collectorId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!collectorId) {
      return res.status(400).json({ error: 'Collector ID is required' });
    }

    await deleteCollector(prisma, collectorId, tenantId);

    res.json({ success: true });

  } catch (error) {
    console.error('Delete collector error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete collector' });
  }
}

/**
 * Get collectors for a survey
 */
export async function getCollectorsHandler(req: Request, res: Response) {
  try {
    const { surveyId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!surveyId) {
      return res.status(400).json({ error: 'Survey ID is required' });
    }

    const collectors = await getCollectors(prisma, surveyId, tenantId);

    res.json(collectors);

  } catch (error) {
    console.error('Get collectors error:', error);
    res.status(500).json({ error: 'Failed to get collectors' });
  }
}

/**
 * Get a single collector
 */
export async function getCollectorHandler(req: Request, res: Response) {
  try {
    const { collectorId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!collectorId) {
      return res.status(400).json({ error: 'Collector ID is required' });
    }

    const collector = await getCollector(prisma, collectorId, tenantId);

    if (!collector) {
      return res.status(404).json({ error: 'Collector not found' });
    }

    res.json(collector);

  } catch (error) {
    console.error('Get collector error:', error);
    res.status(500).json({ error: 'Failed to get collector' });
  }
}

/**
 * Get collector statistics
 */
export async function getCollectorStatsHandler(req: Request, res: Response) {
  try {
    const { collectorId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!collectorId) {
      return res.status(400).json({ error: 'Collector ID is required' });
    }

    const stats = await getCollectorStats(prisma, collectorId, tenantId);

    res.json(stats);

  } catch (error) {
    console.error('Get collector stats error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to get collector stats' });
  }
}

/**
 * Create invites for a single-use collector
 */
export async function createInvitesHandler(req: Request, res: Response) {
  try {
    const { collectorId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!collectorId) {
      return res.status(400).json({ error: 'Collector ID is required' });
    }

    const {
      emails,
      count,
      ttlHours,
      externalIds
    } = req.body;

    const request = {
      collectorId,
      tenantId,
      emails,
      count,
      ttlHours,
      externalIds
    };

    const result = await createInvites(prisma, request);

    res.status(201).json(result);

  } catch (error) {
    console.error('Create invites error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create invites' });
  }
}

/**
 * Get invites for a collector
 */
export async function getInvitesHandler(req: Request, res: Response) {
  try {
    const { collectorId } = req.params;
    const tenantId = req.user?.tenantId;
    const { status, limit, offset } = req.query;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!collectorId) {
      return res.status(400).json({ error: 'Collector ID is required' });
    }

    const options = {
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    };

    const invites = await getInvites(prisma, collectorId, tenantId, options);

    res.json(invites);

  } catch (error) {
    console.error('Get invites error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to get invites' });
  }
}

/**
 * Get invite statistics
 */
export async function getInviteStatsHandler(req: Request, res: Response) {
  try {
    const { collectorId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!collectorId) {
      return res.status(400).json({ error: 'Collector ID is required' });
    }

    const stats = await getInviteStats(prisma, collectorId, tenantId);

    res.json(stats);

  } catch (error) {
    console.error('Get invite stats error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to get invite stats' });
  }
}

/**
 * Revoke an invite
 */
export async function revokeInviteHandler(req: Request, res: Response) {
  try {
    const { inviteId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!inviteId) {
      return res.status(400).json({ error: 'Invite ID is required' });
    }

    await revokeInvite(prisma, inviteId, tenantId);

    res.json({ success: true });

  } catch (error) {
    console.error('Revoke invite error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to revoke invite' });
  }
}

/**
 * Extend an invite
 */
export async function extendInviteHandler(req: Request, res: Response) {
  try {
    const { inviteId } = req.params;
    const { additionalHours } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!inviteId) {
      return res.status(400).json({ error: 'Invite ID is required' });
    }

    if (!additionalHours || additionalHours <= 0) {
      return res.status(400).json({ error: 'Valid additional hours required' });
    }

    await extendInvite(prisma, inviteId, tenantId, additionalHours);

    res.json({ success: true });

  } catch (error) {
    console.error('Extend invite error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to extend invite' });
  }
}

/**
 * Resend an invite
 */
export async function resendInviteHandler(req: Request, res: Response) {
  try {
    const { inviteId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!inviteId) {
      return res.status(400).json({ error: 'Invite ID is required' });
    }

    const invite = await resendInvite(prisma, inviteId, tenantId);

    res.json(invite);

  } catch (error) {
    console.error('Resend invite error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to resend invite' });
  }
}

/**
 * Bulk revoke invites
 */
export async function bulkRevokeInvitesHandler(req: Request, res: Response) {
  try {
    const { collectorId } = req.params;
    const { inviteIds } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!collectorId) {
      return res.status(400).json({ error: 'Collector ID is required' });
    }

    if (!Array.isArray(inviteIds) || inviteIds.length === 0) {
      return res.status(400).json({ error: 'Array of invite IDs required' });
    }

    const count = await bulkRevokeInvites(prisma, inviteIds, tenantId);

    res.json({ success: true, revokedCount: count });

  } catch (error) {
    console.error('Bulk revoke invites error:', error);
    res.status(500).json({ error: 'Failed to bulk revoke invites' });
  }
}

/**
 * Export invites to CSV
 */
export async function exportInvitesHandler(req: Request, res: Response) {
  try {
    const { collectorId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!collectorId) {
      return res.status(400).json({ error: 'Collector ID is required' });
    }

    const csvContent = await exportInvites(prisma, collectorId, tenantId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="invites-${collectorId}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export invites error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to export invites' });
  }
};

/**
 * Export collector responses to CSV (last 60 days)
 * GET /api/authoring/collectors/:collectorId/responses/export
 */
export async function exportCollectorResponsesHandler(req: Request, res: Response) {
  try {
    const { collectorId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!collectorId) {
      return res.status(400).json({ error: 'Collector ID is required' });
    }

    // Get collector and verify access
    const collector = await prisma.surveyCollector.findFirst({
      where: {
        id: collectorId,
        tenantId
      },
      include: {
        survey: true
      }
    });

    if (!collector) {
      return res.status(404).json({ error: 'Collector not found or access denied' });
    }

    const surveyId = collector.surveyId;

    // Calculate 60-day date filter
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    // Get all questions with their items, scales, and options, ordered by page and question index
    const allQuestions = await prisma.question.findMany({
      where: { surveyId, tenantId },
      include: {
        items: { select: { id: true, label: true, value: true }, orderBy: { index: 'asc' } },
        scales: { select: { id: true, label: true, value: true }, orderBy: { index: 'asc' } },
        options: { select: { id: true, value: true, labelTemplate: true }, orderBy: { index: 'asc' } },
        page: {
          select: {
            index: true
          }
        }
      }
    });

    // Sort questions by page index, then question index
    const questions = allQuestions.sort((a, b) => {
      const pageDiff = (a.page?.index || 0) - (b.page?.index || 0);
      if (pageDiff !== 0) return pageDiff;
      return a.index - b.index;
    });

    // Get all sessions for the collector from last 60 days
    const sessions = await prisma.surveySession.findMany({
      where: {
        surveyId,
        tenantId,
        collectorId,
        startedAt: {
          gte: sixtyDaysAgo
        }
      },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                variableName: true,
                titleTemplate: true,
                type: true,
                items: { select: { id: true, label: true, value: true } },
                scales: { select: { id: true, label: true, value: true } },
                options: { select: { id: true, value: true, labelTemplate: true } }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    // Helper function to sanitize text for CSV headers (remove newlines, limit length)
    const sanitizeHeader = (text: string, maxLength: number = 100): string => {
      if (!text) return `Question ${maxLength}`;
      return text
        .replace(/\n/g, ' ')
        .replace(/\r/g, '')
        .replace(/"/g, '""')
        .substring(0, maxLength)
        .trim();
    };

    // Create CSV headers with question text
    const headers = [
      'Row #',
      'Session ID',
      'Status',
      'Started At',
      'Completed At',
      'Duration (minutes)',
      'IP Address',
      ...questions.map(q => {
        const questionText = sanitizeHeader(q.titleTemplate || q.variableName || `Question ${q.index}`);
        if (isMatrixQuestionType(q.type)) {
          // For matrix questions, create columns for each item-scale combination
          const matrixColumns: string[] = [];
          q.items?.forEach((item: any) => {
            q.scales?.forEach((scale: any) => {
              const columnName = `${questionText} - ${item.label} - ${scale.label}`;
              matrixColumns.push(columnName);
            });
          });
          return matrixColumns;
        } else {
          return questionText;
        }
      }).flat()
    ];

    // Create mapping of question IDs to question objects for quick lookup
    const questionMap = new Map(questions.map(q => [q.id, q]));

    // Create CSV rows
    const rows: string[][] = [];
    
    sessions.forEach((session, sessionIndex) => {
      // Calculate duration in minutes
      const duration = session.finalizedAt && session.startedAt 
        ? Math.round((new Date(session.finalizedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
        : '';

      // Extract IP Address from meta
      // Extract IP address from meta
      const metaInfo = session.meta as any;
      // Try meta.ip first, then meta.geoData?.ip
      const ipAddress = metaInfo?.ip || metaInfo?.geoData?.ip || '';


      const row = [
        (sessionIndex + 1).toString(), // Row number
        session.id,
        session.status,
        session.startedAt.toISOString(),
        session.finalizedAt?.toISOString() || '',
        duration.toString(),
        ipAddress
      ];

      // Add answer data for each question
      questions.forEach(question => {
        const answer = session.answers.find(a => a.questionId === question.id);
        const questionData = questionMap.get(question.id);
        
        if (isMatrixQuestionType(question.type)) {
          // For matrix questions, create a cell for each item-scale combination
          question.items?.forEach((item: any) => {
            question.scales?.forEach((scale: any) => {
              if (answer?.jsonValue) {
                const matrixData = answer.jsonValue as Record<string, any>;
                const itemValue = matrixData[item.id];
                const isSelected = Array.isArray(itemValue) 
                  ? itemValue.includes(scale.id)
                  : itemValue === scale.id;
                row.push(isSelected ? '1' : '0');
              } else {
                row.push('0');
              }
            });
          });
        } else {
          // For other question types, use the formatted answer with label mapping
          let answerValue = '';
          if (answer) {
            if (answer.choices && answer.choices.length > 0) {
              // Map choice values to option labels
              if (questionData?.options && questionData.options.length > 0) {
                const optionMap = new Map(questionData.options.map((opt: any) => [opt.value, opt.labelTemplate]));
                const mappedChoices = answer.choices.map(choice => {
                  return optionMap.get(choice) || choice;
                });
                answerValue = mappedChoices.join(', ');
              } else {
                answerValue = answer.choices.join(', ');
              }
            } else if (answer.textValue) {
              answerValue = answer.textValue;
            } else if (answer.numericValue !== null) {
              answerValue = answer.numericValue.toString();
            } else if (answer.decimalValue !== null) {
              answerValue = answer.decimalValue.toString();
            } else if (answer.booleanValue !== null) {
              answerValue = answer.booleanValue ? 'Yes' : 'No';
            } else if (answer.emailValue) {
              answerValue = answer.emailValue;
            } else if (answer.phoneValue) {
              answerValue = answer.phoneValue;
            } else if (answer.urlValue) {
              answerValue = answer.urlValue;
            } else if (answer.dateValue) {
              answerValue = answer.dateValue.toISOString();
            } else if (answer.timeValue) {
              answerValue = answer.timeValue.toISOString();
            } else if (answer.fileUrls && answer.fileUrls.length > 0) {
              answerValue = answer.fileUrls.join(', ');
            } else if (answer.signatureUrl) {
              answerValue = answer.signatureUrl;
            } else if (answer.jsonValue) {
              // Try to map JSON value IDs to labels
              const jsonData = answer.jsonValue as any;
              if (typeof jsonData === 'object' && !Array.isArray(jsonData)) {
                // Helper to recursively map IDs to labels
                const mapIdsToLabels = (obj: any, itemMap?: Map<string, string>, scaleMap?: Map<string, string>): any => {
                  if (Array.isArray(obj)) {
                    return obj.map(item => mapIdsToLabels(item, itemMap, scaleMap));
                  } else if (obj && typeof obj === 'object') {
                    const mapped: any = {};
                    Object.keys(obj).forEach(key => {
                      const mappedKey = itemMap?.get(key) || key;
                      const value = obj[key];
                      
                      if (typeof value === 'string') {
                        // Check if it's a scale ID
                        mapped[mappedKey] = scaleMap?.get(value) || value;
                      } else if (typeof value === 'object' && value !== null) {
                        // Recursively map nested objects
                        mapped[mappedKey] = mapIdsToLabels(value, itemMap, scaleMap);
                      } else {
                        mapped[mappedKey] = value;
                      }
                    });
                    return mapped;
                  }
                  return obj;
                };

                const itemMap = questionData?.items 
                  ? new Map(questionData.items.map((item: any) => [item.id, item.label]))
                  : undefined;
                const scaleMap = questionData?.scales 
                  ? new Map(questionData.scales.map((scale: any) => [scale.id, scale.label]))
                  : undefined;

                const mappedJson = mapIdsToLabels(jsonData, itemMap, scaleMap);

                // Format as readable string
                const formatValue = (val: any, indent: string = ''): string => {
                  if (val === null || val === undefined) return '';
                  if (typeof val === 'string') return val;
                  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
                  if (Array.isArray(val)) {
                    return val.map(v => formatValue(v, indent)).join(', ');
                  }
                  if (typeof val === 'object') {
                    return Object.entries(val)
                      .map(([k, v]) => `${indent}${k}: ${formatValue(v, indent + '  ')}`)
                      .join(' | ');
                  }
                  return String(val);
                };

                answerValue = formatValue(mappedJson);
              } else {
                answerValue = JSON.stringify(jsonData);
              }
            }
          }
          row.push(answerValue);
        }
      });

      rows.push(row);
    });

    // Generate CSV content
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => {
        // Escape quotes and wrap in quotes
        const escaped = String(field).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','))
      .join('\n');

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="collector-${collectorId}-responses-${dateStr}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export collector responses error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to export collector responses' });
  }
}

/**
 * Export collector summary to CSV (aggregated statistics)
 * GET /api/authoring/collectors/:collectorId/summary/export
 */
export async function exportCollectorSummaryHandler(req: Request, res: Response) {
  try {
    const { collectorId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!collectorId) {
      return res.status(400).json({ error: 'Collector ID is required' });
    }

    // Import summary utilities
    const { SummaryAggregator } = await import('../lib/summary-aggregator.js');
    const { SummaryCsvBuilder } = await import('../lib/summary-csv-builder.js');

    // Get collector and verify access
    const collector = await prisma.surveyCollector.findFirst({
      where: {
        id: collectorId,
        tenantId
      },
      include: {
        survey: true
      }
    });

    if (!collector) {
      return res.status(404).json({ error: 'Collector not found or access denied' });
    }

    const surveyId = collector.surveyId;

    // Get all questions with their items, scales, and options, ordered by page and question index
    const allQuestions = await prisma.question.findMany({
      where: { surveyId, tenantId },
      include: {
        items: { select: { id: true, label: true, value: true }, orderBy: { index: 'asc' } },
        scales: { select: { id: true, label: true, value: true }, orderBy: { index: 'asc' } },
        options: { select: { id: true, value: true, labelTemplate: true }, orderBy: { index: 'asc' } },
        page: {
          select: {
            index: true
          }
        }
      }
    });

    // Sort questions by page index, then question index
    const questions = allQuestions.sort((a, b) => {
      const pageDiff = (a.page?.index || 0) - (b.page?.index || 0);
      if (pageDiff !== 0) return pageDiff;
      return a.index - b.index;
    });

    // Get all sessions for the collector
    const sessions = await prisma.surveySession.findMany({
      where: {
        surveyId,
        tenantId,
        collectorId
      },
      select: {
        id: true
      }
    });

    const totalSessions = sessions.length;
    const sessionIds = sessions.map(s => s.id);

    // Get all answers for these sessions
    const allAnswers = await prisma.answer.findMany({
      where: {
        surveyId,
        tenantId,
        sessionId: { in: sessionIds }
      },
      select: {
        questionId: true,
        choices: true,
        textValue: true,
        numericValue: true,
        booleanValue: true,
        jsonValue: true
      }
    });

    // Aggregate summary statistics
    const summaries = SummaryAggregator.aggregate(questions, allAnswers, totalSessions);

    // Build CSV content
    const surveyName = collector.survey.title || 'Survey';
    const collectorName = collector.name || `Collector ${collectorId.substring(0, 8)}`;
    const csvContent = SummaryCsvBuilder.build(surveyName, collectorName, summaries);

    // Send CSV response
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="collector-${collectorId}-summary-${dateStr}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export collector summary error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to export collector summary' });
  }
}

/**
 * Export collector summary to PDF (with charts and analytics)
 * GET /api/authoring/collectors/:collectorId/summary/export-pdf
 */
export async function exportCollectorSummaryPdfHandler(req: Request, res: Response) {
  try {
    const { collectorId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!collectorId) {
      return res.status(400).json({ error: 'Collector ID is required' });
    }

    // Import summary utilities
    const { SummaryAggregator } = await import('../lib/summary-aggregator.js');
    const { PdfBuilder } = await import('../lib/pdf-builder.js');

    // Get collector and verify access
    const collector = await prisma.surveyCollector.findFirst({
      where: {
        id: collectorId,
        tenantId
      },
      include: {
        survey: true
      }
    });

    if (!collector) {
      return res.status(404).json({ error: 'Collector not found or access denied' });
    }

    const surveyId = collector.surveyId;

    // Get all questions with their items, scales, and options, ordered by page and question index
    const allQuestions = await prisma.question.findMany({
      where: { surveyId, tenantId },
      include: {
        items: { select: { id: true, label: true, value: true }, orderBy: { index: 'asc' } },
        scales: { select: { id: true, label: true, value: true }, orderBy: { index: 'asc' } },
        options: { select: { id: true, value: true, labelTemplate: true }, orderBy: { index: 'asc' } },
        page: {
          select: {
            index: true
          }
        }
      }
    });

    // Sort questions by page index, then question index
    const questions = allQuestions.sort((a, b) => {
      const pageDiff = (a.page?.index || 0) - (b.page?.index || 0);
      if (pageDiff !== 0) return pageDiff;
      return a.index - b.index;
    });

    // Get all sessions for the collector
    const sessions = await prisma.surveySession.findMany({
      where: {
        surveyId,
        tenantId,
        collectorId
      },
      select: {
        id: true
      }
    });

    const totalSessions = sessions.length;
    const sessionIds = sessions.map(s => s.id);

    // Get all answers for these sessions
    const allAnswers = await prisma.answer.findMany({
      where: {
        surveyId,
        tenantId,
        sessionId: { in: sessionIds }
      },
      select: {
        questionId: true,
        choices: true,
        textValue: true,
        numericValue: true,
        booleanValue: true,
        jsonValue: true
      }
    });

    // Aggregate summary statistics
    const summaries = SummaryAggregator.aggregate(questions, allAnswers, totalSessions);

    // Generate PDF
    const surveyName = collector.survey.title || 'Survey';
    const collectorName = collector.name || `Collector ${collectorId.substring(0, 8)}`;
    
    const pdfBuffer = await PdfBuilder.generatePdf({
      surveyName,
      collectorName,
      summaries,
      generatedAt: new Date()
    });

    // Validate PDF buffer (handle both Buffer and Uint8Array)
    if (!pdfBuffer) {
      throw new Error('Generated PDF is null or undefined');
    }
    
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    
    if (buffer.length === 0) {
      throw new Error('Generated PDF is empty');
    }
    
    // Verify it's a valid PDF by checking header
    const header = buffer.slice(0, 4);
    const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
    if (!header.equals(pdfHeader)) {
      throw new Error('Generated file is not a valid PDF');
    }
    
    console.log('PDF validated successfully, size:', buffer.length, 'bytes');

    // Send PDF response
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="collector-${collectorId}-summary-${dateStr}.pdf"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);

  } catch (error) {
    console.error('Export collector summary PDF error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to export collector summary PDF' });
  }
}

/**
 * Export individual responses to PDF (one page per response)
 * GET /api/authoring/collectors/:collectorId/responses/export-pdf
 */
export async function exportCollectorIndividualResponsesPdfHandler(req: Request, res: Response) {
  try {
    const { collectorId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!collectorId) {
      return res.status(400).json({ error: 'Collector ID is required' });
    }

    // Import PDF builder
    const { IndividualResponsePdfBuilder } = await import('../lib/individual-response-pdf-builder.js');

    // Get collector and verify access
    const collector = await prisma.surveyCollector.findFirst({
      where: {
        id: collectorId,
        tenantId
      },
      include: {
        survey: true
      }
    });

    if (!collector) {
      return res.status(404).json({ error: 'Collector not found or access denied' });
    }

    const surveyId = collector.surveyId;

    // Get all sessions for this collector with answers
    const sessions = await prisma.surveySession.findMany({
      where: { 
        surveyId, 
        tenantId, 
        collectorId 
      },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                titleTemplate: true,
                type: true,
                items: {
                  select: {
                    id: true,
                    label: true
                  }
                },
                scales: {
                  select: {
                    id: true,
                    label: true
                  }
                },
                options: {
                  select: {
                    id: true,
                    value: true,
                    labelTemplate: true
                  }
                },
                page: {
                  select: {
                    id: true,
                    titleTemplate: true,
                    index: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    // Format responses for PDF
    const formattedResponses = sessions.map(session => {
      // Calculate duration in minutes
      const duration = session.finalizedAt && session.startedAt
        ? (new Date(session.finalizedAt).getTime() - new Date(session.startedAt).getTime()) / 1000 / 60
        : 0;

      // Get device info from meta
      const deviceInfo = session.meta as any;
      const device = deviceInfo?.device || 'Unknown';

      // Get IP address from meta (stored in meta JSON, not as direct property)
      const ipAddress = deviceInfo?.ipAddress || undefined;

      // Format answers
      const answers = session.answers.map(answer => {
        let answerValue = '';
        
        if (answer.choices && answer.choices.length > 0) {
          // Map choice values to option labels
          if (answer.question.options && answer.question.options.length > 0) {
            const optionMap = new Map(answer.question.options.map((opt: any) => [opt.value, opt.labelTemplate || opt.value]));
            const mappedChoices = answer.choices.map(choice => {
              return optionMap.get(choice) || choice;
            });
            answerValue = mappedChoices.join(', ');
          } else {
            answerValue = answer.choices.join(', ');
          }
        } else if (answer.textValue) {
          answerValue = answer.textValue;
        } else if (answer.numericValue !== null) {
          // For OPINION_SCALE, add category (NPS-like scoring)
          if (answer.question.type === 'OPINION_SCALE') {
            const score = answer.numericValue;
            let category = '';
            if (score >= 0 && score <= 6) category = ' (Detractor)';
            else if (score >= 7 && score <= 8) category = ' (Passive)';
            else if (score >= 9 && score <= 10) category = ' (Promoter)';
            answerValue = `${score}${category}`;
          } else {
            answerValue = answer.numericValue.toString();
          }
        } else if (answer.booleanValue !== null) {
          answerValue = answer.booleanValue ? 'Yes' : 'No';
        } else if (answer.emailValue) {
          answerValue = answer.emailValue;
        } else if (answer.phoneValue) {
          answerValue = answer.phoneValue;
        } else if (answer.urlValue) {
          answerValue = answer.urlValue;
        } else if (answer.dateValue) {
          const date = new Date(answer.dateValue);
          answerValue = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } else if (answer.timeValue) {
          const time = new Date(answer.timeValue);
          answerValue = time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
        } else if (answer.jsonValue) {
          // Handle matrix and other complex types
          if (isMatrixQuestionType(answer.question.type)) {
            answerValue = formatMatrixAnswer(answer.jsonValue, answer.question);
          } else {
            // For unknown complex types, just stringify
            answerValue = JSON.stringify(answer.jsonValue);
          }
        } else {
          answerValue = 'No answer provided';
        }

        return {
          questionId: answer.questionId,
          questionText: answer.question.titleTemplate || `Question ${answer.question.id}`,
          questionType: answer.question.type,
          answer: answerValue,
          pageTitle: answer.question.page?.titleTemplate || `Page ${answer.question.page?.index || 1}`
        };
      });

      return {
        sessionId: session.id,
        status: session.status,
        startedAt: session.startedAt,
        finalizedAt: session.finalizedAt,
        duration: duration,
        device: device,
        ipAddress: ipAddress,
        answers: answers
      };
    });

    // Generate PDF
    const surveyName = collector.survey.title || 'Survey';
    const collectorName = collector.name || `Collector ${collectorId.substring(0, 8)}`;
    
    const pdfBuffer = await IndividualResponsePdfBuilder.generatePdf({
      surveyName,
      collectorName,
      responses: formattedResponses,
      generatedAt: new Date()
    });

    // Validate PDF buffer
    if (!pdfBuffer) {
      throw new Error('Generated PDF is null or undefined');
    }
    
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    
    if (buffer.length === 0) {
      throw new Error('Generated PDF is empty');
    }
    
    // Verify it's a valid PDF
    const header = buffer.slice(0, 4);
    const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
    if (!header.equals(pdfHeader)) {
      throw new Error('Generated file is not a valid PDF');
    }
    
    console.log('Individual responses PDF validated successfully, size:', buffer.length, 'bytes');

    // Send PDF response
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="collector-${collectorId}-individual-responses-${dateStr}.pdf"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);

  } catch (error) {
    console.error('Export individual responses PDF error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to export individual responses PDF' });
  }
}

/**
 * Get comprehensive analytics for a collector
 * GET /api/authoring/collectors/:collectorId/analytics
 */
export const getCollectorAnalytics = async (req: Request, res: Response) => {
  try {
    const { collectorId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get collector and verify access
    const collector = await prisma.surveyCollector.findFirst({
      where: {
        id: collectorId,
        tenantId
      },
      include: {
        survey: true
      }
    });

    if (!collector) {
      return res.status(404).json({ error: 'Collector not found or access denied' });
    }

    const surveyId = collector.surveyId;

    // Get overview metrics
    const totalSessions = await prisma.surveySession.count({
      where: { surveyId, tenantId, collectorId }
    });

    const completedSessions = await prisma.surveySession.count({
      where: { surveyId, tenantId, collectorId, status: 'COMPLETED' }
    });

    const terminatedSessions = await prisma.surveySession.count({
      where: { surveyId, tenantId, collectorId, status: 'TERMINATED' }
    });

    const inProgressSessions = await prisma.surveySession.count({
      where: { surveyId, tenantId, collectorId, status: 'IN_PROGRESS' }
    });

    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    // Get average completion time
    const completedSessionsWithTime = await prisma.surveySession.findMany({
      where: { surveyId, tenantId, collectorId, status: 'COMPLETED' },
      select: { startedAt: true, finalizedAt: true }
    });

    const averageCompletionTime = completedSessionsWithTime.length > 0 
      ? completedSessionsWithTime.reduce((sum, session) => {
          const duration = session.finalizedAt && session.startedAt 
            ? (session.finalizedAt.getTime() - session.startedAt.getTime()) / (1000 * 60) // minutes
            : 0;
          return sum + duration;
        }, 0) / completedSessionsWithTime.length
      : 0;

    // Get quota status
    const quotaStatus = await prisma.quotaPlan.findMany({
      where: { surveyId, tenantId, state: 'OPEN' },
      include: {
        buckets: true
      }
    });

    const quotaStatusFormatted = quotaStatus.flatMap(plan => 
      plan.buckets.map(bucket => {
        const totalUsed = bucket.filledN + bucket.reservedN;
        const maxCapacity = bucket.targetN + bucket.maxOverfill;
        const percentage = maxCapacity > 0 ? (totalUsed / maxCapacity) * 100 : 0;
        
        return {
          planId: plan.id,
          planName: plan.name,
          bucketId: bucket.id,
          bucketLabel: bucket.label,
          targetN: bucket.targetN,
          filledN: bucket.filledN,
          reservedN: bucket.reservedN,
          maxOverfill: bucket.maxOverfill,
          totalUsed,
          maxCapacity,
          percentage,
          isFull: totalUsed >= maxCapacity,
          isNearFull: percentage >= 90
        };
      })
    );

    // Get session analytics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessionAnalytics = await prisma.surveySession.groupBy({
      by: ['startedAt'],
      where: {
        surveyId,
        tenantId,
        collectorId,
        startedAt: { gte: thirtyDaysAgo }
      },
      _count: { id: true }
    });

    const sessionAnalyticsFormatted = sessionAnalytics.map(day => ({
      date: day.startedAt.toISOString().split('T')[0],
      sessions: day._count.id,
      completed: 0, // We'll calculate this separately if needed
      terminated: 0
    }));

    // Get answer analytics
    const questions = await prisma.question.findMany({
      where: { surveyId, tenantId },
      select: { 
        id: true, 
        titleTemplate: true, 
        type: true,
        items: {
          select: { id: true, label: true }
        },
        scales: {
          select: { id: true, label: true }
        }
      }
    });

    const answerAnalytics = await Promise.all(
      questions.map(async (question) => {
        const answers = await prisma.answer.findMany({
          where: { 
            questionId: question.id,
            session: { surveyId, tenantId, collectorId }
          }
        });

        // Group answers by value
        const answerDistribution = new Map<string, number>();
        answers.forEach(answer => {
          let value = '';
          if (answer.choices && answer.choices.length > 0) {
            value = answer.choices.join(', ');
          } else if (answer.textValue) {
            value = answer.textValue;
          } else if (answer.numericValue !== null) {
            value = answer.numericValue.toString();
          } else if (answer.booleanValue !== null) {
            value = answer.booleanValue.toString();
          } else if (answer.jsonValue) {
            // Handle matrix and other complex answer types
            if (isMatrixQuestionType(question.type)) {
              value = formatMatrixAnswer(answer.jsonValue, question);
            } else {
              // For other jsonValue types, stringify
              value = JSON.stringify(answer.jsonValue);
            }
          } else {
            value = 'No answer';
          }
          
          answerDistribution.set(value, (answerDistribution.get(value) || 0) + 1);
        });

        const totalAnswers = answers.length;
        const distribution = Array.from(answerDistribution.entries()).map(([value, count]) => ({
          value,
          count,
          percentage: totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
        }));

        return {
          questionId: question.id,
          questionText: question.titleTemplate,
          questionType: question.type,
          totalAnswers,
          items: question.items,
          scales: question.scales,
          answerDistribution: distribution
        };
      })
    );

    // Get drop-off points
    const pages = await prisma.surveyPage.findMany({
      where: { surveyId, tenantId },
      orderBy: { index: 'asc' },
      select: { id: true, titleTemplate: true }
    });

    // For now, we'll create mock drop-off data since currentPageId doesn't exist in the schema
    // TODO: Implement proper drop-off tracking by adding currentPageId to SurveySession model
    const dropOffPoints = pages.map((page, index) => ({
      pageId: page.id,
      pageTitle: page.titleTemplate,
      sessionsReached: Math.floor(totalSessions * (1 - index * 0.1)), // Mock decreasing numbers
      sessionsDropped: Math.floor(totalSessions * 0.05), // Mock 5% drop-off
      dropOffRate: 5.0 // Mock 5% drop-off rate
    }));

    // Get device analytics (mock data for now - you can enhance this with actual device detection)
    const deviceAnalytics = {
      desktop: Math.floor(totalSessions * 0.6),
      mobile: Math.floor(totalSessions * 0.3),
      tablet: Math.floor(totalSessions * 0.08),
      unknown: Math.floor(totalSessions * 0.02)
    };

    // Get time analytics
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      sessions: Math.floor(Math.random() * 10) // Mock data - replace with actual hourly distribution
    }));

    const medianSessionDuration = averageCompletionTime * 0.8; // Mock calculation

    // Get individual response data for segregated analytics
    const individualResponses = await prisma.surveySession.findMany({
      where: { surveyId, tenantId, collectorId },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                titleTemplate: true,
                type: true,
                items: {
                  select: { id: true, label: true }
                },
                scales: {
                  select: { id: true, label: true }
                },
                page: {
                  select: {
                    id: true,
                    titleTemplate: true,
                    index: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: 100 // Limit to recent 100 responses for performance
    });

    // Format individual responses
    const formattedResponses = individualResponses.map(session => {
      const answers = session.answers.map(answer => {
        let displayValue = '';
        let rawData = null;
        
        if (answer.choices && answer.choices.length > 0) {
          displayValue = answer.choices.join(', ');
        } else if (answer.textValue) {
          displayValue = answer.textValue;
        } else if (answer.numericValue !== null) {
          displayValue = answer.numericValue.toString();
        } else if (answer.booleanValue !== null) {
          displayValue = answer.booleanValue ? 'Yes' : 'No';
        } else if (answer.emailValue) {
          displayValue = answer.emailValue;
        } else if (answer.phoneValue) {
          displayValue = answer.phoneValue;
        } else if (answer.urlValue) {
          displayValue = answer.urlValue;
        } else if (answer.dateValue) {
          displayValue = answer.dateValue.toLocaleDateString();
        } else if (answer.timeValue) {
          displayValue = answer.timeValue.toLocaleTimeString();
        } else if (answer.jsonValue) {
          // Handle JSON data (like CONTACT_FORM, MATRIX types, etc.)
          rawData = answer.jsonValue;
          
          if (typeof answer.jsonValue === 'object' && !Array.isArray(answer.jsonValue)) {
            // For CONTACT_FORM and other structured data
            const jsonObj = answer.jsonValue as Record<string, any>;
            if (jsonObj.name || jsonObj.email || jsonObj.phone) {
              displayValue = JSON.stringify(answer.jsonValue);
            }
            // For matrix/likert types
            else if (isMatrixQuestionType(answer.question.type)) {
              displayValue = formatMatrixAnswer(answer.jsonValue, answer.question);
            }
            // For other JSON objects
            else {
              displayValue = JSON.stringify(answer.jsonValue);
            }
          } else {
            displayValue = String(answer.jsonValue);
          }
        }

        return {
          questionId: answer.questionId,
          questionText: answer.question.titleTemplate,
          questionType: answer.question.type,
          pageTitle: answer.question.page?.titleTemplate || 'Unknown Page',
          pageOrder: answer.question.page?.index || 0,
          answer: displayValue,
          rawData: rawData,
          choices: answer.choices,
          textValue: answer.textValue,
          numericValue: answer.numericValue,
          booleanValue: answer.booleanValue,
          jsonValue: answer.jsonValue,
          createdAt: answer.createdAt,
          questionItems: answer.question.items,
          questionScales: answer.question.scales
        };
      });

      // Calculate session duration
      const duration = session.finalizedAt 
        ? Math.round((session.finalizedAt.getTime() - session.startedAt.getTime()) / 1000 / 60) // minutes
        : 0;

      // Get device info from meta
      const deviceInfo = session.meta as any;
      const device = deviceInfo?.device || 'Unknown';

      return {
        sessionId: session.id,
        status: session.status,
        startedAt: session.startedAt,
        finalizedAt: session.finalizedAt,
        duration: duration,
        device: device,
        answers: answers,
        answersCount: answers.length
      };
    });

    const analytics = {
      overview: {
        totalSessions,
        completedSessions,
        terminatedSessions,
        inProgressSessions,
        completionRate,
        averageCompletionTime,
        responseRate: 100 // Mock data
      },
      quotaStatus: quotaStatusFormatted,
      sessionAnalytics: sessionAnalyticsFormatted,
      answerAnalytics,
      dropOffPoints,
      deviceAnalytics,
      timeAnalytics: {
        hourlyDistribution,
        averageSessionDuration: averageCompletionTime,
        medianSessionDuration
      },
      individualResponses: formattedResponses
    };

    res.json(analytics);

  } catch (error) {
    console.error('Get collector analytics error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to get collector analytics' });
  }
};

/**
 * Get detailed individual responses for a collector
 * GET /api/authoring/collectors/:collectorId/detailed-responses
 */
export const getDetailedResponses = async (req: Request, res: Response) => {
  try {
    const { collectorId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get collector and verify access
    const collector = await prisma.surveyCollector.findFirst({
      where: {
        id: collectorId,
        tenantId
      },
      include: {
        survey: true
      }
    });

    if (!collector) {
      return res.status(404).json({ error: 'Collector not found or access denied' });
    }

    const surveyId = collector.surveyId;

    // Get all sessions for this collector with proper page information
    const sessions = await prisma.surveySession.findMany({
      where: { 
        surveyId, 
        tenantId, 
        collectorId 
      },
      include: {
        answers: {
          select: {
            id: true,
            textValue: true,
            numericValue: true,
            booleanValue: true,
            jsonValue: true,
            choices: true,
            dateValue: true,
            timeValue: true,
            questionId: true,
            question: {
              select: {
                id: true,
                titleTemplate: true,
                type: true,
                items: {
                  select: {
                    id: true,
                    label: true
                  }
                },
                page: {
                  select: {
                    id: true,
                    titleTemplate: true,
                    index: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    // Transform sessions into detailed response format
    const detailedResponses = sessions.map(session => {
      // Calculate completion time if session is completed
      let completionTime: number | undefined;
      if (session.status === 'COMPLETED' && session.finalizedAt && session.startedAt) {
        completionTime = (session.finalizedAt.getTime() - session.startedAt.getTime()) / (1000 * 60); // minutes
      }

      // Get termination details if session was terminated
      let terminationReason: string | undefined;
      let terminationQuestion: string | undefined;
      let terminationPage: string | undefined;

      if (session.status === 'TERMINATED') {
        // Try to get termination details from the last answer or session metadata
        const sessionAnswers = (session as any).answers || [];
        const lastAnswer = sessionAnswers[sessionAnswers.length - 1];
        if (lastAnswer) {
          terminationQuestion = lastAnswer.question.titleTemplate;
          terminationPage = lastAnswer.question.page?.titleTemplate || `Page ${lastAnswer.question.page?.index || 1}`;
        }
        terminationReason = 'Survey terminated by user'; // Default reason
      }

      // Transform answers
      const sessionAnswers = (session as any).answers || [];
      const answers = sessionAnswers.map((answer: any) => {
        let answerValue = '';
        
        if (answer.choices && answer.choices.length > 0) {
          answerValue = answer.choices.join(', ');
        } else if (answer.textValue) {
          answerValue = answer.textValue;
        } else if (answer.numericValue !== null) {
          answerValue = answer.numericValue.toString();
        } else if (answer.booleanValue !== null) {
          answerValue = answer.booleanValue.toString();
        } else if (answer.dateValue) {
          // Handle DATE and DATETIME questions (DATETIME uses dateValue)
          const date = new Date(answer.dateValue);
          // Check if it's a DATETIME question (has time component) or just DATE
          const questionType = answer.question?.type;
          if (questionType === 'DATETIME') {
            answerValue = date.toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            });
          } else {
            // DATE question - date only
            answerValue = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          }
        } else if (answer.timeValue) {
          // Handle TIME questions
          const time = new Date(answer.timeValue);
          answerValue = time.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        } else if (answer.timeValue) {
          // Handle TIME questions
          const time = new Date(answer.timeValue);
          answerValue = time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
        } else if (answer.jsonValue) {
          // Special formatting for SIDE_BY_SIDE_MATRIX
          if (answer.question.type === 'SIDE_BY_SIDE_MATRIX') {
            answerValue = formatSideBySideMatrixAnswer(answer.jsonValue, answer.question);
          } else if (answer.question.type === 'CONJOINT') {
            // For CONJOINT, format the response to show meaningful profile information
            answerValue = formatConjointAnswer(answer.jsonValue, answer.question);
          } else {
            answerValue = JSON.stringify(answer.jsonValue);
          }
        } else {
          answerValue = 'No answer provided';
        }

        return {
          questionId: answer.questionId,
          questionText: answer.question.titleTemplate,
          questionType: answer.question.type,
          answer: answerValue,
          pageTitle: answer.question.page?.titleTemplate || `Page ${answer.question.page?.index || 1}`,
          questionConfig: answer.question.config
        };
      });

      // Determine device type from user agent or default to desktop
      const deviceType = (session as any).userAgent?.includes('Mobile') ? 'mobile' : 
                        (session as any).userAgent?.includes('Tablet') ? 'tablet' : 'desktop';

      return {
        sessionId: session.id,
        userId: (session as any).userId || undefined,
        userEmail: (session as any).userEmail || undefined,
        startTime: session.startedAt.toISOString(),
        endTime: session.finalizedAt?.toISOString(),
        status: session.status.toLowerCase() as 'completed' | 'terminated' | 'in_progress',
        terminationReason,
        terminationQuestion,
        terminationPage,
        completionTime,
        deviceType,
        answers
      };
    });

    res.json(detailedResponses);

  } catch (error) {
    console.error('Get detailed responses error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to get detailed responses' });
  }
};
