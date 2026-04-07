/**
 * sales/invoicing/create-invoice
 *
 * Feature: create, preview, and confirm sales invoices.
 * Owner: sales domain
 * Write path: createInvoice (draft→confirmed) | previewInvoice (temporary)
 * Read path: getInvoiceById, getRecentInvoices, getCustomerInvoices, getDailySummary
 */
export * from "./contracts/commands";
export * from "./contracts/queries";
export * from "./contracts/dto";
// ── implementation ─────────────────────────────────────────────────────────
export {
  createInvoice,
  previewInvoice,
  confirmInvoice,
  convertProformaToInvoice,
  savePdfUrl,
  dispatchInvoicePdfEmail,
  getInvoiceById,
  getRecentInvoices,
  getCustomerInvoices,
  getLastInvoice,
  getLastOrder,
  getTopSelling,
  getSummaryRange,
  getDailySummary,
} from "../../invoice";
export type { InvoiceOptions } from "../../invoice";
export type { CreateInvoiceInput, CreateInvoiceResult } from "../types";
