import { LLMAdapter, RawLLMResponse, ProviderCapabilities } from '../types';
/**
 * OpenAI adapter — used for intent extraction (gpt-4o-mini, JSON mode)
 * and as the response-generation fallback when Groq is unavailable.
 */
export declare class OpenAIAdapter implements LLMAdapter {
    readonly name = "openai";
    readonly capabilities: ProviderCapabilities;
    private client;
    constructor();
    isAvailable(): boolean;
    extractIntent(transcript: string, systemPrompt: string): Promise<RawLLMResponse>;
    generateResponse(systemPrompt: string, userPrompt: string, maxTokens: number, onChunk?: (chunk: string) => void): Promise<RawLLMResponse>;
    /** One-shot LLM call (no streaming) — used for transliteration + normalization */
    complete(systemPrompt: string, userContent: string, maxTokens: number): Promise<string>;
}
export declare const openaiLLMAdapter: OpenAIAdapter;
//# sourceMappingURL=openai.adapter.d.ts.map