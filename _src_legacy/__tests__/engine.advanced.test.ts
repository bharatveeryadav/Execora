/**
 * engine.advanced.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-level tests for BusinessEngine.execute() covering ALL 27 intent
 * types, multi-turn flows (draft → confirm → email), edge cases, and error
 * propagation.
 *
 * Test strategy:
 *  • All external dependencies (DB, Redis, email) are monkey-patched per test.
 *  • Each test collects RestoreFn[] and restores in a finally block — no leaks.
 *  • Assertions target both success flags AND the exact messages/data shapes
 *    that downstream TTS and UI rely on.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@prisma/client/runtime/library';

import { businessEngine } from '../modules/voice/engine';
import { customerService } from '../modules/customer/customer.service';
import { ledgerService } from '../modules/ledger/ledger.service';
import { invoiceService } from '../modules/invoice/invoice.service';
import { reminderService } from '../modules/reminder/reminder.service';
import { productService } from '../modules/product/product.service';
import { conversationMemory } from '../modules/voice/conversation';
import { emailService } from '../infrastructure/email';
import { IntentType, type IntentExtraction } from '../types';
import { disconnectDB } from '../infrastructure/database';
import { patchMethod, restoreAll, type RestoreFn } from './helpers/fixtures';

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Build a minimal IntentExtraction for a given type and entities. */
function intent(type: IntentType, entities: Record<string, any> = {}): IntentExtraction {
  return { intent: type, entities, confidence: 0.95, originalText: 'test input' };
}

/** Conversation ID used across most tests. */
const CONV = 'eng-adv-conv-001';

// ─── Reusable fixture objects ─────────────────────────────────────────────────

const CUSTOMER_WITH_EMAIL = {
  id: 'cust-001',
  name: 'Bharat Kumar',
  phone: '9876543210',
  email: 'bharat@example.com',
  nickname: 'Bharat',
  landmark: 'ATM wala',
  balance: 500,
  matchScore: 0.95,
};

const CUSTOMER_NO_EMAIL = {
  id: 'cust-002',
  name: 'Rahul Singh',
  phone: '9111111111',
  email: null,
  nickname: null,
  landmark: 'Market wala',
  balance: 200,
  matchScore: 0.9,
};

/** Resolved items returned by previewInvoice (no GST). */
const RESOLVED_ITEMS_NO_GST = [
  {
    productId: 'prod-001', productName: 'chawal', unit: 'kg', hsnCode: null,
    quantity: 2, unitPrice: 50, gstRate: 0, cessRate: 0, isGstExempt: false,
    cgst: 0, sgst: 0, igst: 0, cess: 0, subtotal: 100, totalTax: 0, total: 100,
    autoCreated: false,
  },
  {
    productId: 'prod-002', productName: 'aata', unit: 'kg', hsnCode: null,
    quantity: 5, unitPrice: 30, gstRate: 0, cessRate: 0, isGstExempt: false,
    cgst: 0, sgst: 0, igst: 0, cess: 0, subtotal: 150, totalTax: 0, total: 150,
    autoCreated: false,
  },
];

/** Preview result for a ₹250 bill without GST. */
const PREVIEW_NO_GST = {
  resolvedItems: RESOLVED_ITEMS_NO_GST,
  subtotal: 250, totalCgst: 0, totalSgst: 0, totalIgst: 0,
  totalCess: 0, totalTax: 0, grandTotal: 250, autoCreatedProducts: [],
};

/** Preview result for the same bill WITH 5% GST (CGST 2.5% + SGST 2.5%). */
const RESOLVED_ITEMS_WITH_GST = RESOLVED_ITEMS_NO_GST.map((i) => ({
  ...i,
  gstRate: 5,
  cgst:    i.subtotal * 0.025,
  sgst:    i.subtotal * 0.025,
  totalTax: i.subtotal * 0.05,
  total:   i.subtotal * 1.05,
}));

const PREVIEW_WITH_GST = {
  resolvedItems: RESOLVED_ITEMS_WITH_GST,
  subtotal: 250, totalCgst: 6.25, totalSgst: 6.25, totalIgst: 0,
  totalCess: 0, totalTax: 12.5, grandTotal: 262.5, autoCreatedProducts: [],
};

/** A confirmed DB invoice record (Prisma shape). */
function makeConfirmedInvoice(overrides: Record<string, any> = {}) {
  return {
    id: 'inv-db-001',
    invoiceNo: '2025-26/INV/0001',
    total: new Decimal(250),
    status: 'pending',
    items: [],
    customer: CUSTOMER_WITH_EMAIL,
    ...overrides,
  };
}

/** A pending draft as stored in Redis. */
function makeDraft(overrides: Record<string, any> = {}) {
  return {
    customerId:          CUSTOMER_WITH_EMAIL.id,
    customerName:        CUSTOMER_WITH_EMAIL.name,
    customerEmail:       CUSTOMER_WITH_EMAIL.email,
    resolvedItems:       RESOLVED_ITEMS_NO_GST,
    inputItems:          [{ productName: 'chawal', quantity: 2 }, { productName: 'aata', quantity: 5 }],
    subtotal:            250,
    grandTotal:          250,
    withGst:             false,
    autoCreatedProducts: [],
    conversationId:      CONV,
    ...overrides,
  };
}

/** Stub noop: records calls for verification. */
function callSpy() {
  let called = false;
  let args: any[] = [];
  return {
    fn: (...a: any[]) => { called = true; args = a; return Promise.resolve(true); },
    get called() { return called; },
    get args() { return args; },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. TOTAL_PENDING_AMOUNT
// ═══════════════════════════════════════════════════════════════════════════════

test('TOTAL_PENDING_AMOUNT — returns total with ₹ symbol in message', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'getTotalPendingAmount', async () => 1850));
    const res = await businessEngine.execute(intent(IntentType.TOTAL_PENDING_AMOUNT), CONV);
    assert.equal(res.success, true);
    assert.equal(res.data.totalPending, 1850);
    assert.match(res.message, /₹1850/);
  } finally { restoreAll(r); }
});

test('TOTAL_PENDING_AMOUNT — returns ₹0 when no pending balances', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'getTotalPendingAmount', async () => 0));
    const res = await businessEngine.execute(intent(IntentType.TOTAL_PENDING_AMOUNT), CONV);
    assert.equal(res.success, true);
    assert.equal(res.data.totalPending, 0);
    assert.match(res.message, /₹0/);
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. LIST_CUSTOMER_BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

test('LIST_CUSTOMER_BALANCES — returns all customers with totals', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'getAllCustomersWithPendingBalance', async () => [
      { id: 'c1', name: 'Amit', balance: 500, landmark: 'Agra', phone: '9000000001' },
      { id: 'c2', name: 'Sunita', balance: 350, landmark: '', phone: null },
    ]));
    const res = await businessEngine.execute(intent(IntentType.LIST_CUSTOMER_BALANCES), CONV);
    assert.equal(res.success, true);
    assert.equal(res.data.customers.length, 2);
    assert.equal(res.data.totalPending, 850);
    assert.match(res.message, /₹850/);
  } finally { restoreAll(r); }
});

