/**
 * Reminder infrastructure operations used by BullMQ workers.
 *
 * These three functions are the only parts of the reminder domain the worker
 * process needs. Keeping them here (infrastructure/) means workers.ts has
 * zero imports from src/modules/, which is the key requirement for a clean
 * monorepo split: the worker package only depends on infrastructure packages,
 * not on API business-module packages.
 *
 * reminder.service.ts delegates its identical methods here so there is a
 * single implementation used by both the API and the worker.
 */
import {
  addMinutes, addHours, addMonths, addDays,
  setHours, setMinutes, setSeconds, setMilliseconds,
} from 'date-fns';
import { prisma } from './database';
import { reminderQueue } from './queue';
import { logger } from './logger';
import { ReminderJobData } from '@execora/types';

// Kept internal — callers never need to touch the recurrence structure directly.
type RecurringPattern =
  | { type: 'interval_minutes'; value: number }
  | { type: 'daily_time'; hour: number; minute: number }
  | { type: 'monthly_date'; day: number; hour: number; minute: number }
  | { type: 'every_n_months'; months: number; day: number; hour: number; minute: number };

/**
 * Pure date function — computes the next scheduled time for a recurring reminder.
 * No DB, no side-effects. Exported so reminder.service.ts can reuse it.
 */
export function computeNextOccurrence(fromTime: Date, pattern: RecurringPattern): Date {
  const now = new Date();
  let next = new Date(fromTime);

  if (pattern.type === 'interval_minutes') {
    do { next = addMinutes(next, pattern.value); } while (next <= now);
    return next;
  }

  if (pattern.type === 'daily_time') {
    let d = setHours(now, pattern.hour);
    d = setMinutes(d, pattern.minute);
    d = setSeconds(d, 0);
    d = setMilliseconds(d, 0);
    if (d <= now) d = addDays(d, 1);
    return d;
  }

  if (pattern.type === 'monthly_date') {
    const clampedDay = Math.max(1, Math.min(31, pattern.day));
    let year = now.getFullYear();
    let month = now.getMonth();
    for (let i = 0; i < 24; i++) {
      const lastDay = new Date(year, month + 1, 0).getDate();
      const candidate = new Date(year, month, Math.min(clampedDay, lastDay), pattern.hour, pattern.minute, 0, 0);
      if (candidate > now) return candidate;
      month += 1;
      if (month > 11) { month = 0; year += 1; }
    }
    return addMonths(now, 1);
  }

  if (pattern.type === 'every_n_months') {
    do {
      next = addMonths(next, pattern.months);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      const day = Math.min(pattern.day, lastDay);
      next = new Date(next.getFullYear(), next.getMonth(), day, pattern.hour, pattern.minute, 0, 0);
    } while (next <= now);
    return next;
  }

  return addHours(now, 1);
}

/**
 * Reads the reminder's recurrence pattern, computes the next fire time,
 * updates the DB, and re-enqueues the BullMQ job.
 * Returns null when the reminder is one-time (no recurrence) or cancelled.
 */
export async function scheduleNextReminderOccurrence(reminderId: string): Promise<object | null> {
  const reminder = await prisma.reminder.findUnique({
    where:   { id: reminderId },
    include: { customer: { select: { name: true, phone: true } } },
  });

  if (!reminder || reminder.status === 'cancelled' || !reminder.recurringPattern) return null;
  if (!reminder.customerId || !(reminder as any).customer?.phone) return null;

  const pattern  = reminder.recurringPattern as unknown as RecurringPattern;
  const nextTime = computeNextOccurrence(reminder.scheduledTime, pattern);

  const updated = await prisma.reminder.update({
    where: { id: reminderId },
    data:  { scheduledTime: nextTime, status: 'pending' },
  });

  const delay = nextTime.getTime() - Date.now();
  const jobId = `reminder-${reminderId}-${nextTime.getTime()}`;

  await reminderQueue.add(
    'send-reminder',
    {
      reminderId,
      customerId:   reminder.customerId,
      customerName: (reminder as any).customer.name  || '',
      phone:        (reminder as any).customer.phone || '',
      amount:       parseFloat((reminder as any).notes || '0'),
      message:      reminder.customMessage || 'Payment reminder',
    } as ReminderJobData,
    { delay: delay > 0 ? delay : 0, jobId }
  );

  logger.info({ reminderId, nextTime }, 'Next reminder occurrence scheduled');
  return updated;
}

/**
 * Marks a reminder as sent (or keeps it pending for recurring reminders).
 */
export async function markReminderSent(
  reminderId: string,
  opts?: { keepPending?: boolean },
): Promise<void> {
  await prisma.reminder.update({
    where: { id: reminderId },
    data:  { status: opts?.keepPending ? 'pending' : 'sent', sentAt: new Date() },
  });
}

/**
 * Marks a reminder as failed and increments the retry counter.
 */
export async function markReminderFailed(reminderId: string): Promise<void> {
  await prisma.reminder.update({
    where: { id: reminderId },
    data:  { status: 'failed', lastAttempt: new Date(), retryCount: { increment: 1 } },
  });
}
