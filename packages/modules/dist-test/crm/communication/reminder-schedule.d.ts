/**
 * crm/communication/reminder-schedule
 *
 * Feature: customer reminder scheduling — create, cancel, modify, and query reminders.
 * Owner: crm domain
 * Source of truth: modules/reminder/reminder.service.ts (ReminderService class)
 *
 * Write path: scheduleReminder, cancelReminder, modifyReminderTime, bulkScheduleReminders
 * Read path: getPendingReminders, getCustomerReminders, getDueReminders
 * Worker path: markAsSent, markAsFailed, scheduleNextOccurrence
 */
export { reminderService } from "../../modules/reminder/reminder.service";
//# sourceMappingURL=reminder-schedule.d.ts.map