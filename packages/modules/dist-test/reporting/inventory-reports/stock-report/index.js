"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProductsPaginated = exports.getExpiryPage = exports.getExpiringBatches = exports.getLowStockProducts = void 0;
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
var item_catalog_1 = require("../../../inventory/stock/item-catalog");
Object.defineProperty(exports, "getLowStockProducts", { enumerable: true, get: function () { return item_catalog_1.getLowStockProducts; } });
Object.defineProperty(exports, "getExpiringBatches", { enumerable: true, get: function () { return item_catalog_1.getExpiringBatches; } });
Object.defineProperty(exports, "getExpiryPage", { enumerable: true, get: function () { return item_catalog_1.getExpiryPage; } });
Object.defineProperty(exports, "listProductsPaginated", { enumerable: true, get: function () { return item_catalog_1.listProductsPaginated; } });
//# sourceMappingURL=index.js.map