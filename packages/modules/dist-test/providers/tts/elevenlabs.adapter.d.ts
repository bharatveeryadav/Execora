import { Readable } from 'stream';
import { TTSAdapter, ProviderCapabilities } from '../types';
/**
 * ElevenLabs TTS adapter — supports both buffer and streaming synthesis.
 * Preferred provider: higher quality, native Hindi support.
 */
export declare class ElevenLabsTTSAdapter implements TTSAdapter {
    readonly name = "elevenlabs";
    readonly capabilities: ProviderCapabilities;
    private readonly apiKey;
    private readonly voiceId;
    private readonly baseUrl;
    constructor();
    isAvailable(): boolean;
    generateSpeech(text: string): Promise<Buffer>;
    generateSpeechStream(text: string): Promise<Readable>;
}
export declare const elevenLabsTTSAdapter: ElevenLabsTTSAdapter;
//# sourceMappingURL=elevenlabs.adapter.d.ts.map