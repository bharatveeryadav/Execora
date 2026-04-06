"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ttsService = void 0;
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
const core_3 = require("@execora/core");
const errors_1 = require("../errors");
const middleware_1 = require("../middleware");
const elevenlabs_adapter_1 = require("./elevenlabs.adapter");
const openai_adapter_1 = require("./openai.adapter");
const piper_adapter_1 = require("./piper.adapter");
/**
 * Adapter registry — ordered by preference.
 * Add new adapters here; no other file needs to change.
 */
const ADAPTERS = {
    elevenlabs: elevenlabs_adapter_1.elevenLabsTTSAdapter,
    openai: openai_adapter_1.openaiTTSAdapter,
    piper: piper_adapter_1.piperAdapter,
};
/**
 * TTS service — provider-agnostic facade.
 *
 * ## Provider selection (env TTS_PROVIDER)
 * 1. Use the configured provider if it is available.
 * 2. If not, auto-fall back to any other available provider.
 * 3. If none available, `isAvailable()` returns false and calls throw.
 *
 * ## Swap provider
 * Change `TTS_PROVIDER=elevenlabs|openai|piper` — zero code changes.
 *
 * ## Add a new provider
 * 1. Create `src/providers/tts/myprovider.adapter.ts` implementing TTSAdapter.
 * 2. Import it here and add it to ADAPTERS.
 * 3. Add config to `src/config.ts` and env var to `.env`.
 */
class TTSService {
    adapter = null;
    constructor() {
        const preferred = core_1.config.tts.provider;
        const primary = ADAPTERS[preferred];
        if (primary?.isAvailable()) {
            this.adapter = primary;
        }
        else {
            if (primary)
                core_2.logger.warn({ preferred }, 'Preferred TTS provider not available — trying fallback');
            const fallback = Object.values(ADAPTERS).find((a) => a.name !== preferred && a.isAvailable()) ?? null;
            if (fallback)
                core_2.logger.warn({ fallback: fallback.name }, 'Using fallback TTS provider');
            this.adapter = fallback;
        }
        if (!this.adapter)
            core_2.logger.error('No TTS provider available — TTS disabled');
        // Report availability of all adapters to Prometheus at startup
        for (const a of Object.values(ADAPTERS)) {
            (0, middleware_1.reportProviderAvailability)(a.name, 'tts', a.isAvailable());
        }
        core_2.logger.info({ provider: this.adapter?.name ?? 'none' }, 'TTS service initialized');
    }
    isAvailable() {
        return this.adapter !== null;
    }
    getProvider() {
        return this.adapter?.name ?? 'none';
    }
    /**
     * Generate speech as a Buffer.
     * Automatically retried once on transient errors.
     */
    async generateSpeech(text) {
        const adapter = this.adapter;
        if (!adapter)
            throw new errors_1.ProviderUnavailableError('tts', 'generateSpeech');
        core_2.logger.info({ provider: adapter.name, textLength: text.length }, 'Generating speech');
        return (0, middleware_1.withProvider)({
            provider: adapter.name,
            providerType: 'tts',
            operation: 'generateSpeech',
            histogram: core_3.ttsProcessingTime,
            maxRetries: 1,
        }, () => adapter.generateSpeech(text));
    }
    /**
     * Generate speech as a stream (preferred) or Buffer for providers that don't support streaming.
     * Pass `overrideProvider` to bypass the configured provider for a specific request.
     */
    async generateSpeechStream(text, overrideProvider) {
        const adapter = overrideProvider
            ? (ADAPTERS[overrideProvider] ?? this.adapter)
            : this.adapter;
        if (!adapter)
            throw new errors_1.ProviderUnavailableError('tts', 'generateSpeechStream');
        core_2.logger.info({ provider: adapter.name, textLength: text.length, isOverride: !!overrideProvider }, 'Generating speech stream');
        return (0, middleware_1.withProvider)({
            provider: adapter.name,
            providerType: 'tts',
            operation: 'generateSpeechStream',
            histogram: core_3.ttsProcessingTime,
            maxRetries: 1,
        }, () => adapter.generateSpeechStream(text));
    }
    /** Convert audio buffer to base64 for WebSocket transmission */
    bufferToBase64(buffer) {
        return buffer.toString('base64');
    }
    /** Collect a Readable stream into a single Buffer */
    async streamToBuffer(stream) {
        const chunks = [];
        try {
            for await (const chunk of stream)
                chunks.push(Buffer.from(chunk));
            const result = Buffer.concat(chunks);
            core_2.logger.info({ bufferSize: result.length, chunkCount: chunks.length }, 'Stream to buffer complete');
            return result;
        }
        catch (err) {
            core_2.logger.error({ error: err.message, chunksReceived: chunks.length }, 'Stream to buffer failed');
            throw err;
        }
    }
}
exports.ttsService = new TTSService();
//# sourceMappingURL=index.js.map