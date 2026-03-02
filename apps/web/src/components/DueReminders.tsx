import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const reminders = [
  { name: "Ramesh Sharma", amount: "₹3,450", days: 45, phone: "98765 4321", severity: "destructive" as const },
  { name: "Priya Gupta", amount: "₹2,800", days: 30, phone: "98765 4322", severity: "warning" as const },
  { name: "Suresh Patel", amount: "₹1,200", days: 15, phone: "98765 4323", severity: "success" as const },
];

const severityDot: Record<string, string> = {
  destructive: "🔴",
  warning: "🟡",
  success: "🟢",
};

const DueReminders = () => {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">🔔 Due Reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {reminders.map((r) => (
          <div key={r.name} className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">
                  {severityDot[r.severity]} {r.name}
                </p>
                <p className="text-xs text-muted-foreground">📞 {r.phone}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{r.amount}</p>
                <p className="text-xs text-muted-foreground">{r.days} days</p>
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
