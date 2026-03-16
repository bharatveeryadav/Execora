/**
 * HourlyBillsChart — CSS bar chart showing bills per hour (0–23).
 * No recharts dependency — pure Tailwind bars.
 */
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const today = () => new Date().toISOString().slice(0, 10);

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function label(h: number) {
  if (h === 0)  return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

export function HourlyBillsChart() {
  const { data } = useQuery({
    queryKey: ['monitoring', 'stats', today(), undefined],
    queryFn: () => monitoringApi.stats(`${today()}T00:00:00.000Z`),
    refetchInterval: 60_000,
  });

  const hourly = data?.hourlyBills ?? {};
  const peakH  = data?.peakHour;
  const max    = Math.max(...HOURS.map((h) => hourly[h] ?? 0), 1);
  const currentHour = new Date().getHours();

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Bills by Hour</span>
          {peakH !== null && peakH !== undefined && (
            <span className="text-xs font-normal text-muted-foreground">
              Peak: {peakH % 12 || 12}{peakH < 12 ? 'am' : 'pm'}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex items-end gap-[2px] h-16">
          {HOURS.map((h) => {
            const count = hourly[h] ?? 0;
            const pct   = count > 0 ? Math.max((count / max) * 100, 8) : 0;
            const isPeak  = h === peakH;
            const isCurrent = h === currentHour;
            return (
              <div
                key={h}
                className="flex-1 flex flex-col items-center justify-end gap-[1px] group relative"
                title={`${label(h)}: ${count} bills`}
              >
                <div
                  className={`w-full rounded-t-[2px] transition-all ${
                    isPeak
                      ? 'bg-blue-600'
                      : isCurrent
                      ? 'bg-blue-400'
                      : count > 0
                      ? 'bg-blue-300'
                      : 'bg-muted/30'
                  }`}
                  style={{ height: count > 0 ? `${pct}%` : '4px' }}
                />
                {/* tooltip on hover */}
                {count > 0 && (
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                    {label(h)}: {count}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* X-axis labels — show every 3 hours */}
        <div className="flex items-center mt-1">
          {HOURS.map((h) => (
            <div key={h} className="flex-1 text-center">
              {h % 6 === 0 && (
                <span className="text-[9px] text-muted-foreground">{label(h)}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
