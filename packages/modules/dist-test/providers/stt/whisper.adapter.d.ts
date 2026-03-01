import { STTAdapter, LiveTranscriptionSession, ProviderCapabilities } from '../types';
/**
 * Whisper STT adapter — local/self-hosted speech recognition.
 *
 * Compatible with the whisper-asr-webservice REST API
 * (https://github.com/ahmetoner/whisper-asr-webservice).
 *
 * Setup (Docker, one-time):
 *   # CPU-only (slower, works on any machine):
 *   docker run -d -p 9000:9000 \
 *     -e ASR_MODEL=base \
 *     onerahmet/openai-whisper-asr-webservice:latest
 *
 *   # GPU (recommended for production):
 *   docker run -d -p 9000:9000 --gpus all \
 *     -e ASR_MODEL=large-v3 \
 *     onerahmet/openai-whisper-asr-webservice:latest-gpu
 *
 *   # Then set env: WHISPER_BASE_URL=http://localhost:9000
 *
 * Model accuracy guide:
 *   tiny  — very fast, low accuracy      (~1s, 39M params)
 *   base  — fast, decent accuracy        (~2s, 74M params)  ← default
 *   small — balanced                     (~4s, 244M params)
 *   medium — high accuracy               (~8s, 769M params)
 *   large-v3 — best accuracy, slow      (~20s+, 1.55B params)
 *
 * Trade-offs vs cloud STT:
 *   - ✅ Fully offline — zero per-minute API cost
 *   - ✅ Data stays on your infrastructure
 *   - ⚠️  Live transcription NOT supported (batch only — send full audio clip)
 *   - ⚠️  Accuracy on Hindi/code-switching varies by model size
 */
export declare class WhisperAdapter implements STTAdapter {
    readonly name = "whisper";
    readonly capabilities: ProviderCapabilities;
    private readonly baseUrl;
    private readonly language;
    constructor();
    isAvailable(): boolean;
    /** Whisper does not support live transcription — throws ProviderUnavailableError */
    createLiveTranscription(_onTranscript: (text: string, isFinal: boolean) => void, _onError: (error: Error) => void): Promise<LiveTranscriptionSession>;
    transcribeAudio(audioBuffer: Buffer, mimeType?: string): Promise<string>;
}
export declare const whisperAdapter: WhisperAdapter;
//# sourceMappingURL=whisper.adapter.d.ts.map