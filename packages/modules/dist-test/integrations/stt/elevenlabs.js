"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.elevenLabsSTTService = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const ws_1 = __importDefault(require("ws"));
const infrastructure_1 = require("@execora/infrastructure");
const infrastructure_2 = require("@execora/infrastructure");
class ElevenLabsSTTService {
    apiKey;
    isAvailable = false;
    baseUrl = 'https://api.elevenlabs.io/v1';
    constructor() {
        this.apiKey = infrastructure_1.config.stt.elevenlabs.apiKey || '';
        this.isAvailable = !!this.apiKey;
        if (this.isAvailable) {
            infrastructure_2.logger.info('ElevenLabs STT initialized');
        }
        else {
            infrastructure_2.logger.warn('ElevenLabs API key not provided - STT disabled');
        }
    }
    /**
     * Check if service is available
     */
    isServiceAvailable() {
        return this.isAvailable;
    }
    /**
     * Create realtime transcription connection
     */
    async createLiveTranscription(onTranscript, onError) {
        if (!this.isAvailable) {
            throw new Error('ElevenLabs STT service not available');
        }
        const url = new URL('wss://api.elevenlabs.io/v1/speech-to-text/realtime');
        url.searchParams.set('model_id', infrastructure_1.config.stt.elevenlabs.realtimeModelId);
        url.searchParams.set('audio_format', 'pcm_16000');
        url.searchParams.set('commit_strategy', 'vad');
        if (infrastructure_1.config.stt.elevenlabs.languageCode) {
            url.searchParams.set('language_code', infrastructure_1.config.stt.elevenlabs.languageCode);
        }
        const ws = new ws_1.default(url.toString(), {
            headers: {
                'xi-api-key': this.apiKey,
            },
        });
        let isFinishing = false;
        let closeTimeout = null;
        ws.on('open', () => {
            infrastructure_2.logger.info('🎤 ElevenLabs realtime STT connected');
        });
        ws.on('close', (code, reason) => {
            infrastructure_2.logger.warn({ code, reason: reason?.toString() }, '❌ ElevenLabs realtime STT connection closed');
            if (closeTimeout) {
                clearTimeout(closeTimeout);
            }
        });
        ws.on('message', (data) => {
            try {
                const payload = JSON.parse(data.toString());
                const messageType = payload?.message_type;
                if (messageType === 'session_started') {
                    infrastructure_2.logger.info({ sessionId: payload?.session_id }, '✅ ElevenLabs STT session started');
                    return;
                }
                if (messageType === 'partial_transcript') {
                    if (payload.text) {
                        infrastructure_2.logger.debug({ text: payload.text.substring(0, 50) }, '📝 ElevenLabs partial transcript');
                        onTranscript(payload.text, false);
                    }
                    return;
                }
                if (messageType === 'committed_transcript' || messageType === 'committed_transcript_with_timestamps') {
                    if (payload.text) {
                        infrastructure_2.logger.info({ text: payload.text }, '✅ ElevenLabs FINAL transcript received');
                        onTranscript(payload.text, true);
                    }
                    if (isFinishing) {
                        if (closeTimeout) {
                            clearTimeout(closeTimeout);
                        }
                        setTimeout(() => {
                            if (ws.readyState === ws_1.default.OPEN) {
                                ws.close();
                            }
                        }, 100);
                    }
                    return;
                }
                if (messageType && messageType.endsWith('_error')) {
                    const errorMessage = payload?.message || 'ElevenLabs realtime STT error';
                    infrastructure_2.logger.error({ error: errorMessage }, '❌ ElevenLabs STT error');
                    onError(new Error(errorMessage));
                }
            }
            catch (error) {
                onError(error);
            }
        });
        ws.on('error', (error) => {
            infrastructure_2.logger.error({ error }, '❌ ElevenLabs realtime STT socket error');
            onError(error);
        });
        return {
            send: (audioChunk) => {
                if (ws.readyState !== ws_1.default.OPEN) {
                    return;
                }
                const message = {
                    message_type: 'input_audio_chunk',
                    audio_base_64: audioChunk.toString('base64'),
                    sample_rate: 16000,
                };
                ws.send(JSON.stringify(message));
            },
            finish: () => {
                if (ws.readyState !== ws_1.default.OPEN) {
                    infrastructure_2.logger.warn('❌ STT connection not open, cannot finish');
                    return;
                }
                infrastructure_2.logger.info('📤 Sending commit signal to ElevenLabs STT');
                isFinishing = true;
                // Send commit signal
                ws.send(JSON.stringify({
                    message_type: 'input_audio_chunk',
                    audio_base_64: '',
                    sample_rate: 16000,
                    commit: true,
                }));
                // Set timeout to close connection if no response
                if (closeTimeout) {
                    clearTimeout(closeTimeout);
                }
                closeTimeout = setTimeout(() => {
                    infrastructure_2.logger.warn('⏱️ Timeout waiting for final transcript, closing connection');
                    if (ws.readyState !== ws_1.default.CLOSED) {
                        ws.close();
                    }
                }, 3000); // Wait max 3 seconds for final transcript
            },
        };
    }
    /**
     * Transcribe audio buffer
     */
    async transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
        if (!this.isAvailable) {
            throw new Error('ElevenLabs STT service not available');
        }
        try {
            const form = new form_data_1.default();
            form.append('model_id', infrastructure_1.config.stt.elevenlabs.modelId);
            if (infrastructure_1.config.stt.elevenlabs.languageCode) {
                form.append('language_code', infrastructure_1.config.stt.elevenlabs.languageCode);
            }
            form.append('file', audioBuffer, {
                filename: 'audio.webm',
                contentType: mimeType,
            });
            const response = await axios_1.default.post(`${this.baseUrl}/speech-to-text`, form, {
                headers: {
                    'xi-api-key': this.apiKey,
                    ...form.getHeaders(),
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            });
            const transcript = response.data?.text || '';
            infrastructure_2.logger.info({ length: transcript.length }, 'ElevenLabs transcription complete');
            return transcript;
        }
        catch (error) {
            infrastructure_2.logger.error({ error }, 'ElevenLabs STT failed');
            throw error;
        }
    }
}
exports.elevenLabsSTTService = new ElevenLabsSTTService();
//# sourceMappingURL=elevenlabs.js.map