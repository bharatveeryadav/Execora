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
exports.cancelInvoice = exports.updateInvoice = void 0;
/**
 * sales/invoicing/update-invoice-status
 *
 * Feature: update and cancel existing invoices.
 * Owner: sales domain
 * Write path: updateInvoice, cancelInvoice
 */
__exportStar(require("./contracts/commands"), exports);
var invoice_1 = require("../../invoice");
Object.defineProperty(exports, "updateInvoice", { enumerable: true, get: function () { return invoice_1.updateInvoice; } });
Object.defineProperty(exports, "cancelInvoice", { enumerable: true, get: function () { return invoice_1.cancelInvoice; } });
//# sourceMappingURL=index.js.map