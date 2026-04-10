"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpiryPage = exports.getExpiringBatches = exports.writeOffBatch = void 0;
/**
 * inventory/stock/batch-tracking
 *
 * Feature: batch lifecycle — write-offs, expiry listing, expiry page.
 * Re-exports relevant functions from inventory/stock/item-catalog.
 */
var item_catalog_1 = require("./item-catalog");
Object.defineProperty(exports, "writeOffBatch", { enumerable: true, get: function () { return item_catalog_1.writeOffBatch; } });
Object.defineProperty(exports, "getExpiringBatches", { enumerable: true, get: function () { return item_catalog_1.getExpiringBatches; } });
Object.defineProperty(exports, "getExpiryPage", { enumerable: true, get: function () { return item_catalog_1.getExpiryPage; } });
//# sourceMappingURL=batch-tracking.js.map