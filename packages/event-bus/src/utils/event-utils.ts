import { PrismaClient } from '@prisma/client';
import { EventEnvelope } from '../config/kafka.config';

export function createEventEnvelope(
  type: string,
  tenantId: string,
  payload: Record<string, any>,
  surveyId?: string,
  sessionId?: string
): Omit<EventEnvelope, 'eventId' | 'occurredAt'> {
  return {
    type,
    version: 1,
    tenantId,
    surveyId,
    sessionId,
    payload
  };
}

export async function publishOutboxEvent(
  prisma: PrismaClient,
  type: string,
  tenantId: string,
  payload: Record<string, any>,
  surveyId?: string,
  sessionId?: string
): Promise<void> {
  await prisma.outboxEvent.create({
    data: {
      tenantId,
      surveyId,
      sessionId,
      type,
      payload,
      occurredAt: new Date(),
      availableAt: new Date()
    }
  });
}

// Helper function to create multiple outbox events in a transaction
export async function publishMultipleOutboxEvents(
  prisma: PrismaClient,
  events: Array<{
    type: string;
    tenantId: string;
    payload: Record<string, any>;
    surveyId?: string;
    sessionId?: string;
  }>
): Promise<void> {
  await prisma.outboxEvent.createMany({
    data: events.map(event => ({
      tenantId: event.tenantId,
      surveyId: event.surveyId,
      sessionId: event.sessionId,
      type: event.type,
      payload: event.payload,
      occurredAt: new Date(),
      availableAt: new Date()
    }))
  });
}
