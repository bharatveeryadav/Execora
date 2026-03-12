import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Package, Hash, Calendar, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useExpiringBatches } from "@/hooks/useQueries";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExpiryBatch {
  id: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  product: { name: string; unit: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatExpiry(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function pillClass(days: number) {
  if (days <= 0)
    return "border-destructive/50 bg-destructive/10 text-destructive";
  if (days <= 7)
    return "border-destructive/40 bg-destructive/10 text-destructive";
  return "border-warning/40 bg-warning/15 text-warning";
}

function daysLabel(days: number) {
  if (days <= 0) return "EXPIRED";
  if (days === 1) return "1d left";
  return `${days}d left`;
}

// ── Detail dialog: shows full info when a pill is tapped ──────────────────────

function ExpiryDetailDialog({
  batch,
  open,
  onClose,
}: {
  batch: ExpiryBatch | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!batch) return null;

  const days = daysUntil(batch.expiryDate);
  const isExpired = days <= 0;
  const isUrgent = !isExpired && days <= 7;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle
              className={`h-4 w-4 ${isExpired || isUrgent ? "text-destructive" : "text-warning"}`}
            />
            Expiry Stock Alert
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Status banner */}
          <div
            className={`rounded-lg p-3 text-center font-bold text-sm ${
              isExpired || isUrgent
                ? "bg-destructive/10 text-destructive"
                : "bg-warning/10 text-warning"
            }`}
          >
            {isExpired
              ? "❌ This batch has EXPIRED"
              : isUrgent
                ? `⚠️ Expiring in ${days} day${days === 1 ? "" : "s"}!`
                : `🕐 Expiring in ${days} days`}
          </div>

          {/* Info rows */}
          <div className="divide-y rounded-xl border text-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Product</span>
              <span className="ml-auto font-semibold text-right">
                {batch.product.name}
              </span>
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Quantity</span>
              <span className="ml-auto font-semibold">
                {batch.quantity} {batch.product.unit}
              </span>
            </div>

            {batch.batchNo && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Batch No</span>
                <span className="ml-auto font-mono font-semibold">
                  {batch.batchNo}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 px-4 py-3">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Expiry Date</span>
              <span
                className={`ml-auto font-semibold ${isExpired || isUrgent ? "text-destructive" : ""}`}
              >
                {formatExpiry(batch.expiryDate)}
              </span>
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            Go to <strong>Expiry Tracker</strong> to write off or manage this
            batch.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Widget ────────────────────────────────────────────────────────────────────

export default function DashboardExpiryAlert() {
  const navigate = useNavigate();
  const { data: batches = [] } = useExpiringBatches(30);
  const [selected, setSelected] = useState<ExpiryBatch | null>(null);

  if (batches.length === 0) return null;

  const items = batches.slice(0, 6);
  const extra = Math.max(0, batches.length - 6);
  const expiredCount = batches.filter(
    (b) => daysUntil(b.expiryDate) <= 0,
  ).length;
  const urgentCount = batches.filter((b) => {
    const d = daysUntil(b.expiryDate);
    return d > 0 && d <= 7;
  }).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5">
        {/* Section label */}
        <span className="shrink-0 text-xs font-semibold text-warning">
          {expiredCount > 0 ? "🔴" : "⚠️"} Expiry Alert ({batches.length}):
        </span>

        {/* Pills — one per expiring batch */}
        {items.map((batch) => {
          const days = daysUntil(batch.expiryDate);
          return (
            <button
              key={batch.id}
              onClick={() => setSelected(batch)}
              title={`${batch.product.name} · ${batch.quantity} ${batch.product.unit}${batch.batchNo ? ` · Batch #${batch.batchNo}` : ""} · ${daysLabel(days)}`}
              className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${pillClass(days)}`}
            >
              {batch.product.name.length > 14
                ? batch.product.name.slice(0, 13) + "…"
                : batch.product.name}
              <span className="ml-1 opacity-70 tabular-nums">
                {daysLabel(days)}
              </span>
            </button>
          );
        })}

        {/* Overflow pill */}
        {extra > 0 && (
          <button
            onClick={() => navigate("/expiry")}
            className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-background"
          >
            +{extra} more
          </button>
        )}

        {/* Summary counts */}
        {expiredCount > 0 && (
          <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-semibold text-destructive">
            {expiredCount} expired
          </span>
        )}
        {urgentCount > 0 && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
            {urgentCount} ≤7d
          </span>
        )}

        {/* View all */}
        <button
          onClick={() => navigate("/expiry")}
          className="ml-auto shrink-0 text-[11px] text-muted-foreground hover:text-foreground"
        >
          View All →
        </button>
      </div>

      {/* Full-detail dialog — opened when a pill is tapped */}
      <ExpiryDetailDialog
        batch={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
