import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReminders } from "@/hooks/useQueries";

function getSeverityDot(scheduledTime: string): string {
  const due = new Date(scheduledTime);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "🔴";
  if (diffDays === 0) return "🟡";
  return "🟢";
}

function formatDueLabel(scheduledTime: string): string {
  const due = new Date(scheduledTime);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Today";
  return `in ${diffDays}d`;
}

function formatCurrency(val: string | number): string {
  return `₹${Number(val).toLocaleString("en-IN")}`;
}

const DueReminders = () => {
  const { data: reminders = [], isLoading } = useReminders();
  const pending = reminders.filter((r) => r.status === "pending").slice(0, 5);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">🔔 Due Reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {!isLoading && pending.length === 0 && (
          <p className="text-sm text-muted-foreground">No pending reminders</p>
        )}
        {pending.map((r) => (
          <div key={r.id} className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">
                  {getSeverityDot(r.scheduledTime)}{" "}
                  {r.customer?.name ?? r.customerId}
                </p>
                {r.customer?.phone && (
                  <p className="text-xs text-muted-foreground">📞 {r.customer.phone}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(r.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDueLabel(r.scheduledTime)}
                </p>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs">
                Remind
              </Button>
              <Button size="sm" variant="default" className="h-7 text-xs">
                Payment
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DueReminders;
