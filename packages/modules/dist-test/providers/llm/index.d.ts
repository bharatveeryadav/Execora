import { IntentExtraction, ExecutionResult } from '@execora/types';
declare class LLMService {
    constructor();
    private recordUsage;
    private buildResponseCacheKey;
    private parseSpokenPhone;
    /**
     * Devanagari → Roman transliteration.
     * Fast path: local char-map (0ms, covers 99%).
     * Slow path: LLM call, cached 24h.
     */
    private transliterate;
    private normaliseEntities;
    /** Convert phone digit string to Hindi spoken-number words for TTS. */
    phoneToWords(phone: string): string;
    /**
     * Extract structured intent + entities from a voice transcript.
     *
     * Provider priority: OpenAI (accurate JSON mode) → Ollama (local fallback).
     * Groq is deliberately excluded — llama cannot reliably follow the 21-rule JSON prompt.
     */
    extractIntent(transcript: string, rawText?: string, conversationId?: string): Promise<IntentExtraction>;
    /**
     * Clean up a raw ASR transcript (filler words, spoken numbers, ASR errors).
     * Provider priority: OpenAI → Ollama.
     */
    normalizeTranscript(rawText: string): Promise<string>;
    /**
     * Generate a natural-language voice response from an execution result.
     *
     * Provider priority: Groq (LPU ~200ms) → Ollama (local, zero cost) → OpenAI (~1400ms).
     * Responses are cached per intent/result pair to avoid redundant calls.
     */
    generateResponse(executionResult: ExecutionResult, originalIntent: string, _conversationId?: string, onChunk?: (chunk: string) => void, options?: {
        userLanguage?: string;
    }): Promise<string>;
    /**
     * Generate a short Hindi/English confirmation question.
     * Provider priority: OpenAI → Ollama.
     */
    generateConfirmation(action: string, details: unknown): Promise<string>;
}
export declare const llmService: LLMService;
export { llmService as openaiService };
//# sourceMappingURL=index.d.ts.map