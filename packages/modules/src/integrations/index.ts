/**
 * Integrations Domain
 *
 * Wraps all third-party service adapters behind uniform contracts.
 * No business logic — only adapter fan-out and provider selection.
 *
 * Sub-domains:
 *  - llm: OpenAI / Groq / Ollama
 *  - stt: Deepgram / ElevenLabs / Whisper
 *  - tts: ElevenLabs / OpenAI / Piper
 *  - notifications: WhatsApp / Email
 *
 * Dependency rule: no imports from any business domain.
 */

export * from "./llm";
export * from "./stt";
export * from "./tts";
export * from "./notifications";
export * from "./payment";
export * from "./whatsapp";
export * from "./sms";
export * from "./hardware";
export * from "./ecommerce";
export * from "./taxone";
