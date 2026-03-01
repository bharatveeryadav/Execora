import { Readable } from 'stream';
import { config } from '../../config';
import { logger } from '../../infrastructure/logger';
import { ttsProcessingTime } from '../../infrastructure/metrics';
import { TTSAdapter } from '../types';
import { ProviderUnavailableError } from '../errors';
import { withProvider, reportProviderAvailability } from '../middleware';
import { elevenLabsTTSAdapter } from './elevenlabs.adapter';
import { openaiTTSAdapter } from './openai.adapter';
import { piperAdapter } from './piper.adapter';

/**
 * Adapter registry — ordered by preference.
 * Add new adapters here; no other file needs to change.
 */
const ADAPTERS: Record<string, TTSAdapter> = {
  elevenlabs: elevenLabsTTSAdapter,
  openai:     openaiTTSAdapter,
  piper:      piperAdapter,
};

/**
 * TTS service — provider-agnostic facade.
 *
 * ## Provider selection (env TTS_PROVIDER)
 * 1. Use the configured provider if it is available.
 * 2. If not, auto-fall back to any other available provider.
 * 3. If none available, `isAvailable()` returns false and calls throw.
 *
 * ## Swap provider
 * Change `TTS_PROVIDER=elevenlabs|openai|piper` — zero code changes.
 *
 * ## Add a new provider
 * 1. Create `src/providers/tts/myprovider.adapter.ts` implementing TTSAdapter.
 * 2. Import it here and add it to ADAPTERS.
 * 3. Add config to `src/config.ts` and env var to `.env`.
 */
class TTSService {
  private adapter: TTSAdapter | null = null;

  constructor() {
    const preferred = config.tts.provider;
    const primary   = ADAPTERS[preferred];

    if (primary?.isAvailable()) {
      this.adapter = primary;
    } else {
      if (primary) logger.warn({ preferred }, 'Preferred TTS provider not available — trying fallback');
      const fallback = Object.values(ADAPTERS).find(
        (a) => a.name !== preferred && a.isAvailable(),
      ) ?? null;
      if (fallback) logger.warn({ fallback: fallback.name }, 'Using fallback TTS provider');
      this.adapter = fallback;
    }

    if (!this.adapter) logger.error('No TTS provider available — TTS disabled');

    // Report availability of all adapters to Prometheus at startup
    for (const a of Object.values(ADAPTERS)) {
      reportProviderAvailability(a.name, 'tts', a.isAvailable());
    }

    logger.info({ provider: this.adapter?.name ?? 'none' }, 'TTS service initialized');
  }

  isAvailable(): boolean {
    return this.adapter !== null;
  }

  getProvider(): string {
    return this.adapter?.name ?? 'none';
  }

  /**
   * Generate speech as a Buffer.
   * Automatically retried once on transient errors.
   */
  async generateSpeech(text: string): Promise<Buffer> {
    const adapter = this.adapter;
    if (!adapter) throw new ProviderUnavailableError('tts', 'generateSpeech');

    logger.info({ provider: adapter.name, textLength: text.length }, 'Generating speech');

    return withProvider(
      {
        provider:     adapter.name,
        providerType: 'tts',
        operation:    'generateSpeech',
        histogram:    ttsProcessingTime,
        maxRetries:   1,
      },
      () => adapter.generateSpeech(text),
    );
  }

  /**
   * Generate speech as a stream (preferred) or Buffer for providers that don't support streaming.
   * Pass `overrideProvider` to bypass the configured provider for a specific request.
   */
  async generateSpeechStream(text: string, overrideProvider?: string): Promise<Readable | Buffer> {
    const adapter = overrideProvider
      ? (ADAPTERS[overrideProvider] ?? this.adapter)
      : this.adapter;

    if (!adapter) throw new ProviderUnavailableError('tts', 'generateSpeechStream');

    logger.info(
      { provider: adapter.name, textLength: text.length, isOverride: !!overrideProvider },
      'Generating speech stream',
    );

    return withProvider(
      {
        provider:     adapter.name,
        providerType: 'tts',
        operation:    'generateSpeechStream',
        histogram:    ttsProcessingTime,
        maxRetries:   1,
      },
      () => adapter.generateSpeechStream(text),
    );
  }

  /** Convert audio buffer to base64 for WebSocket transmission */
  bufferToBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }

  /** Collect a Readable stream into a single Buffer */
  async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of stream) chunks.push(Buffer.from(chunk as Uint8Array));
      const result = Buffer.concat(chunks);
      logger.info({ bufferSize: result.length, chunkCount: chunks.length }, 'Stream to buffer complete');
      return result;
    } catch (err: any) {
      logger.error({ error: err.message, chunksReceived: chunks.length }, 'Stream to buffer failed');
      throw err;
    }
  }
}

export const ttsService = new TTSService();
