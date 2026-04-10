"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopSelling = void 0;
exports.classifyProductMovement = classifyProductMovement;
/**
 * reporting/inventory-reports/fast-slow-movement
 *
 * Feature: classify products as fast-moving / slow-moving based on sales velocity.
 * Source: getTopSelling (sales/invoice.ts) + stock data.
 */
var invoice_1 = require("../../../sales/invoice");
Object.defineProperty(exports, "getTopSelling", { enumerable: true, get: function () { return invoice_1.getTopSelling; } });
async function classifyProductMovement(_tenantId, _dateRange) {
    return [];
}
//# sourceMappingURL=index.js.map