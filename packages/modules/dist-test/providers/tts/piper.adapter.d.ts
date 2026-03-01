import { TTSAdapter, ProviderCapabilities } from '../types';
/**
 * Piper TTS adapter — local/self-hosted text-to-speech.
 *
 * Compatible with the wyoming-piper HTTP REST API.
 * Piper is fast (< 500ms on CPU), supports Hindi, and runs fully offline.
 *
 * Setup (Docker, one-time):
 *   # Hindi voice (recommended for Execora):
 *   docker run -d -p 5000:5000 \
 *     rhasspy/wyoming-piper \
 *     --voice hi_IN-deepika-medium
 *
 *   # English voice:
 *   docker run -d -p 5000:5000 \
 *     rhasspy/wyoming-piper \
 *     --voice en_US-lessac-medium
 *
 *   # Then set env: PIPER_BASE_URL=http://localhost:5000
 *
 * Available voices: https://huggingface.co/rhasspy/piper-voices
 * Key Hindi voices:
 *   hi_IN-deepika-medium   — female, natural Hinglish
 *   hi_IN-hindi-x-low      — male, lighter weight
 *
 * Trade-offs vs cloud TTS:
 *   - ✅ Fully offline — zero per-character API cost
 *   - ✅ Ultra-fast (< 500ms on CPU, < 100ms on GPU)
 *   - ✅ Data stays on your infrastructure
 *   - ⚠️  Voice quality lower than ElevenLabs
 *   - ⚠️  Limited emotion/prosody control
 */
export declare class PiperAdapter implements TTSAdapter {
    readonly name = "piper";
    readonly capabilities: ProviderCapabilities;
    private readonly baseUrl;
    private readonly voice;
    constructor();
    isAvailable(): boolean;
    generateSpeech(text: string): Promise<Buffer>;
    /** Piper does not stream — returns the full buffer wrapped in a Readable. */
    generateSpeechStream(text: string): Promise<Buffer>;
}
export declare const piperAdapter: PiperAdapter;
//# sourceMappingURL=piper.adapter.d.ts.map