test('LIST_CUSTOMER_BALANCES — empty state returns zero-balance message', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'getAllCustomersWithPendingBalance', async () => []));
    const res = await businessEngine.execute(intent(IntentType.LIST_CUSTOMER_BALANCES), CONV);
    assert.equal(res.success, true);
    assert.equal(res.data.customers.length, 0);
    assert.match(res.message, /zero/i);
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CREATE_INVOICE — Draft flow
// ═══════════════════════════════════════════════════════════════════════════════

test('CREATE_INVOICE — returns draft with item breakdown, no DB commit', async () => {
  const r: RestoreFn[] = [];
  let confirmCalled = false;
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(invoiceService as any, 'previewInvoice', async () => PREVIEW_NO_GST));
    r.push(patchMethod(conversationMemory as any, 'setContext', async () => {}));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingInvoice', async () => {}));
    r.push(patchMethod(invoiceService as any, 'confirmInvoice', async () => { confirmCalled = true; return makeConfirmedInvoice(); }));

    const res = await businessEngine.execute(
      intent(IntentType.CREATE_INVOICE, {
        customer: 'Bharat',
        items: [{ product: 'chawal', quantity: 2 }, { product: 'aata', quantity: 5 }],
      }),
      CONV,
    );

    assert.equal(res.success, true);
    assert.equal(res.data.draft, true);
    assert.equal(res.data.awaitingConfirm, true);
    assert.equal(res.data.grandTotal, 250);
    assert.match(res.message, /draft/i);
    assert.match(res.message, /haan/i);
    assert.match(res.message, /₹250/);
    // DB must NOT have been committed during CREATE_INVOICE
    assert.equal(confirmCalled, false);
  } finally { restoreAll(r); }
});

test('CREATE_INVOICE — fails gracefully when no items provided', async () => {
  const res = await businessEngine.execute(
    intent(IntentType.CREATE_INVOICE, { customer: 'Bharat', items: [] }),
    CONV,
  );
  assert.equal(res.success, false);
  assert.equal(res.error, 'MISSING_ITEMS');
});

test('CREATE_INVOICE — fails when customer not found', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'getActiveCustomer', async () => null));
    r.push(patchMethod(conversationMemory as any, 'getActiveCustomer', async () => undefined));
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => []));

    const res = await businessEngine.execute(
      intent(IntentType.CREATE_INVOICE, {
        customer: 'Ghost User',
        items: [{ product: 'bread', quantity: 1 }],
      }),
      CONV,
    );
    assert.equal(res.success, false);
    assert.equal(res.error, 'CUSTOMER_NOT_FOUND');
  } finally { restoreAll(r); }
});

test('CREATE_INVOICE — returns MULTIPLE_CUSTOMERS when ambiguous name matches', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [
      { ...CUSTOMER_WITH_EMAIL, id: 'c1', landmark: 'Agra', matchScore: 0.7 },
      { ...CUSTOMER_WITH_EMAIL, id: 'c2', landmark: 'Delhi', matchScore: 0.65 },
    ]));

    const res = await businessEngine.execute(
      intent(IntentType.CREATE_INVOICE, {
        customer: 'Bharat',
        items: [{ product: 'tel', quantity: 1 }],
      }),
      CONV,
    );
    assert.equal(res.success, false);
    assert.equal(res.error, 'MULTIPLE_CUSTOMERS');
    assert.equal(res.data.customers.length, 2);
  } finally { restoreAll(r); }
});

test('CREATE_INVOICE — warns when product auto-created at ₹0', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(invoiceService as any, 'previewInvoice', async () => ({
      ...PREVIEW_NO_GST,
      autoCreatedProducts: ['kuch_nayi_cheez'],
    })));
    r.push(patchMethod(conversationMemory as any, 'setContext', async () => {}));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingInvoice', async () => {}));

    const res = await businessEngine.execute(
      intent(IntentType.CREATE_INVOICE, {
        customer: 'Bharat',
        items: [{ product: 'kuch_nayi_cheez', quantity: 1 }],
      }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.match(res.message, /naye products/i);
    assert.match(res.message, /kuch_nayi_cheez/);
  } finally { restoreAll(r); }
});

test('CREATE_INVOICE — with GST flag passes withGst=true to previewInvoice', async () => {
  const r: RestoreFn[] = [];
  let capturedWithGst: boolean | undefined;
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(invoiceService as any, 'previewInvoice', async (_cId: any, _items: any, withGst: boolean) => {
      capturedWithGst = withGst;
      return PREVIEW_WITH_GST;
    }));
    r.push(patchMethod(conversationMemory as any, 'setContext', async () => {}));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingInvoice', async () => {}));

    const res = await businessEngine.execute(
      intent(IntentType.CREATE_INVOICE, {
        customer: 'Bharat',
        items: [{ product: 'chawal', quantity: 2 }],
        withGst: true,
      }),
      CONV,
    );
    assert.equal(capturedWithGst, true);
    assert.match(res.message, /GST/i);
    assert.match(res.message, /₹262.5/);
  } finally { restoreAll(r); }
});

test('CREATE_INVOICE — resolves via active customer (pronoun reference)', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'getActiveCustomer', async () => CUSTOMER_WITH_EMAIL));
    r.push(patchMethod(invoiceService as any, 'previewInvoice', async () => PREVIEW_NO_GST));
    r.push(patchMethod(conversationMemory as any, 'setContext', async () => {}));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingInvoice', async () => {}));

    const res = await businessEngine.execute(
      intent(IntentType.CREATE_INVOICE, {
        customerRef: 'active',
        items: [{ product: 'namak', quantity: 1 }],
      }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.match(res.message, /Bharat Kumar/);
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CONFIRM_INVOICE
// ═══════════════════════════════════════════════════════════════════════════════

test('CONFIRM_INVOICE — commits invoice and sends email when customer has email', async () => {
  const r: RestoreFn[] = [];
  const emailSpy = callSpy();
  try {
    const draft = makeDraft();
    r.push(patchMethod(conversationMemory as any, 'getContext', async (_id: any, key: string) =>
      key === 'pendingInvoice' ? draft : null,
    ));
    r.push(patchMethod(conversationMemory as any, 'setContext', async () => {}));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingInvoice', async () => {}));
    r.push(patchMethod(invoiceService as any, 'confirmInvoice', async () => makeConfirmedInvoice()));
    r.push(patchMethod(emailService as any, 'sendInvoiceEmail', emailSpy.fn));

    const res = await businessEngine.execute(intent(IntentType.CONFIRM_INVOICE), CONV);

    // Let the fire-and-forget email settle
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.equal(res.success, true);
    assert.match(res.message, /✅/);
    assert.match(res.message, /INV/);
    assert.match(res.message, /₹250/);
    assert.match(res.message, /bharat@example.com/);
    assert.equal(emailSpy.called, true);
    // No awaitingEmail flag when email was sent
    assert.equal(res.data.awaitingEmail, undefined);
  } finally { restoreAll(r); }
});

test('CONFIRM_INVOICE — commits invoice and asks for email when customer has no email', async () => {
  const r: RestoreFn[] = [];
  try {
    const draft = makeDraft({ customerEmail: null, customerName: 'Rahul Singh', customerId: 'cust-002' });
    r.push(patchMethod(conversationMemory as any, 'getContext', async (_id: any, key: string) =>
      key === 'pendingInvoice' ? draft : null,
    ));
    r.push(patchMethod(conversationMemory as any, 'setContext', async () => {}));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingInvoice', async () => {}));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingEmail', async () => {}));
    r.push(patchMethod(invoiceService as any, 'confirmInvoice', async () =>
      makeConfirmedInvoice({ id: 'inv-002', total: new Decimal(250) }),
    ));

    const res = await businessEngine.execute(intent(IntentType.CONFIRM_INVOICE), CONV);
    assert.equal(res.success, true);
    assert.equal(res.data.awaitingEmail, true);
    assert.match(res.message, /email/i);
    assert.match(res.message, /Rahul Singh/);
  } finally { restoreAll(r); }
});

