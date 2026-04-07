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
export async function getCacheStats(): Promise<CacheStats> {
  return { keyCount: 0, hitRate: 0, missRate: 0, memoryUsedMb: 0 };
}
export async function flushCache(_prefix?: string): Promise<number> {
  return 0;
}
