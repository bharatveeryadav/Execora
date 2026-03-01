/**
 * Provider Middleware — centralized observability, error handling, and retry.
 *
 * All STT/TTS/LLM service methods wrap adapter calls through this module so:
 * - Latency is recorded to the appropriate Prometheus histogram
 * - Request counts (success/failure) are tracked
 * - Errors are normalized into ProviderError
 * - Transient failures are retried with exponential backoff
 * - Provider availability gauge is updated on every call
 */
import type promClient from 'prom-client';
export type ProviderType = 'llm' | 'stt' | 'tts';
export interface ProviderCallOptions {
    provider: string;
    providerType: ProviderType;
    operation: string;
    /** Prometheus histogram to record latency into (seconds) */
    histogram?: promClient.Histogram<string>;
    /**
     * Number of additional attempts on transient failure (0 = no retry).
     * Retries use exponential backoff: 200ms, 400ms, 800ms…
     */
    maxRetries?: number;
    /**
     * A function that receives an error and returns true when the call
     * should be retried (e.g., network timeout, 429 rate-limit).
     * Defaults to retrying on network errors and HTTP 429/500/503.
     */
    isRetryable?: (err: unknown) => boolean;
}
/**
 * Wrap an async provider adapter call with full observability and retry.
 *
 * @example
 * ```ts
 * const transcript = await withProvider(
 *   { provider: 'deepgram', providerType: 'stt', operation: 'transcribe', histogram: sttProcessingTime, maxRetries: 1 },
 *   () => adapter.transcribeAudio(buffer, mimeType),
 * );
 * ```
 */
export declare function withProvider<T>(opts: ProviderCallOptions, fn: () => Promise<T>): Promise<T>;
/**
 * Record provider availability at startup / on config change.
 * Call once per provider when the service is initialized.
 */
export declare function reportProviderAvailability(provider: string, type: ProviderType, available: boolean): void;
//# sourceMappingURL=middleware.d.ts.map