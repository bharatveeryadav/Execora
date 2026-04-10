type RecurringPattern = {
    type: 'interval_minutes';
    value: number;
} | {
    type: 'daily_time';
    hour: number;
    minute: number;
} | {
    type: 'monthly_date';
    day: number;
    hour: number;
    minute: number;
} | {
    type: 'every_n_months';
    months: number;
    day: number;
    hour: number;
    minute: number;
};
/**
 * Pure date function — computes the next scheduled time for a recurring reminder.
 * No DB, no side-effects. Exported so reminder.service.ts can reuse it.
 */
export declare function computeNextOccurrence(fromTime: Date, pattern: RecurringPattern): Date;
/**
 * Reads the reminder's recurrence pattern, computes the next fire time,
 * updates the DB, and re-enqueues the BullMQ job.
 * Returns null when the reminder is one-time (no recurrence) or cancelled.
 */
export declare function scheduleNextReminderOccurrence(reminderId: string): Promise<object | null>;
/**
 * Marks a reminder as sent (or keeps it pending for recurring reminders).
 */
export declare function markReminderSent(reminderId: string, opts?: {
    keepPending?: boolean;
}): Promise<void>;
/**
 * Marks a reminder as failed and increments the retry counter.
 */
export declare function markReminderFailed(reminderId: string): Promise<void>;
export {};
//# sourceMappingURL=reminder-ops.d.ts.map