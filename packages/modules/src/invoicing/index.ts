/**
 * Invoicing Module
 *
 * Covers: sales invoices (proforma → confirmed → PDF → dispatch), credit notes,
 * purchase orders, supplier management, customer lifecycle, and payment reminders.
 *
 * Surfaces:
 *  - createInvoice / previewInvoice / confirmInvoice / updateInvoice / cancelInvoice
 *  - dispatchInvoicePdfEmail / savePdfUrl
 *  - createCreditNote / issueCreditNote / cancelCreditNote
 *  - createPurchaseOrder / receivePurchaseOrder / cancelPurchaseOrder
 *  - createSupplier / listSuppliers / getSupplierById
 *  - createCustomer / updateCustomer / searchCustomers / listCustomers
 *  - invoiceService / customerService / reminderService   — singleton classes
 */

// ── Sales invoices (flat functions + CreateInvoiceInput / InvoiceOptions types) ─
// Re-exports everything from sales/invoice.ts via the compat wrapper
export * from "../sales/invoicing/create-invoice";

// ── Credit notes ──────────────────────────────────────────────────────────────
export * from "../sales/credit-notes/credit-note";

// ── Purchase orders ───────────────────────────────────────────────────────────
export * from "../purchases/purchase/purchase-order";

// ── Suppliers ─────────────────────────────────────────────────────────────────
export * from "../purchases/vendors/supplier-profile";

// ── Customers (flat functions + types) ────────────────────────────────────────
// Re-exports everything from crm/customer.ts via the compat wrapper
export * from "../crm/parties/customer-profile";

// ── Service singletons ────────────────────────────────────────────────────────
export * from "../modules/invoice/invoice.service";
export * from "../modules/customer/customer.service";
export * from "../modules/reminder/reminder.service";
