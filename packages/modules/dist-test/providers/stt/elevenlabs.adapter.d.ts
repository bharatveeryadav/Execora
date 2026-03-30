import { STTAdapter, LiveTranscriptionSession, ProviderCapabilities } from '../types';
import type { LiveTranscriptionOptions } from '../types';
/**
 * ElevenLabs STT adapter.
 * Supports both live transcription (WebSocket) and batch transcription (REST).
 */
export declare class ElevenLabsSTTAdapter implements STTAdapter {
    readonly name = "elevenlabs";
    readonly capabilities: ProviderCapabilities;
    private readonly apiKey;
    private readonly baseUrl;
    constructor();
    isAvailable(): boolean;
    createLiveTranscription(onTranscript: (text: string, isFinal: boolean) => void, onError: (error: Error) => void, _options?: LiveTranscriptionOptions): Promise<LiveTranscriptionSession>;
    transcribeAudio(audioBuffer: Buffer, mimeType?: string): Promise<string>;
}
export declare const elevenLabsSTTAdapter: ElevenLabsSTTAdapter;
//# sourceMappingURL=elevenlabs.adapter.d.ts.map