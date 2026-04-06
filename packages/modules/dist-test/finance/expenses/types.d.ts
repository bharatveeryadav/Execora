export interface ListExpensesInput {
    from?: string;
    to?: string;
    category?: string;
    type?: string;
    supplier?: string;
    limit?: number;
}
export interface CreateExpenseInput {
    category: string;
    amount: number;
    note?: string;
    supplier?: string;
    date?: string;
    type?: "expense" | "income";
}
export interface ListPurchasesInput {
    from?: string;
    to?: string;
    supplier?: string;
    limit?: number;
}
export interface CreatePurchaseInput {
    category: string;
    amount: number;
    itemName: string;
    supplier?: string;
    quantity?: number;
    unit?: string;
    ratePerUnit?: number;
    note?: string;
    batchNo?: string;
    expiryDate?: string;
    date?: string;
}
export interface ExpenseSummaryResult {
    total: number;
    byCategory: Record<string, number>;
    count: number;
}
export type CashbookEntry = {
    id: string;
    type: "in" | "out";
    amount: number;
    category: string;
    note: string;
    date: string;
    createdAt: number;
};
export interface CashbookResult {
    entries: CashbookEntry[];
    totalIn: number;
    totalOut: number;
    balance: number;
}
//# sourceMappingURL=types.d.ts.map