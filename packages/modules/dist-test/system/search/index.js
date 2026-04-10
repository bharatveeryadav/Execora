"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSamePerson = exports.findAllMatches = exports.findBestMatch = exports.matchIndianName = void 0;
exports.globalSearch = globalSearch;
/**
 * system/search
 *
 * Feature: full-text / fuzzy search across invoices, products, customers.
 * Source: utils/fuzzy-match.ts for name matching; DB ILIKE for cross-entity.
 */
var fuzzy_match_1 = require("../../utils/fuzzy-match");
Object.defineProperty(exports, "matchIndianName", { enumerable: true, get: function () { return fuzzy_match_1.matchIndianName; } });
Object.defineProperty(exports, "findBestMatch", { enumerable: true, get: function () { return fuzzy_match_1.findBestMatch; } });
Object.defineProperty(exports, "findAllMatches", { enumerable: true, get: function () { return fuzzy_match_1.findAllMatches; } });
Object.defineProperty(exports, "isSamePerson", { enumerable: true, get: function () { return fuzzy_match_1.isSamePerson; } });
async function globalSearch(_tenantId, _query, _limit = 20) {
    return [];
}
//# sourceMappingURL=index.js.map