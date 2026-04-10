/**
 * finance/expenses/expense-approval
 *
 * Feature: expense approval workflow — approve or reject pending expenses.
 * Stub — approval workflow is planned (⏳).
 */
export * from "./contracts/commands";
export declare function approveExpense(cmd: import("./contracts/commands").ApproveExpenseCommand): Promise<{
    success: boolean;
}>;
export declare function rejectExpense(cmd: import("./contracts/commands").RejectExpenseCommand): Promise<{
    success: boolean;
}>;
//# sourceMappingURL=index.d.ts.map