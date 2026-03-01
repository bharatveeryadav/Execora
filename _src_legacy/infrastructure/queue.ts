import { Queue, QueueEvents, type ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config';
import { closeRedisClient } from './redis-client';

// Redis connection
const connection: ConnectionOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
};

// Queue definitions
export const reminderQueue = new Queue('reminders', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
});

export const whatsappQueue = new Queue('whatsapp', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30000, // 30 seconds
    },
  },
});

export const mediaQueue = new Queue('media', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
  },
});

// Queue events for monitoring
export const reminderQueueEvents = new QueueEvents('reminders', { connection });
export const whatsappQueueEvents = new QueueEvents('whatsapp', { connection });

// Export connection for workers
export { connection as redisConnection };

// Graceful shutdown
export const closeQueues = async () => {
  await reminderQueue.close();
  await whatsappQueue.close();
  await mediaQueue.close();
  await reminderQueueEvents.close();
  await whatsappQueueEvents.close();
  await closeRedisClient();
};

// Redis health check — single short-lived client, reused across calls
let _healthClient: Redis | null = null;

export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    if (!_healthClient) {
      _healthClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
    }
    const result = await _healthClient.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
};
