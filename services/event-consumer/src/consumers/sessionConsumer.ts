import { createKafkaClient, createRedisClient, logger } from '@repo/event-bus';

export async function startSessionConsumer() {
  console.log('[CONSUMER] Session Consumer started');
  
  const kafkaClient = createKafkaClient();
  const redis = createRedisClient();
  
  // Connect to Redis
  await redis.connect();
  logger.info('✅ Session Consumer connected to Redis');

  // Create consumer with unique group ID
  const consumer = await kafkaClient.createConsumer('session-consumer-group');
  
  // Subscribe to session events
  await consumer.subscribe({ 
    topic: 'runtime.sessions',
    fromBeginning: false 
  });

  await consumer.run({
    eachMessage: async ({ message }: { message: any }) => {
      try {
        const event = JSON.parse(message.value.toString());
        await processSessionEvent(event, redis);
      } catch (error) {
        logger.error('❌ Error processing session event:', error);
      }
    },
  });
}

async function processSessionEvent(event: any, redis: any): Promise<void> {
  const { type, payload, tenantId, surveyId, sessionId } = event;
  
  logger.info(`📊 Processing session event: ${type}`, {
    sessionId,
    surveyId,
    tenantId
  });

  try {
    switch (type) {
      case 'session.started':
        await handleSessionStarted(payload, tenantId, surveyId, sessionId, redis);
        break;
      case 'session.completed':
        await handleSessionCompleted(payload, tenantId, surveyId, sessionId, redis);
        break;
      case 'session.terminated':
        await handleSessionTerminated(payload, tenantId, surveyId, sessionId, redis);
        break;
      default:
        logger.warn(`⚠️ Unknown session event type: ${type}`);
    }
  } catch (error) {
    logger.error(`❌ Error processing session event ${type}:`, error);
    throw error;
  }
}

async function handleSessionStarted(payload: any, tenantId: string, surveyId: string, sessionId: string, redis: any): Promise<void> {
  const startTime = new Date();
  
  // Store session data in Redis
  await redis.setSessionData(sessionId, {
    surveyId,
    tenantId,
    status: 'started',
    startTime: startTime.toISOString(),
    currentPage: null,
    progress: 0
  }, 3600); // 1 hour TTL

  // Update survey-level analytics
  await redis.incrementRateLimit(
    `survey:${surveyId}:sessions:started`,
    86400 // 24 hour window
  );

  // Update tenant-level analytics
  await redis.incrementRateLimit(
    `tenant:${tenantId}:sessions:started`,
    86400
  );

  // Store active session for real-time tracking
  await redis.setCache(
    `active_session:${sessionId}`,
    { surveyId, tenantId, startTime: startTime.toISOString() },
    3600
  );

  logger.info(`✅ Session started: ${sessionId} for survey ${surveyId}`);
}

async function handleSessionCompleted(payload: any, tenantId: string, surveyId: string, sessionId: string, redis: any): Promise<void> {
  const endTime = new Date();
  
  // Get session data
  const sessionData = await redis.getSessionData(sessionId);
  if (!sessionData) {
    logger.warn(`⚠️ Session data not found for completed session: ${sessionId}`);
    return;
  }

  // Calculate session duration
  const startTime = new Date(sessionData.startTime);
  const duration = endTime.getTime() - startTime.getTime();

  // Update session data
  await redis.setSessionData(sessionId, {
    ...sessionData,
    status: 'completed',
    endTime: endTime.toISOString(),
    duration: duration,
    progress: 100
  }, 3600);

  // Update survey-level analytics
  await redis.incrementRateLimit(
    `survey:${surveyId}:sessions:completed`,
    86400
  );

  // Update tenant-level analytics
  await redis.incrementRateLimit(
    `tenant:${tenantId}:sessions:completed`,
    86400
  );

  // Store completion metrics
  await redis.setCache(
    `session_metrics:${sessionId}`,
    {
      surveyId,
      tenantId,
      duration,
      startTime: sessionData.startTime,
      endTime: endTime.toISOString(),
      status: 'completed'
    },
    86400 // 24 hour TTL
  );

  // Remove from active sessions
  await redis.deleteCache(`active_session:${sessionId}`);

  logger.info(`✅ Session completed: ${sessionId} (duration: ${duration}ms)`);
}

async function handleSessionTerminated(payload: any, tenantId: string, surveyId: string, sessionId: string, redis: any): Promise<void> {
  const endTime = new Date();
  const { reason } = payload;
  
  // Get session data
  const sessionData = await redis.getSessionData(sessionId);
  if (!sessionData) {
    logger.warn(`⚠️ Session data not found for terminated session: ${sessionId}`);
    return;
  }

  // Calculate session duration
  const startTime = new Date(sessionData.startTime);
  const duration = endTime.getTime() - startTime.getTime();

  // Update session data
  await redis.setSessionData(sessionId, {
    ...sessionData,
    status: 'terminated',
    endTime: endTime.toISOString(),
    duration: duration,
    terminationReason: reason
  }, 3600);

  // Update survey-level analytics
  await redis.incrementRateLimit(
    `survey:${surveyId}:sessions:terminated`,
    86400
  );

  // Update tenant-level analytics
  await redis.incrementRateLimit(
    `tenant:${tenantId}:sessions:terminated`,
    86400
  );

  // Store termination metrics
  await redis.setCache(
    `session_metrics:${sessionId}`,
    {
      surveyId,
      tenantId,
      duration,
      startTime: sessionData.startTime,
      endTime: endTime.toISOString(),
      status: 'terminated',
      reason
    },
    86400
  );

  // Remove from active sessions
  await redis.deleteCache(`active_session:${sessionId}`);

  logger.info(`✅ Session terminated: ${sessionId} (reason: ${reason})`);
}
