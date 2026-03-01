import { Worker } from 'bullmq';
import { redisConnection, reminderQueue, whatsappQueue, checkRedisHealth } from './queue';
import { scheduleNextReminderOccurrence, markReminderSent, markReminderFailed } from './reminder-ops';
import { emailService } from './email';
import { prisma } from './database';
import { logger } from './logger';
import { ReminderJobData, WhatsAppJobData } from '../types';
import { queueDepth, queueJobsProcessed, queueJobDuration, errorCounter } from './metrics';
import { whatsappService } from './whatsapp';
import { SYSTEM_TENANT_ID } from './bootstrap';

// ---------------------------------------------------------------------------
// Reminder Worker
// Processes jobs from the 'reminders' BullMQ queue.
// Delivery order: email first (if configured), then WhatsApp.
// Both channels are tried — at least one must succeed.
// ---------------------------------------------------------------------------

const reminderWorker = new Worker<ReminderJobData>(
  'reminders',
  async (job) => {
    const jobStart = Date.now();
    const { reminderId, customerId, customerName, phone, amount, message } = job.data;
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
    let deliveryChannel: string | null = null;
    let providerMessageId: string | undefined;

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
        deliveryChannel = 'email';
        logger.info({ reminderId, emailTo }, 'Reminder sent via email');
      }
    }

    // -----------------------------------------------------------------------
    // 2. WHATSAPP — use phone from job data if WhatsApp is configured
    // -----------------------------------------------------------------------
    if (!delivered && phone) {
      const waResult = await whatsappService.sendTextMessage(phone, message);
      if (waResult.success) {
        delivered = true;
        deliveryChannel = 'whatsapp';
        providerMessageId = waResult.messageId;
        logger.info({ reminderId, phone }, 'Reminder sent via WhatsApp');
      } else {
        logger.warn({ reminderId, phone, error: waResult.error }, 'WhatsApp reminder delivery failed');
      }
    }

    // -----------------------------------------------------------------------
    // 3. Audit log in DB (best-effort — do not fail the job on log error)
    // -----------------------------------------------------------------------
    if (delivered && deliveryChannel) {
      try {
        await prisma.messageLog.create({
          data: {
            tenantId:         SYSTEM_TENANT_ID,
            reminderId,
            recipient:        deliveryChannel === 'email' ? (emailTo ?? phone) : phone,
            messageContent:   message,
            channel:          deliveryChannel,
            providerMessageId: providerMessageId ?? null,
            status:           'sent',
          } as any,
        });
      } catch (dbError) {
        logger.error({ dbError, reminderId }, 'Failed to create message log (message was sent)');
      }
    }

    // -----------------------------------------------------------------------
    // 4. Mark reminder status in DB
    // -----------------------------------------------------------------------
    if (delivered) {
      const next = await scheduleNextReminderOccurrence(reminderId);
      await markReminderSent(reminderId, { keepPending: !!next });
      queueJobsProcessed.inc({ queue: 'reminders', status: 'success' });
      queueJobDuration.observe({ queue: 'reminders', status: 'success' }, (Date.now() - jobStart) / 1000);
    } else {
      // No delivery channel succeeded — retry up to BullMQ's attempt limit.
      // On the final attempt, mark as sent anyway to prevent infinite retries.
      const attemptsMade = job.attemptsMade ?? 0;
      const maxAttempts  = job.opts?.attempts ?? 3;

      if (attemptsMade >= maxAttempts - 1) {
        logger.warn(
          { reminderId, customerId, attemptsMade },
          'No delivery channel for reminder — marking sent after final attempt'
        );

        try {
          await prisma.messageLog.create({
            data: {
              tenantId:       SYSTEM_TENANT_ID,
              reminderId,
              recipient:      phone,
              messageContent: message,
              channel:        'whatsapp',
              status:         'failed',
              errorMessage:   'No delivery channel available after all attempts',
            } as any,
          });
        } catch { /* ignore audit log failures */ }

        const next = await scheduleNextReminderOccurrence(reminderId);
        await markReminderSent(reminderId, { keepPending: !!next });
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
    await markReminderFailed(job.data.reminderId).catch(() => {});
  }
});

