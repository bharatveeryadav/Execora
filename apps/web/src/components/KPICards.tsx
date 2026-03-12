import { TrendingUp, Calendar, Wallet, Percent } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDailySummary } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";

const KPICards = () => {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useDailySummary();

  const collectionRate =
    summary && summary.totalSales > 0
      ? Math.round((summary.totalPayments / summary.totalSales) * 100)
      : 0;

  const kpis = [
    {
      title: "Today's Sales",
      icon: TrendingUp,
      value: isLoading ? null : formatCurrency(summary?.totalSales ?? 0),
      change: isLoading ? null : `${summary?.invoiceCount ?? 0} bills today`,
      changePositive: true,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      href: "/invoices",
    },
    {
      title: "Pending Dues",
      icon: Calendar,
      value: isLoading ? null : formatCurrency(summary?.pendingAmount ?? 0),
      change: isLoading
        ? null
        : (summary?.pendingAmount ?? 0) > 0
          ? "⚠️ Needs collection"
          : "✅ All clear",
      changePositive: (summary?.pendingAmount ?? 0) === 0,
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      href: "/invoices?status=pending",
    },
    {
      title: "Collected Today",
      icon: Wallet,
      value: isLoading ? null : formatCurrency(summary?.totalPayments ?? 0),
      change: isLoading
        ? null
        : `Cash ${formatCurrency(summary?.cashPayments ?? 0)} · UPI ${formatCurrency(summary?.upiPayments ?? 0)}`,
      changePositive: true,
      iconBg: "bg-success/10",
      iconColor: "text-success",
      href: "/reports",
    },
    {
      title: "Collection Rate",
      icon: Percent,
      value: isLoading ? null : `${collectionRate}%`,
      change: isLoading
        ? null
        : collectionRate >= 80
          ? "✅ Excellent"
          : collectionRate >= 50
            ? "⚠️ Below target"
            : "🔴 Low",
      changePositive: collectionRate >= 50,
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary",
      href: "/reports",
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.title}
              className="cursor-pointer border-none shadow-sm transition-shadow hover:shadow-md"
              onClick={() => navigate(kpi.href)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {kpi.title}
                  </p>
                  <div className={`rounded-md p-1 ${kpi.iconBg}`}>
                    <Icon className={`h-3.5 w-3.5 ${kpi.iconColor}`} />
                  </div>
                </div>

                {kpi.value === null ? (
                  <>
                    <Skeleton className="mt-1.5 h-6 w-20 rounded" />
                    <Skeleton className="mt-1 h-3 w-28 rounded" />
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-lg font-bold tracking-tight">
                      {kpi.value}
                    </p>
                    <p
                      className={`mt-0.5 text-[10px] font-medium ${kpi.changePositive ? "text-success" : "text-destructive"}`}
                    >
                      {kpi.change}
                    </p>
                  </>
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
