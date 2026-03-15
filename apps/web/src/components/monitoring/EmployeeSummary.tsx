import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

interface Props {
  from?: string;
  to?: string;
}

export function EmployeeSummary({ from, to }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const { data: stats } = useQuery({
    queryKey: ['monitoring', 'stats', from ?? today, to],
    queryFn: () => monitoringApi.stats(
      from ? `${from}T00:00:00.000Z` : `${today}T00:00:00.000Z`,
      to   ? `${to}T23:59:59.999Z`   : undefined,
    ),
    refetchInterval: 30_000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => monitoringApi.listUsers(),
    staleTime: 5 * 60_000,
  });

  const byEmployee = stats?.byEmployee ?? {};
  const userMap = Object.fromEntries((usersData?.users ?? []).map((u) => [u.id, u.name]));

  const employees = Object.entries(byEmployee).filter(([, v]) =>
    v.bills + v.payments + v.cancellations > 0,
  );

  if (employees.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-6">
        No employee activity today
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {employees.map(([userId, s]) => (
        <Card key={userId} className="border shadow-none">
          <CardContent className="p-4">
            <p className="font-semibold text-sm mb-2">
              {userMap[userId] ?? `Employee (${userId.slice(0, 6)})`}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Bills</span>
              <span className="font-medium">{s.bills}</span>
              <span className="text-muted-foreground">Payments</span>
              <span className="font-medium">{s.payments}</span>
              <span className="text-muted-foreground">Cancellations</span>
              <span className={`font-medium ${s.cancellations > 0 ? 'text-red-600' : ''}`}>
                {s.cancellations}
              </span>
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold text-green-700">{fmt(s.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
