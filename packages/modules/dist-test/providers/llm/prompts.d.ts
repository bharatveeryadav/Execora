/**
 * LLM system prompts — single source of truth.
 * Extracted here so adapters stay thin and prompts can be tuned independently.
 */
/**
 * Maps a BCP-47 language code to a response style description used in the
 * response-generation prompt.
 */
export declare function getLangStyle(code: string): string;
/**
 * System prompt used for intent extraction (gpt-4o-mini, JSON mode).
 * Injected with live conversation context before each API call.
 */
export declare function buildIntentSystemPrompt(conversationContext: string): string;
/**
 * System prompt used for response generation (Groq/OpenAI, free-form text).
 */
export declare function buildResponseSystemPrompt(langStyle: string): string;
/** System prompt for transcript normalization (short, plain-text output) */
export declare const NORMALIZE_TRANSCRIPT_PROMPT = "You are a transcription normalization assistant for Hindi/English mixed speech.\nClean up filler words, fix obvious ASR errors, and normalize numbers and product names when possible.\nKeep the meaning identical and keep the text concise.\nRespond with plain text only (no JSON, no quotes).";
/** System prompt for Devanagari → Roman transliteration fallback */
export declare const TRANSLITERATE_PROMPT: string;
//# sourceMappingURL=prompts.d.ts.map