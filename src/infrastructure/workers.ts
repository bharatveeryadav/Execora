import { Worker } from 'bullmq';
import { redisConnection } from './queue';
import { reminderService } from '../modules/reminder/reminder.service';
import { emailService } from './email';
import { prisma } from './database';
import { logger } from './logger';
import { ReminderJobData } from '../types';

// ---------------------------------------------------------------------------
// Reminder Worker
// Processes jobs from the 'reminders' BullMQ queue.
// Delivery order: email first, then WhatsApp (when wired up).
// ---------------------------------------------------------------------------

const reminderWorker = new Worker<ReminderJobData>(
  'reminders',
  async (job) => {
    const { reminderId, customerId, customerName, amount, message } = job.data;
    logger.info({ jobId: job.id, reminderId, customerName, amount }, 'Processing reminder job');

    let delivered = false;

    // -----------------------------------------------------------------------
    // 1. EMAIL — look up customer email from prefs or customer record
    // -----------------------------------------------------------------------
    const [customer, prefs] = await Promise.all([
      prisma.customer.findUnique({
        where:  { id: customerId },
        select: { email: true },
      }),
      prisma.customerCommunicationPrefs.findUnique({
        where:  { customerId },
        select: { emailEnabled: true, emailAddress: true },
      }),
    ]);

    const emailTo =
      prefs?.emailEnabled && prefs?.emailAddress
        ? prefs.emailAddress
        : customer?.email ?? null;

    if (emailTo) {
      const sent = await emailService.sendPaymentReminderEmail(emailTo, customerName, amount);
      if (sent) {
        delivered = true;
        logger.info({ reminderId, emailTo }, 'Reminder sent via email');
      }
    }

    // -----------------------------------------------------------------------
    // 2. WHATSAPP — TODO: wire up when WhatsApp provider is configured
    //    Replace this block with the actual send call:
    //
    //    const { phone } = job.data;
    //    if (phone) {
    //      const sent = await whatsappService.sendTextMessage(phone, message);
    //      if (sent) delivered = true;
    //    }
    // -----------------------------------------------------------------------

    // Mark reminder status in DB
    if (delivered) {
      await reminderService.markAsSent(reminderId);
    } else {
      // No delivery channel available — log a warning.
      // BullMQ will retry automatically up to the queue's `attempts` limit.
      // On final retry we still mark sent to prevent infinite loops.
      const attemptsMade = job.attemptsMade ?? 0;
      const maxAttempts  = job.opts?.attempts ?? 3;

      if (attemptsMade >= maxAttempts - 1) {
        logger.warn(
          { reminderId, customerId, attemptsMade },
          'No delivery channel for reminder — marking sent after final attempt'
        );
        await reminderService.markAsSent(reminderId);
      } else {
        logger.warn(
          { reminderId, customerId, attemptsMade },
          'Reminder delivery failed — will retry'
        );
        throw new Error(`No delivery channel for reminder ${reminderId}`);
      }
    }
  },
  {
    connection:  redisConnection,
    concurrency: 5,
  }
);

reminderWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, reminderId: job.data.reminderId }, 'Reminder job completed');
});

reminderWorker.on('failed', async (job, err) => {
  logger.error(
    { jobId: job?.id, reminderId: job?.data?.reminderId, error: err.message },
    'Reminder job failed'
  );
  if (job) {
    await reminderService.markAsFailed(job.data.reminderId).catch(() => {});
  }
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const startWorkers = (): void => {
  logger.info('Queue workers started (reminder: email delivery, WhatsApp: TODO)');
};

export const closeWorkers = async (): Promise<void> => {
  await reminderWorker.close();
  logger.info('Queue workers closed');
};
