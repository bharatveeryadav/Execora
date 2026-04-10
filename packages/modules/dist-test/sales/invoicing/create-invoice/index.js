"use strict";
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
exports.getDailySummary = exports.getSummaryRange = exports.getTopSelling = exports.getLastOrder = exports.getLastInvoice = exports.getCustomerInvoices = exports.getRecentInvoices = exports.getInvoiceById = exports.dispatchInvoicePdfEmail = exports.savePdfUrl = exports.convertProformaToInvoice = exports.confirmInvoice = exports.previewInvoice = exports.createInvoice = void 0;
/**
 * sales/invoicing/create-invoice
 *
 * Feature: create, preview, and confirm sales invoices.
 * Owner: sales domain
 * Write path: createInvoice (draft→confirmed) | previewInvoice (temporary)
 * Read path: getInvoiceById, getRecentInvoices, getCustomerInvoices, getDailySummary
 */
__exportStar(require("./contracts/commands"), exports);
__exportStar(require("./contracts/queries"), exports);
__exportStar(require("./contracts/dto"), exports);
// ── implementation ─────────────────────────────────────────────────────────
var invoice_1 = require("../../invoice");
Object.defineProperty(exports, "createInvoice", { enumerable: true, get: function () { return invoice_1.createInvoice; } });
Object.defineProperty(exports, "previewInvoice", { enumerable: true, get: function () { return invoice_1.previewInvoice; } });
Object.defineProperty(exports, "confirmInvoice", { enumerable: true, get: function () { return invoice_1.confirmInvoice; } });
Object.defineProperty(exports, "convertProformaToInvoice", { enumerable: true, get: function () { return invoice_1.convertProformaToInvoice; } });
Object.defineProperty(exports, "savePdfUrl", { enumerable: true, get: function () { return invoice_1.savePdfUrl; } });
Object.defineProperty(exports, "dispatchInvoicePdfEmail", { enumerable: true, get: function () { return invoice_1.dispatchInvoicePdfEmail; } });
Object.defineProperty(exports, "getInvoiceById", { enumerable: true, get: function () { return invoice_1.getInvoiceById; } });
Object.defineProperty(exports, "getRecentInvoices", { enumerable: true, get: function () { return invoice_1.getRecentInvoices; } });
Object.defineProperty(exports, "getCustomerInvoices", { enumerable: true, get: function () { return invoice_1.getCustomerInvoices; } });
Object.defineProperty(exports, "getLastInvoice", { enumerable: true, get: function () { return invoice_1.getLastInvoice; } });
Object.defineProperty(exports, "getLastOrder", { enumerable: true, get: function () { return invoice_1.getLastOrder; } });
Object.defineProperty(exports, "getTopSelling", { enumerable: true, get: function () { return invoice_1.getTopSelling; } });
Object.defineProperty(exports, "getSummaryRange", { enumerable: true, get: function () { return invoice_1.getSummaryRange; } });
Object.defineProperty(exports, "getDailySummary", { enumerable: true, get: function () { return invoice_1.getDailySummary; } });
//# sourceMappingURL=index.js.map