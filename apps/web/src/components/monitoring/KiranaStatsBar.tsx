/**
 * KiranaStatsBar — 6 KPI cards tailored for kirana store owners.
 * Bills · Cash Expected · Avg Bill · Footfall · Conversion · Alerts
 */
import { IndianRupee, ShoppingBag, TrendingUp, Users, AlertTriangle, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';

const today = () => new Date().toISOString().slice(0, 10);

function fmt(n: number) {
  return n.toLocaleString('en-IN');
}

function fmtRupee(n: number) {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  bg: string;
}

function KpiCard({ icon, label, value, sub, color, bg }: KpiCardProps) {
  return (
    <Card className="border shadow-none">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg} shrink-0`}>
          <div className={`h-4 w-4 ${color}`}>{icon}</div>
        </div>
        <div className="min-w-0">
          <p className={`text-xl font-bold leading-tight ${color}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/70 truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function KiranaStatsBar() {
  const { data } = useQuery({
    queryKey: ['monitoring', 'stats', today(), undefined],
    queryFn: () => monitoringApi.stats(`${today()}T00:00:00.000Z`),
    refetchInterval: 30_000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['monitoring', 'unread'],
    queryFn: () => monitoringApi.unreadCount(),
    refetchInterval: 20_000,
  });

  const byType   = data?.byType ?? {};
  const bills    = byType['bill.created'] ?? 0;
  const cancels  = byType['bill.cancelled'] ?? 0;
  const cashExp  = data?.totalBillAmount ?? 0;
  const avgBill  = data?.avgBillAmount ?? 0;
  const footfall = data?.footfall ?? 0;
  const conv     = data?.conversionRate;
  const peakH    = data?.peakHour;
  const alerts   = unreadData?.count ?? 0;

  const peakLabel = peakH !== null && peakH !== undefined
    ? `Peak: ${peakH % 12 || 12}${peakH < 12 ? 'am' : 'pm'}`
    : undefined;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard
        icon={<ShoppingBag className="h-4 w-4" />}
        label="Bills Today"
        value={fmt(bills)}
        sub={cancels > 0 ? `${cancels} cancelled` : undefined}
        color="text-blue-600"
        bg="bg-blue-50"
      />
      <KpiCard
        icon={<IndianRupee className="h-4 w-4" />}
        label="Cash Expected"
        value={fmtRupee(cashExp)}
        color="text-green-600"
        bg="bg-green-50"
      />
      <KpiCard
        icon={<TrendingUp className="h-4 w-4" />}
        label="Avg Bill"
        value={avgBill > 0 ? fmtRupee(avgBill) : '—'}
        sub={peakLabel}
        color="text-violet-600"
        bg="bg-violet-50"
      />
      <KpiCard
        icon={<Users className="h-4 w-4" />}
        label="Footfall"
        value={footfall > 0 ? fmt(footfall) : '—'}
        sub="via face detection"
        color="text-orange-600"
        bg="bg-orange-50"
      />
      <KpiCard
        icon={<BarChart3 className="h-4 w-4" />}
        label="Conversion"
        value={conv !== null && conv !== undefined ? `${conv}%` : '—'}
        sub={footfall > 0 ? `${bills}/${footfall} visitors billed` : 'Start camera to track'}
        color="text-teal-600"
        bg="bg-teal-50"
      />
      <KpiCard
        icon={<AlertTriangle className="h-4 w-4" />}
        label="Unread Alerts"
        value={fmt(alerts)}
        color={alerts > 0 ? 'text-red-600' : 'text-muted-foreground'}
        bg={alerts > 0 ? 'bg-red-50' : 'bg-muted/20'}
      />
    </div>
  );
}
