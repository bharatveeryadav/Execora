/**
 * LedgerService — Unit Tests
 * All Prisma calls are patched on the live singleton — no real DB needed.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerService } from '../modules/ledger/ledger.service';
import { prisma } from '@execora/infrastructure';
import { patchMethod, restoreAll, makeCustomer, makePrismaTransaction, dec } from './helpers/fixtures';
import type { RestoreFn } from './helpers/fixtures';

// ── Payment fixture (matches current Payment model) ────────────────────────────
function makePayment(overrides: Record<string, any> = {}) {
  return {
    id:         'pay-test-001',
    paymentNo:  'PAY-20240101-ABCDE',
    tenantId:   'tenant-001',
    customerId: 'cust-test-001',
    amount:     dec(200),
    method:     'cash',
    status:     'completed',
    notes:      null,
    receivedAt: new Date('2024-01-01'),
    createdAt:  new Date('2024-01-01'),
    customer:   makeCustomer(),
    ...overrides,
  };
}

// ── recordPayment ──────────────────────────────────────────────────────────────

test('recordPayment: creates Payment record and decrements balance', async () => {
  const restores: RestoreFn[] = [];
  try {
    const mockPayment = makePayment({ method: 'cash', status: 'completed' });

    const txProxy = {
      payment:  { create: async () => mockPayment },
      customer: { update: async () => makeCustomer() },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    const result = await ledgerService.recordPayment('cust-001', 200, 'cash');
    assert.equal(result.status, 'completed');
    assert.equal(result.method, 'cash');
  } finally {
    restoreAll(restores);
  }
});

test('recordPayment: throws when customerId is empty', async () => {
  await assert.rejects(
    () => ledgerService.recordPayment('', 200, 'cash'),
    /Customer ID is required/i
  );
});

test('recordPayment: throws when amount is zero', async () => {
  await assert.rejects(
    () => ledgerService.recordPayment('cust-001', 0, 'cash'),
    /positive number/i
  );
});

test('recordPayment: throws when amount is negative', async () => {
  await assert.rejects(
    () => ledgerService.recordPayment('cust-001', -50, 'upi'),
    /positive number/i
  );
});

test('recordPayment: throws when amount is NaN', async () => {
  await assert.rejects(
    () => ledgerService.recordPayment('cust-001', NaN, 'cash'),
    /positive number/i
  );
});

test('recordPayment: throws on invalid paymentMode', async () => {
  await assert.rejects(
    () => ledgerService.recordPayment('cust-001', 100, 'bitcoin' as any),
    /cash.*upi.*card.*other/i
  );
});

test('recordPayment: accepts all valid payment modes', async () => {
  const modes: Array<'cash' | 'upi' | 'card' | 'other'> = ['cash', 'upi', 'card', 'other'];
  for (const mode of modes) {
    const restores: RestoreFn[] = [];
    try {
      const mockPayment = makePayment({ method: mode === 'other' ? 'bank' : mode });
      const txProxy = {
        payment:  { create: async () => mockPayment },
        customer: { update: async () => makeCustomer() },
      };
      restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

      const result = await ledgerService.recordPayment('cust-001', 100, mode);
      assert.equal(result.status, 'completed', `mode ${mode} should succeed`);
    } finally {
      restoreAll(restores);
    }
  }
});

// ── addCredit ──────────────────────────────────────────────────────────────────
// addCredit now updates customer balance directly (no transaction, no Payment record)

test('addCredit: increments customer balance and returns updated customer', async () => {
  const restores: RestoreFn[] = [];
  try {
    const updatedCustomer = makeCustomer({ balance: dec(1000) });
    restores.push(patchMethod(prisma.customer as any, 'update', async () => updatedCustomer));

    const result = await ledgerService.addCredit('cust-001', 500, 'Invoice for butter');
    assert.ok(result !== null, 'should return the updated customer');
    assert.ok('id' in result, 'result should be a customer object');
  } finally {
    restoreAll(restores);
  }
});

test('addCredit: throws when customerId is empty', async () => {
  await assert.rejects(
    () => ledgerService.addCredit('', 500, 'test'),
    /Customer ID is required/i
  );
});

test('addCredit: throws when amount is zero', async () => {
  await assert.rejects(
    () => ledgerService.addCredit('cust-001', 0, 'test'),
    /positive number/i
  );
});

test('addCredit: throws when description is empty', async () => {
  await assert.rejects(
    () => ledgerService.addCredit('cust-001', 100, ''),
    /Description is required/i
  );
});

test('addCredit: throws when description is only whitespace', async () => {
  await assert.rejects(
    () => ledgerService.addCredit('cust-001', 100, '   '),
    /Description is required/i
  );
});

// ── setOpeningBalance ──────────────────────────────────────────────────────────
// setOpeningBalance now sets balance directly on the customer (no LedgerEntry)

test('setOpeningBalance: updates customer balance and returns updated customer', async () => {
  const restores: RestoreFn[] = [];
  try {
    const updatedCustomer = makeCustomer({ balance: dec(1000) });
    restores.push(patchMethod(prisma.customer as any, 'update', async () => updatedCustomer));

    const result = await ledgerService.setOpeningBalance('cust-001', 1000);
    assert.ok(result !== null);
    assert.ok('id' in result, 'result should be a customer object');
  } finally {
    restoreAll(restores);
  }
});

test('setOpeningBalance: throws when customerId is empty', async () => {
  await assert.rejects(
    () => ledgerService.setOpeningBalance('', 100),
    /Customer ID is required/i
  );
});

test('setOpeningBalance: throws when amount is negative', async () => {
  await assert.rejects(
    () => ledgerService.setOpeningBalance('cust-001', -100),
    /non-negative/i
  );
});

test('setOpeningBalance: allows zero as opening balance', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.customer as any, 'update', async () => makeCustomer({ balance: dec(0) })));

    const result = await ledgerService.setOpeningBalance('cust-001', 0);
    assert.ok(result !== null);
  } finally {
    restoreAll(restores);
  }
});

// ── getLedgerSummary ──────────────────────────────────────────────────────────
// getLedgerSummary now uses Payment model (method field, not type field)

test('getLedgerSummary: aggregates payment totals and breaks down by method', async () => {
  const restores: RestoreFn[] = [];
  try {
    const payments = [
      { amount: { toString: () => '400' }, method: 'cash' },
      { amount: { toString: () => '200' }, method: 'upi' },
      { amount: { toString: () => '100' }, method: 'card' },
    ];
    restores.push(patchMethod(prisma.payment as any, 'findMany', async () => payments));

    const summary = await ledgerService.getLedgerSummary(new Date('2024-01-01'), new Date('2024-01-31'));
    assert.equal(summary.totalCredits, 700);   // 400 + 200 + 100
    assert.equal(summary.cashPayments, 400);
    assert.equal(summary.upiPayments, 200);
    assert.equal(summary.entryCount, 3);
    assert.equal(summary.totalDebits, 0);       // debits come from invoices now
  } finally {
    restoreAll(restores);
  }
});

test('getLedgerSummary: returns zeros for empty date range', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.payment as any, 'findMany', async () => []));

    const summary = await ledgerService.getLedgerSummary(new Date(), new Date());
    assert.equal(summary.totalDebits, 0);
    assert.equal(summary.totalCredits, 0);
    assert.equal(summary.entryCount, 0);
  } finally {
    restoreAll(restores);
  }
});
