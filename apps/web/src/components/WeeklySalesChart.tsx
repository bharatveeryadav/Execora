import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useInvoices } from "@/hooks/useQueries";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildWeeklyData(invoices: { total: string | number; createdAt: string }[]) {
  // Last 7 calendar days ending today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const days: { date: number; day: string; sales: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(todayStart.getDate() - i);
    days.push({ date: d.getTime(), day: DAY_LABELS[d.getDay()], sales: 0 });
  }

  for (const inv of invoices) {
    const invDay = new Date(inv.createdAt);
    invDay.setHours(0, 0, 0, 0);
    const entry = days.find((d) => d.date === invDay.getTime());
    if (entry) entry.sales += Number(inv.total) || 0;
  }

  return days.map(({ day, sales }) => ({ day, sales }));
}

const WeeklySalesChart = () => {
  // Fetch enough invoices to cover last 7 days (200 is generous for any SME)
  const { data: invoices = [] } = useInvoices(200);
  const data = buildWeeklyData(invoices);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">📈 Weekly Sales Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(30 15% 88%)" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(20 10% 45%)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(20 10% 45%)", fontSize: 12 }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Sales"]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(30 15% 88%)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />
            <Bar dataKey="sales" fill="hsl(24 85% 52%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default WeeklySalesChart;
