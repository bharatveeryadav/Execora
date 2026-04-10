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
export declare function createCashfreeOrder(_input: CashfreeOrderInput): Promise<CashfreeOrderResult>;
export declare function verifyCashfreePayment(_cfOrderId: string): Promise<{
    status: string;
    amount: number;
} | null>;
//# sourceMappingURL=cashfree.d.ts.map