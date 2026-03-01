declare class ElevenLabsSTTService {
    private apiKey;
    private isAvailable;
    private baseUrl;
    constructor();
    /**
     * Check if service is available
     */
    isServiceAvailable(): boolean;
    /**
     * Create realtime transcription connection
     */
    createLiveTranscription(onTranscript: (text: string, isFinal: boolean) => void, onError: (error: Error) => void): Promise<{
        send: (audioChunk: Buffer) => void;
        finish: () => void;
    }>;
    /**
     * Transcribe audio buffer
     */
    transcribeAudio(audioBuffer: Buffer, mimeType?: string): Promise<string>;
}
export declare const elevenLabsSTTService: ElevenLabsSTTService;
export {};
//# sourceMappingURL=elevenlabs.d.ts.map