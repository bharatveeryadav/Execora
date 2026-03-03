import { useState } from "react";
import { TrendingUp, Calendar, AlertTriangle, Percent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDailySummary } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";
import { cn } from "@/lib/utils";

type Period = "Today" | "Week" | "Month";

const KPICards = () => {
  const [period, setPeriod] = useState<Period>("Today");
  const { data: summary, isLoading } = useDailySummary();

  const collectionRate =
    summary && summary.totalSales > 0
      ? Math.round((summary.totalPayments / summary.totalSales) * 100)
      : 0;

  const kpis = [
    {
      title: "TODAY'S SALES",
      icon: TrendingUp,
      value: isLoading ? null : formatCurrency(summary?.totalSales ?? 0),
      change: isLoading ? null : `${summary?.invoiceCount ?? 0} invoices today`,
      changePositive: true,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "PENDING DUES",
      icon: Calendar,
      value: isLoading ? null : formatCurrency(summary?.pendingAmount ?? 0),
      change: isLoading ? null : (summary?.pendingAmount ?? 0) > 0 ? "⚠️ Needs collection" : "✅ All clear",
      changePositive: (summary?.pendingAmount ?? 0) === 0,
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      title: "COLLECTED TODAY",
      icon: AlertTriangle,
      value: isLoading ? null : formatCurrency(summary?.totalPayments ?? 0),
      change: isLoading ? null : `Cash ${formatCurrency(summary?.cashPayments ?? 0)} · UPI ${formatCurrency(summary?.upiPayments ?? 0)}`,
      changePositive: true,
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
    },
    {
      title: "COLLECTION RATE",
      icon: Percent,
      value: isLoading ? null : `${collectionRate}%`,
      change: isLoading ? null : collectionRate >= 80 ? "✅ Excellent" : collectionRate >= 50 ? "⚠️ Below target" : "🔴 Low",
      changePositive: collectionRate >= 50,
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary",
    },
  ];

  const periods: Period[] = ["Today", "Week", "Month"];

  return (
    <div>
      {/* Header row with period switcher */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          📈 Key Performance Indicators
        </h2>
        <div className="flex rounded-lg border bg-muted p-0.5 gap-0.5">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="border-none shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {kpi.title}
                  </p>
                  <div className={`rounded-lg p-1.5 ${kpi.iconBg}`}>
                    <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                  </div>
                </div>

                {kpi.value === null ? (
                  <>
                    <Skeleton className="mt-2 h-7 w-24 rounded" />
                    <Skeleton className="mt-2 h-3 w-32 rounded" />
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-2xl font-bold tracking-tight">{kpi.value}</p>
                    <p className={`mt-1 text-xs font-medium ${kpi.changePositive ? "text-success" : "text-destructive"}`}>
                      {kpi.change}
                    </p>
                  </>
                )}

                {period !== "Today" && (
                  <span className="mt-1.5 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {period} total
                  </span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default KPICards;
