import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReminders } from "@/hooks/useQueries";
import { formatCurrency, formatDate } from "@/lib/api";

const UpcomingPayments = () => {
  const { data: reminders = [], isLoading } = useReminders();

  const upcoming = reminders
    .filter((r) => r.status === "pending")
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
    .slice(0, 5);

  const getDaysLeft = (scheduledTime: string) => {
    const diff = new Date(scheduledTime).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getSeverity = (days: number) => days <= 3 ? "🔴" : days <= 5 ? "🟡" : "🟢";

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          🟡 Upcoming Payments (Due This Week)
        </CardTitle>
        <Button variant="link" className="h-auto p-0 text-xs text-primary">View All →</Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Due Date</th>
                <th className="px-4 py-2.5">Days Left</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Phone</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : upcoming.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    ✅ No upcoming payments scheduled
                  </td>
                </tr>
              ) : (
                upcoming.map((item, i) => {
                  const days = getDaysLeft(item.scheduledTime);
                  const sev = getSeverity(days);
                  return (
                    <tr key={item.id} className="border-b last:border-none hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{item.customer?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(parseFloat(String(item.amount)))}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {formatDate(item.scheduledTime)}
                      </td>
                      <td className="px-4 py-3">{days} {sev}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {item.customer?.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.customer?.phone ? (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-xs" asChild>
                            <a href={`https://wa.me/91${item.customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">📱</a>
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-xs">📱</Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingPayments;
