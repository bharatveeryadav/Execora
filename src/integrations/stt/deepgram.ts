import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { config } from '../../config';
import { logger } from '../../infrastructure/logger';
import { Readable } from 'stream';

class DeepgramService {
  private deepgram: any;
  private isAvailable: boolean = false;

  constructor() {
    if (config.stt.deepgram.apiKey) {
      this.deepgram = createClient(config.stt.deepgram.apiKey);
      this.isAvailable = true;
      logger.info('Deepgram STT initialized');
    } else {
      logger.warn('Deepgram API key not provided - STT disabled');
    }
  }

  /**
   * Check if service is available
   */
  isServiceAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Create live transcription connection
   */
  async createLiveTranscription(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (error: Error) => void
  ) {
    if (!this.isAvailable) {
      throw new Error('Deepgram service not available');
    }

    try {
      const connection = this.deepgram.listen.live({
        model: 'nova-2',
        language: 'hi-en', // Hindi-English mix
        smart_format: true,
        punctuate: true,
        interim_results: true,
        endpointing: 300, // 300ms silence for endpoint
        utterance_end_ms: 1000,
      });

      // Handle transcript events
      connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        const isFinal = data.is_final;

        if (transcript && transcript.trim().length > 0) {
          logger.debug({ transcript, isFinal }, 'Deepgram transcript');
          onTranscript(transcript, isFinal);
        }
      });

      // Handle errors
      connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        logger.error({ error }, 'Deepgram error');
        onError(error);
      });

      // Handle close
      connection.on(LiveTranscriptionEvents.Close, () => {
        logger.info('Deepgram connection closed');
      });

      return connection;
    } catch (error) {
      logger.error({ error }, 'Failed to create Deepgram connection');
      throw error;
    }
  }

  /**
   * Transcribe audio buffer (for batch processing)
   */
  async transcribeAudio(audioBuffer: Buffer, mimeType: string = 'audio/webm'): Promise<string> {
    if (!this.isAvailable) {
      throw new Error('Deepgram service not available');
    }

    try {
      const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-2',
          language: 'hi-en',
          smart_format: true,
          punctuate: true,
        }
      );

      if (error) {
        throw error;
      }

      const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      
      logger.info({ transcript, length: transcript.length }, 'Deepgram transcription complete');
      
      return transcript;
    } catch (error) {
      logger.error({ error }, 'Deepgram transcription failed');
      throw error;
    }
  }
}

export const deepgramService = new DeepgramService();
