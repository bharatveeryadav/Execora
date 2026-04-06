import { config } from '@execora/core';
import { logger } from '@execora/core';
import { sttProcessingTime } from '@execora/core';
import { STTAdapter, LiveTranscriptionSession } from '../types';
import type { LiveTranscriptionOptions } from '../types';
import { ProviderUnavailableError } from '../errors';
import { withProvider, reportProviderAvailability } from '../middleware';
import { deepgramAdapter } from './deepgram.adapter';
import { elevenLabsSTTAdapter } from './elevenlabs.adapter';
import { whisperAdapter } from './whisper.adapter';

/**
 * Adapter registry — ordered by preference.
 * Add new adapters here; no other file needs to change.
 */
const ADAPTERS: Record<string, STTAdapter> = {
  deepgram:   deepgramAdapter,
  elevenlabs: elevenLabsSTTAdapter,
  whisper:    whisperAdapter,
};

/**
 * STT service — provider-agnostic facade.
 *
 * ## Provider selection (env STT_PROVIDER)
 * 1. Use the configured provider if it is available.
 * 2. If not, auto-fall back to any other available provider
 *    that supports the requested operation.
 * 3. If none available, `isAvailable()` returns false and calls throw.
 *
 * ## Swap provider
 * Change `STT_PROVIDER=deepgram|elevenlabs|whisper` — zero code changes.
 *
 * ## Add a new provider
 * 1. Create `src/providers/stt/myprovider.adapter.ts` implementing STTAdapter.
 * 2. Import it here and add it to ADAPTERS.
 * 3. Add config to `src/config.ts` and env var to `.env`.
 */
class STTService {
  private adapter: STTAdapter | null = null;

  constructor() {
    const preferred = config.stt.provider;
    const primary   = ADAPTERS[preferred];

    if (primary?.isAvailable()) {
      this.adapter = primary;
    } else {
      if (primary) logger.warn({ preferred }, 'Preferred STT provider not available — trying fallback');
      const fallback = Object.values(ADAPTERS).find(
        (a) => a.name !== preferred && a.isAvailable(),
      ) ?? null;
      if (fallback) logger.warn({ fallback: fallback.name }, 'Using fallback STT provider');
      this.adapter = fallback;
    }

    if (!this.adapter) logger.error('No STT provider available — STT disabled');

    // Report availability of all adapters to Prometheus at startup
    for (const a of Object.values(ADAPTERS)) {
      reportProviderAvailability(a.name, 'stt', a.isAvailable());
    }

    logger.info({ provider: this.adapter?.name ?? 'none' }, 'STT service initialized');
  }

  isAvailable(): boolean {
    return this.adapter !== null;
  }

  getProvider(): string {
    return this.adapter?.name ?? 'none';
  }

  /**
   * Open a live transcription session (streaming audio → partial+final transcripts).
   * Falls back to any adapter that supports live transcription when the primary doesn't.
   */
  async createLiveTranscription(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (error: Error) => void,
    options?: LiveTranscriptionOptions,
  ): Promise<LiveTranscriptionSession> {
    // Find an adapter that supports live transcription
    const adapter = this.adapterFor('supportsLiveTranscription');
    if (!adapter) {
      throw new ProviderUnavailableError('stt', 'createLiveTranscription — no adapter supports live transcription');
    }

    // Live sessions are long-lived — we don't wrap in withProvider here because
    // the latency is unbounded. Errors during the session are propagated via onError.
    return adapter.createLiveTranscription(onTranscript, onError, options);
  }

  /**
   * Transcribe a complete audio buffer (batch mode).
   * Automatically retried once on transient errors.
   */
  async transcribeAudio(audioBuffer: Buffer, mimeType = 'audio/webm'): Promise<string> {
    const adapter = this.adapter;
    if (!adapter) throw new ProviderUnavailableError('stt', 'transcribeAudio');

    logger.info({ provider: adapter.name, size: audioBuffer.length }, 'Transcribing audio');

    return withProvider(
      {
        provider:     adapter.name,
        providerType: 'stt',
        operation:    'transcribeAudio',
        histogram:    sttProcessingTime,
        maxRetries:   1,
      },
      () => adapter.transcribeAudio(audioBuffer, mimeType),
    );
  }

  /** Returns the first available adapter that satisfies a capability, or null. */
  private adapterFor(capability: 'supportsLiveTranscription'): STTAdapter | null {
    // Prefer the current adapter if it has the capability
    if (this.adapter?.capabilities[capability]) return this.adapter;
    // Otherwise try any registered adapter that does
    return Object.values(ADAPTERS).find((a) => a.isAvailable() && a.capabilities[capability]) ?? null;
  }
}

export const sttService = new STTService();
