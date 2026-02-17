// Execora WebSocket Client
class ExecoraClient {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.sessionId = null;
        this.isListening = false;

        this.initElements();
        this.connect();
        this.attachEventListeners();
    }

    initElements() {
        // Status
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.connectionInfo = document.getElementById('connectionInfo');

        // Voice controls
        this.startVoiceBtn = document.getElementById('startVoiceBtn');
        this.stopVoiceBtn = document.getElementById('stopVoiceBtn');

        // Display
        this.transcriptDiv = document.getElementById('transcript');
        this.responseDiv = document.getElementById('response');

        // Text input
        this.textInput = document.getElementById('textInput');
        this.sendTextBtn = document.getElementById('sendTextBtn');

        // Activity log
        this.activityLog = document.getElementById('activityLog');
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.log('Connecting to server...', 'info');

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            this.isConnected = true;
            this.updateStatus('Connected', true);
            this.log('Connected to server', 'success');
            this.enableControls();
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
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

            // Attempt reconnection after 3 seconds
            setTimeout(() => {
                if (!this.isConnected) {
                    this.connect();
                }
            }, 3000);
        };
    }

    handleMessage(message) {
        console.log('Received message:', message);

        switch (message.type) {
            case 'voice:start':
                this.sessionId = message.data.sessionId;
                this.connectionInfo.textContent = `Session: ${this.sessionId}`;
                break;

            case 'voice:transcript':
                this.transcriptDiv.textContent = message.data.text;
                this.log(`Transcript: ${message.data.text}`, 'info');
                break;

            case 'voice:intent':
                this.log(`Intent detected: ${message.data.intent}`, 'info');
                break;

            case 'voice:response':
                this.responseDiv.textContent = message.data.text;
                this.log(`Response: ${message.data.text}`, 'success');
                
                if (message.data.executionResult) {
                    console.log('Execution result:', message.data.executionResult);
                }
                break;

            case 'voice:tts-stream':
                // Handle TTS audio streaming (placeholder)
                this.log('TTS audio received', 'info');
                break;

            case 'recording:started':
                this.log('Recording started', 'success');
                break;

            case 'recording:stopped':
                this.log('Recording stopped', 'info');
                break;

            case 'error':
                this.log(`Error: ${message.data.error}`, 'error');
                this.responseDiv.textContent = `Error: ${message.data.error}`;
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    }

    attachEventListeners() {
        // Start voice button
        this.startVoiceBtn.addEventListener('click', () => {
            this.startListening();
        });

        // Stop voice button
        this.stopVoiceBtn.addEventListener('click', () => {
            this.stopListening();
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

    startListening() {
        if (!this.isConnected) {
            this.log('Not connected to server', 'error');
            return;
        }

        this.isListening = true;
        this.startVoiceBtn.disabled = true;
        this.stopVoiceBtn.disabled = false;

        this.transcriptDiv.textContent = 'Listening...';
        this.log('Started listening', 'info');

        // Send recording start message
        this.send({
            type: 'recording:start',
            timestamp: new Date().toISOString(),
        });

        // In a real implementation, you would start capturing audio here
        // and stream it to the server via WebSocket
    }

    stopListening() {
        this.isListening = false;
        this.startVoiceBtn.disabled = false;
        this.stopVoiceBtn.disabled = true;

        this.log('Stopped listening', 'info');

        // Send recording stop message
        this.send({
            type: 'recording:stop',
            timestamp: new Date().toISOString(),
        });
    }

    sendText() {
        const text = this.textInput.value.trim();
        if (!text) return;

        if (!this.isConnected) {
            this.log('Not connected to server', 'error');
            return;
        }

        this.log(`Sending: ${text}`, 'info');

        // Send final transcript
        this.send({
            type: 'voice:final',
            data: { text },
            timestamp: new Date().toISOString(),
        });

        this.textInput.value = '';
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
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
        this.startVoiceBtn.disabled = false;
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
    window.execora = new ExecoraClient();
});
