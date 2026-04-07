/**
 * finance/payments/payment-out
 *
 * Feature: outward payments — pay supplier/vendor, reverse payment.
 * Owner: finance domain
 * Source of truth: accounting/payment.ts
 *
 * Write path: reversePayment (record payment reversal / vendor payment)
 * Read path:  getCustomerLedger (via party ID — works for suppliers too)
 */
export * from "./contracts/commands";
export { reversePayment } from "../../payment";
