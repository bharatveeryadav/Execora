"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepgramAdapter = exports.DeepgramAdapter = void 0;
const sdk_1 = require("@deepgram/sdk");
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
/**
 * Deepgram STT adapter.
 * Wraps Deepgram's event-based live connection into the unified
 * LiveTranscriptionSession interface (send / finish).
 */
class DeepgramAdapter {
    name = 'deepgram';
    capabilities = {
        isLocal: false,
        supportsLiveTranscription: true,
        supportsStreaming: false,
        supportsIntentExtraction: false,
    };
    client = null;
    constructor() {
        if (core_1.config.stt.deepgram.apiKey) {
            this.client = (0, sdk_1.createClient)(core_1.config.stt.deepgram.apiKey);
            core_2.logger.info('Deepgram STT adapter initialized');
        }
        else {
            core_2.logger.warn('DEEPGRAM_API_KEY not set — Deepgram STT unavailable');
        }
    }
    isAvailable() {
        return this.client !== null;
    }
    async createLiveTranscription(onTranscript, onError, options) {
        if (!this.client)
            throw new Error('Deepgram client not initialised');
        const isPCM = options?.encoding === 'linear16';
        const sampleRate = options?.sampleRate ?? 16000;
        const channels = options?.channels ?? 1;
        const connection = this.client.listen.live({
            model: 'nova-3',
            language: 'hi-en',
            smart_format: true,
            punctuate: true,
            numerals: true, // convert spoken numbers to digits (e.g. "do sau" → "200")
            filler_words: false, // strip "um", "uh", fillers
            interim_results: true,
            endpointing: 300, // 300 ms silence before committing (robust in noisy environments)
            utterance_end_ms: 1000, // wait up to 1 s after last speech before final
            channels,
            // PCM-specific settings — only sent when frontend streams raw linear16
            ...(isPCM ? { encoding: 'linear16', sample_rate: sampleRate } : {}),
        });
        core_2.logger.info({ encoding: isPCM ? 'linear16' : 'webm', sampleRate, channels }, 'Deepgram live session opened');
        connection.on(sdk_1.LiveTranscriptionEvents.Transcript, (data) => {
            const text = data.channel?.alternatives?.[0]?.transcript;
            const isFinal = data.is_final;
            if (text?.trim()) {
                core_2.logger.debug({ text, isFinal }, 'Deepgram transcript');
                onTranscript(text, isFinal);
            }
        });
        connection.on(sdk_1.LiveTranscriptionEvents.Error, (err) => {
            core_2.logger.error({ error: err }, 'Deepgram error');
            onError(err instanceof Error ? err : new Error(String(err)));
        });
        connection.on(sdk_1.LiveTranscriptionEvents.Close, () => {
            core_2.logger.info('Deepgram connection closed');
        });
        return {
            send: (audioChunk) => {
                // Deepgram SDK expects ArrayBuffer, not Node.js Buffer
                const ab = audioChunk.buffer.slice(audioChunk.byteOffset, audioChunk.byteOffset + audioChunk.byteLength);
                connection.send(ab);
            },
            finish: () => {
                try {
                    // requestClose() is the non-deprecated replacement for finish()
                    if (typeof connection.requestClose === 'function') {
                        connection.requestClose();
                    }
                    else {
                        connection.finish();
                    }
                }
                catch {
                    // Deepgram connection may already be closed
                }
            },
        };
    }
    async transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
        if (!this.client)
            throw new Error('Deepgram client not initialised');
        const { result, error } = await this.client.listen.prerecorded.transcribeFile(audioBuffer, {
            model: 'nova-2',
            language: 'hi-en',
            smart_format: true,
            punctuate: true,
        });
        if (error)
            throw error;
        const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
        core_2.logger.info({ length: transcript.length, mimeType }, 'Deepgram transcription complete');
        return transcript;
    }
}
exports.DeepgramAdapter = DeepgramAdapter;
exports.deepgramAdapter = new DeepgramAdapter();
//# sourceMappingURL=deepgram.adapter.js.map