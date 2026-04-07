export interface ApproveExpenseCommand {
  tenantId: string;
  expenseId: string;
  approverId: string;
  note?: string;
}
export interface RejectExpenseCommand {
  tenantId: string;
  expenseId: string;
  approverId: string;
  reason: string;
}
