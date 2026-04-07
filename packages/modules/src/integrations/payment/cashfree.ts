/**
 * integrations/payment/cashfree
 *
 * Feature: Cashfree Payments integration (popular in India).
 * Stub — configure CASHFREE_APP_ID + CASHFREE_SECRET_KEY in env (⏳).
 */
export interface CashfreeOrderInput {
  orderId: string;
  orderAmount: number;
  orderCurrency?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  returnUrl: string;
  notifyUrl?: string;
}
export interface CashfreeOrderResult {
  cfOrderId: string;
  orderToken: string;
  orderStatus: string;
  paymentLink: string;
}
export async function createCashfreeOrder(
  _input: CashfreeOrderInput
): Promise<CashfreeOrderResult> {
  throw new Error("Cashfree not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY.");
}
export async function verifyCashfreePayment(
  _cfOrderId: string
): Promise<{ status: string; amount: number } | null> {
  throw new Error("Cashfree not configured.");
}
