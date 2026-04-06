"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiTTSAdapter = exports.OpenAITTSAdapter = void 0;
const openai_1 = __importDefault(require("openai"));
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
/**
 * OpenAI TTS adapter — fallback when ElevenLabs is unavailable.
 * Does not support streaming (returns Buffer from generateSpeechStream too).
 */
class OpenAITTSAdapter {
    name = 'openai';
    capabilities = {
        isLocal: false,
        supportsLiveTranscription: false,
        supportsStreaming: false,
        supportsIntentExtraction: false,
    };
    client = null;
    voice = 'alloy';
    constructor() {
        if (core_1.config.openai.apiKey) {
            this.client = new openai_1.default({ apiKey: core_1.config.openai.apiKey });
            core_2.logger.info('OpenAI TTS adapter initialized');
        }
        else {
            core_2.logger.warn('OPENAI_API_KEY not set — OpenAI TTS unavailable');
        }
    }
    isAvailable() {
        return this.client !== null;
    }
    async generateSpeech(text) {
        if (!this.client)
            throw new Error('OpenAI TTS not configured');
        const mp3 = await this.client.audio.speech.create({
            model: 'tts-1',
            voice: this.voice,
            input: text,
            speed: 1.0,
        });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        core_2.logger.info({ textLength: text.length, audioSize: buffer.length }, 'OpenAI TTS generated');
        return buffer;
    }
    /** OpenAI TTS does not support streaming — returns a Buffer wrapped as the interface return type. */
    async generateSpeechStream(text) {
        return this.generateSpeech(text);
    }
}
exports.OpenAITTSAdapter = OpenAITTSAdapter;
exports.openaiTTSAdapter = new OpenAITTSAdapter();
//# sourceMappingURL=openai.adapter.js.map