/** Commands for finance/payments/payment-out */
export interface PaymentOutCommand {
  tenantId: string;
  partyId: string;
  amount: number;
  paymentDate: string;
  method: "cash" | "bank" | "upi";
  reference?: string;
  note?: string;
}
