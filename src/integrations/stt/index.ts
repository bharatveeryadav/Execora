import { config } from '../../config';
import { logger } from '../../infrastructure/logger';
import { deepgramService } from './deepgram';
import { elevenLabsSTTService } from './elevenlabs';

class STTService {
  private provider: 'deepgram' | 'elevenlabs' | 'none';

  constructor() {
    this.provider = config.stt.provider as 'deepgram' | 'elevenlabs';

    // Verify provider is available
    if (this.provider === 'deepgram' && !deepgramService.isServiceAvailable()) {
      logger.warn('Deepgram selected but not available - STT disabled');
      this.provider = 'none';
    } else if (this.provider === 'elevenlabs' && !elevenLabsSTTService.isServiceAvailable()) {
      logger.warn('ElevenLabs selected but not available - trying Deepgram');
      if (deepgramService.isServiceAvailable()) {
        this.provider = 'deepgram';
      } else {
        this.provider = 'none';
      }
    }

    logger.info({ provider: this.provider }, 'STT service initialized');
  }

  /**
   * Check if STT is available
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
   * Create live transcription connection
   */
  async createLiveTranscription(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (error: Error) => void
  ) {
    if (this.provider === 'deepgram') {
      return await deepgramService.createLiveTranscription(onTranscript, onError);
    } else if (this.provider === 'elevenlabs') {
      return await elevenLabsSTTService.createLiveTranscription(onTranscript, onError);
    } else {
      throw new Error('No STT provider available for live transcription');
    }
  }

  /**
   * Transcribe audio buffer
   */
  async transcribeAudio(audioBuffer: Buffer, mimeType: string = 'audio/webm'): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('No STT provider available');
    }

    logger.info({ provider: this.provider, size: audioBuffer.length }, 'Transcribing audio');

    if (this.provider === 'deepgram') {
      return await deepgramService.transcribeAudio(audioBuffer, mimeType);
    } else if (this.provider === 'elevenlabs') {
      return await elevenLabsSTTService.transcribeAudio(audioBuffer);
    }

    throw new Error('Invalid STT provider');
  }
}

export const sttService = new STTService();
