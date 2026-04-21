import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  adminGetAnnouncements, adminCreateAnnouncement, adminDeleteAnnouncement,
  AdminAnnouncement,
} from "@/lib/admin-api";
import { AdminPage } from "@/components/AdminLayout";
import { Megaphone, Trash2, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const LEVELS: { value: AdminAnnouncement["level"]; label: string; color: string }[] = [
  { value: "info",    label: "Info",    color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  { value: "warning", label: "Warning", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  { value: "critical",label: "Critical",color: "text-red-400 bg-red-500/10 border-red-500/30" },
];

export default function SuperAdminAnnouncements() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", level: "info" as AdminAnnouncement["level"], expiresAt: "" });
  const [err, setErr] = useState("");

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["sa-announcements"],
    queryFn: adminGetAnnouncements,
  });

  const createMut = useMutation({
    mutationFn: () => adminCreateAnnouncement({
      title: form.title,
      message: form.message,
      level: form.level,
      expiresAt: form.expiresAt || undefined,
    }),
    onSuccess: () => {
      setShowForm(false);
      setForm({ title: "", message: "", level: "info", expiresAt: "" });
      setErr("");
      refetch();
    },
    onError: (e: Error) => setErr(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteAnnouncement(id),
    onSuccess: () => refetch(),
  });

  return (
    <AdminPage
      title="Platform Announcements"
      subtitle="Broadcast system-wide messages to all tenants"
      actions={
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-md text-sm"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </button>
      }
    >
      {isLoading && (
        <div className="text-gray-500 text-sm">Loading announcements…</div>
      )}

      {!isLoading && data?.data?.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No active announcements</p>
        </div>
      )}

      <div className="space-y-3">
        {data?.data?.map((ann: AdminAnnouncement) => {
          const levelConfig = LEVELS.find((l) => l.value === ann.level) ?? LEVELS[0];
          return (
            <div
              key={ann.id}
              className={`rounded-xl border p-4 ${levelConfig.color}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${levelConfig.color}`}>
                      {levelConfig.label}
                    </span>
                    <h3 className="text-sm font-semibold text-white">{ann.title}</h3>
                  </div>
                  <p className="text-sm opacity-80">{ann.message}</p>
                  <div className="flex items-center gap-3 text-xs opacity-60">
                    <span>Created {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}</span>
                    {ann.expiresAt && (
                      <span>Expires {new Date(ann.expiresAt).toLocaleDateString("en-IN")}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteMut.mutate(ann.id)}
                  disabled={deleteMut.isPending}
                  className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create announcement modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">New Announcement</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>

            {err && <p className="text-sm text-red-400">{err}</p>}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Announcement title"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Describe the announcement…"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Level</label>
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value as AdminAnnouncement["level"] })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                  >
                    {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Expires At (optional)</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => createMut.mutate()}
                disabled={!form.title.trim() || !form.message.trim() || createMut.isPending}
                className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-md disabled:opacity-40"
              >
                {createMut.isPending ? "Publishing…" : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
