import { config } from '../../config';
import { logger } from '../../infrastructure/logger';
import { elevenLabsTTSService } from './elevenlabs';
import { openaiTTSService } from './openai';
import { Readable } from 'stream';

class TTSService {
  private provider: 'elevenlabs' | 'openai' | 'none';

  constructor() {
    this.provider = config.tts.provider as 'elevenlabs' | 'openai';

    // Verify provider is available
    if (this.provider === 'elevenlabs' && !elevenLabsTTSService.isServiceAvailable()) {
      logger.warn('ElevenLabs selected but not available - trying OpenAI');
      if (openaiTTSService.isServiceAvailable()) {
        this.provider = 'openai';
      } else {
        this.provider = 'none';
      }
    } else if (this.provider === 'openai' && !openaiTTSService.isServiceAvailable()) {
      logger.warn('OpenAI selected but not available - TTS disabled');
      this.provider = 'none';
    }

    logger.info({ provider: this.provider }, 'TTS service initialized');
  }

  /**
   * Check if TTS is available
   */
  isAvailable(): boolean {
    return this.provider !== 'none';
  }

  /**
   * Get current provider
   */
  getProvider(): string {
    return this.provider;
  }

  /**
   * Generate speech from text
   */
  async generateSpeech(text: string): Promise<Buffer> {
    if (!this.isAvailable()) {
      throw new Error('No TTS provider available');
    }

    logger.info({ provider: this.provider, textLength: text.length }, 'Generating speech');

    if (this.provider === 'elevenlabs') {
      return await elevenLabsTTSService.generateSpeech(text);
    } else if (this.provider === 'openai') {
      return await openaiTTSService.generateSpeech(text);
    }

    throw new Error('Invalid TTS provider');
  }

  /**
   * Generate speech as stream (if supported)
   */
  async generateSpeechStream(text: string, overrideProvider?: string): Promise<Readable | Buffer> {
    // Allow runtime provider override (e.g., from user selection)
    const selectedProvider = (overrideProvider || this.provider) as string;

    if (selectedProvider === 'none' || !selectedProvider) {
      throw new Error('No TTS provider available');
    }

    logger.info({ provider: selectedProvider, textLength: text.length, isOverride: !!overrideProvider }, 'Generating speech stream');

    if (selectedProvider === 'elevenlabs') {
      // ElevenLabs supports streaming
      return await elevenLabsTTSService.generateSpeechStream(text);
    } else if (selectedProvider === 'openai') {
      // OpenAI doesn't support streaming, return buffer
      return await openaiTTSService.generateSpeech(text);
    }

    throw new Error('Invalid TTS provider');
  }

  /**
   * Convert audio buffer to base64 for WebSocket transmission
   */
  bufferToBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }

  /**
   * Convert stream to buffer
   */
  async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];

    try {
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const result = Buffer.concat(chunks);
      logger.info({ bufferSize: result.length, chunkCount: chunks.length }, 'Stream converted to buffer successfully');
      return result;
    } catch (error: any) {
      logger.error({
        error: error.message,
        code: error.code,
        stack: error.stack,
        chunksReceived: chunks.length,
      }, 'Stream to buffer conversion failed');
      throw error;
    }
  }
}

export const ttsService = new TTSService();
