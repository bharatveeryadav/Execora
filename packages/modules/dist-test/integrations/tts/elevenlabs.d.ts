import { Readable } from 'stream';
declare class ElevenLabsTTSService {
    private apiKey;
    private voiceId;
    private isAvailable;
    private baseUrl;
    constructor();
    /**
     * Check if service is available
     */
    isServiceAvailable(): boolean;
    /**
     * Generate speech from text
     */
    generateSpeech(text: string): Promise<Buffer>;
    /**
     * Generate speech as stream (for real-time playback)
     */
    generateSpeechStream(text: string): Promise<Readable>;
    /**
     * List available voices
     */
    listVoices(): Promise<any[]>;
}
export declare const elevenLabsTTSService: ElevenLabsTTSService;
export {};
//# sourceMappingURL=elevenlabs.d.ts.map