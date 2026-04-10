"use strict";
/**
 * Inventory Module
 *
 * Covers: product catalog, stock levels, batch tracking, serial numbers,
 * low-stock alerts, expiry management, and stock write-offs.
 *
 * Surfaces:
 *  - Flat async functions  → item-catalog (create/update/search/list/stock ops)
 *  - productService        → singleton class with advanced stock queries
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
exports.listReorderCandidates = void 0;
// ── stock/item-catalog ─────────────────────────────────────────────────────────
// Product CRUD, search, list, paginated query.
__exportStar(require("./stock/item-catalog"), exports);
// ── stock/batch-tracking ───────────────────────────────────────────────────────
// Batch write-offs, expiry listing, expiry page query.
__exportStar(require("./stock/batch-tracking"), exports);
// ── alerts/low-stock ──────────────────────────────────────────────────────────
// Lists products below reorder threshold.
__exportStar(require("./alerts/low-stock"), exports);
// ── alerts/reorder-suggestions ────────────────────────────────────────────────
// Reorder candidates (stub; Mode 3 agent wiring planned).
var reorder_suggestions_1 = require("./alerts/reorder-suggestions");
Object.defineProperty(exports, "listReorderCandidates", { enumerable: true, get: function () { return reorder_suggestions_1.listReorderCandidates; } });
// ── ProductService — pagination, low-stock, expiry, variant management ────────
__exportStar(require("./product.service"), exports);
__exportStar(require("./stock/stock-level"), exports);
__exportStar(require("./stock/bulk-update"), exports);
__exportStar(require("./stock/reservations"), exports);
__exportStar(require("./stock/valuation"), exports);
__exportStar(require("./warehouse/locations"), exports);
__exportStar(require("./warehouse/transfer-request"), exports);
__exportStar(require("./warehouse/location-policy"), exports);
__exportStar(require("./movement/inward"), exports);
__exportStar(require("./movement/outward"), exports);
__exportStar(require("./movement/transfer-ledger"), exports);
__exportStar(require("./batch/serial-number"), exports);
__exportStar(require("./barcode/generator"), exports);
__exportStar(require("./barcode/scanner"), exports);
__exportStar(require("./barcode/label-printing"), exports);
__exportStar(require("./alerts/overstock"), exports);
__exportStar(require("./alerts/expiry-alerts"), exports);
__exportStar(require("./stock/adjustments"), exports);
//# sourceMappingURL=index.js.map