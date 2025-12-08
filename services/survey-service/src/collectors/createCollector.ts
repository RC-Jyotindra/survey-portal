/**
 * Collector Creation Module
 * 
 * Handles creation of survey collectors (links) for different distribution types.
 * Focuses on PUBLIC collectors for now.
 */

import { PrismaClient } from '@prisma/client';
import { generateSlug, isValidSlug } from './utils';

export interface CreateCollectorRequest {
  tenantId: string;
  surveyId: string;
  type: 'PUBLIC' | 'SINGLE_USE' | 'INTERNAL' | 'PANEL';
  name: string;
  slug?: string;
  opensAt?: Date;
  closesAt?: Date;
  maxResponses?: number;
  allowMultiplePerDevice?: boolean;
  allowTest?: boolean;
}

export interface CreateCollectorResponse {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  publicUrl: string;
  opensAt?: Date;
  closesAt?: Date;
  maxResponses?: number;
  allowMultiplePerDevice: boolean;
  allowTest: boolean;
  createdAt: Date;
}

/**
 * Create a new survey collector
 */
export async function createCollector(
  prisma: PrismaClient,
  request: CreateCollectorRequest
): Promise<CreateCollectorResponse> {
  const {
    tenantId,
    surveyId,
    type,
    name,
    slug,
    opensAt,
    closesAt,
    maxResponses,
    allowMultiplePerDevice = false,
    allowTest = false
  } = request;

  // Basic input validation
  if (!tenantId || !surveyId || !type || !name) {
    throw new Error('Missing required fields: tenantId, surveyId, type, and name are required');
  }

  if (name.trim().length === 0) {
    throw new Error('Collector name cannot be empty');
  }

  // Validate date ranges
  if (opensAt && closesAt && opensAt >= closesAt) {
    throw new Error('Open date must be before close date');
  }

  if (maxResponses !== undefined && maxResponses <= 0) {
    throw new Error('Max responses must be a positive number');
  }

  // Validate survey exists and belongs to tenant
  const survey = await prisma.survey.findFirst({
    where: {
      id: surveyId,
      tenantId
    }
  });

  if (!survey) {
    throw new Error('Survey not found or access denied');
  }

  // Generate unique slug if not provided
  let finalSlug: string;
  if (slug) {
    // Validate provided slug
    if (!isValidSlug(slug)) {
      throw new Error('Invalid slug format. Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only.');
    }
    finalSlug = await generateUniqueSlug(prisma, slug);
  } else {
    finalSlug = await generateUniqueSlug(prisma, name);
  }

  // Create the collector
  const collector = await prisma.surveyCollector.create({
    data: {
      tenantId,
      surveyId,
      type,
      name,
      slug: finalSlug,
      status: 'active',
      opensAt,
      closesAt,
      maxResponses,
      allowMultiplePerDevice,
      allowTest
    }
  });

  // Generate public URL
  const publicUrl = generatePublicUrl(finalSlug);

  return {
    id: collector.id,
    name: collector.name,
    slug: collector.slug,
    type: collector.type,
    status: collector.status,
    publicUrl,
    opensAt: collector.opensAt || undefined,
    closesAt: collector.closesAt || undefined,
    maxResponses: collector.maxResponses || undefined,
    allowMultiplePerDevice: collector.allowMultiplePerDevice,
    allowTest: collector.allowTest,
    createdAt: collector.createdAt
  };
}

/**
 * Generate a unique slug for the collector
 */
