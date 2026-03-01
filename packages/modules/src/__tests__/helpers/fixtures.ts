/**
 * Shared test fixtures and utilities.
 * Used by all test files — no framework dependency.
 */

import { Decimal } from '@prisma/client/runtime/library';

// ── Patch helper (mirrors engine.test.ts pattern) ─────────────────────────────
export type RestoreFn = () => void;

export function patchMethod<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  value: T[K],
): RestoreFn {
  const original = obj[key];
  (obj as any)[key] = value;
  return () => {
    (obj as any)[key] = original;
  };
}

/** Run all restore functions collected from patchMethod calls. */
export function restoreAll(restores: RestoreFn[]) {
  restores.forEach((r) => r());
}

// ── Decimal helper ─────────────────────────────────────────────────────────────
export const dec = (n: number | string) => new Decimal(String(n));

// ── Model factories ────────────────────────────────────────────────────────────

export function makeCustomer(overrides: Record<string, any> = {}) {
  return {
    id: 'cust-test-001',
    name: 'Bharat Kumar',
    phone: '9999999999',
    nickname: 'Bharat',
    landmark: 'Near ATM',
    balance: dec(500),
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    invoices: [],
    reminders: [],
    ...overrides,
  };
}

export function makeProduct(overrides: Record<string, any> = {}) {
  return {
    id: 'prod-test-001',
    name: 'Butter',
    description: 'Fresh dairy butter',
    price: dec(50),
    stock: 100,
    unit: 'piece',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function makeLedgerEntry(overrides: Record<string, any> = {}) {
  return {
    id: 'ledger-test-001',
    customerId: 'cust-test-001',
    type: 'CREDIT',
    amount: dec(200),
    description: 'Payment received via cash',
    paymentMode: 'cash',
    reference: null,
    createdAt: new Date('2024-01-01'),
    customer: makeCustomer(),
    ...overrides,
  };
}

export function makeInvoice(overrides: Record<string, any> = {}) {
  return {
    id: 'inv-test-001',
    customerId: 'cust-test-001',
    total: dec(250),
    status: 'CONFIRMED',
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    items: [],
    customer: makeCustomer(),
    ...overrides,
  };
}

export function makeReminder(overrides: Record<string, any> = {}) {
  return {
    id: 'reminder-test-001',
    customerId: 'cust-test-001',
    amount: dec(500),
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
export function makePrismaTransaction(txProxy: Record<string, any>) {
  return async (arg: unknown) => {
    if (typeof arg === 'function') return (arg as Function)(txProxy);
    if (Array.isArray(arg)) return Promise.all(arg);
    throw new Error('Unexpected $transaction argument type');
  };
}
