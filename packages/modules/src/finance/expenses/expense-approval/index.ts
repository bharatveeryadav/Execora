/**
 * finance/expenses/expense-approval
 *
 * Feature: expense approval workflow — approve or reject pending expenses.
 * Stub — approval workflow is planned (⏳).
 */
export * from "./contracts/commands";
export async function approveExpense(
  cmd: import("./contracts/commands").ApproveExpenseCommand
): Promise<{ success: boolean }> {
  // TODO: persist approval status in DB
  return { success: true };
}
export async function rejectExpense(
  cmd: import("./contracts/commands").RejectExpenseCommand
): Promise<{ success: boolean }> {
  // TODO: persist rejection + notification
  return { success: true };
}
