import { PrismaClient } from '@prisma/client';
import { 
  KafkaClient, 
  RedisClient, 
  OutboxRelay,
  createKafkaClient,
  createRedisClient,
  publishOutboxEvent,
  publishMultipleOutboxEvents
} from '@repo/event-bus';

class EventBusService {
  private kafkaClient: KafkaClient;
  private redisClient: RedisClient;
  private outboxRelay: OutboxRelay | null = null;
  private prisma: PrismaClient;
  private isInitialized: boolean = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.kafkaClient = createKafkaClient();
    this.redisClient = createRedisClient();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Connect to Kafka and Redis
      await this.kafkaClient.connect();
      await this.redisClient.connect();

      // Initialize outbox relay
      this.outboxRelay = new OutboxRelay(this.prisma, this.kafkaClient);
      await this.outboxRelay.start();

      this.isInitialized = true;
      console.log('✅ Event bus service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize event bus service:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      if (this.outboxRelay) {
        await this.outboxRelay.stop();
      }
      await this.kafkaClient.disconnect();
      await this.redisClient.disconnect();
      
      this.isInitialized = false;
      console.log('✅ Event bus service shutdown successfully');
    } catch (error) {
      console.error('❌ Error shutting down event bus service:', error);
    }
  }

  // Event publishing methods
  async publishSessionStarted(sessionId: string, tenantId: string, surveyId: string): Promise<void> {
    await publishOutboxEvent(
      this.prisma,
      'session.started',
      tenantId,
      { sessionId, surveyId },
      surveyId,
      sessionId
    );
  }

  async publishSessionCompleted(sessionId: string, tenantId: string, surveyId: string): Promise<void> {
    await publishOutboxEvent(
      this.prisma,
      'session.completed',
      tenantId,
      { sessionId, surveyId },
      surveyId,
      sessionId
    );
  }

  async publishSessionTerminated(sessionId: string, tenantId: string, surveyId: string, reason?: string): Promise<void> {
    await publishOutboxEvent(
      this.prisma,
      'session.terminated',
      tenantId,
      { sessionId, surveyId, reason },
      surveyId,
      sessionId
    );
  }

  async publishAnswerUpserted(
    sessionId: string, 
    tenantId: string, 
    surveyId: string, 
    pageId: string, 
    answers: any[]
  ): Promise<void> {
    await publishOutboxEvent(
      this.prisma,
      'answer.upserted',
      tenantId,
      { sessionId, pageId, answers },
      surveyId,
      sessionId
    );
  }

  async publishQuotaReserved(
    sessionId: string,
    tenantId: string,
    surveyId: string,
    bucketId: string
  ): Promise<void> {
    await publishOutboxEvent(
      this.prisma,
      'quota.reserved',
      tenantId,
      { sessionId, bucketId },
      surveyId,
      sessionId
    );
  }

  async publishQuotaReleased(
    sessionId: string,
    tenantId: string,
    surveyId: string,
    bucketId: string
  ): Promise<void> {
    await publishOutboxEvent(
      this.prisma,
      'quota.released',
      tenantId,
      { sessionId, bucketId },
      surveyId,
      sessionId
    );
  }

  async publishQuotaFinalized(
    sessionId: string,
    tenantId: string,
    surveyId: string,
    bucketId: string
  ): Promise<void> {
    await publishOutboxEvent(
      this.prisma,
      'quota.finalized',
      tenantId,
      { sessionId, bucketId },
      surveyId,
      sessionId
    );
  }

  // Batch event publishing for complex operations
  async publishAnswerSubmissionEvents(
    sessionId: string,
    tenantId: string,
    surveyId: string,
    pageId: string,
    answers: any[],
    quotaEvents: Array<{ type: 'reserved' | 'released' | 'finalized'; bucketId: string }>
  ): Promise<void> {
    const events = [
      {
        type: 'answer.upserted',
        tenantId,
        payload: { sessionId, pageId, answers },
        surveyId,
        sessionId
      },
      ...quotaEvents.map(quotaEvent => ({
        type: `quota.${quotaEvent.type}` as const,
        tenantId,
        payload: { sessionId, bucketId: quotaEvent.bucketId },
        surveyId,
        sessionId
      }))
    ];

    await publishMultipleOutboxEvents(this.prisma, events);
  }

  // Redis operations
  getRedisClient(): RedisClient {
    return this.redisClient;
  }

  // Health check
  async healthCheck(): Promise<{ kafka: boolean; redis: boolean; outbox: any }> {
    const [kafkaHealthy, redisHealthy, outboxMetrics] = await Promise.all([
      this.kafkaClient ? true : false, // Simple check - in production, you'd ping Kafka
      this.redisClient.ping(),
      this.outboxRelay ? this.outboxRelay.getMetrics() : null
    ]);

    return {
      kafka: kafkaHealthy,
      redis: redisHealthy,
      outbox: outboxMetrics
    };
  }
}

// Singleton instance
let eventBusService: EventBusService | null = null;

export function getEventBusService(prisma: PrismaClient): EventBusService {
  if (!eventBusService) {
    eventBusService = new EventBusService(prisma);
  }
  return eventBusService;
}

export { EventBusService };
