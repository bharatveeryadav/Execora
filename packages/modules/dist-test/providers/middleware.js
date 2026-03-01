"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.withProvider = withProvider;
exports.reportProviderAvailability = reportProviderAvailability;
const infrastructure_1 = require("@execora/infrastructure");
const infrastructure_2 = require("@execora/infrastructure");
const errors_1 = require("./errors");
// ─── Default retry predicate ──────────────────────────────────────────────────
const RETRYABLE_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND']);
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
function defaultIsRetryable(err) {
    if (err instanceof errors_1.ProviderUnavailableError)
        return false; // don't retry — provider is misconfigured
    if (err instanceof Error) {
        const code = err.code;
        if (code && RETRYABLE_CODES.has(code))
            return true;
    }
    const status = err?.response?.status ?? err?.status;
    if (status && RETRYABLE_STATUS.has(status))
        return true;
    return false;
}
// ─── Request counter map ──────────────────────────────────────────────────────
function getRequestCounter(type) {
    if (type === 'stt')
        return infrastructure_2.sttRequestsTotal;
    if (type === 'tts')
        return infrastructure_2.ttsRequestsTotal;
    // LLM requests are recorded at the model+intent level in llmRequestsTotal — not duplicated here
    return null;
}
// ─── Main wrapper ─────────────────────────────────────────────────────────────
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
async function withProvider(opts, fn) {
    const { provider, providerType, operation, histogram, maxRetries = 0, isRetryable = defaultIsRetryable, } = opts;
    const counter = getRequestCounter(providerType);
    const startMs = Date.now();
    let lastErr;
    const totalAttempts = maxRetries + 1;
    for (let attempt = 0; attempt < totalAttempts; attempt++) {
        if (attempt > 0) {
            const delayMs = Math.min(200 * Math.pow(2, attempt - 1), 5_000);
            infrastructure_1.logger.warn({ provider, operation, attempt, delayMs }, 'Provider call failed — retrying');
            await sleep(delayMs);
        }
        try {
            const result = await fn();
            const durationSec = (Date.now() - startMs) / 1000;
            // ── Success metrics ──
            histogram?.observe({ provider }, durationSec);
            counter?.inc({ provider, operation, status: 'success' });
            infrastructure_2.providerAvailability.set({ provider, type: providerType }, 1);
            if (attempt > 0) {
                infrastructure_1.logger.info({ provider, operation, attempt }, 'Provider call succeeded after retry');
            }
            return result;
        }
        catch (err) {
            lastErr = err;
            const shouldRetry = attempt < totalAttempts - 1 && isRetryable(err);
            if (!shouldRetry)
                break;
        }
    }
    // ── Failure metrics ──
    const durationSec = (Date.now() - startMs) / 1000;
    histogram?.observe({ provider }, durationSec);
    counter?.inc({ provider, operation, status: 'error' });
    infrastructure_2.errorCounter.inc({ service: provider, type: operation });
    infrastructure_1.logger.error({ provider, operation, error: lastErr instanceof Error ? lastErr.message : String(lastErr) }, 'Provider call failed');
    // Normalise into ProviderError (pass through if already one)
    throw lastErr instanceof errors_1.ProviderError || lastErr instanceof errors_1.ProviderUnavailableError
        ? lastErr
        : new errors_1.ProviderError(provider, operation, lastErr);
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Record provider availability at startup / on config change.
 * Call once per provider when the service is initialized.
 */
function reportProviderAvailability(provider, type, available) {
    infrastructure_2.providerAvailability.set({ provider, type }, available ? 1 : 0);
}
//# sourceMappingURL=middleware.js.map