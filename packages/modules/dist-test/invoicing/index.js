"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// ── Sales invoices (flat functions + CreateInvoiceInput / InvoiceOptions types) ─
// Re-exports everything from sales/invoice.ts via the compat wrapper
__exportStar(require("../sales/invoicing/create-invoice"), exports);
// ── Credit notes ──────────────────────────────────────────────────────────────
// Note: credit-notes are exported from the accounting module
// ── Purchase orders ───────────────────────────────────────────────────────────
__exportStar(require("../purchases/purchase/purchase-order"), exports);
// ── Suppliers ─────────────────────────────────────────────────────────────────
__exportStar(require("../purchases/vendors/supplier-profile"), exports);
// ── Customers (flat functions + types) ────────────────────────────────────────
// Re-exports everything from crm/customer.ts via the compat wrapper
__exportStar(require("../crm/parties/customer-profile"), exports);
// ── Service singletons ────────────────────────────────────────────────────────
__exportStar(require("../modules/invoice/invoice.service"), exports);
__exportStar(require("../modules/customer/customer.service"), exports);
__exportStar(require("../modules/reminder/reminder.service"), exports);
//# sourceMappingURL=index.js.map