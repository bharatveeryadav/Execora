"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeNextOccurrence = computeNextOccurrence;
exports.scheduleNextReminderOccurrence = scheduleNextReminderOccurrence;
exports.markReminderSent = markReminderSent;
exports.markReminderFailed = markReminderFailed;
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
const date_fns_1 = require("date-fns");
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
const core_3 = require("@execora/core");
/**
 * Pure date function — computes the next scheduled time for a recurring reminder.
 * No DB, no side-effects. Exported so reminder.service.ts can reuse it.
 */
function computeNextOccurrence(fromTime, pattern) {
    const now = new Date();
    let next = new Date(fromTime);
    if (pattern.type === 'interval_minutes') {
        do {
            next = (0, date_fns_1.addMinutes)(next, pattern.value);
        } while (next <= now);
        return next;
    }
    if (pattern.type === 'daily_time') {
        let d = (0, date_fns_1.setHours)(now, pattern.hour);
        d = (0, date_fns_1.setMinutes)(d, pattern.minute);
        d = (0, date_fns_1.setSeconds)(d, 0);
        d = (0, date_fns_1.setMilliseconds)(d, 0);
        if (d <= now)
            d = (0, date_fns_1.addDays)(d, 1);
        return d;
    }
    if (pattern.type === 'monthly_date') {
        const clampedDay = Math.max(1, Math.min(31, pattern.day));
        let year = now.getFullYear();
        let month = now.getMonth();
        for (let i = 0; i < 24; i++) {
            const lastDay = new Date(year, month + 1, 0).getDate();
            const candidate = new Date(year, month, Math.min(clampedDay, lastDay), pattern.hour, pattern.minute, 0, 0);
            if (candidate > now)
                return candidate;
            month += 1;
            if (month > 11) {
                month = 0;
                year += 1;
            }
        }
        return (0, date_fns_1.addMonths)(now, 1);
    }
    if (pattern.type === 'every_n_months') {
        do {
            next = (0, date_fns_1.addMonths)(next, pattern.months);
            const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
            const day = Math.min(pattern.day, lastDay);
            next = new Date(next.getFullYear(), next.getMonth(), day, pattern.hour, pattern.minute, 0, 0);
        } while (next <= now);
        return next;
    }
    return (0, date_fns_1.addHours)(now, 1);
}
/**
 * Reads the reminder's recurrence pattern, computes the next fire time,
 * updates the DB, and re-enqueues the BullMQ job.
 * Returns null when the reminder is one-time (no recurrence) or cancelled.
 */
async function scheduleNextReminderOccurrence(reminderId) {
    const reminder = await core_1.prisma.reminder.findUnique({
        where: { id: reminderId },
        include: { customer: { select: { name: true, phone: true } } },
    });
    if (!reminder || reminder.status === 'cancelled' || !reminder.recurringPattern)
        return null;
    if (!reminder.customerId || !reminder.customer?.phone)
        return null;
    const pattern = reminder.recurringPattern;
    const nextTime = computeNextOccurrence(reminder.scheduledTime, pattern);
    const updated = await core_1.prisma.reminder.update({
        where: { id: reminderId },
        data: { scheduledTime: nextTime, status: 'pending' },
    });
    const delay = nextTime.getTime() - Date.now();
    const jobId = `reminder-${reminderId}-${nextTime.getTime()}`;
    await core_2.reminderQueue.add('send-reminder', {
        reminderId,
        customerId: reminder.customerId,
        customerName: reminder.customer.name || '',
        phone: reminder.customer.phone || '',
        amount: parseFloat(reminder.notes || '0'),
        message: reminder.customMessage || 'Payment reminder',
    }, { delay: delay > 0 ? delay : 0, jobId });
    core_3.logger.info({ reminderId, nextTime }, 'Next reminder occurrence scheduled');
    return updated;
}
/**
 * Marks a reminder as sent (or keeps it pending for recurring reminders).
 */
async function markReminderSent(reminderId, opts) {
    await core_1.prisma.reminder.update({
        where: { id: reminderId },
        data: { status: opts?.keepPending ? 'pending' : 'sent', sentAt: new Date() },
    });
}
/**
 * Marks a reminder as failed and increments the retry counter.
 */
async function markReminderFailed(reminderId) {
    await core_1.prisma.reminder.update({
        where: { id: reminderId },
        data: { status: 'failed', lastAttempt: new Date(), retryCount: { increment: 1 } },
    });
}
//# sourceMappingURL=reminder-ops.js.map