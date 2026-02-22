import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../infrastructure/logger';
import { Readable } from 'stream';

class ElevenLabsTTSService {
  private apiKey: string;
  private voiceId: string;
  private isAvailable: boolean = false;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = config.tts.elevenlabs.apiKey || '';
    this.voiceId = config.tts.elevenlabs.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default Rachel voice
    this.isAvailable = !!this.apiKey;

    if (this.isAvailable) {
      logger.info('ElevenLabs TTS initialized');
    } else {
      logger.warn('ElevenLabs API key not provided - TTS disabled');
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
  async generateSpeech(text: string): Promise<Buffer> {
    if (!this.isAvailable) {
      throw new Error('ElevenLabs TTS service not available');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${this.voiceId}`,
        {
          text,
          model_id: 'eleven_turbo_v2_5', // Supports Hindi
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      const audioBuffer = Buffer.from(response.data);

      logger.info({ textLength: text.length, audioSize: audioBuffer.length }, 'ElevenLabs TTS generated');

      return audioBuffer;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'ElevenLabs TTS failed');
      throw error;
    }
  }

  /**
   * Generate speech as stream (for real-time playback)
   */
  async generateSpeechStream(text: string): Promise<Readable> {
    if (!this.isAvailable) {
      throw new Error('ElevenLabs TTS service not available');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${this.voiceId}/stream`,
        {
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        }
      );

      logger.info({ textLength: text.length }, 'ElevenLabs TTS stream started');

      // Attach error handler to stream
      response.data.on('error', (streamError: any) => {
        logger.error({
          error: streamError.message,
          code: streamError.code,
          stack: streamError.stack,
        }, 'ElevenLabs TTS stream error event');
      });

      return response.data;
    } catch (error: any) {
      logger.error({
        error: error.response?.data || error.message,
        status: error.response?.status,
        code: error.code,
        stack: error.stack,
      }, 'ElevenLabs TTS stream failed');
      throw error;
    }
  }

  /**
   * List available voices
   */
  async listVoices(): Promise<any[]> {
    if (!this.isAvailable) {
      throw new Error('ElevenLabs TTS service not available');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      return response.data.voices || [];
    } catch (error) {
      logger.error({ error }, 'Failed to list voices');
      return [];
    }
  }
}

export const elevenLabsTTSService = new ElevenLabsTTSService();
