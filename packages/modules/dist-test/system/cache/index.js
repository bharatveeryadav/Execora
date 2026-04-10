"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmCache = void 0;
exports.getCacheStats = getCacheStats;
exports.flushCache = flushCache;
/**
 * system/cache
 *
 * Feature: cache management — view cache keys, flush stale entries.
 * Source: LLM cache (utils/llm-cache.ts) + Redis cache.
 */
var llm_cache_1 = require("../../utils/llm-cache");
Object.defineProperty(exports, "llmCache", { enumerable: true, get: function () { return llm_cache_1.llmCache; } });
async function getCacheStats() {
    return { keyCount: 0, hitRate: 0, missRate: 0, memoryUsedMb: 0 };
}
async function flushCache(_prefix) {
    return 0;
}
//# sourceMappingURL=index.js.map