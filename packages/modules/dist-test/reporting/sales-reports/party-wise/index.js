"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLastInvoice = exports.getCustomerInvoices = void 0;
exports.getPartyWiseSalesReport = getPartyWiseSalesReport;
/**
 * reporting/sales-reports/party-wise
 *
 * Feature: party-wise sales analysis — top customers by revenue, frequency.
 * Source: sales/invoice.ts → getCustomerInvoices
 */
var invoice_1 = require("../../../sales/invoice");
Object.defineProperty(exports, "getCustomerInvoices", { enumerable: true, get: function () { return invoice_1.getCustomerInvoices; } });
Object.defineProperty(exports, "getLastInvoice", { enumerable: true, get: function () { return invoice_1.getLastInvoice; } });
async function getPartyWiseSalesReport(_tenantId, _dateRange) {
    return [];
}
//# sourceMappingURL=index.js.map