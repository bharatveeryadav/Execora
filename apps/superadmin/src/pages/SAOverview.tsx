import { useQuery } from "@tanstack/react-query";
import {
  saGetDashboard, saGetAnalyticsRevenue, saGetTopTenants, saGetTenantAnalytics,
  SARevenuePoint, SATopTenant,
} from "@/lib/sa-api";
import { SAPage, StatCard } from "@/components/SALayout";
import { TrendingUp, Building2, IndianRupee, Activity, RefreshCw } from "lucide-react";

export default function SAOverview() {
  const { data: dash, refetch, isFetching } = useQuery({
    queryKey: ["sa-dash"],
    queryFn: saGetDashboard,
    refetchInterval: 30_000,
  });
  const { data: revenue } = useQuery({
    queryKey: ["sa-revenue"],
    queryFn: () => saGetAnalyticsRevenue(30),
  });
  const { data: topTenants } = useQuery({
    queryKey: ["sa-top-tenants"],
    queryFn: () => saGetTopTenants(8),
  });
  const { data: tenantStats } = useQuery({
    queryKey: ["sa-tenant-analytics"],
    queryFn: saGetTenantAnalytics,
  });

  const totalRevenue = revenue?.data?.reduce((a: number, d: SARevenuePoint) => a + d.amount, 0) ?? 0;
  const totalInvoices = dash
    ? Object.values(dash.invoices.byStatus).reduce((a, b) => a + (b as number), 0)
    : 0;

  return (
    <SAPage
      title="Platform Overview"
      subtitle="Real-time health, growth, and revenue across all tenants"
      actions={
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400 rounded-md transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      }
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenue (30d)"
          value={`₹${(totalRevenue / 100).toLocaleString("en-IN")}`}
          color="green"
        />
        <StatCard
          label="Total Invoices"
          value={totalInvoices}
          color="amber"
        />
        <StatCard
          label="New Tenants (month)"
          value={tenantStats?.newThisMonth ?? "—"}
          color="blue"
        />
        <StatCard
          label="Today Payments"
          value={dash?.payments.todayCount ?? "—"}
          sub={`₹${((dash?.payments.todayRevenue ?? 0) / 100).toLocaleString("en-IN")}`}
          color="violet"
        />
      </div>

      {/* Revenue bar chart */}
      {revenue?.data && revenue.data.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-semibold text-white">Daily Revenue — Last 30 Days</h2>
            <span className="ml-auto text-xs text-gray-600">
              Total: ₹{(totalRevenue / 100).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-end gap-0.5 h-32">
            {revenue.data.map((d: SARevenuePoint) => {
              const max = Math.max(...revenue.data.map((r: SARevenuePoint) => r.amount));
              const pct = max > 0 ? (d.amount / max) * 100 : 0;
              return (
                <div
                  key={d.date}
                  className="flex-1 bg-amber-500/60 hover:bg-amber-400 rounded-t transition-colors cursor-default group relative"
                  style={{ height: `${Math.max(pct, 2)}%` }}
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
        {/* Tenant breakdown */}
        {tenantStats && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Tenants by Plan & Status</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="text-xs text-gray-600 uppercase tracking-wide">By Plan</p>
                {Object.entries(tenantStats.byPlan).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-gray-400 capitalize">{k}</span>
                    <span className="text-white font-medium">{v as number}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-gray-600 uppercase tracking-wide">By Status</p>
                {Object.entries(tenantStats.byStatus).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className={`capitalize ${k === "active" ? "text-green-400" : k === "suspended" ? "text-red-400" : "text-yellow-400"}`}>{k}</span>
                    <span className="text-white font-medium">{v as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top tenants */}
        {topTenants?.data && topTenants.data.length > 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-green-400" />
              <h2 className="text-sm font-semibold text-white">Top Tenants by Revenue</h2>
            </div>
            <div className="space-y-2">
              {topTenants.data.map((t: SATopTenant, i: number) => (
                <div key={t.tenantId} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{t.tenantName}</p>
                    <p className="text-xs text-gray-500">{t.invoiceCount} invoices</p>
                  </div>
                  <span className="text-sm font-bold text-green-400">
                    ₹{(t.revenue / 100).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invoice status */}
      {dash && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Invoice & Reminder Status</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Invoices</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(dash.invoices.byStatus).map(([s, c]) => (
                  <div key={s} className="bg-gray-800 rounded-lg px-3 py-2 text-center min-w-[80px]">
                    <p className="text-lg font-bold text-white">{c as number}</p>
                    <p className="text-xs text-gray-400 capitalize">{s}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Reminders</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(dash.reminders.byStatus).map(([s, c]) => (
                  <div key={s} className="bg-gray-800 rounded-lg px-3 py-2 text-center min-w-[80px]">
                    <p className="text-lg font-bold text-white">{c as number}</p>
                    <p className="text-xs text-gray-400 capitalize">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </SAPage>
  );
}
