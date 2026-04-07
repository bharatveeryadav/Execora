/**
 * reporting/finance-reports/payment-velocity
 *
 * READ-ONLY. Average days-to-pay and collection rate per customer.
 * Source of truth: accounting/reports/payment-velocity.ts
 */
export type { PaymentVelocityReport } from "../../../accounting/reports/types";
export { getPaymentVelocityReport } from "../../../accounting/reports/payment-velocity";
