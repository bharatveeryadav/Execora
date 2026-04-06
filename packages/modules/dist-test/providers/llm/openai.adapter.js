"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiLLMAdapter = exports.OpenAIAdapter = void 0;
const openai_1 = __importDefault(require("openai"));
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
/**
 * OpenAI adapter — used for intent extraction (gpt-4o-mini, JSON mode)
 * and as the response-generation fallback when Groq is unavailable.
 */
class OpenAIAdapter {
    name = 'openai';
    capabilities = {
        isLocal: false,
        supportsLiveTranscription: false,
        supportsStreaming: true,
        supportsIntentExtraction: true,
    };
    client;
    constructor() {
        this.client = new openai_1.default({ apiKey: core_1.config.openai.apiKey });
        core_2.logger.info('OpenAI LLM adapter initialized');
    }
    isAvailable() {
        return !!core_1.config.openai.apiKey;
    }
    async extractIntent(transcript, systemPrompt) {
        const response = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: transcript },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 200,
        });
        return {
            text: response.choices[0].message.content || '{}',
            usage: {
                promptTokens: response.usage?.prompt_tokens ?? 0,
                completionTokens: response.usage?.completion_tokens ?? 0,
                totalTokens: response.usage?.total_tokens ?? 0,
            },
            model: response.model,
        };
    }
    async generateResponse(systemPrompt, userPrompt, maxTokens, onChunk) {
        const model = 'gpt-4o-mini';
        let finalText = '';
        let rawUsage = null;
        // Stream tokens so the client hears first words sooner
        const stream = await this.client.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: maxTokens,
            stream: true,
            stream_options: { include_usage: true },
        });
        for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || '';
            if (token) {
                finalText += token;
                onChunk?.(token);
            }
            if (chunk.usage)
                rawUsage = chunk.usage;
        }
        return {
            text: finalText.trim(),
            usage: rawUsage ? {
                promptTokens: rawUsage.prompt_tokens ?? 0,
                completionTokens: rawUsage.completion_tokens ?? 0,
                totalTokens: rawUsage.total_tokens ?? 0,
            } : undefined,
            model,
        };
    }
    /** One-shot LLM call (no streaming) — used for transliteration + normalization */
    async complete(systemPrompt, userContent, maxTokens) {
        const response = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
            ],
            temperature: 0,
            max_tokens: maxTokens,
        });
        return response.choices[0].message.content?.trim() ?? '';
    }
}
exports.OpenAIAdapter = OpenAIAdapter;
exports.openaiLLMAdapter = new OpenAIAdapter();
//# sourceMappingURL=openai.adapter.js.map