test('CONFIRM_INVOICE — falls back to shop-level draft when session draft missing', async () => {
  const r: RestoreFn[] = [];
  const emailSpy = callSpy();
  try {
    const shopDraft = makeDraft();
    r.push(patchMethod(conversationMemory as any, 'getContext', async () => null)); // session miss
    r.push(patchMethod(conversationMemory as any, 'getShopPendingInvoice', async () => shopDraft));
    r.push(patchMethod(conversationMemory as any, 'setContext', async () => {}));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingInvoice', async () => {}));
    r.push(patchMethod(invoiceService as any, 'confirmInvoice', async () => makeConfirmedInvoice()));
    r.push(patchMethod(emailService as any, 'sendInvoiceEmail', emailSpy.fn));

    const res = await businessEngine.execute(intent(IntentType.CONFIRM_INVOICE), 'new-session-after-reconnect');
    await new Promise((r2) => setTimeout(r2, 50));

    assert.equal(res.success, true);
    assert.equal(emailSpy.called, true);
  } finally { restoreAll(r); }
});

test('CONFIRM_INVOICE — returns error when no draft exists anywhere', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(conversationMemory as any, 'getContext', async () => null));
    r.push(patchMethod(conversationMemory as any, 'getShopPendingInvoice', async () => null));

    const res = await businessEngine.execute(intent(IntentType.CONFIRM_INVOICE), CONV);
    assert.equal(res.success, false);
    assert.equal(res.error, 'NO_PENDING_INVOICE');
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SHOW_PENDING_INVOICE
// ═══════════════════════════════════════════════════════════════════════════════

test('SHOW_PENDING_INVOICE — returns formatted draft without modification', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(conversationMemory as any, 'getContext', async (_id: any, key: string) =>
      key === 'pendingInvoice' ? makeDraft() : null,
    ));

    const res = await businessEngine.execute(intent(IntentType.SHOW_PENDING_INVOICE), CONV);
    assert.equal(res.success, true);
    assert.match(res.message, /Bharat Kumar/);
    assert.match(res.message, /chawal/);
    assert.match(res.message, /₹250/);
    assert.match(res.message, /haan/i);
  } finally { restoreAll(r); }
});

test('SHOW_PENDING_INVOICE — falls back to shop-level when session empty', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(conversationMemory as any, 'getContext', async () => null));
    r.push(patchMethod(conversationMemory as any, 'getShopPendingInvoice', async () => makeDraft()));

    const res = await businessEngine.execute(intent(IntentType.SHOW_PENDING_INVOICE), CONV);
    assert.equal(res.success, true);
    assert.match(res.message, /Bharat Kumar/);
  } finally { restoreAll(r); }
});

test('SHOW_PENDING_INVOICE — returns error when no draft anywhere', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(conversationMemory as any, 'getContext', async () => null));
    r.push(patchMethod(conversationMemory as any, 'getShopPendingInvoice', async () => null));

    const res = await businessEngine.execute(intent(IntentType.SHOW_PENDING_INVOICE), CONV);
    assert.equal(res.success, false);
    assert.equal(res.error, 'NO_PENDING_INVOICE');
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. TOGGLE_GST
// ═══════════════════════════════════════════════════════════════════════════════

test('TOGGLE_GST — flips GST off→on and updates draft with recalculated prices', async () => {
  const r: RestoreFn[] = [];
  try {
    const draft = makeDraft({ withGst: false });
    r.push(patchMethod(conversationMemory as any, 'getContext', async (_id: any, key: string) =>
      key === 'pendingInvoice' ? draft : null,
    ));
    r.push(patchMethod(invoiceService as any, 'previewInvoice', async () => PREVIEW_WITH_GST));
    r.push(patchMethod(conversationMemory as any, 'setContext', async () => {}));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingInvoice', async () => {}));

    const res = await businessEngine.execute(intent(IntentType.TOGGLE_GST), CONV);
    assert.equal(res.success, true);
    assert.equal(res.data.withGst, true);
    assert.match(res.message, /GST add kar diya/i);
    assert.match(res.message, /₹262.5/);
  } finally { restoreAll(r); }
});

test('TOGGLE_GST — flips GST on→off and shows cheaper total', async () => {
  const r: RestoreFn[] = [];
  try {
    const draft = makeDraft({ withGst: true });
    r.push(patchMethod(conversationMemory as any, 'getContext', async (_id: any, key: string) =>
      key === 'pendingInvoice' ? draft : null,
    ));
    r.push(patchMethod(invoiceService as any, 'previewInvoice', async () => PREVIEW_NO_GST));
    r.push(patchMethod(conversationMemory as any, 'setContext', async () => {}));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingInvoice', async () => {}));

    const res = await businessEngine.execute(intent(IntentType.TOGGLE_GST), CONV);
    assert.equal(res.success, true);
    assert.equal(res.data.withGst, false);
    assert.match(res.message, /hata diya/i);
    assert.match(res.message, /₹250/);
  } finally { restoreAll(r); }
});

test('TOGGLE_GST — returns error when no pending draft', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(conversationMemory as any, 'getContext', async () => null));
    r.push(patchMethod(conversationMemory as any, 'getShopPendingInvoice', async () => null));

    const res = await businessEngine.execute(intent(IntentType.TOGGLE_GST), CONV);
    assert.equal(res.success, false);
    assert.equal(res.error, 'NO_PENDING_INVOICE');
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. PROVIDE_EMAIL / SEND_INVOICE — post-confirm email delivery
// ═══════════════════════════════════════════════════════════════════════════════

