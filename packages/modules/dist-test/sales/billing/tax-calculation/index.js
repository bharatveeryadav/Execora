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
exports.KIRANA_GST_RATES = exports.GST_SLABS = exports.gstService = void 0;
/**
 * sales/billing/tax-calculation
 *
 * Feature: GST rate computation (CGST/SGST/IGST splits) for invoice line items.
 * Owner: sales/billing domain (modules/gst/gst.service is the source of truth)
 * Read path: gstService.computeLineItem, gstService.computeTotals
 */
__exportStar(require("./contracts/dto"), exports);
var gst_service_1 = require("../../../modules/gst/gst.service");
Object.defineProperty(exports, "gstService", { enumerable: true, get: function () { return gst_service_1.gstService; } });
Object.defineProperty(exports, "GST_SLABS", { enumerable: true, get: function () { return gst_service_1.GST_SLABS; } });
Object.defineProperty(exports, "KIRANA_GST_RATES", { enumerable: true, get: function () { return gst_service_1.KIRANA_GST_RATES; } });
//# sourceMappingURL=index.js.map