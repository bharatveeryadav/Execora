import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminGetTenants, adminGetTenant, adminCreateTenant,
  adminSuspendTenant, adminActivateTenant, adminDeleteTenant,
  adminUpdateTenant, AdminTenant, AdminTenantDetail,
} from "@/lib/admin-api";
import {
  AdminPage, AdminTable, TR, TD, Badge, Pagination, AdminLoading, AdminError,
} from "@/components/AdminLayout";
import { formatDistanceToNow } from "date-fns";

const PLAN_OPTIONS = ["free", "pro", "enterprise"];
const STATUS_OPTIONS = ["", "active", "suspended", "trial", "expired"];

export default function AdminTenants() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminTenant | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-tenants", page, q, plan, status],
    queryFn: () => adminGetTenants({ page, q: q || undefined, plan: plan || undefined, status: status || undefined }),
    placeholderData: (prev) => prev,
  });

  const suspendMut = useMutation({
    mutationFn: (id: string) => adminSuspendTenant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tenants"] }),
  });
  const activateMut = useMutation({
    mutationFn: (id: string) => adminActivateTenant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tenants"] }),
  });

  function refetchAll() { qc.invalidateQueries({ queryKey: ["admin-tenants"] }); }

  return (
    <AdminPage
      title="Tenants"
      subtitle="All registered businesses"
      actions={
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-md transition-colors"
        >
          + New Tenant
        </button>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search tenants…"
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-violet-500 placeholder:text-gray-500"
        />
        <select
          value={plan}
          onChange={(e) => { setPlan(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500"
        >
          <option value="">All Plans</option>
          {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500"
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === "" ? "All Status" : s}</option>)}
        </select>
      </div>

      {isLoading && <AdminLoading />}
      {error && <AdminError msg={String(error)} />}

      {data && (
        <>
          <AdminTable heads={["Name", "Plan", "Status", "Users", "Customers", "Invoices", "Created", "Actions"]}>
            {data.data.map((t: AdminTenant) => (
              <TR key={t.id}>
                <TD>
                  <button
                    onClick={() => setDetailId(t.id)}
                    className="text-left hover:text-violet-300 transition-colors"
                  >
                    <div className="font-medium text-white">{t.name}</div>
                    {t.legalName && <div className="text-xs text-gray-500">{t.legalName}</div>}
                    {t.gstin && <div className="text-xs text-gray-600 font-mono">{t.gstin}</div>}
                  </button>
                </TD>
                <TD><Badge value={t.plan} /></TD>
                <TD><Badge value={t.status} /></TD>
                <TD>{t._count?.users ?? "—"}</TD>
                <TD>{t._count?.customers ?? "—"}</TD>
                <TD>{t._count?.invoices ?? "—"}</TD>
                <TD className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                </TD>
                <TD>
                  <div className="flex items-center gap-2">
                    {t.status !== "suspended" ? (
                      <button
                        onClick={() => suspendMut.mutate(t.id)}
                        disabled={suspendMut.isPending}
                        className="text-xs text-yellow-400 hover:text-yellow-300 disabled:opacity-40"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => activateMut.mutate(t.id)}
                        disabled={activateMut.isPending}
                        className="text-xs text-green-400 hover:text-green-300 disabled:opacity-40"
                      >
                        Activate
                      </button>
                    )}
                    <span className="text-gray-700">|</span>
                    <button
                      onClick={() => setConfirmDelete(t)}
                      className="text-xs text-red-500 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </AdminTable>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{data.meta.total} tenants total</p>
            <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />
          </div>
        </>
      )}

      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { refetchAll(); setShowCreate(false); }}
        />
      )}
      {detailId && (
        <TenantDetailDrawer
          id={detailId}
          onClose={() => setDetailId(null)}
          onChanged={refetchAll}
        />
      )}
      {confirmDelete && (
        <DeleteTenantModal
          tenant={confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onDeleted={() => { refetchAll(); setConfirmDelete(null); }}
        />
      )}
    </AdminPage>
  );
}

// ── Tenant Detail Drawer ──────────────────────────────────────────────────
function TenantDetailDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const [editPlan, setEditPlan] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tenant", id],
    queryFn: () => adminGetTenant(id),
  });

  const updateMut = useMutation({
    mutationFn: (body: Parameters<typeof adminUpdateTenant>[1]) => adminUpdateTenant(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tenant", id] });
      onChanged();
      setEditPlan(null);
    },
  });

  const tenant: AdminTenantDetail | undefined = data?.tenant;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gray-900 border-l border-gray-700 overflow-y-auto p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{tenant?.name ?? "Loading…"}</h2>
            {tenant?.legalName && <p className="text-sm text-gray-400">{tenant.legalName}</p>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
        </div>

        {isLoading && <div className="text-gray-500 text-sm">Loading…</div>}

        {tenant && (
          <>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge value={tenant.status} />
              {editPlan ? (
                <div className="flex gap-2 items-center">
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs"
                  >
                    {PLAN_OPTIONS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                  <button
                    onClick={() => updateMut.mutate({ plan: editPlan })}
                    disabled={updateMut.isPending}
                    className="text-xs text-green-400 hover:text-green-300"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditPlan(null)} className="text-xs text-gray-500">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Badge value={tenant.plan} />
                  <button onClick={() => setEditPlan(tenant.plan)} className="text-xs text-violet-400 hover:text-violet-300">change</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["GSTIN", tenant.gstin ?? "—"],
                ["Currency", tenant.currency],
                ["GST Registered", tenant.gstRegistered ? "Yes" : "No"],
                ["Business Type", tenant.businessType ?? "—"],
                ["Created", new Date(tenant.createdAt).toLocaleDateString("en-IN")],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-gray-500">{k}</p>
                  <p className="text-white">{v}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(["users", "customers", "invoices", "payments", "reminders"] as const).map((k) => (
                <div key={k} className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-white">{tenant._count[k]}</p>
                  <p className="text-xs text-gray-400 capitalize">{k}</p>
                </div>
              ))}
            </div>

            {tenant.users.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Users</h3>
                <div className="space-y-2">
                  {tenant.users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm text-white">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge value={u.role} />
                        {!u.isActive && <span className="text-xs text-red-400">inactive</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CreateTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "", ownerEmail: "", ownerName: "", ownerPassword: "",
    businessType: "retail", plan: "free",
  });
  const [err, setErr] = useState("");
  const mut = useMutation({ mutationFn: adminCreateTenant, onSuccess: onCreated, onError: (e: Error) => setErr(e.message) });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Create Tenant</h2>
        {err && <p className="text-sm text-red-400">{err}</p>}
        {[
          { key: "name", label: "Business Name", type: "text" },
          { key: "ownerEmail", label: "Owner Email", type: "email" },
          { key: "ownerName", label: "Owner Name", type: "text" },
          { key: "ownerPassword", label: "Owner Password", type: "password" },
        ].map(({ key, label, type }) => (
          <div key={key}>
            <label className="text-xs text-gray-400 mb-1 block">{label}</label>
            <input
              type={type}
              value={(form as Record<string, string>)[key]}
              onChange={(e) => set(key, e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Type</label>
            <select value={form.businessType} onChange={(e) => set("businessType", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm">
              {["retail", "kirana", "wholesale", "cosmetics"].map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Plan</label>
            <select value={form.plan} onChange={(e) => set("plan", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm">
              {["free", "pro", "enterprise"].map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={() => mut.mutate(form)}
            disabled={mut.isPending || !form.name || !form.ownerEmail || !form.ownerPassword}
            className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-md disabled:opacity-50"
          >
            {mut.isPending ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
