import { Readable } from 'stream';
/**
 * Describes what a provider can and cannot do.
 * Service layers use this to decide which adapter to route to at runtime.
 */
export interface ProviderCapabilities {
    /** Provider runs locally — no internet required, no API key needed */
    isLocal: boolean;
    /** Whether the adapter can produce live transcription streams */
    supportsLiveTranscription: boolean;
    /** Whether the adapter can produce audio streams (not just buffers) */
    supportsStreaming: boolean;
    /** Whether intent extraction is supported (LLM only) */
    supportsIntentExtraction: boolean;
}
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}
export interface RawLLMResponse {
    text: string;
    usage?: TokenUsage;
    model: string;
}
/**
 * Adapter interface all LLM providers must implement.
 * Consumers talk only to LLMService (src/providers/llm/index.ts),
 * never to adapters directly.
 */
export interface LLMAdapter {
    readonly name: string;
    readonly capabilities: ProviderCapabilities;
    isAvailable(): boolean;
    /** Extract structured intent JSON from a voice transcript */
    extractIntent(transcript: string, systemPrompt: string): Promise<RawLLMResponse>;
    /** Generate a free-form natural language response */
    generateResponse(systemPrompt: string, userPrompt: string, maxTokens: number, onChunk?: (chunk: string) => void): Promise<RawLLMResponse>;
}
/**
 * Unified interface returned by all STT adapters for live transcription.
 * Normalises Deepgram's event-based connection and ElevenLabs' message-based
 * WebSocket into a single send/finish contract.
 */
export interface LiveTranscriptionSession {
    send(audioChunk: Buffer): void;
    finish(): void;
}
/**
 * Options passed when opening a live transcription session.
 * Lets the frontend signal to the backend what audio format it will stream.
 */
export interface LiveTranscriptionOptions {
    /** Raw audio encoding — 'linear16' = Int16 PCM, 'webm' = WebM container */
    encoding?: 'linear16' | 'webm' | 'ogg';
    /** Sample rate in Hz (required when encoding is 'linear16') */
    sampleRate?: number;
    /** Number of audio channels (default 1 = mono) */
    channels?: number;
}
/**
 * Adapter interface all STT providers must implement.
 */
export interface STTAdapter {
    readonly name: string;
    readonly capabilities: ProviderCapabilities;
    isAvailable(): boolean;
    createLiveTranscription(onTranscript: (text: string, isFinal: boolean) => void, onError: (error: Error) => void, options?: LiveTranscriptionOptions): Promise<LiveTranscriptionSession>;
    transcribeAudio(buffer: Buffer, mimeType: string): Promise<string>;
}
/**
 * Adapter interface all TTS providers must implement.
 */
export interface TTSAdapter {
    readonly name: string;
    readonly capabilities: ProviderCapabilities;
    isAvailable(): boolean;
    generateSpeech(text: string): Promise<Buffer>;
    /** Returns a Readable stream when the provider supports streaming, otherwise a Buffer */
    generateSpeechStream(text: string): Promise<Readable | Buffer>;
}
//# sourceMappingURL=types.d.ts.map