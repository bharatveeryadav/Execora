"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.piperAdapter = exports.PiperAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
const infrastructure_1 = require("@execora/infrastructure");
const infrastructure_2 = require("@execora/infrastructure");
const errors_1 = require("../errors");
/**
 * Piper TTS adapter — local/self-hosted text-to-speech.
 *
 * Compatible with the wyoming-piper HTTP REST API.
 * Piper is fast (< 500ms on CPU), supports Hindi, and runs fully offline.
 *
 * Setup (Docker, one-time):
 *   # Hindi voice (recommended for Execora):
 *   docker run -d -p 5000:5000 \
 *     rhasspy/wyoming-piper \
 *     --voice hi_IN-deepika-medium
 *
 *   # English voice:
 *   docker run -d -p 5000:5000 \
 *     rhasspy/wyoming-piper \
 *     --voice en_US-lessac-medium
 *
 *   # Then set env: PIPER_BASE_URL=http://localhost:5000
 *
 * Available voices: https://huggingface.co/rhasspy/piper-voices
 * Key Hindi voices:
 *   hi_IN-deepika-medium   — female, natural Hinglish
 *   hi_IN-hindi-x-low      — male, lighter weight
 *
 * Trade-offs vs cloud TTS:
 *   - ✅ Fully offline — zero per-character API cost
 *   - ✅ Ultra-fast (< 500ms on CPU, < 100ms on GPU)
 *   - ✅ Data stays on your infrastructure
 *   - ⚠️  Voice quality lower than ElevenLabs
 *   - ⚠️  Limited emotion/prosody control
 */
class PiperAdapter {
    name = 'piper';
    capabilities = {
        isLocal: true,
        supportsLiveTranscription: false,
        supportsStreaming: false, // Piper returns a complete WAV buffer
        supportsIntentExtraction: false,
    };
    baseUrl;
    voice;
    constructor() {
        this.baseUrl = infrastructure_1.config.tts.piper.baseUrl;
        this.voice = infrastructure_1.config.tts.piper.voice;
        if (infrastructure_1.config.tts.piper.enabled) {
            infrastructure_2.logger.info({ baseUrl: this.baseUrl, voice: this.voice }, 'Piper TTS adapter initialized');
        }
        else {
            infrastructure_2.logger.debug('Piper not configured — set PIPER_BASE_URL to enable local TTS');
        }
    }
    isAvailable() {
        return infrastructure_1.config.tts.piper.enabled;
    }
    async generateSpeech(text) {
        if (!this.isAvailable()) {
            throw new errors_1.ProviderUnavailableError(this.name, 'generateSpeech');
        }
        // wyoming-piper REST endpoint: POST /api/tts
        const response = await axios_1.default.post(`${this.baseUrl}/api/tts`, { text, voice: this.voice }, {
            headers: { 'Content-Type': 'application/json', Accept: 'audio/wav' },
            responseType: 'arraybuffer',
            timeout: 30_000,
        });
        const buffer = Buffer.from(response.data);
        infrastructure_2.logger.info({ textLength: text.length, audioSize: buffer.length, voice: this.voice }, 'Piper TTS generated');
        return buffer;
    }
    /** Piper does not stream — returns the full buffer wrapped in a Readable. */
    async generateSpeechStream(text) {
        return this.generateSpeech(text);
    }
}
exports.PiperAdapter = PiperAdapter;
exports.piperAdapter = new PiperAdapter();
//# sourceMappingURL=piper.adapter.js.map