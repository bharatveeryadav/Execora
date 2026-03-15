import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Download,
  FileText,
  Mail,
  Printer,
  RefreshCw,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Share2,
  TrendingDown,
  Activity,
  Package,
  ChevronRight,
  ChevronDown,
  PanelRightOpen,
  PanelRightClose,
  LayoutGrid,
  LayoutList,
  Minus,
  Plus,
} from "lucide-react";
import VoiceBar from "@/components/VoiceBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import {
  useDailySummary,
  useSummaryRange,
  useCustomers,
  useProducts,
  useInvoices,
  useGstr1Report,
  usePnlReport,
  useEmailReport,
} from "@/hooks/useQueries";
import { useWsInvalidation } from "@/hooks/useWsInvalidation";
import { formatCurrency, reportApi, getToken } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

// ── Helpers ───────────────────────────────────────────────────────────────────

const periods = [
  "Today",
  "Yesterday",
  "This Week",
  "Last Week",
  "This Month",
  "Last Month",
  "This FY",
  "Custom",
] as const;

// ── Report definitions (path = route to navigate; empty = coming soon) ─────────
const TRANSACTION_REPORTS: { label: string; path?: string; inline?: string }[] = [
  { label: "Overview", inline: "overview" },
  { label: "Aging", inline: "aging" },
  { label: "Sale", path: "/invoices" },
  { label: "Purchase", path: "/purchases" },
  { label: "Daybook", path: "/daybook" },
  { label: "All Transaction", path: "/daybook" },
  { label: "Profit Loss", inline: "pnl" },
  { label: "Bill Wise Profit" },
  { label: "Cash Flow", path: "/cashbook" },
  { label: "Trial Report" },
  { label: "Balance Sheet", path: "/balance-sheet" },
];

const PARTY_REPORTS: { label: string; path?: string }[] = [
  { label: "Party Statement", path: "/parties" },
  { label: "Party Wise Profit and Loss" },
  { label: "All Parties", path: "/parties" },
  { label: "Party Report by Item" },
  { label: "Sale Purchase by Party" },
  { label: "Sale Purchase by Party Group" },
];

const GST_REPORTS: { label: string; path?: string; inline?: string }[] = [
  { label: "GSTR-1", inline: "gstr1" },
  { label: "GSTR-2" },
  { label: "GSTR-3B", path: "/gstr3b" },
  { label: "GSTR-9" },
  { label: "Sale Summary" },
  { label: "By HSN SAC Report" },
];

const ITEM_STOCK_REPORTS: { label: string; path?: string }[] = [
  { label: "Stock Summary Report", path: "/inventory" },
  { label: "Item Report by Party" },
  { label: "Itemwise Profit & Loss" },
  { label: "Low Stock Summary Report", path: "/inventory" },
  { label: "Item Details Report", path: "/inventory" },
  { label: "Stock Detail Report" },
  { label: "Sale / Purchase by Item Category" },
  { label: "Stock Summary by Item Category" },
  { label: "Item Batch Report" },
  { label: "Item Serial Report" },
  { label: "Item Wise Report" },
];

const BUSINESS_STATUS_REPORTS: { label: string; path?: string }[] = [
  { label: "Bank Statement", path: "/bank-reconciliation" },
  { label: "Discount Statement" },
];

const TAXES_REPORTS: { label: string; path?: string; inline?: string }[] = [
  { label: "GST Report", inline: "gstr1" },
  { label: "GST Rate Report" },
  { label: "Form No. 27EQ" },
  { label: "TCS Receivable" },
  { label: "TDS Payable" },
  { label: "TDS Receivable" },
];

const EXPENSE_REPORTS: { label: string; path?: string }[] = [
  { label: "Expense Transaction Report", path: "/expenses" },
  { label: "Expense Category Report" },
  { label: "Expense Item Report" },
];

const SALE_PURCHASE_ORDER_REPORTS: { label: string; path?: string }[] = [
  { label: "Sale / Purchase Order Transaction Reports" },
  { label: "Sale / Purchase Order by Item Report" },
];

const LOAN_REPORTS: { label: string; path?: string }[] = [
  { label: "Loan Statements" },
];

// Section config for all-in-one view (id for scroll/jump)
const REPORT_SECTIONS: {
  id: string;
  title: string;
  reports: { label: string; path?: string; inline?: string }[];
  hasInline?: boolean;
}[] = [
  { id: "transaction", title: "Transaction", reports: TRANSACTION_REPORTS, hasInline: true },
  { id: "party", title: "Party", reports: PARTY_REPORTS },
  { id: "gst", title: "GST", reports: GST_REPORTS, hasInline: true },
  { id: "item-stock", title: "Item / Stock", reports: ITEM_STOCK_REPORTS },
  { id: "business", title: "Business Status", reports: BUSINESS_STATUS_REPORTS },
  { id: "taxes", title: "Taxes", reports: TAXES_REPORTS, hasInline: true },
  { id: "expense", title: "Expense", reports: EXPENSE_REPORTS },
  { id: "orders", title: "Sale / Purchase Orders", reports: SALE_PURCHASE_ORDER_REPORTS },
  { id: "loan", title: "Loan", reports: LOAN_REPORTS },
];

function getPeriodRange(period: string): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (period === "Yesterday") {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    return { from: fmt(y), to: fmt(y) };
  }
  if (period === "This Week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { from: fmt(start), to: fmt(now) };
  }
  if (period === "Last Week") {
    const end = new Date(now);
    end.setDate(now.getDate() - now.getDay() - 1);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { from: fmt(start), to: fmt(end) };
  }
  if (period === "This Month") {
    return {
      from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: fmt(now),
    };
  }
  if (period === "Last Month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(start), to: fmt(end) };
  }
  if (period === "This FY") {
    const fyYear =
      now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return { from: `${fyYear}-04-01`, to: fmt(now) };
  }
  return { from: fmt(now), to: fmt(now) };
}

function getPreviousPeriodRange(period: string): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (period === "Today") {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    return { from: fmt(y), to: fmt(y) };
  }
  if (period === "Yesterday") {
    const y = new Date(now);
    y.setDate(now.getDate() - 2);
    return { from: fmt(y), to: fmt(y) };
  }
  if (period === "This Week") {
    const end = new Date(now);
    end.setDate(now.getDate() - now.getDay() - 1);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { from: fmt(start), to: fmt(end) };
  }
  if (period === "Last Week") {
    const end = new Date(now);
    end.setDate(now.getDate() - now.getDay() - 8);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { from: fmt(start), to: fmt(end) };
  }
  if (period === "This Month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(start), to: fmt(end) };
  }
  if (period === "Last Month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    return { from: fmt(start), to: fmt(end) };
  }
  if (period === "This FY") {
    const fyYear =
      now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
    return { from: `${fyYear}-04-01`, to: `${fyYear + 1}-03-31` };
  }
  return { from: fmt(now), to: fmt(now) };
}

