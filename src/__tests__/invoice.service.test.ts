/**
 * InvoiceService — Unit Tests
 * All Prisma calls are patched on the live singleton — no real DB needed.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { invoiceService } from '../modules/invoice/invoice.service';
import { prisma } from '../infrastructure/database';
import { patchMethod, restoreAll, makeInvoice, makeProduct, makeCustomer, dec, makePrismaTransaction } from './helpers/fixtures';
import type { RestoreFn } from './helpers/fixtures';

// ── createInvoice — validation ────────────────────────────────────────────────

test('createInvoice: throws when customerId is empty', async () => {
  await assert.rejects(
    () => invoiceService.createInvoice('', [{ productName: 'Butter', quantity: 1 }]),
    /Customer ID is required/i
  );
});

test('createInvoice: throws when items array is empty', async () => {
  await assert.rejects(
    () => invoiceService.createInvoice('cust-001', []),
    /at least one item/i
  );
});

test('createInvoice: throws when item productName is empty', async () => {
  await assert.rejects(
    () => invoiceService.createInvoice('cust-001', [{ productName: '', quantity: 1 }]),
    /valid product name/i
  );
});

test('createInvoice: throws when item quantity is zero', async () => {
  await assert.rejects(
    () => invoiceService.createInvoice('cust-001', [{ productName: 'Butter', quantity: 0 }]),
    /positive integer/i
  );
});

test('createInvoice: throws when item quantity is negative', async () => {
  await assert.rejects(
    () => invoiceService.createInvoice('cust-001', [{ productName: 'Butter', quantity: -2 }]),
    /positive integer/i
  );
});

test('createInvoice: throws when item quantity is a float', async () => {
  await assert.rejects(
    () => invoiceService.createInvoice('cust-001', [{ productName: 'Butter', quantity: 1.5 }]),
    /positive integer/i
  );
});

// ── createInvoice — happy path ─────────────────────────────────────────────────

test('createInvoice: creates invoice with stock and balance updates', async () => {
  const restores: RestoreFn[] = [];
  try {
    const product = makeProduct({ price: dec(50), stock: 100 });
    const invoice = makeInvoice({
      id: 'inv-001',
      total: dec(100),
      items: [{ productId: product.id, quantity: 2, price: dec(50), total: dec(100) }],
      customer: makeCustomer(),
    });

    const txProxy = {
      product: {
        findFirst: async () => product,
        update: async () => ({ ...product, stock: 98 }),
      },
      invoice: {
        create: async () => invoice,
      },
      ledgerEntry: {
        create: async () => ({}),
      },
      customer: {
        update: async () => makeCustomer({ balance: dec(100) }),
      },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    const result = await invoiceService.createInvoice('cust-001', [{ productName: 'Butter', quantity: 2 }]);
    assert.equal(result.id, 'inv-001');
    assert.equal(result.status, 'CONFIRMED');
  } finally {
    restoreAll(restores);
  }
});

test('createInvoice: throws when product not found in DB', async () => {
  const restores: RestoreFn[] = [];
  try {
    const txProxy = {
      product: {
        findFirst: async () => null,  // Product not found
      },
      invoice: { create: async () => ({}) },
      ledgerEntry: { create: async () => ({}) },
      customer: { update: async () => ({}) },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    await assert.rejects(
      () => invoiceService.createInvoice('cust-001', [{ productName: 'Ghost Item', quantity: 1 }]),
      /Product not found/i
    );
  } finally {
    restoreAll(restores);
  }
});

test('createInvoice: throws on insufficient stock', async () => {
  const restores: RestoreFn[] = [];
  try {
    const product = makeProduct({ stock: 3 }); // Only 3 in stock
    const txProxy = {
      product: {
        findFirst: async () => product,
      },
      invoice: { create: async () => ({}) },
      ledgerEntry: { create: async () => ({}) },
      customer: { update: async () => ({}) },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    await assert.rejects(
      () => invoiceService.createInvoice('cust-001', [{ productName: 'Butter', quantity: 10 }]),
      /Insufficient stock/i
    );
  } finally {
    restoreAll(restores);
  }
});

// ── cancelInvoice ─────────────────────────────────────────────────────────────

test('cancelInvoice: marks invoice as CANCELLED and reverses balance', async () => {
  const restores: RestoreFn[] = [];
  try {
    const invoice = makeInvoice({ id: 'inv-001', total: dec(100), items: [] });
    const cancelled = makeInvoice({ id: 'inv-001', status: 'CANCELLED', items: [] });

    const txProxy = {
      invoice: {
        findUnique: async () => invoice,
        update: async () => cancelled,
      },
      ledgerEntry: { create: async () => ({}) },
      product: { update: async () => ({}) },
      customer: { update: async () => makeCustomer({ balance: dec(0) }) },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    const result = await invoiceService.cancelInvoice('inv-001');
    assert.equal(result.status, 'CANCELLED');
  } finally {
    restoreAll(restores);
  }
});

test('cancelInvoice: throws when invoice not found', async () => {
  const restores: RestoreFn[] = [];
  try {
    const txProxy = {
      invoice: { findUnique: async () => null },
      ledgerEntry: { create: async () => ({}) },
      product: { update: async () => ({}) },
      customer: { update: async () => ({}) },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    await assert.rejects(
      () => invoiceService.cancelInvoice('nonexistent-invoice'),
      /Invoice not found/i
    );
  } finally {
    restoreAll(restores);
  }
});

test('cancelInvoice: throws when invoice is already cancelled', async () => {
  const restores: RestoreFn[] = [];
  try {
    const alreadyCancelled = makeInvoice({ status: 'CANCELLED', items: [] });
    const txProxy = {
      invoice: { findUnique: async () => alreadyCancelled },
      ledgerEntry: { create: async () => ({}) },
      product: { update: async () => ({}) },
      customer: { update: async () => ({}) },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    await assert.rejects(
      () => invoiceService.cancelInvoice('inv-001'),
      /already cancelled/i
    );
  } finally {
    restoreAll(restores);
  }
});

// ── getDailySummary ───────────────────────────────────────────────────────────

test('getDailySummary: aggregates total sales, payments, and breakdown', async () => {
  const restores: RestoreFn[] = [];
  try {
    // Return two confirmed invoices
    restores.push(patchMethod(prisma.invoice as any, 'findMany', async () => [
      { total: { toString: () => '500' } },
      { total: { toString: () => '300' } },
    ]));

    // Return two payment entries
    restores.push(patchMethod(prisma.ledgerEntry as any, 'findMany', async () => [
      { amount: { toString: () => '400' }, paymentMode: 'cash' },
      { amount: { toString: () => '200' }, paymentMode: 'upi' },
    ]));

    const summary = await invoiceService.getDailySummary(new Date());
    assert.equal(summary.totalSales, 800);
    assert.equal(summary.totalPayments, 600);
    assert.equal(summary.cashPayments, 400);
    assert.equal(summary.upiPayments, 200);
    assert.equal(summary.pendingAmount, 200);
    assert.equal(summary.invoiceCount, 2);
  } finally {
    restoreAll(restores);
  }
});

test('getDailySummary: returns zeros when no activity', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.invoice as any, 'findMany', async () => []));
    restores.push(patchMethod(prisma.ledgerEntry as any, 'findMany', async () => []));

    const summary = await invoiceService.getDailySummary(new Date());
    assert.equal(summary.totalSales, 0);
    assert.equal(summary.totalPayments, 0);
    assert.equal(summary.pendingAmount, 0);
    assert.equal(summary.invoiceCount, 0);
  } finally {
    restoreAll(restores);
  }
});

// ── getLastInvoice ────────────────────────────────────────────────────────────

test('getLastInvoice: returns most recent non-cancelled invoice', async () => {
  const restores: RestoreFn[] = [];
  try {
    const invoice = makeInvoice({ status: 'CONFIRMED' });
    restores.push(patchMethod(prisma.invoice as any, 'findFirst', async () => invoice));

    const result = await invoiceService.getLastInvoice('cust-001');
    assert.ok(result !== null);
    assert.equal(result!.status, 'CONFIRMED');
  } finally {
    restoreAll(restores);
  }
});

test('getLastInvoice: returns null when no invoices', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.invoice as any, 'findFirst', async () => null));

    const result = await invoiceService.getLastInvoice('cust-001');
    assert.equal(result, null);
  } finally {
    restoreAll(restores);
  }
});

// ── sendInvoiceByEmail ─────────────────────────────────────────────────────

test('sendInvoiceByEmail: sends email immediately', async () => {
  const restores: RestoreFn[] = [];
  try {
    const invoice = makeInvoice({ id: 'inv-001', customerId: 'cust-001', customer: { id: 'cust-001', name: 'Test Customer', email: 'test@example.com' }, items: [makeProduct({ name: 'Butter' })], total: dec(100) });
    restores.push(patchMethod(prisma.invoice as any, 'findUnique', async () => invoice));
    restores.push(patchMethod(prisma.reminder as any, 'create', async () => ({})));
    restores.push(patchMethod(prisma.reminder as any, 'update', async () => ({})));
    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => invoice.customer));
    restores.push(patchMethod(require('../integrations/email').emailService, 'sendMail', async () => ({ messageId: 'msg-001' })));

    const result = await invoiceService.sendInvoiceByEmail('inv-001', 'test@example.com');
    assert.ok(result.sent);
  } finally {
    restoreAll(restores);
  }
});

test('sendInvoiceByEmail: schedules reminder if sendAt is future', async () => {
  const restores: RestoreFn[] = [];
  try {
    const invoice = makeInvoice({ id: 'inv-002', customerId: 'cust-002', customer: { id: 'cust-002', name: 'Test Customer 2', email: 'test2@example.com' }, items: [makeProduct({ name: 'Jam' })], total: dec(200) });
    restores.push(patchMethod(prisma.invoice as any, 'findUnique', async () => invoice));
    restores.push(patchMethod(prisma.reminder as any, 'create', async () => ({})));
    restores.push(patchMethod(prisma.reminder as any, 'update', async () => ({})));
    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => invoice.customer));
    restores.push(patchMethod(require('../integrations/email').emailService, 'sendMail', async () => ({ messageId: 'msg-002' })));

    const future = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const result = await invoiceService.sendInvoiceByEmail('inv-002', 'test2@example.com', future);
    assert.ok(result.scheduled);
  } finally {
    restoreAll(restores);
  }
});
