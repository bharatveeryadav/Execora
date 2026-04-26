import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  saGetTenants, saCreateTenant, saUpdateTenant, saDeleteTenant, saUpdateTenantFeatures,
  saGetTenantQuota, saUpdateTenantQuota, saGetTenant, saImpersonateTenant,
  saSendPlatformEmail, saUpdateTenantOwnerCredentials, SATenant, SATenantDetail, SATenantQuota,
} from "@/lib/sa-api";
import {
  SAPage, SATable, TR, TD, Badge, Pagination, SALoading, SAError,
} from "@/components/SALayout";
import { Plus, Trash2, ChevronRight, ToggleLeft, UserPlus } from "lucide-react";

const PLAN_OPTIONS = ["free", "pro", "enterprise"];
const STATUS_OPTIONS = ["active", "suspended", "trial", "expired"];
const FEATURE_FLAGS: { key: string; label: string }[] = [
  { key: "inventory",            label: "Inventory Management" },
  { key: "customer_credit",      label: "Customer Credit" },
  { key: "batch_tracking",       label: "Batch Tracking" },
  { key: "variants",             label: "Product Variants" },
  { key: "loyalty",              label: "Loyalty Program" },
  { key: "reports",              label: "Reports" },
  { key: "whatsapp",             label: "WhatsApp" },
  { key: "email",                label: "Email" },
  { key: "sms",                  label: "SMS" },
  { key: "advanced_reminders",   label: "Advanced Reminders" },
  { key: "voice_recording",      label: "Voice Recording" },
  { key: "customer_documents",   label: "Customer Documents" },
  { key: "multi_conversation",   label: "Multi Conversation" },
  { key: "conversation_queue",   label: "Conversation Queue" },
  { key: "gst_enabled",          label: "GST Enabled" },
  { key: "gst_filing",           label: "GST Filing" },
];

