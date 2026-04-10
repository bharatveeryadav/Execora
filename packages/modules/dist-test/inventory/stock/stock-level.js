"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeOffBatch = exports.listProductsPaginated = exports.getProductById = exports.updateProductStock = void 0;
/**
 * inventory/stock/stock-level
 *
 * Feature: read and adjust stock levels for individual products.
 * Source of truth: inventory/product.service.ts + sales/invoice.ts (stock side-effects)
 */
var item_catalog_1 = require("./item-catalog");
Object.defineProperty(exports, "updateProductStock", { enumerable: true, get: function () { return item_catalog_1.updateProductStock; } });
Object.defineProperty(exports, "getProductById", { enumerable: true, get: function () { return item_catalog_1.getProductById; } });
Object.defineProperty(exports, "listProductsPaginated", { enumerable: true, get: function () { return item_catalog_1.listProductsPaginated; } });
var batch_tracking_1 = require("./batch-tracking");
Object.defineProperty(exports, "writeOffBatch", { enumerable: true, get: function () { return batch_tracking_1.writeOffBatch; } });
//# sourceMappingURL=stock-level.js.map