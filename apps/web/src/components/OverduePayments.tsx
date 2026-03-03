import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCustomers, useBulkReminders, useInvoices } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import EmptyState from "@/components/EmptyState";

function getAgingBadge(daysOverdue: number | null) {
  if (daysOverdue === null) return null;
  if (daysOverdue <= 0) return null;
  const color =
    daysOverdue >= 30
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : daysOverdue >= 7
      ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-400/30"
      : "bg-muted text-muted-foreground border-border";
  const icon = daysOverdue >= 30 ? "🔴" : daysOverdue >= 7 ? "🟡" : "⚪";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
      {icon} {daysOverdue}d
    </span>
  );
}

const OverduePayments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: customers = [], isLoading } = useCustomers();
  const { data: allInvoices = [] } = useInvoices(200);
  const bulkReminders = useBulkReminders();

  const overdueData = customers
    .filter((c) => parseFloat(String(c.balance)) > 0)
    .sort((a, b) => parseFloat(String(b.balance)) - parseFloat(String(a.balance)))
    .slice(0, 5);

  // Compute days overdue per customer based on their oldest unpaid invoice dueDate
  const getDaysOverdue = (customerId: string): number | null => {
    const unpaid = allInvoices.filter(
      (inv) =>
        inv.customerId === customerId &&
        inv.status !== "paid" &&
        inv.status !== "cancelled"
    );
    if (unpaid.length === 0) return null;
    const oldest = unpaid.reduce((prev, cur) => {
      const prevDate = new Date(prev.dueDate ?? prev.createdAt).getTime();
      const curDate = new Date(cur.dueDate ?? cur.createdAt).getTime();
      return curDate < prevDate ? cur : prev;
    });
    const ref = new Date(oldest.dueDate ?? oldest.createdAt).getTime();
    const days = Math.ceil((Date.now() - ref) / 86_400_000);
    return days > 0 ? days : null;
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          🔴 Overdue Payments ({isLoading ? "…" : overdueData.length})
        </CardTitle>
        <Button variant="link" className="h-auto p-0 text-xs text-primary" onClick={() => navigate("/payment")}>
          View All →
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Aging</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Phone</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : overdueData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon="✅"
                      title="All clear!"
                      description="No overdue payments right now."
                      compact
                    />
                  </td>
                </tr>
              ) : (
                overdueData.map((item, i) => (
                  <tr key={item.id} className="border-b last:border-none hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex flex-col gap-0.5">
                        {item.name}
                        <span className="md:hidden">
                          {getAgingBadge(getDaysOverdue(item.id))}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-destructive">
                      {formatCurrency(parseFloat(String(item.balance)))}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {getAgingBadge(getDaysOverdue(item.id)) ?? <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{item.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {item.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-xs"
                            asChild
                          >
                            <a href={`https://wa.me/91${item.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">📱</a>
                          </Button>
                        )}
                        {item.phone && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-xs" asChild>
                            <a href={`tel:${item.phone}`}>📞</a>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => navigate("/payment")}>💰 Record Payment</Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={bulkReminders.isPending || overdueData.length === 0}
            onClick={async () => {
              try {
                const ids = overdueData.map((c) => c.id);
                const result = await bulkReminders.mutateAsync({ customerIds: ids });
                const count = (result as { reminders?: unknown[] }).reminders?.length ?? 0;
                toast({ title: `📱 ${count} reminder${count !== 1 ? "s" : ""} scheduled` });
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Try again";
                toast({ title: "❌ Failed to send reminders", description: msg, variant: "destructive" });
              }
            }}
          >
            {bulkReminders.isPending ? "Scheduling…" : "📱 Send Bulk Reminders"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={overdueData.length === 0}
            onClick={() => {
              const header = ["#", "Customer", "Amount Due (₹)", "Phone"];
              const rows = overdueData.map((c, i) => [
                String(i + 1),
                c.name,
                String(parseFloat(String(c.balance))),
                c.phone ?? "",
              ]);
              const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "overdue-payments.csv";
              a.click();
              URL.revokeObjectURL(url);
              toast({ title: "📊 Exported overdue list as CSV" });
            }}
          >
            📊 Export List
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OverduePayments;
