import { Readable } from 'stream';

// ─── LLM ─────────────────────────────────────────────────────────────────────

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
  isAvailable(): boolean;
  /** Extract structured intent JSON from a voice transcript */
  extractIntent(transcript: string, systemPrompt: string): Promise<RawLLMResponse>;
  /** Generate a free-form natural language response */
  generateResponse(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
    onChunk?: (chunk: string) => void,
  ): Promise<RawLLMResponse>;
}

// ─── STT ─────────────────────────────────────────────────────────────────────

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
 * Adapter interface all STT providers must implement.
 */
export interface STTAdapter {
  readonly name: string;
  isAvailable(): boolean;
  createLiveTranscription(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (error: Error) => void,
  ): Promise<LiveTranscriptionSession>;
  transcribeAudio(buffer: Buffer, mimeType: string): Promise<string>;
}

// ─── TTS ─────────────────────────────────────────────────────────────────────

/**
 * Adapter interface all TTS providers must implement.
 */
export interface TTSAdapter {
  readonly name: string;
  isAvailable(): boolean;
  generateSpeech(text: string): Promise<Buffer>;
  /** Returns a Readable stream when the provider supports streaming, otherwise a Buffer */
  generateSpeechStream(text: string): Promise<Readable | Buffer>;
}
