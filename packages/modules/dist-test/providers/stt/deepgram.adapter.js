"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepgramAdapter = exports.DeepgramAdapter = void 0;
const sdk_1 = require("@deepgram/sdk");
const infrastructure_1 = require("@execora/infrastructure");
const infrastructure_2 = require("@execora/infrastructure");
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
        if (infrastructure_1.config.stt.deepgram.apiKey) {
            this.client = (0, sdk_1.createClient)(infrastructure_1.config.stt.deepgram.apiKey);
            infrastructure_2.logger.info('Deepgram STT adapter initialized');
        }
        else {
            infrastructure_2.logger.warn('DEEPGRAM_API_KEY not set — Deepgram STT unavailable');
        }
    }
    isAvailable() {
        return this.client !== null;
    }
    async createLiveTranscription(onTranscript, onError) {
        if (!this.client)
            throw new Error('Deepgram client not initialised');
        const connection = this.client.listen.live({
            model: 'nova-3',
            language: 'hi-en',
            smart_format: true,
            punctuate: true,
            interim_results: true,
            endpointing: 200,
            utterance_end_ms: 500,
        });
        connection.on(sdk_1.LiveTranscriptionEvents.Transcript, (data) => {
            const text = data.channel?.alternatives?.[0]?.transcript;
            const isFinal = data.is_final;
            if (text?.trim()) {
                infrastructure_2.logger.debug({ text, isFinal }, 'Deepgram transcript');
                onTranscript(text, isFinal);
            }
        });
        connection.on(sdk_1.LiveTranscriptionEvents.Error, (err) => {
            infrastructure_2.logger.error({ error: err }, 'Deepgram error');
            onError(err instanceof Error ? err : new Error(String(err)));
        });
        connection.on(sdk_1.LiveTranscriptionEvents.Close, () => {
            infrastructure_2.logger.info('Deepgram connection closed');
        });
        return {
            send: (audioChunk) => {
                // Deepgram SDK expects ArrayBuffer, not Node.js Buffer
                const ab = audioChunk.buffer.slice(audioChunk.byteOffset, audioChunk.byteOffset + audioChunk.byteLength);
                connection.send(ab);
            },
            finish: () => {
                try {
                    connection.finish();
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
        infrastructure_2.logger.info({ length: transcript.length, mimeType }, 'Deepgram transcription complete');
        return transcript;
    }
}
exports.DeepgramAdapter = DeepgramAdapter;
exports.deepgramAdapter = new DeepgramAdapter();
//# sourceMappingURL=deepgram.adapter.js.map