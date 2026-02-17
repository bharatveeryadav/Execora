import axios from 'axios';
import FormData from 'form-data';
import WebSocket from 'ws';
import { config } from '../config';
import { logger } from '../lib/logger';

class ElevenLabsSTTService {
  private apiKey: string;
  private isAvailable: boolean = false;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = config.stt.elevenlabs.apiKey || '';
    this.isAvailable = !!this.apiKey;

    if (this.isAvailable) {
      logger.info('ElevenLabs STT initialized');
    } else {
      logger.warn('ElevenLabs API key not provided - STT disabled');
    }
  }

  /**
   * Check if service is available
   */
  isServiceAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Create realtime transcription connection
   */
  async createLiveTranscription(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (error: Error) => void
  ) {
    if (!this.isAvailable) {
      throw new Error('ElevenLabs STT service not available');
    }

    const url = new URL('wss://api.elevenlabs.io/v1/speech-to-text/realtime');
    url.searchParams.set('model_id', config.stt.elevenlabs.realtimeModelId);
    url.searchParams.set('audio_format', 'pcm_16000');
    url.searchParams.set('commit_strategy', 'vad');
    if (config.stt.elevenlabs.languageCode) {
      url.searchParams.set('language_code', config.stt.elevenlabs.languageCode);
    }

    const ws = new WebSocket(url.toString(), {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    let isFinishing = false;
    let closeTimeout: NodeJS.Timeout | null = null;

    ws.on('open', () => {
      logger.info('🎤 ElevenLabs realtime STT connected');
    });

    ws.on('close', (code, reason) => {
      logger.warn(
        { code, reason: reason?.toString() },
        '❌ ElevenLabs realtime STT connection closed'
      );
      if (closeTimeout) {
        clearTimeout(closeTimeout);
      }
    });

    ws.on('message', (data) => {
      try {
        const payload = JSON.parse(data.toString());
        const messageType = payload?.message_type;

        if (messageType === 'session_started') {
          logger.info({ sessionId: payload?.session_id }, '✅ ElevenLabs STT session started');
          return;
        }

        if (messageType === 'partial_transcript') {
          if (payload.text) {
            logger.debug({ text: payload.text.substring(0, 50) }, '📝 ElevenLabs partial transcript');
            onTranscript(payload.text, false);
          }
          return;
        }

        if (messageType === 'committed_transcript' || messageType === 'committed_transcript_with_timestamps') {
          if (payload.text) {
            logger.info({ text: payload.text }, '✅ ElevenLabs FINAL transcript received');
            onTranscript(payload.text, true);
          }

          if (isFinishing) {
            if (closeTimeout) {
              clearTimeout(closeTimeout);
            }

            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.close();
              }
            }, 100);
          }

          return;
        }

        if (messageType && messageType.endsWith('_error')) {
          const errorMessage = payload?.message || 'ElevenLabs realtime STT error';
          logger.error({ error: errorMessage }, '❌ ElevenLabs STT error');
          onError(new Error(errorMessage));
        }
      } catch (error) {
        onError(error as Error);
      }
    });

    ws.on('error', (error) => {
      logger.error({ error }, '❌ ElevenLabs realtime STT socket error');
      onError(error as Error);
    });

    return {
      send: (audioChunk: Buffer) => {
        if (ws.readyState !== WebSocket.OPEN) {
          return;
        }

        const message = {
          message_type: 'input_audio_chunk',
          audio_base_64: audioChunk.toString('base64'),
          sample_rate: 16000,
        };

        ws.send(JSON.stringify(message));
      },
      finish: () => {
        if (ws.readyState !== WebSocket.OPEN) {
          logger.warn('❌ STT connection not open, cannot finish');
          return;
        }

        logger.info('📤 Sending commit signal to ElevenLabs STT');
        isFinishing = true;

        // Send commit signal
        ws.send(
          JSON.stringify({
            message_type: 'input_audio_chunk',
            audio_base_64: '',
            sample_rate: 16000,
            commit: true,
          })
        );

        // Set timeout to close connection if no response
        if (closeTimeout) {
          clearTimeout(closeTimeout);
        }
        closeTimeout = setTimeout(() => {
          logger.warn('⏱️ Timeout waiting for final transcript, closing connection');
          if (ws.readyState !== WebSocket.CLOSED) {
            ws.close();
          }
        }, 3000); // Wait max 3 seconds for final transcript
      },
    };
  }

  /**
   * Transcribe audio buffer
   */
  async transcribeAudio(audioBuffer: Buffer, mimeType: string = 'audio/webm'): Promise<string> {
    if (!this.isAvailable) {
      throw new Error('ElevenLabs STT service not available');
    }

    try {
      const form = new FormData();
      form.append('model_id', config.stt.elevenlabs.modelId);

      if (config.stt.elevenlabs.languageCode) {
        form.append('language_code', config.stt.elevenlabs.languageCode);
      }

      form.append('file', audioBuffer, {
        filename: 'audio.webm',
        contentType: mimeType,
      });

      const response = await axios.post(`${this.baseUrl}/speech-to-text`, form, {
        headers: {
          'xi-api-key': this.apiKey,
          ...form.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      const transcript = response.data?.text || '';
      logger.info({ length: transcript.length }, 'ElevenLabs transcription complete');

      return transcript;
    } catch (error) {
      logger.error({ error }, 'ElevenLabs STT failed');
      throw error;
    }
  }
}

export const elevenLabsSTTService = new ElevenLabsSTTService();
