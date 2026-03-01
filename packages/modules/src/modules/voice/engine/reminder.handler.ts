/**
 * Reminder intent handlers.
 * Covers: CREATE_REMINDER, CANCEL_REMINDER, LIST_REMINDERS, MODIFY_REMINDER
 */
import { reminderService } from '../../reminder/reminder.service';
import { resolveCustomer } from './shared';
import type { ExecutionResult } from '@execora/types';

// ── CREATE_REMINDER ──────────────────────────────────────────────────────────

export async function executeCreateReminder(
  entities: Record<string, any>,
  conversationId?: string,
): Promise<ExecutionResult> {
  const amount   = Number(entities.amount);
  const datetime = entities.datetime || entities.date || entities.time;

  if (!isFinite(amount) || amount <= 0) {
    return { success: false, message: 'Reminder amount required', error: 'MISSING_AMOUNT' };
  }

  const resolution = await resolveCustomer(entities, conversationId);
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

  const reminder = await reminderService.scheduleReminder(customer.id, amount, datetime || 'tomorrow 7pm');

  return {
    success: true,
    message: `Reminder scheduled for ${customer.name} for ₹${amount}`,
    data: { reminderId: reminder.id, customer: customer.name, amount, scheduledTime: (reminder as any).scheduledTime },
  };
}

// ── CANCEL_REMINDER ──────────────────────────────────────────────────────────

export async function executeCancelReminder(
  entities: Record<string, any>,
  conversationId?: string,
): Promise<ExecutionResult> {
  const resolution = await resolveCustomer(entities, conversationId);
  if (resolution.multiple) {
    return { success: false, message: 'Multiple customers found. Please specify customer name with landmark.', error: 'MULTIPLE_CUSTOMERS', data: { customers: (resolution.candidates || []).slice(0, 3) } };
  }
  if (!resolution.customer) {
    return { success: false, message: `Customer '${resolution.query || 'specified'}' not found`, error: 'CUSTOMER_NOT_FOUND' };
  }

  const customer  = resolution.customer;
  const reminders = await reminderService.getPendingReminders(customer.id);
  if (reminders.length === 0) {
    return { success: false, message: `No pending reminders for ${customer.name}`, error: 'NO_REMINDER' };
  }

  await reminderService.cancelReminder(reminders[0].id);
  return {
    success: true,
    message: `Reminder cancelled for ${customer.name}`,
    data: { reminderId: reminders[0].id, customer: customer.name },
  };
}

// ── LIST_REMINDERS ───────────────────────────────────────────────────────────

export async function executeListReminders(): Promise<ExecutionResult> {
  const reminders = await reminderService.getPendingReminders();
  return {
    success: true,
    message: `${reminders.length} pending reminders`,
    data: {
      count: reminders.length,
      reminders: reminders.map((r) => ({
        customer:      r.customer?.name ?? '(unknown)',
        amount:        parseFloat((r as any).notes || '0'),
        scheduledTime: r.scheduledTime,
      })),
    },
  };
}

// ── MODIFY_REMINDER ──────────────────────────────────────────────────────────

export async function executeModifyReminder(
  entities: Record<string, any>,
  conversationId?: string,
): Promise<ExecutionResult> {
  const datetime = entities.datetime || entities.date || entities.time;
  if (!datetime) {
    return { success: false, message: 'New reminder time required', error: 'MISSING_DATETIME' };
  }

  const resolution = await resolveCustomer(entities, conversationId);
  if (resolution.multiple) {
    return { success: false, message: 'Multiple customers found. Please specify customer name with landmark.', error: 'MULTIPLE_CUSTOMERS', data: { customers: (resolution.candidates || []).slice(0, 3) } };
  }
  if (!resolution.customer) {
    return { success: false, message: `Customer '${resolution.query || 'specified'}' not found`, error: 'CUSTOMER_NOT_FOUND' };
  }

  const customer  = resolution.customer;
  const reminders = await reminderService.getPendingReminders(customer.id);
  if (reminders.length === 0) {
    return { success: false, message: `No pending reminders for ${customer.name}`, error: 'NO_REMINDER' };
  }

  await reminderService.modifyReminderTime(reminders[0].id, datetime);
  return {
    success: true,
    message: `Reminder time updated for ${customer.name}`,
    data: { reminderId: reminders[0].id, customer: customer.name, newTime: datetime },
  };
}
