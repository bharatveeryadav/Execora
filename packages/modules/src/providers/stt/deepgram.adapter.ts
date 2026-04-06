import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { config } from '@execora/core';
import { logger } from '@execora/core';
import { STTAdapter, LiveTranscriptionSession, LiveTranscriptionOptions, ProviderCapabilities } from '../types';

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
    options?: LiveTranscriptionOptions,
  ): Promise<LiveTranscriptionSession> {
    if (!this.client) throw new Error('Deepgram client not initialised');

    const isPCM = options?.encoding === 'linear16';
    const sampleRate = options?.sampleRate ?? 16000;
    const channels   = options?.channels ?? 1;

    const connection = this.client.listen.live({
      model:           'nova-3',
      language:        'hi-en',
      smart_format:    true,
      punctuate:       true,
      numerals:        true,       // convert spoken numbers to digits (e.g. "do sau" → "200")
      filler_words:    false,      // strip "um", "uh", fillers
      interim_results: true,
      endpointing:     300,        // 300 ms silence before committing (robust in noisy environments)
      utterance_end_ms: 1000,      // wait up to 1 s after last speech before final
      channels,
      // PCM-specific settings — only sent when frontend streams raw linear16
      ...(isPCM ? { encoding: 'linear16', sample_rate: sampleRate } : {}),
    });

    logger.info({ encoding: isPCM ? 'linear16' : 'webm', sampleRate, channels }, 'Deepgram live session opened');

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
          // requestClose() is the non-deprecated replacement for finish()
          if (typeof (connection as any).requestClose === 'function') {
            (connection as any).requestClose();
          } else {
            connection.finish();
          }
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
