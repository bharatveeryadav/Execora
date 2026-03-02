import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const invoices = [
  { time: "10:45AM", id: "INV-234", customer: "Ramesh Sharma", items: "2kg Rice, 1L Oil", amount: "₹340", status: "Pending" },
  { time: "10:15AM", id: "INV-233", customer: "Priya Gupta", items: "5kg Atta, 1kg Sugar", amount: "₹450", status: "Paid" },
  { time: "09:30AM", id: "INV-232", customer: "Walk-in", items: "1 Packet Biscuit", amount: "₹50", status: "Paid" },
  { time: "09:15AM", id: "INV-231", customer: "Suresh Patel", items: "3L Milk, 2 Bread", amount: "₹240", status: "Pending" },
  { time: "08:45AM", id: "INV-230", customer: "Amit Singh", items: "1L Oil, 2kg Rice", amount: "₹280", status: "Pending" },
];

const RecentInvoices = () => {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          📋 Recent Invoices
        </CardTitle>
        <Button variant="link" className="h-auto p-0 text-xs text-primary">
          View All →
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5">Time</th>
                <th className="px-4 py-2.5">Invoice #</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Items</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b last:border-none hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{inv.time}</td>
                  <td className="px-4 py-3 font-medium">{inv.id}</td>
                  <td className="px-4 py-3">{inv.customer}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{inv.items}</td>
                  <td className="px-4 py-3 text-right font-semibold">{inv.amount}</td>
                  <td className="px-4 py-3 text-right">
                    <Badge
                      variant={inv.status === "Paid" ? "default" : "secondary"}
                      className={
                        inv.status === "Paid"
                          ? "bg-success text-success-foreground"
                          : "bg-warning/15 text-warning border-warning/30"
                      }
                    >
                      {inv.status === "Paid" ? "✅ Paid" : "⏳ Pending"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentInvoices;
