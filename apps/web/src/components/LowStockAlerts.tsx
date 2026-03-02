import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLowStockProducts } from "@/hooks/useQueries";

const LowStockAlerts = () => {
  const { data: products = [], isLoading } = useLowStockProducts();

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">⚠️ Low Stock Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {!isLoading && products.length === 0 && (
          <p className="text-sm text-muted-foreground">All products well stocked ✅</p>
        )}
        {products.slice(0, 5).map((item) => (
          <div key={item.id} className="rounded-lg border bg-muted/30 p-3">
            <p className="font-medium">🟡 {item.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.stock} {item.unit} left
              {item.category ? ` · ${item.category}` : ""}
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
