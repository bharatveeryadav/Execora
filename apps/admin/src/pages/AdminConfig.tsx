import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminGetConfig, adminPutConfig, adminResetConfig } from "@/lib/admin-api";
import { AdminPage, AdminLoading, AdminError } from "@/components/AdminLayout";

export default function AdminConfig() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-config"],
    queryFn: adminGetConfig,
  });

  const [editJson, setEditJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [editing, setEditing] = useState(false);

  const saveMut = useMutation({
    mutationFn: () => {
      const parsed = JSON.parse(editJson);
      return adminPutConfig(parsed);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-config"] }); setEditing(false); },
    onError: (e: Error) => setJsonError(e.message),
  });

  const resetMut = useMutation({
    mutationFn: adminResetConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-config"] }),
  });

  function startEdit() {
    setEditJson(JSON.stringify(data, null, 2));
    setJsonError("");
    setEditing(true);
  }

  if (isLoading) return <AdminLoading />;
  if (error) return <AdminError msg={String(error)} />;

  return (
    <AdminPage
      title="Runtime Config"
      subtitle="Live configuration — changes take effect immediately without restart"
      actions={
        <div className="flex gap-2">
          {!editing && (
            <>
              <button onClick={startEdit} className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-md">
                Edit
              </button>
              <button
                onClick={() => resetMut.mutate()}
                disabled={resetMut.isPending}
                className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md disabled:opacity-50"
              >
                {resetMut.isPending ? "Resetting…" : "Reset to Defaults"}
              </button>
            </>
          )}
        </div>
      }
    >
      {editing ? (
        <div className="space-y-3">
          <p className="text-xs text-yellow-400">⚠ Edit JSON carefully — invalid keys are ignored by the server.</p>
          {jsonError && <p className="text-xs text-red-400">{jsonError}</p>}
          <textarea
            value={editJson}
            onChange={(e) => { setEditJson(e.target.value); setJsonError(""); }}
            rows={20}
            className="w-full bg-gray-800 border border-gray-700 text-green-300 font-mono text-xs rounded-lg p-4 focus:outline-none focus:border-violet-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-md disabled:opacity-50"
            >
              {saveMut.isPending ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <pre className="bg-gray-800/60 rounded-lg p-4 text-xs text-green-300 font-mono overflow-auto max-h-[60vh] border border-gray-700">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </AdminPage>
  );
}
