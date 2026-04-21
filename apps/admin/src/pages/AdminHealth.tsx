import { useQuery } from "@tanstack/react-query";
import { adminGetHealth, adminGetProviders, adminGetQueueStats } from "@/lib/admin-api";
import { AdminPage, Badge, StatCard, AdminLoading, AdminError } from "@/components/AdminLayout";

export default function AdminHealth() {
  const { data: health, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-health"],
    queryFn: adminGetHealth,
    refetchInterval: 15_000,
  });
  const { data: providers } = useQuery({ queryKey: ["admin-providers"], queryFn: adminGetProviders });
  const { data: queues } = useQuery({ queryKey: ["admin-queues"], queryFn: adminGetQueueStats });

  if (isLoading) return <AdminLoading />;
  if (error) return <AdminError msg={String(error)} />;
  if (!health) return null;

  return (
    <AdminPage
      title="System Health"
      subtitle="Live infrastructure status"
      actions={
        <button onClick={() => refetch()} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors">
          Refresh
        </button>
      }
    >
      {/* System checks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Overall" value={health.status === "ok" ? "Healthy" : "Degraded"} color={health.status === "ok" ? "green" : "red"} />
        {Object.entries(health.checks).map(([k, v]) => (
          <StatCard key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v === "ok" ? "OK" : "Error"} color={v === "ok" ? "green" : "red"} />
        ))}
      </div>

      {/* Worker active jobs */}
      <div className="rounded-lg border border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Worker Active Jobs</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(health.workers).map(([name, info]) => (
            <div key={name} className="bg-gray-800 rounded px-3 py-2 text-sm">
              <span className="text-gray-400 capitalize">{name}: </span>
              <span className="text-white font-medium">{info.active} active</span>
            </div>
          ))}
        </div>
      </div>

      {/* Provider status */}
      {providers && (
        <div className="rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">AI Providers</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[["STT", providers.stt], ["TTS", providers.tts]].map(([label, p]) => (
              <div key={label as string} className="flex items-center justify-between bg-gray-800/50 rounded px-3 py-2">
                <div>
                  <span className="text-gray-400 text-xs uppercase">{label as string} </span>
                  <span className="text-white">{(p as { provider: string }).provider}</span>
                </div>
                <Badge value={(p as { available: boolean }).available ? "active" : "error"} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queue stats */}
      {queues && (
        <div className="rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Queue Stats</h3>
          <div className="space-y-4">
            {[["Reminders", queues.reminders], ["WhatsApp", queues.whatsapp], ["Media", queues.media]].map(
              ([name, stats]) => (
                <div key={name as string}>
                  <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide">{name as string}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats as Record<string, number>).map(([k, v]) => (
                      <div key={k} className={`text-xs rounded px-2 py-1 ${v > 0 && k === "failed" ? "bg-red-900/30 text-red-300" : "bg-gray-800 text-gray-300"}`}>
                        {k}: <span className="font-medium text-white">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </AdminPage>
  );
}
