/**
 * Conversation Memory Service Test Suite
 * Tests fuzzy matching integration, customer tracking, and context switching
 * Run with: npx ts-node src/business/conversation-memory.service.test.ts
 */

import { conversationMemory } from './conversation-memory.service';
import { IntentType } from '../types';

console.log('🧪 Testing Conversation Memory Service with Fuzzy Matching\n');
console.log('===========================================================\n');

// Helper to create test conversation ID
const createTestConversationId = () => `test-conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
        console.log(`✅ ${testName}`);
        testsPassed++;
    } else {
        console.log(`❌ ${testName}`);
        if (details) console.log(`   Error: ${details}`);
        testsFailed++;
    }
}

// ============================================================
// TEST 1: Basic Message Storage
// ============================================================
console.log('📋 Test 1: Basic Message Storage\n');

const conv1 = createTestConversationId();
conversationMemory.addUserMessage(conv1, 'Bharat ka balance kitna hai?', 'CHECK_BALANCE', { customer: 'Bharat' });
conversationMemory.addAssistantMessage(conv1, 'Bharat ka balance 5000 hai');

const history1 = conversationMemory.getConversationHistory(conv1);
assert(history1.length === 2, 'Should store 2 messages', `Found ${history1.length} messages`);
assert(history1[0].role === 'user', 'First message should be user message');
assert(history1[1].role === 'assistant', 'Second message should be assistant message');
assert(history1[0].content.includes('Bharat'), 'User message should contain customer name');

console.log();

// ============================================================
// TEST 2: Fuzzy Matching - Same Name Different Spelling
// ============================================================
console.log('📋 Test 2: Fuzzy Matching - Phonetic Variations\n');

const conv2 = createTestConversationId();

// Add customer with one spelling
conversationMemory.addUserMessage(conv2, 'Bharat ka balance?', 'CHECK_BALANCE', { customer: 'Bharat' });
conversationMemory.setActiveCustomer(conv2, 'cust_001', 'Bharat');

// Try to track same customer with different spelling
conversationMemory.addUserMessage(conv2, 'Bharath ko 500 add karo', 'ADD_CREDIT', { customer: 'Bharath' });

const allCustomers = conversationMemory.getAllCustomersInContext(conv2);
assert(allCustomers.length === 1, 'Should not create duplicate for "Bharath"', `Found ${allCustomers.length} customers`);
assert(allCustomers[0].name === 'Bharat', 'Should keep original name "Bharat"');
assert(allCustomers[0].mentionCount === 2, 'Should track 2 mentions for same customer', `Found ${allCustomers[0].mentionCount} mentions`);

console.log(`   Customer tracked: ${allCustomers[0].name} (${allCustomers[0].mentionCount} mentions)`);
console.log();

// ============================================================
// TEST 3: Nickname Recognition
// ============================================================
console.log('📋 Test 3: Nickname Recognition\n');

const conv3 = createTestConversationId();

// Add customer with full name
conversationMemory.addUserMessage(conv3, 'Rahul ka invoice', 'CREATE_INVOICE', { customer: 'Rahul' });
conversationMemory.setActiveCustomer(conv3, 'cust_002', 'Rahul');

// Try nickname
conversationMemory.addUserMessage(conv3, 'Raju ko payment mila', 'RECORD_PAYMENT', { customer: 'Raju' });

const customers3 = conversationMemory.getAllCustomersInContext(conv3);
assert(customers3.length === 1, 'Should recognize "Raju" as nickname for "Rahul"', `Found ${customers3.length} customers`);
assert(customers3[0].mentionCount === 2, 'Should track both mentions');

console.log(`   Full name: Rahul, Nickname: Raju → Merged ✅`);
console.log();

// ============================================================
// TEST 4: Customer Context Switching
// ============================================================
console.log('📋 Test 4: Customer Context Switching\n');

const conv4 = createTestConversationId();

// Track multiple customers
conversationMemory.setActiveCustomer(conv4, 'cust_001', 'Bharat');
conversationMemory.addUserMessage(conv4, 'Bharat ka balance?', 'CHECK_BALANCE', { customer: 'Bharat' });

conversationMemory.setActiveCustomer(conv4, 'cust_002', 'Rahul');
conversationMemory.addUserMessage(conv4, 'Rahul ka balance?', 'CHECK_BALANCE', { customer: 'Rahul' });

conversationMemory.setActiveCustomer(conv4, 'cust_003', 'Deepak');
conversationMemory.addUserMessage(conv4, 'Deepak ka balance?', 'CHECK_BALANCE', { customer: 'Deepak' });

const allCustomers4 = conversationMemory.getAllCustomersInContext(conv4);
assert(allCustomers4.length === 3, 'Should track 3 different customers', `Found ${allCustomers4.length}`);

// Get active customer
const activeCustomer4 = conversationMemory.getActiveCustomer(conv4);
assert(activeCustomer4?.name === 'Deepak', 'Last mentioned should be active', `Active: ${activeCustomer4?.name}`);

// Switch to previous customer
const previous = conversationMemory.switchToPreviousCustomer(conv4);
assert(previous?.name === 'Rahul', 'Previous customer should be Rahul', `Got: ${previous?.name}`);

console.log(`   Customers: ${allCustomers4.map(c => c.name).join(', ')}`);
console.log(`   Active after switch: ${previous?.name} ✅`);
console.log();

// ============================================================
// TEST 5: Fuzzy Customer Switching
// ============================================================
console.log('📋 Test 5: Fuzzy Customer Switching by Name\n');

const conv5 = createTestConversationId();

// Setup customers
conversationMemory.setActiveCustomer(conv5, 'cust_001', 'Deepak');
conversationMemory.setActiveCustomer(conv5, 'cust_002', 'Sandeep');
conversationMemory.setActiveCustomer(conv5, 'cust_003', 'Pradeep');

// Try fuzzy switch with phonetic variation
const switched = conversationMemory.switchToCustomerByName(conv5, 'Dipak'); // Should match "Deepak"
assert(switched !== null, 'Should find customer with fuzzy match');
assert(switched?.name === 'Deepak', 'Should match "Dipak" to "Deepak"', `Matched: ${switched?.name}`);

console.log(`   Query: "Dipak" → Matched: "${switched?.name}" ✅`);
console.log();

// ============================================================
// TEST 6: Honorific Handling
// ============================================================
console.log('📋 Test 6: Honorific Handling\n');

const conv6 = createTestConversationId();

// Add customer without honorific
conversationMemory.addUserMessage(conv6, 'Suresh ka balance', 'CHECK_BALANCE', { customer: 'Suresh' });
conversationMemory.setActiveCustomer(conv6, 'cust_001', 'Suresh');

// Add same customer with honorific
conversationMemory.addUserMessage(conv6, 'Suresh bhai ko reminder', 'CREATE_REMINDER', { customer: 'Suresh bhai' });

const customers6 = conversationMemory.getAllCustomersInContext(conv6);
assert(customers6.length === 1, 'Should not create duplicate for honorific variation', `Found ${customers6.length}`);
assert(customers6[0].name === 'Suresh', 'Should use base name without honorific');

console.log(`   "Suresh" + "Suresh bhai" → Merged ✅`);
console.log();

// ============================================================
// TEST 7: Context Summary for OpenAI
// ============================================================
console.log('📋 Test 7: Formatted Context for OpenAI\n');

const conv7 = createTestConversationId();

conversationMemory.addUserMessage(conv7, 'Bharat ka balance?', 'CHECK_BALANCE', { customer: 'Bharat' });
conversationMemory.setActiveCustomer(conv7, 'cust_001', 'Bharat');
conversationMemory.updateCustomerContext(conv7, 'Bharat', { balance: 5000 });

conversationMemory.addAssistantMessage(conv7, 'Bharat ka balance 5000 hai');

conversationMemory.addUserMessage(conv7, 'Rahul ka balance?', 'CHECK_BALANCE', { customer: 'Rahul' });
conversationMemory.setActiveCustomer(conv7, 'cust_002', 'Rahul');
conversationMemory.updateCustomerContext(conv7, 'Rahul', { balance: 3000 });

conversationMemory.addAssistantMessage(conv7, 'Rahul ka balance 3000 hai');

const formattedContext = conversationMemory.getFormattedContext(conv7, 10);
assert(formattedContext.length > 0, 'Should generate formatted context');
assert(formattedContext.includes('Previous conversation'), 'Should have conversation header');
assert(formattedContext.includes('Bharat'), 'Should include Bharat in context');
assert(formattedContext.includes('Rahul'), 'Should include Rahul in context');
assert(formattedContext.includes('Recent customers'), 'Should include customer summary');

console.log('   Formatted context:');
console.log(formattedContext.split('\n').map(line => `   ${line}`).join('\n'));
console.log();

// ============================================================
// TEST 8: Find Matching Customers
// ============================================================
console.log('📋 Test 8: Find Matching Customers (Multiple Matches)\n');

const conv8 = createTestConversationId();

// Setup customers with similar names
conversationMemory.setActiveCustomer(conv8, 'cust_001', 'Rahul');
conversationMemory.setActiveCustomer(conv8, 'cust_002', 'Rajesh');
conversationMemory.setActiveCustomer(conv8, 'cust_003', 'Rajiv');
conversationMemory.setActiveCustomer(conv8, 'cust_004', 'Amit');

// Find all matches for "Raju"
const matches = conversationMemory.findMatchingCustomers(conv8, 'Raju', 0.6);
assert(matches.length >= 2, 'Should find multiple matches for "Raju"', `Found ${matches.length} matches`);
assert(matches[0].score >= matches[1].score, 'Should be sorted by score');

console.log(`   Query: "Raju" found ${matches.length} matches:`);
matches.forEach(m => {
    console.log(`   - ${m.customer.name}: ${(m.score * 100).toFixed(0)}% (${m.matchType})`);
});
console.log();

// ============================================================
// TEST 9: Customer Context Updates
// ============================================================
console.log('📋 Test 9: Customer Context Updates\n');

const conv9 = createTestConversationId();

conversationMemory.setActiveCustomer(conv9, 'cust_001', 'Bharat');
conversationMemory.updateCustomerContext(conv9, 'Bharat', {
    balance: 5000,
    amount: 500,
    intent: 'ADD_CREDIT'
});

const summary9 = conversationMemory.getContextSummary(conv9);
assert(summary9.includes('5000'), 'Should include balance in summary');
assert(summary9.includes('500'), 'Should include amount in summary');

console.log('   Context summary:');
console.log(summary9.split('\n').map(line => `   ${line}`).join('\n'));
console.log();

// ============================================================
// TEST 10: Memory Limits (Max 20 messages)
// ============================================================
console.log('📋 Test 10: Memory Limits (20 messages max)\n');

const conv10 = createTestConversationId();

// Add 25 messages
for (let i = 1; i <= 25; i++) {
    conversationMemory.addUserMessage(conv10, `Message ${i}`, 'UNKNOWN', {});
}

const history10 = conversationMemory.getConversationHistory(conv10, 100);
assert(history10.length === 20, 'Should keep only last 20 messages', `Found ${history10.length}`);
assert(history10[0].content.includes('Message 6'), 'Should start from message 6', `First: ${history10[0].content}`);
assert(history10[19].content.includes('Message 25'), 'Should end at message 25', `Last: ${history10[19].content}`);

console.log(`   Added 25 messages → Kept last 20 ✅`);
console.log(`   Range: Message 6 to Message 25`);
console.log();

// ============================================================
// TEST 11: Customer History Limits (Max 10 customers)
// ============================================================
console.log('📋 Test 11: Customer History Limits (10 customers max)\n');

const conv11 = createTestConversationId();

// Add 12 customers
for (let i = 1; i <= 12; i++) {
    conversationMemory.setActiveCustomer(conv11, `cust_${i}`, `Customer${i}`);
}

const allCustomers11 = conversationMemory.getAllCustomersInContext(conv11);
assert(allCustomers11.length === 10, 'Should keep only last 10 customers', `Found ${allCustomers11.length}`);
assert(allCustomers11[0].name === 'Customer12', 'Most recent should be Customer12');

console.log(`   Added 12 customers → Kept last 10 ✅`);
console.log(`   Most recent: ${allCustomers11[0].name}`);
console.log();

// ============================================================
// TEST 12: V/W Confusion (North India)
// ============================================================
console.log('📋 Test 12: V/W Confusion (Phonetic)\n');

const conv12 = createTestConversationId();

conversationMemory.setActiveCustomer(conv12, 'cust_001', 'Vikas');
conversationMemory.addUserMessage(conv12, 'Wikas ko payment', 'RECORD_PAYMENT', { customer: 'Wikas' });

const customers12 = conversationMemory.getAllCustomersInContext(conv12);
assert(customers12.length === 1, 'Should merge V/W variations', `Found ${customers12.length}`);

console.log(`   "Vikas" + "Wikas" → Merged ✅`);
console.log();

// ============================================================
// TEST 13: South Indian Name Transliteration
// ============================================================
console.log('📋 Test 13: Transliteration Matching (South Indian)\n');

const conv13 = createTestConversationId();

conversationMemory.setActiveCustomer(conv13, 'cust_001', 'Lakshmi');
conversationMemory.addUserMessage(conv13, 'Laxmi ka invoice', 'CREATE_INVOICE', { customer: 'Laxmi' });

const customers13 = conversationMemory.getAllCustomersInContext(conv13);
assert(customers13.length === 1, 'Should merge transliteration variations', `Found ${customers13.length}`);
assert(customers13[0].name === 'Lakshmi', 'Should use first spelling');

console.log(`   "Lakshmi" + "Laxmi" → Merged ✅`);
console.log();

// ============================================================
// TEST 14: Clear Memory
// ============================================================
console.log('📋 Test 14: Clear Memory\n');

const conv14 = createTestConversationId();
conversationMemory.addUserMessage(conv14, 'Test message', 'UNKNOWN', {});
conversationMemory.clearMemory(conv14);

const history14 = conversationMemory.getConversationHistory(conv14);
assert(history14.length === 0, 'Memory should be cleared', `Found ${history14.length} messages`);

console.log(`   Memory cleared successfully ✅`);
console.log();

// ============================================================
// TEST 15: Integration Test - Complete Conversation Flow
// ============================================================
console.log('📋 Test 15: Integration Test - Multi-Turn Conversation\n');

const conv15 = createTestConversationId();

// Turn 1: User asks about Bharat
conversationMemory.addUserMessage(conv15, 'Bharat ka balance?', 'CHECK_BALANCE', { customer: 'Bharat' });
conversationMemory.setActiveCustomer(conv15, 'cust_001', 'Bharat');
conversationMemory.updateCustomerContext(conv15, 'Bharat', { balance: 5000 });
conversationMemory.addAssistantMessage(conv15, 'Bharat ka balance 5000 hai');

// Turn 2: User uses different spelling
conversationMemory.addUserMessage(conv15, 'Bharath ko 500 add karo', 'ADD_CREDIT', { customer: 'Bharath', amount: 500 });
conversationMemory.updateCustomerContext(conv15, 'Bharat', { balance: 5500, amount: 500 });
conversationMemory.addAssistantMessage(conv15, 'Bharat ko 500 add kar diya. Ab 5500 hai');

// Turn 3: Switch to Rahul
conversationMemory.addUserMessage(conv15, 'Rahul ka balance?', 'CHECK_BALANCE', { customer: 'Rahul' });
conversationMemory.setActiveCustomer(conv15, 'cust_002', 'Rahul');
conversationMemory.updateCustomerContext(conv15, 'Rahul', { balance: 3000 });
conversationMemory.addAssistantMessage(conv15, 'Rahul ka balance 3000 hai');

// Turn 4: Use nickname for Rahul
conversationMemory.addUserMessage(conv15, 'Raju ko 200 add', 'ADD_CREDIT', { customer: 'Raju', amount: 200 });
conversationMemory.updateCustomerContext(conv15, 'Rahul', { balance: 3200, amount: 200 });
conversationMemory.addAssistantMessage(conv15, 'Rahul ko 200 add kar diya. Ab 3200 hai');

// Turn 5: Switch back with fuzzy match
const switched15 = conversationMemory.switchToCustomerByName(conv15, 'Bharath');

const history15 = conversationMemory.getConversationHistory(conv15);
const customers15 = conversationMemory.getAllCustomersInContext(conv15);

assert(history15.length === 8, 'Should have 8 messages (4 turns)', `Found ${history15.length}`);
assert(customers15.length === 2, 'Should track only 2 unique customers', `Found ${customers15.length}`);
assert(switched15?.name === 'Bharat', 'Should switch to Bharat with fuzzy match');

console.log(`   ✅ 5 turns, 2 customers tracked correctly`);
console.log(`   ✅ Fuzzy matching worked for all variations`);
console.log(`   ✅ Context maintained across turns`);
console.log();

// ============================================================
// SUMMARY
// ============================================================
console.log('===========================================================');
console.log(`📊 TEST RESULTS:\n`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

if (testsFailed === 0) {
    console.log('🎉 All tests passed! Conversation memory with fuzzy matching is working perfectly.\n');
} else {
    console.log('⚠️  Some tests failed. Please review the failures above.\n');
}

// Stats
const stats = conversationMemory.getStats();
console.log('📊 Memory Stats:');
console.log(`   Active conversations: ${stats.activeConversations}`);
console.log(`   Total messages: ${stats.totalMessages}`);
console.log();

console.log('✨ Test suite completed!');
