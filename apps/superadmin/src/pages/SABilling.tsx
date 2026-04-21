import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  saGetTenants, saGetTenantBilling, saExtendTrial, saChangePlan,
  saAddCredits, saSuspendTenant, saReactivateTenant,
  SATenant, SABillingEvent, SATenantCredit,
} from "@/lib/sa-api";
import {
  SAPage, SATable, TR, TD, Badge, SALoading, SAError, Pagination,
} from "@/components/SALayout";
import { ChevronRight, CalendarPlus, ArrowUpDown, Gift, Pause, Play } from "lucide-react";
import { format } from "date-fns";

const PLAN_OPTIONS = ["free", "pro", "enterprise"];

const EVENT_LABELS: Record<SABillingEvent["type"], string> = {
  plan_change: "Plan Changed",
  trial_extended: "Trial Extended",
  credits_added: "Credits Added",
  subscription_renewed: "Subscription Renewed",
  suspended: "Suspended",
  reactivated: "Reactivated",
};

// ── Extend Trial Modal ───────────────────────────────────────────────────────
function ExtendTrialModal({ tenant, onClose }: { tenant: SATenant; onClose: () => void }) {
  const [days, setDays] = useState(14);
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => saExtendTrial(tenant.id, days, note || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sa-billing", tenant.id] }); qc.invalidateQueries({ queryKey: ["sa-tenants"] }); onClose(); },
  });
  return (
    <Modal title={`Extend Trial — ${tenant.name}`} onClose={onClose}>
      <label className="block text-xs text-gray-400 mb-1">Days to extend</label>
      <input type="number" min={1} max={365} value={days}
        onChange={e => setDays(Number(e.target.value))}
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white mb-3" />
      <label className="block text-xs text-gray-400 mb-1">Note (optional)</label>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for extension..."
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white mb-4" />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending}
          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded disabled:opacity-50">
          {mut.isPending ? "Saving…" : "Extend Trial"}
        </button>
      </div>
      {mut.isError && <p className="text-red-400 text-xs mt-2">{(mut.error as Error).message}</p>}
    </Modal>
  );
}

