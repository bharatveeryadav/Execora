"use strict";
/**
 * Shared test fixtures and utilities.
 * Used by all test files — no framework dependency.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dec = void 0;
exports.patchMethod = patchMethod;
exports.restoreAll = restoreAll;
exports.makeCustomer = makeCustomer;
exports.makeProduct = makeProduct;
exports.makeLedgerEntry = makeLedgerEntry;
exports.makeInvoice = makeInvoice;
exports.makeReminder = makeReminder;
exports.makePrismaTransaction = makePrismaTransaction;
const library_1 = require("@prisma/client/runtime/library");
function patchMethod(obj, key, value) {
    const original = obj[key];
    obj[key] = value;
    return () => {
        obj[key] = original;
    };
}
/** Run all restore functions collected from patchMethod calls. */
function restoreAll(restores) {
    restores.forEach((r) => r());
}
// ── Decimal helper ─────────────────────────────────────────────────────────────
const dec = (n) => new library_1.Decimal(String(n));
exports.dec = dec;
// ── Model factories ────────────────────────────────────────────────────────────
function makeCustomer(overrides = {}) {
    return {
        id: 'cust-test-001',
        name: 'Bharat Kumar',
        phone: '9999999999',
        nickname: 'Bharat',
        landmark: 'Near ATM',
        balance: (0, exports.dec)(500),
        notes: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        invoices: [],
        reminders: [],
        ...overrides,
    };
}
function makeProduct(overrides = {}) {
    return {
        id: 'prod-test-001',
        name: 'Butter',
        description: 'Fresh dairy butter',
        price: (0, exports.dec)(50),
        stock: 100,
        unit: 'piece',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    };
}
function makeLedgerEntry(overrides = {}) {
    return {
        id: 'ledger-test-001',
        customerId: 'cust-test-001',
        type: 'CREDIT',
        amount: (0, exports.dec)(200),
        description: 'Payment received via cash',
        paymentMode: 'cash',
        reference: null,
        createdAt: new Date('2024-01-01'),
        customer: makeCustomer(),
        ...overrides,
    };
}
function makeInvoice(overrides = {}) {
    return {
        id: 'inv-test-001',
        customerId: 'cust-test-001',
        total: (0, exports.dec)(250),
        status: 'CONFIRMED',
        notes: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        items: [],
        customer: makeCustomer(),
        ...overrides,
    };
}
function makeReminder(overrides = {}) {
    return {
        id: 'reminder-test-001',
        customerId: 'cust-test-001',
        amount: (0, exports.dec)(500),
        message: 'Namaste Bharat ji, ₹500 payment pending hai.',
        sendAt: new Date(Date.now() + 3_600_000),
        status: 'SCHEDULED',
        retryCount: 0,
        sentAt: null,
        failedAt: null,
        createdAt: new Date('2024-01-01'),
        customer: makeCustomer(),
        ...overrides,
    };
}
/**
 * Create a Prisma $transaction mock.
 * - Callback form (interactive tx): calls callback with the provided proxy object
 * - Array form (batch): resolves all promises in parallel
 */
function makePrismaTransaction(txProxy) {
    return async (arg) => {
        if (typeof arg === 'function')
            return arg(txProxy);
        if (Array.isArray(arg))
            return Promise.all(arg);
        throw new Error('Unexpected $transaction argument type');
    };
}
//# sourceMappingURL=fixtures.js.map