// Main exports for the event-bus package
export { KafkaClient, createKafkaClient, type KafkaConfig, type EventEnvelope } from './config/kafka.config';
export { RedisClient, createRedisClient, type RedisConfig } from './config/redis.config';
export { OutboxRelay, type OutboxRelayConfig } from './outbox/outbox-relay';
export { logger } from './config/logger.config';

// Utility functions
export { createEventEnvelope, publishOutboxEvent, publishMultipleOutboxEvents } from './utils/event-utils';
