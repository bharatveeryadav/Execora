/**
 * system/cache
 *
 * Feature: cache management — view cache keys, flush stale entries.
 * Source: LLM cache (utils/llm-cache.ts) + Redis cache.
 */
export { llmCache } from "../../utils/llm-cache";
export interface CacheStats {
    keyCount: number;
    hitRate: number;
    missRate: number;
    memoryUsedMb: number;
}
export declare function getCacheStats(): Promise<CacheStats>;
export declare function flushCache(_prefix?: string): Promise<number>;
//# sourceMappingURL=index.d.ts.map