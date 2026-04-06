/**
 * PCM Audio Worklet Processor
 *
 * Replaces the deprecated ScriptProcessor for real-time PCM capture.
 * Runs in a dedicated audio rendering thread — no UI thread blocking,
 * no dropped frames under load, works correctly on mobile.
 *
 * What it does:
 *  - Receives Float32 audio blocks (128 samples) at the AudioContext sample rate
 *  - Downsamples to 16000 Hz (required by ElevenLabs STT)
 *  - Converts Float32 → Int16 PCM
 *  - Transfers chunks to the main thread via port (zero-copy)
 *
 * Chunk size: 2048 samples @ 16000 Hz = 128ms per chunk (low latency for live STT)
 */
class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._outBuffer = [];
        this._chunkSamples = 1024; // 64 ms at 16 kHz — lower latency for faster VAD trigger
    }

    process(inputs) {
        const channel = inputs[0]?.[0];
        if (!channel || channel.length === 0) return true;

        // Nearest-neighbour downsample: AudioContext rate → 16000 Hz
        // `sampleRate` is a global inside AudioWorkletProcessor (the context's actual rate)
        const ratio = sampleRate / 16000;
        const outLen = Math.round(channel.length / ratio);

        for (let i = 0; i < outLen; i++) {
            const src = Math.min(Math.round(i * ratio), channel.length - 1);
            this._outBuffer.push(channel[src]);
        }

        // Flush complete chunks to the main thread
        while (this._outBuffer.length >= this._chunkSamples) {
            const chunk = this._outBuffer.splice(0, this._chunkSamples);
            const int16 = new Int16Array(this._chunkSamples);

            for (let i = 0; i < this._chunkSamples; i++) {
                const s = Math.max(-1, Math.min(1, chunk[i]));
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            // Transferable — zero-copy hand-off to main thread
            this.port.postMessage(int16.buffer, [int16.buffer]);
        }

        return true; // keep processor alive
    }
}

registerProcessor('pcm-processor', PCMProcessor);
