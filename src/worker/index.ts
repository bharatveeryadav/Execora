import { Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/queue';
import { logger } from '../lib/logger';
import { whatsappService } from '../services/whatsapp.service';
import { reminderService } from '../business/reminder.service';
import { prisma } from '../lib/database';
import { ReminderJobData, WhatsAppJobData } from '../types';
import dotenv from 'dotenv';

dotenv.config();

// Reminder worker
const reminderWorker = new Worker<ReminderJobData>(
  'reminders',
  async (job: Job<ReminderJobData>) => {
    const { reminderId, customerName, phone, amount, message } = job.data;

    logger.info({ reminderId, jobId: job.id }, 'Processing reminder job');

    try {
      // Send WhatsApp message
      const result = await whatsappService.sendTextMessage(phone, message);

      if (result.success) {
        // Mark reminder as sent
        await reminderService.markAsSent(reminderId, result.messageId);

        // Create WhatsApp message record
        await prisma.whatsAppMessage.create({
          data: {
            reminderId,
            phone,
            message,
            messageId: result.messageId,
            status: 'SENT',
          },
        });

        logger.info({ reminderId, messageId: result.messageId }, 'Reminder sent successfully');
        return { success: true, messageId: result.messageId };
      } else {
        // Mark as failed
        await reminderService.markAsFailed(reminderId);

        // Create failed message record
        await prisma.whatsAppMessage.create({
          data: {
            reminderId,
            phone,
            message,
            status: 'FAILED',
            errorMessage: result.error,
          },
        });

        logger.error({ reminderId, error: result.error }, 'Reminder send failed');
        throw new Error(result.error);
      }
    } catch (error: any) {
      logger.error({ error, reminderId }, 'Reminder job failed');
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

// WhatsApp worker
const whatsappWorker = new Worker<WhatsAppJobData>(
  'whatsapp',
  async (job: Job<WhatsAppJobData>) => {
    const { phone, message, messageType = 'text', reminderId } = job.data;

    logger.info({ jobId: job.id, phone, messageType }, 'Processing WhatsApp job');

    try {
      const result = await whatsappService.sendTextMessage(phone, message);

      if (result.success) {
        // Create message record
        await prisma.whatsAppMessage.create({
          data: {
            reminderId,
            phone,
            message,
            messageId: result.messageId,
            status: 'SENT',
          },
        });

        logger.info({ messageId: result.messageId }, 'WhatsApp message sent');
        return { success: true, messageId: result.messageId };
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      logger.error({ error, phone }, 'WhatsApp job failed');
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

// Worker event handlers
reminderWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Reminder job completed');
});

reminderWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Reminder job failed');
});

whatsappWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'WhatsApp job completed');
});

whatsappWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'WhatsApp job failed');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down workers');
  await reminderWorker.close();
  await whatsappWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down workers');
  await reminderWorker.close();
  await whatsappWorker.close();
  process.exit(0);
});

logger.info('Workers started successfully');

// Keep process running
process.stdin.resume();
