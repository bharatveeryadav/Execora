/**
 * VoiceBar — shared real-time voice conversation bar used across all page headers.
 *
 * Click the pulsing dot (or mic icon) to start / stop a live voice session.
 * The text area next to it shows: interim transcript → thinking → AI response (streamed).
 * All events match the backend EnhancedWebSocketHandler exactly.
 *
 * Backend events received:
 *   voice:started          — STT session confirmed
 *   voice:transcript       — { text, isFinal }   interim / final transcript
 *   voice:thinking         — { transcript }       backend received, processing
 *   voice:response:chunk   — { text }             streaming response tokens
 *   voice:response         — { text }             complete final response
 *   voice:confirm_needed   — { text }             high-risk action needs confirm
 *   voice:tts-stream       — { audio(b64), fmt }  TTS audio → play in browser
 *   error                  — { error }            generic error
 *
 * Frontend sends:
 *   voice:start            — open live-STT session
 *   binary chunks          — WebM/PCM audio
 *   voice:stop             — end recording session
 *   voice:final { text }   — text-only fallback (SpeechRecognition)
 */

import { useCallback, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Mic, MicOff } from "lucide-react";
import { wsClient } from "@/lib/ws";
import { useWS } from "@/contexts/WSContext";

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionResultList {
  length: number;
  [index: number]: BrowserSpeechRecognitionResult;
}

interface BrowserSpeechRecognitionEvent extends Event {
  results: BrowserSpeechRecognitionResultList;
}

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

type VoiceState = "idle" | "listening" | "processing" | "responding" | "confirm" | "error";

interface VoiceBarProps {
  /** Custom idle hint displayed when not in a conversation */
  idleHint?: ReactNode;
}

const DEFAULT_HINT = (
  <>
    <span className="font-medium text-foreground">"बोले तो एक्ज़िक्योरा"</span>
    {" · "}
    <span>"राइस कितना बचा?"</span>
    {" · "}
    <span>"ग्राहक का पेमेंट"</span>
  </>
);

