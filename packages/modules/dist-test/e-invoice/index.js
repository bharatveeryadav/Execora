"use strict";
/**
 * E-Invoice Module
 *
 * Covers: GST rate calculation (CGST/SGST/IGST), supply-type determination,
 * GSTR-1 report generation (B2B, B2CL, B2CS, HSN summary), P&L comparison,
 * Indian financial year helpers, and state-code lookup.
 *
 * Surfaces:
 *  - gstService            → tax calculation singleton
 *  - GST_SLABS / KIRANA_GST_RATES → constant tables
 *  - INDIAN_STATE_CODES    → GSTIN state prefix map
 *  - getIndianFY / indianFYRange   → FY date helpers
 *  - Gstr1* types / PnlReport → report shape interfaces
 */
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
// ── GST calculation & tax service ────────────────────────────────────────────
__exportStar(require("../modules/gst/gst.service"), exports);
// Note: gstr1.service (GSTR-1 reports + P&L) is exported from the accounting module
//# sourceMappingURL=index.js.map