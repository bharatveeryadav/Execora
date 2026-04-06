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

// ── Stock catalog flat functions + types ──────────────────────────────────────
// Re-exports from inventory/product.ts + inventory/stock/types.ts
export * from "./stock/item-catalog";

// ── ProductService — pagination, low-stock, expiry, variant management ────────
export * from "../modules/product/product.service";
