/**
 * sales/invoicing/numbering
 *
 * Feature: invoice series management — one canonical numbering path for all
 * invoice types. All series resets happen here per financial year.
 * Owner: sales domain
 * Source of truth: sales/invoice.ts
 * NOTE: generateInvoiceNo is internal to createInvoice; public contract
 *       is via createInvoice which handles numbering automatically.
 *       This module surfaces the invoice query functions as the public API.
 *
 * Read path: getLastInvoice (last invoice by tenant), getInvoiceById
 */
export { getLastInvoice, getLastOrder, getRecentInvoices } from "../../invoice";
