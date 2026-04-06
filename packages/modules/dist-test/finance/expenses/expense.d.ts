import { Prisma } from "@prisma/client";
import type { ListExpensesInput, CreateExpenseInput, ListPurchasesInput, CreatePurchaseInput, ExpenseSummaryResult, CashbookResult } from "./types";
export declare function listExpenses(tenantId: string, opts?: ListExpensesInput): Promise<{
    expenses: {
        supplier: string | null;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        amount: Prisma.Decimal;
        category: string;
        type: string;
        note: string | null;
        itemName: string | null;
        quantity: Prisma.Decimal | null;
        unit: string | null;
        ratePerUnit: Prisma.Decimal | null;
        batchNo: string | null;
        expiryDate: Date | null;
        date: Date;
    }[];
    total: number;
    count: number;
}>;
export declare function createExpense(tenantId: string, body: CreateExpenseInput): Promise<{
    supplier: string | null;
    tenantId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    amount: Prisma.Decimal;
    category: string;
    type: string;
    note: string | null;
    itemName: string | null;
    quantity: Prisma.Decimal | null;
    unit: string | null;
    ratePerUnit: Prisma.Decimal | null;
    batchNo: string | null;
    expiryDate: Date | null;
    date: Date;
}>;
/** Returns the deleted id, or null if not found. */
export declare function deleteExpense(tenantId: string, id: string): Promise<string | null>;
export declare function getExpenseSummary(tenantId: string, from?: string, to?: string): Promise<ExpenseSummaryResult>;
export declare function listPurchases(tenantId: string, opts?: ListPurchasesInput): Promise<{
    purchases: {
        supplier: string | null;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        amount: Prisma.Decimal;
        category: string;
        type: string;
        note: string | null;
        itemName: string | null;
        quantity: Prisma.Decimal | null;
        unit: string | null;
        ratePerUnit: Prisma.Decimal | null;
        batchNo: string | null;
        expiryDate: Date | null;
        date: Date;
    }[];
    total: number;
    count: number;
}>;
export declare function createPurchase(tenantId: string, body: CreatePurchaseInput): Promise<{
    supplier: string | null;
    tenantId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    amount: Prisma.Decimal;
    category: string;
    type: string;
    note: string | null;
    itemName: string | null;
    quantity: Prisma.Decimal | null;
    unit: string | null;
    ratePerUnit: Prisma.Decimal | null;
    batchNo: string | null;
    expiryDate: Date | null;
    date: Date;
}>;
/** Returns the deleted id, or null if not found. */
export declare function deletePurchase(tenantId: string, id: string): Promise<string | null>;
export declare function getCashbook(tenantId: string, from?: string, to?: string): Promise<CashbookResult>;
export type { ListExpensesInput, CreateExpenseInput, ListPurchasesInput, CreatePurchaseInput, ExpenseSummaryResult, CashbookResult, } from "./types";
//# sourceMappingURL=expense.d.ts.map