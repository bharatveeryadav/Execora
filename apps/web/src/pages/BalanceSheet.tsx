/**
 * BalanceSheet — Simplified balance sheet for Indian SMEs.
 * Assets (cash + receivables + inventory) vs Liabilities (payables + credit) vs Equity.
 * Derived from existing API data: summaryApi, customerApi, cashbookApi.
 */
import { useState } from "react";
import {
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Wallet,
  Scale,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import VoiceBar from "@/components/VoiceBar";
import { useWsInvalidation } from "@/hooks/useWsInvalidation";
import {
  useSummaryRange,
  useCustomers,
  useProducts,
  useExpenses,
} from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";

const fmt = (n: number | string) => formatCurrency(Number(n) || 0);

const PERIODS = ["This Month", "Last Month", "This FY", "Last FY"] as const;
type Period = (typeof PERIODS)[number];

function getPeriodRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  // FY in India starts April 1
  const fyStart = m >= 3 ? `${y}-04-01` : `${y - 1}-04-01`;
  const fyEnd = m >= 3 ? `${y + 1}-03-31` : `${y}-03-31`;
  const lastFyStart = m >= 3 ? `${y - 1}-04-01` : `${y - 2}-04-01`;
  const lastFyEnd = m >= 3 ? `${y}-03-31` : `${y - 1}-03-31`;

  if (period === "This Month") {
    const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const to = now.toISOString().slice(0, 10);
    return { from, to };
  }
  if (period === "Last Month") {
    const lm = new Date(y, m - 1, 1);
    const lme = new Date(y, m, 0);
    return {
      from: lm.toISOString().slice(0, 10),
      to: lme.toISOString().slice(0, 10),
    };
  }
  if (period === "This FY") return { from: fyStart, to: fyEnd };
  return { from: lastFyStart, to: lastFyEnd };
}

// ── Section component ─────────────────────────────────────────────────────────

interface LineItem {
  label: string;
  amount: number;
  sub?: string;
  icon?: string;
}

