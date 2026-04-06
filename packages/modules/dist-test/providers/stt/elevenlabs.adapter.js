"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.elevenLabsSTTAdapter = exports.ElevenLabsSTTAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const ws_1 = __importDefault(require("ws"));
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
/**
 * ElevenLabs STT adapter.
 * Supports both live transcription (WebSocket) and batch transcription (REST).
 */
class ElevenLabsSTTAdapter {
    name = 'elevenlabs';
    capabilities = {
        isLocal: false,
        supportsLiveTranscription: true,
        supportsStreaming: false,
        supportsIntentExtraction: false,
    };
    apiKey;
    baseUrl = 'https://api.elevenlabs.io/v1';
    constructor() {
        this.apiKey = core_1.config.stt.elevenlabs.apiKey ?? '';
        if (this.apiKey) {
            core_2.logger.info('ElevenLabs STT adapter initialized');
        }
        else {
            core_2.logger.warn('ELEVENLABS_API_KEY not set — ElevenLabs STT unavailable');
        }
    }
    isAvailable() {
        return !!this.apiKey;
    }
    async createLiveTranscription(onTranscript, onError, _options) {
        if (!this.apiKey)
            throw new Error('ElevenLabs API key not configured');
        const url = new URL('wss://api.elevenlabs.io/v1/speech-to-text/realtime');
        url.searchParams.set('model_id', core_1.config.stt.elevenlabs.realtimeModelId);
        url.searchParams.set('audio_format', 'pcm_16000');
        url.searchParams.set('commit_strategy', 'vad');
        if (core_1.config.stt.elevenlabs.languageCode) {
            url.searchParams.set('language_code', core_1.config.stt.elevenlabs.languageCode);
        }
        const ws = new ws_1.default(url.toString(), { headers: { 'xi-api-key': this.apiKey } });
        let isFinishing = false;
        let closeTimeout = null;
        ws.on('open', () => core_2.logger.info('ElevenLabs realtime STT connected'));
        ws.on('close', (code, reason) => {
            core_2.logger.warn({ code, reason: reason?.toString() }, 'ElevenLabs realtime STT connection closed');
            if (closeTimeout)
                clearTimeout(closeTimeout);
        });
        ws.on('message', (data) => {
            try {
                const payload = JSON.parse(data.toString());
                const messageType = payload?.message_type;
                if (messageType === 'session_started') {
                    core_2.logger.info({ sessionId: payload?.session_id }, 'ElevenLabs STT session started');
                    return;
                }
                if (messageType === 'partial_transcript') {
                    if (payload.text)
                        onTranscript(payload.text, false);
                    return;
                }
                if (messageType === 'committed_transcript' || messageType === 'committed_transcript_with_timestamps') {
                    if (payload.text) {
                        core_2.logger.info({ text: payload.text }, 'ElevenLabs final transcript received');
                        onTranscript(payload.text, true);
                    }
                    if (isFinishing) {
                        if (closeTimeout)
                            clearTimeout(closeTimeout);
                        setTimeout(() => { if (ws.readyState === ws_1.default.OPEN)
                            ws.close(); }, 100);
                    }
                    return;
                }
                if (messageType?.endsWith('_error')) {
                    onError(new Error(payload?.message ?? 'ElevenLabs STT error'));
                }
            }
            catch (err) {
                onError(err);
            }
        });
        ws.on('error', (err) => {
            core_2.logger.error({ error: err }, 'ElevenLabs realtime STT socket error');
            onError(err);
        });
        return {
            send: (audioChunk) => {
                if (ws.readyState !== ws_1.default.OPEN)
                    return;
                ws.send(JSON.stringify({
                    message_type: 'input_audio_chunk',
                    audio_base_64: audioChunk.toString('base64'),
                    sample_rate: 16000,
                }));
            },
            finish: () => {
                if (ws.readyState !== ws_1.default.OPEN) {
                    core_2.logger.warn('ElevenLabs STT connection not open, cannot finish');
                    return;
                }
                isFinishing = true;
                ws.send(JSON.stringify({
                    message_type: 'input_audio_chunk',
                    audio_base_64: '',
                    sample_rate: 16000,
                    commit: true,
                }));
                if (closeTimeout)
                    clearTimeout(closeTimeout);
                closeTimeout = setTimeout(() => {
                    core_2.logger.warn('Timeout waiting for final transcript, closing ElevenLabs STT connection');
                    if (ws.readyState !== ws_1.default.CLOSED)
                        ws.close();
                }, 5000);
            },
        };
    }
    async transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
        if (!this.apiKey)
            throw new Error('ElevenLabs API key not configured');
        const form = new form_data_1.default();
        form.append('model_id', core_1.config.stt.elevenlabs.modelId);
        if (core_1.config.stt.elevenlabs.languageCode) {
            form.append('language_code', core_1.config.stt.elevenlabs.languageCode);
        }
        form.append('file', audioBuffer, { filename: 'audio.webm', contentType: mimeType });
        const response = await axios_1.default.post(`${this.baseUrl}/speech-to-text`, form, {
            headers: { 'xi-api-key': this.apiKey, ...form.getHeaders() },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        });
        const transcript = response.data?.text ?? '';
        core_2.logger.info({ length: transcript.length }, 'ElevenLabs transcription complete');
        return transcript;
    }
}
exports.ElevenLabsSTTAdapter = ElevenLabsSTTAdapter;
exports.elevenLabsSTTAdapter = new ElevenLabsSTTAdapter();
//# sourceMappingURL=elevenlabs.adapter.js.map