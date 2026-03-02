import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDailySummary, useProducts } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";

const QuickInsights = () => {
  const { data: summary } = useDailySummary();
  const { data: products = [] } = useProducts();

  const total = summary?.totalPayments ?? 0;
  const cash = summary?.cashPayments ?? 0;
  const upi = summary?.upiPayments ?? 0;
  const other = Math.max(0, total - cash - upi);

  const cashPct = total > 0 ? Math.round((cash / total) * 100) : 0;
  const upiPct = total > 0 ? Math.round((upi / total) * 100) : 0;
  const otherPct = total > 0 ? Math.round((other / total) * 100) : 0;

  const paymentMethods = [
    { label: "Cash", percent: cashPct, value: formatCurrency(cash) },
    { label: "UPI", percent: upiPct, value: formatCurrency(upi) },
    { label: "Card / Other", percent: otherPct, value: formatCurrency(other) },
  ];

  // Group stock value by category
  const categoryMap = new Map<string, number>();
  for (const p of products) {
    const cat = p.category || "Others";
    const val = parseFloat(String(p.price)) * p.stock;
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + val);
  }
  const totalStock = [...categoryMap.values()].reduce((s, v) => s + v, 0);
  const stockCategories = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, value]) => ({
      label,
      value: formatCurrency(value),
      percent: totalStock > 0 ? Math.round((value / totalStock) * 100) : 0,
    }));

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        📊 Quick Insights
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">💳 Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {paymentMethods.map((m) => (
              <div key={m.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{m.label}</span>
                  <span className="font-medium">{m.value} ({m.percent}%)</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${m.percent}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">📦 Stock Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {stockCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock data</p>
            ) : stockCategories.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{s.label}</span>
                  <span className="font-medium">{s.value}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-secondary" style={{ width: `${s.percent}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuickInsights;
