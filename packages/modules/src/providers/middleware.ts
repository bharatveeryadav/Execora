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
import { logger } from '@execora/infrastructure';
import {
  errorCounter,
  sttRequestsTotal,
  ttsRequestsTotal,
  llmRequestsTotal,
  providerAvailability,
} from '@execora/infrastructure';
import { ProviderError, ProviderUnavailableError } from './errors';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Default retry predicate ──────────────────────────────────────────────────

const RETRYABLE_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND']);
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function defaultIsRetryable(err: unknown): boolean {
  if (err instanceof ProviderUnavailableError) return false; // don't retry — provider is misconfigured
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code && RETRYABLE_CODES.has(code)) return true;
  }
  const status = (err as any)?.response?.status ?? (err as any)?.status;
  if (status && RETRYABLE_STATUS.has(status)) return true;
  return false;
}

// ─── Request counter map ──────────────────────────────────────────────────────

function getRequestCounter(
  type: ProviderType,
): promClient.Counter<string> | null {
  if (type === 'stt') return sttRequestsTotal;
  if (type === 'tts') return ttsRequestsTotal;
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
export async function withProvider<T>(
  opts: ProviderCallOptions,
  fn: () => Promise<T>,
): Promise<T> {
  const {
    provider,
    providerType,
    operation,
    histogram,
    maxRetries = 0,
    isRetryable = defaultIsRetryable,
  } = opts;

  const counter = getRequestCounter(providerType);
  const startMs = Date.now();

  let lastErr: unknown;
  const totalAttempts = maxRetries + 1;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    if (attempt > 0) {
      const delayMs = Math.min(200 * Math.pow(2, attempt - 1), 5_000);
      logger.warn({ provider, operation, attempt, delayMs }, 'Provider call failed — retrying');
      await sleep(delayMs);
    }

    try {
      const result = await fn();
      const durationSec = (Date.now() - startMs) / 1000;

      // ── Success metrics ──
      histogram?.observe({ provider }, durationSec);
      counter?.inc({ provider, operation, status: 'success' });
      providerAvailability.set({ provider, type: providerType }, 1);

      if (attempt > 0) {
        logger.info({ provider, operation, attempt }, 'Provider call succeeded after retry');
      }
      return result;
    } catch (err) {
      lastErr = err;

      const shouldRetry = attempt < totalAttempts - 1 && isRetryable(err);
      if (!shouldRetry) break;
    }
  }

  // ── Failure metrics ──
  const durationSec = (Date.now() - startMs) / 1000;
  histogram?.observe({ provider }, durationSec);
  counter?.inc({ provider, operation, status: 'error' });
  errorCounter.inc({ service: provider, type: operation });

  logger.error(
    { provider, operation, error: lastErr instanceof Error ? lastErr.message : String(lastErr) },
    'Provider call failed',
  );

  // Normalise into ProviderError (pass through if already one)
  throw lastErr instanceof ProviderError || lastErr instanceof ProviderUnavailableError
    ? lastErr
    : new ProviderError(provider, operation, lastErr);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Record provider availability at startup / on config change.
 * Call once per provider when the service is initialized.
 */
export function reportProviderAvailability(
  provider: string,
  type: ProviderType,
  available: boolean,
): void {
  providerAvailability.set({ provider, type }, available ? 1 : 0);
}
