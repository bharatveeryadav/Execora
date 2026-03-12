import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useDailySummary,
  useCustomers,
  useLowStockProducts,
} from "@/hooks/useQueries";
import { useWS } from "@/contexts/WSContext";
import { wsClient } from "@/lib/ws";
import { formatCurrency } from "@/lib/api";

interface PillarProps {
  label: string;
  score: number;
  icon: string;
  hint: string;
  flash: boolean;
  onClick: () => void;
}

function Pillar({ label, score, icon, hint, flash, onClick }: PillarProps) {
  const bar =
    score >= 80 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-destructive";
  const text =
    score >= 80
      ? "text-success"
      : score >= 50
        ? "text-warning"
        : "text-destructive";

  return (
    <button
      onClick={onClick}
      className={`group flex flex-1 flex-col gap-1.5 rounded-xl border bg-card p-3 text-left transition-all duration-300 hover:bg-muted/40 ${flash ? "ring-2 ring-primary/40" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {icon} {label}
        </span>
        <span className={`text-xs font-bold tabular-nums ${text}`}>
          {score}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-700 ${bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </button>
  );
}

function useRelativeTime(ts: number) {
  const [label, setLabel] = useState("just now");
  useEffect(() => {
    const update = () => {
      const sec = Math.floor((Date.now() - ts) / 1000);
      if (sec < 10) setLabel("just now");
      else if (sec < 60) setLabel(`${sec}s ago`);
      else setLabel(`${Math.floor(sec / 60)}m ago`);
    };
    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, [ts]);
  return label;
}

const BusinessHealthScore = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isConnected } = useWS();

  // Tighter refresh intervals for the health panel
  const {
    data: summary,
    isFetching: sumFetching,
    dataUpdatedAt: sumAt,
  } = useDailySummary();

  const {
    data: customers = [],
    isFetching: custFetching,
    dataUpdatedAt: custAt,
  } = useCustomers("", 200);

  const {
    data: lowStock = [],
    isFetching: stockFetching,
    dataUpdatedAt: stockAt,
  } = useLowStockProducts();

  const isRefreshing = sumFetching || custFetching || stockFetching;
  const lastUpdated = Math.max(sumAt, custAt, stockAt);
  const updatedLabel = useRelativeTime(lastUpdated || Date.now());

  // Flash state per pillar — triggered by specific WS events
  const [flashCollection, setFlashCollection] = useState(false);
  const [flashStock, setFlashStock] = useState(false);
  const [flashReceivables, setFlashReceivables] = useState(false);
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function flash(setter: (v: boolean) => void, key: string) {
    setter(true);
    clearTimeout(flashTimers.current[key]);
    flashTimers.current[key] = setTimeout(() => setter(false), 2000);
  }

  useEffect(() => {
    const offs = [
      wsClient.on("payment:recorded", () => {
        qc.invalidateQueries({ queryKey: ["summary"] });
        qc.invalidateQueries({ queryKey: ["customers"] });
        flash(setFlashCollection, "col");
        flash(setFlashReceivables, "rec");
      }),
      wsClient.on("invoice:confirmed", () => {
        qc.invalidateQueries({ queryKey: ["summary"] });
        qc.invalidateQueries({ queryKey: ["customers"] });
        flash(setFlashCollection, "col");
      }),
      wsClient.on("invoice:draft", () => {
        qc.invalidateQueries({ queryKey: ["summary"] });
        flash(setFlashCollection, "col");
      }),
      wsClient.on("customer:updated", () => {
        qc.invalidateQueries({ queryKey: ["customers"] });
        flash(setFlashReceivables, "rec");
      }),
      wsClient.on("product:updated", () => {
        qc.invalidateQueries({ queryKey: ["products"] });
        qc.invalidateQueries({ queryKey: ["products", "low-stock"] });
        flash(setFlashStock, "stk");
      }),
    ];
    return () => offs.forEach((o) => o());
  }, [qc]);

  // ── Scores ──────────────────────────────────────────────────────────────────
  const overdueCount = customers.filter(
    (c) => parseFloat(String(c.balance)) > 0,
  ).length;
  const totalSales = summary?.totalSales ?? 0;
  const totalPayments = summary?.totalPayments ?? 0;

  const collectionScore =
    totalSales > 0
      ? Math.min(100, Math.round((totalPayments / totalSales) * 100))
      : 0;
  const stockScore = Math.max(0, 100 - lowStock.length * 15);
  const overdueScore = Math.max(0, 100 - overdueCount * 10);
  const overall = Math.round((collectionScore + stockScore + overdueScore) / 3);

  const overallColor =
    overall >= 70
      ? "text-success"
      : overall >= 50
        ? "text-warning"
        : "text-destructive";

  const overallLabel =
    overall >= 70 ? "Good" : overall >= 50 ? "Needs Work" : "Critical";
  const overallStroke =
    overall >= 70
      ? "hsl(var(--success))"
      : overall >= 50
        ? "hsl(var(--warning))"
        : "hsl(var(--destructive))";
  const overallBar =
    overall >= 70
      ? "bg-success"
      : overall >= 50
        ? "bg-warning"
        : "bg-destructive";

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Business Health
              </p>
              {/* Live connection dot */}
              <span
                title={isConnected ? "Live data" : "Offline"}
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  isConnected
                    ? "bg-success animate-pulse"
                    : "bg-muted-foreground"
                }`}
              />
              {/* Refresh spinner */}
              {isRefreshing && (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-extrabold tabular-nums ${overallColor}`}
              >
                {overall}
              </span>
              <span className="text-xs text-muted-foreground">
                / 100 · {overallLabel}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Updated {updatedLabel}
            </p>
          </div>

          {/* Ring gauge */}
          <div
            className="relative flex h-14 w-14 items-center justify-center"
            title={`${overall}/100`}
          >
            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke={overallStroke}
                strokeWidth="3"
                strokeDasharray={`${overall} ${100 - overall}`}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dasharray 0.7s ease, stroke 0.5s ease",
                }}
              />
            </svg>
            <span
              className={`absolute text-xs font-bold tabular-nums ${overallColor}`}
            >
              {overall}%
            </span>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-700 ${overallBar}`}
            style={{ width: `${overall}%` }}
          />
        </div>

        {/* 3 pillar cards */}
        <div className="grid grid-cols-3 gap-2">
          <Pillar
            label="Collection"
            icon="💰"
            score={collectionScore}
            hint={`${collectionScore}% today`}
            flash={flashCollection}
            onClick={() => navigate("/payment")}
          />
          <Pillar
            label="Stock"
            icon="📦"
            score={stockScore}
            hint={
              lowStock.length === 0 ? "All stocked" : `${lowStock.length} low`
            }
            flash={flashStock}
            onClick={() => navigate("/inventory")}
          />
          <Pillar
            label="Receivables"
            icon="🧾"
            score={overdueScore}
            hint={overdueCount === 0 ? "All clear" : `${overdueCount} overdue`}
            flash={flashReceivables}
            onClick={() => navigate("/overdue")}
          />
        </div>

        {/* Overdue payment alert — compact pill row, only when there are overdues */}
        {overdueCount > 0 && (() => {
          const overdueList = customers
            .filter((c) => parseFloat(String(c.balance)) > 0)
            .sort((a, b) => parseFloat(String(b.balance)) - parseFloat(String(a.balance)));
          const topThree = overdueList.slice(0, 3);
          const extra = Math.max(0, overdueList.length - 3);
          const totalOwed = overdueList.reduce(
            (s, c) => s + parseFloat(String(c.balance)), 0
          );
          return (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5">
              <span className="shrink-0 text-xs font-semibold text-destructive">
                🔴 Overdue ({overdueList.length}):
              </span>
              {topThree.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate("/overdue")}
                  title={`${c.name} · ₹${parseFloat(String(c.balance)).toLocaleString("en-IN")}`}
                  className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive transition-opacity hover:opacity-75"
                >
                  {(c.name ?? "").length > 12 ? (c.name ?? "").slice(0, 11) + "…" : c.name}
                  <span className="ml-1 opacity-70">{formatCurrency(parseFloat(String(c.balance)))}</span>
                </button>
              ))}
              {extra > 0 && (
                <button
                  onClick={() => navigate("/overdue")}
                  className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-background"
                >
                  +{extra} more
                </button>
              )}
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                {formatCurrency(totalOwed)} total
              </span>
              <button
                onClick={() => navigate("/overdue")}
                className="ml-auto shrink-0 text-[11px] text-muted-foreground hover:text-foreground"
              >
                View All →
              </button>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
};

export default BusinessHealthScore;