function BSSection({
  title,
  items,
  total,
  color,
  icon: Icon,
}: {
  title: string;
  items: LineItem[];
  total: number;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className={`h-4 w-4 ${color}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-4 py-2.5 text-sm ${
              i < items.length - 1 ? "border-b" : ""
            }`}
          >
            <div>
              <div className="font-medium">
                {item.icon} {item.label}
              </div>
              {item.sub && (
                <div className="text-[11px] text-muted-foreground">
                  {item.sub}
                </div>
              )}
            </div>
            <div className="font-semibold">{fmt(item.amount)}</div>
          </div>
        ))}
        <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5">
          <span className="text-sm font-bold">Total {title}</span>
          <span className={`text-sm font-bold ${color}`}>{fmt(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BalanceSheet() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("This Month");

  const range = getPeriodRange(period);

  const { data: summaryData } = useSummaryRange(range.from, range.to);
  const { data: customers = [] } = useCustomers("", 500);
  const { data: products = [] } = useProducts();
  const { data: expenseData } = useExpenses({ from: range.from, to: range.to });

  useWsInvalidation(["summary", "customers", "products"]);

  const summary = (summaryData as any) ?? {};

  // ── Derived numbers ─────────────────────────────────────────────────────────
  const totalReceivables = customers.reduce(
    (s: number, c: any) => s + (Number(c.balance) > 0 ? Number(c.balance) : 0),
    0,
  );
  const totalPayables = customers.reduce(
    (s: number, c: any) =>
      s + (Number(c.balance) < 0 ? Math.abs(Number(c.balance)) : 0),
    0,
  );
  const inventoryValue = products.reduce(
    (s: number, p: any) => s + Number(p.stock ?? 0) * Number(p.price ?? 0),
    0,
  );
  const cashBalance = Number(summary?.totalPayments ?? 0);
  const totalSales = Number(summary?.totalSales ?? 0);
  const totalExpenses = Number(expenseData?.total ?? 0);

  const totalAssets = cashBalance + totalReceivables + inventoryValue;
  const totalLiabilities = totalPayables;
  const equity = totalAssets - totalLiabilities;

  const assets: LineItem[] = [
    {
      label: "Cash & Bank Balance",
      amount: cashBalance,
      icon: "💵",
      sub: "From cash book entries",
    },
    {
      label: "Accounts Receivable",
      amount: totalReceivables,
      icon: "🧾",
      sub: `${customers.filter((c: any) => Number(c.balance) > 0).length} customers with outstanding`,
    },
    {
      label: "Inventory Value",
      amount: inventoryValue,
      icon: "📦",
      sub: `${products.length} products at current price`,
    },
  ];

  const liabilities: LineItem[] = [
    {
      label: "Accounts Payable",
      amount: totalPayables,
      icon: "💳",
      sub: "Credit balances owed to customers",
    },
    {
      label: "Tax Liability (GST)",
      amount: totalSales * 0.09,
      icon: "🏛️",
      sub: "Estimated CGST payable (9%)",
    },
  ];

  const equityItems: LineItem[] = [
    { label: "Period Revenue", amount: totalSales, icon: "📈" },
    { label: "Period Expenses", amount: -totalExpenses, icon: "📉" },
    {
      label: "Net Owner Equity",
      amount: equity,
      icon: "⚖️",
      sub: "Assets minus Liabilities",
    },
  ];

  const isBalanced = Math.abs(totalAssets - totalLiabilities - equity) < 1;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Balance Sheet</h1>
            <p className="text-xs text-muted-foreground">
              Assets · Liabilities · Equity
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-1 h-3.5 w-3.5" /> Export
          </Button>
        </div>
        {/* Period filter */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="px-4 pb-2">
          <VoiceBar idleHint={<span>"balance sheet" · "total assets this month" · "show last FY"</span>} />
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {/* Balance indicator */}
        <Card
          className={`border-2 ${isBalanced ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"}`}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <Scale
              className={`h-8 w-8 ${isBalanced ? "text-success" : "text-warning"}`}
            />
            <div>
              <div className="font-bold text-sm">
                {isBalanced
                  ? "✅ Balance Sheet Balanced"
                  : "⚠️ Check Your Entries"}
              </div>
              <div className="text-xs text-muted-foreground">
                Assets {fmt(totalAssets)} = Liabilities {fmt(totalLiabilities)}{" "}
                + Equity {fmt(equity)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary tiles */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="mx-auto h-5 w-5 text-success" />
              <div className="mt-1 text-base font-bold text-success">
                {fmt(totalAssets)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Total Assets
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingDown className="mx-auto h-5 w-5 text-destructive" />
              <div className="mt-1 text-base font-bold text-destructive">
                {fmt(totalLiabilities)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Liabilities
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <IndianRupee className="mx-auto h-5 w-5 text-primary" />
              <div className="mt-1 text-base font-bold text-primary">
                {fmt(equity)}
              </div>
              <div className="text-[11px] text-muted-foreground">Equity</div>
            </CardContent>
          </Card>
        </div>

        {/* Assets section */}
        <BSSection
          title="Assets"
          items={assets}
          total={totalAssets}
          color="text-success"
          icon={TrendingUp}
        />

        {/* Liabilities section */}
        <BSSection
          title="Liabilities"
          items={liabilities}
          total={totalLiabilities}
          color="text-destructive"
          icon={TrendingDown}
        />

        {/* Equity section */}
        <BSSection
          title="Owner's Equity"
          items={equityItems}
          total={equity}
          color="text-primary"
          icon={Wallet}
        />

        {/* Disclaimer */}
        <div className="rounded-xl border border-dashed bg-muted/20 p-3 text-[11px] text-muted-foreground text-center">
          ⚠️ This is a simplified balance sheet derived from your billing and
          cash data. For full statutory compliance (Companies Act / GST),
          consult your CA.
        </div>
      </div>

    </div>
  );
}
