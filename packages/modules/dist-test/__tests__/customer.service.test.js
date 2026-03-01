"use strict";
/**
 * CustomerService — Unit Tests
 * All Prisma calls are patched on the live singleton — no real DB needed.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const customer_service_1 = require("../modules/customer/customer.service");
const infrastructure_1 = require("@execora/infrastructure");
const fixtures_1 = require("./helpers/fixtures");
// ── createCustomer ─────────────────────────────────────────────────────────────
(0, node_test_1.default)('createCustomer: creates a customer when name is unique', async () => {
    const restores = [];
    try {
        const mockCustomer = (0, fixtures_1.makeCustomer)();
        // No existing customer with that name
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.customer, 'findMany', async () => []));
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.customer, 'create', async () => mockCustomer));
        const result = await customer_service_1.customerService.createCustomer({ name: 'Bharat Kumar' });
        strict_1.default.equal(result.name, 'Bharat Kumar');
        strict_1.default.equal(result.id, 'cust-test-001');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('createCustomer: throws when name is empty', async () => {
    await strict_1.default.rejects(() => customer_service_1.customerService.createCustomer({ name: '' }), /name is required/i);
});
(0, node_test_1.default)('createCustomer: throws when name is only whitespace', async () => {
    await strict_1.default.rejects(() => customer_service_1.customerService.createCustomer({ name: '   ' }), /name is required/i);
});
(0, node_test_1.default)('createCustomer: throws when duplicate name exists', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.customer, 'findMany', async () => [{ id: 'cust-existing', name: 'Bharat Kumar' }]));
        await strict_1.default.rejects(() => customer_service_1.customerService.createCustomer({ name: 'Bharat Kumar' }), /already exists/i);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── getCustomerById ────────────────────────────────────────────────────────────
(0, node_test_1.default)('getCustomerById: returns customer with invoices and reminders', async () => {
    const restores = [];
    try {
        const mockCustomer = (0, fixtures_1.makeCustomer)({ invoices: [{ id: 'inv-1' }], reminders: [] });
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.customer, 'findUnique', async () => mockCustomer));
        const result = await customer_service_1.customerService.getCustomerById('cust-test-001');
        strict_1.default.ok(result !== null);
        strict_1.default.equal(result.id, 'cust-test-001');
        strict_1.default.equal(result.invoices.length, 1);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('getCustomerById: returns null when not found', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.customer, 'findUnique', async () => null));
        const result = await customer_service_1.customerService.getCustomerById('nonexistent');
        strict_1.default.equal(result, null);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── updateBalance ─────────────────────────────────────────────────────────────
(0, node_test_1.default)('updateBalance: increments balance and returns updated customer', async () => {
    const restores = [];
    try {
        const updated = (0, fixtures_1.makeCustomer)({ balance: (0, fixtures_1.dec)(700) });
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.customer, 'update', async () => updated));
        const result = await customer_service_1.customerService.updateBalance('cust-test-001', 200);
        strict_1.default.ok(result !== null);
        strict_1.default.equal(result.id, 'cust-test-001');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('updateBalance: throws when customerId is empty', async () => {
    await strict_1.default.rejects(() => customer_service_1.customerService.updateBalance('', 100), /Customer ID is required/i);
});
(0, node_test_1.default)('updateBalance: throws when amount is not a finite number', async () => {
    await strict_1.default.rejects(() => customer_service_1.customerService.updateBalance('cust-001', NaN), /finite number/i);
});
// ── getBalance ────────────────────────────────────────────────────────────────
(0, node_test_1.default)('getBalance: returns numeric balance from prisma', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.customer, 'findUnique', async () => ({ balance: (0, fixtures_1.dec)(450) })));
        const balance = await customer_service_1.customerService.getBalance('cust-test-001');
        strict_1.default.equal(balance, 450);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('getBalance: returns 0 when customer not found', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.customer, 'findUnique', async () => null));
        const balance = await customer_service_1.customerService.getBalance('nonexistent');
        strict_1.default.equal(balance, 0);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── searchCustomer ────────────────────────────────────────────────────────────
(0, node_test_1.default)('searchCustomer: returns empty array on prisma error', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.customer, 'findMany', async () => {
            throw new Error('DB error');
        }));
        const results = await customer_service_1.customerService.searchCustomer('Bharat');
        // The service swallows errors and returns []
        strict_1.default.ok(Array.isArray(results));
        strict_1.default.equal(results.length, 0);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('searchCustomer: returns matched results sorted by score', async () => {
    const restores = [];
    try {
        const raw = [
            (0, fixtures_1.makeCustomer)({ id: 'c1', name: 'Bharat Kumar', phone: null }),
            (0, fixtures_1.makeCustomer)({ id: 'c2', name: 'Bharat Singh', phone: null }),
        ];
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.customer, 'findMany', async () => raw));
        const results = await customer_service_1.customerService.searchCustomer('Bharat');
        strict_1.default.ok(results.length >= 1);
        strict_1.default.ok(results[0].matchScore >= results[results.length - 1].matchScore, 'should be sorted desc');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── updateCustomer ────────────────────────────────────────────────────────────
(0, node_test_1.default)('updateCustomer: returns true on successful update', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.customer, 'update', async () => (0, fixtures_1.makeCustomer)({ phone: '9876543210' })));
        const ok = await customer_service_1.customerService.updateCustomer('cust-test-001', { phone: '9876543210' });
        strict_1.default.equal(ok, true);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('updateCustomer: returns false when customerId is empty', async () => {
    const result = await customer_service_1.customerService.updateCustomer('', { phone: '1234567890' });
    strict_1.default.equal(result, false);
});
(0, node_test_1.default)('updateCustomer: returns false when updates object is empty', async () => {
    const result = await customer_service_1.customerService.updateCustomer('cust-001', {});
    strict_1.default.equal(result, false);
});
// ── calculateBalanceFromLedger ────────────────────────────────────────────────
// Now uses invoice.aggregate (total owed) minus payment.aggregate (total paid)
(0, node_test_1.default)('calculateBalanceFromLedger: returns invoiced amount minus payments', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.invoice, 'aggregate', async () => ({
            _sum: { total: (0, fixtures_1.dec)(1500) },
        })));
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.payment, 'aggregate', async () => ({
            _sum: { amount: (0, fixtures_1.dec)(300) },
        })));
        const balance = await customer_service_1.customerService.calculateBalanceFromLedger('cust-001');
        // 1500 invoiced - 300 paid = 1200 net balance
        strict_1.default.equal(balance, 1200);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('calculateBalanceFromLedger: returns 0 when no invoices or payments', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.invoice, 'aggregate', async () => ({
            _sum: { total: null },
        })));
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.payment, 'aggregate', async () => ({
            _sum: { amount: null },
        })));
        const balance = await customer_service_1.customerService.calculateBalanceFromLedger('cust-001');
        strict_1.default.equal(balance, 0);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── getAllCustomersWithPendingBalance ─────────────────────────────────────
(0, node_test_1.default)('getAllCustomersWithPendingBalance: returns customers with positive balance', async () => {
    const restores = [];
    try {
        const customers = [
            (0, fixtures_1.makeCustomer)({ id: 'c1', name: 'Amit', balance: (0, fixtures_1.dec)(500) }),
            (0, fixtures_1.makeCustomer)({ id: 'c2', name: 'Rina', balance: (0, fixtures_1.dec)(200) }),
        ];
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.customer, 'findMany', async () => customers));
        const result = await customer_service_1.customerService.getAllCustomersWithPendingBalance();
        strict_1.default.ok(Array.isArray(result));
        strict_1.default.equal(result.length, 2);
        strict_1.default.equal(result[0].name, 'Amit');
        strict_1.default.equal(result[1].balance, 200);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('getTotalPendingAmount: sums all positive balances', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.customer, 'aggregate', async () => ({ _sum: { balance: (0, fixtures_1.dec)(700) } })));
        const total = await customer_service_1.customerService.getTotalPendingAmount();
        strict_1.default.equal(total, 700);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
//# sourceMappingURL=customer.service.test.js.map