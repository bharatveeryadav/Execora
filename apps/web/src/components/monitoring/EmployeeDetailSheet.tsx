/**
 * EmployeeDetailSheet — full activity timeline for one employee.
 *
 * Opens as a side Sheet when a card in EmployeeSummary is clicked.
 * Shows:
 *   - Header: name, role, risk level
 *   - KPI row: bills, amount, cancellations, cancel rate
 *   - Risk alerts section
 *   - Full chronological event feed for today (or selected date range)
 */
import { useQuery } from '@tanstack/react-query';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { monitoringApi, type MonitoringEventItem } from '@/lib/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  'bill.created':        { label: 'Bill Created',       color: 'text-green-700 bg-green-50' },
  'payment.recorded':    { label: 'Payment',            color: 'text-blue-700 bg-blue-50' },
  'bill.cancelled':      { label: 'Cancelled',          color: 'text-red-700 bg-red-50' },
  'discount.applied':    { label: 'Discount',           color: 'text-orange-700 bg-orange-50' },
  'cash.drawer.opened':  { label: 'Drawer Opened',      color: 'text-yellow-700 bg-yellow-50' },
  'cash.transaction':    { label: 'Cash Transaction',   color: 'text-purple-700 bg-purple-50' },
  'invoice.created':     { label: 'Invoice Created',    color: 'text-teal-700 bg-teal-50' },
  'invoice.cancelled':   { label: 'Invoice Cancelled',  color: 'text-red-700 bg-red-50' },
  'login':               { label: 'Login',              color: 'text-gray-700 bg-gray-100' },
};

function eventStyle(type: string) {
  return EVENT_LABELS[type] ?? { label: type, color: 'text-gray-600 bg-gray-50' };
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

interface RiskFlag {
  level: 'alert' | 'warning' | 'info';
  message: string;
}

function computeRisks(
  bills: number,
  payments: number,
  cancellations: number,
  totalAmount: number,
  events: MonitoringEventItem[],
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Cancel rate
  const totalTx = bills + cancellations;
  const cancelRate = totalTx > 0 ? cancellations / totalTx : 0;
  if (cancelRate >= 0.25) {
    flags.push({ level: 'alert', message: `High cancellation rate: ${Math.round(cancelRate * 100)}% of bills cancelled` });
  } else if (cancelRate >= 0.10) {
    flags.push({ level: 'warning', message: `Elevated cancellation rate: ${Math.round(cancelRate * 100)}%` });
  }

  // Zero bills (has events but no sales)
  if (events.length > 0 && bills === 0) {
    flags.push({ level: 'warning', message: 'Active today but created no bills' });
  }

  // Drawer opens without bill — "no-ring" events
  const noRingEvents = events.filter(
    (e) => e.eventType === 'cash.drawer.opened' && e.description?.toLowerCase().includes('no bill'),
  );
  if (noRingEvents.length >= 3) {
    flags.push({ level: 'alert', message: `${noRingEvents.length} drawer opens with no preceding bill (no-ring)` });
  } else if (noRingEvents.length >= 1) {
    flags.push({ level: 'warning', message: `${noRingEvents.length} drawer open(s) with no recent bill` });
  }

  // Payments > bills (could indicate recording payments without billing)
  if (payments > bills + 2 && bills > 0) {
    flags.push({ level: 'warning', message: `More payments (${payments}) than bills (${bills}) recorded` });
  }

  // Large total with few bills (large average bill anomaly)
  const avg = bills > 0 ? totalAmount / bills : 0;
  if (bills > 0 && avg > 20_000) {
    flags.push({ level: 'info', message: `High avg bill ₹${Math.round(avg).toLocaleString('en-IN')} — verify with owner` });
  }

  return flags;
}

interface Props {
  open:        boolean;
  onClose:     () => void;
  userId:      string;
  name:        string;
  role:        string;
  stats:       { bills: number; payments: number; cancellations: number; totalAmount: number };
  from?:       string;
  to?:         string;
}

export function EmployeeDetailSheet({ open, onClose, userId, name, role, stats, from, to }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ['monitoring', 'employee-events', userId, from ?? today, to],
    queryFn: () => monitoringApi.listEvents({
      userId,
      from: from ? `${from}T00:00:00.000Z` : `${today}T00:00:00.000Z`,
      to:   to   ? `${to}T23:59:59.999Z`   : undefined,
      limit: 200,
    }),
    enabled: open,
    staleTime: 30_000,
  });

  const events = data?.events ?? [];
  const risks  = computeRisks(stats.bills, stats.payments, stats.cancellations, stats.totalAmount, events);

  const cancelRate = (stats.bills + stats.cancellations) > 0
    ? Math.round((stats.cancellations / (stats.bills + stats.cancellations)) * 100)
    : 0;

  const overallRisk = risks.some((r) => r.level === 'alert')
    ? 'alert'
    : risks.some((r) => r.level === 'warning')
    ? 'warning'
    : 'ok';

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                overallRisk === 'alert'   ? 'bg-red-100 text-red-700' :
                overallRisk === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <SheetTitle className="text-base">{name}</SheetTitle>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="space-y-5 pt-4">

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-xs text-muted-foreground">Bills</p>
              <p className="text-lg font-bold">{stats.bills}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-sm font-bold">{fmt(stats.totalAmount)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-xs text-muted-foreground">Cancelled</p>
              <p className={`text-lg font-bold ${stats.cancellations > 0 ? 'text-red-600' : ''}`}>
                {stats.cancellations}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-xs text-muted-foreground">Cancel%</p>
              <p className={`text-lg font-bold ${cancelRate >= 25 ? 'text-red-600' : cancelRate >= 10 ? 'text-yellow-600' : ''}`}>
                {cancelRate}%
              </p>
            </div>
          </div>

          {/* Risk flags */}
          {risks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risk Indicators</p>
              {risks.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                    r.level === 'alert'   ? 'bg-red-50 text-red-800' :
                    r.level === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                    'bg-blue-50 text-blue-800'
                  }`}
                >
                  {r.level === 'alert'   ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-600" /> :
                   r.level === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-yellow-600" /> :
                   <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-600" />}
                  {r.message}
                </div>
              ))}
            </div>
          )}

          {risks.length === 0 && events.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-green-50 text-green-800 text-xs">
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
              No suspicious patterns detected today
            </div>
          )}

          {/* Activity timeline */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Activity Timeline ({events.length} events)
            </p>

            {isLoading && (
              <div className="text-sm text-muted-foreground text-center py-6">Loading...</div>
            )}

            {!isLoading && events.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6">No events for this period</div>
            )}

            <div className="space-y-1">
              {events.map((e) => {
                const style = eventStyle(e.eventType);
                return (
                  <div
                    key={e.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    {/* Time */}
                    <span className="text-xs text-muted-foreground w-16 shrink-0 pt-0.5">
                      {fmtTime(e.createdAt)}
                    </span>

                    {/* Event type badge */}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${style.color}`}>
                      {style.label}
                    </span>

                    {/* Description + amount */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground/80 truncate">{e.description}</p>
                      {e.amount != null && parseFloat(String(e.amount)) !== 0 && (
                        <p className="text-xs font-medium text-green-700">
                          {fmt(parseFloat(String(e.amount)))}
                        </p>
                      )}
                    </div>

                    {/* Severity dot */}
                    {e.severity !== 'info' && (
                      <span className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                        e.severity === 'alert'   ? 'bg-red-500' :
                        e.severity === 'warning' ? 'bg-yellow-500' :
                        'bg-blue-400'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
