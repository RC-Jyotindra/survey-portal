import { startQuotaConsumer } from './consumers/quotaConsumer';
import { startSessionConsumer } from './consumers/sessionConsumer';
import { startAnswerConsumer } from './consumers/answerConsumer';
import { logger } from '@repo/event-bus';

// Log environment variables for debugging
logger.info('🔧 Environment Variables:', {
  KAFKA_BROKERS: process.env.KAFKA_BROKERS,
  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT
});

async function startAllConsumers() {
  try {
    logger.info('🚀 Starting all event consumers...');

    // Wait a bit for Kafka to be fully ready
    logger.info('⏳ Waiting for Kafka to be ready...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay

    // Start all consumers concurrently
    await Promise.all([
      startQuotaConsumer(),
      startSessionConsumer(),
      startAnswerConsumer()
    ]);

    logger.info('✅ All consumers started successfully');

  } catch (error) {
    logger.error('❌ Failed to start consumers:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start all consumers
startAllConsumers();
