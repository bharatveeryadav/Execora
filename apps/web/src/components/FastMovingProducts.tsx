import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTopSellingProducts } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";

const FastMovingProducts = () => {
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useTopSellingProducts(5, 30);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          🔥 Top Selling Products (This Month)
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
                <th className="px-4 py-2.5 text-right">Units Sold</th>
                <th className="hidden px-4 py-2.5 text-right md:table-cell">Stock Left</th>
                <th className="hidden px-4 py-2.5 text-right md:table-cell">Price</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No sales data yet for this month
                  </td>
                </tr>
              ) : (
                products.map((p, i) => {
                  const stockBadge = p.stock === 0
                    ? `0 ${p.unit} 🔴`
                    : p.stock <= 5
                    ? `${p.stock} ${p.unit} ⚠️`
                    : `${p.stock} ${p.unit} ✅`;
                  return (
                    <tr key={p.productId} className="border-b last:border-none hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">📦 {p.productName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {p.soldQty} {p.unit}
                      </td>
                      <td className="hidden px-4 py-3 text-right md:table-cell">{stockBadge}</td>
                      <td className="hidden px-4 py-3 text-right md:table-cell">
                        {formatCurrency(parseFloat(p.price))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant={p.stock <= 5 ? "default" : "ghost"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => navigate("/inventory")}
                        >
                          {p.stock <= 5 ? "Order" : "View"}
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
