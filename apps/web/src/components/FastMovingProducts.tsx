import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useProducts, useLowStockProducts } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";

const FastMovingProducts = () => {
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useProducts();
  const { data: lowStock = [] } = useLowStockProducts();

  const lowStockIds = new Set(lowStock.map((p) => p.id));

  // Show active products sorted by lowest stock (most activity) — top 5
  const topProducts = [...products]
    .filter((p) => p.isActive)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          🔥 Fast Moving Products (Top 5)
        </CardTitle>
        <Button variant="link" className="h-auto p-0 text-xs text-primary" onClick={() => navigate("/inventory")}>
          View All →
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Product</th>
                <th className="px-4 py-2.5 text-right">Stock</th>
                <th className="hidden px-4 py-2.5 text-right md:table-cell">Price</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Reorder?</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : topProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No products found</td>
                </tr>
              ) : (
                topProducts.map((p, i) => {
                  const needsReorder = lowStockIds.has(p.id) || p.stock === 0;
                  const stockStatus = p.stock === 0
                    ? `0 ${p.unit} 🔴`
                    : p.stock <= 5
                    ? `${p.stock} ${p.unit} ⚠️`
                    : `${p.stock} ${p.unit} ✅`;
                  return (
                    <tr key={p.id} className="border-b last:border-none hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">📦 {p.name}</td>
                      <td className="px-4 py-3 text-right">{p.stock} {p.unit}</td>
                      <td className="hidden px-4 py-3 text-right md:table-cell">
                        {formatCurrency(parseFloat(String(p.price)))}
                      </td>
                      <td className="px-4 py-3">{stockStatus}</td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {needsReorder ? (
                          <span className="text-xs font-medium text-destructive">YES - URGENT</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant={needsReorder ? "default" : "ghost"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => navigate("/inventory")}
                        >
                          {needsReorder ? "Order" : "View"}
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

export default FastMovingProducts;
