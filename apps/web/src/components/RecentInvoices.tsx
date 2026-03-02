import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useInvoices } from "@/hooks/useQueries";

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCurrency(val: string | number): string {
  return `₹${Number(val).toLocaleString("en-IN")}`;
}

const RecentInvoices = () => {
  const { data: invoices = [], isLoading } = useInvoices(10);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          📋 Recent Invoices
        </CardTitle>
        <Button variant="link" className="h-auto p-0 text-xs text-primary">
          View All →
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5">Time</th>
                <th className="px-4 py-2.5">Invoice #</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Items</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground text-xs">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground text-xs">
                    No invoices yet
                  </td>
                </tr>
              )}
              {invoices.map((inv) => {
                const isPaid = inv.status === "paid";
                const isPartial = inv.status === "partial";
                const isCancelled = inv.status === "cancelled";
                const itemCount = inv.items?.length ?? 0;
                return (
                  <tr
                    key={inv.id}
                    className="border-b last:border-none hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatTime(inv.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium">{inv.invoiceNo}</td>
                    <td className="px-4 py-3">{inv.customer?.name ?? "—"}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {itemCount} item{itemCount !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge
                        variant={isCancelled ? "destructive" : isPaid ? "default" : "secondary"}
                        className={
                          isPaid
                            ? "bg-success text-success-foreground"
                            : isCancelled
                            ? ""
                            : isPartial
                            ? "bg-blue-500/15 text-blue-600 border-blue-500/30"
                            : "bg-warning/15 text-warning border-warning/30"
                        }
                      >
                        {isPaid ? "✅ Paid" : isCancelled ? "❌ Cancelled" : isPartial ? "🔵 Partial" : "⏳ Pending"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentInvoices;
