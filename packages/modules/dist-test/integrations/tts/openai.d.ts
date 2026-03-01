declare class OpenAITTSService {
    private client;
    private isAvailable;
    constructor();
    /**
     * Check if service is available
     */
    isServiceAvailable(): boolean;
    /**
     * Generate speech from text
     */
    generateSpeech(text: string, voice?: string): Promise<Buffer>;
    /**
     * Generate speech with HD quality
     */
    generateSpeechHD(text: string, voice?: string): Promise<Buffer>;
}
export declare const openaiTTSService: OpenAITTSService;
export {};
//# sourceMappingURL=openai.d.ts.map