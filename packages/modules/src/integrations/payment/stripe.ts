/**
 * integrations/payment/stripe
 *
 * Feature: Stripe payment intent integration.
 * Used for international / export customers.
 * Stub — configure STRIPE_SECRET_KEY in env (⏳).
 */
export interface StripePaymentIntentInput {
  amount: number; /** in smallest currency unit (paise for INR) */
  currency: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
}
export interface StripePaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}
export async function createStripePaymentIntent(
  _input: StripePaymentIntentInput
): Promise<StripePaymentIntent> {
  throw new Error("Stripe not configured. Set STRIPE_SECRET_KEY.");
}
