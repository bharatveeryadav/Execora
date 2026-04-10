import type { PaymentVelocityReport } from "./types";
/**
 * Generate the payment velocity report.
 *
 * For each customer that had invoices in the date range:
 * - counts total invoices vs paid invoices
 * - averages calendar-days from invoiceDate to the first related payment's
 *   receivedAt (uses invoice.paidAt if no direct payment link)
 * - derives collectionRate = paidCount / invoiceCount × 100
 *
 * @param tenantId  Tenant scope
 * @param from      Start of analysis window (inclusive)
 * @param to        End of analysis window (inclusive)
 */
export declare function getPaymentVelocityReport(tenantId: string, from: Date, to: Date): Promise<PaymentVelocityReport>;
//# sourceMappingURL=payment-velocity.d.ts.map