// ---------------------------------------------------------------------------
// WhatsApp Direct Worker
// Processes jobs from the 'whatsapp' queue — direct message sends (not tied
// to the reminders flow; used for ad-hoc notifications and invoice delivery).
// ---------------------------------------------------------------------------

const whatsappWorker = new Worker<WhatsAppJobData>(
  'whatsapp',
  async (job) => {
    const jobStart = Date.now();
    const { phone, message, reminderId } = job.data;
    logger.info({ queue: 'whatsapp', jobId: job.id, phone }, 'Processing WhatsApp job');

    const result = await whatsappService.sendTextMessage(phone, message);

    if (result.success) {
      try {
        await prisma.messageLog.create({
          data: {
            tenantId:          SYSTEM_TENANT_ID,
            reminderId,
            recipient:         phone,
            messageContent:    message,
            channel:           'whatsapp',
            providerMessageId: result.messageId,
            status:            'sent',
          } as any,
        });
      } catch (dbError) {
        logger.error({ dbError, phone }, 'Failed to create WhatsApp message log (message was sent)');
      }

      queueJobsProcessed.inc({ queue: 'whatsapp', status: 'success' });
      queueJobDuration.observe({ queue: 'whatsapp', status: 'success' }, (Date.now() - jobStart) / 1000);
      logger.info({ queue: 'whatsapp', messageId: result.messageId }, 'WhatsApp message sent');
      return { success: true, messageId: result.messageId };
    } else {
      queueJobsProcessed.inc({ queue: 'whatsapp', status: 'failed' });
      queueJobDuration.observe({ queue: 'whatsapp', status: 'failed' }, (Date.now() - jobStart) / 1000);
      throw new Error(result.error ?? 'WhatsApp send failed');
    }
  },
  {
    connection:  redisConnection,
    concurrency: 10,
  }
);

whatsappWorker.on('completed', (job) => {
  logger.info({ queue: 'whatsapp', jobId: job.id }, 'WhatsApp job completed');
});

whatsappWorker.on('failed', (job, err) => {
  errorCounter.inc({ service: 'worker', type: err.name || 'whatsapp_job_error' });
  logger.error({ queue: 'whatsapp', jobId: job?.id, phone: job?.data?.phone, error: err.message }, 'WhatsApp job failed');
});

// ---------------------------------------------------------------------------
// Queue Monitoring — snapshot metrics every 30 s
// ---------------------------------------------------------------------------

let monitorTimer: NodeJS.Timeout | null = null;

const startWorkerMonitoring = () => {
  if (monitorTimer) return;

  const runSnapshot = async () => {
    try {
      const [reminderCounts, whatsappCounts, redisOk] = await Promise.all([
        reminderQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed'),
        whatsappQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed'),
        checkRedisHealth(),
      ]);

      for (const [state, count] of Object.entries(reminderCounts)) {
        queueDepth.set({ queue: 'reminders', state }, count ?? 0);
      }
      for (const [state, count] of Object.entries(whatsappCounts)) {
        queueDepth.set({ queue: 'whatsapp', state }, count ?? 0);
      }

      logger.info(
        { redisHealthy: redisOk, reminders: reminderCounts, whatsapp: whatsappCounts },
        'Worker monitoring snapshot'
      );
    } catch (error: any) {
      errorCounter.inc({ service: 'worker_monitor', type: error?.name || 'snapshot_error' });
      logger.error({ error: error?.message }, 'Worker monitoring snapshot failed');
    }
  };

  monitorTimer = setInterval(runSnapshot, 30_000);
  monitorTimer.unref();
  void runSnapshot();
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const startWorkers = (): void => {
  startWorkerMonitoring();
  logger.info(
    { concurrency: { reminders: 5, whatsapp: 10 } },
    'Queue workers started (reminders: email → WhatsApp, whatsapp: direct sends)'
  );
};

export const closeWorkers = async (): Promise<void> => {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
  await Promise.all([reminderWorker.close(), whatsappWorker.close()]);
  logger.info('Queue workers closed');
};
