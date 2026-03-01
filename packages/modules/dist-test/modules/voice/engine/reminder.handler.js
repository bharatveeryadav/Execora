"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCreateReminder = executeCreateReminder;
exports.executeCancelReminder = executeCancelReminder;
exports.executeListReminders = executeListReminders;
exports.executeModifyReminder = executeModifyReminder;
/**
 * Reminder intent handlers.
 * Covers: CREATE_REMINDER, CANCEL_REMINDER, LIST_REMINDERS, MODIFY_REMINDER
 */
const reminder_service_1 = require("../../reminder/reminder.service");
const shared_1 = require("./shared");
// ── CREATE_REMINDER ──────────────────────────────────────────────────────────
async function executeCreateReminder(entities, conversationId) {
    const amount = Number(entities.amount);
    const datetime = entities.datetime || entities.date || entities.time;
    if (!isFinite(amount) || amount <= 0) {
        return { success: false, message: 'Reminder amount required', error: 'MISSING_AMOUNT' };
    }
    const resolution = await (0, shared_1.resolveCustomer)(entities, conversationId);
    if (resolution.multiple) {
        return { success: false, message: 'Multiple customers found. Please specify customer name with landmark.', error: 'MULTIPLE_CUSTOMERS', data: { customers: (resolution.candidates || []).slice(0, 3) } };
    }
    if (!resolution.customer) {
        return { success: false, message: `Customer '${resolution.query || 'specified'}' not found`, error: 'CUSTOMER_NOT_FOUND' };
    }
    const customer = resolution.customer;
    if (!customer.phone) {
        return { success: false, message: `${customer.name} has no phone number`, error: 'NO_PHONE' };
    }
    const reminder = await reminder_service_1.reminderService.scheduleReminder(customer.id, amount, datetime || 'tomorrow 7pm');
    return {
        success: true,
        message: `Reminder scheduled for ${customer.name} for ₹${amount}`,
        data: { reminderId: reminder.id, customer: customer.name, amount, scheduledTime: reminder.scheduledTime },
    };
}
// ── CANCEL_REMINDER ──────────────────────────────────────────────────────────
async function executeCancelReminder(entities, conversationId) {
    const resolution = await (0, shared_1.resolveCustomer)(entities, conversationId);
    if (resolution.multiple) {
        return { success: false, message: 'Multiple customers found. Please specify customer name with landmark.', error: 'MULTIPLE_CUSTOMERS', data: { customers: (resolution.candidates || []).slice(0, 3) } };
    }
    if (!resolution.customer) {
        return { success: false, message: `Customer '${resolution.query || 'specified'}' not found`, error: 'CUSTOMER_NOT_FOUND' };
    }
    const customer = resolution.customer;
    const reminders = await reminder_service_1.reminderService.getPendingReminders(customer.id);
    if (reminders.length === 0) {
        return { success: false, message: `No pending reminders for ${customer.name}`, error: 'NO_REMINDER' };
    }
    await reminder_service_1.reminderService.cancelReminder(reminders[0].id);
    return {
        success: true,
        message: `Reminder cancelled for ${customer.name}`,
        data: { reminderId: reminders[0].id, customer: customer.name },
    };
}
// ── LIST_REMINDERS ───────────────────────────────────────────────────────────
async function executeListReminders() {
    const reminders = await reminder_service_1.reminderService.getPendingReminders();
    return {
        success: true,
        message: `${reminders.length} pending reminders`,
        data: {
            count: reminders.length,
            reminders: reminders.map((r) => ({
                customer: r.customer?.name ?? '(unknown)',
                amount: parseFloat(r.notes || '0'),
                scheduledTime: r.scheduledTime,
            })),
        },
    };
}
// ── MODIFY_REMINDER ──────────────────────────────────────────────────────────
async function executeModifyReminder(entities, conversationId) {
    const datetime = entities.datetime || entities.date || entities.time;
    if (!datetime) {
        return { success: false, message: 'New reminder time required', error: 'MISSING_DATETIME' };
    }
    const resolution = await (0, shared_1.resolveCustomer)(entities, conversationId);
    if (resolution.multiple) {
        return { success: false, message: 'Multiple customers found. Please specify customer name with landmark.', error: 'MULTIPLE_CUSTOMERS', data: { customers: (resolution.candidates || []).slice(0, 3) } };
    }
    if (!resolution.customer) {
        return { success: false, message: `Customer '${resolution.query || 'specified'}' not found`, error: 'CUSTOMER_NOT_FOUND' };
    }
    const customer = resolution.customer;
    const reminders = await reminder_service_1.reminderService.getPendingReminders(customer.id);
    if (reminders.length === 0) {
        return { success: false, message: `No pending reminders for ${customer.name}`, error: 'NO_REMINDER' };
    }
    await reminder_service_1.reminderService.modifyReminderTime(reminders[0].id, datetime);
    return {
        success: true,
        message: `Reminder time updated for ${customer.name}`,
        data: { reminderId: reminders[0].id, customer: customer.name, newTime: datetime },
    };
}
//# sourceMappingURL=reminder.handler.js.map