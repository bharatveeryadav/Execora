/**
 * integrations/stt
 *
 * Feature: STT (speech-to-text) provider abstraction — Deepgram, ElevenLabs, Whisper.
 * Owner: integrations domain
 * Source of truth: providers/stt/index.ts
 */
export * from "../../providers/stt";
export type { STTAdapter, LiveTranscriptionSession, LiveTranscriptionOptions } from "../../providers/types";
