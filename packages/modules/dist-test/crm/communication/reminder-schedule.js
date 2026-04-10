"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderService = void 0;
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
var reminder_service_1 = require("../../modules/reminder/reminder.service");
Object.defineProperty(exports, "reminderService", { enumerable: true, get: function () { return reminder_service_1.reminderService; } });
//# sourceMappingURL=reminder-schedule.js.map