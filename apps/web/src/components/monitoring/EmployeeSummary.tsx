/**
 * EmployeeSummary — employee cards with risk indicators.
 *
 * - Risk level badge: OK / Watch / Alert
 * - Cancel rate bar
 * - Click any card → EmployeeDetailSheet with full timeline
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { monitoringApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { EmployeeDetailSheet } from './EmployeeDetailSheet';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

interface Props {
  from?: string;
  to?:   string;
}

interface RiskLevel {
  level:  'alert' | 'warning' | 'ok';
  reason: string;
}

function getRisk(
  bills: number,
  cancellations: number,
  payments: number,
): RiskLevel {
  const totalTx    = bills + cancellations;
  const cancelRate = totalTx > 0 ? cancellations / totalTx : 0;

  if (cancelRate >= 0.25)
    return { level: 'alert',   reason: `${Math.round(cancelRate * 100)}% cancel rate` };
  if (cancelRate >= 0.10)
    return { level: 'warning', reason: `${Math.round(cancelRate * 100)}% cancel rate` };
  if (totalTx > 0 && bills === 0)
    return { level: 'warning', reason: 'No bills created' };
  if (payments > bills + 2 && bills > 0)
    return { level: 'warning', reason: 'Payments > bills' };

  return { level: 'ok', reason: 'Normal activity' };
}

export function EmployeeSummary({ from, to }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const { data: statsData } = useQuery({
    queryKey: ['monitoring', 'stats', from ?? today, to],
    queryFn:  () => monitoringApi.stats(
      from ? `${from}T00:00:00.000Z` : `${today}T00:00:00.000Z`,
      to   ? `${to}T23:59:59.999Z`   : undefined,
    ),
    refetchInterval: 30_000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'list'],
    queryFn:  () => monitoringApi.listUsers(),
    staleTime: 5 * 60_000,
  });

  const byEmployee = statsData?.byEmployee ?? {};
  const userMap    = Object.fromEntries(
    (usersData?.users ?? []).map((u) => [u.id, { name: u.name, role: u.role }]),
  );

  const employees = Object.entries(byEmployee).filter(
    ([, v]) => v.bills + v.payments + v.cancellations > 0,
  );

  // Count alerts for header
  const alertCount   = employees.filter(([, v]) => getRisk(v.bills, v.cancellations, v.payments).level === 'alert').length;
  const warningCount = employees.filter(([, v]) => getRisk(v.bills, v.cancellations, v.payments).level === 'warning').length;

  const selectedStats = selectedUser ? byEmployee[selectedUser] : null;
  const selectedMeta  = selectedUser ? userMap[selectedUser]    : null;

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Users className="h-8 w-8 opacity-30" />
        <p className="text-sm">No employee activity today</p>
      </div>
    );
  }

  return (
    <>
      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-4">
        <p className="text-xs text-muted-foreground">{employees.length} active employee{employees.length !== 1 ? 's' : ''}</p>
        {alertCount > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
            <AlertTriangle className="h-3 w-3" />
            {alertCount} alert{alertCount > 1 ? 's' : ''}
          </span>
        )}
        {warningCount > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
            <AlertTriangle className="h-3 w-3" />
            {warningCount} watch
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {employees.map(([userId, s]) => {
          const meta = userMap[userId];
          const name = meta?.name ?? `Employee (${userId.slice(0, 6)})`;
          const role = meta?.role ?? 'staff';
          const risk = getRisk(s.bills, s.cancellations, s.payments);

          const totalTx    = s.bills + s.cancellations;
          const cancelPct  = totalTx > 0 ? Math.round((s.cancellations / totalTx) * 100) : 0;
          const avgBill    = s.bills > 0 ? Math.round(s.totalAmount / s.bills) : 0;

          return (
            <Card
              key={userId}
              className={`border shadow-none cursor-pointer hover:shadow-sm transition-shadow ${
                risk.level === 'alert'   ? 'border-red-200 bg-red-50/30' :
                risk.level === 'warning' ? 'border-yellow-200 bg-yellow-50/20' :
                'hover:border-primary/30'
              }`}
              onClick={() => setSelectedUser(userId)}
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      risk.level === 'alert'   ? 'bg-red-100 text-red-700' :
                      risk.level === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight">{name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{role}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    risk.level === 'alert'   ? 'bg-red-100 text-red-700' :
                    risk.level === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {risk.level === 'ok' ? 'OK' : risk.level === 'warning' ? 'Watch' : 'Alert'}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                  <span className="text-muted-foreground">Bills</span>
                  <span className="font-medium flex items-center gap-1">
                    {s.bills}
                    {s.bills > 10 && <TrendingUp className="h-3 w-3 text-green-600" />}
                  </span>

                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-semibold text-green-700">{fmt(s.totalAmount)}</span>

                  <span className="text-muted-foreground">Avg bill</span>
                  <span className="font-medium">{avgBill > 0 ? fmt(avgBill) : '—'}</span>

                  <span className="text-muted-foreground">Payments</span>
                  <span className="font-medium">{s.payments}</span>

                  <span className="text-muted-foreground">Cancellations</span>
                  <span className={`font-medium ${s.cancellations > 0 ? 'text-red-600' : ''}`}>
                    {s.cancellations}
                  </span>

                  <span className="text-muted-foreground">Cancel rate</span>
                  <span className={`font-medium ${cancelPct >= 25 ? 'text-red-600' : cancelPct >= 10 ? 'text-yellow-600' : ''}`}>
                    {cancelPct}%
                  </span>
                </div>

                {/* Cancel rate bar */}
                {totalTx > 0 && (
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        cancelPct >= 25 ? 'bg-red-500' :
                        cancelPct >= 10 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, cancelPct * 2)}%` }}
                    />
                  </div>
                )}

                {/* Risk reason */}
                {risk.level !== 'ok' && (
                  <p className={`text-[10px] mt-2 flex items-center gap-1 ${
                    risk.level === 'alert' ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                    {risk.reason}
                  </p>
                )}

                <p className="text-[10px] text-muted-foreground mt-2 text-right">Click for timeline →</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail sheet */}
      {selectedUser && selectedStats && (
        <EmployeeDetailSheet
          open={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          userId={selectedUser}
          name={selectedMeta?.name ?? `Employee (${selectedUser.slice(0, 6)})`}
          role={selectedMeta?.role ?? 'staff'}
          stats={selectedStats}
          from={from}
          to={to}
        />
      )}
    </>
  );
}
