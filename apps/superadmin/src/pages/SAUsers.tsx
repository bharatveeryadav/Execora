import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { saGetUsers, saUpdateUserStatus, saUpdateUserPassword, SAUser } from "@/lib/sa-api";
import {
  SAPage, SATable, TR, TD, Badge, Pagination, SALoading, SAError,
} from "@/components/SALayout";
import { formatDistanceToNow } from "date-fns";

export default function SAUsers() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [resetUser, setResetUser] = useState<SAUser | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["sa-users", page, q, role],
    queryFn: () => saGetUsers({ page, q: q || undefined, role: role || undefined }),
    placeholderData: (p) => p,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      saUpdateUserStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa-users"] }),
  });

  return (
    <SAPage title="Users" subtitle="All users across all tenants">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search users…"
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-amber-500 placeholder:text-gray-500"
        />
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
        >
          <option value="">All Roles</option>
          {["owner", "admin", "manager", "staff", "viewer"].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {isLoading && <SALoading />}
      {error && <SAError msg={String(error)} />}

      {data && (
        <>
          <SATable heads={["Name / Email", "Role", "Tenant", "Status", "Last Login", "Actions"]}>
            {data.data.map((u: SAUser) => (
              <TR key={u.id}>
                <TD>
                  <div className="font-medium text-white">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </TD>
                <TD><Badge value={u.role} /></TD>
                <TD>
                  <div className="text-xs text-gray-400 font-mono">{u.tenantId.slice(0, 8)}…</div>
                </TD>
                <TD><Badge value={u.isActive ? "active" : "inactive"} /></TD>
                <TD className="text-xs text-gray-500">
                  {u.lastLogin ? formatDistanceToNow(new Date(u.lastLogin), { addSuffix: true }) : "Never"}
                </TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setResetUser(u)}
                      className="text-xs text-amber-400 hover:text-amber-300"
                    >
                      Reset Pwd
                    </button>
                    <span className="text-gray-700">|</span>
                    {u.isActive ? (
                      <button
                        onClick={() => toggleStatus.mutate({ id: u.id, isActive: false })}
                        disabled={u.role === "owner" || toggleStatus.isPending}
                        className="text-xs text-yellow-500 hover:text-yellow-400 disabled:opacity-30"
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
          </SATable>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{data.meta.total} users total</p>
            <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />
          </div>
        </>
      )}

      {resetUser && (
        <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
      )}
    </SAPage>
  );
}

function ResetPasswordModal({ user, onClose }: { user: SAUser; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const mut = useMutation({
    mutationFn: () => saUpdateUserPassword(user.id, password),
    onSuccess: () => setDone(true),
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Reset Password</h2>
        <p className="text-sm text-gray-400">{user.name} ({user.email})</p>
        {done ? (
          <p className="text-sm text-green-400">Password updated successfully.</p>
        ) : (
          <>
            {mut.error && <p className="text-sm text-red-400">{String(mut.error)}</p>}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
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
              className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-md disabled:opacity-50"
            >
              {mut.isPending ? "Saving…" : "Update"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
