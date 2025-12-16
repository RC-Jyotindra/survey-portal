import Redis, { RedisOptions } from 'ioredis';
import { logger } from './logger.config';

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

export class RedisClient {
  private redis: Redis;
  private config: RedisConfig;

  constructor(config: RedisConfig) {
    this.config = config;
    
    // SECURITY: Validate password is provided in production
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !config.password && !config.url?.includes('@')) {
      logger.warn('⚠️  WARNING: Redis password not provided in production environment!');
      logger.warn('⚠️  This is a security risk. Please set REDIS_PASSWORD environment variable.');
    }
    
    const redisOptions: RedisOptions = {
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      lazyConnect: config.lazyConnect || true,
      // Connection timeout
      connectTimeout: 10000,
      // Retry strategy
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      // Reconnect on error
      enableReadyCheck: true,
      ...config
    };

    if (config.url) {
      // If URL is provided, use it (should include password: redis://:password@host:port)
      this.redis = new Redis(config.url, redisOptions);
    } else {
      // Use individual config options
      this.redis = new Redis({
        host: config.host || 'localhost',
        port: config.port || 6379,
        password: config.password, // REQUIRED for production
        db: config.db || 0,
        ...redisOptions
      });
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.redis.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.redis.on('error', (error) => {
      // SECURITY: Log authentication errors specifically
      if (error.message?.includes('NOAUTH') || error.message?.includes('invalid password')) {
        logger.error('❌ Redis authentication failed. Check REDIS_PASSWORD environment variable.');
        logger.error('Redis error:', error.message);
      } else {
        logger.error('Redis client error:', error);
      }
    });

    this.redis.on('close', () => {
      logger.info('Redis client connection closed');
    });

    this.redis.on('reconnecting', (delay: number) => {
      logger.warn(`Redis client reconnecting in ${delay}ms...`);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      logger.error('Error disconnecting Redis client:', error);
    }
  }

  // Session Management
  async setSessionData(sessionId: string, data: Record<string, any>, ttlSeconds?: number): Promise<void> {
    const key = `session:${sessionId}`;
    const value = JSON.stringify(data);
    
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async getSessionData(sessionId: string): Promise<Record<string, any> | null> {
    const key = `session:${sessionId}`;
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async deleteSessionData(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redis.del(key);
  }

  // Rate Limiting
  async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowSeconds);
    const results = await pipeline.exec();
    return results?.[0]?.[1] as number || 0;
  }

  async getRateLimitCount(key: string): Promise<number> {
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  // Caching
  async setCache(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serializedValue);
    } else {
      await this.redis.set(key, serializedValue);
    }
  }

  async getCache<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async deleteCache(key: string): Promise<void> {
    await this.redis.del(key);
  }

  // Quota Counters (for dashboards only - not source of truth)
  async incrementQuotaCounter(bucketId: string, field: 'filled' | 'reserved'): Promise<number> {
    const key = `quota:${bucketId}`;
    return await this.redis.hincrby(key, field, 1);
  }

  async decrementQuotaCounter(bucketId: string, field: 'filled' | 'reserved'): Promise<number> {
    const key = `quota:${bucketId}`;
    return await this.redis.hincrby(key, field, -1);
  }

  async getQuotaCounters(bucketId: string): Promise<{ filled: number; reserved: number }> {
    const key = `quota:${bucketId}`;
    const result = await this.redis.hmget(key, 'filled', 'reserved');
    return {
      filled: parseInt(result[0] || '0', 10),
      reserved: parseInt(result[1] || '0', 10)
    };
  }

  // Survey Definition Caching
  async setSurveyDefinition(surveyId: string, definition: any, ttlSeconds: number = 3600): Promise<void> {
    const key = `survey:${surveyId}:definition`;
    await this.setCache(key, definition, ttlSeconds);
  }

  async getSurveyDefinition(surveyId: string): Promise<any | null> {
    const key = `survey:${surveyId}:definition`;
    return await this.getCache(key);
  }

  // Health Check
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }

  // Get the underlying Redis instance for advanced operations
  getRedis(): Redis {
    return this.redis;
  }
}

// Factory function to create Redis client from environment variables
export function createRedisClient(): RedisClient {
  const password = process.env.REDIS_PASSWORD;
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const db = parseInt(process.env.REDIS_DB || '0', 10);
  
  // SECURITY: Build Redis URL with password if provided
  // Format: redis://:password@host:port/db
  let redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl && password) {
    // Construct URL with password if not provided but password exists
    redisUrl = `redis://:${encodeURIComponent(password)}@${host}:${port}/${db}`;
  } else if (!redisUrl) {
    // No URL and no password - use individual config
    redisUrl = undefined;
  }
  // If REDIS_URL is provided, use it as-is (should include password)
  
  const config: RedisConfig = {
    url: redisUrl,
    host: host,
    port: port,
    password: password, // Always pass password separately too (for non-URL connections)
    db: db,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true
  };

  return new RedisClient(config);
}
