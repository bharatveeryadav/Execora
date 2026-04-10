/**
 * platform/subscription/billing-engine
 *
 * Feature: subscription billing — generate subscription invoices, handle upgrades/downgrades.
 */
export interface SubscriptionInvoice {
    id: string;
    tenantId: string;
    planId: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
    status: "pending" | "paid" | "failed" | "void";
}
export declare function generateSubscriptionInvoice(_tenantId: string, _planId: string): Promise<SubscriptionInvoice>;
export declare function getSubscriptionInvoices(_tenantId: string): Promise<SubscriptionInvoice[]>;
//# sourceMappingURL=index.d.ts.map