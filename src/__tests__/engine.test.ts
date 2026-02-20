import test from 'node:test';
import assert from 'node:assert/strict';
import { businessEngine } from '../modules/voice/engine';
import { customerService } from '../modules/customer/customer.service';
import { ledgerService } from '../modules/ledger/ledger.service';
import { IntentType, IntentExtraction } from '../types';
import { disconnectDB } from '../infrastructure/database';

type RestoreFn = () => void;

function patchMethod<T extends object, K extends keyof T>(obj: T, key: K, value: T[K]): RestoreFn {
    const original = obj[key];
    (obj as any)[key] = value;
    return () => {
        (obj as any)[key] = original;
    };
}

function buildIntent(intent: IntentType, entities: Record<string, any>): IntentExtraction {
    return {
        intent,
        entities,
        confidence: 0.95,
        originalText: 'test command',
    };
}

test('CHECK_BALANCE resolves active customer reference in same conversation', async () => {
    const restores: RestoreFn[] = [];
    try {
        restores.push(
            patchMethod(customerService as any, 'getActiveCustomer', async () => ({
                id: 'cust-1',
                name: 'Bharat',
                phone: null,
                nickname: null,
                landmark: 'ATM wala',
                balance: 0,
                matchScore: 1,
            }))
        );

        restores.push(
            patchMethod(customerService as any, 'getBalanceFast', async () => 450)
        );

        const result = await businessEngine.execute(
            buildIntent(IntentType.CHECK_BALANCE, { customerRef: 'active' }),
            'conv-1'
        );

        assert.equal(result.success, true);
        assert.equal(result.data.balance, 450);
        assert.match(result.message, /Bharat/);
    } finally {
        restores.forEach((restore) => restore());
    }
});

test('CHECK_BALANCE returns MULTIPLE_CUSTOMERS for ambiguous same-name search', async () => {
    const restores: RestoreFn[] = [];
    try {
        restores.push(
            patchMethod(customerService as any, 'searchCustomerRanked', async () => ([
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
            ]))
        );

        const result = await businessEngine.execute(
            buildIntent(IntentType.CHECK_BALANCE, { customer: 'bharat' }),
            'conv-2'
        );

        assert.equal(result.success, false);
        assert.equal(result.error, 'MULTIPLE_CUSTOMERS');
        assert.equal(Array.isArray(result.data.customers), true);
        assert.equal(result.data.customers.length, 2);
    } finally {
        restores.forEach((restore) => restore());
    }
});

test('CREATE_CUSTOMER supports fast path with optional amount and updates balance', async () => {
    const restores: RestoreFn[] = [];
    let updatedAmount = 0;

    try {
        restores.push(
            patchMethod(customerService as any, 'createCustomerFast', async () => ({
                success: true,
                message: '✅ Bharat added! You can update details later.',
                customer: {
                    id: 'cust-new',
                    name: 'Bharat',
                    balance: 0,
                },
            }))
        );

        restores.push(
            patchMethod(customerService as any, 'updateBalance', async (_customerId: string, amount: number) => {
                updatedAmount = amount;
                return { id: 'cust-new', balance: amount };
            })
        );

        const result = await businessEngine.execute(
            buildIntent(IntentType.CREATE_CUSTOMER, {
                name: 'Bharat',
                amount: 500,
            }),
            'conv-3'
        );

        assert.equal(result.success, true);
        assert.equal(updatedAmount, 500);
        assert.equal(result.data.customerId, 'cust-new');
    } finally {
        restores.forEach((restore) => restore());
    }
});

test('RECORD_PAYMENT works with active customer pronoun reference', async () => {
    const restores: RestoreFn[] = [];
    let paymentCalled = false;

    try {
        restores.push(
            patchMethod(customerService as any, 'getActiveCustomer', async () => ({
                id: 'cust-5',
                name: 'Rahul',
                phone: null,
                nickname: null,
                landmark: null,
                balance: 0,
                matchScore: 1,
            }))
        );

        restores.push(
            patchMethod(ledgerService as any, 'recordPayment', async () => {
                paymentCalled = true;
            })
        );

        restores.push(
            patchMethod(customerService as any, 'getBalanceFast', async () => 300)
        );

        const result = await businessEngine.execute(
            buildIntent(IntentType.RECORD_PAYMENT, {
                customerRef: 'active',
                amount: 200,
                mode: 'cash',
            }),
            'conv-4'
        );

        assert.equal(paymentCalled, true);
        assert.equal(result.success, true);
        assert.equal(result.data.remainingBalance, 300);
    } finally {
        restores.forEach((restore) => restore());
    }
});

// Cleanup: Disconnect database after all tests
test.after(async () => {
    try {
        // Force exit after tests to avoid hanging promises
        await disconnectDB();
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        // Force exit with a timeout to prevent hanging
        setTimeout(() => {
            process.exit(0);
        }, 500);
    }
});
