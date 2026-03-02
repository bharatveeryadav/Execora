import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCustomers } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";

const OverduePayments = () => {
  const navigate = useNavigate();
  const { data: customers = [], isLoading } = useCustomers();

  const overdueData = customers
    .filter((c) => parseFloat(String(c.balance)) > 0)
    .sort((a, b) => parseFloat(String(b.balance)) - parseFloat(String(a.balance)))
    .slice(0, 5);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          🔴 Overdue Payments ({isLoading ? "…" : overdueData.length})
        </CardTitle>
        <Button variant="link" className="h-auto p-0 text-xs text-primary" onClick={() => navigate("/payment")}>
          View All →
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Phone</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : overdueData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    ✅ No overdue payments!
                  </td>
                </tr>
              ) : (
                overdueData.map((item, i) => (
                  <tr key={item.id} className="border-b last:border-none hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-destructive">
                      {formatCurrency(parseFloat(String(item.balance)))}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{item.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {item.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-xs"
                            asChild
                          >
                            <a href={`https://wa.me/91${item.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">📱</a>
                          </Button>
                        )}
                        {item.phone && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-xs" asChild>
                            <a href={`tel:${item.phone}`}>📞</a>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => navigate("/payment")}>💰 Record Payment</Button>
          <Button size="sm" variant="outline" className="h-8 text-xs">📱 Send Bulk Reminders</Button>
          <Button size="sm" variant="outline" className="h-8 text-xs">📞 Call All</Button>
          <Button size="sm" variant="outline" className="h-8 text-xs">📊 Export List</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OverduePayments;
