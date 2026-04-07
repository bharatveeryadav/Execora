export interface AllocatePaymentCommand {
  tenantId: string;
  paymentId: string;
  invoiceId: string;
  amount: number;
}
export interface AllocationResult {
  paymentId: string;
  invoiceId: string;
  allocatedAmount: number;
  remainingBalance: number;
}
