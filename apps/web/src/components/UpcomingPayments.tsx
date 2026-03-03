import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useReminders } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";

const UpcomingPayments = () => {
  const navigate = useNavigate();
  const { data: reminders = [], isLoading } = useReminders();

  const upcoming = reminders
    .filter((r) => r.status === "pending")
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
    .slice(0, 4);

  const getDaysLeft = (scheduledTime: string) => {
    const diff = new Date(scheduledTime).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getDaysBadge = (days: number) => {
    const color =
      days <= 3
        ? "bg-destructive/15 text-destructive border-destructive/30"
        : days <= 5
        ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-400/30"
        : "bg-green-500/15 text-green-700 dark:text-green-400 border-green-400/30";
    const icon = days <= 3 ? "🔴" : days <= 5 ? "🟡" : "🟢";
    return (
      <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
        {icon} {days}d
      </span>
    );
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          🟡 Upcoming ({isLoading ? "…" : upcoming.length})
        </CardTitle>
        <Button variant="link" className="h-auto p-0 text-xs text-primary" onClick={() => navigate("/payment")}>
          View All →
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : upcoming.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              ✅ No upcoming payments scheduled
            </div>
          ) : (
            upcoming.map((item) => {
              const days = getDaysLeft(item.scheduledTime);
              return (
                <div key={item.id} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.customer?.name ?? "—"}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {getDaysBadge(days)}
                      {item.customer?.phone && (
                        <span className="text-[10px] text-muted-foreground">{item.customer.phone}</span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">
                    {formatCurrency(parseFloat(String(item.amount)))}
                  </span>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {item.customer?.phone && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-xs" asChild>
                        <a href={`https://wa.me/91${item.customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">📱</a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingPayments;
