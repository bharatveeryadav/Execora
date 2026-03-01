"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sttService = void 0;
const infrastructure_1 = require("@execora/infrastructure");
const infrastructure_2 = require("@execora/infrastructure");
const infrastructure_3 = require("@execora/infrastructure");
const errors_1 = require("../errors");
const middleware_1 = require("../middleware");
const deepgram_adapter_1 = require("./deepgram.adapter");
const elevenlabs_adapter_1 = require("./elevenlabs.adapter");
const whisper_adapter_1 = require("./whisper.adapter");
/**
 * Adapter registry — ordered by preference.
 * Add new adapters here; no other file needs to change.
 */
const ADAPTERS = {
    deepgram: deepgram_adapter_1.deepgramAdapter,
    elevenlabs: elevenlabs_adapter_1.elevenLabsSTTAdapter,
    whisper: whisper_adapter_1.whisperAdapter,
};
/**
 * STT service — provider-agnostic facade.
 *
 * ## Provider selection (env STT_PROVIDER)
 * 1. Use the configured provider if it is available.
 * 2. If not, auto-fall back to any other available provider
 *    that supports the requested operation.
 * 3. If none available, `isAvailable()` returns false and calls throw.
 *
 * ## Swap provider
 * Change `STT_PROVIDER=deepgram|elevenlabs|whisper` — zero code changes.
 *
 * ## Add a new provider
 * 1. Create `src/providers/stt/myprovider.adapter.ts` implementing STTAdapter.
 * 2. Import it here and add it to ADAPTERS.
 * 3. Add config to `src/config.ts` and env var to `.env`.
 */
class STTService {
    adapter = null;
    constructor() {
        const preferred = infrastructure_1.config.stt.provider;
        const primary = ADAPTERS[preferred];
        if (primary?.isAvailable()) {
            this.adapter = primary;
        }
        else {
            if (primary)
                infrastructure_2.logger.warn({ preferred }, 'Preferred STT provider not available — trying fallback');
            const fallback = Object.values(ADAPTERS).find((a) => a.name !== preferred && a.isAvailable()) ?? null;
            if (fallback)
                infrastructure_2.logger.warn({ fallback: fallback.name }, 'Using fallback STT provider');
            this.adapter = fallback;
        }
        if (!this.adapter)
            infrastructure_2.logger.error('No STT provider available — STT disabled');
        // Report availability of all adapters to Prometheus at startup
        for (const a of Object.values(ADAPTERS)) {
            (0, middleware_1.reportProviderAvailability)(a.name, 'stt', a.isAvailable());
        }
        infrastructure_2.logger.info({ provider: this.adapter?.name ?? 'none' }, 'STT service initialized');
    }
    isAvailable() {
        return this.adapter !== null;
    }
    getProvider() {
        return this.adapter?.name ?? 'none';
    }
    /**
     * Open a live transcription session (streaming audio → partial+final transcripts).
     * Falls back to any adapter that supports live transcription when the primary doesn't.
     */
    async createLiveTranscription(onTranscript, onError) {
        // Find an adapter that supports live transcription
        const adapter = this.adapterFor('supportsLiveTranscription');
        if (!adapter) {
            throw new errors_1.ProviderUnavailableError('stt', 'createLiveTranscription — no adapter supports live transcription');
        }
        // Live sessions are long-lived — we don't wrap in withProvider here because
        // the latency is unbounded. Errors during the session are propagated via onError.
        return adapter.createLiveTranscription(onTranscript, onError);
    }
    /**
     * Transcribe a complete audio buffer (batch mode).
     * Automatically retried once on transient errors.
     */
    async transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
        const adapter = this.adapter;
        if (!adapter)
            throw new errors_1.ProviderUnavailableError('stt', 'transcribeAudio');
        infrastructure_2.logger.info({ provider: adapter.name, size: audioBuffer.length }, 'Transcribing audio');
        return (0, middleware_1.withProvider)({
            provider: adapter.name,
            providerType: 'stt',
            operation: 'transcribeAudio',
            histogram: infrastructure_3.sttProcessingTime,
            maxRetries: 1,
        }, () => adapter.transcribeAudio(audioBuffer, mimeType));
    }
    /** Returns the first available adapter that satisfies a capability, or null. */
    adapterFor(capability) {
        // Prefer the current adapter if it has the capability
        if (this.adapter?.capabilities[capability])
            return this.adapter;
        // Otherwise try any registered adapter that does
        return Object.values(ADAPTERS).find((a) => a.isAvailable() && a.capabilities[capability]) ?? null;
    }
}
exports.sttService = new STTService();
//# sourceMappingURL=index.js.map