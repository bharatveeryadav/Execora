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

// ── Purchase orders ───────────────────────────────────────────────────────────
export * from "./purchase/purchase-order";

// ── Vendor management ─────────────────────────────────────────────────────────
export * from "./vendors/supplier-profile";

// ── OCR (scan supplier bills → auto-create POs) ──────────────────────────────
export * from "./ocr/document-upload";
export * from "./ocr/extraction";
export * from "./purchase/purchase-bill";
export * from "./purchase/purchase-return";
export * from "./vendors/vendor-ledger";
export * from "./vendors/vendor-ageing";
export * from "./vendors/preferred-vendors";
export * from "./ocr/review-correction";
export * from "./ocr/transaction-linking";
export * from "./ocr/normalization";
export * from "./ocr/gst-extractor";
export * from "./ai-analytics/demand-forecasting";
