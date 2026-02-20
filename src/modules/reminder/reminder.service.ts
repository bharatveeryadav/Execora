import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { reminderQueue } from '../../infrastructure/queue';
import { Decimal } from '@prisma/client/runtime/library';
import { ReminderJobData } from '../../types';
import { parseISO, addDays, addHours, setHours, setMinutes } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { config } from '../../config';

class ReminderService {
  /**
   * Parse natural language date/time to actual datetime
   */
  private parseDateTime(dateTimeStr: string): Date {
    const now = new Date();
    const lowerStr = dateTimeStr.toLowerCase();

    // "kal" / "tomorrow"
    if (lowerStr.includes('kal') || lowerStr.includes('tomorrow')) {
      let date = addDays(now, 1);

      // Extract time if mentioned
      const timeMatch = lowerStr.match(/(\d+)\s*(baje|pm|am)/);
      if (timeMatch) {
        const hour = parseInt(timeMatch[1], 10);
        date = setHours(date, hour >= 12 ? hour : hour + 12); // Assume evening if not specified
        date = setMinutes(date, 0);
      } else {
        // Default to 7 PM
        date = setHours(date, 19);
        date = setMinutes(date, 0);
      }

      return fromZonedTime(date, config.timezone);
    }

    // "aaj" / "today"
    if (lowerStr.includes('aaj') || lowerStr.includes('today')) {
      let date = now;

      // Extract time
      const timeMatch = lowerStr.match(/(\d+)\s*(baje|pm|am)/);
      if (timeMatch) {
        const hour = parseInt(timeMatch[1], 10);
        date = setHours(date, hour >= 12 ? hour : hour + 12);
        date = setMinutes(date, 0);
      }

      return fromZonedTime(date, config.timezone);
    }

    // Specific hour today
    const hourMatch = lowerStr.match(/(\d+)\s*(baje|pm|am)/);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1], 10);
      let date = setHours(now, hour >= 12 ? hour : hour + 12);
      date = setMinutes(date, 0);

      // If time has passed, schedule for tomorrow
      if (date < now) {
        date = addDays(date, 1);
      }

      return fromZonedTime(date, config.timezone);
    }

    // Default: 1 hour from now
    return addHours(now, 1);
  }

  /**
   * Schedule a payment reminder
   */
  async scheduleReminder(
    customerId: string,
    amount: number,
    dateTimeStr: string,
    customMessage?: string
  ) {
    try {
      if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
        throw new Error('Customer ID is required');
      }
      if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
        throw new Error('Reminder amount must be a positive number');
      }
      if (!dateTimeStr || typeof dateTimeStr !== 'string' || !dateTimeStr.trim()) {
        throw new Error('Date/time is required for scheduling a reminder');
      }

      // Get customer details
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      if (!customer.phone) {
        throw new Error('Customer phone number not found');
      }

      // Parse date/time
      const sendAt = this.parseDateTime(dateTimeStr);

      // Create default message if not provided
      const message =
        customMessage ||
        `Namaste ${customer.name} ji,\n\n₹${amount} payment pending hai. Kripya payment kar dein. 🙏\n\nDhanyavad`;

      // Create reminder in database
      const reminder = await prisma.reminder.create({
        data: {
          customerId,
          amount: new Decimal(amount),
          message,
          sendAt,
          status: 'SCHEDULED',
        },
        include: {
          customer: true,
        },
      });

      // Schedule job in BullMQ
      const delay = sendAt.getTime() - Date.now();

      try {
        await reminderQueue.add(
          'send-reminder',
          {
            reminderId: reminder.id,
            customerId: customer.id,
            customerName: customer.name,
            phone: customer.phone,
            amount,
            message,
          } as ReminderJobData,
          {
            delay: delay > 0 ? delay : 0,
            jobId: `reminder-${reminder.id}`,
          }
        );
      } catch (queueError) {
        // Queue add failed — mark reminder as failed to avoid orphaned SCHEDULED record
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'FAILED' },
        }).catch((updateErr) => {
          logger.error({ updateErr, reminderId: reminder.id }, 'Failed to mark reminder as failed after queue error');
        });
        throw queueError;
      }

      logger.info(
        {
          reminderId: reminder.id,
          customerId,
          sendAt,
          delay,
        },
        'Reminder scheduled'
      );

      return reminder;
    } catch (error) {
      logger.error({ error, customerId, amount, dateTimeStr }, 'Schedule reminder failed');
      throw error;
    }
  }

  /**
   * Cancel a scheduled reminder
   */
  async cancelReminder(reminderId: string) {
    try {
      // Update reminder status
      const reminder = await prisma.reminder.update({
        where: { id: reminderId },
        data: { status: 'CANCELLED' },
      });

      // Remove job from queue if not already processed
      try {
        const job = await reminderQueue.getJob(`reminder-${reminderId}`);
        if (job) {
          await job.remove();
        }
      } catch (err) {
        logger.warn({ err, reminderId }, 'Job not found in queue or already processed');
      }

      logger.info({ reminderId }, 'Reminder cancelled');

      return reminder;
    } catch (error) {
      logger.error({ error, reminderId }, 'Cancel reminder failed');
      throw error;
    }
  }

  /**
   * Modify reminder time
   */
  async modifyReminderTime(reminderId: string, newDateTimeStr: string) {
    try {
      const newSendAt = this.parseDateTime(newDateTimeStr);

      // Update reminder
      const reminder = await prisma.reminder.update({
        where: { id: reminderId },
        data: { sendAt: newSendAt },
        include: {
          customer: true,
        },
      });

      // Remove old job
      try {
        const oldJob = await reminderQueue.getJob(`reminder-${reminderId}`);
        if (oldJob) {
          await oldJob.remove();
        }
      } catch (err) {
        logger.warn({ err, reminderId }, 'Old job not found');
      }

      // Schedule new job
      const delay = newSendAt.getTime() - Date.now();

      await reminderQueue.add(
        'send-reminder',
        {
          reminderId: reminder.id,
          customerId: reminder.customerId,
          customerName: reminder.customer.name,
          phone: reminder.customer.phone!,
          amount: parseFloat(reminder.amount.toString()),
          message: reminder.message,
        } as ReminderJobData,
        {
          delay: delay > 0 ? delay : 0,
          jobId: `reminder-${reminder.id}`,
        }
      );

      logger.info({ reminderId, newSendAt }, 'Reminder time modified');

      return reminder;
    } catch (error) {
      logger.error({ error, reminderId, newDateTimeStr }, 'Modify reminder failed');
      throw error;
    }
  }

  /**
   * Get pending reminders
   */
  async getPendingReminders(customerId?: string) {
    return await prisma.reminder.findMany({
      where: {
        status: 'SCHEDULED',
        ...(customerId && { customerId }),
      },
      orderBy: { sendAt: 'asc' },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * Get customer reminders
   */
  async getCustomerReminders(customerId: string, limit: number = 10) {
    return await prisma.reminder.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * Mark reminder as sent
   */
  async markAsSent(reminderId: string, messageId?: string) {
    return await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Mark reminder as failed
   */
  async markAsFailed(reminderId: string) {
    return await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        retryCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Get reminders due now
   */
  async getDueReminders() {
    return await prisma.reminder.findMany({
      where: {
        status: 'SCHEDULED',
        sendAt: {
          lte: new Date(),
        },
      },
      include: {
        customer: true,
      },
    });
  }
}

export const reminderService = new ReminderService();
