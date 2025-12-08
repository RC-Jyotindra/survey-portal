import { PrismaClient } from '@prisma/client';
import { KafkaClient, EventEnvelope } from '../config/kafka.config';
import { logger } from '../config/logger.config';

export interface OutboxRelayConfig {
  batchSize: number;
  pollIntervalMs: number;
  maxAttempts: number;
  retryBackoffMs: number;
}

export class OutboxRelay {
  private prisma: PrismaClient;
  private kafkaClient: KafkaClient;
  private config: OutboxRelayConfig;
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(
    prisma: PrismaClient,
    kafkaClient: KafkaClient,
    config: Partial<OutboxRelayConfig> = {}
  ) {
    this.prisma = prisma;
    this.kafkaClient = kafkaClient;
    this.config = {
      batchSize: config.batchSize || parseInt(process.env.OUTBOX_BATCH_SIZE || '100', 10),
      pollIntervalMs: config.pollIntervalMs || parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '1000', 10),
      maxAttempts: config.maxAttempts || parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5', 10),
      retryBackoffMs: config.retryBackoffMs || parseInt(process.env.OUTBOX_RETRY_BACKOFF_MS || '5000', 10)
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Outbox relay is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting outbox relay', { config: this.config });

    // Start polling loop
    this.pollTimer = setInterval(() => {
      this.processEvents().catch(error => {
        logger.error('Error in outbox relay polling:', error);
      });
    }, this.config.pollIntervalMs);

    // Process immediately
    await this.processEvents();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    logger.info('Outbox relay stopped');
  }

  private async processEvents(): Promise<void> {
    try {
      const events = await this.fetchUnprocessedEvents();
      
      if (events.length === 0) {
        return;
      }

      logger.debug(`Processing ${events.length} outbox events`);

      for (const event of events) {
        await this.processEvent(event);
      }
    } catch (error) {
      logger.error('Error processing outbox events:', error);
    }
  }

  private async fetchUnprocessedEvents() {
    return await this.prisma.outboxEvent.findMany({
      where: {
        processedAt: null,
        availableAt: {
          lte: new Date()
        }
      },
      take: this.config.batchSize,
      orderBy: {
        occurredAt: 'asc'
      }
    });
  }

  private async processEvent(event: any): Promise<void> {
    try {
      // Determine topic and key based on event type
      const { topic, key } = this.getTopicAndKey(event);
      
      // Create event envelope
      const envelope: EventEnvelope = {
        eventId: event.id,
        type: event.type,
        version: 1,
        occurredAt: event.occurredAt.toISOString(),
        tenantId: event.tenantId,
        surveyId: event.surveyId,
        sessionId: event.sessionId,
        payload: event.payload
      };

      // Publish to Kafka
      await this.kafkaClient.publishEvent(topic, key, envelope);

      // Mark as processed
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() }
      });

      logger.debug('Event processed successfully', {
        eventId: event.id,
        type: event.type,
        topic
      });

    } catch (error) {
      logger.error('Failed to process event:', {
        eventId: event.id,
        type: event.type,
        error
      });

      await this.handleEventFailure(event, error);
    }
  }

  private getTopicAndKey(event: any): { topic: string; key: string } {
    // Map event types to topics and keys
    const topicMappings: Record<string, { topic: string; keyField: string }> = {
      'session.started': { topic: 'runtime.sessions', keyField: 'sessionId' },
      'session.completed': { topic: 'runtime.sessions', keyField: 'sessionId' },
      'session.terminated': { topic: 'runtime.sessions', keyField: 'sessionId' },
      'answer.upserted': { topic: 'runtime.answers', keyField: 'sessionId' },
      'quota.reserved': { topic: 'runtime.quota', keyField: 'bucketId' },
      'quota.released': { topic: 'runtime.quota', keyField: 'bucketId' },
      'quota.finalized': { topic: 'runtime.quota', keyField: 'bucketId' },
      'collector.opened': { topic: 'collectors.events', keyField: 'collectorId' },
      'collector.paused': { topic: 'collectors.events', keyField: 'collectorId' },
      'collector.closed': { topic: 'collectors.events', keyField: 'collectorId' },
      'invite.consumed': { topic: 'collectors.events', keyField: 'collectorId' }
    };

    const mapping = topicMappings[event.type];
    if (!mapping) {
      throw new Error(`Unknown event type: ${event.type}`);
    }

    const key = event.payload[mapping.keyField] || event.sessionId || event.id;
    return { topic: mapping.topic, key };
  }

  private async handleEventFailure(event: any, error: any): Promise<void> {
    const newAttempts = event.attempts + 1;
    
    if (newAttempts >= this.config.maxAttempts) {
      // Move to DLQ (Dead Letter Queue)
      logger.error('Event moved to DLQ after max attempts', {
        eventId: event.id,
        type: event.type,
        attempts: newAttempts
      });

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          processedAt: new Date(), // Mark as processed to stop retrying
          attempts: newAttempts
        }
      });

      // TODO: In production, you might want to publish to a DLQ topic
      // await this.kafkaClient.publishEvent('dlq.survey-service', event.id, event);
    } else {
      // Schedule retry with exponential backoff
      const backoffMs = this.config.retryBackoffMs * Math.pow(2, newAttempts - 1);
      const nextRetryAt = new Date(Date.now() + backoffMs);

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          attempts: newAttempts,
          availableAt: nextRetryAt
        }
      });

      logger.warn('Event scheduled for retry', {
        eventId: event.id,
        type: event.type,
        attempts: newAttempts,
        nextRetryAt
      });
    }
  }

  // Get metrics for monitoring
  async getMetrics() {
    const [pending, failed, processed] = await Promise.all([
      this.prisma.outboxEvent.count({
        where: { processedAt: null, availableAt: { lte: new Date() } }
      }),
      this.prisma.outboxEvent.count({
        where: { processedAt: null, attempts: { gte: this.config.maxAttempts } }
      }),
      this.prisma.outboxEvent.count({
        where: { processedAt: { not: null } }
      })
    ]);

    return {
      pending,
      failed,
      processed,
      total: pending + failed + processed
    };
  }
}
