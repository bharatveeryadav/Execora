import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInvoices } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";
import EmptyState from "@/components/EmptyState";
import { useNavigate } from "react-router-dom";

function useSecondsAgo(refetchedAt: number) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setSecs(Math.round((Date.now() - refetchedAt) / 1000)),
      1000,
    );
    return () => clearInterval(t);
  }, [refetchedAt]);
  return secs;
}

const RecentActivity = () => {
  const navigate = useNavigate();
  const {
    data: invoices = [],
    isLoading,
    dataUpdatedAt,
    refetch,
  } = useInvoices(20);
  const secsAgo = useSecondsAgo(dataUpdatedAt);

  const activities = invoices.slice(0, 5).map((inv) => ({
    time: new Date(inv.createdAt).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    type: "🧾 Bill",
    customer: inv.customer?.name ?? "—",
    amount: formatCurrency(parseFloat(String(inv.total ?? inv.subtotal))),
    status:
      inv.status === "paid"
        ? "paid"
        : inv.status === "cancelled"
          ? "cancelled"
          : "pending",
    details: `${inv.invoiceNo} · ${inv.status}`,
    id: inv.id,
  }));

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            📋 Recent Activity
            {/* LIVE indicator */}
            <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              LIVE
            </span>
          </CardTitle>
          <button
            onClick={() => void refetch()}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            🔄 {secsAgo < 5 ? "just now" : `${secsAgo}s ago`}
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Customer/Item</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="hidden px-3 py-2 md:table-cell">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    Loading…
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon="📋"
                      title="No activity yet"
                      description="Create your first invoice to see activity here."
                      action={{
                        label: "New Invoice",
                        onClick: () => navigate("/"),
                      }}
                      compact
                    />
                  </td>
                </tr>
              ) : (
                activities.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b last:border-none hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.time}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-normal"
                      >
                        {a.type}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-medium">{a.customer}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {a.amount}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          a.status === "paid"
                            ? "bg-success/10 text-success"
                            : a.status === "cancelled"
                              ? "bg-muted text-muted-foreground"
                              : "bg-warning/10 text-warning"
                        }`}
                      >
                        {a.status === "paid"
                          ? "✅ Paid"
                          : a.status === "cancelled"
                            ? "❌ Void"
                            : "⏳ Due"}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">
                      {a.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