export default function SATenants() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SATenant | null>(null);
  const [editTarget, setEditTarget] = useState<SATenant | null>(null);
  const [featuresTarget, setFeaturesTarget] = useState<SATenant | null>(null);
  const [quotaTarget, setQuotaTarget] = useState<SATenant | null>(null);
  const [credentialsTarget, setCredentialsTarget] = useState<SATenant | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["sa-tenants", page, q, plan, status],
    queryFn: () => saGetTenants({ page, q: q || undefined, plan: plan || undefined, status: status || undefined }),
    placeholderData: (p) => p,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["sa-tenants"] });

  const impersonateTenant = async (tenant: SATenant) => {
    try {
      const { token } = await saImpersonateTenant(tenant.id);
      const url = `/admin?impersonation_token=${encodeURIComponent(token)}`;
      window.open(url, "_blank");
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <SAPage
      title="Tenants"
      subtitle="All business tenants on the platform"
      actions={
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-sm"
        >
          <Plus className="w-4 h-4" />
          New Tenant
        </button>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search tenants…"
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-amber-500 placeholder:text-gray-500"
        />
        <select
          value={plan}
          onChange={(e) => { setPlan(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
        >
          <option value="">All Plans</option>
          {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading && <SALoading />}
      {error && <SAError msg={String(error)} />}

      {data && (
        <>
          <SATable heads={["Tenant", "Plan", "Status", "Users", "Invoices", "Created", "Actions"]}>
            {data.data.map((t: SATenant) => (
              <TR key={t.id}>
                <TD>
                  <div className="font-medium text-white">{t.name}</div>
                  {t.legalName && <div className="text-xs text-gray-500">{t.legalName}</div>}
                  <div className="text-xs text-gray-600 font-mono">{t.id.slice(0, 8)}…</div>
                </TD>
                <TD><Badge value={t.plan} /></TD>
                <TD><Badge value={t.status} /></TD>
                <TD className="text-center">{t._count?.users ?? "—"}</TD>
                <TD className="text-center">{t._count?.invoices ?? "—"}</TD>
                <TD className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString("en-IN")}</TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditTarget(t)}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                    >
                      Edit <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setFeaturesTarget(t)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                      title="Feature Flags"
                    >
                      <ToggleLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => impersonateTenant(t)}
                      className="text-xs text-green-400 hover:text-green-300 flex items-center gap-0.5"
                      title="Impersonate Tenant"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCredentialsTarget(t)}
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                      title="Change tenant admin login details"
                    >
                      Owner Login
                    </button>
                    <button
                      onClick={() => setQuotaTarget(t)}
                      className="text-xs text-violet-400 hover:text-violet-300"
                      title="Tenant quota"
                    >
                      Quota
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="text-red-500/60 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </SATable>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{data.meta.total} tenants total</p>
            <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />
          </div>
        </>
      )}

      {createOpen && (
        <CreateTenantModal onClose={() => setCreateOpen(false)} onCreated={invalidate} />
      )}
      {deleteTarget && (
        <DeleteTenantModal tenant={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={invalidate} />
      )}
      {editTarget && (
        <EditTenantModal tenant={editTarget} onClose={() => setEditTarget(null)} onSaved={invalidate} />
      )}
      {quotaTarget && (
        <TenantQuotaModal tenant={quotaTarget} onClose={() => setQuotaTarget(null)} />
      )}
      {featuresTarget && (
        <FeatureFlagsModal tenant={featuresTarget} onClose={() => setFeaturesTarget(null)} onSaved={invalidate} />
      )}
      {credentialsTarget && (
        <OwnerCredentialsModal tenant={credentialsTarget} onClose={() => setCredentialsTarget(null)} onSaved={invalidate} />
      )}
    </SAPage>
  );
}

function generatePassword(length = 14): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(length);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

function buildOwnerCredentialMessage(tenantName: string, email: string, password: string): string {
  return [
    `Tenant: ${tenantName}`,
    `Login Email: ${email}`,
    `Temporary Password: ${password}`,
    "Please sign in and change this password immediately.",
  ].join("\n");
}

// ── Create modal ───────────────────────────────────────────────────────────
function CreateTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "", ownerEmail: "", ownerName: "", ownerPassword: "",
    businessType: "retail", plan: "trial",
  });
  const [err, setErr] = useState("");
  const mut = useMutation({
    mutationFn: () => saCreateTenant(form),
    onSuccess: () => { onCreated(); onClose(); },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">New Tenant</h2>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div className="space-y-3">
          {([
            ["name", "Business Name", "text"],
            ["ownerName", "Owner Name", "text"],
            ["ownerEmail", "Owner Email", "email"],
            ["ownerPassword", "Owner Password", "password"],
          ] as [keyof typeof form, string, string][]).map(([key, label, type]) => (
            <div key={key}>
              <label className="text-xs text-gray-400 mb-1 block">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Business Type</label>
              <select
                value={form.businessType}
                onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              >
                {["retail", "wholesale", "service", "manufacturing", "other"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              >
                {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={() => mut.mutate()}
            disabled={!form.name || !form.ownerEmail || !form.ownerPassword || mut.isPending}
            className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-md disabled:opacity-40"
          >
            {mut.isPending ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit modal ─────────────────────────────────────────────────────────────
function EditTenantModal({ tenant, onClose, onSaved }: { tenant: SATenant; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: tenant.name, plan: tenant.plan, status: tenant.status });
  const [err, setErr] = useState("");
  const mut = useMutation({
    mutationFn: () => saUpdateTenant(tenant.id, form),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Edit Tenant — {tenant.name}</h2>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Business Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-2 py-2 text-sm focus:outline-none focus:border-amber-500"
              >
                {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-2 py-2 text-sm focus:outline-none focus:border-amber-500"
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-md disabled:opacity-40"
          >
            {mut.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete modal ───────────────────────────────────────────────────────────
function DeleteTenantModal({ tenant, onClose, onDeleted }: { tenant: SATenant; onClose: () => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const mut = useMutation({
    mutationFn: () => saDeleteTenant(tenant.id, confirm),
    onSuccess: onDeleted,
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-red-800 w-full max-w-md p-6 space-y-4">
        <h2 className="text-base font-semibold text-red-400">Delete Tenant</h2>
        <p className="text-sm text-gray-400">
          Permanently deletes <strong className="text-white">{tenant.name}</strong> and all its data.{" "}
          <span className="text-red-400 font-medium">Cannot be undone.</span>
        </p>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Type <span className="text-white font-mono">{tenant.name}</span> to confirm
          </label>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-red-500"
            placeholder={tenant.name}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={() => mut.mutate()}
            disabled={confirm !== tenant.name || mut.isPending}
            className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 text-white rounded-md disabled:opacity-40"
          >
            {mut.isPending ? "Deleting…" : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Feature Flags Modal ─────────────────────────────────────────────────────
function FeatureFlagsModal({ tenant, onClose, onSaved }: { tenant: SATenant; onClose: () => void; onSaved: () => void }) {
  const defaultFeatures: Record<string, boolean> = FEATURE_FLAGS.reduce((acc, f) => ({ ...acc, [f.key]: false }), {});
  const initial = { ...defaultFeatures, ...((tenant.features ?? {}) as Record<string, boolean>) };
  const [flags, setFlags] = useState<Record<string, boolean>>(initial);
  const [err, setErr] = useState("");

  const mut = useMutation({
    mutationFn: () => saUpdateTenantFeatures(tenant.id, flags),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg p-6">
        <h2 className="text-base font-semibold text-white mb-1">Feature Flags — {tenant.name}</h2>
        <p className="text-xs text-gray-500 mb-4">Override plan-level features for this tenant only.</p>
        {err && <p className="text-sm text-red-400 mb-3">{err}</p>}
        <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto mb-4">
          {FEATURE_FLAGS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2.5 px-3 py-2 bg-gray-800/60 rounded cursor-pointer hover:bg-gray-800">
              <input
                type="checkbox"
                checked={!!flags[key]}
                onChange={e => setFlags(f => ({ ...f, [key]: e.target.checked }))}
                className="accent-amber-500 w-4 h-4"
              />
              <span className="text-sm text-gray-300">{label}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button onClick={() => mut.mutate()} disabled={mut.isPending}
            className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-md disabled:opacity-40">
            {mut.isPending ? "Saving…" : "Save Flags"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Owner Credentials Modal ────────────────────────────────────────────────
function OwnerCredentialsModal({ tenant, onClose, onSaved }: { tenant: SATenant; onClose: () => void; onSaved: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["sa-tenant-detail", tenant.id],
    queryFn: () => saGetTenant(tenant.id),
  });
  const owner = data?.tenant.users.find((user) => user.role === "owner") ?? null;
  const [form, setForm] = useState({ email: "", name: "", password: "" });
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!owner) return;
    setForm({ email: owner.email, name: owner.name, password: "" });
  }, [owner]);

  const mut = useMutation({
    mutationFn: () => saUpdateTenantOwnerCredentials(tenant.id, {
      email: form.email.trim(),
      name: form.name.trim(),
      newPassword: form.password.trim() || undefined,
    }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (mutationError: Error) => setErr(mutationError.message),
  });

  const recoveryMut = useMutation({
    mutationFn: async ({ sendEmail }: { sendEmail: boolean }) => {
      const password = generatePassword();
      const email = form.email.trim();
      const name = form.name.trim();
      const message = buildOwnerCredentialMessage(tenant.name, email, password);

      await saUpdateTenantOwnerCredentials(tenant.id, {
        email,
        name,
        newPassword: password,
      });

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      }

      if (sendEmail) {
        await saSendPlatformEmail(
          `Execora login reset for ${tenant.name}`,
          `Hello ${name},\n\n${message}\n\nIf you did not request this reset, contact support immediately.`,
          [email],
        );
      }

      return { password, sendEmail };
    },
    onSuccess: ({ password, sendEmail }) => {
      setErr("");
      setForm((current) => ({ ...current, password }));
      setInfo(sendEmail ? "Temporary password reset, copied, and emailed to tenant owner." : "Temporary password reset and copied to clipboard.");
      onSaved();
    },
    onError: (mutationError: Error) => setErr(mutationError.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">Owner Credentials</h2>
          <p className="text-sm text-gray-400">{tenant.name}</p>
        </div>
        {isLoading && <p className="text-sm text-gray-400">Loading tenant owner…</p>}
        {error && <p className="text-sm text-red-400">{String(error)}</p>}
        {!isLoading && !error && !owner && (
          <p className="text-sm text-red-400">No owner account found for this tenant.</p>
        )}
        {!isLoading && !error && owner && (
          <>
            {err && <p className="text-sm text-red-400">{err}</p>}
            {info && <p className="text-sm text-green-400">{info}</p>}
            <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-400">
              Saving here updates the tenant owner login and revokes active sessions automatically.
            </div>
            <div className="rounded-lg border border-cyan-900/60 bg-cyan-950/20 p-3 space-y-2">
              <p className="text-xs text-cyan-200">Quick recovery</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => recoveryMut.mutate({ sendEmail: false })}
                  disabled={recoveryMut.isPending || !form.email.trim() || !form.name.trim()}
                  className="px-3 py-2 text-xs bg-cyan-700 hover:bg-cyan-600 text-white rounded-md disabled:opacity-40"
                >
                  {recoveryMut.isPending ? "Resetting…" : "Reset + Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => recoveryMut.mutate({ sendEmail: true })}
                  disabled={recoveryMut.isPending || !form.email.trim() || !form.name.trim()}
                  className="px-3 py-2 text-xs bg-sky-700 hover:bg-sky-600 text-white rounded-md disabled:opacity-40"
                >
                  {recoveryMut.isPending ? "Sending…" : "Reset + Email"}
                </button>
              </div>
              <p className="text-[11px] text-cyan-100/80">These actions generate a temporary password automatically, revoke old sessions, and copy the new login details for you.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Owner Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Owner Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400 block">Temporary Password</label>
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, password: generatePassword() }))}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                  placeholder="Leave blank to keep current password"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          {owner && (
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || recoveryMut.isPending || !form.email.trim() || !form.name.trim() || (form.password.length > 0 && form.password.length < 8)}
              className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-md disabled:opacity-40"
            >
              {mut.isPending ? "Saving…" : "Save Credentials"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TenantQuotaModal({ tenant, onClose }: { tenant: SATenant; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["tenant-quota", tenant.id],
    queryFn: () => saGetTenantQuota(tenant.id),
  });
  const quota = data?.quota;
  const [form, setForm] = useState<Partial<SATenantQuota>>(quota || {});
  const mut = useMutation({
    mutationFn: () => saUpdateTenantQuota(tenant.id, form),
    onSuccess: onClose,
  });
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-white mb-1">Tenant Quota — {tenant.name}</h2>
        {isLoading ? <div className="text-gray-400">Loading…</div> : (
          <form
            className="space-y-3"
            onSubmit={e => { e.preventDefault(); mut.mutate(); }}
          >
            {["maxUsers", "maxInvoices", "maxStorage", "maxCustomers", "maxProducts"].map((key) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{key.replace("max", "Max ")}</label>
                <input
                  type="number"
                  value={form[key] ?? ""}
                  onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <input
                value={form.notes ?? ""}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={onClose} type="button" className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
              <button type="submit" disabled={mut.isPending}
                className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-md disabled:opacity-40">
                {mut.isPending ? "Saving…" : "Save Quota"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
