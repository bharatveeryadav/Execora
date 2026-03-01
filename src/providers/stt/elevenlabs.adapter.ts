import axios from 'axios';
import FormData from 'form-data';
import WebSocket from 'ws';
import { config } from '../../config';
import { logger } from '../../infrastructure/logger';
import { STTAdapter, LiveTranscriptionSession, ProviderCapabilities } from '../types';

/**
 * ElevenLabs STT adapter.
 * Supports both live transcription (WebSocket) and batch transcription (REST).
 */
export class ElevenLabsSTTAdapter implements STTAdapter {
  readonly name = 'elevenlabs';
  readonly capabilities: ProviderCapabilities = {
    isLocal:                   false,
    supportsLiveTranscription: true,
    supportsStreaming:          false,
    supportsIntentExtraction:  false,
  };
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = config.stt.elevenlabs.apiKey ?? '';
    if (this.apiKey) {
      logger.info('ElevenLabs STT adapter initialized');
    } else {
      logger.warn('ELEVENLABS_API_KEY not set — ElevenLabs STT unavailable');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async createLiveTranscription(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (error: Error) => void,
  ): Promise<LiveTranscriptionSession> {
    if (!this.apiKey) throw new Error('ElevenLabs API key not configured');

    const url = new URL('wss://api.elevenlabs.io/v1/speech-to-text/realtime');
    url.searchParams.set('model_id',        config.stt.elevenlabs.realtimeModelId);
    url.searchParams.set('audio_format',    'pcm_16000');
    url.searchParams.set('commit_strategy', 'vad');
    if (config.stt.elevenlabs.languageCode) {
      url.searchParams.set('language_code', config.stt.elevenlabs.languageCode);
    }

    const ws = new WebSocket(url.toString(), { headers: { 'xi-api-key': this.apiKey } });

    let isFinishing  = false;
    let closeTimeout: NodeJS.Timeout | null = null;

    ws.on('open', () => logger.info('ElevenLabs realtime STT connected'));

    ws.on('close', (code, reason) => {
      logger.warn({ code, reason: reason?.toString() }, 'ElevenLabs realtime STT connection closed');
      if (closeTimeout) clearTimeout(closeTimeout);
    });

    ws.on('message', (data) => {
      try {
        const payload     = JSON.parse(data.toString());
        const messageType = payload?.message_type as string | undefined;

        if (messageType === 'session_started') {
          logger.info({ sessionId: payload?.session_id }, 'ElevenLabs STT session started');
          return;
        }

        if (messageType === 'partial_transcript') {
          if (payload.text) onTranscript(payload.text, false);
          return;
        }

        if (messageType === 'committed_transcript' || messageType === 'committed_transcript_with_timestamps') {
          if (payload.text) {
            logger.info({ text: payload.text }, 'ElevenLabs final transcript received');
            onTranscript(payload.text, true);
          }
          if (isFinishing) {
            if (closeTimeout) clearTimeout(closeTimeout);
            setTimeout(() => { if (ws.readyState === WebSocket.OPEN) ws.close(); }, 100);
          }
          return;
        }

        if (messageType?.endsWith('_error')) {
          onError(new Error(payload?.message ?? 'ElevenLabs STT error'));
        }
      } catch (err) {
        onError(err as Error);
      }
    });

    ws.on('error', (err) => {
      logger.error({ error: err }, 'ElevenLabs realtime STT socket error');
      onError(err);
    });

    return {
      send: (audioChunk: Buffer) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({
          message_type:  'input_audio_chunk',
          audio_base_64: audioChunk.toString('base64'),
          sample_rate:   16000,
        }));
      },
      finish: () => {
        if (ws.readyState !== WebSocket.OPEN) {
          logger.warn('ElevenLabs STT connection not open, cannot finish');
          return;
        }
        isFinishing = true;
        ws.send(JSON.stringify({
          message_type:  'input_audio_chunk',
          audio_base_64: '',
          sample_rate:   16000,
          commit:        true,
        }));
        if (closeTimeout) clearTimeout(closeTimeout);
        closeTimeout = setTimeout(() => {
          logger.warn('Timeout waiting for final transcript, closing ElevenLabs STT connection');
          if (ws.readyState !== WebSocket.CLOSED) ws.close();
        }, 3000);
      },
    };
  }

  async transcribeAudio(audioBuffer: Buffer, mimeType: string = 'audio/webm'): Promise<string> {
    if (!this.apiKey) throw new Error('ElevenLabs API key not configured');

    const form = new FormData();
    form.append('model_id', config.stt.elevenlabs.modelId);
    if (config.stt.elevenlabs.languageCode) {
      form.append('language_code', config.stt.elevenlabs.languageCode);
    }
    form.append('file', audioBuffer, { filename: 'audio.webm', contentType: mimeType });

    const response = await axios.post(`${this.baseUrl}/speech-to-text`, form, {
      headers: { 'xi-api-key': this.apiKey, ...form.getHeaders() },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const transcript: string = response.data?.text ?? '';
    logger.info({ length: transcript.length }, 'ElevenLabs transcription complete');
    return transcript;
  }
}

export const elevenLabsSTTAdapter = new ElevenLabsSTTAdapter();
