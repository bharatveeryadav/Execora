import { useQuery } from "@tanstack/react-query";
import {
  adminGetDashboard, adminGetAnalyticsRevenue, adminGetTopTenants,
  adminGetAnalyticsTenants, AdminTopTenant, AdminRevenuePoint,
} from "@/lib/admin-api";
import { AdminPage, StatCard } from "@/components/AdminLayout";
import { TrendingUp, Users, Building2, IndianRupee, Activity } from "lucide-react";

export default function SuperAdminOverview() {
  const { data: dash } = useQuery({
    queryKey: ["sa-dashboard"],
    queryFn: adminGetDashboard,
    refetchInterval: 30_000,
  });
  const { data: revenue } = useQuery({
    queryKey: ["sa-revenue", 30],
    queryFn: () => adminGetAnalyticsRevenue(30),
  });
  const { data: topTenants } = useQuery({
    queryKey: ["sa-top-tenants"],
    queryFn: () => adminGetTopTenants(10),
  });
  const { data: tenantStats } = useQuery({
    queryKey: ["sa-tenant-stats"],
    queryFn: adminGetAnalyticsTenants,
  });

  const totalRevenue = revenue?.data?.reduce((acc: number, d: AdminRevenuePoint) => acc + d.amount, 0) ?? 0;
  const totalInvoices = dash
    ? Object.values(dash.invoices.byStatus).reduce((a, b) => a + (b as number), 0)
    : 0;

  return (
    <AdminPage
      title="Super Admin Overview"
      subtitle="Platform-wide health, growth, and revenue"
    >
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Revenue (30d)"
          value={`₹${(totalRevenue / 100).toLocaleString("en-IN")}`}
          color="green"
        />
        <StatCard
          label="Total Invoices"
          value={totalInvoices}
          color="violet"
        />
        <StatCard
          label="New Tenants (month)"
          value={tenantStats?.newThisMonth ?? "—"}
          color="blue"
        />
        <StatCard
          label="Today's Payments"
          value={dash?.payments.todayCount ?? "—"}
          sub={`₹${((dash?.payments.todayRevenue ?? 0) / 100).toLocaleString("en-IN")}`}
          color="yellow"
        />
      </div>

      {/* Revenue chart - simple bar */}
      {revenue?.data && revenue.data.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-semibold text-white">Daily Revenue — Last 30 Days</h2>
          </div>
          <div className="flex items-end gap-0.5 h-28">
            {revenue.data.map((d: AdminRevenuePoint) => {
              const maxAmount = Math.max(...revenue.data.map((r: AdminRevenuePoint) => r.amount));
              const pct = maxAmount > 0 ? (d.amount / maxAmount) * 100 : 0;
              return (
                <div
                  key={d.date}
                  className="flex-1 bg-green-500/70 hover:bg-green-400 rounded-t transition-colors cursor-default group relative"
                  style={{ height: `${Math.max(pct, 2)}%` }}
                  title={`${d.date}: ₹${(d.amount / 100).toLocaleString("en-IN")}`}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 z-10 pointer-events-none">
                    ₹{(d.amount / 100).toLocaleString("en-IN")}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{revenue.data[0]?.date?.slice(5)}</span>
            <span>{revenue.data[revenue.data.length - 1]?.date?.slice(5)}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tenant breakdown by plan */}
        {tenantStats && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Tenants by Plan</h2>
            </div>
            <div className="space-y-2">
              {Object.entries(tenantStats.byPlan).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 capitalize">{plan}</span>
                  <span className="text-sm font-semibold text-white">{count as number}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-gray-800 space-y-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">By Status</p>
              {Object.entries(tenantStats.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 capitalize">{status}</span>
                  <span className={`text-sm font-semibold ${status === "active" ? "text-green-400" : status === "suspended" ? "text-red-400" : "text-yellow-400"}`}>
                    {count as number}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top tenants by revenue */}
        {topTenants?.data && topTenants.data.length > 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-yellow-400" />
              <h2 className="text-sm font-semibold text-white">Top Tenants by Revenue</h2>
            </div>
            <div className="space-y-2">
              {topTenants.data.map((t: AdminTopTenant, i: number) => (
                <div key={t.tenantId} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-5 text-right">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{t.tenantName}</p>
                    <p className="text-xs text-gray-500">{t.invoiceCount} invoices</p>
                  </div>
                  <span className="text-sm font-semibold text-green-400">
                    ₹{(t.revenue / 100).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invoice status breakdown */}
      {dash && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Platform Invoice Status</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(dash.invoices.byStatus).map(([status, count]) => (
              <div key={status} className="bg-gray-800 rounded-lg px-4 py-3 text-center min-w-[100px]">
                <p className="text-xl font-bold text-white">{count as number}</p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reminders breakdown */}
      {dash && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-white">Platform Reminders</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(dash.reminders.byStatus).map(([status, count]) => (
              <div key={status} className="bg-gray-800 rounded-lg px-4 py-3 text-center min-w-[100px]">
                <p className="text-xl font-bold text-white">{count as number}</p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{status}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminPage>
  );
}
