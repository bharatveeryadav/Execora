declare class DeepgramService {
    private deepgram;
    private isAvailable;
    constructor();
    /**
     * Check if service is available
     */
    isServiceAvailable(): boolean;
    /**
     * Create live transcription connection
     */
    createLiveTranscription(onTranscript: (text: string, isFinal: boolean) => void, onError: (error: Error) => void): Promise<any>;
    /**
     * Transcribe audio buffer (for batch processing)
     */
    transcribeAudio(audioBuffer: Buffer, mimeType?: string): Promise<string>;
}
export declare const deepgramService: DeepgramService;
export {};
//# sourceMappingURL=deepgram.d.ts.map