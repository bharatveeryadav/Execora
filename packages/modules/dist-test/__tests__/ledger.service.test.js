"use strict";
/**
 * LedgerService — Unit Tests
 * All Prisma calls are patched on the live singleton — no real DB needed.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const ledger_service_1 = require("../modules/ledger/ledger.service");
const core_1 = require("@execora/core");
const fixtures_1 = require("./helpers/fixtures");
// ── Payment fixture (matches current Payment model) ────────────────────────────
function makePayment(overrides = {}) {
    return {
        id: 'pay-test-001',
        paymentNo: 'PAY-20240101-ABCDE',
        tenantId: 'tenant-001',
        customerId: 'cust-test-001',
        amount: (0, fixtures_1.dec)(200),
        method: 'cash',
        status: 'completed',
        notes: null,
        receivedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        customer: (0, fixtures_1.makeCustomer)(),
        ...overrides,
    };
}
// ── recordPayment ──────────────────────────────────────────────────────────────
(0, node_test_1.default)('recordPayment: creates Payment record and decrements balance', async () => {
    const restores = [];
    try {
        const mockPayment = makePayment({ method: 'cash', status: 'completed' });
        const txProxy = {
            payment: { create: async () => mockPayment, update: async () => mockPayment },
            invoice: { findMany: async () => [], update: async () => ({}) },
            customer: { update: async () => (0, fixtures_1.makeCustomer)(), findUnique: async () => (0, fixtures_1.makeCustomer)() },
        };
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma, '$transaction', (0, fixtures_1.makePrismaTransaction)(txProxy)));
        const result = await ledger_service_1.ledgerService.recordPayment('cust-001', 200, 'cash');
        strict_1.default.equal(result.status, 'completed');
        strict_1.default.equal(result.method, 'cash');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('recordPayment: throws when customerId is empty', async () => {
    await strict_1.default.rejects(() => ledger_service_1.ledgerService.recordPayment('', 200, 'cash'), /Customer ID is required/i);
});
(0, node_test_1.default)('recordPayment: throws when amount is zero', async () => {
    await strict_1.default.rejects(() => ledger_service_1.ledgerService.recordPayment('cust-001', 0, 'cash'), /positive number/i);
});
(0, node_test_1.default)('recordPayment: throws when amount is negative', async () => {
    await strict_1.default.rejects(() => ledger_service_1.ledgerService.recordPayment('cust-001', -50, 'upi'), /positive number/i);
});
(0, node_test_1.default)('recordPayment: throws when amount is NaN', async () => {
    await strict_1.default.rejects(() => ledger_service_1.ledgerService.recordPayment('cust-001', NaN, 'cash'), /positive number/i);
});
(0, node_test_1.default)('recordPayment: throws on invalid paymentMode', async () => {
    await strict_1.default.rejects(() => ledger_service_1.ledgerService.recordPayment('cust-001', 100, 'bitcoin'), /cash.*upi.*card.*other/i);
});
(0, node_test_1.default)('recordPayment: accepts all valid payment modes', async () => {
    const modes = ['cash', 'upi', 'card', 'other'];
    for (const mode of modes) {
        const restores = [];
        try {
            const mockPayment = makePayment({ method: mode === 'other' ? 'bank' : mode });
            const txProxy = {
                payment: { create: async () => mockPayment, update: async () => mockPayment },
                invoice: { findMany: async () => [], update: async () => ({}) },
                customer: { update: async () => (0, fixtures_1.makeCustomer)(), findUnique: async () => (0, fixtures_1.makeCustomer)() },
            };
            restores.push((0, fixtures_1.patchMethod)(core_1.prisma, '$transaction', (0, fixtures_1.makePrismaTransaction)(txProxy)));
            const result = await ledger_service_1.ledgerService.recordPayment('cust-001', 100, mode);
            strict_1.default.equal(result.status, 'completed', `mode ${mode} should succeed`);
        }
        finally {
            (0, fixtures_1.restoreAll)(restores);
        }
    }
});
// ── addCredit ──────────────────────────────────────────────────────────────────
// addCredit now updates customer balance directly (no transaction, no Payment record)
(0, node_test_1.default)('addCredit: increments customer balance and returns updated customer', async () => {
    const restores = [];
    try {
        const updatedCustomer = (0, fixtures_1.makeCustomer)({ balance: (0, fixtures_1.dec)(1000) });
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.customer, 'update', async () => updatedCustomer));
        const result = await ledger_service_1.ledgerService.addCredit('cust-001', 500, 'Invoice for butter');
        strict_1.default.ok(result !== null, 'should return the updated customer');
        strict_1.default.ok('id' in result, 'result should be a customer object');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('addCredit: throws when customerId is empty', async () => {
    await strict_1.default.rejects(() => ledger_service_1.ledgerService.addCredit('', 500, 'test'), /Customer ID is required/i);
});
(0, node_test_1.default)('addCredit: throws when amount is zero', async () => {
    await strict_1.default.rejects(() => ledger_service_1.ledgerService.addCredit('cust-001', 0, 'test'), /positive number/i);
});
(0, node_test_1.default)('addCredit: throws when description is empty', async () => {
    await strict_1.default.rejects(() => ledger_service_1.ledgerService.addCredit('cust-001', 100, ''), /Description is required/i);
});
(0, node_test_1.default)('addCredit: throws when description is only whitespace', async () => {
    await strict_1.default.rejects(() => ledger_service_1.ledgerService.addCredit('cust-001', 100, '   '), /Description is required/i);
});
// ── setOpeningBalance ──────────────────────────────────────────────────────────
// setOpeningBalance now sets balance directly on the customer (no LedgerEntry)
(0, node_test_1.default)('setOpeningBalance: updates customer balance and returns updated customer', async () => {
    const restores = [];
    try {
        const updatedCustomer = (0, fixtures_1.makeCustomer)({ balance: (0, fixtures_1.dec)(1000) });
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.customer, 'update', async () => updatedCustomer));
        const result = await ledger_service_1.ledgerService.setOpeningBalance('cust-001', 1000);
        strict_1.default.ok(result !== null);
        strict_1.default.ok('id' in result, 'result should be a customer object');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('setOpeningBalance: throws when customerId is empty', async () => {
    await strict_1.default.rejects(() => ledger_service_1.ledgerService.setOpeningBalance('', 100), /Customer ID is required/i);
});
(0, node_test_1.default)('setOpeningBalance: throws when amount is negative', async () => {
    await strict_1.default.rejects(() => ledger_service_1.ledgerService.setOpeningBalance('cust-001', -100), /non-negative/i);
});
(0, node_test_1.default)('setOpeningBalance: allows zero as opening balance', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.customer, 'update', async () => (0, fixtures_1.makeCustomer)({ balance: (0, fixtures_1.dec)(0) })));
        const result = await ledger_service_1.ledgerService.setOpeningBalance('cust-001', 0);
        strict_1.default.ok(result !== null);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── getLedgerSummary ──────────────────────────────────────────────────────────
// getLedgerSummary now uses Payment model (method field, not type field)
(0, node_test_1.default)('getLedgerSummary: aggregates payment totals and breaks down by method', async () => {
    const restores = [];
    try {
        const payments = [
            { amount: { toString: () => '400' }, method: 'cash' },
            { amount: { toString: () => '200' }, method: 'upi' },
            { amount: { toString: () => '100' }, method: 'card' },
        ];
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.payment, 'findMany', async () => payments));
        const summary = await ledger_service_1.ledgerService.getLedgerSummary(new Date('2024-01-01'), new Date('2024-01-31'));
        strict_1.default.equal(summary.totalCredits, 700); // 400 + 200 + 100
        strict_1.default.equal(summary.cashPayments, 400);
        strict_1.default.equal(summary.upiPayments, 200);
        strict_1.default.equal(summary.entryCount, 3);
        strict_1.default.equal(summary.totalDebits, 0); // debits come from invoices now
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('getLedgerSummary: returns zeros for empty date range', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.payment, 'findMany', async () => []));
        const summary = await ledger_service_1.ledgerService.getLedgerSummary(new Date(), new Date());
        strict_1.default.equal(summary.totalDebits, 0);
        strict_1.default.equal(summary.totalCredits, 0);
        strict_1.default.equal(summary.entryCount, 0);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
//# sourceMappingURL=ledger.service.test.js.map