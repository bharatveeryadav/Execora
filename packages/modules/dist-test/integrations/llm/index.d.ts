/**
 * integrations/llm
 *
 * Feature: LLM provider abstraction — OpenAI, Groq, Ollama with fallback.
 * Owner: integrations domain
 * Source of truth: providers/llm/index.ts
 * AI Isolation Rule: LLM service is only invoked via ai/ domain contracts.
 */
export * from "../../providers/llm";
export type { LLMAdapter } from "../../providers/types";
//# sourceMappingURL=index.d.ts.map