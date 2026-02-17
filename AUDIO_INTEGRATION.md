# 🎙️ Execora Audio Integration Guide

Complete guide to using Execora's real-time audio features.

## 🎯 What's New - Full Audio Integration

### ✅ Completed Features

1. **Real STT (Speech-to-Text)**
   - Deepgram SDK integration
   - Live streaming transcription
   - Hindi-English mix support
   - Interim and final results

2. **Real TTS (Text-to-Speech)**
   - ElevenLabs integration
   - OpenAI TTS integration
   - Automatic audio playback
   - Base64 audio streaming over WebSocket

3. **Web Audio API Frontend**
   - Real microphone capture
   - Binary audio streaming
   - Automatic audio playback
   - Browser compatibility checks

4. **Enhanced WebSocket Handler**
   - Binary data support
   - Audio chunk processing
   - Live STT connection management
   - Recording with MinIO storage

---

## 📋 Quick Start with Audio

### 1. Install Dependencies

```bash
cd execora
npm install
```

New dependencies added:
- `@deepgram/sdk` - For real-time STT

### 2. Configure API Keys

Edit `.env` and add:

```env
# Required for audio features
OPENAI_API_KEY=sk-your-key-here

# STT Provider (choose one)
STT_PROVIDER=deepgram
DEEPGRAM_API_KEY=your-deepgram-key

# TTS Provider (choose one)
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

### 3. Enable Enhanced Audio Mode

```env
# Enable enhanced WebSocket handler with audio support
USE_ENHANCED_AUDIO=true
```

### 4. Use Audio-Enabled Frontend

Open: `http://localhost:3000/index-audio.html`

---

## 🔧 Architecture

### Audio Flow Diagram

```
User Speaks
    │
    ▼
Web Audio API (Microphone)
    │
    ▼
MediaRecorder (Opus codec)
    │
    ▼
WebSocket (Binary chunks - 100ms)
    │
    ▼
Enhanced WebSocket Handler
    │
    ▼
Deepgram Live STT
    │
    ├─→ Interim transcripts (real-time)
    └─→ Final transcript
        │
        ▼
    OpenAI (Intent Extraction)
        │
        ▼
    Business Engine (Execute)
        │
        ▼
    OpenAI (Generate Response)
        │
        ▼
    ElevenLabs/OpenAI TTS
        │
        ▼
    Base64 Audio → WebSocket
        │
        ▼
    Browser Audio Playback
```

---

## 🎤 STT Integration

### Deepgram Setup

1. **Get API Key**:
   - Sign up at https://deepgram.com
   - Create a project
   - Generate API key
   - Add to `.env`: `DEEPGRAM_API_KEY=your-key`

2. **Features**:
   - Live streaming transcription
   - Multi-language support (Hindi-English)
   - Smart formatting
   - Punctuation
   - Interim results (real-time)

3. **Configuration**:

```javascript
// Configured in src/services/stt-deepgram.service.ts
{
  model: 'nova-2',        // Latest model
  language: 'hi-en',      // Hindi-English mix
  smart_format: true,
  punctuate: true,
  interim_results: true,
  endpointing: 300,       // 300ms silence = endpoint
  utterance_end_ms: 1000
}
```

### ElevenLabs STT (Placeholder)

- Currently not implemented (ElevenLabs primarily does TTS)
- Fall back to Deepgram for STT
- Can be extended if ElevenLabs adds STT

---

## 🔊 TTS Integration

### ElevenLabs TTS

1. **Get API Key**:
   - Sign up at https://elevenlabs.io
   - Get API key
   - Choose voice ID
   - Add to `.env`

2. **Features**:
   - High-quality neural voices
   - Multilingual (includes Hindi)
   - Streaming support
   - Voice customization

3. **Configuration**:

```javascript
// In src/services/tts-elevenlabs.service.ts
{
  model_id: 'eleven_multilingual_v2',
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true
  }
}
```

### OpenAI TTS

