/**
 * reporting/inventory-reports/stock-report
 *
 * Feature: inventory stock reports — low-stock alerts, expiry pages, batch aging.
 * READ-ONLY — no mutations.
 * Owner: reporting domain
 * Source of truth: inventory/stock/item-catalog (flat functions over ProductService)
 *
 * Read path:
 *   getLowStockProducts   → products below reorder threshold
 *   getExpiringBatches    → batches expiring within N days
 *   getExpiryPage         → paged expiry filter (expired | 7d | 30d | 90d | all)
 *   listProductsPaginated → full paginated product list
 */
export { getLowStockProducts, getExpiringBatches, getExpiryPage, listProductsPaginated, } from "../../../inventory/stock/item-catalog";
//# sourceMappingURL=index.d.ts.map