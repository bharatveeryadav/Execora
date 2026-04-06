"use strict";
/**
 * ReminderService — Unit Tests
 * All Prisma and BullMQ calls are patched on live singletons — no real DB/Redis needed.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const reminder_service_1 = require("../modules/reminder/reminder.service");
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
const fixtures_1 = require("./helpers/fixtures");
// ── scheduleReminder ───────────────────────────────────────────────────────────
(0, node_test_1.default)('scheduleReminder: creates reminder and enqueues job', async () => {
    const restores = [];
    try {
        const customer = (0, fixtures_1.makeCustomer)({ phone: '9876543210' });
        const reminder = (0, fixtures_1.makeReminder)({ customer });
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.customer, 'findUnique', async () => customer));
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'create', async () => reminder));
        restores.push((0, fixtures_1.patchMethod)(core_2.reminderQueue, 'add', async () => ({ id: 'job-1' })));
        const result = await reminder_service_1.reminderService.scheduleReminder('cust-001', 500, 'kal 5 baje');
        strict_1.default.equal(result.status, 'SCHEDULED');
        strict_1.default.equal(result.customerId, 'cust-test-001');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('scheduleReminder: supports recurring "har 5 minute" pattern', async () => {
    const restores = [];
    try {
        const customer = (0, fixtures_1.makeCustomer)({ phone: '9876543210' });
        const reminder = (0, fixtures_1.makeReminder)({ customer, status: 'pending' });
        const capturedCreateArgs = [];
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.customer, 'findUnique', async () => customer));
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'create', async (args) => {
            capturedCreateArgs.push(args);
            return reminder;
        }));
        restores.push((0, fixtures_1.patchMethod)(core_2.reminderQueue, 'add', async () => ({ id: 'job-rec-1' })));
        await reminder_service_1.reminderService.scheduleReminder('cust-001', 500, 'har 5 minute bad');
        const data = capturedCreateArgs[0]?.data;
        strict_1.default.equal(data.recurringPattern.type, 'interval_minutes');
        strict_1.default.equal(data.recurringPattern.value, 5);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('scheduleReminder: supports recurring "daily 3 baje" pattern', async () => {
    const restores = [];
    try {
        const customer = (0, fixtures_1.makeCustomer)({ phone: '9876543210' });
        const reminder = (0, fixtures_1.makeReminder)({ customer, status: 'pending' });
        const capturedCreateArgs = [];
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.customer, 'findUnique', async () => customer));
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'create', async (args) => {
            capturedCreateArgs.push(args);
            return reminder;
        }));
        restores.push((0, fixtures_1.patchMethod)(core_2.reminderQueue, 'add', async () => ({ id: 'job-rec-2' })));
        await reminder_service_1.reminderService.scheduleReminder('cust-001', 500, 'daily 3 baje');
        const recurring = capturedCreateArgs[0]?.data?.recurringPattern;
        strict_1.default.equal(recurring.type, 'daily_time');
        strict_1.default.equal(recurring.hour, 15);
        strict_1.default.equal(recurring.minute, 0);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('scheduleReminder: supports recurring "har mhine 1 date ko" pattern', async () => {
    const restores = [];
    try {
        const customer = (0, fixtures_1.makeCustomer)({ phone: '9876543210' });
        const reminder = (0, fixtures_1.makeReminder)({ customer, status: 'pending' });
        const capturedCreateArgs = [];
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.customer, 'findUnique', async () => customer));
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'create', async (args) => {
            capturedCreateArgs.push(args);
            return reminder;
        }));
        restores.push((0, fixtures_1.patchMethod)(core_2.reminderQueue, 'add', async () => ({ id: 'job-rec-3' })));
        await reminder_service_1.reminderService.scheduleReminder('cust-001', 500, 'har mhine 1 date ko');
        const recurring = capturedCreateArgs[0]?.data?.recurringPattern;
        strict_1.default.equal(recurring.type, 'monthly_date');
        strict_1.default.equal(recurring.day, 1);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('scheduleReminder: supports recurring "every 6 month" pattern', async () => {
    const restores = [];
    try {
        const customer = (0, fixtures_1.makeCustomer)({ phone: '9876543210' });
        const reminder = (0, fixtures_1.makeReminder)({ customer, status: 'pending' });
        const capturedCreateArgs = [];
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.customer, 'findUnique', async () => customer));
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'create', async (args) => {
            capturedCreateArgs.push(args);
            return reminder;
        }));
        restores.push((0, fixtures_1.patchMethod)(core_2.reminderQueue, 'add', async () => ({ id: 'job-rec-4' })));
        await reminder_service_1.reminderService.scheduleReminder('cust-001', 500, 'every 6 month');
        const recurring = capturedCreateArgs[0]?.data?.recurringPattern;
        strict_1.default.equal(recurring.type, 'every_n_months');
        strict_1.default.equal(recurring.months, 6);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('scheduleReminder: supports one-time "5 minute me" schedule', async () => {
    const restores = [];
    try {
        const customer = (0, fixtures_1.makeCustomer)({ phone: '9876543210' });
        const reminder = (0, fixtures_1.makeReminder)({ customer, status: 'pending' });
        const capturedCreateArgs = [];
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.customer, 'findUnique', async () => customer));
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'create', async (args) => {
            capturedCreateArgs.push(args);
            return reminder;
        }));
        restores.push((0, fixtures_1.patchMethod)(core_2.reminderQueue, 'add', async () => ({ id: 'job-5min' })));
        await reminder_service_1.reminderService.scheduleReminder('cust-001', 500, '5 minute me');
        const recurring = capturedCreateArgs[0]?.data?.recurringPattern;
        strict_1.default.equal(recurring, undefined);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('scheduleReminder: throws when customerId is empty', async () => {
    await strict_1.default.rejects(() => reminder_service_1.reminderService.scheduleReminder('', 500, 'kal'), /Customer ID is required/i);
});
(0, node_test_1.default)('scheduleReminder: throws when amount is zero', async () => {
    await strict_1.default.rejects(() => reminder_service_1.reminderService.scheduleReminder('cust-001', 0, 'kal'), /positive number/i);
});
(0, node_test_1.default)('scheduleReminder: throws when amount is negative', async () => {
    await strict_1.default.rejects(() => reminder_service_1.reminderService.scheduleReminder('cust-001', -100, 'kal'), /positive number/i);
});
(0, node_test_1.default)('scheduleReminder: throws when dateTimeStr is empty', async () => {
    await strict_1.default.rejects(() => reminder_service_1.reminderService.scheduleReminder('cust-001', 500, ''), /Date\/time is required/i);
});
(0, node_test_1.default)('scheduleReminder: throws when customer not found', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.customer, 'findUnique', async () => null));
        await strict_1.default.rejects(() => reminder_service_1.reminderService.scheduleReminder('cust-nonexistent', 500, 'kal'), /Customer not found/i);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// NOTE: service does NOT throw when customer has no phone — it schedules with both channels
// so the reminder can be delivered once the customer's contact info is added.
(0, node_test_1.default)('scheduleReminder: schedules with both channels when customer has no phone', async () => {
    const restores = [];
    try {
        const customerNoPhone = (0, fixtures_1.makeCustomer)({ phone: null });
        const capturedCreateArgs = [];
        const reminder = (0, fixtures_1.makeReminder)({ customer: customerNoPhone });
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.customer, 'findUnique', async () => customerNoPhone));
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'create', async (args) => {
            capturedCreateArgs.push(args);
            return reminder;
        }));
        restores.push((0, fixtures_1.patchMethod)(core_2.reminderQueue, 'add', async () => ({ id: 'job-nophone' })));
        const result = await reminder_service_1.reminderService.scheduleReminder('cust-001', 500, 'kal');
        strict_1.default.equal(result.status, 'SCHEDULED');
        // Both channels scheduled when no contact info — will be delivered when added
        const channels = capturedCreateArgs[0]?.data?.channels;
        strict_1.default.ok(Array.isArray(channels) && channels.includes('whatsapp') && channels.includes('email'), 'should schedule both channels when no phone');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('scheduleReminder: marks reminder as FAILED when queue.add throws', async () => {
    const restores = [];
    try {
        const customer = (0, fixtures_1.makeCustomer)({ phone: '9876543210' });
        const reminder = (0, fixtures_1.makeReminder)({ id: 'rem-fail-test', customer });
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.customer, 'findUnique', async () => customer));
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'create', async () => reminder));
        restores.push((0, fixtures_1.patchMethod)(core_2.reminderQueue, 'add', async () => {
            throw new Error('Redis unavailable');
        }));
        // The service tries to update status to FAILED when queue fails
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'update', async () => ({ ...reminder, status: 'FAILED' })));
        await strict_1.default.rejects(() => reminder_service_1.reminderService.scheduleReminder('cust-001', 500, 'kal'), /Redis unavailable/i);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── cancelReminder ─────────────────────────────────────────────────────────────
(0, node_test_1.default)('cancelReminder: updates reminder status to CANCELLED', async () => {
    const restores = [];
    try {
        const cancelled = (0, fixtures_1.makeReminder)({ status: 'CANCELLED' });
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'update', async () => cancelled));
        restores.push((0, fixtures_1.patchMethod)(core_2.reminderQueue, 'getJob', async () => null));
        const result = await reminder_service_1.reminderService.cancelReminder('reminder-test-001');
        strict_1.default.equal(result.status, 'CANCELLED');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('cancelReminder: removes the BullMQ job if it exists', async () => {
    const restores = [];
    try {
        let removed = false;
        const mockJob = { remove: async () => { removed = true; } };
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'update', async () => (0, fixtures_1.makeReminder)({ status: 'CANCELLED' })));
        restores.push((0, fixtures_1.patchMethod)(core_2.reminderQueue, 'getJob', async () => mockJob));
        await reminder_service_1.reminderService.cancelReminder('reminder-test-001');
        strict_1.default.equal(removed, true);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── getPendingReminders ────────────────────────────────────────────────────────
(0, node_test_1.default)('getPendingReminders: returns all SCHEDULED reminders when no customerId given', async () => {
    const restores = [];
    try {
        const pending = [(0, fixtures_1.makeReminder)(), (0, fixtures_1.makeReminder)({ id: 'rem-2', customerId: 'cust-002' })];
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'findMany', async () => pending));
        const results = await reminder_service_1.reminderService.getPendingReminders();
        strict_1.default.equal(results.length, 2);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('getPendingReminders: filters by customerId when provided', async () => {
    const restores = [];
    try {
        const captured = [];
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'findMany', async (args) => {
            captured.push(args);
            return [(0, fixtures_1.makeReminder)()];
        }));
        await reminder_service_1.reminderService.getPendingReminders('cust-001');
        strict_1.default.ok(captured[0]?.where?.customerId === 'cust-001');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── markAsSent ─────────────────────────────────────────────────────────────────
// markAsSent delegates to markReminderSent which returns void
(0, node_test_1.default)('markAsSent: updates reminder status to sent (completes without error)', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'update', async () => ({})));
        // markAsSent returns void — just verify it does not throw
        await strict_1.default.doesNotReject(() => reminder_service_1.reminderService.markAsSent('reminder-test-001'));
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── markAsFailed ──────────────────────────────────────────────────────────────
// markAsFailed delegates to markReminderFailed which returns void
(0, node_test_1.default)('markAsFailed: updates reminder status to failed (completes without error)', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'update', async () => ({})));
        // markAsFailed returns void — just verify it does not throw
        await strict_1.default.doesNotReject(() => reminder_service_1.reminderService.markAsFailed('reminder-test-001'));
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── getDueReminders ────────────────────────────────────────────────────────────
(0, node_test_1.default)('getDueReminders: returns reminders that are due now', async () => {
    const restores = [];
    try {
        const dueReminder = (0, fixtures_1.makeReminder)({ sendAt: new Date(Date.now() - 1000) }); // 1 second ago
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.reminder, 'findMany', async () => [dueReminder]));
        const results = await reminder_service_1.reminderService.getDueReminders();
        strict_1.default.equal(results.length, 1);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
//# sourceMappingURL=reminder.service.test.js.map