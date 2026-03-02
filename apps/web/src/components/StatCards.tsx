import { TrendingUp, Calendar, Package, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  {
    title: "TODAY'S SALES",
    icon: TrendingUp,
    value: "₹8,450",
    subtitle: "↑12% vs yesterday",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    title: "PENDING DUES",
    icon: Calendar,
    value: "₹1,24,560",
    subtitle: "28 customers",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
  {
    title: "LOW STOCK",
    icon: Package,
    value: "5 items",
    subtitle: "⚠️ 3 critical · 🔴 2 urgent",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  {
    title: "CUSTOMERS",
    icon: Users,
    value: "128",
    subtitle: "+8 this month",
    iconBg: "bg-secondary/10",
    iconColor: "text-secondary",
  },
];

const StatCards = () => {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-none shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.title}
              </p>
              <div className={`rounded-lg p-1.5 ${stat.iconBg}`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatCards;
