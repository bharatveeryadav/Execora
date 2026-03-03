import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Phone, MessageCircle, Clock, FileText, CreditCard, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomer, useCustomerInvoices, useCustomerLedger, useReminders } from "@/hooks/useQueries";
import { LedgerEntry } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/api";
import BottomNav from "@/components/BottomNav";

const STATUS_STYLES: Record<string, string> = {
  paid:      "bg-green-500/10 text-green-700 dark:text-green-400",
  pending:   "bg-blue-500/10  text-blue-700  dark:text-blue-400",
  partial:   "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  draft:     "bg-muted         text-muted-foreground",
  proforma:  "bg-muted         text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive opacity-60",
};

const TABS = ["Overview", "Invoices", "Ledger", "Reminders"] as const;
type Tab = typeof TABS[number];

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Overview");

  const { data: customer, isLoading } = useCustomer(id!);
  const { data: invoices = [] } = useCustomerInvoices(id!);
  const { data: ledger = [] } = useCustomerLedger(id!) as { data: LedgerEntry[] };
  const { data: allReminders = [] } = useReminders(id);

  const balance = parseFloat(String(customer?.balance ?? 0));
  const totalBilled = invoices.reduce((s, inv) => s + parseFloat(String(inv.total ?? 0)), 0);
  const paidInvoices = invoices.filter((i) => i.status === "paid").length;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Customer not found</p>
        <Button onClick={() => navigate("/customers")}>← Back to Customers</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/customers")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {/* Avatar */}
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              balance > 0 ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-700 dark:text-green-400"
            }`}>
              {customer.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold">{customer.name}</h1>
              <p className="text-xs text-muted-foreground">{customer.phone ?? "No phone"}</p>
            </div>
            {/* Actions */}
            <div className="flex gap-2">
              {customer.phone && (
                <Button variant="ghost" size="icon" asChild title="WhatsApp">
                  <a
                    href={`https://wa.me/91${customer.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-5 w-5 text-green-600" />
                  </a>
                </Button>
              )}
              {customer.phone && (
                <Button variant="ghost" size="icon" asChild title="Call">
                  <a href={`tel:${customer.phone}`}>
                    <Phone className="h-5 w-5" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-3 flex gap-0 border-t">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 border-b-2 px-2 py-2 text-xs font-medium transition-colors ${
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        {/* ── OVERVIEW ── */}
        {tab === "Overview" && (
          <>
            {/* Outstanding balance hero */}
            <div className={`rounded-xl p-5 text-center ${
              balance > 0
                ? "border border-destructive/30 bg-destructive/5"
                : "border border-green-400/30 bg-green-500/5"
            }`}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Outstanding Balance
              </p>
              <p className={`mt-1 text-3xl font-extrabold ${balance > 0 ? "text-destructive" : "text-green-700 dark:text-green-400"}`}>
                {formatCurrency(balance)}
              </p>
              {balance > 0 && (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate(`/payment?customerId=${customer.id}`)}
                >
                  💰 Record Payment
                </Button>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border bg-card p-3 text-center">
                <TrendingUp className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-bold">{formatCurrency(totalBilled)}</p>
                <p className="text-xs text-muted-foreground">Total Billed</p>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <FileText className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-bold">{invoices.length}</p>
                <p className="text-xs text-muted-foreground">Invoices</p>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <CreditCard className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-bold">{paidInvoices}</p>
                <p className="text-xs text-muted-foreground">Paid</p>
              </div>
            </div>

            {/* Contact details */}
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Contact Info</p>
              {customer.phone && <p className="text-sm">📞 {customer.phone}</p>}
              {customer.email && <p className="text-sm">✉️ {customer.email}</p>}
              {(customer as any).address && <p className="text-sm">📍 {(customer as any).address}</p>}
              {(customer as any).gstin && <p className="text-sm font-mono text-xs">GST: {(customer as any).gstin}</p>}
            </div>
          </>
        )}

        {/* ── INVOICES ── */}
        {tab === "Invoices" && (
          <div className="overflow-hidden rounded-xl border bg-card">
            {invoices.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No invoices yet</div>
            ) : (
              <div className="divide-y">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{inv.invoiceNo}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_STYLES[inv.status] ?? ""}`}>
                      {inv.status}
                    </span>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatCurrency(parseFloat(String(inv.total ?? 0)))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LEDGER ── */}
        {tab === "Ledger" && (
          <div className="overflow-hidden rounded-xl border bg-card">
            {ledger.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No ledger entries</div>
            ) : (
              <div className="divide-y">
                {ledger.map((entry, i) => {
                  const isCharge = entry.type === "invoice";
                  return (
                    <div key={entry.id ?? i} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm capitalize">{entry.description ?? entry.type ?? "Transaction"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
                      </div>
                      <p className={`shrink-0 text-sm font-semibold ${isCharge ? "text-destructive" : "text-green-600"}`}>
                        {isCharge ? "+" : "-"}{formatCurrency(parseFloat(String(entry.amount ?? 0)))}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── REMINDERS ── */}
        {tab === "Reminders" && (
          <div className="overflow-hidden rounded-xl border bg-card">
            {allReminders.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No reminders</div>
            ) : (
              <div className="divide-y">
                {allReminders.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{(r as any).message ?? "Reminder"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.scheduledTime)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                      r.status === "sent" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"
                    }`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default CustomerDetail;
