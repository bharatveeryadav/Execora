/**
 * crm/communication/reminder-dispatch
 *
 * Feature: reminder dispatch infrastructure — schedule recurring occurrences,
 * mark reminders sent/failed, and compute next occurrence times.
 * Owner: crm domain
 * Source of truth: infra/reminder-ops.ts (utility functions used by workers)
 *
 * Worker path: markReminderSent, markReminderFailed, scheduleNextReminderOccurrence
 * Utility: computeNextOccurrence
 */
export {
  computeNextOccurrence,
  scheduleNextReminderOccurrence,
  markReminderSent,
  markReminderFailed,
} from "../../infra/reminder-ops";
