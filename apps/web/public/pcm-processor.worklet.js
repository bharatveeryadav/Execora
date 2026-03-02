/**
 * PCM Processor AudioWorklet
 *
 * Runs in the AudioWorklet thread (separate from main thread).
 * Receives Float32 audio frames from the browser at 16 kHz (we create the
 * AudioContext at sampleRate:16000, so the browser resamples for us).
 *
 * Converts each frame to Int16 little-endian PCM and posts it to the main
 * thread via the MessagePort so it can be streamed to the backend STT API.
 *
 * Why this is better than MediaRecorder:
 *  - MediaRecorder produces WebM/Ogg containers — ElevenLabs realtime only
 *    accepts raw PCM (pcm_s16le_16000).
 *  - This worklet produces exactly the format ElevenLabs expects, with zero
 *    container overhead, lower latency (~8ms chunks vs 500ms MediaRecorder).
 *  - Deepgram also accepts linear16 PCM (set encoding:'linear16' on the
 *    live connection) which improves reliability and reduces parsing overhead.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._bufferSize = 0;
    // Accumulate ~250 ms of audio at 16 kHz before posting
    // 16000 samples/s × 0.25 s = 4000 samples = 8000 bytes (Int16)
    this._flushThreshold = 4000;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channel = input[0]; // Float32Array, mono

    // Convert Float32 [-1, 1] → Int16 [-32768, 32767]
    const pcm = new Int16Array(channel.length);
    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]));
      pcm[i] = s < 0 ? s * 32768 : s * 32767;
    }

    this._buffer.push(pcm);
    this._bufferSize += pcm.length;

    // Flush when we have enough samples (~250ms) to avoid tiny packet overhead
    if (this._bufferSize >= this._flushThreshold) {
      const merged = new Int16Array(this._bufferSize);
      let offset = 0;
      for (const chunk of this._buffer) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      // Transfer the buffer (zero-copy) — main thread receives it as ArrayBuffer
      this.port.postMessage({ type: 'audio', buffer: merged.buffer }, [merged.buffer]);
      this._buffer = [];
      this._bufferSize = 0;
    }

    return true; // keep processor alive
  }
}

registerProcessor('pcm-processor', PCMProcessor);
