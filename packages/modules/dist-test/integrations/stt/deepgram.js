"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepgramService = void 0;
const sdk_1 = require("@deepgram/sdk");
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
class DeepgramService {
    deepgram;
    isAvailable = false;
    constructor() {
        if (core_1.config.stt.deepgram.apiKey) {
            this.deepgram = (0, sdk_1.createClient)(core_1.config.stt.deepgram.apiKey);
            this.isAvailable = true;
            core_2.logger.info('Deepgram STT initialized');
        }
        else {
            core_2.logger.warn('Deepgram API key not provided - STT disabled');
        }
    }
    /**
     * Check if service is available
     */
    isServiceAvailable() {
        return this.isAvailable;
    }
    /**
     * Create live transcription connection
     */
    async createLiveTranscription(onTranscript, onError) {
        if (!this.isAvailable) {
            throw new Error('Deepgram service not available');
        }
        try {
            const connection = this.deepgram.listen.live({
                model: 'nova-3',
                language: 'hi-en', // Hindi-English mix
                smart_format: true,
                punctuate: true,
                interim_results: true,
                endpointing: 200, // 200ms silence for endpoint
                utterance_end_ms: 500,
            });
            // Handle transcript events
            connection.on(sdk_1.LiveTranscriptionEvents.Transcript, (data) => {
                const transcript = data.channel?.alternatives?.[0]?.transcript;
                const isFinal = data.is_final;
                if (transcript && transcript.trim().length > 0) {
                    core_2.logger.debug({ transcript, isFinal }, 'Deepgram transcript');
                    onTranscript(transcript, isFinal);
                }
            });
            // Handle errors
            connection.on(sdk_1.LiveTranscriptionEvents.Error, (error) => {
                core_2.logger.error({ error }, 'Deepgram error');
                onError(error);
            });
            // Handle close
            connection.on(sdk_1.LiveTranscriptionEvents.Close, () => {
                core_2.logger.info('Deepgram connection closed');
            });
            return connection;
        }
        catch (error) {
            core_2.logger.error({ error }, 'Failed to create Deepgram connection');
            throw error;
        }
    }
    /**
     * Transcribe audio buffer (for batch processing)
     */
    async transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
        if (!this.isAvailable) {
            throw new Error('Deepgram service not available');
        }
        try {
            const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
                model: 'nova-2',
                language: 'hi-en',
                smart_format: true,
                punctuate: true,
            });
            if (error) {
                throw error;
            }
            const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
            core_2.logger.info({ transcript, length: transcript.length }, 'Deepgram transcription complete');
            return transcript;
        }
        catch (error) {
            core_2.logger.error({ error }, 'Deepgram transcription failed');
            throw error;
        }
    }
}
exports.deepgramService = new DeepgramService();
//# sourceMappingURL=deepgram.js.map