import { LLMAdapter, RawLLMResponse, ProviderCapabilities } from '../types';
/**
 * Groq adapter — OpenAI-compatible API backed by LPU hardware.
 * ~200ms from India vs ~1400ms for OpenAI servers.
 * Used exclusively for free-form response generation (llama-3.3-70b-versatile).
 * NOT used for intent extraction — llama cannot reliably follow the complex
 * 21-rule JSON prompt, so extractIntent() throws to force OpenAI fallback.
 */
export declare class GroqAdapter implements LLMAdapter {
    readonly name = "groq";
    readonly capabilities: ProviderCapabilities;
    private client;
    private readonly model;
    constructor();
    isAvailable(): boolean;
    /** Groq does not support the complex JSON intent prompt — always delegate to OpenAI. */
    extractIntent(_transcript: string, _systemPrompt: string): Promise<RawLLMResponse>;
    generateResponse(systemPrompt: string, userPrompt: string, maxTokens: number, onChunk?: (chunk: string) => void): Promise<RawLLMResponse>;
}
export declare const groqAdapter: GroqAdapter;
//# sourceMappingURL=groq.adapter.d.ts.map