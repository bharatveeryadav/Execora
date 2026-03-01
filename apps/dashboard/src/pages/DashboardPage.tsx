import { useDailySummary, useInvoices, useLowStockProducts, useReminders } from '@/hooks/useQueries';
import { formatCurrency, formatDateTime } from '@/lib/api';
import { useWS } from '@/contexts/WSContext';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { InvoiceStatusBadge, Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, CreditCard, FileText, Bell, Package, Mic, AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Metric card ───────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ label, value, sub, icon: Icon, iconColor, iconBg }: MetricCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </Card>
  );
}

// ── Payment method chart colours ──────────────────────────────────────────────

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useDailySummary();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices(10);
  const { data: lowStock = [] } = useLowStockProducts();
  const { data: reminders = [] } = useReminders();
  const { isConnected, pendingCount } = useWS();

  const pendingReminders = reminders.filter((r) => r.status === 'pending').length;

  // Recharts bar data
  const barData = summary
    ? [
        { name: 'Sales', amount: summary.totalSales },
        { name: 'Collected', amount: summary.totalPayments },
        { name: 'Pending', amount: summary.pendingAmount },
      ]
    : [];

  // Payment method pie data
  const pieData = summary
    ? [
        { name: 'Cash', value: summary.cashPayments },
        { name: 'UPI', value: summary.upiPayments },
        { name: 'Other', value: Math.max(0, summary.totalPayments - summary.cashPayments - summary.upiPayments) },
      ].filter((d) => d.value > 0)
    : [];

  if (summaryLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      {/* Real-time banner */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {pendingCount} pending invoice{pendingCount > 1 ? 's' : ''} awaiting confirmation
              </p>
              <p className="text-xs text-amber-600">Real-time update via WebSocket</p>
            </div>
          </div>
          <Link
            to="/invoices"
            className="text-sm font-medium text-amber-700 hover:text-amber-900 underline"
          >
            View all
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Today's Sales"
          value={formatCurrency(summary?.totalSales ?? 0)}
          sub={`${summary?.invoiceCount ?? 0} invoice${(summary?.invoiceCount ?? 0) !== 1 ? 's' : ''}`}
          icon={TrendingUp}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <MetricCard
          label="Collected Today"
          value={formatCurrency(summary?.totalPayments ?? 0)}
          sub={`Cash ${formatCurrency(summary?.cashPayments ?? 0)}`}
          icon={CreditCard}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <MetricCard
          label="Pending Amount"
          value={formatCurrency(summary?.pendingAmount ?? 0)}
          sub="To collect today"
          icon={FileText}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <MetricCard
          label="Reminders Due"
          value={String(pendingReminders)}
          sub={lowStock.length > 0 ? `${lowStock.length} low stock` : 'Stock OK'}
          icon={Bell}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's financials bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Financial Overview</CardTitle>
            <span className="text-xs text-gray-400">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </CardHeader>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), '']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}
                  fill="#6366f1"
                  label={false}
                >
                  {barData.map((_, i) => (
                    <Cell key={i} fill={['#6366f1', '#10b981', '#f59e0b'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No transactions today yet
            </div>
          )}
        </Card>

        {/* Payment method breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                  iconType="circle"
                  iconSize={8}
                />
                <Tooltip formatter={(v: number) => [formatCurrency(v), '']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No payments today
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent invoices */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Recent Invoices</h3>
            <Link to="/invoices" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View all
            </Link>
          </div>
          {invoicesLoading ? (
            <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
          ) : invoices.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No invoices yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {invoices.slice(0, 6).map((inv) => (
                <div key={inv.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.invoiceNo}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(inv.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <InvoiceStatusBadge status={inv.status} />
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total ?? inv.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Low stock + quick actions */}
        <div className="space-y-6">
          {/* Low stock */}
          {lowStock.length > 0 && (
            <Card padding="none">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Low Stock Alert
                </h3>
                <Link to="/products" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  Manage
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {lowStock.slice(0, 4).map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{p.name}</span>
                    </div>
                    <Badge variant={p.stock === 0 ? 'red' : 'yellow'}>
                      {p.stock} {p.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quick actions */}
          <Card>
            <CardTitle>Quick Actions</CardTitle>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { to: '/voice', icon: Mic, label: 'Voice Command', color: 'bg-indigo-600 text-white hover:bg-indigo-700' },
                { to: '/invoices', icon: FileText, label: 'New Invoice', color: 'bg-emerald-600 text-white hover:bg-emerald-700' },
                { to: '/customers', icon: Bell, label: 'Customers', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' },
                { to: '/reminders', icon: Bell, label: 'Reminders', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200' },
              ].map(({ to, icon: Icon, label, color }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl font-medium text-sm transition-colors ${color}`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              ))}
            </div>
          </Card>

          {/* WS status */}
          <Card className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-300'}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isConnected ? 'Real-time connected' : 'Real-time offline'}
              </p>
              <p className="text-xs text-gray-400">
                {isConnected
                  ? 'Receiving live updates from server'
                  : 'Reconnecting automatically…'}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
