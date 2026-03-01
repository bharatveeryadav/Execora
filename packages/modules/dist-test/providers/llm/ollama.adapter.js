"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ollamaAdapter = exports.OllamaAdapter = void 0;
const openai_1 = __importDefault(require("openai"));
const infrastructure_1 = require("@execora/infrastructure");
const infrastructure_2 = require("@execora/infrastructure");
/**
 * Ollama adapter — local/self-hosted LLM inference.
 *
 * Uses the OpenAI-compatible REST API that Ollama exposes at /v1.
 * Supports any model you have pulled: llama3.2, qwen2.5, mistral, phi4, gemma3, etc.
 *
 * Setup (one-time):
 *   1. Install: https://ollama.com/download
 *   2. Pull a model: `ollama pull llama3.2`
 *   3. Serve (auto-starts on install): `ollama serve`
 *   4. Set env: OLLAMA_BASE_URL=http://localhost:11434
 *
 * Trade-offs vs cloud providers:
 *   - ✅ Fully offline — zero API costs, no data leaves your server
 *   - ✅ Unlimited requests, no rate limits
 *   - ⚠️  Accuracy of intent extraction depends on model quality
 *   - ⚠️  Response latency depends on local hardware (GPU recommended)
 *
 * Recommended models:
 *   - llama3.2     — 3B params, fast on CPU, good intent accuracy
 *   - qwen2.5:7b   — 7B params, better accuracy, needs ~6GB RAM
 *   - phi4         — Microsoft's latest, excellent reasoning
 */
class OllamaAdapter {
    name = 'ollama';
    capabilities = {
        isLocal: true,
        supportsLiveTranscription: false,
        supportsStreaming: false, // Ollama streams but we use non-streaming for simplicity
        supportsIntentExtraction: true, // accuracy varies by model
    };
    client = null;
    model;
    constructor() {
        this.model = infrastructure_1.config.ollama.model;
        if (infrastructure_1.config.ollama.enabled) {
            this.client = new openai_1.default({
                apiKey: 'ollama', // Ollama ignores the key but the client requires a non-empty string
                baseURL: `${infrastructure_1.config.ollama.baseUrl}/v1`,
            });
            infrastructure_2.logger.info({ model: this.model, baseUrl: infrastructure_1.config.ollama.baseUrl }, 'Ollama LLM adapter initialized');
        }
        else {
            infrastructure_2.logger.debug('Ollama not configured — set OLLAMA_BASE_URL to enable local LLM');
        }
    }
    isAvailable() {
        return infrastructure_1.config.ollama.enabled && this.client !== null;
    }
    async extractIntent(transcript, systemPrompt) {
        if (!this.client)
            throw new Error('Ollama client not initialised');
        // Request JSON mode — supported by llama3.1+, qwen2.5, mistral-nemo
        // Falls back gracefully: if the model ignores it, the LLM service will parse the JSON anyway
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: transcript },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
            max_tokens: 300,
        });
        return {
            text: response.choices[0].message.content ?? '{}',
            usage: {
                promptTokens: response.usage?.prompt_tokens ?? 0,
                completionTokens: response.usage?.completion_tokens ?? 0,
                totalTokens: response.usage?.total_tokens ?? 0,
            },
            model: `ollama/${this.model}`,
        };
    }
    async generateResponse(systemPrompt, userPrompt, maxTokens, onChunk) {
        if (!this.client)
            throw new Error('Ollama client not initialised');
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
            onChunk?.(text);
        return {
            text,
            usage: {
                promptTokens: response.usage?.prompt_tokens ?? 0,
                completionTokens: response.usage?.completion_tokens ?? 0,
                totalTokens: response.usage?.total_tokens ?? 0,
            },
            model: `ollama/${this.model}`,
        };
    }
}
exports.OllamaAdapter = OllamaAdapter;
exports.ollamaAdapter = new OllamaAdapter();
//# sourceMappingURL=ollama.adapter.js.map