import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  useCustomers,
  useBulkReminders,
  useInvoices,
} from "@/hooks/useQueries";
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
        ? "bg-warning/15 text-warning border-warning/30"
        : "bg-muted text-muted-foreground border-border";
  const icon = daysOverdue >= 30 ? "🔴" : daysOverdue >= 7 ? "🟡" : "⚪";
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${color}`}
    >
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
    .sort(
      (a, b) => parseFloat(String(b.balance)) - parseFloat(String(a.balance)),
    )
    .slice(0, 4);

  // Compute days overdue per customer based on their oldest unpaid invoice dueDate
  const getDaysOverdue = (customerId: string): number | null => {
    const unpaid = allInvoices.filter(
      (inv) =>
        inv.customerId === customerId &&
        inv.status !== "paid" &&
        inv.status !== "cancelled",
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
        <Button
          variant="link"
          className="h-auto p-0 text-xs text-primary"
          onClick={() => navigate("/overdue")}
        >
          View All →
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : overdueData.length === 0 ? (
            <EmptyState
              icon="✅"
              title="All clear!"
              description="No overdue payments right now."
              compact
            />
          ) : (
            overdueData.map((item) => {
              const days = getDaysOverdue(item.id);
              return (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {getAgingBadge(days) ?? (
                        <span className="text-[10px] text-muted-foreground">
                          —
                        </span>
                      )}
                      {item.phone && (
                        <span className="text-[10px] text-muted-foreground">
                          {item.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-destructive">
                    {formatCurrency(parseFloat(String(item.balance)))}
                  </span>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {item.phone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-xs"
                        asChild
                      >
                        <a
                          href={`https://wa.me/91${item.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          📱
                        </a>
                      </Button>
                    )}
                    {item.phone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-xs"
                        asChild
                      >
                        <a href={`tel:${item.phone}`}>📞</a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="flex flex-col gap-2 p-4">
          <Button
            size="sm"
            variant="default"
            className="h-9 w-full text-sm"
            onClick={() => navigate("/payment")}
          >
            💰 Record Payment
          </Button>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-1 text-xs"
              disabled={bulkReminders.isPending || overdueData.length === 0}
              onClick={async () => {
                try {
                  const ids = overdueData.map((c) => c.id);
                  const result = await bulkReminders.mutateAsync({
                    customerIds: ids,
                  });
                  const count =
                    (result as { reminders?: unknown[] }).reminders?.length ??
                    0;
                  toast({
                    title: `📱 ${count} reminder${count !== 1 ? "s" : ""} scheduled`,
                  });
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : "Try again";
                  toast({
                    title: "❌ Failed to send reminders",
                    description: msg,
                    variant: "destructive",
                  });
                }
              }}
            >
              {bulkReminders.isPending
                ? "Scheduling…"
                : "📱 Send Bulk Reminders"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-1 text-xs"
              disabled={overdueData.length === 0}
              onClick={() => {
                const header = ["#", "Customer", "Amount Due (₹)", "Phone"];
                const rows = overdueData.map((c, i) => [
                  String(i + 1),
                  c.name,
                  String(parseFloat(String(c.balance))),
                  c.phone ?? "",
                ]);
                const csv = [header, ...rows]
                  .map((r) => r.map((v) => `"${v}"`).join(","))
                  .join("\n");
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
        </div>
      </CardContent>
    </Card>
  );
};

export default OverduePayments;
