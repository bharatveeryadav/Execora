import { useQuery } from '@tanstack/react-query';
import { monitoringApi, type MonitoringEventItem } from '@/lib/api';
import { cn } from '@/lib/utils';

const EVENT_ICONS: Record<string, string> = {
  'bill.created':       '🧾',
  'bill.cancelled':     '❌',
  'payment.recorded':   '💰',
  'discount.applied':   '🏷️',
  'credit_note.issued': '📋',
  'user.login':         '🔑',
  'cash_drawer.open':   '🗄️',
  'product.stock_updated': '📦',
  'motion.detected':    '🚨',
};

function eventIcon(type: string) {
  return EVENT_ICONS[type] ?? '📌';
}

function severityBg(s: string) {
  if (s === 'alert')   return 'border-l-4 border-red-400 bg-red-50/50';
  if (s === 'warning') return 'border-l-4 border-amber-400 bg-amber-50/50';
  return '';
}

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

interface Props {
  filters?: {
    eventType?: string;
    severity?: string;
    userId?: string;
    from?: string;
    to?: string;
  };
  limit?: number;
  onEventClick?: (e: MonitoringEventItem) => void;
}

export function EventFeed({ filters, limit = 30, onEventClick }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['monitoring', 'events', 'feed', filters],
    queryFn: () => monitoringApi.listEvents({ limit, ...filters }),
    refetchInterval: 10_000,
  });

  const events = data?.events ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        No events yet. Activity will appear here in real-time.
      </div>
    );
  }

  return (
    <div className="divide-y max-h-[420px] overflow-y-auto">
      {events.map((evt) => (
        <div
          key={evt.id}
          className={cn(
            'flex items-start gap-3 px-3 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors',
            severityBg(evt.severity),
            !evt.isRead && 'bg-blue-50/30',
          )}
          onClick={() => onEventClick?.(evt)}
        >
          <span className="text-base flex-shrink-0 mt-0.5">{eventIcon(evt.eventType)}</span>
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm leading-snug', !evt.isRead && 'font-medium')}>
              {evt.description}
            </p>
            {evt.user && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {evt.user.name}
              </p>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">{fmtTime(evt.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}
