import { Readable } from 'stream';
/**
 * TTS service — provider-agnostic facade.
 *
 * ## Provider selection (env TTS_PROVIDER)
 * 1. Use the configured provider if it is available.
 * 2. If not, auto-fall back to any other available provider.
 * 3. If none available, `isAvailable()` returns false and calls throw.
 *
 * ## Swap provider
 * Change `TTS_PROVIDER=elevenlabs|openai|piper` — zero code changes.
 *
 * ## Add a new provider
 * 1. Create `src/providers/tts/myprovider.adapter.ts` implementing TTSAdapter.
 * 2. Import it here and add it to ADAPTERS.
 * 3. Add config to `src/config.ts` and env var to `.env`.
 */
declare class TTSService {
    private adapter;
    constructor();
    isAvailable(): boolean;
    getProvider(): string;
    /**
     * Generate speech as a Buffer.
     * Automatically retried once on transient errors.
     */
    generateSpeech(text: string): Promise<Buffer>;
    /**
     * Generate speech as a stream (preferred) or Buffer for providers that don't support streaming.
     * Pass `overrideProvider` to bypass the configured provider for a specific request.
     */
    generateSpeechStream(text: string, overrideProvider?: string): Promise<Readable | Buffer>;
    /** Convert audio buffer to base64 for WebSocket transmission */
    bufferToBase64(buffer: Buffer): string;
    /** Collect a Readable stream into a single Buffer */
    streamToBuffer(stream: Readable): Promise<Buffer>;
}
export declare const ttsService: TTSService;
export {};
//# sourceMappingURL=index.d.ts.map