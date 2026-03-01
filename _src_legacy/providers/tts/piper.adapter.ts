import axios from 'axios';
import { Readable } from 'stream';
import { config } from '../../config';
import { logger } from '../../infrastructure/logger';
import { TTSAdapter, ProviderCapabilities } from '../types';
import { ProviderUnavailableError } from '../errors';

/**
 * Piper TTS adapter — local/self-hosted text-to-speech.
 *
 * Compatible with the wyoming-piper HTTP REST API.
 * Piper is fast (< 500ms on CPU), supports Hindi, and runs fully offline.
 *
 * Setup (Docker, one-time):
 *   # Hindi voice (recommended for Execora):
 *   docker run -d -p 5000:5000 \
 *     rhasspy/wyoming-piper \
 *     --voice hi_IN-deepika-medium
 *
 *   # English voice:
 *   docker run -d -p 5000:5000 \
 *     rhasspy/wyoming-piper \
 *     --voice en_US-lessac-medium
 *
 *   # Then set env: PIPER_BASE_URL=http://localhost:5000
 *
 * Available voices: https://huggingface.co/rhasspy/piper-voices
 * Key Hindi voices:
 *   hi_IN-deepika-medium   — female, natural Hinglish
 *   hi_IN-hindi-x-low      — male, lighter weight
 *
 * Trade-offs vs cloud TTS:
 *   - ✅ Fully offline — zero per-character API cost
 *   - ✅ Ultra-fast (< 500ms on CPU, < 100ms on GPU)
 *   - ✅ Data stays on your infrastructure
 *   - ⚠️  Voice quality lower than ElevenLabs
 *   - ⚠️  Limited emotion/prosody control
 */
export class PiperAdapter implements TTSAdapter {
  readonly name = 'piper';
  readonly capabilities: ProviderCapabilities = {
    isLocal:                   true,
    supportsLiveTranscription: false,
    supportsStreaming:          false, // Piper returns a complete WAV buffer
    supportsIntentExtraction:  false,
  };

  private readonly baseUrl: string;
  private readonly voice: string;

  constructor() {
    this.baseUrl = config.tts.piper.baseUrl;
    this.voice   = config.tts.piper.voice;

    if (config.tts.piper.enabled) {
      logger.info({ baseUrl: this.baseUrl, voice: this.voice }, 'Piper TTS adapter initialized');
    } else {
      logger.debug('Piper not configured — set PIPER_BASE_URL to enable local TTS');
    }
  }

  isAvailable(): boolean {
    return config.tts.piper.enabled;
  }

  async generateSpeech(text: string): Promise<Buffer> {
    if (!this.isAvailable()) {
      throw new ProviderUnavailableError(this.name, 'generateSpeech');
    }

    // wyoming-piper REST endpoint: POST /api/tts
    const response = await axios.post<ArrayBuffer>(
      `${this.baseUrl}/api/tts`,
      { text, voice: this.voice },
      {
        headers:      { 'Content-Type': 'application/json', Accept: 'audio/wav' },
        responseType: 'arraybuffer',
        timeout:      30_000,
      },
    );

    const buffer = Buffer.from(response.data);
    logger.info({ textLength: text.length, audioSize: buffer.length, voice: this.voice }, 'Piper TTS generated');
    return buffer;
  }

  /** Piper does not stream — returns the full buffer wrapped in a Readable. */
  async generateSpeechStream(text: string): Promise<Buffer> {
    return this.generateSpeech(text);
  }
}

export const piperAdapter = new PiperAdapter();