1. **Setup**:
   - Uses same `OPENAI_API_KEY`
   - No additional setup needed

2. **Features**:
   - Multiple voices (alloy, echo, fable, onyx, nova, shimmer)
   - HD quality option
   - Fast generation

3. **Configuration**:

```javascript
// In src/services/tts-openai.service.ts
{
  model: 'tts-1',        // or 'tts-1-hd' for HD
  voice: 'alloy',
  speed: 1.0
}
```

---

## 🌐 Web Audio API Frontend

### Browser Requirements

- ✅ Modern browser (Chrome 60+, Firefox 55+, Safari 14+, Edge 79+)
- ✅ HTTPS (or localhost) for microphone access
- ✅ WebSocket support
- ✅ Web Audio API support

### Microphone Access

```javascript
// Automatically requested when user clicks "Start Listening"
navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 16000  // Optimal for speech
  }
})
```

### Audio Capture

```javascript
// MediaRecorder with Opus codec
new MediaRecorder(mediaStream, {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 16000
})
```

### Audio Playback

```javascript
// Automatic playback of TTS audio
// Base64 → Blob → ObjectURL → Audio element
```

---

## 🔄 WebSocket Protocol

### Message Types

**Client → Server**:

```javascript
// Start voice capture
{
  type: 'voice:start',
  timestamp: '2026-02-17T...'
}

// Stop voice capture
{
  type: 'voice:stop',
  timestamp: '2026-02-17T...'
}

// Manual transcript (fallback)
{
  type: 'voice:final',
  data: { text: 'Rahul ka balance batao' },
  timestamp: '2026-02-17T...'
}
```

**Server → Client**:

```javascript
// Connection info
{
  type: 'voice:start',
  data: {
    sessionId: 'ws-123...',
    sttAvailable: true,
    ttsAvailable: true,
    sttProvider: 'deepgram',
    ttsProvider: 'elevenlabs'
  }
}

// Transcript (interim or final)
{
  type: 'voice:transcript',
  data: {
    text: 'Rahul ka balance',
    isFinal: false
  }
}

// TTS audio
{
  type: 'voice:tts-stream',
  data: {
    audio: 'base64-encoded-mp3...',
    format: 'mp3'
  }
}
```

**Binary Data**:
- Client sends raw audio chunks (arraybuffer)
- Server forwards to Deepgram
- No binary data sent from server (base64 in JSON instead)

---

## 💾 Recording & Storage

### Enable Recording

```javascript
// Start recording
{
  type: 'recording:start'
}

// Stop recording
{
  type: 'recording:stop'
}
```

### Storage

- Recordings saved to MinIO
- Path: `recordings/{sessionId}/recording-{timestamp}.webm`
- Metadata stored in PostgreSQL
- Download URLs via API: `GET /api/recordings/:id/url`

---

## 🧪 Testing

### Test Without Microphone

1. Open `http://localhost:3000/index.html` (basic version)
2. Use text input to test
3. Type: "Rahul ka balance batao"
4. No audio capture/playback

### Test With Audio

1. Open `http://localhost:3000/index-audio.html`
2. Allow microphone access
3. Click "Start Listening"
4. Speak: "Rahul ka balance batao"
5. Listen to TTS response

### Test STT Only

```bash
# Using curl with audio file
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: audio/webm" \
  --data-binary @audio.webm
```

### Test TTS Only

```bash
# Using curl
curl -X POST http://localhost:3000/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"Namaste, Rahul ka balance 500 rupees hai"}'
```

---

## 🔧 Configuration Options

### STT Configuration

```env
# Choose provider
STT_PROVIDER=deepgram

# Deepgram settings
DEEPGRAM_API_KEY=your-key
```

### TTS Configuration

```env
# Choose provider
TTS_PROVIDER=elevenlabs

# ElevenLabs settings
ELEVENLABS_API_KEY=your-key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Or use OpenAI
TTS_PROVIDER=openai
```

### Audio Quality

