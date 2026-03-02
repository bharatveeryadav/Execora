import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const alerts = [
  { name: "Rice (Basmati)", left: "2kg", min: "10kg" },
  { name: "Mustard Oil", left: "3L", min: "5L" },
  { name: "Sugar", left: "5kg", min: "10kg" },
];

const LowStockAlerts = () => {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">⚠️ Low Stock Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {alerts.map((item) => (
          <div key={item.name} className="rounded-lg border bg-muted/30 p-3">
            <p className="font-medium">🟡 {item.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.left} left (Min: {item.min})
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="default" className="h-7 text-xs">
                🛒 Order Now
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                ⏰ Later
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default LowStockAlerts;
