"use strict";
/**
 * Purchases Domain
 *
 * Covers all vendor-side procurement: purchase orders, supplier profiles,
 * and incoming document scanning via OCR.
 *
 * Sub-domains (per 02-domain-modules.md):
 *  - purchase: purchase-order (PO lifecycle)
 *  - vendors: supplier-profile (vendor CRUD)
 *  - ocr: document-upload, extraction (AI-powered bill scanning)
 *
 * Dependency rule: may import from inventory for stock updates.
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
// ── Purchase orders ───────────────────────────────────────────────────────────
__exportStar(require("./purchase/purchase-order"), exports);
// ── Vendor management ─────────────────────────────────────────────────────────
__exportStar(require("./vendors/supplier-profile"), exports);
// ── OCR (scan supplier bills → auto-create POs) ──────────────────────────────
__exportStar(require("./ocr/document-upload"), exports);
__exportStar(require("./ocr/extraction"), exports);
__exportStar(require("./purchase/purchase-bill"), exports);
__exportStar(require("./purchase/purchase-return"), exports);
__exportStar(require("./vendors/vendor-ledger"), exports);
__exportStar(require("./vendors/vendor-ageing"), exports);
__exportStar(require("./vendors/preferred-vendors"), exports);
__exportStar(require("./ocr/review-correction"), exports);
__exportStar(require("./ocr/transaction-linking"), exports);
__exportStar(require("./ocr/normalization"), exports);
__exportStar(require("./ocr/gst-extractor"), exports);
__exportStar(require("./ai-analytics/demand-forecasting"), exports);
//# sourceMappingURL=index.js.map