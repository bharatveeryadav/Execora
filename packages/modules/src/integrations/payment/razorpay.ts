/**
 * integrations/payment/razorpay
 *
 * Feature: Razorpay payment gateway integration.
 * Stub — configure RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET in env (⏳).
 */
export interface RazorpayOrderInput {
  amount: number; /** in paise (100 = ₹1) */
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}
export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: "created" | "attempted" | "paid";
  receipt?: string;
}
export async function createRazorpayOrder(
  _input: RazorpayOrderInput
): Promise<RazorpayOrder> {
  throw new Error("Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
}
export async function verifyRazorpayPayment(
  _orderId: string,
  _paymentId: string,
  _signature: string
): Promise<boolean> {
  throw new Error("Razorpay not configured.");
}
