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
exports.getLowOverstockReport = void 0;
/**
 * reporting/inventory-reports
 *
 * Aggregates all inventory report sub-modules.
 * Note: selective exports from low-overstock avoid getLowStockProducts
 * duplicate (already in stock-report).
 */
__exportStar(require("./stock-report"), exports);
__exportStar(require("./fast-slow-movement"), exports);
__exportStar(require("./valuation"), exports);
__exportStar(require("./movement-ledger"), exports);
var low_overstock_1 = require("./low-overstock");
Object.defineProperty(exports, "getLowOverstockReport", { enumerable: true, get: function () { return low_overstock_1.getLowOverstockReport; } });
__exportStar(require("./ageing"), exports);
__exportStar(require("./batch-expiry"), exports);
//# sourceMappingURL=index.js.map