"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiTTSService = void 0;
const openai_1 = __importDefault(require("openai"));
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
class OpenAITTSService {
    client = null;
    isAvailable = false;
    constructor() {
        if (core_1.config.openai.apiKey) {
            this.client = new openai_1.default({ apiKey: core_1.config.openai.apiKey });
            this.isAvailable = true;
            core_2.logger.info('OpenAI TTS initialized');
        }
        else {
            core_2.logger.warn('OpenAI API key not provided - TTS disabled');
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
    async generateSpeech(text, voice = 'alloy') {
        if (!this.isAvailable) {
            throw new Error('OpenAI TTS service not available');
        }
        const client = this.client;
        if (!client) {
            throw new Error('OpenAI client not initialized');
        }
        try {
            const mp3 = await client.audio.speech.create({
                model: 'tts-1',
                voice: voice, // 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
                input: text,
                speed: 1.0,
            });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            core_2.logger.info({ textLength: text.length, audioSize: buffer.length }, 'OpenAI TTS generated');
            return buffer;
        }
        catch (error) {
            core_2.logger.error({ error }, 'OpenAI TTS failed');
            throw error;
        }
    }
    /**
     * Generate speech with HD quality
     */
    async generateSpeechHD(text, voice = 'alloy') {
        if (!this.isAvailable) {
            throw new Error('OpenAI TTS service not available');
        }
        const client = this.client;
        if (!client) {
            throw new Error('OpenAI client not initialized');
        }
        try {
            const mp3 = await client.audio.speech.create({
                model: 'tts-1-hd',
                voice: voice,
                input: text,
                speed: 1.0,
            });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            core_2.logger.info({ textLength: text.length, audioSize: buffer.length }, 'OpenAI TTS HD generated');
            return buffer;
        }
        catch (error) {
            core_2.logger.error({ error }, 'OpenAI TTS HD failed');
            throw error;
        }
    }
}
exports.openaiTTSService = new OpenAITTSService();
//# sourceMappingURL=openai.js.map