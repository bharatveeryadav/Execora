/**
 * CustomerService — Unit Tests
 * All Prisma calls are patched on the live singleton — no real DB needed.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { customerService } from '../modules/customer/customer.service';
import { prisma } from '../infrastructure/database';
import { patchMethod, restoreAll, makeCustomer, dec } from './helpers/fixtures';
import type { RestoreFn } from './helpers/fixtures';

// ── createCustomer ─────────────────────────────────────────────────────────────

test('createCustomer: creates a customer when name is unique', async () => {
  const restores: RestoreFn[] = [];
  try {
    const mockCustomer = makeCustomer();

    // No existing customer with that name
    restores.push(patchMethod(prisma.customer as any, 'findMany', async () => []));
    restores.push(patchMethod(prisma.customer as any, 'create', async () => mockCustomer));

    const result = await customerService.createCustomer({ name: 'Bharat Kumar' });
    assert.equal(result.name, 'Bharat Kumar');
    assert.equal(result.id, 'cust-test-001');
  } finally {
    restoreAll(restores);
  }
});

test('createCustomer: throws when name is empty', async () => {
  await assert.rejects(
    () => customerService.createCustomer({ name: '' }),
    /name is required/i
  );
});

test('createCustomer: throws when name is only whitespace', async () => {
  await assert.rejects(
    () => customerService.createCustomer({ name: '   ' }),
    /name is required/i
  );
});

test('createCustomer: throws when duplicate name exists', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.customer as any, 'findMany', async () => [{ id: 'cust-existing', name: 'Bharat Kumar' }]));

    await assert.rejects(
      () => customerService.createCustomer({ name: 'Bharat Kumar' }),
      /already exists/i
    );
  } finally {
    restoreAll(restores);
  }
});

// ── getCustomerById ────────────────────────────────────────────────────────────

test('getCustomerById: returns customer with invoices and reminders', async () => {
  const restores: RestoreFn[] = [];
  try {
    const mockCustomer = makeCustomer({ invoices: [{ id: 'inv-1' }], reminders: [] });
    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => mockCustomer));

    const result = await customerService.getCustomerById('cust-test-001');
    assert.ok(result !== null);
    assert.equal(result!.id, 'cust-test-001');
    assert.equal((result as any).invoices.length, 1);
  } finally {
    restoreAll(restores);
  }
});

test('getCustomerById: returns null when not found', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => null));

    const result = await customerService.getCustomerById('nonexistent');
    assert.equal(result, null);
  } finally {
    restoreAll(restores);
  }
});

// ── updateBalance ─────────────────────────────────────────────────────────────

test('updateBalance: increments balance and returns updated customer', async () => {
  const restores: RestoreFn[] = [];
  try {
    const updated = makeCustomer({ balance: dec(700) });
    restores.push(patchMethod(prisma.customer as any, 'update', async () => updated));

    const result = await customerService.updateBalance('cust-test-001', 200);
    assert.ok(result !== null);
    assert.equal(result!.id, 'cust-test-001');
  } finally {
    restoreAll(restores);
  }
});

test('updateBalance: throws when customerId is empty', async () => {
  await assert.rejects(
    () => customerService.updateBalance('', 100),
    /Customer ID is required/i
  );
});

test('updateBalance: throws when amount is not a finite number', async () => {
  await assert.rejects(
    () => customerService.updateBalance('cust-001', NaN),
    /finite number/i
  );
});

// ── getBalance ────────────────────────────────────────────────────────────────

test('getBalance: returns numeric balance from prisma', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => ({ balance: dec(450) })));

    const balance = await customerService.getBalance('cust-test-001');
    assert.equal(balance, 450);
  } finally {
    restoreAll(restores);
  }
});

test('getBalance: returns 0 when customer not found', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.customer as any, 'findUnique', async () => null));

    const balance = await customerService.getBalance('nonexistent');
    assert.equal(balance, 0);
  } finally {
    restoreAll(restores);
  }
});

// ── searchCustomer ────────────────────────────────────────────────────────────

test('searchCustomer: returns empty array on prisma error', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.customer as any, 'findMany', async () => {
      throw new Error('DB error');
    }));

    const results = await customerService.searchCustomer('Bharat');
    // The service swallows errors and returns []
    assert.ok(Array.isArray(results));
    assert.equal(results.length, 0);
  } finally {
    restoreAll(restores);
  }
});

test('searchCustomer: returns matched results sorted by score', async () => {
  const restores: RestoreFn[] = [];
  try {
    const raw = [
      makeCustomer({ id: 'c1', name: 'Bharat Kumar', phone: null }),
      makeCustomer({ id: 'c2', name: 'Bharat Singh', phone: null }),
    ];
    restores.push(patchMethod(prisma.customer as any, 'findMany', async () => raw));

    const results = await customerService.searchCustomer('Bharat');
    assert.ok(results.length >= 1);
    assert.ok(results[0].matchScore >= results[results.length - 1].matchScore, 'should be sorted desc');
  } finally {
    restoreAll(restores);
  }
});

// ── updateCustomer ────────────────────────────────────────────────────────────

test('updateCustomer: returns true on successful update', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.customer as any, 'update', async () => makeCustomer({ phone: '9876543210' })));

    const ok = await customerService.updateCustomer('cust-test-001', { phone: '9876543210' });
    assert.equal(ok, true);
  } finally {
    restoreAll(restores);
  }
});

test('updateCustomer: returns false when customerId is empty', async () => {
  const result = await customerService.updateCustomer('', { phone: '1234567890' });
  assert.equal(result, false);
});

test('updateCustomer: returns false when updates object is empty', async () => {
  const result = await customerService.updateCustomer('cust-001', {});
  assert.equal(result, false);
});

// ── calculateBalanceFromLedger ────────────────────────────────────────────────

test('calculateBalanceFromLedger: sums debits minus credits correctly', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.ledgerEntry as any, 'findMany', async () => [
      { type: 'DEBIT', amount: dec(1000) },
      { type: 'CREDIT', amount: dec(300) },
      { type: 'OPENING_BALANCE', amount: dec(500) },
    ]));

    const balance = await customerService.calculateBalanceFromLedger('cust-001');
    // DEBIT 1000 + OPENING 500 = 1500 owed; CREDIT 300 = 300 paid → net 1200
    assert.equal(balance, 1200);
  } finally {
    restoreAll(restores);
  }
});

test('calculateBalanceFromLedger: returns 0 for no entries', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.ledgerEntry as any, 'findMany', async () => []));

    const balance = await customerService.calculateBalanceFromLedger('cust-001');
    assert.equal(balance, 0);
  } finally {
    restoreAll(restores);
  }
});

// ── getAllCustomersWithPendingBalance ─────────────────────────────────────
test('getAllCustomersWithPendingBalance: returns customers with positive balance', async () => {
  const restores: RestoreFn[] = [];
  try {
    const customers = [
      makeCustomer({ id: 'c1', name: 'Amit', balance: dec(500) }),
      makeCustomer({ id: 'c2', name: 'Rina', balance: dec(200) }),
    ];
    restores.push(patchMethod(prisma.customer as any, 'findMany', async () => customers));
    const result = await customerService.getAllCustomersWithPendingBalance();
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 2);
    assert.equal(result[0].name, 'Amit');
    assert.equal(result[1].balance, 200);
  } finally {
    restoreAll(restores);
  }
});

test('getTotalPendingAmount: sums all positive balances', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.customer as any, 'aggregate', async () => ({ _sum: { balance: dec(700) } })));
    const total = await customerService.getTotalPendingAmount();
    assert.equal(total, 700);
  } finally {
    restoreAll(restores);
  }
});
