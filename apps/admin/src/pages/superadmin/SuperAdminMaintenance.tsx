import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  adminGetMaintenanceStatus, adminSetMaintenance, adminGetSessions,
  AdminMaintenanceStatus,
} from "@/lib/admin-api";
import { AdminPage } from "@/components/AdminLayout";
import { Wrench, AlertTriangle, CheckCircle, Users, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function SuperAdminMaintenance() {
  const [reason, setReason] = useState("");
  const [confirmOff, setConfirmOff] = useState(false);

  const { data: statusData, refetch: refetchStatus, isLoading } = useQuery({
    queryKey: ["sa-maintenance"],
    queryFn: adminGetMaintenanceStatus,
    refetchInterval: 15_000,
  });

  const { data: sessionsData, refetch: refetchSessions } = useQuery({
    queryKey: ["sa-active-sessions"],
    queryFn: adminGetSessions,
    refetchInterval: 30_000,
  });

  const enableMut = useMutation({
    mutationFn: () => adminSetMaintenance(true, reason || "Scheduled maintenance"),
    onSuccess: () => { setReason(""); refetchStatus(); },
  });

  const disableMut = useMutation({
    mutationFn: () => adminSetMaintenance(false),
    onSuccess: () => { setConfirmOff(false); refetchStatus(); },
  });

  const isMaintenance = statusData?.enabled ?? false;

  return (
    <AdminPage
      title="Maintenance & System Control"
      subtitle="Enable maintenance mode and monitor active platform sessions"
    >
      {isLoading && <div className="text-gray-500 text-sm">Loading…</div>}

      {/* Maintenance toggle card */}
      <div className={`rounded-xl border p-6 space-y-4 ${isMaintenance
        ? "bg-red-500/5 border-red-500/30"
        : "bg-green-500/5 border-green-500/30"}`}
      >
        <div className="flex items-center gap-3">
          {isMaintenance ? (
            <Wrench className="w-6 h-6 text-red-400" />
          ) : (
            <CheckCircle className="w-6 h-6 text-green-400" />
          )}
          <div>
            <h2 className="text-base font-semibold text-white">
              Platform is currently{" "}
              <span className={isMaintenance ? "text-red-400" : "text-green-400"}>
                {isMaintenance ? "in Maintenance Mode" : "Live"}
              </span>
            </h2>
            {statusData?.reason && (
              <p className="text-sm text-gray-400 mt-0.5">Reason: {statusData.reason}</p>
            )}
            {statusData?.enabledAt && (
              <p className="text-xs text-gray-600 mt-0.5">
                Since {formatDistanceToNow(new Date(statusData.enabledAt), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>

        {isMaintenance ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">
                All public API requests are currently returning 503. Disable maintenance mode to restore normal operation.
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
                <span className="text-sm text-gray-300">Are you sure? This will restore all public access.</span>
                <button
                  onClick={() => disableMut.mutate()}
                  disabled={disableMut.isPending}
                  className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-md text-sm disabled:opacity-40"
                >
                  {disableMut.isPending ? "Disabling…" : "Yes, Go Live"}
                </button>
                <button
                  onClick={() => setConfirmOff(false)}
                  className="text-sm text-gray-500 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Reason (shown to users)</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Scheduled upgrade, database migration…"
                className="w-full max-w-md bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <button
              onClick={() => enableMut.mutate()}
              disabled={enableMut.isPending}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md text-sm disabled:opacity-40"
            >
              {enableMut.isPending ? "Enabling…" : "Enable Maintenance Mode"}
            </button>
            {enableMut.error && (
              <p className="text-sm text-red-400">{String(enableMut.error)}</p>
            )}
          </div>
        )}
      </div>

      {/* Active voice sessions */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Active Voice Sessions</h2>
          </div>
          <button
            onClick={() => refetchSessions()}
            className="text-gray-500 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {!sessionsData?.data?.length ? (
          <p className="text-sm text-gray-600">No active sessions.</p>
        ) : (
          <div className="space-y-2">
            {sessionsData.data.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm text-white">{s.customer?.name ?? "Unknown customer"}</p>
                  <p className="text-xs text-gray-500 font-mono">{s.id.slice(0, 12)}…</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{s._count.turns} turns</p>
                  <p className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminPage>
  );
}
