"use strict";
/**
 * Compliance Domain
 *
 * Covers Indian GST regulatory requirements: GSTR-1 return data generation,
 * e-invoice IRN-ready tax computation, and filing export (PDF).
 *
 * Sub-domains (per 02-domain-modules.md):
 *  - gst: gstr1 (monthly/quarterly filing data), return-export (PDF)
 *  - e-invoicing: irn-generation (GST tax splits for line items)
 *
 * Dependency rule: read-only references to finance and sales data.
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
// ── GST compliance ────────────────────────────────────────────────────────────
__exportStar(require("./gst/gstr1"), exports);
__exportStar(require("./gst/return-export"), exports);
// ── E-invoicing ───────────────────────────────────────────────────────────────
__exportStar(require("./e-invoicing/irn-generation"), exports);
__exportStar(require("./gst/gstr3b"), exports);
__exportStar(require("./gst/schema-updates"), exports);
__exportStar(require("./e-invoicing/eligibility"), exports);
__exportStar(require("./e-invoicing/schema-builder"), exports);
__exportStar(require("./e-invoicing/irp-submission"), exports);
__exportStar(require("./e-invoicing/irn-lifecycle"), exports);
__exportStar(require("./e-invoicing/cancellation"), exports);
__exportStar(require("./e-invoicing/audit-records"), exports);
__exportStar(require("./ewaybill/eligibility"), exports);
__exportStar(require("./ewaybill/payload-builder"), exports);
__exportStar(require("./ewaybill/generation"), exports);
__exportStar(require("./ewaybill/status-sync"), exports);
__exportStar(require("./ewaybill/cancellation"), exports);
__exportStar(require("./gst/audit"), exports);
//# sourceMappingURL=index.js.map