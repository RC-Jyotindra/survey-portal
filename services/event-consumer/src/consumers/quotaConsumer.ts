import { createKafkaClient, createRedisClient, logger } from '@repo/event-bus';

export async function startQuotaConsumer() {
  console.log('[CONSUMER] Quota Consumer started');
  
  const kafkaClient = createKafkaClient();
  const redis = createRedisClient();
  
  // Connect to Redis
  await redis.connect();
  logger.info('✅ Quota Consumer connected to Redis');

  // Create consumer with unique group ID
  const consumer = await kafkaClient.createConsumer('quota-consumer-group');
  
  // Subscribe to quota events
  await consumer.subscribe({ 
    topic: 'runtime.quota',
    fromBeginning: false 
  });

  await consumer.run({
    eachMessage: async ({ message }: { message: any }) => {
      try {
        const event = JSON.parse(message.value.toString());
        await processQuotaEvent(event, redis);
      } catch (error) {
        logger.error('❌ Error processing quota event:', error);
      }
    },
  });
}

async function processQuotaEvent(event: any, redis: any): Promise<void> {
  const { type, payload, tenantId, surveyId, sessionId } = event;
  
  logger.info(`📊 Processing quota event: ${type}`, {
    bucketId: payload.bucketId,
    sessionId,
    surveyId
  });

  try {
    switch (type) {
      case 'quota.reserved':
        await handleQuotaReserved(payload, tenantId, surveyId, redis);
        break;
      case 'quota.released':
        await handleQuotaReleased(payload, tenantId, surveyId, redis);
        break;
      case 'quota.finalized':
        await handleQuotaFinalized(payload, tenantId, surveyId, redis);
        break;
      default:
        logger.warn(`⚠️ Unknown quota event type: ${type}`);
    }
  } catch (error) {
    logger.error(`❌ Error processing quota event ${type}:`, error);
    throw error;
  }
}

async function handleQuotaReserved(payload: any, tenantId: string, surveyId: string, redis: any): Promise<void> {
  const { bucketId, sessionId } = payload;
  
  // Increment reserved counter in Redis
  await redis.incrementQuotaCounter(bucketId, 'reserved');
  
  // Store session mapping for quota tracking
  await redis.setCache(
    `quota:${bucketId}:session:${sessionId}`,
    { status: 'reserved', timestamp: new Date() },
    3600 // 1 hour TTL
  );

  // Update survey-level quota stats
  await redis.incrementRateLimit(
    `survey:${surveyId}:quotas:reserved`,
    86400 // 24 hour window
  );

  logger.info(`✅ Quota reserved: ${bucketId} for session ${sessionId}`);
}

async function handleQuotaReleased(payload: any, tenantId: string, surveyId: string, redis: any): Promise<void> {
  const { bucketId, sessionId } = payload;
  
  // Decrement reserved counter
  await redis.decrementQuotaCounter(bucketId, 'reserved');
  
  // Update session mapping
  await redis.setCache(
    `quota:${bucketId}:session:${sessionId}`,
    { status: 'released', timestamp: new Date() },
    3600
  );

  logger.info(`✅ Quota released: ${bucketId} for session ${sessionId}`);
}

async function handleQuotaFinalized(payload: any, tenantId: string, surveyId: string, redis: any): Promise<void> {
  const { bucketId, sessionId } = payload;
  
  // Move from reserved to filled
  await redis.decrementQuotaCounter(bucketId, 'reserved');
  await redis.incrementQuotaCounter(bucketId, 'filled');
  
  // Update session mapping
  await redis.setCache(
    `quota:${bucketId}:session:${sessionId}`,
    { status: 'finalized', timestamp: new Date() },
    3600
  );

  // Update survey-level stats
  await redis.incrementRateLimit(
    `survey:${surveyId}:quotas:completed`,
    86400
  );

  logger.info(`✅ Quota finalized: ${bucketId} for session ${sessionId}`);
}
