/** Commands for finance/payments/settlement */
export interface AddCreditCommand { tenantId: string; customerId: string; amount: number; note?: string; }
export interface ReversePaymentCommand { tenantId: string; paymentId: string; reason?: string; }
