"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.elevenLabsTTSService = void 0;
const axios_1 = __importDefault(require("axios"));
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
class ElevenLabsTTSService {
    apiKey;
    voiceId;
    isAvailable = false;
    baseUrl = 'https://api.elevenlabs.io/v1';
    constructor() {
        this.apiKey = core_1.config.tts.elevenlabs.apiKey || '';
        this.voiceId = core_1.config.tts.elevenlabs.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default Rachel voice
        this.isAvailable = !!this.apiKey;
        if (this.isAvailable) {
            core_2.logger.info('ElevenLabs TTS initialized');
        }
        else {
            core_2.logger.warn('ElevenLabs API key not provided - TTS disabled');
        }
    }
    /**
     * Check if service is available
     */
    isServiceAvailable() {
        return this.isAvailable;
    }
    /**
     * Generate speech from text
     */
    async generateSpeech(text) {
        if (!this.isAvailable) {
            throw new Error('ElevenLabs TTS service not available');
        }
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/text-to-speech/${this.voiceId}`, {
                text,
                model_id: 'eleven_turbo_v2_5', // Supports Hindi
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.0,
                    use_speaker_boost: true,
                },
            }, {
                headers: {
                    'xi-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer',
            });
            const audioBuffer = Buffer.from(response.data);
            core_2.logger.info({ textLength: text.length, audioSize: audioBuffer.length }, 'ElevenLabs TTS generated');
            return audioBuffer;
        }
        catch (error) {
            core_2.logger.error({ error: error.response?.data || error.message }, 'ElevenLabs TTS failed');
            throw error;
        }
    }
    /**
     * Generate speech as stream (for real-time playback)
     */
    async generateSpeechStream(text) {
        if (!this.isAvailable) {
            throw new Error('ElevenLabs TTS service not available');
        }
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/text-to-speech/${this.voiceId}/stream`, {
                text,
                model_id: 'eleven_turbo_v2_5',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }, {
                headers: {
                    'xi-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                responseType: 'stream',
            });
            core_2.logger.info({ textLength: text.length }, 'ElevenLabs TTS stream started');
            // Attach error handler to stream
            response.data.on('error', (streamError) => {
                core_2.logger.error({
                    error: streamError.message,
                    code: streamError.code,
                    stack: streamError.stack,
                }, 'ElevenLabs TTS stream error event');
            });
            return response.data;
        }
        catch (error) {
            core_2.logger.error({
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
    async listVoices() {
        if (!this.isAvailable) {
            throw new Error('ElevenLabs TTS service not available');
        }
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/voices`, {
                headers: {
                    'xi-api-key': this.apiKey,
                },
            });
            return response.data.voices || [];
        }
        catch (error) {
            core_2.logger.error({ error }, 'Failed to list voices');
            return [];
        }
    }
}
exports.elevenLabsTTSService = new ElevenLabsTTSService();
//# sourceMappingURL=elevenlabs.js.map