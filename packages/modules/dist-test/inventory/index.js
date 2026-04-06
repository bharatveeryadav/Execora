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
// ── Stock catalog flat functions + types ──────────────────────────────────────
// Re-exports from inventory/product.ts + inventory/stock/types.ts
__exportStar(require("./stock/item-catalog"), exports);
// ── ProductService — pagination, low-stock, expiry, variant management ────────
__exportStar(require("../modules/product/product.service"), exports);
//# sourceMappingURL=index.js.map