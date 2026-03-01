import { Worker } from 'bullmq';
import { redisConnection, reminderQueue, checkRedisHealth } from './queue';
import { reminderService } from '../modules/reminder/reminder.service';
import { emailService } from './email';
import { prisma } from './database';
import { logger } from './logger';
import { ReminderJobData } from '../types';
import { queueDepth, queueJobsProcessed, queueJobDuration, errorCounter } from './metrics';

// ---------------------------------------------------------------------------
// Reminder Worker
// Processes jobs from the 'reminders' BullMQ queue.
// Delivery order: email first, then WhatsApp (when wired up).
// ---------------------------------------------------------------------------

const reminderWorker = new Worker<ReminderJobData>(
  'reminders',
  async (job) => {
    const jobStart = Date.now();
    const { reminderId, customerId, customerName, amount, message } = job.data;
    logger.info(
      {
        queue: 'reminders',
        jobId: job.id,
        reminderId,
        customerId,
        customerName,
        amount,
        attemptsMade: job.attemptsMade,
      },
      'Processing reminder job'
    );

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
      const next = await reminderService.scheduleNextOccurrence(reminderId);
      await reminderService.markAsSent(reminderId, { keepPending: !!next });
      queueJobsProcessed.inc({ queue: 'reminders', status: 'success' });
      queueJobDuration.observe({ queue: 'reminders', status: 'success' }, (Date.now() - jobStart) / 1000);
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
        const next = await reminderService.scheduleNextOccurrence(reminderId);
        await reminderService.markAsSent(reminderId, { keepPending: !!next });
        queueJobsProcessed.inc({ queue: 'reminders', status: 'success_final_attempt' });
        queueJobDuration.observe({ queue: 'reminders', status: 'success_final_attempt' }, (Date.now() - jobStart) / 1000);
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
  logger.info({ queue: 'reminders', jobId: job.id, reminderId: job.data.reminderId }, 'Reminder job completed');
});

reminderWorker.on('failed', async (job, err) => {
  queueJobsProcessed.inc({ queue: 'reminders', status: 'failed' });
  errorCounter.inc({ service: 'worker', type: err.name || 'worker_job_error' });
  logger.error(
    { queue: 'reminders', jobId: job?.id, reminderId: job?.data?.reminderId, error: err.message },
    'Reminder job failed'
  );
  if (job) {
    await reminderService.markAsFailed(job.data.reminderId).catch(() => {});
  }
});

let monitorTimer: NodeJS.Timeout | null = null;

const startWorkerMonitoring = () => {
  if (monitorTimer) return;

  const runSnapshot = async () => {
    try {
      const counts = await reminderQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
      const redisOk = await checkRedisHealth();

      queueDepth.set({ queue: 'reminders', state: 'waiting' }, counts.waiting ?? 0);
      queueDepth.set({ queue: 'reminders', state: 'active' }, counts.active ?? 0);
      queueDepth.set({ queue: 'reminders', state: 'delayed' }, counts.delayed ?? 0);
      queueDepth.set({ queue: 'reminders', state: 'completed' }, counts.completed ?? 0);
      queueDepth.set({ queue: 'reminders', state: 'failed' }, counts.failed ?? 0);

      logger.info(
        {
          queue: 'reminders',
          redisHealthy: redisOk,
          counts,
        },
        'Worker monitoring snapshot'
      );
    } catch (error: any) {
      errorCounter.inc({ service: 'worker_monitor', type: error?.name || 'snapshot_error' });
      logger.error({ error: error?.message }, 'Worker monitoring snapshot failed');
    }
  };

  monitorTimer = setInterval(runSnapshot, 30000);
  monitorTimer.unref();
  void runSnapshot();
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const startWorkers = (): void => {
  startWorkerMonitoring();
  logger.info({ queue: 'reminders', concurrency: 5 }, 'Queue workers started (reminder: email delivery, WhatsApp: TODO)');
};

export const closeWorkers = async (): Promise<void> => {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
  await reminderWorker.close();
  logger.info('Queue workers closed');
};
