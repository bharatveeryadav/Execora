/**
 * AiAgentFeed — Real-time AI execution log shown on the dashboard.
 * Subscribes to all WS events and builds a live "what the AI just did" timeline.
 * This is the visual proof that Execora is an AI agent, not just a business app.
 */
import { useEffect, useRef, useState } from "react";
import { wsClient } from "@/lib/ws";
import { useWS } from "@/contexts/WSContext";
import { Mic } from "lucide-react";

interface FeedItem {
  id: number;
  icon: string;
  text: string;
  subtext?: string;
  at: number; // timestamp ms
  type: "invoice" | "payment" | "customer" | "product" | "voice" | "system";
}

// Rotating command example sets by category
const COMMAND_SETS = [
  {
    category: "💰 Sales",
    items: [
      "Ramesh ka invoice banao 3 rice 50kg",
      "Suresh ko 3 bag diya 1200 ka",
      "Invoice print karo",
    ],
  },
  {
    category: "💸 Payment",
    items: [
      "Ramesh ne 500 diya",
      "Sita ka payment 2000 record karo",
      "Aaj kitna collection hua?",
    ],
  },
  {
    category: "📦 Stock",
    items: [
      "Rice kitna bacha?",
      "Atta ka stock low hai",
      "Sugar 100kg add karo",
    ],
  },
  {
    category: "👥 Customers",
    items: [
      "Ramesh ka balance batao",
      "Suresh ka udhar kitna hai?",
      "Naya customer Mohan add karo",
    ],
  },
  {
    category: "📊 Reports",
    items: [
      "Aaj ki sale kitni hui?",
      "Is hafte ka report dikhao",
      "GSTR-1 download karo",
    ],
  },
  {
    category: "🧾 Misc",
    items: [
      "Kaunse customers ka pesa aana baaki hai?",
      "Low stock alert dikhao",
      "Business health kaisi hai?",
    ],
  },
];

function useRelativeTime(ts: number) {
  const [label, setLabel] = useState(relLabel(ts));
  useEffect(() => {
    const id = setInterval(() => setLabel(relLabel(ts)), 5000);
    return () => clearInterval(id);
  }, [ts]);
  return label;
}

function relLabel(ts: number) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

function FeedRow({ item }: { item: FeedItem }) {
  const rel = useRelativeTime(item.at);
  return (
    <div className="flex items-start gap-2.5 py-2">
      <span className="mt-0.5 shrink-0 text-base">{item.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.text}
        </p>
        {item.subtext && (
          <p className="truncate text-[11px] text-muted-foreground">
            {item.subtext}
          </p>
        )}
      </div>
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
        {rel}
      </span>
    </div>
  );
}

let _counter = 1;

