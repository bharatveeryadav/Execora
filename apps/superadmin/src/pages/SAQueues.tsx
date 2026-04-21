import { useQuery } from "@tanstack/react-query";
import { saGetQueueStats } from "@/lib/sa-api";
import { SAPage, StatCard } from "@/components/SALayout";
import { RefreshCw } from "lucide-react";

export default function SAQueues() {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["sa-queues"],
    queryFn: saGetQueueStats,
    refetchInterval: 10_000,
  });

  return (
    <SAPage
      title="Queue Stats"
      subtitle="Real-time BullMQ queue status"
      actions={
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-md transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      }
    >
      {!data && <div className="text-gray-500 text-sm">Loading…</div>}

      {data && (
        <>
          {[
            { label: "Reminders Queue", stats: data.reminders },
            { label: "WhatsApp Queue",  stats: data.whatsapp },
            { label: "Media Queue",     stats: data.media },
          ].map(({ label, stats }) => (
            <div key={label} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h2 className="text-sm font-semibold text-white mb-3">{label}</h2>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {Object.entries(stats ?? {}).map(([k, v]) => (
                  <StatCard
                    key={k}
                    label={k}
                    value={v as number}
                    color={k === "failed" ? "red" : k === "active" ? "amber" : k === "completed" ? "green" : "blue"}
                  />
                ))}
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-600">
            Last updated: {new Date(data.timestamp).toLocaleTimeString("en-IN")}
          </p>
        </>
      )}
    </SAPage>
  );
}
