/**
 * LedgerService — Unit Tests
 * All Prisma calls are patched on the live singleton — no real DB needed.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerService } from '../modules/ledger/ledger.service';
import { prisma } from '../infrastructure/database';
import { patchMethod, restoreAll, makeLedgerEntry, makeCustomer, makePrismaTransaction } from './helpers/fixtures';
import type { RestoreFn } from './helpers/fixtures';

// ── recordPayment ──────────────────────────────────────────────────────────────

test('recordPayment: creates CREDIT entry and decrements balance', async () => {
  const restores: RestoreFn[] = [];
  try {
    const mockEntry = makeLedgerEntry({ type: 'CREDIT', customer: makeCustomer() });

    const txProxy = {
      ledgerEntry: { create: async () => mockEntry },
      customer: { update: async () => makeCustomer() },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    const result = await ledgerService.recordPayment('cust-001', 200, 'cash');
    assert.equal(result.type, 'CREDIT');
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
      const mockEntry = makeLedgerEntry({ type: 'CREDIT' });
      const txProxy = {
        ledgerEntry: { create: async () => mockEntry },
        customer: { update: async () => makeCustomer() },
      };
      restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

      const result = await ledgerService.recordPayment('cust-001', 100, mode);
      assert.equal(result.type, 'CREDIT', `mode ${mode} should succeed`);
    } finally {
      restoreAll(restores);
    }
  }
});

// ── addCredit ──────────────────────────────────────────────────────────────────

test('addCredit: creates DEBIT entry and increments balance', async () => {
  const restores: RestoreFn[] = [];
  try {
    const mockEntry = makeLedgerEntry({ type: 'DEBIT' });
    const txProxy = {
      ledgerEntry: { create: async () => mockEntry },
      customer: { update: async () => makeCustomer() },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    const result = await ledgerService.addCredit('cust-001', 500, 'Invoice for butter');
    assert.equal(result.type, 'DEBIT');
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

test('setOpeningBalance: creates OPENING_BALANCE entry when none exists', async () => {
  const restores: RestoreFn[] = [];
  try {
    const mockEntry = makeLedgerEntry({ type: 'OPENING_BALANCE' });
    const txProxy = {
      ledgerEntry: {
        findFirst: async () => null,  // No existing opening balance
        create: async () => mockEntry,
      },
      customer: { update: async () => makeCustomer() },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    const result = await ledgerService.setOpeningBalance('cust-001', 1000);
    assert.equal(result.type, 'OPENING_BALANCE');
  } finally {
    restoreAll(restores);
  }
});

test('setOpeningBalance: throws when opening balance already exists', async () => {
  const restores: RestoreFn[] = [];
  try {
    const existingEntry = makeLedgerEntry({ type: 'OPENING_BALANCE' });
    const txProxy = {
      ledgerEntry: {
        findFirst: async () => existingEntry,  // Already exists
        create: async () => existingEntry,
      },
      customer: { update: async () => makeCustomer() },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    await assert.rejects(
      () => ledgerService.setOpeningBalance('cust-001', 500),
      /already set/i
    );
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
    const mockEntry = makeLedgerEntry({ type: 'OPENING_BALANCE' });
    const txProxy = {
      ledgerEntry: {
        findFirst: async () => null,
        create: async () => mockEntry,
      },
      customer: { update: async () => makeCustomer() },
    };
    restores.push(patchMethod(prisma as any, '$transaction', makePrismaTransaction(txProxy)));

    const result = await ledgerService.setOpeningBalance('cust-001', 0);
    assert.ok(result !== null);
  } finally {
    restoreAll(restores);
  }
});

// ── getLedgerSummary ──────────────────────────────────────────────────────────

test('getLedgerSummary: correctly aggregates debits, credits, and payment modes', async () => {
  const restores: RestoreFn[] = [];
  try {
    const entries = [
      { type: 'DEBIT', amount: { toString: () => '1000' }, paymentMode: null },
      { type: 'CREDIT', amount: { toString: () => '400' }, paymentMode: 'cash' },
      { type: 'CREDIT', amount: { toString: () => '200' }, paymentMode: 'upi' },
      { type: 'OPENING_BALANCE', amount: { toString: () => '500' }, paymentMode: null },
    ];
    restores.push(patchMethod(prisma.ledgerEntry as any, 'findMany', async () => entries));

    const summary = await ledgerService.getLedgerSummary(new Date('2024-01-01'), new Date('2024-01-31'));
    assert.equal(summary.totalDebits, 1500);      // DEBIT 1000 + OPENING 500
    assert.equal(summary.totalCredits, 600);       // 400 + 200
    assert.equal(summary.netBalance, 900);          // 1500 - 600
    assert.equal(summary.cashPayments, 400);
    assert.equal(summary.upiPayments, 200);
    assert.equal(summary.entryCount, 4);
  } finally {
    restoreAll(restores);
  }
});

test('getLedgerSummary: returns zeros for empty date range', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.ledgerEntry as any, 'findMany', async () => []));

    const summary = await ledgerService.getLedgerSummary(new Date(), new Date());
    assert.equal(summary.totalDebits, 0);
    assert.equal(summary.totalCredits, 0);
    assert.equal(summary.entryCount, 0);
  } finally {
    restoreAll(restores);
  }
});
