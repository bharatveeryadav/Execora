/**
 * PaymentSoundBox — Paytm-style payment announcement overlay.
 *
 * Listens to `payment:recorded` WS events.
 * • Shows a green slide-in banner at the top of the screen with amount + customer
 * • Speaks the announcement using Web Speech API (prefers hi-IN, falls back to en-IN)
 * • Supports a queue so back-to-back payments don't overlap
 */
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, X, Volume2 } from "lucide-react";
import { wsClient } from "@/lib/ws";
import { useQueryClient } from "@tanstack/react-query";

interface PayEvent {
  id: number;
  amount: number;
  customerId: string;
  customerName: string;
  source?: string;
}

let _seq = 0;

// ── Speech synthesis ──────────────────────────────────────────────────────────
function getVoice(lang: "hi" | "en") {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (lang === "hi") return voices.find((v) => v.lang.startsWith("hi")) ?? null;
  return (
    voices.find((v) => v.lang === "en-IN") ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

function buildUtterance(
  amount: number,
  customerName: string,
): SpeechSynthesisUtterance {
  const amtStr = amount.toLocaleString("en-IN");
  const hiVoice = getVoice("hi");
  const enVoice = getVoice("en");

  const text = hiVoice
    ? `Rupaye ${amtStr} mile${customerName ? `, ${customerName} se` : ""}`
    : `Rupees ${amtStr} received${customerName ? ` from ${customerName}` : ""}`;

  const utter = new SpeechSynthesisUtterance(text);
  utter.voice = hiVoice ?? enVoice;
  utter.lang = hiVoice ? "hi-IN" : "en-IN";
  utter.rate = 0.88;
  utter.pitch = 1.05;
  utter.volume = 1;
  return utter;
}

function speak(amount: number, customerName: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const fire = () =>
    window.speechSynthesis.speak(buildUtterance(amount, customerName));

  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener("voiceschanged", fire, {
      once: true,
    });
  } else {
    fire();
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PaymentSoundBox() {
  const qc = useQueryClient();
  const [queue, setQueue] = useState<PayEvent[]>([]);
  const [current, setCurrent] = useState<PayEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // WS listener — push to queue
  useEffect(() => {
    return wsClient.on("payment:recorded", (payload) => {
      const p = payload as {
        customerId?: string;
        amount?: number;
        customerName?: string;
        source?: string;
      };
      const amount = parseFloat(String(p.amount ?? 0));
      if (!amount || amount <= 0) return;

      // Resolve customer name: prefer WS payload, then query cache
      let customerName = p.customerName?.trim() ?? "";
      if (!customerName && p.customerId) {
        const cached = qc.getQueryData<{ id: string; name: string }[]>([
          "customers",
        ]);
        customerName =
          cached?.find((c) => c.id === p.customerId)?.name?.trim() ?? "";
      }

      setQueue((q) => [
        ...q,
        {
          id: ++_seq,
          amount,
          customerId: p.customerId ?? "",
          customerName,
          source: p.source,
        },
      ]);
    });
  }, [qc]);

  // Test event from Settings page
  useEffect(() => {
    const handler = (e: Event) => {
      const detail =
        (
          e as CustomEvent<{
            amount?: number;
            customerName?: string;
            source?: string;
          }>
        ).detail ?? {};
      const amount = parseFloat(String(detail.amount ?? 500));
      if (!amount) return;
      setQueue((q) => [
        ...q,
        {
          id: ++_seq,
          amount,
          customerId: "",
          customerName: detail.customerName ?? "Test Customer",
          source: detail.source,
        },
      ]);
    };
    window.addEventListener("__payment_test__", handler);
    return () => window.removeEventListener("__payment_test__", handler);
  }, []);

  // Process queue one at a time
  useEffect(() => {
    if (current !== null || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setCurrent(next);
    setVisible(true);
    speak(next.amount, next.customerName);

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setCurrent(null), 380);
    }, 4800);
  }, [queue, current]);

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => setCurrent(null), 380);
  };

  if (!current) return null;

  const fmtAmt = current.amount.toLocaleString("en-IN", {
    minimumFractionDigits: current.amount % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return (
    <div
      className={`fixed left-1/2 top-4 z-[9999] -translate-x-1/2 transition-all duration-300 ease-out ${
        visible
          ? "translate-y-0 opacity-100 scale-100"
          : "-translate-y-16 opacity-0 scale-95"
      }`}
      style={{ width: "min(92vw, 380px)" }}
      role="alert"
      aria-live="assertive"
    >
      <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-emerald-600 px-5 py-4 shadow-2xl text-white">
        {/* Subtle shimmer stripe */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0" />

        {/* Check icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
          <CheckCircle2 className="h-6 w-6 text-white" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-100">
            <Volume2 className="h-3 w-3" />
            Payment Received
            {current.source && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold lowercase tracking-wide text-white/90">
                via {current.source}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-2xl font-extrabold tabular-nums tracking-tight leading-none">
            ₹{fmtAmt}
          </p>
          {current.customerName && (
            <p className="mt-1 truncate text-sm font-medium text-emerald-100">
              from {current.customerName}
            </p>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-white/20"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-white/70" />
        </button>
      </div>

      {/* Progress bar that drains over 4.8s */}
      {visible && (
        <div className="mx-2 h-0.5 overflow-hidden rounded-full bg-emerald-700">
          <div
            className="h-full w-full bg-white/50 origin-left"
            style={{
              animation: "soundbox-drain 4.8s linear forwards",
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes soundbox-drain {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}

export default PaymentSoundBox;