test('PROVIDE_EMAIL — sends queued invoice email and saves email to customer', async () => {
  const r: RestoreFn[] = [];
  const emailSpy = callSpy();
  try {
    const pending = {
      customerId: 'cust-002', customerName: 'Rahul Singh', invoiceId: 'inv-002',
      items: [{ product: 'bread', quantity: 1, price: 20, total: 20 }], total: 20,
    };
    r.push(patchMethod(conversationMemory as any, 'getContext', async (_id: any, key: string) =>
      key === 'pendingInvoiceEmail' ? pending : null,
    ));
    r.push(patchMethod(conversationMemory as any, 'getShopPendingEmail', async () => null));
    r.push(patchMethod(customerService as any, 'updateCustomer', async () => true));
    r.push(patchMethod(emailService as any, 'sendInvoiceEmail', emailSpy.fn));
    r.push(patchMethod(conversationMemory as any, 'setContext', async () => {}));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingEmail', async () => {}));

    const res = await businessEngine.execute(
      intent(IntentType.PROVIDE_EMAIL, { email: 'rahul@example.com' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.equal(emailSpy.called, true);
    assert.equal(emailSpy.args[0], 'rahul@example.com');
    assert.match(res.message, /rahul@example.com/);
    assert.match(res.message, /Rahul Singh/);
  } finally { restoreAll(r); }
});

test('PROVIDE_EMAIL — falls back to shop-level pending email after reconnect', async () => {
  const r: RestoreFn[] = [];
  const emailSpy = callSpy();
  try {
    const pending = {
      customerId: 'cust-002', customerName: 'Rahul Singh', invoiceId: 'inv-002',
      items: [], total: 150,
    };
    r.push(patchMethod(conversationMemory as any, 'getContext', async () => null)); // session miss
    r.push(patchMethod(conversationMemory as any, 'getShopPendingEmail', async () => pending));
    r.push(patchMethod(customerService as any, 'updateCustomer', async () => true));
    r.push(patchMethod(emailService as any, 'sendInvoiceEmail', emailSpy.fn));
    r.push(patchMethod(conversationMemory as any, 'setContext', async () => {}));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingEmail', async () => {}));

    const res = await businessEngine.execute(
      intent(IntentType.PROVIDE_EMAIL, { email: 'rahul@shop.in' }),
      'new-session-after-reconnect',
    );
    assert.equal(res.success, true);
    assert.equal(emailSpy.called, true);
  } finally { restoreAll(r); }
});

test('PROVIDE_EMAIL — saves email on active customer when no pending invoice', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(conversationMemory as any, 'getContext', async () => null));
    r.push(patchMethod(conversationMemory as any, 'getShopPendingEmail', async () => null));
    r.push(patchMethod(conversationMemory as any, 'getActiveCustomer', async () => ({
      id: 'cust-001', name: 'Bharat Kumar',
    })));
    r.push(patchMethod(customerService as any, 'updateCustomer', async () => true));

    const res = await businessEngine.execute(
      intent(IntentType.PROVIDE_EMAIL, { email: 'bharat@shop.in' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.match(res.message, /bharat@shop.in/);
  } finally { restoreAll(r); }
});

test('PROVIDE_EMAIL — rejects malformed email address', async () => {
  const res = await businessEngine.execute(
    intent(IntentType.PROVIDE_EMAIL, { email: 'not-an-email' }),
    CONV,
  );
  assert.equal(res.success, false);
  assert.equal(res.error, 'INVALID_EMAIL');
});

test('PROVIDE_EMAIL — rejects empty email', async () => {
  const res = await businessEngine.execute(
    intent(IntentType.PROVIDE_EMAIL, { email: '' }),
    CONV,
  );
  assert.equal(res.success, false);
  assert.equal(res.error, 'INVALID_EMAIL');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. CREATE_REMINDER
// ═══════════════════════════════════════════════════════════════════════════════

test('CREATE_REMINDER — schedules reminder for resolved customer with phone', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(reminderService as any, 'scheduleReminder', async (_id: any, amount: any) => ({
      id: 'rem-001',
      scheduledTime: new Date(Date.now() + 86400000).toISOString(),
    })));

    const res = await businessEngine.execute(
      intent(IntentType.CREATE_REMINDER, { customer: 'Bharat', amount: 500, datetime: 'tomorrow 7pm' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.match(res.message, /500/);
    assert.match(res.message, /Bharat/i);
  } finally { restoreAll(r); }
});

test('CREATE_REMINDER — fails when amount missing', async () => {
  const res = await businessEngine.execute(
    intent(IntentType.CREATE_REMINDER, { customer: 'Bharat' }),
    CONV,
  );
  assert.equal(res.success, false);
  assert.equal(res.error, 'MISSING_AMOUNT');
});

test('CREATE_REMINDER — fails when customer has no phone', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [
      { ...CUSTOMER_WITH_EMAIL, phone: null },
    ]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));

    const res = await businessEngine.execute(
      intent(IntentType.CREATE_REMINDER, { customer: 'Bharat', amount: 300 }),
      CONV,
    );
    assert.equal(res.success, false);
    assert.equal(res.error, 'NO_PHONE');
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. RECORD_PAYMENT
// ═══════════════════════════════════════════════════════════════════════════════

test('RECORD_PAYMENT — records payment and returns updated balance', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(ledgerService as any, 'recordPayment', async () => {}));
    r.push(patchMethod(customerService as any, 'invalidateBalanceCache', () => {}));
    r.push(patchMethod(customerService as any, 'getBalanceFast', async () => 200));

    const res = await businessEngine.execute(
      intent(IntentType.RECORD_PAYMENT, { customer: 'Bharat', amount: 300, mode: 'cash' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.equal(res.data.amountPaid, 300);
    assert.equal(res.data.remainingBalance, 200);
    assert.match(res.message, /300/);
    assert.match(res.message, /200/);
  } finally { restoreAll(r); }
});

test('RECORD_PAYMENT — fails when amount is zero', async () => {
  const res = await businessEngine.execute(
    intent(IntentType.RECORD_PAYMENT, { customer: 'Bharat', amount: 0 }),
    CONV,
  );
  assert.equal(res.success, false);
  assert.equal(res.error, 'MISSING_AMOUNT');
});

test('RECORD_PAYMENT — works via active customer pronoun', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'getActiveCustomer', async () => CUSTOMER_WITH_EMAIL));
    r.push(patchMethod(ledgerService as any, 'recordPayment', async () => {}));
    r.push(patchMethod(customerService as any, 'invalidateBalanceCache', () => {}));
    r.push(patchMethod(customerService as any, 'getBalanceFast', async () => 100));

    const res = await businessEngine.execute(
      intent(IntentType.RECORD_PAYMENT, { customerRef: 'active', amount: 400 }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.match(res.message, /Bharat Kumar/);
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. ADD_CREDIT
// ═══════════════════════════════════════════════════════════════════════════════

test('ADD_CREDIT — adds credit and returns new total balance', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_NO_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(ledgerService as any, 'addCredit', async () => {}));
    r.push(patchMethod(customerService as any, 'invalidateBalanceCache', () => {}));
    r.push(patchMethod(customerService as any, 'getBalanceFast', async () => 700));

    const res = await businessEngine.execute(
      intent(IntentType.ADD_CREDIT, { customer: 'Rahul', amount: 500 }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.equal(res.data.amountAdded, 500);
    assert.equal(res.data.totalBalance, 700);
    assert.match(res.message, /₹700/);
  } finally { restoreAll(r); }
});

test('ADD_CREDIT — fails when amount not provided', async () => {
  const res = await businessEngine.execute(
    intent(IntentType.ADD_CREDIT, { customer: 'Rahul' }),
    CONV,
  );
  assert.equal(res.success, false);
  assert.equal(res.error, 'MISSING_AMOUNT');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. CHECK_BALANCE
// ═══════════════════════════════════════════════════════════════════════════════

test('CHECK_BALANCE — returns balance for named customer', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(customerService as any, 'getBalanceFast', async () => 500));

    const res = await businessEngine.execute(
      intent(IntentType.CHECK_BALANCE, { customer: 'Bharat' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.equal(res.data.balance, 500);
    assert.match(res.message, /₹500/);
  } finally { restoreAll(r); }
});

test('CHECK_BALANCE — returns CUSTOMER_NOT_FOUND when search empty', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'getActiveCustomer', async () => null));
    r.push(patchMethod(conversationMemory as any, 'getActiveCustomer', async () => undefined));
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => []));

    const res = await businessEngine.execute(
      intent(IntentType.CHECK_BALANCE, { customer: 'Nobody' }),
      CONV,
    );
    assert.equal(res.success, false);
    assert.equal(res.error, 'CUSTOMER_NOT_FOUND');
  } finally { restoreAll(r); }
});

