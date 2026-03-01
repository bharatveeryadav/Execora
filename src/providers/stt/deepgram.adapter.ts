import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { config } from '../../config';
import { logger } from '../../infrastructure/logger';
import { STTAdapter, LiveTranscriptionSession, ProviderCapabilities } from '../types';

/**
 * Deepgram STT adapter.
 * Wraps Deepgram's event-based live connection into the unified
 * LiveTranscriptionSession interface (send / finish).
 */
export class DeepgramAdapter implements STTAdapter {
  readonly name = 'deepgram';
  readonly capabilities: ProviderCapabilities = {
    isLocal:                   false,
    supportsLiveTranscription: true,
    supportsStreaming:          false,
    supportsIntentExtraction:  false,
  };
  private client: ReturnType<typeof createClient> | null = null;

  constructor() {
    if (config.stt.deepgram.apiKey) {
      this.client = createClient(config.stt.deepgram.apiKey);
      logger.info('Deepgram STT adapter initialized');
    } else {
      logger.warn('DEEPGRAM_API_KEY not set — Deepgram STT unavailable');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async createLiveTranscription(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (error: Error) => void,
  ): Promise<LiveTranscriptionSession> {
    if (!this.client) throw new Error('Deepgram client not initialised');

    const connection = this.client.listen.live({
      model:           'nova-3',
      language:        'hi-en',
      smart_format:    true,
      punctuate:       true,
      interim_results: true,
      endpointing:     200,
      utterance_end_ms: 500,
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const text    = data.channel?.alternatives?.[0]?.transcript;
      const isFinal = data.is_final;
      if (text?.trim()) {
        logger.debug({ text, isFinal }, 'Deepgram transcript');
        onTranscript(text, isFinal);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (err: any) => {
      logger.error({ error: err }, 'Deepgram error');
      onError(err instanceof Error ? err : new Error(String(err)));
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      logger.info('Deepgram connection closed');
    });

    return {
      send: (audioChunk: Buffer) => {
        // Deepgram SDK expects ArrayBuffer, not Node.js Buffer
        const ab = audioChunk.buffer.slice(
          audioChunk.byteOffset,
          audioChunk.byteOffset + audioChunk.byteLength,
        ) as ArrayBuffer;
        connection.send(ab);
      },
      finish: () => {
        try {
          connection.finish();
        } catch {
          // Deepgram connection may already be closed
        }
      },
    };
  }

  async transcribeAudio(audioBuffer: Buffer, mimeType: string = 'audio/webm'): Promise<string> {
    if (!this.client) throw new Error('Deepgram client not initialised');

    const { result, error } = await this.client.listen.prerecorded.transcribeFile(audioBuffer, {
      model:        'nova-2',
      language:     'hi-en',
      smart_format: true,
      punctuate:    true,
    });

    if (error) throw error;

    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
    logger.info({ length: transcript.length, mimeType }, 'Deepgram transcription complete');
    return transcript;
  }
}

export const deepgramAdapter = new DeepgramAdapter();