// ── Change Plan Modal ────────────────────────────────────────────────────────
function ChangePlanModal({ tenant, onClose }: { tenant: SATenant; onClose: () => void }) {
  const [plan, setPlan] = useState(tenant.plan);
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => saChangePlan(tenant.id, plan, note || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sa-billing", tenant.id] }); qc.invalidateQueries({ queryKey: ["sa-tenants"] }); onClose(); },
  });
  return (
    <Modal title={`Change Plan — ${tenant.name}`} onClose={onClose}>
      <label className="block text-xs text-gray-400 mb-1">New Plan</label>
      <select value={plan} onChange={e => setPlan(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white mb-3">
        {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <label className="block text-xs text-gray-400 mb-1">Note (optional)</label>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for plan change..."
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white mb-4" />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending || plan === tenant.plan}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded disabled:opacity-50">
          {mut.isPending ? "Saving…" : "Change Plan"}
        </button>
      </div>
      {mut.isError && <p className="text-red-400 text-xs mt-2">{(mut.error as Error).message}</p>}
    </Modal>
  );
}

// ── Add Credits Modal ────────────────────────────────────────────────────────
function AddCreditsModal({ tenant, onClose }: { tenant: SATenant; onClose: () => void }) {
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => saAddCredits(tenant.id, amount, reason, expiresAt || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sa-billing", tenant.id] }); onClose(); },
  });
  return (
    <Modal title={`Add Credits — ${tenant.name}`} onClose={onClose}>
      <label className="block text-xs text-gray-400 mb-1">Amount</label>
      <input type="number" min={1} value={amount} onChange={e => setAmount(Number(e.target.value))}
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white mb-3" />
      <label className="block text-xs text-gray-400 mb-1">Reason *</label>
      <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Promotional credit"
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white mb-3" />
      <label className="block text-xs text-gray-400 mb-1">Expires At (optional)</label>
      <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white mb-4" />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !reason}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded disabled:opacity-50">
          {mut.isPending ? "Saving…" : "Add Credits"}
        </button>
      </div>
      {mut.isError && <p className="text-red-400 text-xs mt-2">{(mut.error as Error).message}</p>}
    </Modal>
  );
}

// ── Billing Detail Panel ─────────────────────────────────────────────────────
function BillingDetail({ tenant }: { tenant: SATenant }) {
  const [extendOpen, setExtendOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["sa-billing", tenant.id],
    queryFn: () => saGetTenantBilling(tenant.id),
  });

  const suspendMut = useMutation({
    mutationFn: () => saSuspendTenant(tenant.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sa-billing", tenant.id] }); qc.invalidateQueries({ queryKey: ["sa-tenants"] }); },
  });
  const reactivateMut = useMutation({
    mutationFn: () => saReactivateTenant(tenant.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sa-billing", tenant.id] }); qc.invalidateQueries({ queryKey: ["sa-tenants"] }); },
  });

  if (isLoading) return <SALoading />;
  if (error) return <SAError msg={(error as Error).message} />;
  if (!data) return null;

  const t = data.tenant;

  return (
    <div className="space-y-6">
      {/* Tenant Info Card */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-white font-semibold text-lg">{t.name}</h3>
            <p className="text-gray-400 text-sm mt-0.5">{t.id}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge value={t.plan} />
              <Badge value={t.status} />
            </div>
            {t.plan === "trial" || t.status === "trial" ? (
              <p className="text-amber-400 text-xs mt-1">
                Trial ends: {t.trialEndsAt ? format(new Date(t.trialEndsAt), "dd MMM yyyy") : "—"}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setExtendOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/80 hover:bg-amber-500 text-white text-xs rounded">
              <CalendarPlus className="w-3.5 h-3.5" /> Extend Trial
            </button>
            <button onClick={() => setPlanOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-500 text-white text-xs rounded">
              <ArrowUpDown className="w-3.5 h-3.5" /> Change Plan
            </button>
            <button onClick={() => setCreditsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/80 hover:bg-green-500 text-white text-xs rounded">
              <Gift className="w-3.5 h-3.5" /> Add Credits
            </button>
            {t.status === "suspended" ? (
              <button onClick={() => reactivateMut.mutate()} disabled={reactivateMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700/80 hover:bg-green-600 text-white text-xs rounded disabled:opacity-50">
                <Play className="w-3.5 h-3.5" /> Reactivate
              </button>
            ) : (
              <button onClick={() => suspendMut.mutate()} disabled={suspendMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white text-xs rounded disabled:opacity-50">
                <Pause className="w-3.5 h-3.5" /> Suspend
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Credits */}
      {data.credits.length > 0 && (
        <div>
          <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Active Credits</h4>
          <SATable heads={["Amount", "Reason", "Expires", "Granted", "Date"]}>
            {data.credits.map((c: SATenantCredit) => (
              <TR key={c.id}>
                <TD><span className="text-green-400 font-semibold">{c.amount}</span></TD>
                <TD>{c.reason}</TD>
                <TD>{c.expiresAt ? format(new Date(c.expiresAt), "dd MMM yyyy") : "Never"}</TD>
                <TD>{c.grantedBy}</TD>
                <TD>{format(new Date(c.createdAt), "dd MMM yyyy")}</TD>
              </TR>
            ))}
          </SATable>
        </div>
      )}

      {/* Billing History */}
      <div>
        <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Billing History</h4>
        {data.events.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No billing events yet</p>
        ) : (
          <SATable heads={["Event", "Details", "By", "Date"]}>
            {data.events.map((e: SABillingEvent) => (
              <TR key={e.id}>
                <TD><Badge value={EVENT_LABELS[e.type]} /></TD>
                <TD>
                  {e.type === "plan_change" && <span className="text-gray-300">{e.fromPlan} → {e.toPlan}</span>}
                  {e.type === "suspended" && <span className="text-gray-300">{e.fromStatus} → suspended</span>}
                  {e.type === "reactivated" && <span className="text-gray-300">{e.fromStatus} → active</span>}
                  {e.note && <span className="text-gray-400 text-xs ml-1">({e.note})</span>}
                  {!e.fromPlan && !e.fromStatus && e.note && <span className="text-gray-300">{e.note}</span>}
                </TD>
                <TD>{e.performedBy}</TD>
                <TD>{format(new Date(e.createdAt), "dd MMM yyyy HH:mm")}</TD>
              </TR>
            ))}
          </SATable>
        )}
      </div>

      {extendOpen && <ExtendTrialModal tenant={t} onClose={() => setExtendOpen(false)} />}
      {planOpen && <ChangePlanModal tenant={t} onClose={() => setPlanOpen(false)} />}
      {creditsOpen && <AddCreditsModal tenant={t} onClose={() => setCreditsOpen(false)} />}
    </div>
  );
}

// ── Generic Modal wrapper ────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SABilling() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<SATenant | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["sa-tenants", page, q],
    queryFn: () => saGetTenants({ page, q: q || undefined, limit: 20 }),
    placeholderData: p => p,
  });

  return (
    <SAPage title="Billing & Subscriptions" subtitle="Manage tenant plans, trials, and credits">
      {selectedTenant ? (
        <div>
          <button onClick={() => setSelectedTenant(null)}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm mb-4">
            ← Back to tenants
          </button>
          <BillingDetail tenant={selectedTenant} />
        </div>
      ) : (
        <>
          <div className="mb-3">
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search tenants…"
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 w-72" />
          </div>
          {isLoading && <SALoading />}
          {error && <SAError msg={(error as Error).message} />}
          {data && (
            <>
              <SATable heads={["Tenant", "Plan", "Status", "Trial Ends", ""]}>
                {data.data.map((t: SATenant) => (
                  <TR key={t.id}>
                    <TD>
                      <div className="font-medium text-white">{t.name}</div>
                      <div className="text-gray-500 text-xs">{t.id.slice(0, 8)}…</div>
                    </TD>
                    <TD><Badge value={t.plan} /></TD>
                    <TD><Badge value={t.status} /></TD>
                    <TD>{t.trialEndsAt ? format(new Date(t.trialEndsAt), "dd MMM yyyy") : "—"}</TD>
                    <TD>
                      <button onClick={() => setSelectedTenant(t)}
                        className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs">
                        Manage <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </TD>
                  </TR>
                ))}
              </SATable>
              <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />
            </>
          )}
        </>
      )}
    </SAPage>
  );
}
