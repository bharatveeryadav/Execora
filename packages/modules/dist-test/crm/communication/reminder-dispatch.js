"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markReminderFailed = exports.markReminderSent = exports.scheduleNextReminderOccurrence = exports.computeNextOccurrence = void 0;
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
var reminder_ops_1 = require("../../infra/reminder-ops");
Object.defineProperty(exports, "computeNextOccurrence", { enumerable: true, get: function () { return reminder_ops_1.computeNextOccurrence; } });
Object.defineProperty(exports, "scheduleNextReminderOccurrence", { enumerable: true, get: function () { return reminder_ops_1.scheduleNextReminderOccurrence; } });
Object.defineProperty(exports, "markReminderSent", { enumerable: true, get: function () { return reminder_ops_1.markReminderSent; } });
Object.defineProperty(exports, "markReminderFailed", { enumerable: true, get: function () { return reminder_ops_1.markReminderFailed; } });
//# sourceMappingURL=reminder-dispatch.js.map