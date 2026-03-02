import { TrendingUp, Calendar, AlertTriangle, Percent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useDailySummary } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";

const KPICards = () => {
  const { data: summary, isLoading } = useDailySummary();

  const collectionRate =
    summary && summary.totalSales > 0
      ? Math.round((summary.totalPayments / summary.totalSales) * 100)
      : 0;

  const kpis = [
    {
      title: "TODAY'S SALES",
      icon: TrendingUp,
      value: isLoading ? "…" : formatCurrency(summary?.totalSales ?? 0),
      change: isLoading ? "—" : `${summary?.invoiceCount ?? 0} invoices today`,
      changePositive: true,
      subtitle: "",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "PENDING DUES",
      icon: Calendar,
      value: isLoading ? "…" : formatCurrency(summary?.pendingAmount ?? 0),
      change: (summary?.pendingAmount ?? 0) > 0 ? "⚠️ Needs collection" : "✅ All clear",
      changePositive: (summary?.pendingAmount ?? 0) === 0,
      subtitle: "",
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      title: "COLLECTED TODAY",
      icon: AlertTriangle,
      value: isLoading ? "…" : formatCurrency(summary?.totalPayments ?? 0),
      change: isLoading
        ? "—"
        : `Cash ${formatCurrency(summary?.cashPayments ?? 0)} · UPI ${formatCurrency(summary?.upiPayments ?? 0)}`,
      changePositive: true,
      subtitle: "",
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
    },
    {
      title: "COLLECTION RATE",
      icon: Percent,
      value: isLoading ? "…" : `${collectionRate}%`,
      change: collectionRate >= 80 ? "✅ Excellent" : collectionRate >= 50 ? "⚠️ Below target" : "🔴 Low",
      changePositive: collectionRate >= 50,
      subtitle: "",
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary",
    },
  ];

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        📈 Key Performance Indicators
      </h2>
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
                <p className="mt-2 text-2xl font-bold tracking-tight">{kpi.value}</p>
                <p className={`mt-1 text-xs font-medium ${kpi.changePositive ? "text-success" : "text-destructive"}`}>
                  {kpi.change}
                </p>
                {kpi.subtitle && <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default KPICards;