const VoiceBar = ({ idleHint = DEFAULT_HINT }: VoiceBarProps) => {
  const { isConnected } = useWS();

  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [liveText, setLiveText] = useState<ReactNode>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizeFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef("");
  const manualFinalizeSentRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>("idle");
  const canStreamAudioRef = useRef(false);
  const streamBufferRef = useRef(""); // accumulate streamed response chunks
  const ttsProviderRef = useRef<string>("browser"); // captured from server welcome message

  // ── Helper: schedule auto-reset to idle ──────────────────────────────────
  const scheduleReset = useCallback((ms = 7000) => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setVoiceState("idle");
      setLiveText(null);
      streamBufferRef.current = "";
    }, ms);
  }, []);

  const clearProcessingTimeout = useCallback(() => {
    if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
  }, []);

  const clearFinalizeFallback = useCallback(() => {
    if (finalizeFallbackTimerRef.current) {
      clearTimeout(finalizeFallbackTimerRef.current);
      finalizeFallbackTimerRef.current = null;
    }
  }, []);

  const scheduleFinalizeFallback = useCallback(() => {
    clearFinalizeFallback();
    finalizeFallbackTimerRef.current = setTimeout(() => {
      const text = lastTranscriptRef.current.trim();
      if (
        text &&
        !manualFinalizeSentRef.current &&
        (voiceStateRef.current === "processing" || voiceStateRef.current === "listening")
      ) {
        manualFinalizeSentRef.current = true;
        wsClient.send("voice:final", { text });
        setVoiceState("processing");
        setLiveText(`🤔 "${text}" — processing...`);
      }
    }, 1200);
  }, [clearFinalizeFallback]);

  const startProcessingTimeout = useCallback(() => {
    clearProcessingTimeout();
    processingTimerRef.current = setTimeout(() => {
      setVoiceState("idle");
      setLiveText("⚠️ No response received. Please try again.");
      scheduleReset(3000);
    }, 15000);
  }, [clearProcessingTimeout, scheduleReset]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  // ── Backend event listeners ───────────────────────────────────────────────
  useEffect(() => {
    const offs = [
      // Real-time transcript (interim + final)
      wsClient.on("voice:transcript", (payload) => {
        const p = payload as { text?: string; isFinal?: boolean; data?: { text?: string; isFinal?: boolean } };
        const text = p.data?.text ?? p.text;
        if (text) {
          lastTranscriptRef.current = text;
          setLiveText(`🎤 "${text}"`);
        }
      }),

      // Backend received transcript, now processing
      wsClient.on("voice:thinking", (payload) => {
        const p = payload as { transcript?: string; data?: { transcript?: string } };
        const transcript = p.data?.transcript ?? p.transcript;
        clearFinalizeFallback();
        setVoiceState("processing");
        setLiveText(transcript ? `🤔 "${transcript}" — thinking...` : "🤔 Processing...");
        startProcessingTimeout();
      }),

      // Intent extracted (fallback UX when confidence is too low)
      wsClient.on("voice:intent", (payload) => {
        const p = payload as {
          intent?: string;
          confidence?: number;
          data?: { intent?: string; confidence?: number };
        };
        const intent = p.data?.intent ?? p.intent;
        const confidence = p.data?.confidence ?? p.confidence;

        if ((intent === "UNKNOWN" || intent === "unknown") && typeof confidence === "number" && confidence < 0.7) {
          clearFinalizeFallback();
          clearProcessingTimeout();
          setVoiceState("idle");
          setLiveText("⚠️ I couldn’t understand that. Please repeat.");
          scheduleReset(3000);
        }
      }),

      // Streaming response tokens — accumulate in ref
      wsClient.on("voice:response:chunk", (payload) => {
        const p = payload as { text?: string; data?: { text?: string } };
        const text = p.data?.text ?? p.text;
        if (text) {
          clearFinalizeFallback();
          clearProcessingTimeout();
          streamBufferRef.current += text;
          setVoiceState("responding");
          setLiveText(streamBufferRef.current);
        }
      }),

      // Complete final response (may arrive after chunks or stand-alone)
      wsClient.on("voice:response", (payload) => {
        const p = payload as { text?: string; data?: { text?: string } };
        const text = p.data?.text ?? p.text;
        clearFinalizeFallback();
        clearProcessingTimeout();
        streamBufferRef.current = "";
        if (text) {
          setVoiceState("responding");
          setLiveText(text);
          scheduleReset(8000);
        }
      }),

      // High-risk action needs verbal confirmation
      wsClient.on("voice:confirm_needed", (payload) => {
        const p = payload as { text?: string; data?: { text?: string } };
        const text = p.data?.text ?? p.text;
        clearFinalizeFallback();
        clearProcessingTimeout();
        setVoiceState("confirm");
        setLiveText(`⚠️ ${text ?? "Confirm this action?"}`);
        // Don't auto-reset — user must respond
      }),

      // Capture ttsProvider from server welcome message so we can echo it back in voice:start
      wsClient.on("voice:start", (payload) => {
        const p = payload as { data?: { ttsProvider?: string; ttsAvailable?: boolean } };
        if (p.data?.ttsProvider && p.data.ttsProvider !== "none") {
          ttsProviderRef.current = p.data.ttsProvider;
        }
      }),

      // TTS audio from backend — play it
      wsClient.on("voice:tts-stream", (payload) => {
        const p = payload as { audio?: string; format?: string; data?: { audio?: string; format?: string } };
        const audioData = p.data?.audio ?? p.audio;
        const format = p.data?.format ?? p.format;
        if (audioData) {
          const fmt = format ?? "mp3";
          const audio = new Audio(`data:audio/${fmt};base64,${audioData}`);
          audio.play().catch(() => {/* user hasn't interacted yet */});
        }
      }),

      // Generic error
      wsClient.on("error", (payload) => {
        const p = payload as { error?: string; message?: string; data?: { error?: string; message?: string } };
        const errorMessage = p.data?.error ?? p.data?.message ?? p.error ?? p.message;
        clearFinalizeFallback();
        clearProcessingTimeout();
        setVoiceState("error");
        setLiveText(`⚠️ ${errorMessage ?? "Something went wrong"}`);
        scheduleReset(4000);
      }),
    ];

    return () => {
      offs.forEach((off) => off());
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      clearFinalizeFallback();
      clearProcessingTimeout();
    };
  }, [clearFinalizeFallback, clearProcessingTimeout, scheduleReset, startProcessingTimeout]);

  // ── Stop all audio capture ────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    canStreamAudioRef.current = false;
    clearFinalizeFallback();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop(); // fires onstop → sends voice:stop
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, [clearFinalizeFallback]);

  useEffect(() => () => stopAll(), [stopAll]);

  // ── Start voice session ───────────────────────────────────────────────────
  const startVoice = useCallback(async () => {
    // Ensure WS connected
    if (!wsClient.isConnected) {
      wsClient.connect();
      const ok = await wsClient.waitForOpen(5000);
      if (!ok) {
        setVoiceState("error");
        setLiveText("⚠️ Cannot connect to server");
        return;
      }
    }

    setVoiceState("listening");
    setLiveText("🎤 Starting...");
    streamBufferRef.current = "";
    lastTranscriptRef.current = "";
    manualFinalizeSentRef.current = false;
    clearFinalizeFallback();

    if (!navigator.mediaDevices?.getUserMedia) {
      // Skip straight to SpeechRecognition if no mic API
      return startSpeechRecognition();
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression:  true,  // hardware-level denoise before STT
          autoGainControl:   true,  // normalise volume across environments
          channelCount:      1,     // mono — STT providers don't need stereo
          sampleRate:        { ideal: 16000, max: 48000 }, // prefer 16 kHz for ElevenLabs
        },
      });
    } catch {
      return startSpeechRecognition(); // mic denied → browser SR fallback
    }

    streamRef.current = stream;

    // ── Helper: shared teardown for both audio paths ───────────────────────
    const onAudioStop = () => {
      canStreamAudioRef.current = false;
      wsClient.send("voice:stop", {});
      const heardText = lastTranscriptRef.current.trim();
      if (heardText) {
        setVoiceState("processing");
        setLiveText("🤔 Processing...");
        scheduleFinalizeFallback();
        startProcessingTimeout();
      } else {
        // ElevenLabs / Deepgram may deliver the final transcript asynchronously
        // after the connection closes — wait up to 4 s before giving up.
        clearFinalizeFallback();
        setVoiceState("processing");
        setLiveText("🎤 Processing audio...");
        clearProcessingTimeout();
        processingTimerRef.current = setTimeout(() => {
          if (voiceStateRef.current === "processing") {
            setVoiceState("idle");
            setLiveText("⚠️ I couldn't hear clearly. Please try again.");
            scheduleReset(2500);
          }
        }, 4000);
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
    };

    // ── Helper: wait for backend STT session to open ───────────────────────
    const waitForSession = (audioFormat: "pcm" | "webm") =>
      new Promise<boolean>((resolve) => {
        const finish = (ok: boolean) => { clearTimeout(timer); offOk(); offErr(); resolve(ok); };
        const timer    = setTimeout(() => finish(false), 5000);
        const offOk    = wsClient.on("voice:started", () => finish(true));
        const offErr   = wsClient.on("error",         () => finish(false));
        // Signal backend — include audioFormat and ttsProvider so it configures STT/TTS correctly.
        // localStorage preference overrides server default (set in Settings → Voice Assistant).
        const ttsProvider = localStorage.getItem("execora:ttsProvider") ?? ttsProviderRef.current;
        wsClient.send("voice:start", { audioFormat, sampleRate: 16000, ttsProvider });
      });

    // ── Path A: AudioWorklet PCM @ 16 kHz ─────────────────────────────────
    // Required by ElevenLabs (only accepts raw PCM).  Also works with Deepgram
    // linear16 mode.  AudioWorklet is available in all modern browsers.
    const supportsWorklet = typeof AudioContext !== "undefined" && typeof AudioWorklet !== "undefined";

    if (supportsWorklet) {
      try {
        // sampleRate:16000 — browser resamples automatically; worklet receives 16 kHz frames
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        const source   = audioCtx.createMediaStreamSource(stream);

        await audioCtx.audioWorklet.addModule("/pcm-processor.worklet.js");
        const workletNode = new AudioWorkletNode(audioCtx, "pcm-processor");
        canStreamAudioRef.current = false;

        workletNode.port.onmessage = (e: MessageEvent<{ type: string; buffer: ArrayBuffer }>) => {
          if (e.data.type === "audio" && canStreamAudioRef.current) {
            wsClient.sendBinary(e.data.buffer);
          }
        };

        const sessionReady = await waitForSession("pcm");

        if (!sessionReady) {
          await audioCtx.close();
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          setVoiceState("error");
          setLiveText("⚠️ Voice session failed — check mic permissions & server");
          scheduleReset(4000);
          return;
        }

        source.connect(workletNode);
        canStreamAudioRef.current = true;
        setLiveText("🔴 Listening... click to stop");

        // Expose a fake MediaRecorder so stopAll() can call .stop() → pcmStop()
        // stopAll() checks mediaRecorderRef.current?.state === "recording" then calls .stop()
        const pcmStop = () => {
          canStreamAudioRef.current = false;
          source.disconnect();
          workletNode.disconnect();
          audioCtx.close().catch(() => {});
          onAudioStop();
        };
        (mediaRecorderRef as MutableRefObject<MediaRecorder | null>).current = {
          stop: pcmStop,
          state: "recording",
        } as unknown as MediaRecorder;

        return;
      } catch {
        // AudioWorklet not available or worklet file missing — fall through to MediaRecorder
        stream.getTracks().forEach((t) => t.stop());
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        });
        streamRef.current = stream;
      }
    }

    // ── Path B: MediaRecorder WebM (Deepgram accepts this directly) ────────
    const mimeType =
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
      MediaRecorder.isTypeSupported("audio/webm")             ? "audio/webm"             :
      "audio/ogg";

    const mr = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mr;
    canStreamAudioRef.current = false;

    mr.ondataavailable = (e) => {
      if (e.data.size > 0 && canStreamAudioRef.current) wsClient.sendBinary(e.data);
    };
    mr.onstop = onAudioStop;

    const sessionReady = await waitForSession("webm");

    if (!sessionReady) {
      canStreamAudioRef.current = false;
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
      setVoiceState("error");
      setLiveText("⚠️ Voice session failed — check mic permissions & server");
      scheduleReset(4000);
      return;
    }

    canStreamAudioRef.current = true;
    mr.start(250); // 250 ms chunks — halved from 500 ms for lower latency
    setLiveText("🔴 Listening... click to stop");
  }, [clearFinalizeFallback, clearProcessingTimeout, scheduleFinalizeFallback, scheduleReset, startProcessingTimeout]);

  // ── SpeechRecognition fallback (no mic access / unsupported browser) ─────
  const startSpeechRecognition = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SR) {
      setVoiceState("error");
      setLiveText("⚠️ Microphone not available in this browser");
      return;
    }

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = navigator.language?.startsWith("hi") ? "hi-IN" : (navigator.language || "hi-IN");
    rec.interimResults = true;
    rec.continuous = false;

    let finalText = "";

    rec.onresult = (e: BrowserSpeechRecognitionEvent) => {
      const results = Array.from({ length: e.results.length }, (_, i) => e.results[i]);
      finalText = results.filter((r) => r.isFinal).map((r) => r[0].transcript).join(" ");
      const interim = results.filter((r) => !r.isFinal).map((r) => r[0].transcript).join(" ");
      setLiveText(`🎤 "${(finalText + interim).trim()}"`);
    };

    rec.onend = () => {
      recognitionRef.current = null;
      if (finalText.trim()) {
        wsClient.send("voice:final", { text: finalText.trim() });
        setVoiceState("processing");
        setLiveText("🤔 Processing...");
        startProcessingTimeout();
      } else {
        setVoiceState("idle");
        setLiveText(null);
      }
    };

    rec.onerror = () => {
      recognitionRef.current = null;
      setVoiceState("error");
      setLiveText("⚠️ Mic access denied — check browser permissions");
      scheduleReset(4000);
    };

    rec.start();
  }, [scheduleReset, startProcessingTimeout]);

  // ── Dot / mic click ───────────────────────────────────────────────────────
  const handleClick = () => {
    if (voiceState === "listening") {
      // Stop recording — onstop will fire and send voice:stop
      stopAll();
    } else if (voiceState === "processing") {
      // Cannot interrupt while processing
    } else {
      // Start fresh session
      void startVoice();
    }
  };

  // ── Visual state ─────────────────────────────────────────────────────────
  const isListening  = voiceState === "listening";
  const isProcessing = voiceState === "processing";
  const isResponding = voiceState === "responding";
  const isConfirm    = voiceState === "confirm";

  const dotColor =
    isListening  ? "bg-destructive"      :
    isProcessing ? "bg-yellow-500"        :
    isResponding ? "bg-green-500"         :
    isConfirm    ? "bg-yellow-500"        :
    voiceState === "error" ? "bg-destructive/50" :
    isConnected  ? "bg-destructive"       :
    "bg-muted-foreground";

  // Ping when idle+connected (ready to tap) or actively listening
  const showPing = isListening || (voiceState === "idle" && isConnected);

  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted px-4 py-2.5">
      {/* Clickable dot + mic */}
      <button
        type="button"
        onClick={handleClick}
        disabled={isProcessing}
        className="flex shrink-0 cursor-pointer items-center gap-2 disabled:cursor-wait"
        title={isListening ? "Tap to stop" : "Tap to talk to AI agent"}
      >
        <span className="relative flex h-3 w-3">
          {showPing && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          )}
          <span
            className={`relative inline-flex h-3 w-3 rounded-full transition-colors duration-200 ${dotColor}`}
          />
        </span>
        {isListening
          ? <MicOff className="h-4 w-4 text-destructive" />
          : <Mic className="h-4 w-4 text-muted-foreground" />
        }
      </button>

      {/* Conversation text — preserves original text-sm text-muted-foreground style */}
      <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {liveText ?? idleHint}
      </p>
    </div>
  );
};

export default VoiceBar;
