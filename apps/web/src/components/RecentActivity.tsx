import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInvoices } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";

const RecentActivity = () => {
  const { data: invoices = [], isLoading } = useInvoices(20);

  const activities = invoices.slice(0, 8).map((inv) => ({
    time: new Date(inv.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
    type: "🧾 Bill",
    customer: inv.customer?.name ?? "—",
    amount: formatCurrency(parseFloat(String(inv.total ?? inv.subtotal))),
    status: inv.status === "paid" ? "✅" : inv.status === "cancelled" ? "❌" : "⏳",
    details: `${inv.invoiceNo} · ${inv.status}`,
  }));

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          📋 Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5">Time</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Customer/Item</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No recent activity</td>
                </tr>
              ) : (
                activities.map((a, i) => (
                  <tr key={i} className="border-b last:border-none hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{a.time}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs font-normal">{a.type}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{a.customer}</td>
                    <td className="px-4 py-3 text-right font-semibold">{a.amount}</td>
                    <td className="px-4 py-3">{a.status}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{a.details}</td>
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
