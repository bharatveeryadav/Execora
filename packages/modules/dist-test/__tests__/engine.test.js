"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const engine_1 = require("../modules/voice/engine");
const customer_service_1 = require("../modules/customer/customer.service");
const ledger_service_1 = require("../modules/ledger/ledger.service");
const types_1 = require("@execora/types");
const core_1 = require("@execora/core");
function patchMethod(obj, key, value) {
    const original = obj[key];
    obj[key] = value;
    return () => {
        obj[key] = original;
    };
}
function buildIntent(intent, entities) {
    return {
        intent,
        entities,
        confidence: 0.95,
        originalText: 'test command',
    };
}
(0, node_test_1.default)('CHECK_BALANCE resolves active customer reference in same conversation', async () => {
    const restores = [];
    try {
        restores.push(patchMethod(customer_service_1.customerService, 'getActiveCustomer', async () => ({
            id: 'cust-1',
            name: 'Bharat',
            phone: null,
            nickname: null,
            landmark: 'ATM wala',
            balance: 0,
            matchScore: 1,
        })));
        restores.push(patchMethod(customer_service_1.customerService, 'getBalanceFast', async () => 450));
        const result = await engine_1.businessEngine.execute(buildIntent(types_1.IntentType.CHECK_BALANCE, { customerRef: 'active' }), 'conv-1');
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(result.data.balance, 450);
        strict_1.default.match(result.message, /Bharat/);
    }
    finally {
        restores.forEach((restore) => restore());
    }
});
(0, node_test_1.default)('CHECK_BALANCE returns MULTIPLE_CUSTOMERS for ambiguous same-name search', async () => {
    const restores = [];
    try {
        restores.push(patchMethod(customer_service_1.customerService, 'searchCustomerRanked', async () => ([
            {
                id: 'cust-1',
                name: 'Bharat',
                phone: null,
                nickname: null,
                landmark: 'ATM wala',
                balance: 100,
                matchScore: 0.7,
            },
            {
                id: 'cust-2',
                name: 'Bharat',
                phone: null,
                nickname: null,
                landmark: 'Agra wala',
                balance: 200,
                matchScore: 0.65,
            },
        ])));
        const result = await engine_1.businessEngine.execute(buildIntent(types_1.IntentType.CHECK_BALANCE, { customer: 'bharat' }), 'conv-2');
        strict_1.default.equal(result.success, false);
        strict_1.default.equal(result.error, 'MULTIPLE_CUSTOMERS');
        strict_1.default.equal(Array.isArray(result.data.customers), true);
        strict_1.default.equal(result.data.customers.length, 2);
    }
    finally {
        restores.forEach((restore) => restore());
    }
});
(0, node_test_1.default)('CREATE_CUSTOMER supports fast path with optional amount and updates balance', async () => {
    const restores = [];
    let updatedAmount = 0;
    try {
        restores.push(patchMethod(customer_service_1.customerService, 'createCustomerFast', async () => ({
            success: true,
            message: '✅ Bharat added! You can update details later.',
            customer: {
                id: 'cust-new',
                name: 'Bharat',
                balance: 0,
            },
        })));
        restores.push(patchMethod(customer_service_1.customerService, 'updateBalance', async (_customerId, amount) => {
            updatedAmount = amount;
            return { id: 'cust-new', balance: amount };
        }));
        const result = await engine_1.businessEngine.execute(buildIntent(types_1.IntentType.CREATE_CUSTOMER, {
            name: 'Bharat',
            amount: 500,
        }), 'conv-3');
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(updatedAmount, 500);
        strict_1.default.equal(result.data.customerId, 'cust-new');
    }
    finally {
        restores.forEach((restore) => restore());
    }
});
(0, node_test_1.default)('RECORD_PAYMENT works with active customer pronoun reference', async () => {
    const restores = [];
    let paymentCalled = false;
    try {
        restores.push(patchMethod(customer_service_1.customerService, 'getActiveCustomer', async () => ({
            id: 'cust-5',
            name: 'Rahul',
            phone: null,
            nickname: null,
            landmark: null,
            balance: 0,
            matchScore: 1,
        })));
        restores.push(patchMethod(ledger_service_1.ledgerService, 'recordPayment', async () => {
            paymentCalled = true;
        }));
        restores.push(patchMethod(customer_service_1.customerService, 'getBalanceFast', async () => 300));
        const result = await engine_1.businessEngine.execute(buildIntent(types_1.IntentType.RECORD_PAYMENT, {
            customerRef: 'active',
            amount: 200,
            mode: 'cash',
        }), 'conv-4');
        strict_1.default.equal(paymentCalled, true);
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(result.data.remainingBalance, 300);
    }
    finally {
        restores.forEach((restore) => restore());
    }
});
(0, node_test_1.default)('LIST_CUSTOMER_BALANCES returns all customers with pending balances', async () => {
    const restores = [];
    try {
        restores.push(patchMethod(customer_service_1.customerService, 'getAllCustomersWithPendingBalance', async () => [
            { id: 'c1', name: 'Amit', balance: 500 },
            { id: 'c2', name: 'Rina', balance: 200 },
        ]));
        const result = await engine_1.businessEngine.execute(buildIntent(types_1.IntentType.LIST_CUSTOMER_BALANCES, {}), 'conv-test');
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(result.data.customers.length, 2);
        strict_1.default.equal(result.data.totalPending, 700);
        strict_1.default.match(result.message, /Total 2 customers ke paas ₹700 baki hai/);
    }
    finally {
        restores.forEach((restore) => restore());
    }
});
(0, node_test_1.default)('TOTAL_PENDING_AMOUNT returns sum of all pending balances', async () => {
    const restores = [];
    try {
        restores.push(patchMethod(customer_service_1.customerService, 'getTotalPendingAmount', async () => 700));
        const result = await engine_1.businessEngine.execute(buildIntent(types_1.IntentType.TOTAL_PENDING_AMOUNT, {}), 'conv-test');
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(result.data.totalPending, 700);
        strict_1.default.match(result.message, /Total pending amount hai ₹700/);
    }
    finally {
        restores.forEach((restore) => restore());
    }
});
// Cleanup: Disconnect database after all tests
node_test_1.default.after(async () => {
    try {
        // Force exit after tests to avoid hanging promises
        await (0, core_1.disconnectDB)();
    }
    catch (error) {
        console.error('Error during cleanup:', error);
    }
    finally {
        // Force exit with a timeout to prevent hanging
        setTimeout(() => {
            process.exit(0);
        }, 500);
    }
});
//# sourceMappingURL=engine.test.js.map