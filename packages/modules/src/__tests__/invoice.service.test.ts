/**
 * InvoiceService — Unit Tests
 * All Prisma calls are patched on the live singleton — no real DB needed.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { invoiceService } from '../modules/invoice/invoice.service';
import { prisma } from '@execora/infrastructure';
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
      // generateInvoiceNo uses $queryRaw for atomic invoice number sequence
      $queryRaw: async () => [{ last_seq: 1 }],
      product: {
        findFirst: async () => product,
        findMany:  async () => [product],   // fuzzy fallback (not reached when findFirst hits)
        update:    async () => ({ ...product, stock: 98 }),
      },
      invoice: {
        create: async () => invoice,
      },
      customer: {
        findUnique: async () => makeCustomer({ balance: dec(0) }),
        update: async () => makeCustomer({ balance: dec(100) }),
      },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    // createInvoice returns { invoice, autoCreatedProducts }
    const result = await invoiceService.createInvoice('cust-001', [{ productName: 'Butter', quantity: 2 }]);
    assert.equal(result.invoice.id, 'inv-001');
    assert.equal(result.invoice.status, 'CONFIRMED');
  } finally {
    restoreAll(restores);
  }
});

test('createInvoice: auto-creates product when not found in DB', async () => {
  const restores: RestoreFn[] = [];
  try {
    const autoProduct = makeProduct({ name: 'Ghost Item', price: dec(0), stock: 9999 });
    const invoice = makeInvoice({ id: 'inv-auto', total: dec(0), items: [] });
    const txProxy = {
      $queryRaw: async () => [{ last_seq: 1 }],
      product: {
        findFirst: async () => null,   // Exact match not found
        findMany:  async () => [],     // Fuzzy pass also finds nothing → auto-create
        create:    async () => autoProduct,
        update:    async () => ({ ...autoProduct, stock: 9998 }),
      },
      invoice:  { create: async () => invoice },
      customer: { findUnique: async () => makeCustomer({ balance: dec(0) }), update: async () => makeCustomer() },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    const result = await invoiceService.createInvoice('cust-001', [{ productName: 'Ghost Item', quantity: 1 }]);
    assert.ok(result.autoCreatedProducts.includes('Ghost Item'));
  } finally {
    restoreAll(restores);
  }
});

// NOTE: createInvoice does NOT enforce stock limits — it decrements stock after creation.
// Stock can go negative. A future enforcement layer may add this check.
test('createInvoice: creates invoice even when stock is below requested quantity', async () => {
  const restores: RestoreFn[] = [];
  try {
    const product = makeProduct({ stock: 3 }); // Only 3 in stock
    const invoice = makeInvoice({ id: 'inv-low-stock', total: dec(50), items: [] });
    const txProxy = {
      $queryRaw: async () => [{ last_seq: 1 }],
      product: {
        findFirst: async () => product,
        findMany:  async () => [product],
        update:    async () => ({ ...product, stock: -7 }),
      },
      invoice:  { create: async () => invoice },
      customer: { findUnique: async () => makeCustomer({ balance: dec(0) }), update: async () => ({}) },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    // No error thrown — service allows stock to go negative
    const result = await invoiceService.createInvoice('cust-001', [{ productName: 'Butter', quantity: 10 }]);
    assert.equal(result.invoice.id, 'inv-low-stock');
  } finally {
    restoreAll(restores);
  }
});

// ── cancelInvoice ─────────────────────────────────────────────────────────────

test('cancelInvoice: marks invoice as cancelled and reverses balance', async () => {
  const restores: RestoreFn[] = [];
  try {
    const invoice   = makeInvoice({ id: 'inv-001', total: dec(100), items: [] });
    const cancelled = makeInvoice({ id: 'inv-001', status: 'cancelled', items: [] });

    const txProxy = {
      invoice: {
        findUnique: async () => invoice,
        update: async () => cancelled,
      },
      product:  { update: async () => ({}) },
      customer: { update: async () => makeCustomer({ balance: dec(0) }) },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    const result = await invoiceService.cancelInvoice('inv-001');
    assert.equal(result.status, 'cancelled');
  } finally {
    restoreAll(restores);
  }
});

test('cancelInvoice: throws when invoice not found', async () => {
  const restores: RestoreFn[] = [];
  try {
    const txProxy = {
      invoice:  { findUnique: async () => null },
      product:  { update: async () => ({}) },
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
    // Use lowercase 'cancelled' — that's what the service checks
    const alreadyCancelled = makeInvoice({ status: 'cancelled', items: [] });
    const txProxy = {
      invoice:  { findUnique: async () => alreadyCancelled },
      product:  { update: async () => ({}) },
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
    // Return two invoices
    restores.push(patchMethod(prisma.invoice as any, 'findMany', async () => [
      { total: { toString: () => '500' } },
      { total: { toString: () => '300' } },
    ]));

    // getDailySummary now uses prisma.payment.findMany (not ledgerEntry)
    restores.push(patchMethod(prisma.payment as any, 'findMany', async () => [
      { amount: { toString: () => '400' }, method: 'cash' },
      { amount: { toString: () => '200' }, method: 'upi' },
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
    restores.push(patchMethod(prisma.payment as any, 'findMany', async () => []));

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
