import { LLMAdapter, RawLLMResponse, ProviderCapabilities } from '../types';
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
export declare class OllamaAdapter implements LLMAdapter {
    readonly name = "ollama";
    readonly capabilities: ProviderCapabilities;
    private client;
    private readonly model;
    constructor();
    isAvailable(): boolean;
    extractIntent(transcript: string, systemPrompt: string): Promise<RawLLMResponse>;
    generateResponse(systemPrompt: string, userPrompt: string, maxTokens: number, onChunk?: (chunk: string) => void): Promise<RawLLMResponse>;
}
export declare const ollamaAdapter: OllamaAdapter;
//# sourceMappingURL=ollama.adapter.d.ts.map