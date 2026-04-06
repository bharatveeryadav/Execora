"use strict";
/**
 * Inventory / Stock — product and stock-level operations.
 * Re-exports from the canonical flat domain file (inventory/product.ts).
 * Kept for backwards-compatibility with any existing imports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpiryPage = exports.getExpiringBatches = exports.getLowStockProducts = exports.listProductsPaginated = exports.listProducts = exports.searchProducts = exports.getProductById = exports.writeOffBatch = exports.updateProductStock = exports.updateProduct = exports.createProduct = void 0;
var product_1 = require("../product");
Object.defineProperty(exports, "createProduct", { enumerable: true, get: function () { return product_1.createProduct; } });
Object.defineProperty(exports, "updateProduct", { enumerable: true, get: function () { return product_1.updateProduct; } });
Object.defineProperty(exports, "updateProductStock", { enumerable: true, get: function () { return product_1.updateProductStock; } });
Object.defineProperty(exports, "writeOffBatch", { enumerable: true, get: function () { return product_1.writeOffBatch; } });
Object.defineProperty(exports, "getProductById", { enumerable: true, get: function () { return product_1.getProductById; } });
Object.defineProperty(exports, "searchProducts", { enumerable: true, get: function () { return product_1.searchProducts; } });
Object.defineProperty(exports, "listProducts", { enumerable: true, get: function () { return product_1.listProducts; } });
Object.defineProperty(exports, "listProductsPaginated", { enumerable: true, get: function () { return product_1.listProductsPaginated; } });
Object.defineProperty(exports, "getLowStockProducts", { enumerable: true, get: function () { return product_1.getLowStockProducts; } });
Object.defineProperty(exports, "getExpiringBatches", { enumerable: true, get: function () { return product_1.getExpiringBatches; } });
Object.defineProperty(exports, "getExpiryPage", { enumerable: true, get: function () { return product_1.getExpiryPage; } });
//# sourceMappingURL=item-catalog.js.map