import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { saGetMaintenance, saSetMaintenance, saGetHealth, saGetProviders } from "@/lib/sa-api";
import { SAPage, StatCard } from "@/components/SALayout";
import { Wrench, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function SAMaintenance() {
  const [reason, setReason] = useState("");
  const [confirmOff, setConfirmOff] = useState(false);

  const { data: status, refetch: refetchStatus, isLoading } = useQuery({
    queryKey: ["sa-maintenance"],
    queryFn: saGetMaintenance,
    refetchInterval: 15_000,
  });

  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: ["sa-health"],
    queryFn: saGetHealth,
    refetchInterval: 20_000,
  });

  const { data: providers } = useQuery({
    queryKey: ["sa-providers"],
    queryFn: saGetProviders,
    refetchInterval: 30_000,
  });

  const enableMut = useMutation({
    mutationFn: () => saSetMaintenance(true, reason || "Scheduled maintenance"),
    onSuccess: () => { setReason(""); refetchStatus(); },
  });

  const disableMut = useMutation({
    mutationFn: () => saSetMaintenance(false),
    onSuccess: () => { setConfirmOff(false); refetchStatus(); },
  });

  const isMaintenance = status?.enabled ?? false;
  const healthOk = health?.status === "ok";

  return (
    <SAPage
      title="Maintenance & Health"
      subtitle="Enable maintenance mode and monitor system health"
      actions={
        <button
          onClick={() => { refetchStatus(); refetchHealth(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-md transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      }
    >
      {isLoading && <div className="text-gray-500 text-sm">Loading…</div>}

      {/* System health strip */}
      {health && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(health.checks).map(([k, v]) => (
            <StatCard
              key={k}
              label={k}
              value={v === "ok" ? "OK" : "ERROR"}
              color={v === "ok" ? "green" : "red"}
            />
          ))}
        </div>
      )}

      {/* Providers */}
      {providers && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-3">AI Providers</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "STT", data: providers.stt },
              { label: "TTS", data: providers.tts },
            ].map(({ label, data }) => (
              <div key={label} className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-sm text-white font-medium mt-1">{data.provider}</p>
                <span className={`text-xs ${data.available ? "text-green-400" : "text-red-400"}`}>
                  {data.available ? "● Available" : "● Unavailable"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance toggle */}
      <div className={`rounded-xl border p-6 space-y-4 ${isMaintenance
        ? "bg-red-500/5 border-red-500/30"
        : "bg-green-500/5 border-green-500/30"}`}
      >
        <div className="flex items-center gap-3">
          {isMaintenance
            ? <Wrench className="w-6 h-6 text-red-400" />
            : <CheckCircle className="w-6 h-6 text-green-400" />}
          <div>
            <h2 className="text-base font-semibold text-white">
              Platform is{" "}
              <span className={isMaintenance ? "text-red-400" : "text-green-400"}>
                {isMaintenance ? "in Maintenance Mode" : "Live"}
              </span>
            </h2>
            {status?.reason && <p className="text-sm text-gray-400 mt-0.5">Reason: {status.reason}</p>}
            {status?.enabledAt && (
              <p className="text-xs text-gray-600 mt-0.5">
                Since {formatDistanceToNow(new Date(status.enabledAt), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>

        {isMaintenance ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">
                All public API requests are returning 503. Disable to restore access.
              </p>
            </div>
            {!confirmOff ? (
              <button
                onClick={() => setConfirmOff(true)}
                className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-md text-sm"
              >
                Disable Maintenance Mode
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-300">Confirm restoring public access?</span>
                <button
                  onClick={() => disableMut.mutate()}
                  disabled={disableMut.isPending}
                  className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-md text-sm disabled:opacity-40"
                >
                  {disableMut.isPending ? "Disabling…" : "Yes, Go Live"}
                </button>
                <button onClick={() => setConfirmOff(false)} className="text-sm text-gray-500 hover:text-white">
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Reason (optional)</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Scheduled upgrade, database migration…"
                className="w-full max-w-md bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <button
              onClick={() => enableMut.mutate()}
              disabled={enableMut.isPending || !healthOk}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md text-sm disabled:opacity-40"
              title={!healthOk ? "System is degraded — check health first" : undefined}
            >
              {enableMut.isPending ? "Enabling…" : "Enable Maintenance Mode"}
            </button>
            {enableMut.error && (
              <p className="text-sm text-red-400">{String(enableMut.error)}</p>
            )}
          </div>
        )}
      </div>
    </SAPage>
  );
}
