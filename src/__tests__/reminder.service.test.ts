/**
 * ReminderService — Unit Tests
 * All Prisma and BullMQ calls are patched on live singletons — no real DB/Redis needed.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { reminderService } from '../modules/reminder/reminder.service';
import { prisma } from '../infrastructure/database';
import { reminderQueue } from '../infrastructure/queue';
import { patchMethod, restoreAll, makeReminder, makeCustomer } from './helpers/fixtures';
import type { RestoreFn } from './helpers/fixtures';

// ── scheduleReminder ───────────────────────────────────────────────────────────

test('scheduleReminder: creates reminder and enqueues job', async () => {
  const restores: RestoreFn[] = [];
  try {
    const customer = makeCustomer({ phone: '9876543210' });
    const reminder = makeReminder({ customer });

    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => customer));
    restores.push(patchMethod(prisma.reminder as any, 'create', async () => reminder));
    restores.push(patchMethod(reminderQueue as any, 'add', async () => ({ id: 'job-1' })));

    const result = await reminderService.scheduleReminder('cust-001', 500, 'kal 5 baje');
    assert.equal(result.status, 'SCHEDULED');
    assert.equal(result.customerId, 'cust-test-001');
  } finally {
    restoreAll(restores);
  }
});

test('scheduleReminder: throws when customerId is empty', async () => {
  await assert.rejects(
    () => reminderService.scheduleReminder('', 500, 'kal'),
    /Customer ID is required/i
  );
});

test('scheduleReminder: throws when amount is zero', async () => {
  await assert.rejects(
    () => reminderService.scheduleReminder('cust-001', 0, 'kal'),
    /positive number/i
  );
});

test('scheduleReminder: throws when amount is negative', async () => {
  await assert.rejects(
    () => reminderService.scheduleReminder('cust-001', -100, 'kal'),
    /positive number/i
  );
});

test('scheduleReminder: throws when dateTimeStr is empty', async () => {
  await assert.rejects(
    () => reminderService.scheduleReminder('cust-001', 500, ''),
    /Date\/time is required/i
  );
});

test('scheduleReminder: throws when customer not found', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => null));

    await assert.rejects(
      () => reminderService.scheduleReminder('cust-nonexistent', 500, 'kal'),
      /Customer not found/i
    );
  } finally {
    restoreAll(restores);
  }
});

test('scheduleReminder: throws when customer has no phone number', async () => {
  const restores: RestoreFn[] = [];
  try {
    const customerNoPhone = makeCustomer({ phone: null });
    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => customerNoPhone));

    await assert.rejects(
      () => reminderService.scheduleReminder('cust-001', 500, 'kal'),
      /phone number not found/i
    );
  } finally {
    restoreAll(restores);
  }
});

test('scheduleReminder: marks reminder as FAILED when queue.add throws', async () => {
  const restores: RestoreFn[] = [];
  try {
    const customer = makeCustomer({ phone: '9876543210' });
    const reminder = makeReminder({ id: 'rem-fail-test', customer });

    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => customer));
    restores.push(patchMethod(prisma.reminder as any, 'create', async () => reminder));
    restores.push(patchMethod(reminderQueue as any, 'add', async () => {
      throw new Error('Redis unavailable');
    }));
    // The service tries to update status to FAILED when queue fails
    restores.push(patchMethod(prisma.reminder as any, 'update', async () => ({ ...reminder, status: 'FAILED' })));

    await assert.rejects(
      () => reminderService.scheduleReminder('cust-001', 500, 'kal'),
      /Redis unavailable/i
    );
  } finally {
    restoreAll(restores);
  }
});

// ── cancelReminder ─────────────────────────────────────────────────────────────

test('cancelReminder: updates reminder status to CANCELLED', async () => {
  const restores: RestoreFn[] = [];
  try {
    const cancelled = makeReminder({ status: 'CANCELLED' });
    restores.push(patchMethod(prisma.reminder as any, 'update', async () => cancelled));
    restores.push(patchMethod(reminderQueue as any, 'getJob', async () => null));

    const result = await reminderService.cancelReminder('reminder-test-001');
    assert.equal(result.status, 'CANCELLED');
  } finally {
    restoreAll(restores);
  }
});

test('cancelReminder: removes the BullMQ job if it exists', async () => {
  const restores: RestoreFn[] = [];
  try {
    let removed = false;
    const mockJob = { remove: async () => { removed = true; } };

    restores.push(patchMethod(prisma.reminder as any, 'update', async () => makeReminder({ status: 'CANCELLED' })));
    restores.push(patchMethod(reminderQueue as any, 'getJob', async () => mockJob));

    await reminderService.cancelReminder('reminder-test-001');
    assert.equal(removed, true);
  } finally {
    restoreAll(restores);
  }
});

// ── getPendingReminders ────────────────────────────────────────────────────────

test('getPendingReminders: returns all SCHEDULED reminders when no customerId given', async () => {
  const restores: RestoreFn[] = [];
  try {
    const pending = [makeReminder(), makeReminder({ id: 'rem-2', customerId: 'cust-002' })];
    restores.push(patchMethod(prisma.reminder as any, 'findMany', async () => pending));

    const results = await reminderService.getPendingReminders();
    assert.equal(results.length, 2);
  } finally {
    restoreAll(restores);
  }
});

test('getPendingReminders: filters by customerId when provided', async () => {
  const restores: RestoreFn[] = [];
  try {
    const captured: any[] = [];
    restores.push(patchMethod(prisma.reminder as any, 'findMany', async (args: any) => {
      captured.push(args);
      return [makeReminder()];
    }));

    await reminderService.getPendingReminders('cust-001');
    assert.ok(captured[0]?.where?.customerId === 'cust-001');
  } finally {
    restoreAll(restores);
  }
});

// ── markAsSent ─────────────────────────────────────────────────────────────────

test('markAsSent: updates reminder status to SENT', async () => {
  const restores: RestoreFn[] = [];
  try {
    const sent = makeReminder({ status: 'SENT', sentAt: new Date() });
    restores.push(patchMethod(prisma.reminder as any, 'update', async () => sent));

    const result = await reminderService.markAsSent('reminder-test-001', 'msg-1');
    assert.equal(result.status, 'SENT');
    assert.ok(result.sentAt !== null);
  } finally {
    restoreAll(restores);
  }
});

// ── markAsFailed ──────────────────────────────────────────────────────────────

test('markAsFailed: updates reminder status to FAILED and increments retryCount', async () => {
  const restores: RestoreFn[] = [];
  try {
    const failed = makeReminder({ status: 'FAILED', retryCount: 1, failedAt: new Date() });
    restores.push(patchMethod(prisma.reminder as any, 'update', async () => failed));

    const result = await reminderService.markAsFailed('reminder-test-001');
    assert.equal(result.status, 'FAILED');
    assert.equal(result.retryCount, 1);
  } finally {
    restoreAll(restores);
  }
});

// ── getDueReminders ────────────────────────────────────────────────────────────

test('getDueReminders: returns reminders that are due now', async () => {
  const restores: RestoreFn[] = [];
  try {
    const dueReminder = makeReminder({ sendAt: new Date(Date.now() - 1000) }); // 1 second ago
    restores.push(patchMethod(prisma.reminder as any, 'findMany', async () => [dueReminder]));

    const results = await reminderService.getDueReminders();
    assert.equal(results.length, 1);
  } finally {
    restoreAll(restores);
  }
});
