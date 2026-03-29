/**
 * ReminderService — Unit Tests
 * All Prisma and BullMQ calls are patched on live singletons — no real DB/Redis needed.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { reminderService } from '../modules/reminder/reminder.service';
import { prisma } from '@execora/infrastructure';
import { reminderQueue } from '@execora/infrastructure';
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

test('scheduleReminder: supports recurring "har 5 minute" pattern', async () => {
  const restores: RestoreFn[] = [];
  try {
    const customer = makeCustomer({ phone: '9876543210' });
    const reminder = makeReminder({ customer, status: 'pending' });
    const capturedCreateArgs: any[] = [];

    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => customer));
    restores.push(patchMethod(prisma.reminder as any, 'create', async (args: any) => {
      capturedCreateArgs.push(args);
      return reminder;
    }));
    restores.push(patchMethod(reminderQueue as any, 'add', async () => ({ id: 'job-rec-1' })));

    await reminderService.scheduleReminder('cust-001', 500, 'har 5 minute bad');
    const data = capturedCreateArgs[0]?.data;
    assert.equal(data.recurringPattern.type, 'interval_minutes');
    assert.equal(data.recurringPattern.value, 5);
  } finally {
    restoreAll(restores);
  }
});

test('scheduleReminder: supports recurring "daily 3 baje" pattern', async () => {
  const restores: RestoreFn[] = [];
  try {
    const customer = makeCustomer({ phone: '9876543210' });
    const reminder = makeReminder({ customer, status: 'pending' });
    const capturedCreateArgs: any[] = [];

    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => customer));
    restores.push(patchMethod(prisma.reminder as any, 'create', async (args: any) => {
      capturedCreateArgs.push(args);
      return reminder;
    }));
    restores.push(patchMethod(reminderQueue as any, 'add', async () => ({ id: 'job-rec-2' })));

    await reminderService.scheduleReminder('cust-001', 500, 'daily 3 baje');
    const recurring = capturedCreateArgs[0]?.data?.recurringPattern;
    assert.equal(recurring.type, 'daily_time');
    assert.equal(recurring.hour, 15);
    assert.equal(recurring.minute, 0);
  } finally {
    restoreAll(restores);
  }
});

test('scheduleReminder: supports recurring "har mhine 1 date ko" pattern', async () => {
  const restores: RestoreFn[] = [];
  try {
    const customer = makeCustomer({ phone: '9876543210' });
    const reminder = makeReminder({ customer, status: 'pending' });
    const capturedCreateArgs: any[] = [];

    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => customer));
    restores.push(patchMethod(prisma.reminder as any, 'create', async (args: any) => {
      capturedCreateArgs.push(args);
      return reminder;
    }));
    restores.push(patchMethod(reminderQueue as any, 'add', async () => ({ id: 'job-rec-3' })));

    await reminderService.scheduleReminder('cust-001', 500, 'har mhine 1 date ko');
    const recurring = capturedCreateArgs[0]?.data?.recurringPattern;
    assert.equal(recurring.type, 'monthly_date');
    assert.equal(recurring.day, 1);
  } finally {
    restoreAll(restores);
  }
});

test('scheduleReminder: supports recurring "every 6 month" pattern', async () => {
  const restores: RestoreFn[] = [];
  try {
    const customer = makeCustomer({ phone: '9876543210' });
    const reminder = makeReminder({ customer, status: 'pending' });
    const capturedCreateArgs: any[] = [];

    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => customer));
    restores.push(patchMethod(prisma.reminder as any, 'create', async (args: any) => {
      capturedCreateArgs.push(args);
      return reminder;
    }));
    restores.push(patchMethod(reminderQueue as any, 'add', async () => ({ id: 'job-rec-4' })));

    await reminderService.scheduleReminder('cust-001', 500, 'every 6 month');
    const recurring = capturedCreateArgs[0]?.data?.recurringPattern;
    assert.equal(recurring.type, 'every_n_months');
    assert.equal(recurring.months, 6);
  } finally {
    restoreAll(restores);
  }
});

test('scheduleReminder: supports one-time "5 minute me" schedule', async () => {
  const restores: RestoreFn[] = [];
  try {
    const customer = makeCustomer({ phone: '9876543210' });
    const reminder = makeReminder({ customer, status: 'pending' });
    const capturedCreateArgs: any[] = [];

    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => customer));
    restores.push(patchMethod(prisma.reminder as any, 'create', async (args: any) => {
      capturedCreateArgs.push(args);
      return reminder;
    }));
    restores.push(patchMethod(reminderQueue as any, 'add', async () => ({ id: 'job-5min' })));

    await reminderService.scheduleReminder('cust-001', 500, '5 minute me');
    const recurring = capturedCreateArgs[0]?.data?.recurringPattern;
    assert.equal(recurring, undefined);
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

// NOTE: service does NOT throw when customer has no phone — it schedules with both channels
// so the reminder can be delivered once the customer's contact info is added.
test('scheduleReminder: schedules with both channels when customer has no phone', async () => {
  const restores: RestoreFn[] = [];
  try {
    const customerNoPhone = makeCustomer({ phone: null });
    const capturedCreateArgs: any[] = [];
    const reminder = makeReminder({ customer: customerNoPhone });
    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => customerNoPhone));
    restores.push(patchMethod(prisma.reminder as any, 'create', async (args: any) => {
      capturedCreateArgs.push(args);
      return reminder;
    }));
    restores.push(patchMethod(reminderQueue as any, 'add', async () => ({ id: 'job-nophone' })));

    const result = await reminderService.scheduleReminder('cust-001', 500, 'kal');
    assert.equal(result.status, 'SCHEDULED');
    // Both channels scheduled when no contact info — will be delivered when added
    const channels = capturedCreateArgs[0]?.data?.channels;
    assert.ok(Array.isArray(channels) && channels.includes('whatsapp') && channels.includes('email'),
      'should schedule both channels when no phone'
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
// markAsSent delegates to markReminderSent which returns void

test('markAsSent: updates reminder status to sent (completes without error)', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.reminder as any, 'update', async () => ({})));

    // markAsSent returns void — just verify it does not throw
    await assert.doesNotReject(() => reminderService.markAsSent('reminder-test-001'));
  } finally {
    restoreAll(restores);
  }
});

// ── markAsFailed ──────────────────────────────────────────────────────────────
// markAsFailed delegates to markReminderFailed which returns void

test('markAsFailed: updates reminder status to failed (completes without error)', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.reminder as any, 'update', async () => ({})));

    // markAsFailed returns void — just verify it does not throw
    await assert.doesNotReject(() => reminderService.markAsFailed('reminder-test-001'));
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
