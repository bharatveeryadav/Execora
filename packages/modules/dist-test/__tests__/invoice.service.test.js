"use strict";
/**
 * InvoiceService — Unit Tests
 * All Prisma calls are patched on the live singleton — no real DB needed.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const invoice_service_1 = require("../modules/invoice/invoice.service");
const infrastructure_1 = require("@execora/infrastructure");
const fixtures_1 = require("./helpers/fixtures");
// ── createInvoice — validation ────────────────────────────────────────────────
(0, node_test_1.default)('createInvoice: throws when customerId is empty', async () => {
    await strict_1.default.rejects(() => invoice_service_1.invoiceService.createInvoice('', [{ productName: 'Butter', quantity: 1 }]), /Customer ID is required/i);
});
(0, node_test_1.default)('createInvoice: throws when items array is empty', async () => {
    await strict_1.default.rejects(() => invoice_service_1.invoiceService.createInvoice('cust-001', []), /at least one item/i);
});
(0, node_test_1.default)('createInvoice: throws when item productName is empty', async () => {
    await strict_1.default.rejects(() => invoice_service_1.invoiceService.createInvoice('cust-001', [{ productName: '', quantity: 1 }]), /valid product name/i);
});
(0, node_test_1.default)('createInvoice: throws when item quantity is zero', async () => {
    await strict_1.default.rejects(() => invoice_service_1.invoiceService.createInvoice('cust-001', [{ productName: 'Butter', quantity: 0 }]), /positive integer/i);
});
(0, node_test_1.default)('createInvoice: throws when item quantity is negative', async () => {
    await strict_1.default.rejects(() => invoice_service_1.invoiceService.createInvoice('cust-001', [{ productName: 'Butter', quantity: -2 }]), /positive integer/i);
});
(0, node_test_1.default)('createInvoice: throws when item quantity is a float', async () => {
    await strict_1.default.rejects(() => invoice_service_1.invoiceService.createInvoice('cust-001', [{ productName: 'Butter', quantity: 1.5 }]), /positive integer/i);
});
// ── createInvoice — happy path ─────────────────────────────────────────────────
(0, node_test_1.default)('createInvoice: creates invoice with stock and balance updates', async () => {
    const restores = [];
    try {
        const product = (0, fixtures_1.makeProduct)({ price: (0, fixtures_1.dec)(50), stock: 100 });
        const invoice = (0, fixtures_1.makeInvoice)({
            id: 'inv-001',
            total: (0, fixtures_1.dec)(100),
            items: [{ productId: product.id, quantity: 2, price: (0, fixtures_1.dec)(50), total: (0, fixtures_1.dec)(100) }],
            customer: (0, fixtures_1.makeCustomer)(),
        });
        const txProxy = {
            // generateInvoiceNo uses $queryRaw for atomic invoice number sequence
            $queryRaw: async () => [{ last_seq: 1 }],
            product: {
                findFirst: async () => product,
                findMany: async () => [product], // fuzzy fallback (not reached when findFirst hits)
                update: async () => ({ ...product, stock: 98 }),
            },
            invoice: {
                create: async () => invoice,
            },
            customer: {
                update: async () => (0, fixtures_1.makeCustomer)({ balance: (0, fixtures_1.dec)(100) }),
            },
        };
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma, '$transaction', (0, fixtures_1.makePrismaTransaction)(txProxy)));
        // createInvoice returns { invoice, autoCreatedProducts }
        const result = await invoice_service_1.invoiceService.createInvoice('cust-001', [{ productName: 'Butter', quantity: 2 }]);
        strict_1.default.equal(result.invoice.id, 'inv-001');
        strict_1.default.equal(result.invoice.status, 'CONFIRMED');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('createInvoice: auto-creates product when not found in DB', async () => {
    const restores = [];
    try {
        const autoProduct = (0, fixtures_1.makeProduct)({ name: 'Ghost Item', price: (0, fixtures_1.dec)(0), stock: 9999 });
        const invoice = (0, fixtures_1.makeInvoice)({ id: 'inv-auto', total: (0, fixtures_1.dec)(0), items: [] });
        const txProxy = {
            $queryRaw: async () => [{ last_seq: 1 }],
            product: {
                findFirst: async () => null, // Exact match not found
                findMany: async () => [], // Fuzzy pass also finds nothing → auto-create
                create: async () => autoProduct,
                update: async () => ({ ...autoProduct, stock: 9998 }),
            },
            invoice: { create: async () => invoice },
            customer: { update: async () => (0, fixtures_1.makeCustomer)() },
        };
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma, '$transaction', (0, fixtures_1.makePrismaTransaction)(txProxy)));
        const result = await invoice_service_1.invoiceService.createInvoice('cust-001', [{ productName: 'Ghost Item', quantity: 1 }]);
        strict_1.default.ok(result.autoCreatedProducts.includes('Ghost Item'));
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('createInvoice: throws on insufficient stock', async () => {
    const restores = [];
    try {
        const product = (0, fixtures_1.makeProduct)({ stock: 3 }); // Only 3 in stock
        const txProxy = {
            $queryRaw: async () => [{ last_seq: 1 }],
            product: {
                findFirst: async () => product,
                findMany: async () => [product],
            },
            invoice: { create: async () => ({}) },
            customer: { update: async () => ({}) },
        };
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma, '$transaction', (0, fixtures_1.makePrismaTransaction)(txProxy)));
        await strict_1.default.rejects(() => invoice_service_1.invoiceService.createInvoice('cust-001', [{ productName: 'Butter', quantity: 10 }]), /Insufficient stock/i);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── cancelInvoice ─────────────────────────────────────────────────────────────
(0, node_test_1.default)('cancelInvoice: marks invoice as cancelled and reverses balance', async () => {
    const restores = [];
    try {
        const invoice = (0, fixtures_1.makeInvoice)({ id: 'inv-001', total: (0, fixtures_1.dec)(100), items: [] });
        const cancelled = (0, fixtures_1.makeInvoice)({ id: 'inv-001', status: 'cancelled', items: [] });
        const txProxy = {
            invoice: {
                findUnique: async () => invoice,
                update: async () => cancelled,
            },
            product: { update: async () => ({}) },
            customer: { update: async () => (0, fixtures_1.makeCustomer)({ balance: (0, fixtures_1.dec)(0) }) },
        };
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma, '$transaction', (0, fixtures_1.makePrismaTransaction)(txProxy)));
        const result = await invoice_service_1.invoiceService.cancelInvoice('inv-001');
        strict_1.default.equal(result.status, 'cancelled');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('cancelInvoice: throws when invoice not found', async () => {
    const restores = [];
    try {
        const txProxy = {
            invoice: { findUnique: async () => null },
            product: { update: async () => ({}) },
            customer: { update: async () => ({}) },
        };
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma, '$transaction', (0, fixtures_1.makePrismaTransaction)(txProxy)));
        await strict_1.default.rejects(() => invoice_service_1.invoiceService.cancelInvoice('nonexistent-invoice'), /Invoice not found/i);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('cancelInvoice: throws when invoice is already cancelled', async () => {
    const restores = [];
    try {
        // Use lowercase 'cancelled' — that's what the service checks
        const alreadyCancelled = (0, fixtures_1.makeInvoice)({ status: 'cancelled', items: [] });
        const txProxy = {
            invoice: { findUnique: async () => alreadyCancelled },
            product: { update: async () => ({}) },
            customer: { update: async () => ({}) },
        };
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma, '$transaction', (0, fixtures_1.makePrismaTransaction)(txProxy)));
        await strict_1.default.rejects(() => invoice_service_1.invoiceService.cancelInvoice('inv-001'), /already cancelled/i);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── getDailySummary ───────────────────────────────────────────────────────────
(0, node_test_1.default)('getDailySummary: aggregates total sales, payments, and breakdown', async () => {
    const restores = [];
    try {
        // Return two invoices
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.invoice, 'findMany', async () => [
            { total: { toString: () => '500' } },
            { total: { toString: () => '300' } },
        ]));
        // getDailySummary now uses prisma.payment.findMany (not ledgerEntry)
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.payment, 'findMany', async () => [
            { amount: { toString: () => '400' }, method: 'cash' },
            { amount: { toString: () => '200' }, method: 'upi' },
        ]));
        const summary = await invoice_service_1.invoiceService.getDailySummary(new Date());
        strict_1.default.equal(summary.totalSales, 800);
        strict_1.default.equal(summary.totalPayments, 600);
        strict_1.default.equal(summary.cashPayments, 400);
        strict_1.default.equal(summary.upiPayments, 200);
        strict_1.default.equal(summary.pendingAmount, 200);
        strict_1.default.equal(summary.invoiceCount, 2);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('getDailySummary: returns zeros when no activity', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.invoice, 'findMany', async () => []));
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.payment, 'findMany', async () => []));
        const summary = await invoice_service_1.invoiceService.getDailySummary(new Date());
        strict_1.default.equal(summary.totalSales, 0);
        strict_1.default.equal(summary.totalPayments, 0);
        strict_1.default.equal(summary.pendingAmount, 0);
        strict_1.default.equal(summary.invoiceCount, 0);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── getLastInvoice ────────────────────────────────────────────────────────────
(0, node_test_1.default)('getLastInvoice: returns most recent non-cancelled invoice', async () => {
    const restores = [];
    try {
        const invoice = (0, fixtures_1.makeInvoice)({ status: 'CONFIRMED' });
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.invoice, 'findFirst', async () => invoice));
        const result = await invoice_service_1.invoiceService.getLastInvoice('cust-001');
        strict_1.default.ok(result !== null);
        strict_1.default.equal(result.status, 'CONFIRMED');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('getLastInvoice: returns null when no invoices', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(infrastructure_1.prisma.invoice, 'findFirst', async () => null));
        const result = await invoice_service_1.invoiceService.getLastInvoice('cust-001');
        strict_1.default.equal(result, null);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
//# sourceMappingURL=invoice.service.test.js.map