```javascript
// Frontend capture quality
{
  sampleRate: 16000,        // 16kHz optimal for speech
  audioBitsPerSecond: 16000 // 16kbps
}
```

---

## 📊 Performance

### Latency Breakdown

- **Microphone → Server**: ~100ms (chunk size)
- **STT (Deepgram)**: ~200-500ms
- **Intent Extraction**: ~500-900ms
- **Business Logic**: ~50-100ms
- **Response Generation**: ~400-700ms
- **TTS Generation**: ~500-1000ms
- **Audio Playback**: ~0ms (instant)

**Total**: ~2-4 seconds (acceptable for conversational AI)

### Bandwidth Usage

- **Uplink (audio)**: ~16 kbps (2 KB/s)
- **Downlink (transcript)**: ~1 kbps
- **Downlink (TTS)**: ~128 kbps peak (burst)

---

## 🛠️ Troubleshooting

### Microphone Access Denied

**Problem**: Browser blocks microphone access

**Solution**:
1. Use HTTPS (or localhost)
2. Check browser permissions
3. Try different browser

### No Audio Playback

**Problem**: TTS audio doesn't play

**Solution**:
1. Check browser console for errors
2. Verify TTS provider API key
3. Test with different browser
4. Check audio permissions

### STT Not Working

**Problem**: No transcription

**Solution**:
1. Verify `DEEPGRAM_API_KEY`
2. Check microphone is working
3. View logs: `docker-compose logs -f app`
4. Test with curl

### Poor Transcription Quality

**Problem**: Incorrect transcripts

**Solution**:
1. Reduce background noise
2. Speak clearly
3. Adjust microphone sensitivity
4. Try different STT model

---

## 🚀 Production Deployment

### Security

1. **Always use HTTPS** in production
2. **Validate audio chunks** (size limits)
3. **Rate limit** audio endpoints
4. **Monitor API usage** (Deepgram, ElevenLabs)

### Scaling

1. **Multiple workers** for concurrent audio processing
2. **Load balancer** with sticky sessions (WebSocket)
3. **Separate STT service** (optional microservice)
4. **CDN** for static audio files

### Monitoring

```javascript
// Metrics to track
- WebSocket connections (active)
- STT requests per minute
- TTS requests per minute
- Average latency
- Error rates
- API costs
```

---

## 💰 Cost Estimation

### Deepgram STT

- $0.0043 per minute of audio
- 100 hours/month = ~$26/month

### ElevenLabs TTS

- 30,000 characters free
- Then $0.30 per 1000 characters
- ~$30/month for moderate usage

### OpenAI TTS

- $0.015 per 1000 characters (standard)
- $0.030 per 1000 characters (HD)
- ~$15/month for moderate usage

---

## 📚 API Reference

### STT Service

```typescript
// Create live connection
await sttService.createLiveTranscription(
  (text, isFinal) => { /* handle */ },
  (error) => { /* handle */ }
)

// Transcribe buffer
await sttService.transcribeAudio(audioBuffer, 'audio/webm')
```

### TTS Service

```typescript
// Generate speech
const audioBuffer = await ttsService.generateSpeech(text)

// Generate stream
const stream = await ttsService.generateSpeechStream(text)
```

---

## ✅ Production Checklist

Before deploying with audio:

- [ ] API keys configured (Deepgram, ElevenLabs/OpenAI)
- [ ] HTTPS enabled
- [ ] WebSocket configured with SSL
- [ ] Tested in target browsers
- [ ] Error handling tested
- [ ] Monitoring configured
- [ ] Rate limiting enabled
- [ ] Cost tracking setup
- [ ] Fallback to text mode working

---

## 🎉 You're Ready!

Execora now has **complete real-time audio integration**!

- ✅ Real microphone capture
- ✅ Live speech-to-text
- ✅ AI processing
- ✅ Text-to-speech
- ✅ Audio playback

**Test it now**: `http://localhost:3000/index-audio.html`
