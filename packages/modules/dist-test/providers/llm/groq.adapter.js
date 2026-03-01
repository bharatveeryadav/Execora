"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.groqAdapter = exports.GroqAdapter = void 0;
const openai_1 = __importDefault(require("openai"));
const infrastructure_1 = require("@execora/infrastructure");
const infrastructure_2 = require("@execora/infrastructure");
/**
 * Groq adapter — OpenAI-compatible API backed by LPU hardware.
 * ~200ms from India vs ~1400ms for OpenAI servers.
 * Used exclusively for free-form response generation (llama-3.3-70b-versatile).
 * NOT used for intent extraction — llama cannot reliably follow the complex
 * 21-rule JSON prompt, so extractIntent() throws to force OpenAI fallback.
 */
class GroqAdapter {
    name = 'groq';
    capabilities = {
        isLocal: false,
        supportsLiveTranscription: false,
        supportsStreaming: false,
        supportsIntentExtraction: false, // Groq/llama cannot reliably follow the complex JSON prompt
    };
    client = null;
    model = 'llama-3.3-70b-versatile';
    constructor() {
        if (infrastructure_1.config.groq.apiKey) {
            this.client = new openai_1.default({
                apiKey: infrastructure_1.config.groq.apiKey,
                baseURL: 'https://api.groq.com/openai/v1',
            });
            infrastructure_2.logger.info('Groq LLM adapter initialized — fast response generation enabled');
        }
        else {
            infrastructure_2.logger.warn('GROQ_API_KEY not set — response generation will use OpenAI (~1400ms)');
        }
    }
    isAvailable() {
        return !!infrastructure_1.config.groq.apiKey && this.client !== null;
    }
    /** Groq does not support the complex JSON intent prompt — always delegate to OpenAI. */
    async extractIntent(_transcript, _systemPrompt) {
        throw new Error('GroqAdapter does not support intent extraction — use OpenAIAdapter for this operation');
    }
    async generateResponse(systemPrompt, userPrompt, maxTokens, onChunk) {
        if (!this.client) {
            throw new Error('Groq client not initialised');
        }
        // Groq non-streaming: still fast (~200ms) because LPU processes tokens in parallel.
        // Avoids OpenAI-specific stream_options that Groq doesn't support.
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: maxTokens,
        });
        const text = response.choices[0]?.message?.content?.trim() ?? '';
        if (text)
            onChunk?.(text); // deliver whole response at once
        return {
            text,
            usage: {
                promptTokens: response.usage?.prompt_tokens ?? 0,
                completionTokens: response.usage?.completion_tokens ?? 0,
                totalTokens: response.usage?.total_tokens ?? 0,
            },
            model: this.model,
        };
    }
}
exports.GroqAdapter = GroqAdapter;
exports.groqAdapter = new GroqAdapter();
//# sourceMappingURL=groq.adapter.js.map