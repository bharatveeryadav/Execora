import axios from 'axios';
import FormData from 'form-data';
import { config } from '@execora/core';
import { logger } from '@execora/core';
import { STTAdapter, LiveTranscriptionSession, ProviderCapabilities } from '../types';
import { ProviderUnavailableError } from '../errors';

/**
 * Whisper STT adapter — local/self-hosted speech recognition.
 *
 * Compatible with the whisper-asr-webservice REST API
 * (https://github.com/ahmetoner/whisper-asr-webservice).
 *
 * Setup (Docker, one-time):
 *   # CPU-only (slower, works on any machine):
 *   docker run -d -p 9000:9000 \
 *     -e ASR_MODEL=base \
 *     onerahmet/openai-whisper-asr-webservice:latest
 *
 *   # GPU (recommended for production):
 *   docker run -d -p 9000:9000 --gpus all \
 *     -e ASR_MODEL=large-v3 \
 *     onerahmet/openai-whisper-asr-webservice:latest-gpu
 *
 *   # Then set env: WHISPER_BASE_URL=http://localhost:9000
 *
 * Model accuracy guide:
 *   tiny  — very fast, low accuracy      (~1s, 39M params)
 *   base  — fast, decent accuracy        (~2s, 74M params)  ← default
 *   small — balanced                     (~4s, 244M params)
 *   medium — high accuracy               (~8s, 769M params)
 *   large-v3 — best accuracy, slow      (~20s+, 1.55B params)
 *
 * Trade-offs vs cloud STT:
 *   - ✅ Fully offline — zero per-minute API cost
 *   - ✅ Data stays on your infrastructure
 *   - ⚠️  Live transcription NOT supported (batch only — send full audio clip)
 *   - ⚠️  Accuracy on Hindi/code-switching varies by model size
 */
export class WhisperAdapter implements STTAdapter {
  readonly name = 'whisper';
  readonly capabilities: ProviderCapabilities = {
    isLocal:                   true,
    supportsLiveTranscription: false, // Whisper processes complete utterances only
    supportsStreaming:          false,
    supportsIntentExtraction:  false,
  };

  private readonly baseUrl: string;
  private readonly language: string;

  constructor() {
    this.baseUrl  = config.stt.whisper.baseUrl;
    this.language = config.stt.whisper.language;

    if (config.stt.whisper.enabled) {
      logger.info({ baseUrl: this.baseUrl, language: this.language }, 'Whisper STT adapter initialized');
    } else {
      logger.debug('Whisper not configured — set WHISPER_BASE_URL to enable local STT');
    }
  }

  isAvailable(): boolean {
    return config.stt.whisper.enabled;
  }

  /** Whisper does not support live transcription — throws ProviderUnavailableError */
  async createLiveTranscription(
    _onTranscript: (text: string, isFinal: boolean) => void,
    _onError: (error: Error) => void,
  ): Promise<LiveTranscriptionSession> {
    throw new ProviderUnavailableError(
      this.name,
      'createLiveTranscription — Whisper only supports batch transcription. Use Deepgram or ElevenLabs for live sessions.',
    );
  }

  async transcribeAudio(audioBuffer: Buffer, mimeType: string = 'audio/webm'): Promise<string> {
    if (!this.isAvailable()) {
      throw new ProviderUnavailableError(this.name, 'transcribeAudio');
    }

    const form = new FormData();
    form.append('audio_file', audioBuffer, {
      filename:    'audio.webm',
      contentType: mimeType,
    });

    // whisper-asr-webservice query parameters
    const params = new URLSearchParams({
      task:             'transcribe',
      language:         this.language,
      output:           'txt',
      word_timestamps:  'false',
    });

    const response = await axios.post<string>(
      `${this.baseUrl}/asr?${params.toString()}`,
      form,
      {
        headers:          { ...form.getHeaders() },
        maxBodyLength:    Infinity,
        maxContentLength: Infinity,
        responseType:     'text',
        timeout:          60_000, // local inference can be slow on CPU
      },
    );

    const transcript = (typeof response.data === 'string' ? response.data : String(response.data)).trim();
    logger.info({ length: transcript.length, language: this.language }, 'Whisper transcription complete');
    return transcript;
  }
}

export const whisperAdapter = new WhisperAdapter();
