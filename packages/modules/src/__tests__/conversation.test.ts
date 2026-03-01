/**
 * Conversation Memory Service — Test Suite
 * Tests fuzzy matching, customer tracking, and context switching.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 *
 * Uses the in-memory test double (no Redis required).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { conversationMemory } from './helpers/in-memory-conversation';

// ── Helpers ────────────────────────────────────────────────────────────────────

let _convCounter = 0;
const nextConvId = () => `test-conv-${++_convCounter}-${Date.now()}`;

// ── Tests ──────────────────────────────────────────────────────────────────────

test('stores user and assistant messages in order', async () => {
  const conv = nextConvId();
  await conversationMemory.addUserMessage(conv, 'Bharat ka balance kitna hai?', 'CHECK_BALANCE', { customer: 'Bharat' });
  await conversationMemory.addAssistantMessage(conv, 'Bharat ka balance 5000 hai');

  const history = await conversationMemory.getConversationHistory(conv);
  assert.equal(history.length, 2);
  assert.equal(history[0].role, 'user');
  assert.equal(history[1].role, 'assistant');
  assert.ok(history[0].content.includes('Bharat'));
});

test('phonetic variation "Bharath" does not create a duplicate for "Bharat"', async () => {
  const conv = nextConvId();
  await conversationMemory.addUserMessage(conv, 'Bharat ka balance?', 'CHECK_BALANCE', { customer: 'Bharat' });
  await conversationMemory.setActiveCustomer(conv, 'cust_001', 'Bharat');
  await conversationMemory.addUserMessage(conv, 'Bharath ko 500 add karo', 'ADD_CREDIT', { customer: 'Bharath' });

  const all = await conversationMemory.getAllCustomersInContext(conv);
  assert.equal(all.length, 1, 'should not create duplicate');
  assert.equal(all[0].name, 'Bharat');
  assert.ok(all[0].mentionCount >= 2, 'should increment mention count');
});

test('nickname "Raju" is recognised as the same person as "Rahul"', async () => {
  const conv = nextConvId();
  await conversationMemory.addUserMessage(conv, 'Rahul ka invoice', 'CREATE_INVOICE', { customer: 'Rahul' });
  await conversationMemory.setActiveCustomer(conv, 'cust_002', 'Rahul');
  await conversationMemory.addUserMessage(conv, 'Raju ko payment mila', 'RECORD_PAYMENT', { customer: 'Raju' });

  const all = await conversationMemory.getAllCustomersInContext(conv);
  assert.equal(all.length, 1, 'Raju should map to existing Rahul');
  assert.ok(all[0].mentionCount >= 2);
});

test('tracks multiple customers and getActiveCustomer returns the last one', async () => {
  const conv = nextConvId();
  await conversationMemory.setActiveCustomer(conv, 'cust_001', 'Bharat');
  await conversationMemory.addUserMessage(conv, 'Bharat ka balance?', 'CHECK_BALANCE', { customer: 'Bharat' });
  await conversationMemory.setActiveCustomer(conv, 'cust_002', 'Rahul');
  await conversationMemory.addUserMessage(conv, 'Rahul ka balance?', 'CHECK_BALANCE', { customer: 'Rahul' });
  await conversationMemory.setActiveCustomer(conv, 'cust_003', 'Deepak');
  await conversationMemory.addUserMessage(conv, 'Deepak ka balance?', 'CHECK_BALANCE', { customer: 'Deepak' });

  const all = await conversationMemory.getAllCustomersInContext(conv);
  assert.equal(all.length, 3);

  const active = await conversationMemory.getActiveCustomer(conv);
  assert.equal(active?.name, 'Deepak');
});

test('switchToPreviousCustomer moves context back one step', async () => {
  const conv = nextConvId();
  await conversationMemory.setActiveCustomer(conv, 'cust_001', 'Bharat');
  await conversationMemory.setActiveCustomer(conv, 'cust_002', 'Rahul');
  await conversationMemory.setActiveCustomer(conv, 'cust_003', 'Deepak');

  const prev = await conversationMemory.switchToPreviousCustomer(conv);
  assert.equal(prev?.name, 'Rahul');
});

test('switchToCustomerByName matches "Dipak" fuzzy to "Deepak"', async () => {
  const conv = nextConvId();
  await conversationMemory.setActiveCustomer(conv, 'cust_001', 'Deepak');
  await conversationMemory.setActiveCustomer(conv, 'cust_002', 'Sandeep');
  await conversationMemory.setActiveCustomer(conv, 'cust_003', 'Pradeep');

  const switched = await conversationMemory.switchToCustomerByName(conv, 'Dipak');
  assert.ok(switched !== null, 'should find a match');
  assert.equal(switched?.name, 'Deepak');
});

test('honorific "Suresh bhai" does not duplicate existing "Suresh"', async () => {
  const conv = nextConvId();
  await conversationMemory.addUserMessage(conv, 'Suresh ka balance', 'CHECK_BALANCE', { customer: 'Suresh' });
  await conversationMemory.setActiveCustomer(conv, 'cust_001', 'Suresh');
  await conversationMemory.addUserMessage(conv, 'Suresh bhai ko reminder', 'CREATE_REMINDER', { customer: 'Suresh bhai' });

  const all = await conversationMemory.getAllCustomersInContext(conv);
  assert.equal(all.length, 1);
  assert.equal(all[0].name, 'Suresh');
});

test('getFormattedContext includes conversation header and both customer names', async () => {
  const conv = nextConvId();
  await conversationMemory.addUserMessage(conv, 'Bharat ka balance?', 'CHECK_BALANCE', { customer: 'Bharat' });
  await conversationMemory.setActiveCustomer(conv, 'cust_001', 'Bharat');
  await conversationMemory.updateCustomerContext(conv, 'Bharat', { balance: 5000 });
  await conversationMemory.addAssistantMessage(conv, 'Bharat ka balance 5000 hai');
  await conversationMemory.addUserMessage(conv, 'Rahul ka balance?', 'CHECK_BALANCE', { customer: 'Rahul' });
  await conversationMemory.setActiveCustomer(conv, 'cust_002', 'Rahul');
  await conversationMemory.updateCustomerContext(conv, 'Rahul', { balance: 3000 });
  await conversationMemory.addAssistantMessage(conv, 'Rahul ka balance 3000 hai');

  const ctx = await conversationMemory.getFormattedContext(conv, 10);
  assert.ok(ctx.length > 0);
  assert.ok(ctx.includes('Previous conversation'), 'should have conversation header');
  assert.ok(ctx.includes('Bharat'));
  assert.ok(ctx.includes('Rahul'));
  assert.ok(ctx.includes('Recent customers'));
});

test('findMatchingCustomers returns >=2 matches for "Raju" sorted by score', async () => {
  const conv = nextConvId();
  await conversationMemory.setActiveCustomer(conv, 'cust_001', 'Rahul');
  await conversationMemory.setActiveCustomer(conv, 'cust_002', 'Rajesh');
  await conversationMemory.setActiveCustomer(conv, 'cust_003', 'Rajiv');
  await conversationMemory.setActiveCustomer(conv, 'cust_004', 'Amit');

  const matches = await conversationMemory.findMatchingCustomers(conv, 'Raju', 0.6);
  assert.ok(matches.length >= 2, `expected >=2, got ${matches.length}`);
  assert.ok(matches[0].score >= matches[1].score, 'should be sorted by score descending');
});

test('updateCustomerContext stores balance and amount retrievable via getContextSummary', async () => {
  const conv = nextConvId();
  await conversationMemory.setActiveCustomer(conv, 'cust_001', 'Bharat');
  await conversationMemory.updateCustomerContext(conv, 'Bharat', { balance: 5000, amount: 500, intent: 'ADD_CREDIT' });

  const summary = await conversationMemory.getContextSummary(conv);
  assert.ok(summary.includes('5000'), 'summary should include balance');
  assert.ok(summary.includes('500'), 'summary should include amount');
});

test('message history is capped at 20 — oldest messages are dropped', async () => {
  const conv = nextConvId();
  for (let i = 1; i <= 25; i++) {
    await conversationMemory.addUserMessage(conv, `Message ${i}`, 'UNKNOWN', {});
  }

  const history = await conversationMemory.getConversationHistory(conv, 100);
  assert.equal(history.length, 20, `expected 20, got ${history.length}`);
  assert.ok(history[0].content.includes('Message 6'), `expected Message 6, got "${history[0].content}"`);
  assert.ok(history[19].content.includes('Message 25'));
});

test('customer history is capped at 10 — oldest customers are dropped', async () => {
  const conv = nextConvId();
  const names = ['Aarav','Kabir','Ishaan','Rohan','Neha','Pooja','Vikram','Nitin','Karthik','Mohan','Farhan','Saloni'];
  for (let i = 0; i < names.length; i++) {
    await conversationMemory.setActiveCustomer(conv, `cust_${i}`, names[i]);
  }

  const all = await conversationMemory.getAllCustomersInContext(conv);
  assert.equal(all.length, 10, `expected 10, got ${all.length}`);
  assert.equal(all[0].name, 'Saloni', 'most recent should be first');
});

test('V/W confusion: "Wikas" merges with existing "Vikas"', async () => {
  const conv = nextConvId();
  await conversationMemory.setActiveCustomer(conv, 'cust_001', 'Vikas');
  await conversationMemory.addUserMessage(conv, 'Wikas ko payment', 'RECORD_PAYMENT', { customer: 'Wikas' });

  const all = await conversationMemory.getAllCustomersInContext(conv);
  assert.equal(all.length, 1, 'V/W variation should merge');
});

test('South Indian transliteration: "Laxmi" merges with "Lakshmi"', async () => {
  const conv = nextConvId();
  await conversationMemory.setActiveCustomer(conv, 'cust_001', 'Lakshmi');
  await conversationMemory.addUserMessage(conv, 'Laxmi ka invoice', 'CREATE_INVOICE', { customer: 'Laxmi' });

  const all = await conversationMemory.getAllCustomersInContext(conv);
  assert.equal(all.length, 1, 'transliteration variation should merge');
  assert.equal(all[0].name, 'Lakshmi');
});

test('clearMemory removes all messages', async () => {
  const conv = nextConvId();
  await conversationMemory.addUserMessage(conv, 'Test message', 'UNKNOWN', {});
  await conversationMemory.clearMemory(conv);

  assert.equal((await conversationMemory.getConversationHistory(conv)).length, 0);
});

test('integration: 5-turn conversation tracks exactly 2 unique customers', async () => {
  const conv = nextConvId();

  await conversationMemory.addUserMessage(conv, 'Bharat ka balance?', 'CHECK_BALANCE', { customer: 'Bharat' });
  await conversationMemory.setActiveCustomer(conv, 'cust_001', 'Bharat');
  await conversationMemory.updateCustomerContext(conv, 'Bharat', { balance: 5000 });
  await conversationMemory.addAssistantMessage(conv, 'Bharat ka balance 5000 hai');

  await conversationMemory.addUserMessage(conv, 'Bharath ko 500 add karo', 'ADD_CREDIT', { customer: 'Bharath', amount: 500 });
  await conversationMemory.updateCustomerContext(conv, 'Bharat', { balance: 5500, amount: 500 });
  await conversationMemory.addAssistantMessage(conv, 'Bharat ko 500 add kar diya. Ab 5500 hai');

  await conversationMemory.addUserMessage(conv, 'Rahul ka balance?', 'CHECK_BALANCE', { customer: 'Rahul' });
  await conversationMemory.setActiveCustomer(conv, 'cust_002', 'Rahul');
  await conversationMemory.updateCustomerContext(conv, 'Rahul', { balance: 3000 });
  await conversationMemory.addAssistantMessage(conv, 'Rahul ka balance 3000 hai');

  await conversationMemory.addUserMessage(conv, 'Raju ko 200 add', 'ADD_CREDIT', { customer: 'Raju', amount: 200 });
  await conversationMemory.updateCustomerContext(conv, 'Rahul', { balance: 3200, amount: 200 });
  await conversationMemory.addAssistantMessage(conv, 'Rahul ko 200 add kar diya. Ab 3200 hai');

  const switched  = await conversationMemory.switchToCustomerByName(conv, 'Bharath');
  const history   = await conversationMemory.getConversationHistory(conv);
  const customers = await conversationMemory.getAllCustomersInContext(conv);

  assert.equal(history.length, 8, `expected 8 messages, got ${history.length}`);
  assert.equal(customers.length, 2, `expected 2 unique customers, got ${customers.length}`);
  assert.equal(switched?.name, 'Bharat', 'fuzzy switch should resolve "Bharath" to "Bharat"');
});
