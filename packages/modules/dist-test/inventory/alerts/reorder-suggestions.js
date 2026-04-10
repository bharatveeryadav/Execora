"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listReorderCandidates = void 0;
/**
 * inventory/alerts/reorder-suggestions
 *
 * Feature: AI-driven reorder suggestions — stub ready for agent mode wiring.
 * Based on low-stock list + historical velocity. Planned: Mode 3 (Agent).
 *
 * Until agents are wired, delegates to the low-stock query as a starting point.
 */
var item_catalog_1 = require("../stock/item-catalog");
Object.defineProperty(exports, "listReorderCandidates", { enumerable: true, get: function () { return item_catalog_1.getLowStockProducts; } });
//# sourceMappingURL=reorder-suggestions.js.map