test('CHECK_BALANCE — resolves active customer via pronoun reference', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'getActiveCustomer', async () => CUSTOMER_WITH_EMAIL));
    r.push(patchMethod(customerService as any, 'getBalanceFast', async () => 750));

    const res = await businessEngine.execute(
      intent(IntentType.CHECK_BALANCE, { customerRef: 'active' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.equal(res.data.balance, 750);
    assert.match(res.message, /Bharat Kumar/);
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. CHECK_STOCK
// ═══════════════════════════════════════════════════════════════════════════════

test('CHECK_STOCK — returns stock quantity for named product', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(productService as any, 'getStock', async () => 42));

    const res = await businessEngine.execute(
      intent(IntentType.CHECK_STOCK, { product: 'chawal' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.equal(res.data.stock, 42);
    assert.match(res.message, /42/);
  } finally { restoreAll(r); }
});

test('CHECK_STOCK — fails when no product name given', async () => {
  const res = await businessEngine.execute(intent(IntentType.CHECK_STOCK, {}), CONV);
  assert.equal(res.success, false);
  assert.equal(res.error, 'MISSING_PRODUCT');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 13. CANCEL_INVOICE
// ═══════════════════════════════════════════════════════════════════════════════

test('CANCEL_INVOICE — cancels last invoice for customer', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(invoiceService as any, 'getLastInvoice', async () => ({ id: 'inv-999' })));
    r.push(patchMethod(invoiceService as any, 'cancelInvoice', async () => ({})));

    const res = await businessEngine.execute(
      intent(IntentType.CANCEL_INVOICE, { customer: 'Bharat' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.equal(res.data.invoiceId, 'inv-999');
    assert.match(res.message, /cancelled/i);
  } finally { restoreAll(r); }
});

test('CANCEL_INVOICE — fails when customer has no invoices', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(invoiceService as any, 'getLastInvoice', async () => null));

    const res = await businessEngine.execute(
      intent(IntentType.CANCEL_INVOICE, { customer: 'Bharat' }),
      CONV,
    );
    assert.equal(res.success, false);
    assert.equal(res.error, 'NO_INVOICE');
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 14. CANCEL_REMINDER
// ═══════════════════════════════════════════════════════════════════════════════

test('CANCEL_REMINDER — cancels first pending reminder', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(reminderService as any, 'getPendingReminders', async () => [
      { id: 'rem-001', scheduledTime: new Date() },
    ]));
    r.push(patchMethod(reminderService as any, 'cancelReminder', async () => {}));

    const res = await businessEngine.execute(
      intent(IntentType.CANCEL_REMINDER, { customer: 'Bharat' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.equal(res.data.reminderId, 'rem-001');
  } finally { restoreAll(r); }
});

test('CANCEL_REMINDER — fails when no pending reminders exist', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(reminderService as any, 'getPendingReminders', async () => []));

    const res = await businessEngine.execute(
      intent(IntentType.CANCEL_REMINDER, { customer: 'Bharat' }),
      CONV,
    );
    assert.equal(res.success, false);
    assert.equal(res.error, 'NO_REMINDER');
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 15. LIST_REMINDERS
// ═══════════════════════════════════════════════════════════════════════════════

test('LIST_REMINDERS — returns pending reminders across all customers', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(reminderService as any, 'getPendingReminders', async () => [
      { id: 'r1', scheduledTime: new Date(), notes: '500', customer: { name: 'Amit' } },
      { id: 'r2', scheduledTime: new Date(), notes: '300', customer: { name: 'Sunita' } },
    ]));

    const res = await businessEngine.execute(intent(IntentType.LIST_REMINDERS), CONV);
    assert.equal(res.success, true);
    assert.equal(res.data.count, 2);
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 16. CREATE_CUSTOMER
// ═══════════════════════════════════════════════════════════════════════════════

test('CREATE_CUSTOMER — creates customer and sets as active', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'createCustomerFast', async () => ({
      success: true,
      message: 'Bharat Kumar added!',
      customer: { id: 'cust-new', name: 'Bharat Kumar', balance: 0 },
    })));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));

    const res = await businessEngine.execute(
      intent(IntentType.CREATE_CUSTOMER, { name: 'Bharat Kumar' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.equal(res.data.customerId, 'cust-new');
    assert.equal(res.data.name, 'Bharat Kumar');
  } finally { restoreAll(r); }
});

test('CREATE_CUSTOMER — initial amount recorded on new customer', async () => {
  const r: RestoreFn[] = [];
  let balanceUpdatedWith = 0;
  try {
    r.push(patchMethod(customerService as any, 'createCustomerFast', async () => ({
      success: true, message: 'Done',
      customer: { id: 'cust-new', name: 'Suresh', balance: 0 },
    })));
    r.push(patchMethod(customerService as any, 'updateBalance', async (_id: any, amt: number) => {
      balanceUpdatedWith = amt;
    }));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));

    await businessEngine.execute(
      intent(IntentType.CREATE_CUSTOMER, { name: 'Suresh', amount: 750 }),
      CONV,
    );
    assert.equal(balanceUpdatedWith, 750);
  } finally { restoreAll(r); }
});

test('CREATE_CUSTOMER — fails when duplicate detected', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'createCustomerFast', async () => ({
      success: false,
      message: 'Bharat already exists',
      duplicateFound: true,
      suggestions: [{ id: 'existing-1', name: 'Bharat' }],
    })));

    const res = await businessEngine.execute(
      intent(IntentType.CREATE_CUSTOMER, { name: 'Bharat' }),
      CONV,
    );
    assert.equal(res.success, false);
    assert.equal(res.error, 'DUPLICATE_FOUND');
  } finally { restoreAll(r); }
});

