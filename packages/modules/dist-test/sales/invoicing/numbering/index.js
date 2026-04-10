"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentInvoices = exports.getLastOrder = exports.getLastInvoice = void 0;
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
var invoice_1 = require("../../invoice");
Object.defineProperty(exports, "getLastInvoice", { enumerable: true, get: function () { return invoice_1.getLastInvoice; } });
Object.defineProperty(exports, "getLastOrder", { enumerable: true, get: function () { return invoice_1.getLastOrder; } });
Object.defineProperty(exports, "getRecentInvoices", { enumerable: true, get: function () { return invoice_1.getRecentInvoices; } });
//# sourceMappingURL=index.js.map