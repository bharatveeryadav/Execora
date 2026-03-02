import { useState } from "react";
import { ArrowLeft, Download, Mail, Printer, RefreshCw, TrendingUp } from "lucide-react";
import VoiceBar from "@/components/VoiceBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { useDailySummary, useSummaryRange, useCustomers, useProducts, useInvoices } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";

const periods = ["Today", "This Week", "This Month", "Custom"] as const;

/** Compute ISO date strings for report period range */
function getPeriodRange(period: string): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (period === "This Week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { from: fmt(start), to: fmt(now) };
  }
  if (period === "This Month") {
    return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
  }
  return { from: fmt(now), to: fmt(now) };
}

const Reports = () => {
  const [activePeriod, setActivePeriod] = useState<string>("Today");
  const navigate = useNavigate();

  const periodRange = getPeriodRange(activePeriod);
  const useRange = activePeriod === "This Week" || activePeriod === "This Month";

  const { data: dailySummary } = useDailySummary();
  const { data: rangeSummary } = useSummaryRange(periodRange.from, periodRange.to);

  // Unified summary: use range when period != Today
  const summary = useRange ? rangeSummary : dailySummary;

  const { data: customers = [] } = useCustomers("", 100);
  const { data: products = [] } = useProducts();
  const { data: invoices = [] } = useInvoices(200);

  // Revenue overview from active summary
  const totalSales = summary?.totalSales ?? 0;
  const totalPayments = summary?.totalPayments ?? 0;
  const collectionRate = totalSales > 0 ? Math.round((totalPayments / totalSales) * 100) : 0;
  const pendingAmount = summary?.pendingAmount ?? 0;

  // Sales trend: group invoices by day of month
  const salesByDay = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.status === "cancelled") continue;
    const day = String(new Date(inv.createdAt).getDate());
    salesByDay.set(day, (salesByDay.get(day) ?? 0) + parseFloat(String(inv.total)));
  }
  const salesTrendData = Array.from(salesByDay.entries())
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([day, sales]) => ({ day, sales: Math.round(sales) }));

  // Top products by revenue from invoice items
  // Backend returns item.product.name (relation), not item.productName (column)
  const productRevMap = new Map<string, { amount: number }>();
  for (const inv of invoices) {
    if (inv.status === "cancelled") continue;
    for (const item of inv.items ?? []) {
      const name = item.product?.name ?? item.productName ?? "Unknown";
      const existing = productRevMap.get(name) ?? { amount: 0 };
      productRevMap.set(name, { amount: existing.amount + parseFloat(String(item.itemTotal ?? 0)) });
    }
  }

  const handleExport = () => {
    const rows = [
      ["Period", activePeriod],
      ["Total Sales", String(totalSales)],
      ["Total Collected", String(totalPayments)],
      ["Collection Rate (%)", String(collectionRate)],
      ["Pending Dues", String(pendingAmount)],
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `execora-report-${activePeriod.toLowerCase().replace(/ /g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  // If no invoice items data, fall back to products sorted by price * stock
  const topProductsFromInvoices = [...productRevMap.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 5)
    .map(([name, d]) => ({ name, amount: d.amount }));

  const topProductsFallback = [...products]
    .sort((a, b) => parseFloat(String(b.price)) - parseFloat(String(a.price)))
    .slice(0, 5)
    .map((p) => ({ name: p.name, amount: parseFloat(String(p.price)) * p.stock }));

  const topProductsList = topProductsFromInvoices.length > 0 ? topProductsFromInvoices : topProductsFallback;

  // Top customers by totalPurchases
  const topCustomers = [...customers]
    .filter((c) => parseFloat(String(c.totalPurchases)) > 0)
    .sort((a, b) => parseFloat(String(b.totalPurchases)) - parseFloat(String(a.totalPurchases)))
    .slice(0, 5)
    .map((c) => ({ name: c.name, amount: parseFloat(String(c.totalPurchases)) }));

  // Payment method breakdown from daily summary
  const cash = summary?.cashPayments ?? 0;
  const upi = summary?.upiPayments ?? 0;
  const other = Math.max(0, totalPayments - cash - upi);
  const paymentMethods = [
    { method: "Cash", icon: "💵", amount: cash, percent: totalPayments > 0 ? Math.round((cash / totalPayments) * 100) : 0 },
    { method: "UPI", icon: "📱", amount: upi, percent: totalPayments > 0 ? Math.round((upi / totalPayments) * 100) : 0 },
    { method: "Card / Other", icon: "💳", amount: other, percent: totalPayments > 0 ? Math.round((other / totalPayments) * 100) : 0 },
    { method: "Credit (Pending)", icon: "📝", amount: pendingAmount, percent: totalSales > 0 ? Math.round((pendingAmount / totalSales) * 100) : 0 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold tracking-tight md:text-xl">
              📊 Reports & Analytics
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden md:flex" onClick={handleExport}>
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        {/* Period selector */}
        <div className="mt-3 flex flex-wrap gap-2">
          {periods.map((p) => (
            <Button
              key={p}
              variant={activePeriod === p ? "default" : "outline"}
              size="sm"
              onClick={() => setActivePeriod(p)}
              className="text-xs"
            >
              {p}
            </Button>
          ))}
          {activePeriod === "Custom" && (
            <span className="flex items-center text-xs text-muted-foreground">
              Select date range
            </span>
          )}
        </div>

        <VoiceBar
          idleHint={
            <>
              <span className="font-medium text-foreground">"इस महीने का हिसाब बताओ"</span>
              {" · "}
              <span>"आज की कमाई?"</span>
              {" · "}
              <span>"Top customers"</span>
            </>
          }
        />
      </header>

      <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
        {/* Revenue Overview Cards */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            📈 Revenue Overview
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Total Sales", value: formatCurrency(totalSales), icon: TrendingUp },
              { label: "Collected", value: formatCurrency(totalPayments), icon: TrendingUp },
              { label: "Collection Rate", value: `${collectionRate}%`, icon: TrendingUp },
              { label: "Pending Dues", value: formatCurrency(pendingAmount), icon: TrendingUp },
            ].map((s) => (
              <Card key={s.label} className="border-none shadow-sm">
                <CardContent className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Sales Trend Chart */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {salesTrendData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No sales data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={salesTrendData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(24 85% 52%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(24 85% 52%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(30 15% 88%)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(20 10% 45%)", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(20 10% 45%)", fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Sales"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(30 15% 88%)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                  <Area type="monotone" dataKey="sales" stroke="hsl(24 85% 52%)" strokeWidth={2} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Products & Customers */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🏷️ Top Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topProductsList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : (
                topProductsList.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between">
                    <span className="text-sm">
                      <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                      📦 {p.name}
                    </span>
                    <span className="font-semibold">{formatCurrency(p.amount)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">👥 Top Customers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No customer data yet</p>
              ) : (
                topCustomers.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <span className="text-sm">
                      <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                      {c.name}
                    </span>
                    <span className="font-semibold">{formatCurrency(c.amount)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Method Breakdown */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">📊 Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentMethods.map((pm) => (
              <div key={pm.method} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{pm.icon} {pm.method}</span>
                  <span className="font-semibold">{formatCurrency(pm.amount)} ({pm.percent}%)</span>
                </div>
                <Progress value={pm.percent} className="h-2.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Cash Flow */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">📈 Cash Flow Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalSales)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalPayments)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>
            {pendingAmount > 0 && (
              <div className="rounded-lg bg-warning/10 p-3">
                <p className="text-sm font-medium text-warning">
                  ⚠️ {formatCurrency(pendingAmount)} pending from {invoices.filter((i) => i.status === "pending" || i.status === "partial").length} invoices
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Consider collecting from overdue customers
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Actions */}
        <div className="flex flex-wrap gap-2 pb-6">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-1.5 h-4 w-4" /> Download CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" /> Print</Button>
          <Button variant="outline" size="sm" disabled><Mail className="mr-1.5 h-4 w-4" /> Email Report</Button>
          <Button variant="outline" size="sm" disabled><RefreshCw className="mr-1.5 h-4 w-4" /> Schedule</Button>
        </div>
      </main>
    </div>
  );
};

export default Reports;