async function downloadWithAuth(url: string, filename: string) {
  const token = getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    // Surface to user via console (no toast library available here)
    // The button simply does nothing on failure — no silent data corruption
    console.error("[Reports] download failed", {
      url,
      status: res.status,
      statusText: res.statusText,
    });
    return;
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

function currentIndianFY(): string {
  const now = new Date();
  const year = now.getFullYear();
  const mon = now.getMonth() + 1;
  return mon >= 4
    ? `${year}-${String(year + 1).slice(-2)}`
    : `${year - 1}-${String(year).slice(-2)}`;
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ period }: { period: string }) {
  const periodRange = getPeriodRange(period);
  const prevRange = getPreviousPeriodRange(period);
  const useRange = period !== "Today";
  const { data: dailySummary } = useDailySummary();
  const { data: rangeSummary } = useSummaryRange(
    periodRange.from,
    periodRange.to,
  );
  const { data: prevSummary } = useSummaryRange(prevRange.from, prevRange.to);
  const { data: customers = [] } = useCustomers("", 100);
  const { data: products = [] } = useProducts();
  const { data: invoices = [] } = useInvoices(200);

  const summary = useRange ? rangeSummary : dailySummary;
  const totalSales = summary?.totalSales ?? 0;
  const totalPayments = summary?.totalPayments ?? 0;
  const collectionRate =
    totalSales > 0 ? Math.round((totalPayments / totalSales) * 100) : 0;
  const pendingAmount = summary?.pendingAmount ?? 0;

  // Pre-filter invoices to selected period (reused throughout)
  const periodInvoices = invoices.filter((inv) => {
    if (inv.status === "cancelled") return false;
    const d = new Date(inv.createdAt).toISOString().slice(0, 10);
    return d >= periodRange.from && d <= periodRange.to;
  });

  // GST from invoices in period
  const gstCollected = periodInvoices.reduce(
    (sum, inv) =>
      sum +
      parseFloat(String((inv as any).gstAmount ?? (inv as any).taxAmount ?? 0)),
    0,
  );

  // Period comparison helpers
  const prevTotalSales = prevSummary?.totalSales ?? 0;
  const prevTotalPayments = prevSummary?.totalPayments ?? 0;
  const prevPending = prevSummary?.pendingAmount ?? 0;

  function pctChange(
    cur: number,
    prev: number,
  ): { label: string; positive: boolean } | null {
    if (prev === 0) return null;
    const delta = Math.round(((cur - prev) / prev) * 100);
    return {
      label: delta >= 0 ? `↑ ${delta}%` : `↓ ${Math.abs(delta)}%`,
      positive: delta >= 0,
    };
  }

  // WhatsApp share
  const handleWhatsAppShare = () => {
    const msg = [
      `📊 *Business Summary — ${period}*`,
      ``,
      `💰 Total Sales: ₹${totalSales.toLocaleString("en-IN")}`,
      `✅ Collected: ₹${totalPayments.toLocaleString("en-IN")} (${collectionRate}%)`,
      `📝 Pending: ₹${pendingAmount.toLocaleString("en-IN")}`,
      `🏛️ GST Collected: ₹${gstCollected.toLocaleString("en-IN")}`,
      ``,
      `_Sent via Execora_`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Sales trend — adaptive granularity per period
  const salesTrendMap = new Map<string, number>();
  const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const isFY = period === "This FY";
  const isWeek = period === "This Week" || period === "Last Week";
  const isDay = period === "Today" || period === "Yesterday";
  for (const inv of periodInvoices) {
    const d = new Date(inv.createdAt);
    let key: string;
    if (isFY) {
      key = MONTH_NAMES[d.getMonth()];
    } else if (isWeek) {
      key = DAY_NAMES[d.getDay()];
    } else if (isDay) {
      key = String(d.getHours()).padStart(2, "0") + "h";
    } else {
      key = String(d.getDate());
    }
    salesTrendMap.set(
      key,
      (salesTrendMap.get(key) ?? 0) + parseFloat(String(inv.total)),
    );
  }
  // Sort trend data in chronological order
  const salesTrendData = (() => {
    const entries = Array.from(salesTrendMap.entries()).map(([day, sales]) => ({
      day,
      sales: Math.round(sales),
    }));
    if (isFY)
      return entries.sort(
        (a, b) => MONTH_NAMES.indexOf(a.day) - MONTH_NAMES.indexOf(b.day),
      );
    if (isWeek)
      return entries.sort(
        (a, b) => DAY_NAMES.indexOf(a.day) - DAY_NAMES.indexOf(b.day),
      );
    return entries.sort((a, b) => parseInt(a.day) - parseInt(b.day));
  })();

  const productRevMap = new Map<string, number>();
  const productUnitsMap = new Map<string, number>();
  for (const inv of periodInvoices) {
    for (const item of inv.items ?? []) {
      const name = item.product?.name ?? item.productName ?? "Unknown";
      const rev = parseFloat(String(item.itemTotal ?? 0));
      const qty = parseFloat(String(item.quantity ?? 0));
      productRevMap.set(name, (productRevMap.get(name) ?? 0) + rev);
      productUnitsMap.set(name, (productUnitsMap.get(name) ?? 0) + qty);
    }
  }
  const itemSalesSummary = [...productRevMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, revenue]) => ({
      name,
      revenue,
      units: productUnitsMap.get(name) ?? 0,
      avgPrice:
        (productUnitsMap.get(name) ?? 0) > 0
          ? revenue / (productUnitsMap.get(name) ?? 1)
          : 0,
    }));
  const topProductsFromInvoices = [...productRevMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));
  const topProductsFallback = [...products]
    .sort((a, b) => parseFloat(String(b.price)) - parseFloat(String(a.price)))
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      amount: parseFloat(String(p.price)) * p.stock,
    }));
  const topProductsList =
    topProductsFromInvoices.length > 0
      ? topProductsFromInvoices
      : topProductsFallback;

  const topCustomers = [...customers]
    .filter((c) => parseFloat(String(c.totalPurchases)) > 0)
    .sort(
      (a, b) =>
        parseFloat(String(b.totalPurchases)) -
        parseFloat(String(a.totalPurchases)),
    )
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      amount: parseFloat(String(c.totalPurchases)),
    }));

  const cash = summary?.cashPayments ?? 0;
  const upi = summary?.upiPayments ?? 0;
  const other = Math.max(0, totalPayments - cash - upi);
  const paymentMethods = [
    {
      method: "Cash",
      icon: "💵",
      amount: cash,
      percent: totalPayments > 0 ? Math.round((cash / totalPayments) * 100) : 0,
    },
    {
      method: "UPI",
      icon: "📱",
      amount: upi,
      percent: totalPayments > 0 ? Math.round((upi / totalPayments) * 100) : 0,
    },
    {
      method: "Card / Other",
      icon: "💳",
      amount: other,
      percent:
        totalPayments > 0 ? Math.round((other / totalPayments) * 100) : 0,
    },
    {
      method: "Credit (Pending)",
      icon: "📝",
      amount: pendingAmount,
      percent:
        totalSales > 0 ? Math.round((pendingAmount / totalSales) * 100) : 0,
    },
  ];

  const handleExport = () => {
    const rows = [
      ["Period", period],
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
    a.download = `execora-report-${period.toLowerCase().replace(/ /g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* ── Quick Report Shortcuts ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          {
            emoji: "💰",
            label: "Today's Sales",
            color: "bg-primary/10 text-primary border-primary/20",
            value: formatCurrency(totalSales),
          },
          {
            emoji: "📝",
            label: "Pending Dues",
            color: "bg-destructive/10 text-destructive border-destructive/20",
            value: formatCurrency(pendingAmount),
          },
          {
            emoji: "🏛️",
            label: "GST Collected",
            color: "bg-info/10 text-info border-info/20",
            value: formatCurrency(gstCollected),
          },
          {
            emoji: "📦",
            label: "Invoices",
            color: "bg-success/10 text-success border-success/20",
            value: String(periodInvoices.length),
          },
        ].map((tile) => (
          <Card
            key={tile.label}
            className={`cursor-pointer border ${tile.color} shadow-none transition-all hover:shadow-sm`}
          >
            <CardContent className="p-3">
              <p className="text-lg">{tile.emoji}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                {tile.label}
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums">
                {tile.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Primary KPI Row with Comparison Arrows ─────────────────────── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          📈 Revenue Overview
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {
              label: "Total Sales",
              value: formatCurrency(totalSales),
              icon: TrendingUp,
              change: pctChange(totalSales, prevTotalSales),
              iconColor: "text-primary",
            },
            {
              label: "Collected",
              value: formatCurrency(totalPayments),
              icon: CheckCircle2,
              change: pctChange(totalPayments, prevTotalPayments),
              iconColor: "text-green-600",
            },
            {
              label: "Collection Rate",
              value: `${collectionRate}%`,
              icon: Activity,
              change: null,
              iconColor: "text-blue-600",
            },
            {
              label: "Pending Dues",
              value: formatCurrency(pendingAmount),
              icon: TrendingDown,
              change: pctChange(pendingAmount, prevPending),
              iconColor: "text-destructive",
            },
          ].map((s) => (
            <Card key={s.label} className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                  <s.icon className={`h-4 w-4 ${s.iconColor}`} />
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
                  {s.value}
                </p>
                {s.change ? (
                  <p
                    className={`mt-0.5 text-[11px] font-medium ${s.change.positive ? "text-green-600" : "text-destructive"}`}
                  >
                    {s.change.label}{" "}
                    <span className="text-muted-foreground font-normal">
                      vs prev period
                    </span>
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    &nbsp;
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

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
                    <stop
                      offset="5%"
                      stopColor="hsl(24 85% 52%)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(24 85% 52%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(30 15% 88%)"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(20 10% 45%)", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(20 10% 45%)", fontSize: 12 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `₹${value.toLocaleString("en-IN")}`,
                    "Sales",
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(30 15% 88%)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="hsl(24 85% 52%)"
                  strokeWidth={2}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              🏷️ Top Products by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProductsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              (() => {
                const maxAmt = Math.max(
                  ...topProductsList.map((p) => p.amount),
                  1,
                );
                return topProductsList.map((p, i) => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm truncate max-w-[60%]">
                        <span className="mr-1.5 text-muted-foreground">
                          {i + 1}.
                        </span>
                        📦 {p.name}
                      </span>
                      <span className="font-semibold text-sm tabular-nums">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(p.amount / maxAmt) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              👥 Top Customers by Purchases
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              (() => {
                const maxAmt = Math.max(
                  ...topCustomers.map((c) => c.amount),
                  1,
                );
                return topCustomers.map((c, i) => (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm truncate max-w-[60%]">
                        <span className="mr-1.5 text-muted-foreground">
                          {i + 1}.
                        </span>
                        {c.name}
                      </span>
                      <span className="font-semibold text-sm tabular-nums">
                        {formatCurrency(c.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${(c.amount / maxAmt) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()
            )}
          </CardContent>
        </Card>
      </div>

      {itemSalesSummary.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              📋 Item-wise Sales Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                      Item
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                      Units
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                      Revenue
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                      Avg Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itemSalesSummary.map((item, idx) => {
                    const maxRev = itemSalesSummary[0]?.revenue ?? 1;
                    const barPct = Math.round((item.revenue / maxRev) * 100);
                    return (
                      <tr
                        key={item.name}
                        className={
                          idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                        }
                      >
                        <td className="px-4 py-2.5">
                          <div
                            className="font-medium truncate max-w-[140px]"
                            title={item.name}
                          >
                            {item.name}
                          </div>
                          <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/60 rounded-full"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {item.units % 1 === 0
                            ? item.units
                            : item.units.toFixed(1)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(item.avgPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📊 Payment Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.map((pm) => (
            <div key={pm.method} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {pm.icon} {pm.method}
                </span>
                <span className="font-semibold">
                  {formatCurrency(pm.amount)} ({pm.percent}%)
                </span>
              </div>
              <Progress value={pm.percent} className="h-2.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 pb-6">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-1.5 h-4 w-4" /> Download CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" /> Print
        </Button>
      </div>
    </div>
  );
}

// ── GSTR-1 tab ────────────────────────────────────────────────────────────────

function Gstr1Tab() {
  const fy = currentIndianFY();
  const { data: report, isLoading, error, refetch } = useGstr1Report({ fy });
  const emailMutation = useEmailReport();
  const [emailAddr, setEmailAddr] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [gstrMonth, setGstrMonth] = useState<string>("all");
  const [showGstr3b, setShowGstr3b] = useState(false);

  const fyStart = parseInt(fy.split("-")[0]);
  const fyFrom = `${fyStart}-04-01`;
  const fyTo = `${fyStart + 1}-03-31`;

  // FY month list: Apr(fyStart)…Dec(fyStart), Jan…Mar(fyStart+1)
  const FY_MONTHS: { value: string; label: string }[] = [
    ...Array.from({ length: 9 }, (_, i) => {
      const m = i + 4;
      return {
        value: `${fyStart}-${String(m).padStart(2, "0")}`,
        label: new Date(fyStart, m - 1, 1).toLocaleString("en-IN", {
          month: "short",
        }),
      };
    }),
    ...Array.from({ length: 3 }, (_, i) => {
      const m = i + 1;
      return {
        value: `${fyStart + 1}-${String(m).padStart(2, "0")}`,
        label: new Date(fyStart + 1, m - 1, 1).toLocaleString("en-IN", {
          month: "short",
        }),
      };
    }),
  ];

  // Parse date string robustly (ISO or DD/MM/YYYY)
  function parseInvDate(ds: string): string {
    if (!ds) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(ds)) return ds.slice(0, 7); // ISO → YYYY-MM
    const parts = ds.split("/");
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, "0")}`; // DD/MM/YYYY
    return "";
  }

  const filteredB2b =
    gstrMonth === "all"
      ? (report?.b2b ?? [])
      : (report?.b2b ?? []).filter(
          (r) => parseInvDate(r.invoiceDate) === gstrMonth,
        );
  const filteredB2cs =
    gstrMonth === "all"
      ? (report?.b2cs ?? [])
      : (report?.b2cs ?? []).filter(
          (r) => parseInvDate((r as any).invoiceDate ?? "") === gstrMonth,
        );

  // GSTIN validation
  const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  const isValidGstin = (g: string) => GSTIN_RE.test((g ?? "").toUpperCase());

  // Pre-flight issues
  const supplierStateCode = report?.gstin?.slice(0, 2) ?? "";
  const invalidGstinRows = filteredB2b.filter(
    (r) => r.receiverGstin && !isValidGstin(r.receiverGstin),
  );
  const missingHsnRows = (report?.hsn ?? []).filter(
    (r) => !r.hsnCode || r.hsnCode.trim() === "",
  );
  const b2clCandidates = filteredB2cs.filter((r) => {
    const posState = (r.placeOfSupply ?? "").slice(0, 2);
    return (
      supplierStateCode &&
      posState &&
      posState !== supplierStateCode &&
      r.taxableValue > 250000
    );
  });
  const preflight =
    invalidGstinRows.length + missingHsnRows.length + b2clCandidates.length;

  // Filing due date for selected month
  const nowDate = new Date();
  const dueDateStr = (() => {
    let dueMonth: number, dueYear: number;
    if (gstrMonth === "all") {
      dueMonth = 4;
      dueYear = fyStart + 1; // Apr-11 after FY end (March)
    } else {
      const [y, m] = gstrMonth.split("-").map(Number);
      dueMonth = m === 12 ? 1 : m + 1;
      dueYear = m === 12 ? y + 1 : y;
    }
    return new Date(dueYear, dueMonth - 1, 11);
  })();
  const daysUntilDue = Math.ceil(
    (dueDateStr.getTime() - nowDate.getTime()) / 86_400_000,
  );
  const dueFmt = dueDateStr.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lateFeePerDay = 50; // ₹50/day (₹25 CGST + ₹25 SGST)

  const handleEmail = async () => {
    if (!emailAddr) return;
    try {
      await emailMutation.mutateAsync({
        type: "gstr1",
        from: fyFrom,
        to: fyTo,
        email: emailAddr,
        fy,
      });
      setEmailSent(true);
    } catch {
      // emailMutation.isError renders the error in the UI
    }
  };

  if (isLoading)
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-center text-muted-foreground">
          <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />
          <p className="text-sm">Loading GSTR-1 data…</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="mr-2 inline h-4 w-4" />
        Failed to load GSTR-1: {String(error)}
      </div>
    );

  const t = report?.totals;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">GSTR-1 — FY {fy}</h2>
          {report?.gstin && (
            <p className="text-xs text-muted-foreground">
              GSTIN: {report.gstin} | {report.legalName}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadWithAuth(
                reportApi.downloadGstr1Pdf({ fy }),
                `GSTR1_${fy}.pdf`,
              )
            }
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadWithAuth(
                reportApi.downloadGstr1Csv({ fy, section: "b2b" }),
                `GSTR1_B2B_${fy}.csv`,
              )
            }
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> B2B CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadWithAuth(
                reportApi.downloadGstr1Csv({ fy, section: "hsn" }),
                `GSTR1_HSN_${fy}.csv`,
              )
            }
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> HSN CSV
          </Button>
        </div>
      </div>

      {/* Month selector tabs */}
      <div className="flex flex-nowrap gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => setGstrMonth("all")}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${gstrMonth === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
        >
          Full FY
        </button>
        {FY_MONTHS.map((m) => (
          <button
            key={m.value}
            onClick={() => setGstrMonth(m.value)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${gstrMonth === m.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Filing due date banner */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm ${daysUntilDue < 0 ? "bg-destructive/10 text-destructive" : daysUntilDue <= 5 ? "bg-warning/10 text-warning" : "bg-primary/5 text-primary"}`}
      >
        <span className="font-medium">
          {daysUntilDue < 0
            ? `⚠️ GSTR-1 filing overdue since ${dueFmt}`
            : daysUntilDue === 0
              ? `🔴 GSTR-1 due TODAY (${dueFmt})`
              : `📅 GSTR-1 due: ${dueFmt} (${daysUntilDue} days away)`}
        </span>
        {daysUntilDue < 0 && (
          <span className="font-semibold">
            Approx late fee: ₹
            {(Math.abs(daysUntilDue) * lateFeePerDay).toLocaleString("en-IN")}{" "}
            (₹
            {lateFeePerDay}/day)
          </span>
        )}
      </div>

      {/* Pre-flight check */}
      {preflight > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
          <p className="mb-2 text-sm font-semibold text-warning">
            ⚠️ Pre-filing Issues ({preflight} found) — fix before uploading to
            GST portal
          </p>
          <ul className="space-y-1 text-xs text-warning">
            {invalidGstinRows.length > 0 && (
              <li>
                • {invalidGstinRows.length} B2B invoice
                {invalidGstinRows.length > 1 ? "s" : ""} with invalid/missing
                GSTIN (highlighted in red below)
              </li>
            )}
            {missingHsnRows.length > 0 && (
              <li>
                • {missingHsnRows.length} HSN summary entr
                {missingHsnRows.length > 1 ? "ies" : "y"} with blank HSN code —
                portal error CTB-AT001
              </li>
            )}
            {b2clCandidates.length > 0 && (
              <li>
                • {b2clCandidates.length} B2CS entr
                {b2clCandidates.length > 1 ? "ies" : "y"} should be B2CL
                (inter-state &gt; ₹2.5L) — portal will reject
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Summary cards */}
      {t && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Invoices", value: String(t.invoiceCount) },
            {
              label: "Taxable Value",
              value: formatCurrency(t.totalTaxableValue),
            },
            { label: "Total Tax", value: formatCurrency(t.totalTaxValue) },
            {
              label: "Invoice Value",
              value: formatCurrency(t.totalInvoiceValue),
            },
          ].map((s) => (
            <Card key={s.label} className="border-none shadow-sm">
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-1.5 text-xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tax breakdown */}
      {t && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tax Breakdown (FY {fy})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: "CGST",
                  value: formatCurrency(t.totalCgst),
                  color: "text-blue-600",
                },
                {
                  label: "SGST",
                  value: formatCurrency(t.totalSgst),
                  color: "text-purple-600",
                },
                {
                  label: "IGST",
                  value: formatCurrency(t.totalIgst),
                  color: "text-orange-600",
                },
                {
                  label: "CESS",
                  value: formatCurrency(t.totalCess),
                  color: "text-gray-600",
                },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`mt-1 text-lg font-bold ${s.color}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* B2B table */}
      {report && filteredB2b.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              4A — B2B Invoices ({filteredB2b.length}
              {gstrMonth !== "all" &&
                ` in ${FY_MONTHS.find((m) => m.value === gstrMonth)?.label}`}
              )
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {[
                      "Receiver GSTIN",
                      "Receiver",
                      "Invoice No",
                      "Date",
                      "POS",
                      "Value",
                      "Taxable",
                      "IGST",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-semibold text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredB2b.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                      <td
                        className={`px-3 py-1.5 font-mono ${!isValidGstin(row.receiverGstin) ? "text-destructive font-semibold" : ""}`}
                        title={
                          !isValidGstin(row.receiverGstin)
                            ? "Invalid GSTIN format"
                            : undefined
                        }
                      >
                        {row.receiverGstin || "—"}
                      </td>
                      <td className="px-3 py-1.5">{row.receiverName}</td>
                      <td className="px-3 py-1.5">{row.invoiceNo}</td>
                      <td className="px-3 py-1.5">{row.invoiceDate}</td>
                      <td className="px-3 py-1.5">
                        {row.placeOfSupply || "—"}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {formatCurrency(row.invoiceValue)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {formatCurrency(row.taxableValue)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {formatCurrency(row.igst)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* HSN summary table */}
      {report && report.hsn.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              12 — HSN Summary ({report.hsn.length} entries)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {[
                      "HSN",
                      "Description",
                      "UQC",
                      "Qty",
                      "GST%",
                      "Taxable",
                      "CGST",
                      "SGST",
                      "IGST",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-semibold text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.hsn.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                      <td className="px-3 py-1.5 font-mono">{row.hsnCode}</td>
                      <td className="max-w-[120px] truncate px-3 py-1.5">
                        {row.description}
                      </td>
                      <td className="px-3 py-1.5">{row.uqc}</td>
                      <td className="px-3 py-1.5 text-right">
                        {row.totalQty.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-right">{row.gstRate}%</td>
                      <td className="px-3 py-1.5 text-right">
                        {formatCurrency(row.taxableValue)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {formatCurrency(row.cgst)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {formatCurrency(row.sgst)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {formatCurrency(row.igst)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* B2CS table */}
      {report && filteredB2cs.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              7 — B2CS ({filteredB2cs.length} entries
              {b2clCandidates.length > 0
                ? ` · ${b2clCandidates.length} B2CL ⚠️`
                : ""}
              )
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {[
                      "Supply Type",
                      "Place of Supply",
                      "GST Rate",
                      "Taxable Value",
                      "IGST",
                      "CGST",
                      "SGST",
                      "CESS",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-semibold text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredB2cs.map((row, i) => (
                    <tr
                      key={i}
                      className={`${i % 2 === 0 ? "bg-muted/10" : ""} ${b2clCandidates.includes(row) ? "border-l-2 border-orange-400" : ""}`}
                    >
                      <td className="px-3 py-1.5">
                        {row.supplyType}
                        {b2clCandidates.includes(row) && (
                          <span
                            className="ml-1 font-bold text-orange-600"
                            title="Should be B2CL (inter-state >₹2.5L)"
                          >
                            ⚠️ B2CL
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">{row.placeOfSupply}</td>
                      <td className="px-3 py-1.5 text-right">{row.gstRate}%</td>
                      <td className="px-3 py-1.5 text-right">
                        {formatCurrency(row.taxableValue)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {formatCurrency(row.igst)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {formatCurrency(row.cgst)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {formatCurrency(row.sgst)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {formatCurrency(row.cess)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GSTR-3B estimated liability (collapsible) */}
      {report && t && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <button
              className="flex w-full items-center justify-between text-left"
              onClick={() => setShowGstr3b((v) => !v)}
            >
              <CardTitle className="text-sm">
                🧾 Estimated GSTR-3B Liability
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {showGstr3b ? "▲ Hide" : "▼ Show"}
              </span>
            </button>
          </CardHeader>
          {showGstr3b && (
            <CardContent className="space-y-3">
              <p className="text-[11px] text-muted-foreground">
                Auto-computed from invoices. Verify EXP / NIL / RCM amounts on
                GST portal before filing GSTR-3B.
              </p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      {[
                        "Section",
                        "Taxable Value",
                        "IGST",
                        "CGST",
                        "SGST",
                        "CESS",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left font-semibold text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-muted/10">
                      <td className="px-3 py-2 font-medium">
                        3.1(a) Outward taxable
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(t.totalTaxableValue)}
                      </td>
                      <td className="px-3 py-2 text-right text-orange-600">
                        {formatCurrency(t.totalIgst)}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-600">
                        {formatCurrency(t.totalCgst)}
                      </td>
                      <td className="px-3 py-2 text-right text-purple-600">
                        {formatCurrency(t.totalSgst)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">
                        {formatCurrency(t.totalCess)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium text-muted-foreground">
                        3.1(b) Zero-rated / EXP
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        —
                      </td>
                      <td
                        className="px-3 py-2 text-right text-muted-foreground"
                        colSpan={4}
                      >
                        Verify on portal
                      </td>
                    </tr>
                    <tr className="bg-muted/10">
                      <td className="px-3 py-2 font-medium text-muted-foreground">
                        3.1(c) NIL / Exempt
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        —
                      </td>
                      <td
                        className="px-3 py-2 text-right text-muted-foreground"
                        colSpan={4}
                      >
                        Verify on portal
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td className="px-3 py-2">Net Tax Payable</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(t.totalInvoiceValue)}
                      </td>
                      <td className="px-3 py-2 text-right text-orange-600">
                        {formatCurrency(t.totalIgst)}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-600">
                        {formatCurrency(t.totalCgst)}
                      </td>
                      <td className="px-3 py-2 text-right text-purple-600">
                        {formatCurrency(t.totalSgst)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">
                        {formatCurrency(t.totalCess)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-[11px] text-muted-foreground">
                💡 Less: ITC available from GSTR-2B (check GST portal — not
                computed here)
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {/* No data */}
      {report &&
        report.b2b.length === 0 &&
        report.hsn.length === 0 &&
        (report.b2cs?.length ?? 0) === 0 && (
          <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No invoice data for FY {fy}</p>
            <p className="mt-1 text-xs">
              Create GST invoices to see GSTR-1 data here
            </p>
          </div>
        )}

      {/* Email */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📧 Email GSTR-1 Report</CardTitle>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Report sent to {emailAddr}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                value={emailAddr}
                onChange={(e) => setEmailAddr(e.target.value)}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button
                size="sm"
                onClick={handleEmail}
                disabled={!emailAddr || emailMutation.isPending}
              >
                {emailMutation.isPending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="h-3.5 w-3.5" />
                )}
                <span className="ml-1.5">Send</span>
              </Button>
            </div>
          )}
          {emailMutation.isError && (
            <p className="mt-2 text-xs text-destructive">
              {String(emailMutation.error)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── P&L tab ───────────────────────────────────────────────────────────────────

function PnlTab() {
  const now = new Date();
  const [from, setFrom] = useState(
    () =>
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
  );
  const [to, setTo] = useState(() => {
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return last.toISOString().slice(0, 10);
  });

  // Comparison period defaults to same period of previous month
  const [showCompare, setShowCompare] = useState(false);
  const [gstExclusive, setGstExclusive] = useState(false);
  const [compareFrom, setCompareFrom] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.toISOString().slice(0, 10);
  });
  const [compareTo, setCompareTo] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 0);
    return d.toISOString().slice(0, 10);
  });

  // Indian FY quick presets
  const pnlFmt = (d: Date) => d.toISOString().slice(0, 10);
  const fyYear =
    now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const PL_PRESETS = [
    {
      label: "This Month",
      from: pnlFmt(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: pnlFmt(now),
    },
    {
      label: "Last Month",
      from: pnlFmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: pnlFmt(new Date(now.getFullYear(), now.getMonth(), 0)),
    },
    { label: "This FY", from: `${fyYear}-04-01`, to: pnlFmt(now) },
    { label: "Last FY", from: `${fyYear - 1}-04-01`, to: `${fyYear}-03-31` },
    {
      label: "Last 3M",
      from: pnlFmt(
        new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
      ),
      to: pnlFmt(now),
    },
    {
      label: "Last 6M",
      from: pnlFmt(
        new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
      ),
      to: pnlFmt(now),
    },
  ];
  const activePreset =
    PL_PRESETS.find((p) => p.from === from && p.to === to)?.label ?? "Custom";

  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = usePnlReport({
    from,
    to,
    compareFrom: showCompare ? compareFrom : undefined,
    compareTo: showCompare ? compareTo : undefined,
  });
  const emailMutation = useEmailReport();
  const [emailAddr, setEmailAddr] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleEmail = async () => {
    if (!emailAddr) return;
    try {
      await emailMutation.mutateAsync({
        type: "pnl",
        from,
        to,
        email: emailAddr,
      });
      setEmailSent(true);
    } catch {
      // emailMutation.isError renders the error in the UI
    }
  };

  const handlePnlWhatsApp = () => {
    if (!t) return;
    const revDisplay = gstExclusive
      ? (t.revenue - t.taxCollected).toLocaleString("en-IN")
      : t.revenue.toLocaleString("en-IN");
    const msg = [
      `📊 *P&L Report — ${from} → ${to}*`,
      ``,
      `💰 Revenue: ₹${revDisplay}${gstExclusive ? " (excl. GST)" : ""}`,
      `✅ Collected: ₹${t.collected.toLocaleString("en-IN")} (${t.collectionRate.toFixed(1)}%)`,
      `📝 Outstanding: ₹${t.outstanding.toLocaleString("en-IN")}`,
      `🧾 GST Collected: ₹${t.taxCollected.toLocaleString("en-IN")}`,
      `📄 Invoices: ${t.invoiceCount}`,
      ``,
      `_Generated via Execora_`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (isLoading)
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-center text-muted-foreground">
          <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />
          <p className="text-sm">Loading P&L data…</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="mr-2 inline h-4 w-4" />
        Failed to load P&L: {String(error)}
      </div>
    );

  const t = report?.totals;

  const chartData = (report?.months ?? []).map((m) => ({
    month: m.month,
    revenue: Math.round(gstExclusive ? m.revenue - m.taxCollected : m.revenue),
    collected: Math.round(m.collected),
  }));

  return (
    <div className="space-y-5">
      {/* Indian FY Period Presets */}
      <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
        {PL_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setFrom(p.from);
              setTo(p.to);
            }}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activePreset === p.label
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activePreset === "Custom"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          Custom
        </button>
      </div>

      {/* Date range + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted-foreground">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <label className="text-xs text-muted-foreground">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadWithAuth(
                reportApi.downloadPnlPdf({ from, to }),
                `PnL_${from}_${to}.pdf`,
              )
            }
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadWithAuth(
                reportApi.downloadPnlCsv({ from, to }),
                `PnL_${from}_${to}.csv`,
              )
            }
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> CSV
          </Button>
          <Button
            variant={gstExclusive ? "default" : "outline"}
            size="sm"
            onClick={() => setGstExclusive((v) => !v)}
            title="Toggle between GST-inclusive and GST-exclusive revenue"
          >
            {gstExclusive ? "🧾 Excl. GST" : "🧾 Incl. GST"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePnlWhatsApp}
            className="bg-green-500 text-white hover:bg-green-600 border-green-500"
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
          </Button>
        </div>
      </div>

      {/* Compare period toggle */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={showCompare}
            onChange={(e) => setShowCompare(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Compare with previous period
        </label>
        {showCompare && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted-foreground">
              Compare From
            </label>
            <input
              type="date"
              value={compareFrom}
              onChange={(e) => setCompareFrom(e.target.value)}
              className="rounded-md border bg-background px-2 py-1 text-xs"
            />
            <label className="text-xs text-muted-foreground">To</label>
            <input
              type="date"
              value={compareTo}
              onChange={(e) => setCompareTo(e.target.value)}
              className="rounded-md border bg-background px-2 py-1 text-xs"
            />
          </div>
        )}
      </div>

      {/* Summary cards */}
      {t && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: gstExclusive ? "Revenue (excl. GST)" : "Revenue",
              value: formatCurrency(
                gstExclusive ? t.revenue - t.taxCollected : t.revenue,
              ),
              sub: `${t.invoiceCount} invoices`,
            },
            {
              label: gstExclusive ? "Net Rev (excl. GST)" : "Net Revenue",
              value: formatCurrency(
                gstExclusive ? t.netRevenue - t.taxCollected : t.netRevenue,
              ),
              sub: "After discounts",
            },
            {
              label: "Collected",
              value: formatCurrency(t.collected),
              sub: `${t.collectionRate.toFixed(1)}%`,
            },
            {
              label: "Outstanding",
              value: formatCurrency(t.outstanding),
              sub: "Pending",
            },
          ].map((s) => (
            <Card key={s.label} className="border-none shadow-sm">
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-1.5 text-xl font-bold">{s.value}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {s.sub}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Period comparison table */}
      {showCompare && report?.comparison && report.comparison.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              📊 Period Comparison ({from.slice(0, 7)} vs{" "}
              {compareFrom.slice(0, 7)})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                      Metric
                    </th>
                    <th className="px-4 py-2 text-right font-semibold text-muted-foreground">
                      Current Period
                    </th>
                    <th className="px-4 py-2 text-right font-semibold text-muted-foreground">
                      Previous Period
                    </th>
                    <th className="px-4 py-2 text-right font-semibold text-muted-foreground">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.comparison.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                      <td className="px-4 py-2 font-medium">{row.label}</td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(row.currentValue)}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {formatCurrency(row.previousValue)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-semibold ${row.changePercent >= 0 ? "text-green-600" : "text-destructive"}`}
                      >
                        {row.changePercent >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(row.changePercent).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collection rate */}
      {t && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                Collected {formatCurrency(t.collected)} of{" "}
                {formatCurrency(
                  gstExclusive ? t.revenue - t.taxCollected : t.revenue,
                )}
                {gstExclusive && (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    (excl. GST)
                  </span>
                )}
              </span>
              <span className="font-bold text-primary">
                {t.collectionRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={t.collectionRate} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tax collected: {formatCurrency(t.taxCollected)}</span>
              <span>Discounts given: {formatCurrency(t.discounts)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly bar chart */}
      {chartData.length > 1 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Monthly Revenue vs Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(30 15% 88%)"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => [
                    `₹${v.toLocaleString("en-IN")}`,
                    "",
                  ]}
                  contentStyle={{ borderRadius: "8px" }}
                />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="hsl(24 85% 52%)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="collected"
                  name="Collected"
                  fill="hsl(142 71% 45%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Q1 Apr–Jun&nbsp;·&nbsp;Q2 Jul–Sep&nbsp;·&nbsp;Q3
              Oct–Dec&nbsp;·&nbsp;Q4 Jan–Mar
            </p>
          </CardContent>
        </Card>
      )}

      {/* Month-wise table */}
      {report && report.months.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Month-wise Breakdown
              {gstExclusive && (
                <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                  (Revenue excl. GST)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {[
                      "Month",
                      "Bills",
                      gstExclusive ? "Revenue*" : "Revenue",
                      "Discounts",
                      gstExclusive ? "Net Rev*" : "Net Revenue",
                      "Tax",
                      "Collected",
                      "Outstanding",
                      gstExclusive ? "Avg Inv*" : "Avg Invoice",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-semibold text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.months.map((m, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                      <td className="px-3 py-1.5 font-medium">{m.month}</td>
                      <td className="px-3 py-1.5 text-center">
                        {m.invoiceCount}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {formatCurrency(
                          gstExclusive ? m.revenue - m.taxCollected : m.revenue,
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right text-orange-600">
                        {formatCurrency(m.discounts)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium">
                        {formatCurrency(
                          gstExclusive
                            ? m.netRevenue - m.taxCollected
                            : m.netRevenue,
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right text-blue-600">
                        {formatCurrency(m.taxCollected)}
                      </td>
                      <td className="px-3 py-1.5 text-right text-green-600">
                        {formatCurrency(m.collected)}
                      </td>
                      <td className="px-3 py-1.5 text-right text-red-600">
                        {formatCurrency(m.outstanding)}
                      </td>
                      <td className="px-3 py-1.5 text-right text-purple-600">
                        {m.invoiceCount > 0
                          ? formatCurrency(
                              (gstExclusive
                                ? m.revenue - m.taxCollected
                                : m.revenue) / m.invoiceCount,
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {t && (
                  <tfoot>
                    <tr className="border-t-2 bg-muted/20 font-bold">
                      <td className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2 text-center">
                        {t.invoiceCount}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(
                          gstExclusive ? t.revenue - t.taxCollected : t.revenue,
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-orange-600">
                        {formatCurrency(t.discounts)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(
                          gstExclusive
                            ? t.netRevenue - t.taxCollected
                            : t.netRevenue,
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-600">
                        {formatCurrency(t.taxCollected)}
                      </td>
                      <td className="px-3 py-2 text-right text-green-600">
                        {formatCurrency(t.collected)}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600">
                        {formatCurrency(t.outstanding)}
                      </td>
                      <td className="px-3 py-2 text-right text-purple-600">
                        {t.invoiceCount > 0
                          ? formatCurrency(
                              (gstExclusive
                                ? t.revenue - t.taxCollected
                                : t.revenue) / t.invoiceCount,
                            )
                          : "—"}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data */}
      {report && report.months.length === 0 && (
        <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
          <TrendingUp className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">No data for selected period</p>
          <p className="mt-1 text-xs">
            Adjust the date range or create some invoices first
          </p>
        </div>
      )}

      {/* Email */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📧 Email P&L Report</CardTitle>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Report sent to {emailAddr}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                value={emailAddr}
                onChange={(e) => setEmailAddr(e.target.value)}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button
                size="sm"
                onClick={handleEmail}
                disabled={!emailAddr || emailMutation.isPending}
              >
                {emailMutation.isPending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="h-3.5 w-3.5" />
                )}
                <span className="ml-1.5">Send</span>
              </Button>
            </div>
          )}
          {emailMutation.isError && (
            <p className="mt-2 text-xs text-destructive">
              {String(emailMutation.error)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Aging / Outstanding Report ───────────────────────────────────────────────

const AGING_BUCKETS = [
  {
    label: "0–30 days",
    max: 30,
    cls: "bg-green-500/10  text-green-700  dark:text-green-400",
    barCls: "bg-green-500",
  },
  {
    label: "31–60 days",
    max: 60,
    cls: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    barCls: "bg-yellow-500",
  },
  {
    label: "61–90 days",
    max: 90,
    cls: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    barCls: "bg-orange-500",
  },
  {
    label: "90+ days",
    max: Infinity,
    cls: "bg-destructive/10 text-destructive",
    barCls: "bg-destructive",
  },
];

type AgingView = "bucket" | "customer";
type AgingSort = "amount" | "oldest" | "newest";

function AgingTab() {
  const { data: invoices = [], isLoading } = useInvoices(500);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<AgingView>("bucket");
  const [sort, setSort] = useState<AgingSort>("amount");
  const [open, setOpen] = useState<number | null>(null);

  const nowMs = Date.now();

  function ageDays(inv: (typeof invoices)[0]) {
    return Math.floor((nowMs - new Date(inv.createdAt).getTime()) / 86_400_000);
  }

  function bucketIdx(age: number) {
    if (age <= 30) return 0;
    if (age <= 60) return 1;
    if (age <= 90) return 2;
    return 3;
  }

  const unpaid = invoices.filter((inv) => {
    if (inv.status !== "pending" && inv.status !== "partial") return false;
    // Guard: exclude invoices where outstanding balance is zero or negative
    const balance =
      parseFloat(String(inv.total ?? 0)) -
      parseFloat(String(inv.paidAmount ?? 0));
    if (balance <= 0) return false;
    if (search.trim() === "") return true;
    return (
      inv.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customer?.name ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const buckets: { total: number; count: number; invoices: typeof unpaid }[] =
    AGING_BUCKETS.map(() => ({
      total: 0,
      count: 0,
      invoices: [],
    }));

  for (const inv of unpaid) {
    const b = bucketIdx(ageDays(inv));
    const pending = Math.max(
      0,
      parseFloat(String(inv.total ?? 0)) -
        parseFloat(String(inv.paidAmount ?? 0)),
    );
    buckets[b].total += pending;
    buckets[b].count += 1;
    buckets[b].invoices.push(inv);
  }

  // Sort each bucket
  for (const b of buckets) {
    b.invoices.sort((a, z) => {
      if (sort === "oldest") return ageDays(z) - ageDays(a);
      if (sort === "newest") return ageDays(a) - ageDays(z);
      // amount desc
      const dueA =
        parseFloat(String(a.total ?? 0)) -
        parseFloat(String(a.paidAmount ?? 0));
      const dueZ =
        parseFloat(String(z.total ?? 0)) -
        parseFloat(String(z.paidAmount ?? 0));
      return dueZ - dueA;
    });
  }

  const grandTotal = buckets.reduce((s, b) => s + b.total, 0);
  const atRisk = buckets[2].total + buckets[3].total; // 60+ days
  const avgAge =
    unpaid.length > 0
      ? Math.round(
          unpaid.reduce((s, inv) => s + ageDays(inv), 0) / unpaid.length,
        )
      : 0;

  // Customer-grouped view
  type CustRow = {
    name: string;
    total: number;
    invoices: typeof unpaid;
    maxAge: number;
  };
  const custMap = new Map<string, CustRow>();
  for (const inv of unpaid) {
    const name = inv.customer?.name ?? "(Unknown)";
    const due =
      parseFloat(String(inv.total ?? 0)) -
      parseFloat(String(inv.paidAmount ?? 0));
    const age = ageDays(inv);
    const existing = custMap.get(name);
    if (existing) {
      existing.total += due;
      existing.invoices.push(inv);
      existing.maxAge = Math.max(existing.maxAge, age);
    } else {
      custMap.set(name, { name, total: due, invoices: [inv], maxAge: age });
    }
  }
  const custRows = [...custMap.values()].sort((a, b) => b.total - a.total);

  // WhatsApp reminder for a single invoice
  function sendWhatsAppReminder(inv: (typeof unpaid)[0], due: number) {
    const customerName = inv.customer?.name ?? "Sir/Madam";
    const phone = (inv.customer as any)?.phone ?? "";
    const msg = [
      `Dear ${customerName},`,
      ``,
      `This is a gentle reminder that invoice *${inv.invoiceNo}* for *₹${due.toLocaleString("en-IN")}* is pending.`,
      `Invoice date: ${new Date(inv.createdAt).toLocaleDateString("en-IN")}`,
      `Outstanding since: ${ageDays(inv)} days`,
      ``,
      `Kindly clear the dues at your earliest convenience.`,
      ``,
      `Thank you,\n_Sent via Execora_`,
    ].join("\n");
    const url = phone
      ? `https://wa.me/91${phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  // Bulk WhatsApp — one message listing all overdue customers
  function sendBulkReminder() {
    if (custRows.length === 0) return;
    const lines = custRows
      .slice(0, 10)
      .map(
        (c) =>
          `• ${c.name}: ₹${c.total.toLocaleString("en-IN")} (${c.maxAge}d)`,
      );
    const msg = [
      `📋 *Outstanding Dues Summary*`,
      ``,
      ...lines,
      ``,
      `Total: ₹${grandTotal.toLocaleString("en-IN")}`,
      `_Generated via Execora_`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── KPI summary row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total Outstanding",
            value: formatCurrency(grandTotal),
            sub: `${unpaid.length} invoices`,
            cls: "text-destructive",
          },
          {
            label: "At-Risk (60+ days)",
            value: formatCurrency(atRisk),
            sub: `${buckets[2].count + buckets[3].count} invoices`,
            cls: "text-orange-600",
          },
          {
            label: "Avg Age",
            value: `${avgAge}d`,
            sub: "average overdue days",
            cls: "text-yellow-600",
          },
          {
            label: "90+ Days",
            value: formatCurrency(buckets[3].total),
            sub: `${buckets[3].count} invoices`,
            cls: "text-destructive font-bold",
          },
        ].map((k) => (
          <Card key={k.label} className="border-none shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {k.label}
              </p>
              <p className={`mt-1.5 text-xl font-bold tabular-nums ${k.cls}`}>
                {k.value}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {k.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Toolbar: search + view toggle + sort + bulk WA ─────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search customer or invoice…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 flex-1 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-[180px]"
        />
        <div className="flex rounded-lg border overflow-hidden text-xs font-semibold">
          {(["bucket", "customer"] as AgingView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 transition-colors ${view === v ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              {v === "bucket" ? "📂 Bucket" : "👤 Customer"}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as AgingSort)}
          className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="amount">Sort: Highest Amount</option>
          <option value="oldest">Sort: Oldest First</option>
          <option value="newest">Sort: Newest First</option>
        </select>
        {unpaid.length > 0 && (
          <Button
            size="sm"
            onClick={sendBulkReminder}
            className="bg-green-500 hover:bg-green-600 text-white border-green-500 h-8 text-xs"
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5" /> Bulk Remind
          </Button>
        )}
      </div>

      {/* ── BUCKET VIEW ─────────────────────────────────────────────── */}
      {view === "bucket" && (
        <div className="space-y-3">
          {AGING_BUCKETS.map((def, idx) => (
            <div key={def.label}>
              <button
                className={`w-full rounded-xl border p-4 text-left transition-all hover:shadow-md ${open === idx ? "border-primary/40 shadow-md" : "bg-card"}`}
                onClick={() => setOpen(open === idx ? null : idx)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold ${def.cls}`}
                    >
                      {def.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {buckets[idx].count} invoices
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-base font-bold tabular-nums">
                      {formatCurrency(buckets[idx].total)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {open === idx ? "▲" : "▼"}
                    </span>
                  </div>
                </div>
                {grandTotal > 0 && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${def.barCls}`}
                      style={{
                        width: `${(buckets[idx].total / grandTotal) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </button>

              {open === idx && buckets[idx].invoices.length > 0 && (
                <div className="mt-1 overflow-hidden rounded-xl border bg-card">
                  <div className="divide-y">
                    {buckets[idx].invoices.map((inv) => {
                      const due =
                        parseFloat(String(inv.total ?? 0)) -
                        parseFloat(String(inv.paidAmount ?? 0));
                      const age = ageDays(inv);
                      return (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between px-4 py-2.5 gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-sm">
                              {inv.invoiceNo}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {inv.customer?.name ?? "—"} ·{" "}
                              {new Date(inv.createdAt).toLocaleDateString(
                                "en-IN",
                              )}{" "}
                              ·{" "}
                              <span
                                className={
                                  age > 90
                                    ? "text-destructive font-semibold"
                                    : age > 60
                                      ? "text-orange-600"
                                      : ""
                                }
                              >
                                {age}d old
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className="font-semibold tabular-nums text-destructive text-sm">
                              {formatCurrency(due)}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                sendWhatsAppReminder(inv, due);
                              }}
                              title="Send WhatsApp reminder"
                              className="rounded-full p-1.5 bg-green-500/10 text-green-700 hover:bg-green-500/20 transition-colors"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── CUSTOMER VIEW ───────────────────────────────────────────── */}
      {view === "customer" && (
        <div className="space-y-2">
          {custRows.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
              <p className="text-sm">No outstanding dues</p>
            </div>
          ) : (
            custRows.map((cust) => {
              const worstBucket = bucketIdx(cust.maxAge);
              const worstDef = AGING_BUCKETS[worstBucket];
              return (
                <div key={cust.name} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">
                          {cust.name}
                        </p>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${worstDef.cls}`}
                        >
                          up to {cust.maxAge}d
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {cust.invoices.length} invoice
                        {cust.invoices.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="font-bold tabular-nums text-destructive">
                        {formatCurrency(cust.total)}
                      </p>
                      <button
                        onClick={() => {
                          // Send reminder for most overdue invoice of this customer
                          const oldest = cust.invoices.reduce((a, b) =>
                            ageDays(a) > ageDays(b) ? a : b,
                          );
                          const due =
                            parseFloat(String(oldest.total ?? 0)) -
                            parseFloat(String(oldest.paidAmount ?? 0));
                          sendWhatsAppReminder(oldest, cust.total);
                        }}
                        title="Send WhatsApp reminder"
                        className="rounded-full p-1.5 bg-green-500/10 text-green-700 hover:bg-green-500/20 transition-colors"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Invoice breakdown */}
                  <div className="mt-3 space-y-1">
                    {cust.invoices.map((inv) => {
                      const due =
                        parseFloat(String(inv.total ?? 0)) -
                        parseFloat(String(inv.paidAmount ?? 0));
                      const age = ageDays(inv);
                      const bIdx = bucketIdx(age);
                      return (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between text-xs text-muted-foreground"
                        >
                          <span className="truncate">
                            {inv.invoiceNo} ·{" "}
                            {new Date(inv.createdAt).toLocaleDateString(
                              "en-IN",
                            )}
                          </span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span
                              className={`font-semibold ${AGING_BUCKETS[bIdx].cls.split(" ")[1]}`}
                            >
                              {age}d
                            </span>
                            <span className="tabular-nums font-semibold text-foreground">
                              {formatCurrency(due)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {unpaid.length === 0 && (
        <div className="rounded-lg border-2 border-dashed p-10 text-center text-muted-foreground">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500 opacity-60" />
          <p className="text-sm font-medium">All clear! No outstanding dues</p>
          <p className="mt-1 text-xs">
            {search ? "No matches for your search" : "All invoices are paid"}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Report links grid (card per report) ──────────────────────────────────────

function ReportLinksGrid({
  reports,
  onInlineSelect,
  navigate,
  vertical,
}: {
  reports: { label: string; path?: string; inline?: string }[];
  onInlineSelect?: (key: string) => void;
  navigate: (path: string) => void;
  vertical?: boolean;
}) {
  return (
    <div
      className={
        vertical
          ? "flex flex-col gap-2"
          : "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      }
    >
      {reports.map((r) => {
        const hasAction = r.path || r.inline;
        return (
          <Card
            key={r.label}
            className={
              hasAction
                ? "cursor-pointer transition-all hover:border-primary/50 hover:bg-muted/30 active:scale-[0.99] min-h-[52px] flex"
                : "opacity-75 min-h-[52px] flex"
            }
            onClick={() => {
              if (r.path) navigate(r.path);
              else if (r.inline) onInlineSelect?.(r.inline);
            }}
          >
            <CardContent className="flex items-center justify-between p-4 w-full min-h-[52px]">
              <span className="font-medium text-sm sm:text-base truncate pr-2">
                {r.label}
              </span>
              {hasAction ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  Soon
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Main Reports page ─────────────────────────────────────────────────────────

const INLINE_FROM_PARAM: Record<string, string> = {
  "gstr-1": "gstr1",
  gstr1: "gstr1",
  pnl: "pnl",
  overview: "overview",
  aging: "aging",
};

const Reports = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab")?.toLowerCase();
  const inlineFromParam = tabParam && INLINE_FROM_PARAM[tabParam];

  const [inlineReport, setInlineReport] = useState<string | null>(
    inlineFromParam ?? null,
  );
  const [activePeriod, setActivePeriod] = useState<string>("This Month");
  const [activeSectionId, setActiveSectionId] = useState<string>("transaction");
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(true);
  const [showAllTabs, setShowAllTabs] = useState<boolean>(false);
  const [minimizedSections, setMinimizedSections] = useState<Set<string>>(
    new Set(),
  );
  const [sidebarExpandedSections, setSidebarExpandedSections] = useState<
    Set<string>
  >(new Set(REPORT_SECTIONS.map((s) => s.id)));

  const toggleSidebarSection = (id: string) => {
    setSidebarExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSectionMinimize = (id: string) => {
    setMinimizedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const navigate = useNavigate();
  useWsInvalidation(["summary", "invoices", "customers", "products"]);

  useEffect(() => {
    if (inlineFromParam) setInlineReport(inlineFromParam);
  }, [tabParam, inlineFromParam]);

  // Sync activeSectionId from URL tab param (for desktop)
  useEffect(() => {
    if (!tabParam) return;
    const id =
      tabParam === "transaction"
        ? "transaction"
        : tabParam === "party"
          ? "party"
          : tabParam === "gst"
            ? "gst"
            : tabParam === "item" || tabParam === "stock"
              ? "item-stock"
              : tabParam === "business" || tabParam === "status"
                ? "business"
                : tabParam === "taxes"
                  ? "taxes"
                  : tabParam === "expense"
                    ? "expense"
                    : tabParam === "order"
                      ? "orders"
                      : tabParam === "loan"
                        ? "loan"
                        : null;
    if (id) setActiveSectionId(id);
  }, [tabParam]);

  const handleInlineSelect = (key: string) => {
    setInlineReport(key);
    setSearchParams({ tab: key === "gstr1" ? "gstr1" : key });
  };

  // Scroll to section when ?tab= is in URL
  useEffect(() => {
    if (!tabParam) return;
    const sectionId =
      tabParam === "transaction"
        ? "transaction"
        : tabParam === "party"
          ? "party"
          : tabParam === "gst"
            ? "gst"
            : tabParam === "item" || tabParam === "stock"
              ? "item-stock"
              : tabParam === "business" || tabParam === "status"
                ? "business"
                : tabParam === "taxes"
                  ? "taxes"
                  : tabParam === "expense"
                    ? "expense"
                    : tabParam === "order"
                      ? "orders"
                      : tabParam === "loan"
                        ? "loan"
                        : null;
    if (sectionId) {
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [tabParam]);

  // When showing inline report (GSTR1, P&L, Overview, Aging), render that content
  if (inlineReport === "gstr1") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card px-4 py-3 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setInlineReport(null);
                  setSearchParams({ tab: "gst" });
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold tracking-tight md:text-xl">
                🏛️ GSTR-1
              </h1>
            </div>
          </div>
          <VoiceBar
            idleHint={
              <>
                <span className="font-medium text-foreground">
                  "GSTR-1 report nikalo"
                </span>
              </>
            }
          />
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-6">
          <Gstr1Tab />
        </main>
      </div>
    );
  }
  if (inlineReport === "pnl") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card px-4 py-3 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setInlineReport(null);
                  setSearchParams({ tab: "transaction" });
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold tracking-tight md:text-xl">
                📈 Profit & Loss
              </h1>
            </div>
          </div>
          <VoiceBar
            idleHint={
              <>
                <span className="font-medium text-foreground">
                  "is mahine ka P&L dikhao"
                </span>
              </>
            }
          />
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-6">
          <PnlTab />
        </main>
      </div>
    );
  }
  if (inlineReport === "overview" || inlineReport === "aging") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card px-4 py-3 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setInlineReport(null);
                  setSearchParams({ tab: "transaction" });
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold tracking-tight md:text-xl">
                {inlineReport === "aging" ? "⏰ Aging" : "📊 Overview"}
              </h1>
            </div>
          </div>
          {inlineReport === "overview" && (
            <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
            </div>
          )}
          <VoiceBar idleHint="Reports" />
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-6">
          {inlineReport === "overview" && (
            <OverviewTab period={activePeriod} />
          )}
          {inlineReport === "aging" && <AgingTab />}
        </main>
      </div>
    );
  }

  const handleSectionChange = (id: string) => {
    setActiveSectionId(id);
    setSearchParams({ tab: id === "item-stock" ? "item" : id });
  };

  const activeSection = REPORT_SECTIONS.find((s) => s.id === activeSectionId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card px-4 py-3 md:px-6 shrink-0 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5 shrink-0" />
            </Button>
            <h1 className="text-lg font-bold tracking-tight md:text-xl truncate">
              📊 Reports & Analytics
            </h1>
          </div>
          <div className="hidden lg:flex items-center gap-1 shrink-0">
            {/* Show all tabs */}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setShowAllTabs((o) => !o)}
              title={showAllTabs ? "Show single tab" : "Show all tabs"}
            >
              {showAllTabs ? (
                <LayoutList className="h-4 w-4 mr-1" />
              ) : (
                <LayoutGrid className="h-4 w-4 mr-1" />
              )}
              {showAllTabs ? "Single" : "All"}
            </Button>
            {/* Toggle left sidebar */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightSidebarOpen((o) => !o)}
              title={rightSidebarOpen ? "Close categories" : "Open categories"}
            >
                {rightSidebarOpen ? (
                <PanelRightClose className="h-5 w-5" />
              ) : (
                <PanelRightOpen className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
        {/* Mobile: Jump to section pills */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1 lg:hidden">
          {REPORT_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {s.title}
            </a>
          ))}
        </div>
        {/* Desktop: Horizontal tabs (shown only when left sidebar is closed) */}
        <div
          className={[
            "mt-3 gap-0 border-b -mb-px",
            rightSidebarOpen ? "hidden lg:hidden" : "hidden lg:flex",
          ].join(" ")}
        >
          {REPORT_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSectionChange(s.id)}
              className={[
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                activeSectionId === s.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {s.title}
            </button>
          ))}
        </div>
        <VoiceBar
          idleHint={
            <>
              <span className="font-medium text-foreground">
                "GSTR-1 report nikalo"
              </span>
              {" · "}
              <span>"P&L dikhao"</span>
            </>
          }
        />
      </header>

      {/* Mobile: All reports in one scrollable view */}
      <main className="flex-1 p-4 md:p-6 overflow-x-hidden lg:hidden">
        <div className="space-y-6 max-w-4xl mx-auto">
          {REPORT_SECTIONS.map((section) => {
            const isMinimized = minimizedSections.has(section.id);
            return (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24"
              >
                <button
                  onClick={() => toggleSectionMinimize(section.id)}
                  className="flex items-center justify-between w-full text-left sticky top-[120px] md:top-[100px] bg-background/95 backdrop-blur py-2 -mx-1 px-1 z-[1] group"
                >
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h2>
                  {isMinimized ? (
                    <Plus className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                  )}
                </button>
                {!isMinimized && (
                  <div className="mt-3">
                    <ReportLinksGrid
                      reports={section.reports}
                      onInlineSelect={
                        section.hasInline ? handleInlineSelect : undefined
                      }
                      navigate={navigate}
                    />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>

      {/* Desktop: Left sidebar + main content */}
      <div className="hidden lg:flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar — report categories */}
        <aside
          className={[
            "flex flex-col border-r bg-card shrink-0 transition-all duration-200 overflow-hidden",
            rightSidebarOpen ? "w-56 xl:w-64" : "w-0 border-0",
          ].join(" ")}
        >
          {rightSidebarOpen && (
            <div className="p-3 overflow-y-auto">
              <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Reports
              </p>
              <nav className="mt-2 space-y-0.5">
                {REPORT_SECTIONS.map((section) => {
                  const isExpanded = sidebarExpandedSections.has(section.id);
                  const isActive = activeSectionId === section.id;
                  return (
                    <div key={section.id} className="space-y-0.5">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleSidebarSection(section.id)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleSectionChange(section.id)}
                          className={[
                            "flex-1 text-left px-2 py-2 rounded-lg text-sm font-medium transition-colors truncate",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          ].join(" ")}
                        >
                          {section.title}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="ml-5 pl-2 border-l border-muted/50 space-y-0.5">
                          {section.reports.map((r) => {
                            const hasAction = r.path || r.inline;
                            return (
                              <button
                                key={r.label}
                                onClick={() => {
                                  if (r.path) navigate(r.path);
                                  else if (r.inline && section.hasInline)
                                    handleInlineSelect(r.inline);
                                }}
                                className={[
                                  "w-full text-left px-2 py-1.5 rounded text-sm transition-colors truncate",
                                  hasAction
                                    ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    : "text-muted-foreground/70 cursor-default",
                                ].join(" ")}
                              >
                                {r.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          )}
        </aside>
        <main className="flex-1 p-6 overflow-x-hidden overflow-y-auto min-w-0">
          <div className="max-w-2xl">
            {showAllTabs ? (
              <div className="space-y-4">
                {REPORT_SECTIONS.map((section) => {
                  const isMinimized = minimizedSections.has(section.id);
                  return (
                    <section key={section.id} id={section.id}>
                      <button
                        onClick={() => toggleSectionMinimize(section.id)}
                        className="flex items-center justify-between w-full text-left py-2 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          {section.title}
                        </h2>
                        {isMinimized ? (
                          <Plus className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                        )}
                      </button>
                      {!isMinimized && (
                        <div className="mt-2">
                          <ReportLinksGrid
                            reports={section.reports}
                            onInlineSelect={
                              section.hasInline ? handleInlineSelect : undefined
                            }
                            navigate={navigate}
                            vertical
                          />
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : (
              activeSection && (
                <>
                  <button
                    onClick={() => toggleSectionMinimize(activeSection.id)}
                    className="flex items-center justify-between w-full text-left py-2 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group mb-2"
                  >
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {activeSection.title}
                    </h2>
                    {minimizedSections.has(activeSection.id) ? (
                      <Plus className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                    )}
                  </button>
                  {!minimizedSections.has(activeSection.id) && (
                    <ReportLinksGrid
                      reports={activeSection.reports}
                      onInlineSelect={
                        activeSection.hasInline ? handleInlineSelect : undefined
                      }
                      navigate={navigate}
                      vertical
                    />
                  )}
                </>
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Reports;
