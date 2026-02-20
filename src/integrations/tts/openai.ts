import OpenAI from 'openai';
import { config } from '../../config';
import { logger } from '../../infrastructure/logger';

class OpenAITTSService {
  private client: OpenAI | null = null;
  private isAvailable: boolean = false;

  constructor() {
    if (config.openai.apiKey) {
      this.client = new OpenAI({ apiKey: config.openai.apiKey });
      this.isAvailable = true;
      logger.info('OpenAI TTS initialized');
    } else {
      logger.warn('OpenAI API key not provided - TTS disabled');
    }
  }

  /**
   * Check if service is available
   */
  isServiceAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Generate speech from text
   */
  async generateSpeech(text: string, voice: string = 'alloy'): Promise<Buffer> {
    if (!this.isAvailable) {
      throw new Error('OpenAI TTS service not available');
    }

    const client = this.client;
    if (!client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const mp3 = await client.audio.speech.create({
        model: 'tts-1',
        voice: voice as any, // 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
        input: text,
        speed: 1.0,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());

      logger.info({ textLength: text.length, audioSize: buffer.length }, 'OpenAI TTS generated');

      return buffer;
    } catch (error) {
      logger.error({ error }, 'OpenAI TTS failed');
      throw error;
    }
  }

  /**
   * Generate speech with HD quality
   */
  async generateSpeechHD(text: string, voice: string = 'alloy'): Promise<Buffer> {
    if (!this.isAvailable) {
      throw new Error('OpenAI TTS service not available');
    }

    const client = this.client;
    if (!client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const mp3 = await client.audio.speech.create({
        model: 'tts-1-hd',
        voice: voice as any,
        input: text,
        speed: 1.0,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());

      logger.info({ textLength: text.length, audioSize: buffer.length }, 'OpenAI TTS HD generated');

      return buffer;
    } catch (error) {
      logger.error({ error }, 'OpenAI TTS HD failed');
      throw error;
    }
  }
}

export const openaiTTSService = new OpenAITTSService();
