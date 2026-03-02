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

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { wsClient } from "@/lib/ws";
import { useWS } from "@/contexts/WSContext";

type VoiceState = "idle" | "listening" | "processing" | "responding" | "confirm" | "error";

interface VoiceBarProps {
  /** Custom idle hint displayed when not in a conversation */
  idleHint?: React.ReactNode;
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
  const [liveText, setLiveText] = useState<React.ReactNode>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canStreamAudioRef = useRef(false);
  const streamBufferRef = useRef(""); // accumulate streamed response chunks

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

  const startProcessingTimeout = useCallback(() => {
    clearProcessingTimeout();
    processingTimerRef.current = setTimeout(() => {
      setVoiceState("idle");
      setLiveText("⚠️ No response received. Please try again.");
      scheduleReset(3000);
    }, 15000);
  }, [clearProcessingTimeout, scheduleReset]);

  // ── Backend event listeners ───────────────────────────────────────────────
  useEffect(() => {
    const offs = [
      // Real-time transcript (interim + final)
      wsClient.on("voice:transcript", (payload) => {
        const p = payload as { text?: string; isFinal?: boolean; data?: { text?: string; isFinal?: boolean } };
        const text = p.data?.text ?? p.text;
        if (text) setLiveText(`🎤 "${text}"`);
      }),

      // Backend received transcript, now processing
      wsClient.on("voice:thinking", (payload) => {
        const p = payload as { transcript?: string; data?: { transcript?: string } };
        const transcript = p.data?.transcript ?? p.transcript;
        setVoiceState("processing");
        setLiveText(transcript ? `🤔 "${transcript}" — thinking...` : "🤔 Processing...");
        startProcessingTimeout();
      }),

      // Streaming response tokens — accumulate in ref
      wsClient.on("voice:response:chunk", (payload) => {
        const p = payload as { text?: string; data?: { text?: string } };
        const text = p.data?.text ?? p.text;
        if (text) {
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
        clearProcessingTimeout();
        setVoiceState("confirm");
        setLiveText(`⚠️ ${text ?? "Confirm this action?"}`);
        // Don't auto-reset — user must respond
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
        clearProcessingTimeout();
        setVoiceState("error");
        setLiveText(`⚠️ ${errorMessage ?? "Something went wrong"}`);
        scheduleReset(4000);
      }),
    ];

    return () => {
      offs.forEach((off) => off());
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      clearProcessingTimeout();
    };
  }, [clearProcessingTimeout, scheduleReset, startProcessingTimeout]);

  // ── Stop all audio capture ────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    canStreamAudioRef.current = false;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop(); // fires onstop → sends voice:stop
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

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

    // ── Binary MediaRecorder (primary — streams to backend STT) ────────────
    const supportsWebm = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm");
    const supportsOgg  = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/ogg");

    if (navigator.mediaDevices?.getUserMedia && (supportsWebm || supportsOgg)) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mimeType = supportsWebm ? "audio/webm" : "audio/ogg";
        const mr = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mr;
        canStreamAudioRef.current = false;

        mr.ondataavailable = (e) => {
          if (e.data.size > 0 && canStreamAudioRef.current) wsClient.sendBinary(e.data);
        };

        mr.onstop = () => {
          // Signal backend: end of audio stream
          canStreamAudioRef.current = false;
          wsClient.send("voice:stop", {});
          setVoiceState("processing");
          setLiveText("🤔 Processing...");
          startProcessingTimeout();
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          mediaRecorderRef.current = null;
        };

        // Tell backend to open live STT session and wait for confirmation
        // before streaming — backend must set isActive=true first or
        // all binary chunks are dropped with "Audio received but session not active"
        wsClient.send("voice:start", {});

        const sessionReady = await new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => { offStarted(); resolve(false); }, 5000);
          const offStarted = wsClient.on("voice:started", () => {
            clearTimeout(timer);
            offStarted();
            resolve(true);
          });
        });

        if (!sessionReady) {
          canStreamAudioRef.current = false;
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          mediaRecorderRef.current = null;
          setVoiceState("error");
          setLiveText("⚠️ Voice session didn't start — try again");
          return;
        }

        canStreamAudioRef.current = true;
        mr.start(500); // now safe to stream — backend isActive = true
        setLiveText("🔴 Listening... click to stop");
        return;
      } catch {
        // Microphone permission denied — fall through to SpeechRecognition
      }
    }

    // ── SpeechRecognition fallback ─────────────────────────────────────────
    const SR =
      (window as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ??
      (window as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SR) {
      setVoiceState("error");
      setLiveText("⚠️ Microphone not available in this browser");
      return;
    }

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "hi-IN";
    rec.interimResults = true;
    rec.continuous = false;

    let finalText = "";

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const results = Array.from(e.results);
      finalText = results
        .filter((r) => r.isFinal)
        .map((r) => r[0].transcript)
        .join(" ");
      const interim = results
        .filter((r) => !r.isFinal)
        .map((r) => r[0].transcript)
        .join(" ");
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
  }, [scheduleReset]);

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
