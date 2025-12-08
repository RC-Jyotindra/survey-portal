/**
 * Collector Invites Module
 * 
 * Handles creation and management of single-use invites for collectors.
 * Generates tokens and URLs for restricted access.
 */

import { PrismaClient } from '@prisma/client';
import { generateSecureToken, isValidEmail } from './utils';

export interface CreateInviteRequest {
  collectorId: string;
  tenantId: string;
  emails?: string[];
  count?: number;
  ttlHours?: number;
  externalIds?: string[];
}

export interface CreateInviteResponse {
  invites: Array<{
    id: string;
    token: string;
    email?: string;
    externalId?: string;
    url: string;
    expiresAt?: Date;
    status: string;
  }>;
  totalCreated: number;
}

export interface InviteInfo {
  id: string;
  token: string;
  email?: string;
  externalId?: string;
  expiresAt?: Date;
  consumedAt?: Date;
  status: string;
  createdAt: Date;
  url: string;
}

/**
 * Create invites for a single-use collector
 */
export async function createInvites(
  prisma: PrismaClient,
  request: CreateInviteRequest
): Promise<CreateInviteResponse> {
  const {
    collectorId,
    tenantId,
    emails = [],
    count = 0,
    ttlHours = 24 * 7, // Default 7 days
    externalIds = []
  } = request;

  // Verify collector exists and is SINGLE_USE
  const collector = await prisma.surveyCollector.findFirst({
    where: {
      id: collectorId,
      tenantId,
      type: 'SINGLE_USE'
    }
  });

  if (!collector) {
    throw new Error('Single-use collector not found or access denied');
  }

  const invites = [];
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  // Create invites from email list
  for (const email of emails) {
    if (!isValidEmail(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }

    const token = generateSecureToken();
    const invite = await prisma.collectorInvite.create({
      data: {
        collectorId,
        token,
        email,
        expiresAt,
        status: 'active'
      }
    });

    invites.push({
      id: invite.id,
      token: invite.token,
      email: invite.email ?? undefined,
      url: generateInviteUrl(collector.slug, invite.token),
      expiresAt: invite.expiresAt ?? undefined,
      status: invite.status
    });
  }

  // Create invites from external IDs
  for (const externalId of externalIds) {
    const token = generateSecureToken();
    const invite = await prisma.collectorInvite.create({
      data: {
        collectorId,
        token,
        externalId,
        expiresAt,
        status: 'active'
      }
    });

    invites.push({
      id: invite.id,
      token: invite.token,
      externalId: invite.externalId ?? undefined,
      url: generateInviteUrl(collector.slug, invite.token),
      expiresAt: invite.expiresAt ?? undefined,
      status: invite.status
    });
  }

  // Create additional random invites if count is specified
  const additionalCount = Math.max(0, count - emails.length - externalIds.length);
  for (let i = 0; i < additionalCount; i++) {
    const token = generateSecureToken();
    const invite = await prisma.collectorInvite.create({
      data: {
        collectorId,
        token,
        expiresAt,
        status: 'active'
      }
    });

    invites.push({
      id: invite.id,
      token: invite.token,
      url: generateInviteUrl(collector.slug, invite.token),
      expiresAt: invite.expiresAt ?? undefined,
      status: invite.status
    });
  }

  return {
    invites,
    totalCreated: invites.length
  };
}

/**
 * Generate invite URL
 */
function generateInviteUrl(slug: string, token: string): string {
  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/c/${slug}?t=${token}`;
}

/**
 * Get invites for a collector
 */
export async function getInvites(
  prisma: PrismaClient,
  collectorId: string,
  tenantId: string,
  options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<InviteInfo[]> {
  const { status, limit = 100, offset = 0 } = options;

  // Verify collector exists and belongs to tenant
  const collector = await prisma.surveyCollector.findFirst({
    where: {
      id: collectorId,
      tenantId
    }
  });

  if (!collector) {
    throw new Error('Collector not found or access denied');
  }

  const where: any = { collectorId };
  if (status) {
    where.status = status;
  }

  const invites = await prisma.collectorInvite.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  });

  return invites.map(invite => ({
    id: invite.id,
    token: invite.token,
    email: invite.email ?? undefined,
    externalId: invite.externalId ?? undefined,
    expiresAt: invite.expiresAt ?? undefined,
    consumedAt: invite.consumedAt ?? undefined,
    status: invite.status,
    createdAt: invite.createdAt,
    url: generateInviteUrl(collector.slug, invite.token)
  }));
}

/**
 * Get invite statistics
 */
export async function getInviteStats(
  prisma: PrismaClient,
  collectorId: string,
  tenantId: string
): Promise<{
  total: number;
  active: number;
  used: number;
  expired: number;
  usageRate: number;
}> {
  // Verify collector exists and belongs to tenant
  const collector = await prisma.surveyCollector.findFirst({
    where: {
      id: collectorId,
      tenantId
    }
  });

  if (!collector) {
    throw new Error('Collector not found or access denied');
  }

  const [total, active, used, expired] = await Promise.all([
    prisma.collectorInvite.count({
      where: { collectorId }
    }),
    prisma.collectorInvite.count({
      where: { collectorId, status: 'active' }
    }),
    prisma.collectorInvite.count({
      where: { collectorId, status: 'used' }
    }),
    prisma.collectorInvite.count({
      where: { collectorId, status: 'expired' }
    })
  ]);

  const usageRate = total > 0 ? (used / total) * 100 : 0;

  return {
    total,
    active,
    used,
    expired,
    usageRate: Math.round(usageRate * 100) / 100
  };
}

/**
 * Revoke an invite
 */
export async function revokeInvite(
  prisma: PrismaClient,
  inviteId: string,
  tenantId: string
): Promise<boolean> {
  // Verify invite exists and belongs to tenant's collector
  const invite = await prisma.collectorInvite.findFirst({
    where: { id: inviteId },
    include: {
      collector: {
        select: { tenantId: true }
      }
    }
  });

  if (!invite || invite.collector.tenantId !== tenantId) {
    throw new Error('Invite not found or access denied');
  }

  // Only revoke active invites
  if (invite.status !== 'active') {
    throw new Error('Can only revoke active invites');
  }

  await prisma.collectorInvite.update({
    where: { id: inviteId },
    data: { status: 'expired' }
  });

  return true;
}

/**
 * Extend invite expiration
 */
export async function extendInvite(
  prisma: PrismaClient,
  inviteId: string,
  tenantId: string,
  additionalHours: number
): Promise<boolean> {
  // Verify invite exists and belongs to tenant's collector
  const invite = await prisma.collectorInvite.findFirst({
    where: { id: inviteId },
    include: {
      collector: {
        select: { tenantId: true }
      }
    }
  });

  if (!invite || invite.collector.tenantId !== tenantId) {
    throw new Error('Invite not found or access denied');
  }

  // Only extend active invites
  if (invite.status !== 'active') {
    throw new Error('Can only extend active invites');
  }

  const newExpiresAt = new Date(
    (invite.expiresAt || new Date()).getTime() + additionalHours * 60 * 60 * 1000
  );

  await prisma.collectorInvite.update({
    where: { id: inviteId },
    data: { expiresAt: newExpiresAt }
  });

  return true;
}

/**
 * Clean up expired invites
 */
export async function cleanupExpiredInvites(
  prisma: PrismaClient
): Promise<number> {
  const now = new Date();
  
  const expiredInvites = await prisma.collectorInvite.findMany({
    where: {
      status: 'active',
      expiresAt: { lt: now }
    }
  });

  if (expiredInvites.length === 0) {
    return 0;
  }

  await prisma.collectorInvite.updateMany({
    where: {
      status: 'active',
      expiresAt: { lt: now }
    },
    data: { status: 'expired' }
  });

  return expiredInvites.length;
}

/**
 * Resend invite (generate new token)
 */
export async function resendInvite(
  prisma: PrismaClient,
  inviteId: string,
  tenantId: string
): Promise<InviteInfo> {
  // Verify invite exists and belongs to tenant's collector
  const invite = await prisma.collectorInvite.findFirst({
    where: { id: inviteId },
    include: {
      collector: {
        select: { tenantId: true, slug: true }
      }
    }
  });

  if (!invite || invite.collector.tenantId !== tenantId) {
    throw new Error('Invite not found or access denied');
  }

  // Generate new token
  const newToken = generateSecureToken();
  
  const updatedInvite = await prisma.collectorInvite.update({
    where: { id: inviteId },
    data: {
      token: newToken,
      status: 'active',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  });

  return {
    id: updatedInvite.id,
    token: updatedInvite.token,
    email: updatedInvite.email ?? undefined,
    externalId: updatedInvite.externalId ?? undefined,
    expiresAt: updatedInvite.expiresAt ?? undefined,
    consumedAt: updatedInvite.consumedAt ?? undefined,
    status: updatedInvite.status,
    createdAt: updatedInvite.createdAt,
    url: generateInviteUrl(invite.collector.slug, updatedInvite.token)
  };
}

/**
 * Bulk revoke invites
 */
export async function bulkRevokeInvites(
  prisma: PrismaClient,
  inviteIds: string[],
  tenantId: string
): Promise<number> {
  // Verify all invites belong to tenant's collectors
  const invites = await prisma.collectorInvite.findMany({
    where: { id: { in: inviteIds } },
    include: {
      collector: {
        select: { tenantId: true }
      }
    }
  });

  const validInviteIds = invites
    .filter(invite => invite.collector.tenantId === tenantId && invite.status === 'active')
    .map(invite => invite.id);

  if (validInviteIds.length === 0) {
    return 0;
  }

  const result = await prisma.collectorInvite.updateMany({
    where: {
      id: { in: validInviteIds }
    },
    data: { status: 'expired' }
  });

  return result.count;
}

/**
 * Export invites to CSV format
 */
export async function exportInvites(
  prisma: PrismaClient,
  collectorId: string,
  tenantId: string
): Promise<string> {
  // Verify collector exists and belongs to tenant
  const collector = await prisma.surveyCollector.findFirst({
    where: {
      id: collectorId,
      tenantId
    }
  });

  if (!collector) {
    throw new Error('Collector not found or access denied');
  }

  const invites = await prisma.collectorInvite.findMany({
    where: { collectorId },
    orderBy: { createdAt: 'desc' }
  });

  // Generate CSV
  const headers = ['Email', 'External ID', 'Token', 'Status', 'Created', 'Expires', 'Used', 'URL'];
  const rows = invites.map(invite => [
    invite.email || '',
    invite.externalId || '',
    invite.token,
    invite.status,
    invite.createdAt.toISOString(),
    invite.expiresAt?.toISOString() || '',
    invite.consumedAt?.toISOString() || '',
    generateInviteUrl(collector.slug, invite.token)
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
}
