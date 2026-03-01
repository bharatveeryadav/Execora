import { LiveTranscriptionSession } from '../types';
/**
 * STT service — provider-agnostic facade.
 *
 * ## Provider selection (env STT_PROVIDER)
 * 1. Use the configured provider if it is available.
 * 2. If not, auto-fall back to any other available provider
 *    that supports the requested operation.
 * 3. If none available, `isAvailable()` returns false and calls throw.
 *
 * ## Swap provider
 * Change `STT_PROVIDER=deepgram|elevenlabs|whisper` — zero code changes.
 *
 * ## Add a new provider
 * 1. Create `src/providers/stt/myprovider.adapter.ts` implementing STTAdapter.
 * 2. Import it here and add it to ADAPTERS.
 * 3. Add config to `src/config.ts` and env var to `.env`.
 */
declare class STTService {
    private adapter;
    constructor();
    isAvailable(): boolean;
    getProvider(): string;
    /**
     * Open a live transcription session (streaming audio → partial+final transcripts).
     * Falls back to any adapter that supports live transcription when the primary doesn't.
     */
    createLiveTranscription(onTranscript: (text: string, isFinal: boolean) => void, onError: (error: Error) => void): Promise<LiveTranscriptionSession>;
    /**
     * Transcribe a complete audio buffer (batch mode).
     * Automatically retried once on transient errors.
     */
    transcribeAudio(audioBuffer: Buffer, mimeType?: string): Promise<string>;
    /** Returns the first available adapter that satisfies a capability, or null. */
    private adapterFor;
}
export declare const sttService: STTService;
export {};
//# sourceMappingURL=index.d.ts.map