/**
 * ReplenishmentBanner — AI-powered stock reorder advisor.
 *
 * Polls /api/v1/ai/replenishment-suggestions and renders a collapsible banner
 * when any product has critical or high urgency. Also exposes a one-click
 * "Schedule Reminders" action that calls the predictive reminders endpoint.
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, PackageX, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { aiApi, type ReplenishmentSuggestion } from "@/lib/api";

// ── Urgency helpers ──────────────────────────────────────────────────────────
type Urgency = ReplenishmentSuggestion["urgency"];

const URGENCY_COLOR: Record<Urgency, string> = {
  critical: "bg-destructive/10 border-destructive/40",
  high: "bg-warning/10 border-warning/40",
  normal: "bg-muted border-border",
};

const URGENCY_BADGE: Record<Urgency, "destructive" | "default" | "secondary"> =
  {
    critical: "destructive",
    high: "default",
    normal: "secondary",
  };

const URGENCY_LABEL: Record<Urgency, string> = {
  critical: "Critical",
  high: "High",
  normal: "Low stock",
};

// ── Main component ───────────────────────────────────────────────────────────
export function ReplenishmentBanner() {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

  // Fetch suggestions every 5 minutes — no need for real-time
  const { data, isLoading, error } = useQuery({
    queryKey: ["replenishment-suggestions"],
    queryFn: () => aiApi.getReplenishmentSuggestions(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const scheduleReminders = useMutation({
    mutationFn: () => aiApi.schedulePredictiveReminders(),
    onSuccess: (res) => {
      toast({
        title: "🔔 Reminders scheduled",
        description: `${res.scheduled} new reminders created, ${res.skipped} already covered.`,
      });
    },
    onError: () => {
      toast({ title: "Failed to schedule reminders", variant: "destructive" });
    },
  });

  // Nothing to show while loading or on error
  if (isLoading || error || !data) return null;

  const suggestions = data.suggestions ?? [];
  if (suggestions.length === 0) return null;

  // Only highlight when at least one urgent item exists
  const hasCritical = suggestions.some((s) => s.urgency === "critical");
  const hasHigh = suggestions.some((s) => s.urgency === "high");
  if (!hasCritical && !hasHigh) return null;

  const headerUrgency: Urgency = hasCritical ? "critical" : "high";
  const criticalCount = suggestions.filter(
    (s) => s.urgency === "critical",
  ).length;
  const highCount = suggestions.filter((s) => s.urgency === "high").length;

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${URGENCY_COLOR[headerUrgency]}`}
      role="alert"
    >
      {/* ── Banner header ── */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <PackageX className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">
            {hasCritical
              ? `⚠️ ${criticalCount} product${criticalCount > 1 ? "s" : ""} critically low`
              : `${highCount} product${highCount > 1 ? "s" : ""} need reorder`}
          </span>
          {expanded ? (
            <ChevronUp className="ml-auto h-4 w-4 shrink-0 opacity-60" />
          ) : (
            <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-60" />
          )}
        </button>

        {/* Schedule Reminders CTA */}
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 gap-1 text-xs"
          disabled={scheduleReminders.isPending}
          onClick={() => scheduleReminders.mutate()}
        >
          {scheduleReminders.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Bell className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">Schedule Reminders</span>
        </Button>
      </div>

      {/* ── Expanded product list ── */}
      {expanded && (
        <div className="mt-3 space-y-2">
          {suggestions
            // Sort: critical first, then high
            .sort((a, b) => {
              const order = { critical: 0, high: 1, normal: 2 };
              return order[a.urgency] - order[b.urgency];
            })
            .map((s) => (
              <div
                key={s.productId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.productName}</p>
                  {s.preferredSupplier && (
                    <p className="truncate text-xs text-muted-foreground">
                      {s.preferredSupplier}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Stock: <strong>{s.currentStock}</strong>/{s.minStock}
                  </span>
                  {s.velocity30d > 0 && (
                    <span className="text-muted-foreground">
                      Sold: {s.velocity30d.toFixed(1)}/30d
                    </span>
                  )}
                  <span className="font-semibold">
                    Order: {s.suggestedOrderQty}
                  </span>
                  <Badge variant={URGENCY_BADGE[s.urgency]} className="text-xs">
                    {URGENCY_LABEL[s.urgency]}
                  </Badge>
                </div>
              </div>
            ))}

          <p className="pt-1 text-xs text-muted-foreground/70">
            Suggestions based on 30-day sales velocity and current stock levels.
          </p>
        </div>
      )}
    </div>
  );
}
