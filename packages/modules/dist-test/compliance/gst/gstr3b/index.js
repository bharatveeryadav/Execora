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
exports.generateGstr3B = generateGstr3B;
/**
 * compliance/gst/gstr3b
 *
 * Feature: GSTR-3B monthly summary return.
 * Derives figures from gstr1Service data.  Full submission flow is ⏳.
 */
__exportStar(require("./contracts/dto"), exports);
var gstr1_1 = require("../../gst/gstr1");
Object.defineProperty(exports, "gstr1Service", { enumerable: true, get: function () { return gstr1_1.gstr1Service; } });
async function generateGstr3B(tenantId, period) {
    const empty = () => ({ taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 });
    return {
        tenantId,
        period,
        outwardSupplies: empty(),
        zeroRatedSupplies: empty(),
        inwardSupplies: empty(),
        itcEligible: empty(),
        netTaxPayable: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
        interestLateFee: { interest: 0, lateFee: 0 },
    };
}
//# sourceMappingURL=index.js.map