"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.elevenLabsTTSAdapter = exports.ElevenLabsTTSAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
const infrastructure_1 = require("@execora/infrastructure");
const infrastructure_2 = require("@execora/infrastructure");
/**
 * ElevenLabs TTS adapter — supports both buffer and streaming synthesis.
 * Preferred provider: higher quality, native Hindi support.
 */
class ElevenLabsTTSAdapter {
    name = 'elevenlabs';
    capabilities = {
        isLocal: false,
        supportsLiveTranscription: false,
        supportsStreaming: true,
        supportsIntentExtraction: false,
    };
    apiKey;
    voiceId;
    baseUrl = 'https://api.elevenlabs.io/v1';
    constructor() {
        this.apiKey = infrastructure_1.config.tts.elevenlabs.apiKey ?? '';
        this.voiceId = infrastructure_1.config.tts.elevenlabs.voiceId ?? '21m00Tcm4TlvDq8ikWAM'; // Default Rachel
        if (this.apiKey) {
            infrastructure_2.logger.info('ElevenLabs TTS adapter initialized');
        }
        else {
            infrastructure_2.logger.warn('ELEVENLABS_API_KEY not set — ElevenLabs TTS unavailable');
        }
    }
    isAvailable() {
        return !!this.apiKey;
    }
    async generateSpeech(text) {
        if (!this.apiKey)
            throw new Error('ElevenLabs TTS not configured');
        const response = await axios_1.default.post(`${this.baseUrl}/text-to-speech/${this.voiceId}`, {
            text,
            model_id: 'eleven_turbo_v2_5', // Supports Hindi/multilingual
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
        }, {
            headers: { 'xi-api-key': this.apiKey, 'Content-Type': 'application/json' },
            responseType: 'arraybuffer',
        });
        const buffer = Buffer.from(response.data);
        infrastructure_2.logger.info({ textLength: text.length, audioSize: buffer.length }, 'ElevenLabs TTS generated');
        return buffer;
    }
    async generateSpeechStream(text) {
        if (!this.apiKey)
            throw new Error('ElevenLabs TTS not configured');
        const response = await axios_1.default.post(`${this.baseUrl}/text-to-speech/${this.voiceId}/stream`, {
            text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }, {
            headers: { 'xi-api-key': this.apiKey, 'Content-Type': 'application/json' },
            responseType: 'stream',
        });
        infrastructure_2.logger.info({ textLength: text.length }, 'ElevenLabs TTS stream started');
        response.data.on('error', (err) => {
            infrastructure_2.logger.error({ error: err.message }, 'ElevenLabs TTS stream error');
        });
        return response.data;
    }
}
exports.ElevenLabsTTSAdapter = ElevenLabsTTSAdapter;
exports.elevenLabsTTSAdapter = new ElevenLabsTTSAdapter();
//# sourceMappingURL=elevenlabs.adapter.js.map