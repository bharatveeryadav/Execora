"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverstockAlerts = exports.getLowStockProducts = void 0;
exports.getLowOverstockReport = getLowOverstockReport;
/**
 * reporting/inventory-reports/low-overstock
 *
 * Feature: combined low/overstock report — products outside safe stock range.
 * Source: inventory/alerts/low-stock.ts + inventory/alerts/overstock.ts
 */
var low_stock_1 = require("../../../inventory/alerts/low-stock");
Object.defineProperty(exports, "getLowStockProducts", { enumerable: true, get: function () { return low_stock_1.getLowStockProducts; } });
var overstock_1 = require("../../../inventory/alerts/overstock");
Object.defineProperty(exports, "getOverstockAlerts", { enumerable: true, get: function () { return overstock_1.getOverstockAlerts; } });
async function getLowOverstockReport(_tenantId) {
    return [];
}
//# sourceMappingURL=index.js.map