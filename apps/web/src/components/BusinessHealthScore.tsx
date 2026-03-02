import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useDailySummary, useCustomers, useLowStockProducts } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";

const BusinessHealthScore = () => {
  const navigate = useNavigate();
  const { data: summary } = useDailySummary();
  const { data: customers = [] } = useCustomers();
  const { data: lowStock = [] } = useLowStockProducts();

  const overdueCustomers = customers.filter((c) => parseFloat(String(c.balance)) > 0);
  const totalOverdue = overdueCustomers.reduce((s, c) => s + parseFloat(String(c.balance)), 0);

  const collectionRate = summary && summary.totalSales > 0
    ? Math.round((summary.totalPayments / summary.totalSales) * 100) : 0;

  // compute score: 0-100 based on collection rate + stock health + overdue ratio
  const stockHealth = lowStock.length === 0 ? 100 : Math.max(0, 100 - lowStock.length * 15);
  const collectionScore = Math.min(100, collectionRate);
  const overdueScore = overdueCustomers.length === 0 ? 100 : Math.max(0, 100 - overdueCustomers.length * 10);
  const score = Math.round((stockHealth + collectionScore + overdueScore) / 3);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          📊 Business Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Overall: <span className="text-lg font-bold">{score}/100</span>
            </span>
            <span className={`text-xs font-medium ${score >= 70 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive"}`}>
              {score >= 70 ? "✅ Good" : score >= 50 ? "⚠️ Needs Work" : "🔴 Critical"}
            </span>
          </div>
          <div className="h-4 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">{score}% Good</span>
            <span className="text-xs text-muted-foreground">{100 - score}% Needs Attention</span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            ⚠️ Critical Alerts
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border bg-destructive/5 p-3">
              <div>
                <span className="text-sm font-medium">🔴 Overdue Payments</span>
                <p className="text-xs text-muted-foreground">
                  {overdueCustomers.length} customers · {formatCurrency(totalOverdue)} outstanding
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/payment")}>View</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-warning/5 p-3">
              <div>
                <span className="text-sm font-medium">🟡 Low Stock Alert</span>
                <p className="text-xs text-muted-foreground">
                  {lowStock.length > 0
                    ? `${lowStock.length} items below minimum · ${lowStock.slice(0, 3).map((p) => p.name).join(", ")}`
                    : "All items well stocked"}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/inventory")}>View</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-success/5 p-3">
              <div>
                <span className="text-sm font-medium">🟢 Today's Sales</span>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(summary?.totalSales ?? 0)} · {summary?.invoiceCount ?? 0} invoices
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/reports")}>View</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessHealthScore;
