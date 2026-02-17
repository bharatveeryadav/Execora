import { Queue, QueueEvents, type ConnectionOptions } from 'bullmq';
import { config } from '../config';

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
};