const AiAgentFeed = () => {
  const { isConnected } = useWS();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [cmdSetIdx, setCmdSetIdx] = useState(0);
  const [cmdItemIdx, setCmdItemIdx] = useState(0);
  const [vcCount, setVcCount] = useState(0);
  const [actionCount, setActionCount] = useState(0);
  const rotate = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Emit feed item helper
  const push = (item: Omit<FeedItem, "id" | "at">) =>
    setFeed((prev) =>
      [{ ...item, id: _counter++, at: Date.now() }, ...prev].slice(0, 20),
    );

  // WS subscriptions
  useEffect(() => {
    const offs = [
      wsClient.on("invoice:confirmed", (p) => {
        const d = p as {
          invoiceNo?: string;
          customerName?: string;
          total?: number;
        };
        push({
          type: "invoice",
          icon: "🧾",
          text: `Invoice confirmed — ${d.customerName ?? "Customer"}`,
          subtext: [
            d.invoiceNo,
            d.total
              ? `₹${parseFloat(String(d.total)).toLocaleString("en-IN")}`
              : undefined,
          ]
            .filter(Boolean)
            .join("  ·  "),
        });
        setActionCount((c) => c + 1);
      }),
      wsClient.on("invoice:draft", (p) => {
        const d = p as { invoiceNo?: string; customerName?: string };
        push({
          type: "invoice",
          icon: "📝",
          text: `Draft invoice created — ${d.customerName ?? "Customer"}`,
          subtext: d.invoiceNo,
        });
        setVcCount((c) => c + 1);
      }),
      wsClient.on("payment:recorded", (p) => {
        const d = p as { amount?: number; customerName?: string };
        push({
          type: "payment",
          icon: "💰",
          text: `Payment received${d.customerName ? ` from ${d.customerName}` : ""}`,
          subtext: d.amount
            ? `₹${parseFloat(String(d.amount)).toLocaleString("en-IN")} recorded`
            : undefined,
        });
        setActionCount((c) => c + 1);
      }),
      wsClient.on("customer:updated", (p) => {
        const d = p as { name?: string };
        push({
          type: "customer",
          icon: "👤",
          text: `Customer updated — ${d.name ?? ""}`,
        });
        setActionCount((c) => c + 1);
      }),
      wsClient.on("product:updated", (p) => {
        const d = p as { name?: string };
        push({
          type: "product",
          icon: "📦",
          text: `Stock updated — ${d.name ?? "Product"}`,
        });
        setActionCount((c) => c + 1);
      }),
      wsClient.on("voice:thinking", (p) => {
        const d = p as { transcript?: string };
        if (d.transcript) {
          push({
            type: "voice",
            icon: "🎤",
            text: `"${d.transcript}"`,
            subtext: "AI is processing…",
          });
          setVcCount((c) => c + 1);
        }
      }),
      wsClient.on("voice:response", (p) => {
        const d = p as { text?: string };
        if (d.text) {
          setFeed((prev) => {
            // Find the matching voice:thinking row and update its subtext
            const idx = prev.findIndex(
              (r) => r.type === "voice" && r.subtext === "AI is processing…",
            );
            if (idx === -1) return prev;
            const updated = [...prev];
            updated[idx] = { ...updated[idx], subtext: d.text?.slice(0, 80) };
            return updated;
          });
        }
      }),
    ];
    return () => offs.forEach((o) => o());
  }, []);

  // Rotate command hints every 4s
  useEffect(() => {
    const tick = () => {
      setCmdItemIdx((i) => {
        const maxItems = COMMAND_SETS[cmdSetIdx].items.length;
        if (i + 1 >= maxItems) {
          setCmdSetIdx((s) => (s + 1) % COMMAND_SETS.length);
          return 0;
        }
        return i + 1;
      });
    };
    rotate.current = setInterval(tick, 4000);
    return () => {
      if (rotate.current) clearInterval(rotate.current);
    };
  }, [cmdSetIdx]);

  const currentSet = COMMAND_SETS[cmdSetIdx];
  const currentCmd = currentSet.items[cmdItemIdx];

  return (
    <div className="space-y-3">
      {/* ── Command hint banner ───────────────────────────────── */}
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <span className="flex shrink-0 items-center justify-center rounded-full bg-primary/10 p-2">
          <Mic className="h-4 w-4 text-primary" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70 mb-0.5">
            {currentSet.category} · Say it naturally
          </p>
          <p
            key={currentCmd}
            className="truncate text-sm font-medium text-foreground"
            style={{ animation: "fadeIn 0.4s ease" }}
          >
            &ldquo;{currentCmd}&rdquo;
          </p>
        </div>
        <button
          onClick={() => {
            wsClient.send("voice:final", { text: currentCmd });
          }}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-transform"
        >
          Run ▶
        </button>
      </div>

      {/* ── Category chips ────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {COMMAND_SETS.map((s, i) => (
          <button
            key={s.category}
            onClick={() => {
              setCmdSetIdx(i);
              setCmdItemIdx(0);
            }}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              i === cmdSetIdx
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {s.category.split(" ")[0]}{" "}
            {s.category.split(" ").slice(1).join(" ")}
          </button>
        ))}
      </div>

      {/* ── Live action feed ──────────────────────────────────── */}
      {feed.length > 0 ? (
        <div className="rounded-xl border bg-card px-4">
          <div className="flex items-center justify-between border-b py-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-success animate-pulse" : "bg-muted"}`}
              />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                AI Activity Feed
              </p>
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span>🎤 {vcCount} commands</span>
              <span>✅ {actionCount} actions</span>
            </div>
          </div>
          <div className="divide-y divide-border/50">
            {feed.map((item) => (
              <FeedRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      ) : (
        /* Empty state — prompt the user to try voice */
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 py-8 text-center">
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent("shortcut:voice"))
            }
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg ring-4 ring-primary/20 active:scale-95 transition-transform"
          >
            <Mic className="h-8 w-8 text-primary-foreground" />
          </button>
          <div>
            <p className="text-base font-bold text-foreground">
              बोलो — AI सुन रहा है
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Tap mic and say anything in Hindi or English
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 px-4">
            {["नया बिल बनाओ", "Payment record karo", "Stock check karo"].map(
              (cmd) => (
                <button
                  key={cmd}
                  onClick={() => wsClient.send("voice:final", { text: cmd })}
                  className="rounded-full border border-primary/30 bg-background px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  "{cmd}"
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAgentFeed;
