import { createKafkaClient, createRedisClient, logger } from '@repo/event-bus';

export async function startAnswerConsumer() {
  console.log('[CONSUMER] Answer Consumer started');
  
  const kafkaClient = createKafkaClient();
  const redis = createRedisClient();
  
  // Connect to Redis
  await redis.connect();
  logger.info('✅ Answer Consumer connected to Redis');

  // Create consumer with unique group ID
  const consumer = await kafkaClient.createConsumer('answer-consumer-group');
  
  // Subscribe to answer events
  await consumer.subscribe({ 
    topic: 'runtime.answers',
    fromBeginning: false 
  });

  await consumer.run({
    eachMessage: async ({ message }: { message: any }) => {
      try {
        const event = JSON.parse(message.value.toString());
        await processAnswerEvent(event, redis);
      } catch (error) {
        logger.error('❌ Error processing answer event:', error);
      }
    },
  });
}

async function processAnswerEvent(event: any, redis: any): Promise<void> {
  const { type, payload, tenantId, surveyId, sessionId } = event;
  
  logger.info(`📊 Processing answer event: ${type}`, {
    sessionId,
    surveyId,
    pageId: payload.pageId,
    answerCount: payload.answers?.length || 0
  });

  try {
    switch (type) {
      case 'answer.upserted':
        await handleAnswerUpserted(payload, tenantId, surveyId, sessionId, redis);
        break;
      default:
        logger.warn(`⚠️ Unknown answer event type: ${type}`);
    }
  } catch (error) {
    logger.error(`❌ Error processing answer event ${type}:`, error);
    throw error;
  }
}

async function handleAnswerUpserted(payload: any, tenantId: string, surveyId: string, sessionId: string, redis: any): Promise<void> {
  const { pageId, answers } = payload;
  const timestamp = new Date();

  // Store answer data for real-time analytics
  await redis.setCache(
    `answers:${sessionId}:${pageId}`,
    {
      sessionId,
      pageId,
      answers,
      timestamp: timestamp.toISOString(),
      surveyId,
      tenantId
    },
    86400 // 24 hour TTL
  );

  // Update session progress
  await updateSessionProgress(sessionId, pageId, answers.length, redis);

  // Update survey-level answer analytics
  await redis.incrementRateLimit(
    `survey:${surveyId}:answers:total`,
    86400
  );

  // Update page-level analytics
  await redis.incrementRateLimit(
    `survey:${surveyId}:page:${pageId}:answers`,
    86400
  );

  // Update tenant-level analytics
  await redis.incrementRateLimit(
    `tenant:${tenantId}:answers:total`,
    86400
  );

  // Store question-level analytics
  for (const answer of answers) {
    if (answer.questionId) {
      await redis.incrementRateLimit(
        `survey:${surveyId}:question:${answer.questionId}:responses`,
        86400
      );

      // Store answer value for analytics (if needed)
      if (answer.choices || answer.textValue || answer.numberValue) {
        await redis.setCache(
          `question_response:${answer.questionId}:${sessionId}`,
          {
            questionId: answer.questionId,
            sessionId,
            surveyId,
            answer: answer.choices || answer.textValue || answer.numberValue,
            timestamp: timestamp.toISOString()
          },
          86400
        );
      }
    }
  }

  // Update real-time dashboard data
  await updateRealtimeDashboard(surveyId, tenantId, sessionId, pageId, answers, redis);

  logger.info(`✅ Answer processed: ${answers.length} answers for page ${pageId} in session ${sessionId}`);
}

async function updateSessionProgress(sessionId: string, pageId: string, answerCount: number, redis: any): Promise<void> {
  // Get current session data
  const sessionData = await redis.getSessionData(sessionId);
  if (sessionData) {
    // Update current page and progress
    const updatedSessionData = {
      ...sessionData,
      currentPage: pageId,
      lastAnswerTime: new Date().toISOString(),
      totalAnswers: (sessionData.totalAnswers || 0) + answerCount
    };

    await redis.setSessionData(sessionId, updatedSessionData, 3600);
  }
}

async function updateRealtimeDashboard(surveyId: string, tenantId: string, sessionId: string, pageId: string, answers: any[], redis: any): Promise<void> {
  const timestamp = new Date().toISOString();

  // Update real-time activity feed
  await redis.setCache(
    `realtime:activity:${surveyId}`,
    {
      type: 'answer_submitted',
      sessionId,
      pageId,
      answerCount: answers.length,
      timestamp,
      surveyId,
      tenantId
    },
    300 // 5 minute TTL for real-time feed
  );

  // Update survey completion rate
  const sessionData = await redis.getSessionData(sessionId);
  if (sessionData) {
    const progress = calculateProgress(sessionData);
    await redis.setCache(
      `realtime:progress:${sessionId}`,
      {
        sessionId,
        surveyId,
        progress,
        currentPage: pageId,
        timestamp
      },
      3600
    );
  }

  // Update live participant count
  await redis.incrementRateLimit(
    `realtime:participants:${surveyId}`,
    300 // 5 minute window
  );
}

function calculateProgress(sessionData: any): number {
  // Simple progress calculation based on pages completed
  // This could be enhanced based on your survey structure
  const totalAnswers = sessionData.totalAnswers || 0;
  const estimatedTotalPages = 10; // This should come from survey definition
  return Math.min(Math.round((totalAnswers / estimatedTotalPages) * 100), 100);
}
