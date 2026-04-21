import { useQuery } from "@tanstack/react-query";
import { adminGetQueueStats } from "@/lib/admin-api";
import { AdminPage, StatCard, AdminLoading, AdminError } from "@/components/AdminLayout";

export default function AdminQueues() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-queues"],
    queryFn: adminGetQueueStats,
    refetchInterval: 10_000,
  });

  if (isLoading) return <AdminLoading />;
  if (error) return <AdminError msg={String(error)} />;
  if (!data) return null;

  const queues = [
    { name: "Reminders", stats: data.reminders },
    { name: "WhatsApp", stats: data.whatsapp },
    { name: "Media / OCR", stats: data.media },
  ];

  return (
    <AdminPage
      title="Queue Stats"
      subtitle="BullMQ job queues — auto-refreshes every 10s"
      actions={
        <button onClick={() => refetch()} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md">
          Refresh
        </button>
      }
    >
      {queues.map(({ name, stats }) => (
        <div key={name} className="rounded-lg border border-gray-800 p-4 space-y-3">
          <h3 className="text-sm font-medium text-white">{name}</h3>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(stats).map(([k, v]) => (
              <StatCard
                key={k}
                label={k}
                value={v}
                color={
                  k === "failed" && v > 0 ? "red" :
                  k === "active" && v > 0 ? "green" :
                  k === "waiting" && v > 0 ? "yellow" : "violet"
                }
              />
            ))}
          </div>
        </div>
      ))}
    </AdminPage>
  );
}
