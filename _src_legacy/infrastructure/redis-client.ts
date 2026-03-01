import { Redis } from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

/**
 * Standalone Redis client for conversation context storage.
 * Separate from BullMQ's internal connection so queue operations
 * and conversation reads/writes don't interfere with each other.
 */
export const redisClient = new Redis({
  host:                 config.redis.host,
  port:                 config.redis.port,
  password:             config.redis.password,
  maxRetriesPerRequest: 3,
  enableOfflineQueue:   false,   // fail fast if Redis is down rather than queuing forever
  lazyConnect:          true,    // don't connect until first command
  connectTimeout:       3000,
  commandTimeout:       2000,
});

redisClient.on('error', (err) => {
  logger.error({ err }, 'Redis conversation client error');
});

redisClient.on('connect', () => {
  logger.info('Redis conversation client connected');
});

/** TTL for all conversation keys — default 4 hours, override via CONV_TTL_HOURS env */
export const CONV_TTL_SECONDS = parseInt(process.env.CONV_TTL_HOURS || '4', 10) * 3600;

/** Graceful shutdown — called alongside closeQueues() */
export const closeRedisClient = async () => {
  await redisClient.quit();
};
