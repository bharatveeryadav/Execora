/**
 * sales/invoicing/update-invoice-status
 *
 * Feature: update and cancel existing invoices.
 * Owner: sales domain
 * Write path: updateInvoice, cancelInvoice
 */
export * from "./contracts/commands";
export { updateInvoice, cancelInvoice } from "../../invoice";
