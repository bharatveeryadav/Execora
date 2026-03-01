"use strict";
/**
 * Conversation Memory Service — Test Suite
 * Tests fuzzy matching, customer tracking, and context switching.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 *
 * Uses the in-memory test double (no Redis required).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const in_memory_conversation_1 = require("./helpers/in-memory-conversation");
// ── Helpers ────────────────────────────────────────────────────────────────────
let _convCounter = 0;
const nextConvId = () => `test-conv-${++_convCounter}-${Date.now()}`;
// ── Tests ──────────────────────────────────────────────────────────────────────
(0, node_test_1.default)('stores user and assistant messages in order', async () => {
    const conv = nextConvId();
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Bharat ka balance kitna hai?', 'CHECK_BALANCE', { customer: 'Bharat' });
    await in_memory_conversation_1.conversationMemory.addAssistantMessage(conv, 'Bharat ka balance 5000 hai');
    const history = await in_memory_conversation_1.conversationMemory.getConversationHistory(conv);
    strict_1.default.equal(history.length, 2);
    strict_1.default.equal(history[0].role, 'user');
    strict_1.default.equal(history[1].role, 'assistant');
    strict_1.default.ok(history[0].content.includes('Bharat'));
});
(0, node_test_1.default)('phonetic variation "Bharath" does not create a duplicate for "Bharat"', async () => {
    const conv = nextConvId();
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Bharat ka balance?', 'CHECK_BALANCE', { customer: 'Bharat' });
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_001', 'Bharat');
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Bharath ko 500 add karo', 'ADD_CREDIT', { customer: 'Bharath' });
    const all = await in_memory_conversation_1.conversationMemory.getAllCustomersInContext(conv);
    strict_1.default.equal(all.length, 1, 'should not create duplicate');
    strict_1.default.equal(all[0].name, 'Bharat');
    strict_1.default.ok(all[0].mentionCount >= 2, 'should increment mention count');
});
(0, node_test_1.default)('nickname "Raju" is recognised as the same person as "Rahul"', async () => {
    const conv = nextConvId();
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Rahul ka invoice', 'CREATE_INVOICE', { customer: 'Rahul' });
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_002', 'Rahul');
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Raju ko payment mila', 'RECORD_PAYMENT', { customer: 'Raju' });
    const all = await in_memory_conversation_1.conversationMemory.getAllCustomersInContext(conv);
    strict_1.default.equal(all.length, 1, 'Raju should map to existing Rahul');
    strict_1.default.ok(all[0].mentionCount >= 2);
});
(0, node_test_1.default)('tracks multiple customers and getActiveCustomer returns the last one', async () => {
    const conv = nextConvId();
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_001', 'Bharat');
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Bharat ka balance?', 'CHECK_BALANCE', { customer: 'Bharat' });
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_002', 'Rahul');
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Rahul ka balance?', 'CHECK_BALANCE', { customer: 'Rahul' });
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_003', 'Deepak');
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Deepak ka balance?', 'CHECK_BALANCE', { customer: 'Deepak' });
    const all = await in_memory_conversation_1.conversationMemory.getAllCustomersInContext(conv);
    strict_1.default.equal(all.length, 3);
    const active = await in_memory_conversation_1.conversationMemory.getActiveCustomer(conv);
    strict_1.default.equal(active?.name, 'Deepak');
});
(0, node_test_1.default)('switchToPreviousCustomer moves context back one step', async () => {
    const conv = nextConvId();
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_001', 'Bharat');
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_002', 'Rahul');
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_003', 'Deepak');
    const prev = await in_memory_conversation_1.conversationMemory.switchToPreviousCustomer(conv);
    strict_1.default.equal(prev?.name, 'Rahul');
});
(0, node_test_1.default)('switchToCustomerByName matches "Dipak" fuzzy to "Deepak"', async () => {
    const conv = nextConvId();
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_001', 'Deepak');
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_002', 'Sandeep');
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_003', 'Pradeep');
    const switched = await in_memory_conversation_1.conversationMemory.switchToCustomerByName(conv, 'Dipak');
    strict_1.default.ok(switched !== null, 'should find a match');
    strict_1.default.equal(switched?.name, 'Deepak');
});
(0, node_test_1.default)('honorific "Suresh bhai" does not duplicate existing "Suresh"', async () => {
    const conv = nextConvId();
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Suresh ka balance', 'CHECK_BALANCE', { customer: 'Suresh' });
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_001', 'Suresh');
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Suresh bhai ko reminder', 'CREATE_REMINDER', { customer: 'Suresh bhai' });
    const all = await in_memory_conversation_1.conversationMemory.getAllCustomersInContext(conv);
    strict_1.default.equal(all.length, 1);
    strict_1.default.equal(all[0].name, 'Suresh');
});
(0, node_test_1.default)('getFormattedContext includes conversation header and both customer names', async () => {
    const conv = nextConvId();
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Bharat ka balance?', 'CHECK_BALANCE', { customer: 'Bharat' });
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_001', 'Bharat');
    await in_memory_conversation_1.conversationMemory.updateCustomerContext(conv, 'Bharat', { balance: 5000 });
    await in_memory_conversation_1.conversationMemory.addAssistantMessage(conv, 'Bharat ka balance 5000 hai');
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Rahul ka balance?', 'CHECK_BALANCE', { customer: 'Rahul' });
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_002', 'Rahul');
    await in_memory_conversation_1.conversationMemory.updateCustomerContext(conv, 'Rahul', { balance: 3000 });
    await in_memory_conversation_1.conversationMemory.addAssistantMessage(conv, 'Rahul ka balance 3000 hai');
    const ctx = await in_memory_conversation_1.conversationMemory.getFormattedContext(conv, 10);
    strict_1.default.ok(ctx.length > 0);
    strict_1.default.ok(ctx.includes('Previous conversation'), 'should have conversation header');
    strict_1.default.ok(ctx.includes('Bharat'));
    strict_1.default.ok(ctx.includes('Rahul'));
    strict_1.default.ok(ctx.includes('Recent customers'));
});
(0, node_test_1.default)('findMatchingCustomers returns >=2 matches for "Raju" sorted by score', async () => {
    const conv = nextConvId();
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_001', 'Rahul');
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_002', 'Rajesh');
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_003', 'Rajiv');
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_004', 'Amit');
    const matches = await in_memory_conversation_1.conversationMemory.findMatchingCustomers(conv, 'Raju', 0.6);
    strict_1.default.ok(matches.length >= 2, `expected >=2, got ${matches.length}`);
    strict_1.default.ok(matches[0].score >= matches[1].score, 'should be sorted by score descending');
});
(0, node_test_1.default)('updateCustomerContext stores balance and amount retrievable via getContextSummary', async () => {
    const conv = nextConvId();
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_001', 'Bharat');
    await in_memory_conversation_1.conversationMemory.updateCustomerContext(conv, 'Bharat', { balance: 5000, amount: 500, intent: 'ADD_CREDIT' });
    const summary = await in_memory_conversation_1.conversationMemory.getContextSummary(conv);
    strict_1.default.ok(summary.includes('5000'), 'summary should include balance');
    strict_1.default.ok(summary.includes('500'), 'summary should include amount');
});
(0, node_test_1.default)('message history is capped at 20 — oldest messages are dropped', async () => {
    const conv = nextConvId();
    for (let i = 1; i <= 25; i++) {
        await in_memory_conversation_1.conversationMemory.addUserMessage(conv, `Message ${i}`, 'UNKNOWN', {});
    }
    const history = await in_memory_conversation_1.conversationMemory.getConversationHistory(conv, 100);
    strict_1.default.equal(history.length, 20, `expected 20, got ${history.length}`);
    strict_1.default.ok(history[0].content.includes('Message 6'), `expected Message 6, got "${history[0].content}"`);
    strict_1.default.ok(history[19].content.includes('Message 25'));
});
(0, node_test_1.default)('customer history is capped at 10 — oldest customers are dropped', async () => {
    const conv = nextConvId();
    const names = ['Aarav', 'Kabir', 'Ishaan', 'Rohan', 'Neha', 'Pooja', 'Vikram', 'Nitin', 'Karthik', 'Mohan', 'Farhan', 'Saloni'];
    for (let i = 0; i < names.length; i++) {
        await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, `cust_${i}`, names[i]);
    }
    const all = await in_memory_conversation_1.conversationMemory.getAllCustomersInContext(conv);
    strict_1.default.equal(all.length, 10, `expected 10, got ${all.length}`);
    strict_1.default.equal(all[0].name, 'Saloni', 'most recent should be first');
});
(0, node_test_1.default)('V/W confusion: "Wikas" merges with existing "Vikas"', async () => {
    const conv = nextConvId();
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_001', 'Vikas');
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Wikas ko payment', 'RECORD_PAYMENT', { customer: 'Wikas' });
    const all = await in_memory_conversation_1.conversationMemory.getAllCustomersInContext(conv);
    strict_1.default.equal(all.length, 1, 'V/W variation should merge');
});
(0, node_test_1.default)('South Indian transliteration: "Laxmi" merges with "Lakshmi"', async () => {
    const conv = nextConvId();
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_001', 'Lakshmi');
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Laxmi ka invoice', 'CREATE_INVOICE', { customer: 'Laxmi' });
    const all = await in_memory_conversation_1.conversationMemory.getAllCustomersInContext(conv);
    strict_1.default.equal(all.length, 1, 'transliteration variation should merge');
    strict_1.default.equal(all[0].name, 'Lakshmi');
});
(0, node_test_1.default)('clearMemory removes all messages', async () => {
    const conv = nextConvId();
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Test message', 'UNKNOWN', {});
    await in_memory_conversation_1.conversationMemory.clearMemory(conv);
    strict_1.default.equal((await in_memory_conversation_1.conversationMemory.getConversationHistory(conv)).length, 0);
});
(0, node_test_1.default)('integration: 5-turn conversation tracks exactly 2 unique customers', async () => {
    const conv = nextConvId();
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Bharat ka balance?', 'CHECK_BALANCE', { customer: 'Bharat' });
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_001', 'Bharat');
    await in_memory_conversation_1.conversationMemory.updateCustomerContext(conv, 'Bharat', { balance: 5000 });
    await in_memory_conversation_1.conversationMemory.addAssistantMessage(conv, 'Bharat ka balance 5000 hai');
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Bharath ko 500 add karo', 'ADD_CREDIT', { customer: 'Bharath', amount: 500 });
    await in_memory_conversation_1.conversationMemory.updateCustomerContext(conv, 'Bharat', { balance: 5500, amount: 500 });
    await in_memory_conversation_1.conversationMemory.addAssistantMessage(conv, 'Bharat ko 500 add kar diya. Ab 5500 hai');
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Rahul ka balance?', 'CHECK_BALANCE', { customer: 'Rahul' });
    await in_memory_conversation_1.conversationMemory.setActiveCustomer(conv, 'cust_002', 'Rahul');
    await in_memory_conversation_1.conversationMemory.updateCustomerContext(conv, 'Rahul', { balance: 3000 });
    await in_memory_conversation_1.conversationMemory.addAssistantMessage(conv, 'Rahul ka balance 3000 hai');
    await in_memory_conversation_1.conversationMemory.addUserMessage(conv, 'Raju ko 200 add', 'ADD_CREDIT', { customer: 'Raju', amount: 200 });
    await in_memory_conversation_1.conversationMemory.updateCustomerContext(conv, 'Rahul', { balance: 3200, amount: 200 });
    await in_memory_conversation_1.conversationMemory.addAssistantMessage(conv, 'Rahul ko 200 add kar diya. Ab 3200 hai');
    const switched = await in_memory_conversation_1.conversationMemory.switchToCustomerByName(conv, 'Bharath');
    const history = await in_memory_conversation_1.conversationMemory.getConversationHistory(conv);
    const customers = await in_memory_conversation_1.conversationMemory.getAllCustomersInContext(conv);
    strict_1.default.equal(history.length, 8, `expected 8 messages, got ${history.length}`);
    strict_1.default.equal(customers.length, 2, `expected 2 unique customers, got ${customers.length}`);
    strict_1.default.equal(switched?.name, 'Bharat', 'fuzzy switch should resolve "Bharath" to "Bharat"');
});
//# sourceMappingURL=conversation.test.js.map