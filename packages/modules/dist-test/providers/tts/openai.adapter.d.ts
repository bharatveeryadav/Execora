import { TTSAdapter, ProviderCapabilities } from '../types';
/**
 * OpenAI TTS adapter — fallback when ElevenLabs is unavailable.
 * Does not support streaming (returns Buffer from generateSpeechStream too).
 */
export declare class OpenAITTSAdapter implements TTSAdapter {
    readonly name = "openai";
    readonly capabilities: ProviderCapabilities;
    private client;
    private readonly voice;
    constructor();
    isAvailable(): boolean;
    generateSpeech(text: string): Promise<Buffer>;
    /** OpenAI TTS does not support streaming — returns a Buffer wrapped as the interface return type. */
    generateSpeechStream(text: string): Promise<Buffer>;
}
export declare const openaiTTSAdapter: OpenAITTSAdapter;
//# sourceMappingURL=openai.adapter.d.ts.map