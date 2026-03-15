import { useState } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monitoringApi, type MonitoringEventItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Filters } from './ActivityFilters';

const PAGE_SIZE = 20;

const severityBadge: Record<string, string> = {
  alert:   'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  info:    'bg-blue-100 text-blue-800 border-blue-300',
};

const eventTypeLabel: Record<string, string> = {
  'bill.created':          'Bill Created',
  'bill.cancelled':        'Bill Cancelled',
  'payment.recorded':      'Payment',
  'discount.applied':      'Discount',
  'credit_note.issued':    'Credit Note',
  'user.login':            'Login',
  'cash_drawer.open':      'Cash Drawer',
  'product.stock_updated': 'Stock Updated',
  'motion.detected':       'Motion',
};

function downloadCsv(events: MonitoringEventItem[]) {
  const header = ['Time', 'Event', 'Description', 'Employee', 'Amount', 'Severity'].join(',');
  const rows = events.map((e) => [
    new Date(e.createdAt).toLocaleString('en-IN'),
    eventTypeLabel[e.eventType] ?? e.eventType,
    `"${e.description.replace(/"/g, '""')}"`,
    e.user?.name ?? '',
    e.amount ? parseFloat(String(e.amount)).toFixed(2) : '',
    e.severity,
  ].join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  filters: Filters;
  onEventClick?: (e: MonitoringEventItem) => void;
}

export function ActivityTable({ filters, onEventClick }: Props) {
  const [page, setPage] = useState(0);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['monitoring', 'events', 'table', filters, page],
    queryFn: () =>
      monitoringApi.listEvents({
        limit:     PAGE_SIZE,
        offset:    page * PAGE_SIZE,
        eventType: filters.eventType,
        severity:  filters.severity,
        userId:    filters.userId,
        from:      filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
        to:        filters.to   ? `${filters.to}T23:59:59.999Z`   : undefined,
      }),
  });

  const readOneMut = useMutation({
    mutationFn: (id: string) => monitoringApi.readOne(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monitoring'] }),
  });

  const events  = data?.events ?? [];
  const total   = data?.total  ?? 0;
  const pages   = Math.ceil(total / PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{total} events</span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => downloadCsv(events)}
          disabled={events.length === 0}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Event</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Employee</th>
              <th className="px-3 py-2 font-medium text-right">Amount</th>
              <th className="px-3 py-2 font-medium">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  No activity found for selected filters
                </td>
              </tr>
            ) : (
              events.map((evt) => (
                <tr
                  key={evt.id}
                  className={cn(
                    'hover:bg-muted/30 cursor-pointer transition-colors',
                    !evt.isRead && 'font-medium bg-blue-50/20',
                  )}
                  onClick={() => {
                    if (!evt.isRead) readOneMut.mutate(evt.id);
                    onEventClick?.(evt);
                  }}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {new Date(evt.createdAt).toLocaleString('en-IN', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {eventTypeLabel[evt.eventType] ?? evt.eventType}
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate">{evt.description}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {evt.user?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {evt.amount
                      ? `₹${parseFloat(String(evt.amount)).toLocaleString('en-IN')}`
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={cn('text-xs border', severityBadge[evt.severity])}>
                      {evt.severity}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {pages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline" size="sm" className="h-7 w-7 p-0"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline" size="sm" className="h-7 w-7 p-0"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
