// Execora Enhanced WebSocket Client with Web Audio API
class ExecoraAudioClient {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.sessionId = null;
        this.isListening = false;
        this.isRecording = false;

        // Audio context and nodes
        this.audioContext = null;
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.sttProvider = null;
        this.usePcmStreaming = false;
        this.analyser = null;
        this.visualizerData = null;
        this.visualizerFrameId = null;
        this.visualizerBars = [];

        // TTS Provider selection
        this.ttsProvider = 'browser'; // 'browser' | 'openai' | 'elevenlabs'

        // Audio worklet for processing
        this.source = null;
        this.processor = null;
        this.voiceStartPending = false;
        this.voiceStartTimeout = null;
        this.voiceStartResolve = null;
        this.voiceStartReject = null;

        this.initElements();
        this.connect();
        this.attachEventListeners();
    }

    initElements() {
        // Status
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.connectionInfo = document.getElementById('connectionInfo');

        // TTS Provider selector
        this.ttsProviderDropdown = document.getElementById('ttsProvider');
        if (!this.ttsProviderDropdown) {
            console.error('❌ TTS Provider dropdown NOT found!');
        } else {
            console.log('✅ TTS Provider dropdown found, current value:', this.ttsProviderDropdown.value);
        }

        // Voice controls
        this.startVoiceBtn = document.getElementById('startVoiceBtn');
        this.stopVoiceBtn = document.getElementById('stopVoiceBtn');

        // Display
        this.transcriptDiv = document.getElementById('transcript');
        console.log('✅ Transcript div initialized:', this.transcriptDiv);

        this.responseDiv = document.getElementById('response');
        console.log('✅ Response div initialized:', this.responseDiv);
        if (this.responseDiv) {
            console.log('   Response div content:', this.responseDiv.textContent);
            console.log('   Response div classList:', this.responseDiv.className);
        }

        // Text input
        this.textInput = document.getElementById('textInput');
        this.sendTextBtn = document.getElementById('sendTextBtn');

        // Activity log
        this.activityLog = document.getElementById('activityLog');

        // Audio visualizer
        this.audioVisualizer = document.getElementById('audioVisualizer');
        this.initAudioVisualizer();

        // Audio playback element (hidden)
        this.audioPlayer = document.createElement('audio');
        this.audioPlayer.style.display = 'none';
        document.body.appendChild(this.audioPlayer);

        console.log('✅ All elements initialized');
    }

    initAudioVisualizer() {
        if (!this.audioVisualizer) {
            return;
        }

        const barCount = 22;
        this.audioVisualizer.innerHTML = '';
        this.visualizerBars = [];

        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('span');
            bar.className = 'audio-bar';
            this.audioVisualizer.appendChild(bar);
            this.visualizerBars.push(bar);
        }
    }

    startAudioVisualizer() {
        if (!this.audioVisualizer || !this.analyser || this.visualizerBars.length === 0) {
            return;
        }

        this.audioVisualizer.classList.add('active');

        const renderFrame = () => {
            if (!this.analyser || !this.visualizerData || !this.isListening) {
                return;
            }

            this.analyser.getByteFrequencyData(this.visualizerData);

            const binStep = Math.max(1, Math.floor(this.visualizerData.length / this.visualizerBars.length));
            for (let i = 0; i < this.visualizerBars.length; i++) {
                const binIndex = Math.min(this.visualizerData.length - 1, i * binStep);
                const amplitude = this.visualizerData[binIndex] / 255;
                const scale = Math.max(0.18, amplitude);
                this.visualizerBars[i].style.transform = `scaleY(${scale})`;
            }

            this.visualizerFrameId = requestAnimationFrame(renderFrame);
        };

        if (this.visualizerFrameId) {
            cancelAnimationFrame(this.visualizerFrameId);
        }

        this.visualizerFrameId = requestAnimationFrame(renderFrame);
    }

    stopAudioVisualizer() {
        if (this.visualizerFrameId) {
            cancelAnimationFrame(this.visualizerFrameId);
            this.visualizerFrameId = null;
        }

        if (this.audioVisualizer) {
            this.audioVisualizer.classList.remove('active');
        }

        this.visualizerBars.forEach((bar) => {
            bar.style.transform = 'scaleY(0.2)';
        });
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.log('Connecting to server...', 'info');

        this.ws = new WebSocket(wsUrl);
        this.ws.binaryType = 'arraybuffer'; // Important for binary audio data

        this.ws.onopen = () => {
            this.isConnected = true;
            this.updateStatus('Connected', true);
            this.log('Connected to server', 'success');
            this.enableControls();
        };

        this.ws.onmessage = (event) => {
            // Check if binary or text
            if (event.data instanceof ArrayBuffer) {
                this.handleBinaryData(event.data);
            } else {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            }
        };

        this.ws.onerror = (error) => {
            this.log('WebSocket error', 'error');
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            this.isConnected = false;
            this.updateStatus('Disconnected', false);
            this.log('Disconnected from server', 'error');
            this.disableControls();
            this.stopAudioCapture();

            // Attempt reconnection after 3 seconds
            setTimeout(() => {
                if (!this.isConnected) {
                    this.connect();
                }
            }, 3000);
        };
    }

    handleMessage(message) {
        console.log('📨 Received message:', message.type, message);

        switch (message.type) {
            case 'voice:start':
                this.sessionId = message.data.sessionId;
                this.sttProvider = message.data.sttProvider || 'unknown';
                this.usePcmStreaming = this.sttProvider === 'elevenlabs';
                this.connectionInfo.textContent = `Session: ${this.sessionId} | STT: ${message.data.sttProvider || 'N/A'} | TTS: ${message.data.ttsProvider || 'N/A'}`;
                console.log('🎤 STT Provider:', this.sttProvider, 'usesPCM:', this.usePcmStreaming);

                if (!message.data.sttAvailable) {
                    this.log('Warning: STT service not available - voice features limited', 'error');
                } else if (this.usePcmStreaming) {
                    this.log('Using PCM streaming for ElevenLabs STT', 'info');
                }
                break;

            case 'voice:started':
                this.log('Voice capture started', 'success');
                if (this.voiceStartPending && this.voiceStartResolve) {
                    this.voiceStartResolve();
                    this.clearVoiceStartState();
                }
                break;

            case 'voice:stopped':
                this.log('Voice capture stopped', 'info');
                break;

            case 'voice:transcript':
                const isFinal = message.data.isFinal ? ' (final)' : ' (interim)';
                this.transcriptDiv.textContent = message.data.text + isFinal;
                console.log('📝 Transcript received:', message.data.text, 'isFinal:', message.data.isFinal);
                this.log(`Transcript${isFinal}: ${message.data.text}`, 'info');
                break;

            case 'voice:intent':
                this.log(`Intent detected: ${message.data.intent}`, 'info');
                console.log('🎯 Intent:', message.data.intent);
                break;

            case 'voice:response':
                console.log('✅ VOICE_RESPONSE received:', message.data.text);
                console.log('   Response div element:', this.responseDiv);

                this.responseDiv.textContent = message.data.text;
                console.log('   Response div updated:', this.responseDiv.textContent);

                this.log(`Response: ${message.data.text}`, 'success');

                // Use selected TTS provider
                console.log('   TTS Provider:', this.ttsProvider);
                if (this.ttsProvider === 'browser') {
                    // Use free browser speech synthesis
                    console.log('   🔊 Using browser speech synthesis');
                    this.speakText(message.data.text);
                } else if (this.ttsProvider === 'openai' || this.ttsProvider === 'elevenlabs') {
                    // Wait for TTS stream from server
                    console.log('   ⏳ Waiting for', this.ttsProvider, 'TTS audio');
                    this.log(`Waiting for ${this.ttsProvider} TTS audio...`, 'info');
                }

                if (message.data.executionResult) {
                    console.log('📊 Execution result:', message.data.executionResult);
                }
                break;

            case 'voice:tts-stream':
                if (message.data.audio) {
                    console.log('🎵 TTS audio stream received, size:', message.data.audio.length);
                    this.playAudio(message.data.audio, message.data.format || 'mp3');
                    this.log('Playing TTS audio', 'info');
                }
                break;

            case 'recording:started':
                this.log('Recording started', 'success');
                break;

            case 'recording:stopped':
                this.log('Recording stopped', 'info');
                break;

            case 'error':
                console.error('❌ Error received:', message.data.error);
                this.log(`Error: ${message.data.error}`, 'error');
                this.responseDiv.textContent = `Error: ${message.data.error}`;
                if (this.voiceStartPending && this.voiceStartReject) {
                    this.voiceStartReject(new Error(message.data.error || 'Voice start failed'));
                    this.clearVoiceStartState();
                }
                break;

            default:
                console.warn('⚠️  Unknown message type:', message.type, message);
        }
    }

    handleBinaryData(data) {
        // Handle binary audio data if needed (not typically sent from server)
        console.log('Received binary data:', data.byteLength, 'bytes');
    }

    attachEventListeners() {
        // TTS Provider dropdown
        if (this.ttsProviderDropdown) {
            this.ttsProviderDropdown.addEventListener('change', (e) => {
                this.ttsProvider = e.target.value;
                console.log('🔊 TTS Provider changed to:', this.ttsProvider, '(element value:', e.target.value, ')'); // Debug log
                this.log(`Switched TTS provider to: ${this.ttsProvider}`, 'info');
            });
            console.log('✅ TTS Provider listener attached');
        } else {
            console.error('❌ Cannot attach TTS Provider listener - element not found');
        }

        // Start voice button
        this.startVoiceBtn.addEventListener('click', () => {
            this.startVoiceCapture();
        });

        // Stop voice button
        this.stopVoiceBtn.addEventListener('click', () => {
            this.stopVoiceCapture();
        });

        // Send text button
        this.sendTextBtn.addEventListener('click', () => {
            this.sendText();
        });

        // Enter key in text input
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendText();
            }
        });
    }

    async startVoiceCapture() {
        console.log('🎙️ startVoiceCapture() called');
        console.log('   isConnected:', this.isConnected);
        console.log('   isListening:', this.isListening);
        console.log('   mediaStream:', this.mediaStream);
        console.log('   audioContext:', this.audioContext);

        if (!this.isConnected) {
            this.log('Not connected to server', 'error');
            return;
        }

        if (this.isListening) {
            console.log('❌ Already listening, ignoring start request');
            return;
        }

        try {
            console.log('📤 Sending voice:start message');
            this.send({
                type: 'voice:start',
                data: {
                    ttsProvider: this.ttsProvider
                },
                timestamp: new Date().toISOString(),
            });
            console.log('✅ voice:start sent with ttsProvider:', this.ttsProvider);

            await this.waitForVoiceStarted();

            console.log('📱 Requesting microphone access...');
            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000, // Optimal for speech recognition
                }
            });
            console.log('✅ Microphone access granted');

            // Create audio context
            console.log('🎵 Creating new AudioContext...');
            this.audioContext = new(window.AudioContext || window.webkitAudioContext)();
            console.log('   AudioContext state:', this.audioContext.state);

            if (this.audioContext.state === 'suspended') {
                console.log('   AudioContext is suspended, resuming...');
                await this.audioContext.resume();
                console.log('   ✅ AudioContext resumed');
            }

            // Create media stream source
            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
            console.log('✅ Media stream source created');

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 128;
            this.analyser.smoothingTimeConstant = 0.8;
            this.visualizerData = new Uint8Array(this.analyser.frequencyBinCount);
            this.source.connect(this.analyser);

            if (this.usePcmStreaming) {
                console.log('🔊 Using PCM streaming for ElevenLabs');
                this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = 0;

                this.processor.onaudioprocess = (event) => {
                    if (!this.isConnected || this.ws.readyState !== WebSocket.OPEN) {
                        return;
                    }

                    const input = event.inputBuffer.getChannelData(0);
                    const downsampled = this.downsampleBuffer(input, this.audioContext.sampleRate, 16000);
                    const pcm16 = this.floatTo16BitPCM(downsampled);
                    this.ws.send(pcm16.buffer);
                };

                this.source.connect(this.processor);
                this.processor.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                console.log('✅ PCM streaming connected');
            } else {
                console.log('🎙️ Using MediaRecorder');
                // Create media recorder for sending audio
                this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                    mimeType: 'audio/webm;codecs=opus',
                    audioBitsPerSecond: 16000
                });

                this.audioChunks = [];

                this.mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        // Send audio chunk to server
                        this.sendAudioChunk(event.data);
                    }
                };

                this.mediaRecorder.start(100); // Send data every 100ms
                console.log('✅ MediaRecorder started');
            }

            this.isListening = true;
            this.startVoiceBtn.disabled = true;
            this.stopVoiceBtn.disabled = false;

            this.transcriptDiv.textContent = 'Listening...';
            this.startAudioVisualizer();

            this.log('Microphone access granted - listening', 'success');

        } catch (error) {
            this.clearVoiceStartState();
            console.error('❌ Error accessing microphone:', error);
            console.error('   Error type:', error.name);
            console.error('   Error message:', error.message);

            if (error && error.message && (error.message.includes('voice:start') || error.message.includes('Failed to start voice capture'))) {
                this.log(`Voice start failed: ${error.message}`, 'error');
            } else {
                this.log('Microphone access denied or not available', 'error');
                alert('Please allow microphone access to use voice features: ' + error.message);
            }
        }
    }

    stopVoiceCapture() {
        console.log('🛑 stopVoiceCapture() called');
        this.isListening = false;
        this.startVoiceBtn.disabled = false;
        this.stopVoiceBtn.disabled = true;

        this.stopAudioCapture();

        // Add small delay before sending stop message to ensure cleanup
        setTimeout(() => {
            console.log('📤 Sending voice:stop message');
            // Send voice stop message
            this.send({
                type: 'voice:stop',
                timestamp: new Date().toISOString(),
            });
            console.log('✅ voice:stop sent');

            this.log('Stopped listening', 'info');
        }, 100);
    }

    stopAudioCapture() {
        console.log('⏹️ stopAudioCapture() called');
        this.stopAudioVisualizer();

        // Stop media recorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            console.log('⏹️ Stopping MediaRecorder...');
            this.mediaRecorder.stop();
            console.log('✅ MediaRecorder stopped');
        }

        // Stop processor audio graph
        if (this.processor) {
            console.log('🔌 Disconnecting audio graph...');
            try {
                this.processor.disconnect();
                this.source.disconnect();
            } catch (e) {
                console.warn('   Warning disconnecting audio nodes:', e.message);
            }
        }

        // Stop all tracks
        if (this.mediaStream) {
            console.log('🎙️ Stopping media stream tracks...');
            this.mediaStream.getTracks().forEach(track => {
                console.log('   Stopping track:', track.kind);
                track.stop();
            });
            this.mediaStream = null;
            console.log('✅ Media stream stopped');
        }

        // Wait for audioContext to be in a stoppable state
        if (this.audioContext) {
            const contextState = this.audioContext.state;
            console.log('🎵 Closing AudioContext (state:', contextState + ')...');
            try {
                this.audioContext.close();
                console.log('✅ AudioContext closed');
            } catch (e) {
                console.warn('   Warning closing audio context:', e.message);
            }
            this.audioContext = null;
        }

        this.source = null;
        this.processor = null;
        this.mediaRecorder = null;
        this.analyser = null;
        this.visualizerData = null;

        console.log('✅ Audio capture cleanup complete');
    }

    waitForVoiceStarted(timeoutMs = 5000) {
        this.clearVoiceStartState();
        this.voiceStartPending = true;

        return new Promise((resolve, reject) => {
            this.voiceStartResolve = resolve;
            this.voiceStartReject = reject;

            this.voiceStartTimeout = setTimeout(() => {
                if (!this.voiceStartPending) {
                    return;
                }

                this.clearVoiceStartState();
                reject(new Error('Timed out waiting for voice:start acknowledgement'));
            }, timeoutMs);
        });
    }

    clearVoiceStartState() {
        this.voiceStartPending = false;

        if (this.voiceStartTimeout) {
            clearTimeout(this.voiceStartTimeout);
            this.voiceStartTimeout = null;
        }

        this.voiceStartResolve = null;
        this.voiceStartReject = null;
    }

    downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
        if (outputSampleRate === inputSampleRate) {
            return buffer;
        }

        const sampleRateRatio = inputSampleRate / outputSampleRate;
        const newLength = Math.round(buffer.length / sampleRateRatio);
        const result = new Float32Array(newLength);

        let offsetResult = 0;
        let offsetBuffer = 0;

        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
            let accum = 0;
            let count = 0;

            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count += 1;
            }

            result[offsetResult] = accum / count;
            offsetResult += 1;
            offsetBuffer = nextOffsetBuffer;
        }

        return result;
    }

    floatTo16BitPCM(float32Array) {
        const output = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            let s = Math.max(-1, Math.min(1, float32Array[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        return output;
    }

    sendAudioChunk(blob) {
        if (!this.isConnected || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('Cannot send audio - not connected or WebSocket closed');
            return;
        }

        // Send binary audio data
        blob.arrayBuffer().then(buffer => {
            console.log('📤 Sending audio chunk:', buffer.byteLength, 'bytes');
            this.ws.send(buffer);
        });
    }

    playAudio(base64Audio, format) {
        try {
            // Convert base64 to blob
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const blob = new Blob([bytes], {
                type: `audio/${format}`
            });
            const audioUrl = URL.createObjectURL(blob);

            // Play audio
            this.audioPlayer.src = audioUrl;
            this.audioPlayer.play().catch(err => {
                console.error('Audio playback error:', err);
                this.log('Audio playback failed', 'error');
            });

            // Clean up URL after playback
            this.audioPlayer.onended = () => {
                URL.revokeObjectURL(audioUrl);
            };

        } catch (error) {
            console.error('Error playing audio:', error);
            this.log('Failed to play audio', 'error');
        }
    }

    speakText(text) {
        // Use free browser-native Web Speech API (no API calls, completely free)
        if (!('speechSynthesis' in window)) {
            this.log('Speech synthesis not supported in this browser', 'error');
            return;
        }

        // Cancel any previous speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            this.log('Speaking response...', 'info');
        };

        utterance.onend = () => {
            this.log('Speech completed', 'success');
        };

        utterance.onerror = (event) => {
            this.log(`Speech error: ${event.error}`, 'error');
        };

        window.speechSynthesis.speak(utterance);
    }

    sendText() {
        const text = this.textInput.value.trim();
        console.log('📤 sendText() called, text:', text);
        if (!text) {
            console.log('❌ Empty text, returning');
            return;
        }

        console.log('✅ Text is not empty');
        console.log('   Connection status:', this.isConnected);
        console.log('   WebSocket state:', this.ws ? this.ws.readyState : 'null');
        console.log('   WebSocket.OPEN constant:', WebSocket.OPEN);

        if (!this.isConnected) {
            this.log('Not connected to server', 'error');
            console.log('❌ Not connected to server');
            return;
        }

        this.log(`Sending: ${text}`, 'info');
        console.log('🚀 Ready to send with ttsProvider:', this.ttsProvider);

        const message = {
            type: 'voice:final',
            data: {
                text,
                ttsProvider: this.ttsProvider
            },
            timestamp: new Date().toISOString(),
        };

        console.log('📨 Message object created:', JSON.stringify(message));
        console.log('   About to call send()');

        // Send final transcript
        this.send(message);

        console.log('✅ send() completed');
        this.textInput.value = '';
    }

    send(message) {
        console.log('🔹 send() called');
        console.log('   WebSocket:', this.ws);
        console.log('   WebSocket readyState:', this.ws ? this.ws.readyState : 'null');
        console.log('   WebSocket.OPEN:', WebSocket.OPEN);

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('   ✅ WebSocket is OPEN, sending message');
            const json = JSON.stringify(message);
            console.log('   📤 Sending JSON:', json.substring(0, 100) + '...');
            this.ws.send(json);
            console.log('   ✅ Message sent via ws.send()');
        } else {
            console.log('   ❌ WebSocket not open or null');
            console.log('      readyState is:', this.ws ? this.ws.readyState : 'null');
        }
    }

    updateStatus(text, connected) {
        this.statusText.textContent = text;
        const dot = this.statusIndicator.querySelector('.status-dot');

        if (connected) {
            dot.classList.add('connected');
        } else {
            dot.classList.remove('connected');
        }
    }

    enableControls() {
        // Check if browser supports required APIs
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.log('Web Audio API not supported in this browser', 'error');
            this.startVoiceBtn.disabled = true;
            this.startVoiceBtn.title = 'Web Audio API not supported';
        } else {
            this.startVoiceBtn.disabled = false;
        }

        this.textInput.disabled = false;
        this.sendTextBtn.disabled = false;
    }

    disableControls() {
        this.startVoiceBtn.disabled = true;
        this.stopVoiceBtn.disabled = true;
        this.textInput.disabled = true;
        this.sendTextBtn.disabled = true;
    }

    log(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;

        const timestamp = new Date().toLocaleTimeString();
        entry.textContent = `[${timestamp}] ${message}`;

        this.activityLog.appendChild(entry);

        // Auto-scroll to bottom
        this.activityLog.scrollTop = this.activityLog.scrollHeight;

        // Keep only last 50 entries
        while (this.activityLog.children.length > 50) {
            this.activityLog.removeChild(this.activityLog.firstChild);
        }
    }
}

// Initialize client when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.execora = new ExecoraAudioClient();
});