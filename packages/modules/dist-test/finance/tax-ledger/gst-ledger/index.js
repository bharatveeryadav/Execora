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
exports.gstr1Service = void 0;
exports.getGstLedger = getGstLedger;
/**
 * finance/tax-ledger/gst-ledger
 *
 * Feature: GST ledger — running account of GST collected vs paid.
 * Derives from gstr1Service data (⏳ full ledger implementation pending).
 */
__exportStar(require("./contracts/queries"), exports);
var gstr1_service_1 = require("../../../accounting/gst/gstr1.service");
Object.defineProperty(exports, "gstr1Service", { enumerable: true, get: function () { return gstr1_service_1.gstr1Service; } });
async function getGstLedger(tenantId, period) {
    return {
        tenantId,
        period,
        entries: [],
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 0,
        totalCess: 0,
        netGstPayable: 0,
    };
}
//# sourceMappingURL=index.js.map