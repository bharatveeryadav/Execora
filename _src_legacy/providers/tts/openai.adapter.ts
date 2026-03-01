import OpenAI from 'openai';
import { Readable } from 'stream';
import { config } from '../../config';
import { logger } from '../../infrastructure/logger';
import { TTSAdapter, ProviderCapabilities } from '../types';

type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * OpenAI TTS adapter — fallback when ElevenLabs is unavailable.
 * Does not support streaming (returns Buffer from generateSpeechStream too).
 */
export class OpenAITTSAdapter implements TTSAdapter {
  readonly name = 'openai';
  readonly capabilities: ProviderCapabilities = {
    isLocal:                   false,
    supportsLiveTranscription: false,
    supportsStreaming:          false,
    supportsIntentExtraction:  false,
  };
  private client: OpenAI | null = null;
  private readonly voice: OpenAIVoice = 'alloy';

  constructor() {
    if (config.openai.apiKey) {
      this.client = new OpenAI({ apiKey: config.openai.apiKey });
      logger.info('OpenAI TTS adapter initialized');
    } else {
      logger.warn('OPENAI_API_KEY not set — OpenAI TTS unavailable');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async generateSpeech(text: string): Promise<Buffer> {
    if (!this.client) throw new Error('OpenAI TTS not configured');

    const mp3 = await this.client.audio.speech.create({
      model: 'tts-1',
      voice: this.voice,
      input: text,
      speed: 1.0,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    logger.info({ textLength: text.length, audioSize: buffer.length }, 'OpenAI TTS generated');
    return buffer;
  }

  /** OpenAI TTS does not support streaming — returns a Buffer wrapped as the interface return type. */
  async generateSpeechStream(text: string): Promise<Buffer> {
    return this.generateSpeech(text);
  }
}

export const openaiTTSAdapter = new OpenAITTSAdapter();
