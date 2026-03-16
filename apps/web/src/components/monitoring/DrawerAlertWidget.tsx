/**
 * DrawerAlertWidget — Cash drawer monitoring.
 *
 * Owner or cashier presses "Cash Drawer Opened" when the physical drawer
 * is opened. The API checks if a bill was created in the last 60 seconds.
 * If not → severity 'warning' (possible no-ring theft).
 *
 * Also shows the last 5 drawer-open events today.
 */
import { useState } from 'react';
import { Archive, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const today = () => new Date().toISOString().slice(0, 10);

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function DrawerAlertWidget() {
  const qc = useQueryClient();
  const [lastFired, setLastFired] = useState<'ok' | 'warn' | null>(null);

  const { data } = useQuery({
    queryKey: ['monitoring', 'events', 'drawer', today()],
    queryFn: () => monitoringApi.listEvents({
      eventType: 'cash.drawer.opened',
      from: `${today()}T00:00:00.000Z`,
      limit: 5,
    }),
    refetchInterval: 15_000,
  });

  const { data: recentBills } = useQuery({
    queryKey: ['monitoring', 'events', 'recent-bills'],
    queryFn: () => monitoringApi.listEvents({
      eventType: 'bill.created',
      limit: 1,
    }),
    staleTime: 10_000,
  });

  const openMut = useMutation({
    mutationFn: () => {
      // Check if a bill was created in the last 60 seconds
      const lastBill = recentBills?.events?.[0];
      const billAge  = lastBill
        ? (Date.now() - new Date(lastBill.createdAt).getTime()) / 1000
        : Infinity;
      const noSale   = billAge > 60;
      setLastFired(noSale ? 'warn' : 'ok');
      return monitoringApi.postEvent({
        eventType:   'cash.drawer.opened',
        entityType:  'counter',
        entityId:    'pos',
        description: noSale
          ? 'Cash drawer opened — no bill in last 60 seconds (possible no-ring)'
          : `Cash drawer opened after bill (${Math.round(billAge)}s ago)`,
        severity: noSale ? 'warning' : 'info',
        meta: { billAgeSeconds: Math.round(billAge), noSale },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitoring', 'events', 'drawer'] });
      qc.invalidateQueries({ queryKey: ['monitoring'] });
      setTimeout(() => setLastFired(null), 5000);
    },
  });

  const drawerEvents = data?.events ?? [];

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Archive className="h-3.5 w-3.5 text-amber-600" />
          Cash Drawer Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Log button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 h-9"
          onClick={() => openMut.mutate()}
          disabled={openMut.isPending}
        >
          <Archive className="h-3.5 w-3.5 mr-1.5" />
          {openMut.isPending ? 'Logging…' : 'Log Cash Drawer Opened'}
        </Button>

        {/* Immediate feedback */}
        {lastFired === 'warn' && (
          <div className="flex items-center gap-2 text-xs bg-red-50 text-red-700 px-2 py-1.5 rounded-md">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            No recent bill! Possible no-ring — owner alerted.
          </div>
        )}
        {lastFired === 'ok' && (
          <div className="flex items-center gap-2 text-xs bg-green-50 text-green-700 px-2 py-1.5 rounded-md">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            Drawer open logged — matches recent bill.
          </div>
        )}

        {/* Recent drawer events */}
        {drawerEvents.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Today's drawer opens</p>
            {drawerEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{timeAgo(e.createdAt)}</span>
                </div>
                <Badge
                  variant={e.severity === 'warning' || e.severity === 'alert' ? 'destructive' : 'secondary'}
                  className="text-[10px] px-1.5 py-0"
                >
                  {e.severity === 'warning' ? 'No-sale!' : 'OK'}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {drawerEvents.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">No drawer events logged today</p>
        )}
      </CardContent>
    </Card>
  );
}
