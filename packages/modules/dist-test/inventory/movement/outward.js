"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelInvoice = void 0;
/**
 * inventory/movement/outward
 *
 * Feature: record goods dispatched — stock outward movement.
 * Normally triggered by invoice confirmation; also manual dispatch.
 * Read path: getRecentInvoices, getCustomerInvoices for outward audit trail.
 */
var invoice_1 = require("../../sales/invoice");
Object.defineProperty(exports, "cancelInvoice", { enumerable: true, get: function () { return invoice_1.cancelInvoice; } });
//# sourceMappingURL=outward.js.map