test('CREATE_CUSTOMER — fails when name missing', async () => {
  const res = await businessEngine.execute(intent(IntentType.CREATE_CUSTOMER, {}), CONV);
  assert.equal(res.success, false);
  assert.equal(res.error, 'MISSING_NAME');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 17. MODIFY_REMINDER
// ═══════════════════════════════════════════════════════════════════════════════

test('MODIFY_REMINDER — updates reminder time for customer', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(reminderService as any, 'getPendingReminders', async () => [
      { id: 'rem-002', scheduledTime: new Date() },
    ]));
    r.push(patchMethod(reminderService as any, 'modifyReminderTime', async () => {}));

    const res = await businessEngine.execute(
      intent(IntentType.MODIFY_REMINDER, { customer: 'Bharat', datetime: 'tomorrow 9am' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.equal(res.data.reminderId, 'rem-002');
    assert.equal(res.data.newTime, 'tomorrow 9am');
  } finally { restoreAll(r); }
});

test('MODIFY_REMINDER — fails when no datetime provided', async () => {
  const res = await businessEngine.execute(
    intent(IntentType.MODIFY_REMINDER, { customer: 'Bharat' }),
    CONV,
  );
  assert.equal(res.success, false);
  assert.equal(res.error, 'MISSING_DATETIME');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 18. DAILY_SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

test('DAILY_SUMMARY — returns formatted summary with sales and payments', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(invoiceService as any, 'getDailySummary', async () => ({
      date: new Date(),
      invoiceCount: 5,
      totalSales: 2500,
      totalPayments: 1800,
      cashPayments: 1200,
      upiPayments: 600,
      pendingAmount: 700,
      extraPayments: 0,
    })));
    r.push(patchMethod(emailService as any, 'isEnabled', () => false));

    const res = await businessEngine.execute(intent(IntentType.DAILY_SUMMARY), CONV);
    assert.equal(res.success, true);
    assert.match(res.message, /₹2500/);
    assert.match(res.message, /5 invoices/);
    assert.match(res.message, /₹700/);
  } finally { restoreAll(r); }
});

test('DAILY_SUMMARY — shows all-clear message when no pending', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(invoiceService as any, 'getDailySummary', async () => ({
      date: new Date(), invoiceCount: 3, totalSales: 900, totalPayments: 900,
      cashPayments: 900, upiPayments: 0, pendingAmount: 0, extraPayments: 0,
    })));
    r.push(patchMethod(emailService as any, 'isEnabled', () => false));

    const res = await businessEngine.execute(intent(IntentType.DAILY_SUMMARY), CONV);
    assert.equal(res.success, true);
    assert.match(res.message, /clear/i);
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 19. UPDATE_CUSTOMER
// ═══════════════════════════════════════════════════════════════════════════════

test('UPDATE_CUSTOMER — updates phone number', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(customerService as any, 'updateCustomer', async () => true));
    r.push(patchMethod(customerService as any, 'invalidateConversationCache', () => {}));

    const res = await businessEngine.execute(
      intent(IntentType.UPDATE_CUSTOMER, { customer: 'Bharat', phone: '9000000001' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.match(res.message, /Bharat Kumar/);
    assert.match(res.message, /Phone/);
  } finally { restoreAll(r); }
});

test('UPDATE_CUSTOMER — updates email address', async () => {
  const r: RestoreFn[] = [];
  let savedFields: Record<string, any> = {};
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(customerService as any, 'updateCustomer', async (_id: string, updates: any) => {
      savedFields = updates; return true;
    }));
    r.push(patchMethod(customerService as any, 'invalidateConversationCache', () => {}));

    const res = await businessEngine.execute(
      intent(IntentType.UPDATE_CUSTOMER, { customer: 'Bharat', email: 'new@shop.in' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.equal(savedFields.email, 'new@shop.in');
  } finally { restoreAll(r); }
});

test('UPDATE_CUSTOMER — updates GSTIN field', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(customerService as any, 'updateCustomer', async () => true));
    r.push(patchMethod(customerService as any, 'invalidateConversationCache', () => {}));

    const res = await businessEngine.execute(
      intent(IntentType.UPDATE_CUSTOMER, { customer: 'Bharat', gstin: '07AABCU9603R1ZP' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.match(res.message, /GSTIN/);
  } finally { restoreAll(r); }
});

test('UPDATE_CUSTOMER — fails when no fields provided', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));

    const res = await businessEngine.execute(
      intent(IntentType.UPDATE_CUSTOMER, { customer: 'Bharat' }),
      CONV,
    );
    assert.equal(res.success, false);
    assert.equal(res.error, 'NO_FIELDS_PROVIDED');
  } finally { restoreAll(r); }
});

test('UPDATE_CUSTOMER_PHONE — also routes to updateCustomer handler', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(customerService as any, 'updateCustomer', async () => true));
    r.push(patchMethod(customerService as any, 'invalidateConversationCache', () => {}));

    const res = await businessEngine.execute(
      intent(IntentType.UPDATE_CUSTOMER_PHONE, { customer: 'Bharat', phone: '8888888888' }),
      CONV,
    );
    assert.equal(res.success, true);
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 20. GET_CUSTOMER_INFO
// ═══════════════════════════════════════════════════════════════════════════════

test('GET_CUSTOMER_INFO — returns full customer info with balance', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(customerService as any, 'getBalanceFast', async () => 500));

    const res = await businessEngine.execute(
      intent(IntentType.GET_CUSTOMER_INFO, { customer: 'Bharat' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.match(res.message, /Bharat Kumar/);
    assert.match(res.message, /500/);
    assert.equal(res.data.customerId, 'cust-001');
  } finally { restoreAll(r); }
});

test('GET_CUSTOMER_INFO — phone number converted to spoken words', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [
      { ...CUSTOMER_WITH_EMAIL, phone: '9876543210' },
    ]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(customerService as any, 'getBalanceFast', async () => 100));

    const res = await businessEngine.execute(
      intent(IntentType.GET_CUSTOMER_INFO, { customer: 'Bharat' }),
      CONV,
    );
    assert.equal(res.success, true);
    // Phone should appear as space-separated digit words (not raw digits)
    assert.doesNotMatch(res.message, /9876543210/);
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 21. DELETE_CUSTOMER_DATA
// ═══════════════════════════════════════════════════════════════════════════════

test('DELETE_CUSTOMER_DATA — rejects non-admin without operatorRole=admin', async () => {
  const res = await businessEngine.execute(
    intent(IntentType.DELETE_CUSTOMER_DATA, { customer: 'Bharat' }),
    CONV,
  );
  assert.equal(res.success, false);
  assert.equal(res.error, 'UNAUTHORIZED');
});

test('DELETE_CUSTOMER_DATA — sends OTP email for admin before deleting', async () => {
  const r: RestoreFn[] = [];
  const emailSpy = callSpy();
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(emailService as any, 'sendAdminDeletionOtpEmail', emailSpy.fn));

    const res = await businessEngine.execute(
      intent(IntentType.DELETE_CUSTOMER_DATA, {
        customer: 'Bharat',
        operatorRole: 'admin',
        adminEmail: 'admin@shop.in',
      }),
      CONV,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(res.error, 'OTP_SENT');
    assert.equal(emailSpy.called, true);
  } finally { restoreAll(r); }
});

