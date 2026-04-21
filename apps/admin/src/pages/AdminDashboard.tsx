import { useQuery } from "@tanstack/react-query";
import {
  adminGetDashboard, adminGetHealth,
  adminGetAnalyticsRevenue, adminGetAnalyticsTenants, adminGetTopTenants,
  AdminRevenuePoint, AdminTopTenant,
} from "@/lib/admin-api";
import {
  AdminPage, StatCard, Badge, AdminLoading, AdminError,
} from "@/components/AdminLayout";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboard() {
  const { data: dash, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: adminGetDashboard,
    refetchInterval: 30_000,
  });
  const { data: health } = useQuery({
    queryKey: ["admin-health"],
    queryFn: adminGetHealth,
    refetchInterval: 15_000,
  });
  const { data: revenueData } = useQuery({
    queryKey: ["admin-analytics-revenue"],
    queryFn: () => adminGetAnalyticsRevenue(14),
  });
  const { data: tenantStats } = useQuery({
    queryKey: ["admin-analytics-tenants"],
    queryFn: adminGetAnalyticsTenants,
  });
  const { data: topTenantsData } = useQuery({
    queryKey: ["admin-top-tenants"],
    queryFn: () => adminGetTopTenants(5),
  });

  if (isLoading) return <AdminLoading />;
  if (error) return <AdminError msg={String(error)} />;
  if (!dash) return null;

  const invoiceStatuses = dash.invoices.byStatus;
  const reminderStatuses = dash.reminders.byStatus;

  return (
    <AdminPage
      title="Dashboard"
      subtitle={`Last updated ${formatDistanceToNow(new Date(dash.timestamp))} ago`}
      actions={
        health && (
          <Badge value={health.status} />
        )
      }
    >
      {/* Health bar */}
      {health && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(health.checks).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs bg-gray-800 rounded px-2.5 py-1.5">
              <span className={`w-2 h-2 rounded-full ${v === "ok" ? "bg-green-400" : "bg-red-400"}`} />
              <span className="text-gray-300 capitalize">{k}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Customers" value={dash.customers.total} color="blue" />
        <StatCard
          label="Pending Balance"
          value={`₹${Number(dash.customers.totalPendingBalance).toLocaleString("en-IN")}`}
          color="yellow"
        />
        <StatCard label="Today Revenue" value={`₹${Number(dash.payments.todayRevenue).toLocaleString("en-IN")}`} color="green" />
        <StatCard label="Today Payments" value={dash.payments.todayCount} sub="transactions" color="violet" />
      </div>

      {/* Invoice status breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Invoices by Status</h3>
          <div className="space-y-2">
            {Object.entries(invoiceStatuses).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <Badge value={status} />
                <span className="text-white font-medium text-sm">{count}</span>
              </div>
            ))}
            {Object.keys(invoiceStatuses).length === 0 && (
              <p className="text-gray-500 text-sm">No invoices yet</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Reminders by Status</h3>
          <div className="space-y-2">
            {Object.entries(reminderStatuses).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <Badge value={status} />
                <span className="text-white font-medium text-sm">{count}</span>
              </div>
            ))}
            {Object.keys(reminderStatuses).length === 0 && (
              <p className="text-gray-500 text-sm">No reminders yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Queue stats */}
      <div className="rounded-lg border border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Queue Overview</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[["Reminders", dash.queues.reminders], ["WhatsApp", dash.queues.whatsapp]].map(
            ([label, q]) => (
              <div key={label as string}>
                <p className="text-gray-400 mb-2 font-medium">{label as string}</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(q as Record<string, number>).map(([k, v]) => (
                    <div key={k} className="text-xs bg-gray-800 rounded px-2 py-1">
                      <span className="text-gray-400">{k}: </span>
                      <span className="text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Tenant Analytics */}
      {tenantStats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-800 p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Tenants by Plan</h3>
            <div className="space-y-2">
              {Object.entries(tenantStats.byPlan ?? {}).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <Badge value={plan} />
                  <span className="text-white font-medium text-sm">{count as number}</span>
                </div>
              ))}
              {tenantStats.newThisMonth != null && (
                <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-400">New this month</span>
                  <span className="text-green-400 font-medium text-sm">{tenantStats.newThisMonth}</span>
                </div>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-gray-800 p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Tenants by Status</h3>
            <div className="space-y-2">
              {Object.entries(tenantStats.byStatus ?? {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <Badge value={status} />
                  <span className="text-white font-medium text-sm">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Revenue trend */}
      {revenueData && revenueData.data?.length > 0 && (
        <div className="rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Revenue (Last 14 days)</h3>
          <RevenueBarChart data={revenueData.data} />
        </div>
      )}

      {/* Top tenants */}
      {topTenantsData && topTenantsData.data?.length > 0 && (
        <div className="rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Top Tenants by Revenue</h3>
          <div className="space-y-2">
            {topTenantsData.data.map((t: AdminTopTenant, i: number) => (
              <div key={t.tenantId} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white truncate">{t.tenantName}</span>
                    <span className="text-sm font-medium text-green-400">
                      ₹{Number(t.revenue).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div
                    className="mt-1 h-1.5 bg-violet-500/40 rounded-full"
                    style={{
                      width: `${Math.min(100, (Number(t.revenue) / Number(topTenantsData.data[0].revenue)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminPage>
  );
}

function RevenueBarChart({ data }: { data: AdminRevenuePoint[] }) {
  const max = Math.max(...data.map((d) => Number(d.amount)), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d) => {
        const height = Math.max(4, (Number(d.amount) / max) * 100);
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
            <div
              className="w-full bg-violet-500/60 hover:bg-violet-400/80 rounded-sm transition-all cursor-default"
              style={{ height: `${height}%` }}
              title={`₹${Number(d.amount).toLocaleString("en-IN")}`}
            />
            <span className="text-[10px] text-gray-600 rotate-45 origin-left hidden group-hover:block">
              {d.date.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
