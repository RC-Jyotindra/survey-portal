import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { logger } from './logger.config';

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  groupId?: string;
  retry?: {
    initialRetryTime: number;
    retries: number;
  };
}

export interface EventEnvelope {
  eventId: string;
  type: string;
  version: number;
  occurredAt: string;
  tenantId: string;
  surveyId?: string;
  sessionId?: string;
  payload: Record<string, any>;
}

export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private config: KafkaConfig;

  constructor(config: KafkaConfig) {
    this.config = config;
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: config.retry || {
        initialRetryTime: 100,
        retries: 8
      }
    });
  }

  async connect(): Promise<void> {
    try {
      this.producer = this.kafka.producer();
      await this.producer.connect();
      logger.info('Kafka producer connected successfully');
    } catch (error) {
      logger.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.producer) {
        await this.producer.disconnect();
        logger.info('Kafka producer disconnected');
      }
      if (this.consumer) {
        await this.consumer.disconnect();
        logger.info('Kafka consumer disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting Kafka client:', error);
    }
  }

  async publishEvent(
    topic: string,
    key: string,
    event: EventEnvelope
  ): Promise<void> {
    if (!this.producer) {
      throw new Error('Kafka producer not connected');
    }

    try {
      await this.producer.send({
        topic,
        messages: [{
          key,
          value: JSON.stringify(event),
          headers: {
            eventType: event.type,
            tenantId: event.tenantId,
            version: event.version.toString()
          }
        }]
      });

      logger.debug('Event published successfully', {
        topic,
        key,
        eventType: event.type,
        eventId: event.eventId
      });
    } catch (error) {
      logger.error('Failed to publish event:', {
        topic,
        key,
        eventType: event.type,
        error
      });
      throw error;
    }
  }

  async createConsumer(groupId: string): Promise<Consumer> {
    this.consumer = this.kafka.consumer({ groupId });
    await this.consumer.connect();
    logger.info(`Kafka consumer connected with group ID: ${groupId}`);
    return this.consumer;
  }

  async subscribeToTopics(
    topics: string[],
    messageHandler: (payload: EachMessagePayload) => Promise<void>
  ): Promise<void> {
    if (!this.consumer) {
      throw new Error('Kafka consumer not created');
    }

    await this.consumer.subscribe({ topics });

    await this.consumer.run({
      eachMessage: async (payload) => {
        try {
          await messageHandler(payload);
        } catch (error) {
          logger.error('Error processing message:', {
            topic: payload.topic,
            partition: payload.partition,
            offset: payload.message.offset,
            error
          });
          // In production, you might want to send to DLQ here
        }
      }
    });

    logger.info(`Subscribed to topics: ${topics.join(', ')}`);
  }
}

// Factory function to create Kafka client from environment variables
export function createKafkaClient(): KafkaClient {
  const brokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
  const clientId = process.env.KAFKA_CLIENT_ID || 'survey-service';
  
  logger.info(`🔧 Kafka Config - Brokers: ${brokers.join(', ')}, ClientId: ${clientId}`);
  
  const config: KafkaConfig = {
    brokers,
    clientId,
    groupId: process.env.KAFKA_GROUP_ID,
    retry: {
      initialRetryTime: 100,
      retries: 8
    }
  };

  return new KafkaClient(config);
}