async function generateUniqueSlug(
  prisma: PrismaClient,
  name: string
): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;
  const maxAttempts = 100; // Safety limit to prevent infinite loops

  while (counter <= maxAttempts) {
    const existing = await prisma.surveyCollector.findUnique({
      where: { slug }
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // If we've exhausted all attempts, generate a random suffix
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${randomSuffix}`;
}

/**
 * Generate the public URL for a collector
 */
function generatePublicUrl(slug: string): string {
  // In production, this would use the actual domain
  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/c/${slug}`;
}

/**
 * Update an existing collector
 */
export async function updateCollector(
  prisma: PrismaClient,
  collectorId: string,
  tenantId: string,
  updates: Partial<CreateCollectorRequest>
): Promise<CreateCollectorResponse> {
  // Verify collector exists and belongs to tenant
  const existingCollector = await prisma.surveyCollector.findFirst({
    where: {
      id: collectorId,
      tenantId
    }
  });

  if (!existingCollector) {
    throw new Error('Collector not found or access denied');
  }

  // Prepare update data
  const updateData: any = {};
  
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.opensAt !== undefined) updateData.opensAt = updates.opensAt;
  if (updates.closesAt !== undefined) updateData.closesAt = updates.closesAt;
  if (updates.maxResponses !== undefined) updateData.maxResponses = updates.maxResponses;
  if (updates.allowMultiplePerDevice !== undefined) updateData.allowMultiplePerDevice = updates.allowMultiplePerDevice;
  if (updates.allowTest !== undefined) updateData.allowTest = updates.allowTest;

  // Handle slug update (need to ensure uniqueness)
  if (updates.slug && updates.slug !== existingCollector.slug) {
    // Validate the new slug format
    if (!isValidSlug(updates.slug)) {
      throw new Error('Invalid slug format. Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only.');
    }
    const uniqueSlug = await generateUniqueSlug(prisma, updates.slug);
    updateData.slug = uniqueSlug;
  }

  // Update the collector
  const updatedCollector = await prisma.surveyCollector.update({
    where: { id: collectorId },
    data: updateData
  });

  // Generate public URL
  const publicUrl = generatePublicUrl(updatedCollector.slug);

  return {
    id: updatedCollector.id,
    name: updatedCollector.name,
    slug: updatedCollector.slug,
    type: updatedCollector.type,
    status: updatedCollector.status,
    publicUrl,
    opensAt: updatedCollector.opensAt || undefined,
    closesAt: updatedCollector.closesAt || undefined,
    maxResponses: updatedCollector.maxResponses || undefined,
    allowMultiplePerDevice: updatedCollector.allowMultiplePerDevice,
    allowTest: updatedCollector.allowTest,
    createdAt: updatedCollector.createdAt
  };
}

/**
 * Delete a collector
 */
export async function deleteCollector(
  prisma: PrismaClient,
  collectorId: string,
  tenantId: string
): Promise<boolean> {
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

  // Delete the collector (cascade will handle related records)
  await prisma.surveyCollector.delete({
    where: { id: collectorId }
  });

  return true;
}

/**
 * Get collectors for a survey
 */
export async function getCollectors(
  prisma: PrismaClient,
  surveyId: string,
  tenantId: string
): Promise<CreateCollectorResponse[]> {
  const collectors = await prisma.surveyCollector.findMany({
    where: {
      surveyId,
      tenantId
    },
    orderBy: { createdAt: 'desc' }
  });

  return collectors.map(collector => ({
    id: collector.id,
    name: collector.name,
    slug: collector.slug,
    type: collector.type,
    status: collector.status,
    publicUrl: generatePublicUrl(collector.slug),
    opensAt: collector.opensAt || undefined,
    closesAt: collector.closesAt || undefined,
    maxResponses: collector.maxResponses || undefined,
    allowMultiplePerDevice: collector.allowMultiplePerDevice,
    allowTest: collector.allowTest,
    createdAt: collector.createdAt
  }));
}

/**
 * Get a single collector by ID
 */
export async function getCollector(
  prisma: PrismaClient,
  collectorId: string,
  tenantId: string
): Promise<CreateCollectorResponse | null> {
  const collector = await prisma.surveyCollector.findFirst({
    where: {
      id: collectorId,
      tenantId
    }
  });

  if (!collector) {
    return null;
  }

  return {
    id: collector.id,
    name: collector.name,
    slug: collector.slug,
    type: collector.type,
    status: collector.status,
    publicUrl: generatePublicUrl(collector.slug),
    opensAt: collector.opensAt || undefined,
    closesAt: collector.closesAt || undefined,
    maxResponses: collector.maxResponses || undefined,
    allowMultiplePerDevice: collector.allowMultiplePerDevice,
    allowTest: collector.allowTest,
    createdAt: collector.createdAt
  };
}

/**
 * Get collector statistics
 */
export async function getCollectorStats(
  prisma: PrismaClient,
  collectorId: string,
  tenantId: string
): Promise<{
  totalSessions: number;
  completedSessions: number;
  terminatedSessions: number;
  inProgressSessions: number;
  completionRate: number;
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

  // Get session counts
  const [totalSessions, completedSessions, terminatedSessions, inProgressSessions] = await Promise.all([
    prisma.surveySession.count({
      where: { collectorId }
    }),
    prisma.surveySession.count({
      where: { collectorId, status: 'COMPLETED' }
    }),
    prisma.surveySession.count({
      where: { collectorId, status: 'TERMINATED' }
    }),
    prisma.surveySession.count({
      where: { collectorId, status: 'IN_PROGRESS' }
    })
  ]);

  const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

  return {
    totalSessions,
    completedSessions,
    terminatedSessions,
    inProgressSessions,
    completionRate: Math.round(completionRate * 100) / 100
  };
}
