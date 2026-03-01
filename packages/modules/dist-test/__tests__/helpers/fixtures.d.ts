/**
 * Shared test fixtures and utilities.
 * Used by all test files — no framework dependency.
 */
import { Decimal } from '@prisma/client/runtime/library';
export type RestoreFn = () => void;
export declare function patchMethod<T extends object, K extends keyof T>(obj: T, key: K, value: T[K]): RestoreFn;
/** Run all restore functions collected from patchMethod calls. */
export declare function restoreAll(restores: RestoreFn[]): void;
export declare const dec: (n: number | string) => Decimal;
export declare function makeCustomer(overrides?: Record<string, any>): {
    id: string;
    name: string;
    phone: string;
    nickname: string;
    landmark: string;
    balance: Decimal;
    notes: null;
    createdAt: Date;
    updatedAt: Date;
    invoices: never[];
    reminders: never[];
};
export declare function makeProduct(overrides?: Record<string, any>): {
    id: string;
    name: string;
    description: string;
    price: Decimal;
    stock: number;
    unit: string;
    createdAt: Date;
    updatedAt: Date;
};
export declare function makeLedgerEntry(overrides?: Record<string, any>): {
    id: string;
    customerId: string;
    type: string;
    amount: Decimal;
    description: string;
    paymentMode: string;
    reference: null;
    createdAt: Date;
    customer: {
        id: string;
        name: string;
        phone: string;
        nickname: string;
        landmark: string;
        balance: Decimal;
        notes: null;
        createdAt: Date;
        updatedAt: Date;
        invoices: never[];
        reminders: never[];
    };
};
export declare function makeInvoice(overrides?: Record<string, any>): {
    id: string;
    customerId: string;
    total: Decimal;
    status: string;
    notes: null;
    createdAt: Date;
    updatedAt: Date;
    items: never[];
    customer: {
        id: string;
        name: string;
        phone: string;
        nickname: string;
        landmark: string;
        balance: Decimal;
        notes: null;
        createdAt: Date;
        updatedAt: Date;
        invoices: never[];
        reminders: never[];
    };
};
export declare function makeReminder(overrides?: Record<string, any>): {
    id: string;
    customerId: string;
    amount: Decimal;
    message: string;
    sendAt: Date;
    status: string;
    retryCount: number;
    sentAt: null;
    failedAt: null;
    createdAt: Date;
    customer: {
        id: string;
        name: string;
        phone: string;
        nickname: string;
        landmark: string;
        balance: Decimal;
        notes: null;
        createdAt: Date;
        updatedAt: Date;
        invoices: never[];
        reminders: never[];
    };
};
/**
 * Create a Prisma $transaction mock.
 * - Callback form (interactive tx): calls callback with the provided proxy object
 * - Array form (batch): resolves all promises in parallel
 */
export declare function makePrismaTransaction(txProxy: Record<string, any>): (arg: unknown) => Promise<any>;
//# sourceMappingURL=fixtures.d.ts.map