test('DELETE_CUSTOMER_DATA — deletes after valid 6-digit OTP confirmation', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(customerService as any, 'deleteCustomerAndAllData', async () => ({
      success: true,
      deletedRecords: { invoices: 3, payments: 2, reminders: 1, messageLogs: 0, invoiceItems: 10, customer: 1 },
    })));

    const res = await businessEngine.execute(
      intent(IntentType.DELETE_CUSTOMER_DATA, {
        customer: 'Bharat',
        operatorRole: 'admin',
        adminEmail: 'admin@shop.in',
        confirmation: '123456',
      }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.match(res.message, /permanently/i);
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 22. SWITCH_LANGUAGE
// ═══════════════════════════════════════════════════════════════════════════════

test('SWITCH_LANGUAGE — returns language code in data', async () => {
  const res = await businessEngine.execute(
    intent(IntentType.SWITCH_LANGUAGE, { language: 'ta' }),
    CONV,
  );
  assert.equal(res.success, true);
  assert.equal(res.data.language, 'ta');
});

test('SWITCH_LANGUAGE — defaults to hi when language entity missing', async () => {
  const res = await businessEngine.execute(intent(IntentType.SWITCH_LANGUAGE), CONV);
  assert.equal(res.success, true);
  assert.equal(res.data.language, 'hi');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 23. START_RECORDING / STOP_RECORDING
// ═══════════════════════════════════════════════════════════════════════════════

test('START_RECORDING — returns recording=true', async () => {
  const res = await businessEngine.execute(intent(IntentType.START_RECORDING), CONV);
  assert.equal(res.success, true);
  assert.equal(res.data.recording, true);
});

test('STOP_RECORDING — returns recording=false', async () => {
  const res = await businessEngine.execute(intent(IntentType.STOP_RECORDING), CONV);
  assert.equal(res.success, true);
  assert.equal(res.data.recording, false);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 24. UNKNOWN intent
// ═══════════════════════════════════════════════════════════════════════════════

test('UNKNOWN intent — returns failure without throwing', async () => {
  const res = await businessEngine.execute(intent(IntentType.UNKNOWN), CONV);
  assert.equal(res.success, false);
  assert.equal(res.error, 'UNKNOWN_INTENT');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 25. MULTI-TURN SCENARIO: Full draft → confirm → email delivered
// ═══════════════════════════════════════════════════════════════════════════════

test('Multi-turn: CREATE_INVOICE draft → CONFIRM_INVOICE sends email automatically', async () => {
  const r: RestoreFn[] = [];
  const emailSpy = callSpy();
  let storedDraft: any = null;

  try {
    // ── Turn 1: CREATE_INVOICE ────────────────────────────────────────────────
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(invoiceService as any, 'previewInvoice', async () => PREVIEW_NO_GST));
    r.push(patchMethod(conversationMemory as any, 'setContext', async (_id: any, key: string, val: any) => {
      if (key === 'pendingInvoice') storedDraft = val;
    }));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingInvoice', async () => {}));

    const t1 = await businessEngine.execute(
      intent(IntentType.CREATE_INVOICE, {
        customer: 'Bharat', items: [{ product: 'chawal', quantity: 2 }, { product: 'aata', quantity: 5 }],
      }),
      CONV,
    );
    assert.equal(t1.success, true);
    assert.ok(storedDraft, 'Draft must be stored in Redis after CREATE_INVOICE');

    // ── Turn 2: CONFIRM_INVOICE ───────────────────────────────────────────────
    r.push(patchMethod(conversationMemory as any, 'getContext', async (_id: any, key: string) =>
      key === 'pendingInvoice' ? storedDraft : null,
    ));
    r.push(patchMethod(conversationMemory as any, 'getShopPendingInvoice', async () => null));
    r.push(patchMethod(invoiceService as any, 'confirmInvoice', async () => makeConfirmedInvoice()));
    r.push(patchMethod(emailService as any, 'sendInvoiceEmail', emailSpy.fn));

    const t2 = await businessEngine.execute(intent(IntentType.CONFIRM_INVOICE), CONV);
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.equal(t2.success, true);
    assert.match(t2.message, /✅/);
    assert.equal(emailSpy.called, true, 'Email should be sent since customer has email');
  } finally { restoreAll(r); }
});

test('Multi-turn: CREATE_INVOICE → TOGGLE_GST → CONFIRM_INVOICE uses updated totals', async () => {
  const r: RestoreFn[] = [];
  let currentDraft: any = null;

  try {
    // ── Turn 1: CREATE_INVOICE (no GST) ──────────────────────────────────────
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(invoiceService as any, 'previewInvoice', async (_cId: any, _items: any, withGst: boolean) =>
      withGst ? PREVIEW_WITH_GST : PREVIEW_NO_GST,
    ));
    r.push(patchMethod(conversationMemory as any, 'setContext', async (_id: any, key: string, val: any) => {
      if (key === 'pendingInvoice') currentDraft = val;
    }));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingInvoice', async () => {}));

    await businessEngine.execute(
      intent(IntentType.CREATE_INVOICE, {
        customer: 'Bharat', items: [{ product: 'chawal', quantity: 2 }, { product: 'aata', quantity: 5 }],
      }),
      CONV,
    );
    assert.equal(currentDraft?.withGst, false);

    // ── Turn 2: TOGGLE_GST ────────────────────────────────────────────────────
    r.push(patchMethod(conversationMemory as any, 'getContext', async (_id: any, key: string) =>
      key === 'pendingInvoice' ? currentDraft : null,
    ));

    const t2 = await businessEngine.execute(intent(IntentType.TOGGLE_GST), CONV);
    assert.equal(t2.success, true);
    assert.equal(currentDraft?.withGst, true);
    assert.match(t2.message, /₹262.5/);

    // ── Turn 3: CONFIRM_INVOICE uses GST-inclusive total ─────────────────────
    let confirmedWithItems: any;
    r.push(patchMethod(invoiceService as any, 'confirmInvoice', async (_cId: any, items: any) => {
      confirmedWithItems = items;
      return makeConfirmedInvoice({ total: new Decimal(262.5) });
    }));
    r.push(patchMethod(emailService as any, 'sendInvoiceEmail', async () => true));

    const t3 = await businessEngine.execute(intent(IntentType.CONFIRM_INVOICE), CONV);
    assert.equal(t3.success, true);
    // Confirmed items should reflect GST-inclusive totals
    assert.ok(confirmedWithItems.some((i: any) => i.cgst > 0), 'Confirmed items must have GST applied');
  } finally { restoreAll(r); }
});

test('Multi-turn: CREATE_INVOICE → CANCEL_INVOICE clears draft (user says nahi)', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(invoiceService as any, 'previewInvoice', async () => PREVIEW_NO_GST));
    r.push(patchMethod(conversationMemory as any, 'setContext', async () => {}));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingInvoice', async () => {}));

    const t1 = await businessEngine.execute(
      intent(IntentType.CREATE_INVOICE, {
        customer: 'Bharat', items: [{ product: 'tel', quantity: 1 }],
      }),
      CONV,
    );
    assert.equal(t1.data.awaitingConfirm, true);

    // User says "nahi" — system routes to CANCEL_INVOICE for last created invoice
    // (In the draft flow, cancelInvoice is used for confirmed invoices. For a draft
    //  that hasn't been confirmed, CANCEL_INVOICE should gracefully say no invoice.)
    r.push(patchMethod(customerService as any, 'getActiveCustomer', async () => CUSTOMER_WITH_EMAIL));
    r.push(patchMethod(invoiceService as any, 'getLastInvoice', async () => null));

    const t2 = await businessEngine.execute(
      intent(IntentType.CANCEL_INVOICE, { customerRef: 'active' }),
      CONV,
    );
    // No confirmed invoice exists, so "no invoice" error is expected
    assert.equal(t2.success, false);
    assert.equal(t2.error, 'NO_INVOICE');
  } finally { restoreAll(r); }
});

test('Multi-turn: CREATE_INVOICE (no email) → CONFIRM → PROVIDE_EMAIL sends invoice', async () => {
  const r: RestoreFn[] = [];
  const emailSpy = callSpy();
  let pendingEmailState: any = null;

  try {
    // ── Turn 1: CREATE_INVOICE for customer without email ─────────────────────
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_NO_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(invoiceService as any, 'previewInvoice', async () => PREVIEW_NO_GST));
    let savedDraft: any = null;
    r.push(patchMethod(conversationMemory as any, 'setContext', async (_id: any, key: string, val: any) => {
      if (key === 'pendingInvoice') savedDraft = val;
    }));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingInvoice', async () => {}));

    const t1 = await businessEngine.execute(
      intent(IntentType.CREATE_INVOICE, {
        customer: 'Rahul', items: [{ product: 'bread', quantity: 2 }],
      }),
      CONV,
    );
    assert.equal(t1.success, true);
    assert.equal(savedDraft?.customerEmail, null);

    // ── Turn 2: CONFIRM_INVOICE ───────────────────────────────────────────────
    r.push(patchMethod(conversationMemory as any, 'getContext', async (_id: any, key: string) =>
      key === 'pendingInvoice' ? savedDraft : null,
    ));
    r.push(patchMethod(conversationMemory as any, 'getShopPendingInvoice', async () => null));
    r.push(patchMethod(invoiceService as any, 'confirmInvoice', async () =>
      makeConfirmedInvoice({ id: 'inv-rahul', customerId: 'cust-002' }),
    ));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingEmail', async (_val: any) => {
      pendingEmailState = _val;
    }));

    const t2 = await businessEngine.execute(intent(IntentType.CONFIRM_INVOICE), CONV);
    assert.equal(t2.success, true);
    assert.equal(t2.data.awaitingEmail, true);
    assert.ok(pendingEmailState, 'Pending email must be stored after confirm without email');

    // ── Turn 3: PROVIDE_EMAIL delivers the invoice ────────────────────────────
    r.push(patchMethod(conversationMemory as any, 'getContext', async (_id: any, key: string) =>
      key === 'pendingInvoiceEmail' ? pendingEmailState : null,
    ));
    r.push(patchMethod(conversationMemory as any, 'getShopPendingEmail', async () => null));
    r.push(patchMethod(customerService as any, 'updateCustomer', async () => true));
    r.push(patchMethod(emailService as any, 'sendInvoiceEmail', emailSpy.fn));
    r.push(patchMethod(conversationMemory as any, 'setShopPendingEmail', async () => {}));

    const t3 = await businessEngine.execute(
      intent(IntentType.PROVIDE_EMAIL, { email: 'rahul@gmail.com' }),
      CONV,
    );
    assert.equal(t3.success, true);
    assert.equal(emailSpy.called, true);
    assert.equal(emailSpy.args[0], 'rahul@gmail.com');
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 26. Error propagation — services throwing must not crash engine
// ═══════════════════════════════════════════════════════════════════════════════

test('Error propagation — previewInvoice throwing returns graceful failure', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(invoiceService as any, 'previewInvoice', async () => {
      throw new Error('Product DB unavailable');
    }));

    const res = await businessEngine.execute(
      intent(IntentType.CREATE_INVOICE, {
        customer: 'Bharat', items: [{ product: 'chawal', quantity: 1 }],
      }),
      CONV,
    );
    assert.equal(res.success, false);
    assert.ok(res.error, 'Error must be surfaced in result');
  } finally { restoreAll(r); }
});

