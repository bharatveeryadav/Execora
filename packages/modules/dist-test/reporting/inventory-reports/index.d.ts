/**
 * reporting/inventory-reports
 *
 * Aggregates all inventory report sub-modules.
 * Note: selective exports from low-overstock avoid getLowStockProducts
 * duplicate (already in stock-report).
 */
export * from "./stock-report";
export * from "./fast-slow-movement";
export * from "./valuation";
export * from "./movement-ledger";
export { StockAlertType, StockAlertRow, getLowOverstockReport } from "./low-overstock";
export * from "./ageing";
export * from "./batch-expiry";
//# sourceMappingURL=index.d.ts.map