import { useState } from 'react';
import { AlertTriangle, Bell, BellOff, CheckCheck, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { monitoringApi, type MonitoringEventItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const fmt = (n: unknown) =>
  n ? `₹${parseFloat(String(n)).toLocaleString('en-IN')}` : '';

function severityColor(s: string) {
  if (s === 'alert')   return 'bg-red-50 border-red-300 text-red-800';
  if (s === 'warning') return 'bg-amber-50 border-amber-300 text-amber-800';
  return 'bg-blue-50 border-blue-300 text-blue-800';
}

function severityDot(s: string) {
  if (s === 'alert')   return 'bg-red-500';
  if (s === 'warning') return 'bg-amber-500';
  return 'bg-blue-400';
}

interface Props {
  onAlertClick?: (event: MonitoringEventItem) => void;
}

export function AlertPanel({ onAlertClick }: Props) {
  const [expanded, setExpanded] = useState(true);
  const qc = useQueryClient();

  const { data: unread } = useQuery({
    queryKey: ['monitoring', 'unread'],
    queryFn: () => monitoringApi.unreadCount(),
    refetchInterval: 30_000,
  });

  const { data } = useQuery({
    queryKey: ['monitoring', 'events', 'alerts'],
    queryFn: () => monitoringApi.listEvents({ severity: 'alert', limit: 10 }),
    refetchInterval: 15_000,
  });

  const { data: warnings } = useQuery({
    queryKey: ['monitoring', 'events', 'warnings'],
    queryFn: () => monitoringApi.listEvents({ severity: 'warning', limit: 10 }),
    refetchInterval: 15_000,
  });

  const readAllMut = useMutation({
    mutationFn: () => monitoringApi.readAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitoring'] });
    },
  });

  const alerts = [...(data?.events ?? []), ...(warnings?.events ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const count = unread?.count ?? 0;

  if (alerts.length === 0 && count === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border rounded-lg bg-green-50 border-green-200">
        <BellOff className="h-4 w-4 text-green-500" />
        <span className="text-green-700">No active alerts</span>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-red-50 border-b border-red-200 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm font-semibold text-red-700">Alerts</span>
          {count > 0 && (
            <Badge className="bg-red-600 text-white text-xs px-1.5 py-0">{count}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-red-700 hover:bg-red-100 px-2"
              onClick={(e) => { e.stopPropagation(); readAllMut.mutate(); }}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
          <span className="text-xs text-red-500">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Alert rows */}
      {expanded && (
        <div className="divide-y max-h-64 overflow-y-auto">
          {alerts.slice(0, 8).map((evt) => (
            <div
              key={evt.id}
              className={cn(
                'flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:brightness-95 transition-all',
                severityColor(evt.severity),
                !evt.isRead && 'font-medium',
              )}
              onClick={() => onAlertClick?.(evt)}
            >
              <div className={cn('mt-1.5 h-2 w-2 rounded-full flex-shrink-0', severityDot(evt.severity))} />
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-snug truncate">{evt.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {evt.amount && (
                    <span className="text-xs opacity-75">{fmt(evt.amount)}</span>
                  )}
                  <span className="text-xs opacity-60">
                    {new Date(evt.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
