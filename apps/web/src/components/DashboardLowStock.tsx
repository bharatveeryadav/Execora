import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLowStockProducts } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";

const DashboardLowStock = () => {
  const navigate = useNavigate();
  const { data: lowStock = [], isLoading } = useLowStockProducts();

  const items = lowStock.slice(0, 5);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          ⚠️ Low Stock Alerts ({isLoading ? "…" : items.length})
        </CardTitle>
        <Button variant="link" className="h-auto p-0 text-xs text-primary" onClick={() => navigate("/inventory")}>
          Order All →
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Product</th>
                <th className="px-4 py-2.5">Stock</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Category</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Price</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    ✅ All items well stocked!
                  </td>
                </tr>
              ) : (
                items.map((item, i) => {
                  const severity = item.stock === 0 ? "🔴" : item.stock <= 3 ? "🔴" : "🟡";
                  return (
                    <tr key={item.id} className="border-b last:border-none hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">📦 {item.name}</td>
                      <td className="px-4 py-3">
                        {item.stock} {item.unit} {severity}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{item.category}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {formatCurrency(parseFloat(String(item.price)))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="default" size="sm" className="h-7 text-xs" onClick={() => navigate("/inventory")}>
                          Order
                        </Button>
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

export default DashboardLowStock;
