import { STTAdapter, LiveTranscriptionSession, ProviderCapabilities } from '../types';
/**
 * Deepgram STT adapter.
 * Wraps Deepgram's event-based live connection into the unified
 * LiveTranscriptionSession interface (send / finish).
 */
export declare class DeepgramAdapter implements STTAdapter {
    readonly name = "deepgram";
    readonly capabilities: ProviderCapabilities;
    private client;
    constructor();
    isAvailable(): boolean;
    createLiveTranscription(onTranscript: (text: string, isFinal: boolean) => void, onError: (error: Error) => void): Promise<LiveTranscriptionSession>;
    transcribeAudio(audioBuffer: Buffer, mimeType?: string): Promise<string>;
}
export declare const deepgramAdapter: DeepgramAdapter;
//# sourceMappingURL=deepgram.adapter.d.ts.map