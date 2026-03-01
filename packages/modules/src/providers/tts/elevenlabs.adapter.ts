import axios from 'axios';
import { Readable } from 'stream';
import { config } from '@execora/infrastructure';
import { logger } from '@execora/infrastructure';
import { TTSAdapter, ProviderCapabilities } from '../types';

/**
 * ElevenLabs TTS adapter — supports both buffer and streaming synthesis.
 * Preferred provider: higher quality, native Hindi support.
 */
export class ElevenLabsTTSAdapter implements TTSAdapter {
  readonly name = 'elevenlabs';
  readonly capabilities: ProviderCapabilities = {
    isLocal:                   false,
    supportsLiveTranscription: false,
    supportsStreaming:          true,
    supportsIntentExtraction:  false,
  };
  private readonly apiKey:  string;
  private readonly voiceId: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey  = config.tts.elevenlabs.apiKey  ?? '';
    this.voiceId = config.tts.elevenlabs.voiceId ?? '21m00Tcm4TlvDq8ikWAM'; // Default Rachel
    if (this.apiKey) {
      logger.info('ElevenLabs TTS adapter initialized');
    } else {
      logger.warn('ELEVENLABS_API_KEY not set — ElevenLabs TTS unavailable');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generateSpeech(text: string): Promise<Buffer> {
    if (!this.apiKey) throw new Error('ElevenLabs TTS not configured');

    const response = await axios.post(
      `${this.baseUrl}/text-to-speech/${this.voiceId}`,
      {
        text,
        model_id: 'eleven_turbo_v2_5', // Supports Hindi/multilingual
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
      },
      {
        headers: { 'xi-api-key': this.apiKey, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
      },
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);
    logger.info({ textLength: text.length, audioSize: buffer.length }, 'ElevenLabs TTS generated');
    return buffer;
  }

  async generateSpeechStream(text: string): Promise<Readable> {
    if (!this.apiKey) throw new Error('ElevenLabs TTS not configured');

    const response = await axios.post(
      `${this.baseUrl}/text-to-speech/${this.voiceId}/stream`,
      {
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      },
      {
        headers: { 'xi-api-key': this.apiKey, 'Content-Type': 'application/json' },
        responseType: 'stream',
      },
    );

    logger.info({ textLength: text.length }, 'ElevenLabs TTS stream started');
    (response.data as Readable).on('error', (err: Error) => {
      logger.error({ error: err.message }, 'ElevenLabs TTS stream error');
    });
    return response.data as Readable;
  }
}

export const elevenLabsTTSAdapter = new ElevenLabsTTSAdapter();
