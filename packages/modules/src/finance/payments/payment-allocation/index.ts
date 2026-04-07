/**
 * finance/payments/payment-allocation
 *
 * Feature: link incoming payments to specific invoices.
 * This is a planned feature (⏳). Stub exposes types; full logic TBD.
 */
export * from "./contracts/commands";
export async function allocatePaymentToInvoice(
  cmd: import("./contracts/commands").AllocatePaymentCommand
): Promise<import("./contracts/commands").AllocationResult> {
  // TODO: Implement full payment allocation logic
  return {
    paymentId: cmd.paymentId,
    invoiceId: cmd.invoiceId,
    allocatedAmount: cmd.amount,
    remainingBalance: 0,
  };
}
