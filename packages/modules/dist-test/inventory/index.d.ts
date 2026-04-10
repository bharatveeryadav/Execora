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
export * from "./stock/item-catalog";
export * from "./stock/batch-tracking";
export * from "./alerts/low-stock";
export { listReorderCandidates } from "./alerts/reorder-suggestions";
export * from "./product.service";
export * from "./stock/stock-level";
export * from "./stock/bulk-update";
export * from "./stock/reservations";
export * from "./stock/valuation";
export * from "./warehouse/locations";
export * from "./warehouse/transfer-request";
export * from "./warehouse/location-policy";
export * from "./movement/inward";
export * from "./movement/outward";
export * from "./movement/transfer-ledger";
export * from "./batch/serial-number";
export * from "./barcode/generator";
export * from "./barcode/scanner";
export * from "./barcode/label-printing";
export * from "./alerts/overstock";
export * from "./alerts/expiry-alerts";
export * from "./stock/adjustments";
//# sourceMappingURL=index.d.ts.map