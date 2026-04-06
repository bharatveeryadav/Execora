"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whisperAdapter = exports.WhisperAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
const errors_1 = require("../errors");
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
class WhisperAdapter {
    name = 'whisper';
    capabilities = {
        isLocal: true,
        supportsLiveTranscription: false, // Whisper processes complete utterances only
        supportsStreaming: false,
        supportsIntentExtraction: false,
    };
    baseUrl;
    language;
    constructor() {
        this.baseUrl = core_1.config.stt.whisper.baseUrl;
        this.language = core_1.config.stt.whisper.language;
        if (core_1.config.stt.whisper.enabled) {
            core_2.logger.info({ baseUrl: this.baseUrl, language: this.language }, 'Whisper STT adapter initialized');
        }
        else {
            core_2.logger.debug('Whisper not configured — set WHISPER_BASE_URL to enable local STT');
        }
    }
    isAvailable() {
        return core_1.config.stt.whisper.enabled;
    }
    /** Whisper does not support live transcription — throws ProviderUnavailableError */
    async createLiveTranscription(_onTranscript, _onError) {
        throw new errors_1.ProviderUnavailableError(this.name, 'createLiveTranscription — Whisper only supports batch transcription. Use Deepgram or ElevenLabs for live sessions.');
    }
    async transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
        if (!this.isAvailable()) {
            throw new errors_1.ProviderUnavailableError(this.name, 'transcribeAudio');
        }
        const form = new form_data_1.default();
        form.append('audio_file', audioBuffer, {
            filename: 'audio.webm',
            contentType: mimeType,
        });
        // whisper-asr-webservice query parameters
        const params = new URLSearchParams({
            task: 'transcribe',
            language: this.language,
            output: 'txt',
            word_timestamps: 'false',
        });
        const response = await axios_1.default.post(`${this.baseUrl}/asr?${params.toString()}`, form, {
            headers: { ...form.getHeaders() },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            responseType: 'text',
            timeout: 60_000, // local inference can be slow on CPU
        });
        const transcript = (typeof response.data === 'string' ? response.data : String(response.data)).trim();
        core_2.logger.info({ length: transcript.length, language: this.language }, 'Whisper transcription complete');
        return transcript;
    }
}
exports.WhisperAdapter = WhisperAdapter;
exports.whisperAdapter = new WhisperAdapter();
//# sourceMappingURL=whisper.adapter.js.map