test('Error propagation — confirmInvoice throwing returns graceful failure', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(conversationMemory as any, 'getContext', async (_id: any, key: string) =>
      key === 'pendingInvoice' ? makeDraft() : null,
    ));
    r.push(patchMethod(conversationMemory as any, 'getShopPendingInvoice', async () => null));
    r.push(patchMethod(invoiceService as any, 'confirmInvoice', async () => {
      throw new Error('DB transaction failed');
    }));

    const res = await businessEngine.execute(intent(IntentType.CONFIRM_INVOICE), CONV);
    assert.equal(res.success, false);
    assert.match(res.error ?? '', /DB transaction failed/i);
  } finally { restoreAll(r); }
});

test('Error propagation — recordPayment throwing returns graceful failure', async () => {
  const r: RestoreFn[] = [];
  try {
    r.push(patchMethod(customerService as any, 'searchCustomerRanked', async () => [CUSTOMER_WITH_EMAIL]));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(conversationMemory as any, 'setActiveCustomer', async () => {}));
    r.push(patchMethod(ledgerService as any, 'recordPayment', async () => {
      throw new Error('Ledger write failed');
    }));

    const res = await businessEngine.execute(
      intent(IntentType.RECORD_PAYMENT, { customer: 'Bharat', amount: 300 }),
      CONV,
    );
    assert.equal(res.success, false);
  } finally { restoreAll(r); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 27. resolveCustomer — Redis fallback for active customer across restarts
// ═══════════════════════════════════════════════════════════════════════════════

test('resolveCustomer — falls back to Redis when in-memory cache is empty', async () => {
  const r: RestoreFn[] = [];
  try {
    // In-memory cache miss
    r.push(patchMethod(customerService as any, 'getActiveCustomer', async () => null));
    // Redis has the active customer (survived process restart)
    r.push(patchMethod(conversationMemory as any, 'getActiveCustomer', async () => ({
      id: 'cust-001', name: 'Bharat Kumar',
    })));
    r.push(patchMethod(customerService as any, 'getActiveCustomerById', async () => CUSTOMER_WITH_EMAIL));
    r.push(patchMethod(customerService as any, 'setActiveCustomer', () => {}));
    r.push(patchMethod(customerService as any, 'getBalanceFast', async () => 500));

    const res = await businessEngine.execute(
      intent(IntentType.CHECK_BALANCE, { customerRef: 'active' }),
      CONV,
    );
    assert.equal(res.success, true);
    assert.equal(res.data.balance, 500);
    assert.match(res.message, /Bharat Kumar/);
  } finally { restoreAll(r); }
});

// ─── Cleanup ─────────────────────────────────────────────────────────────────

test.after(async () => {
  try {
    await disconnectDB();
  } catch {
    // ignore cleanup errors
  } finally {
    setTimeout(() => process.exit(0), 500);
  }
});
