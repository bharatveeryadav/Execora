import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminGetUsers, adminUpdateUserPassword, adminUpdateUserStatus,
  adminGetUserSessions, adminRevokeUserSessions, AdminUser, AdminUserSession,
} from "@/lib/admin-api";
import {
  AdminPage, AdminTable, TR, TD, Badge, Pagination, AdminLoading, AdminError,
} from "@/components/AdminLayout";
import { formatDistanceToNow } from "date-fns";

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [sessionsUser, setSessionsUser] = useState<AdminUser | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users", page, q, role],
    queryFn: () => adminGetUsers({ page, q: q || undefined, role: role || undefined }),
    placeholderData: (prev) => prev,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminUpdateUserStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <AdminPage title="Users" subtitle="All users across all tenants">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search users…"
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-violet-500 placeholder:text-gray-500"
        />
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500"
        >
          <option value="">All Roles</option>
          {["owner", "admin", "manager", "staff", "viewer"].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {isLoading && <AdminLoading />}
      {error && <AdminError msg={String(error)} />}

      {data && (
        <>
          <AdminTable heads={["Name / Email", "Role", "Tenant", "Status", "Last Login", "Actions"]}>
            {data.data.map((u: AdminUser) => (
              <TR key={u.id}>
                <TD>
                  <div className="font-medium text-white">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </TD>
                <TD><Badge value={u.role} /></TD>
                <TD>
                  <div className="text-xs text-gray-400">{(u as any).tenant?.name ?? u.tenantId.slice(0, 8) + "…"}</div>
                  <div className="text-xs text-gray-600 font-mono">{(u as any).tenant?.plan && <Badge value={(u as any).tenant.plan} />}</div>
                </TD>
                <TD><Badge value={u.isActive ? "active" : "inactive"} /></TD>
                <TD className="text-xs text-gray-500">
                  {u.lastLogin ? formatDistanceToNow(new Date(u.lastLogin), { addSuffix: true }) : "Never"}
                </TD>
                <TD>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setEditUser(u)}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      Reset Pwd
                    </button>
                    <span className="text-gray-700">|</span>
                    <button
                      onClick={() => setSessionsUser(u)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Sessions
                    </button>
                    <span className="text-gray-700">|</span>
                    {u.isActive ? (
                      <button
                        onClick={() => toggleStatus.mutate({ id: u.id, isActive: false })}
                        disabled={u.role === "owner" || toggleStatus.isPending}
                        className="text-xs text-yellow-500 hover:text-yellow-400 disabled:opacity-30"
                        title={u.role === "owner" ? "Cannot deactivate owner" : "Deactivate"}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleStatus.mutate({ id: u.id, isActive: true })}
                        disabled={toggleStatus.isPending}
                        className="text-xs text-green-400 hover:text-green-300"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </AdminTable>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{data.meta.total} users total</p>
            <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />
          </div>
        </>
      )}

      {editUser && (
        <ResetPasswordModal user={editUser} onClose={() => setEditUser(null)} />
      )}
      {sessionsUser && (
        <UserSessionsModal user={sessionsUser} onClose={() => setSessionsUser(null)} />
      )}
    </AdminPage>
  );
}

function ResetPasswordModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => adminUpdateUserPassword(user.id, password),
    onSuccess: () => { setDone(true); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Reset Password</h2>
        <p className="text-sm text-gray-400">{user.name} ({user.email})</p>
        {done ? (
          <p className="text-sm text-green-400">Password updated. All sessions have been revoked.</p>
        ) : (
          <>
            {mut.error && <p className="text-sm text-red-400">{String(mut.error)}</p>}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
            />
          </>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
            {done ? "Close" : "Cancel"}
          </button>
          {!done && (
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || password.length < 8}
              className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-md disabled:opacity-50"
            >
              {mut.isPending ? "Saving…" : "Update"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function UserSessionsModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-sessions", user.id],
    queryFn: () => adminGetUserSessions(user.id),
  });

  const revokeMut = useMutation({
    mutationFn: () => adminRevokeUserSessions(user.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-user-sessions", user.id] }),
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Active Sessions</h2>
            <p className="text-sm text-gray-400">{user.name} ({user.email})</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        {isLoading && <div className="text-gray-500 text-sm">Loading…</div>}

        {data && (
          <>
            {data.data.length === 0 ? (
              <p className="text-sm text-gray-500">No active sessions.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {data.data.map((s: AdminUserSession) => (
                  <div key={s.id} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">
                          {s.userAgent ? s.userAgent.slice(0, 60) + "…" : "Unknown device"}
                        </p>
                        <p className="text-xs text-gray-500">
                          IP: {s.ipAddress ?? "unknown"} · Last active: {formatDistanceToNow(new Date(s.lastActivity), { addSuffix: true })}
                        </p>
                        <p className="text-xs text-gray-600">
                          Expires: {new Date(s.expiresAt).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {data.data.length > 0 && (
              <button
                onClick={() => revokeMut.mutate()}
                disabled={revokeMut.isPending}
                className="w-full py-2 text-sm bg-red-700/60 hover:bg-red-700 text-red-200 rounded-md disabled:opacity-40"
              >
                {revokeMut.isPending ? "Revoking…" : `Revoke All ${data.data.length} Sessions`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
