import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Phone, MessageCircle, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomers, useDailySummary } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";
import BottomNav from "@/components/BottomNav";

const Customers = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: customers = [], isLoading } = useCustomers(search, 100);
  const { data: summary } = useDailySummary();

  const totalSales     = summary?.totalSales    ?? 0;
  const totalPayments  = summary?.totalPayments ?? 0;
  const pendingAmount  = summary?.pendingAmount ?? 0;
  const invoiceCount   = summary?.invoiceCount  ?? 0;
  const collectionRate = totalSales > 0 ? Math.round((totalPayments / totalSales) * 100) : 0;

  const sorted = [...customers].sort(
    (a, b) => parseFloat(String(b.balance)) - parseFloat(String(a.balance))
  );

  const outstanding = customers.reduce((s, c) => s + Math.max(0, parseFloat(String(c.balance))), 0);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-base font-bold md:text-lg">👥 Customers</h1>
            <p className="text-xs text-muted-foreground">
              {customers.length} total · ₹{formatCurrency(outstanding)} outstanding
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        {/* ── Business Key Metrics ── */}
        <div className="-mx-1 flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {[
            {
              label: "Today's Sales",
              value: formatCurrency(totalSales),
              icon: "📈",
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-blue-500/8",
            },
            {
              label: "Collected",
              value: formatCurrency(totalPayments),
              icon: "💰",
              color: "text-green-700 dark:text-green-400",
              bg: "bg-green-500/8",
            },
            {
              label: "Pending",
              value: formatCurrency(pendingAmount),
              icon: "⏳",
              color: "text-destructive",
              bg: "bg-destructive/8",
            },
            {
              label: "Invoices",
              value: String(invoiceCount),
              icon: "🧾",
              color: "text-foreground",
              bg: "bg-muted",
            },
            {
              label: "Collection %",
              value: `${collectionRate}%`,
              icon: collectionRate >= 80 ? "✅" : collectionRate >= 50 ? "🟡" : "🔴",
              color: collectionRate >= 80
                ? "text-green-700 dark:text-green-400"
                : collectionRate >= 50
                ? "text-yellow-700 dark:text-yellow-400"
                : "text-destructive",
              bg: "bg-muted",
            },
          ].map((m) => (
            <div
              key={m.label}
              className={`flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-4 py-2.5 ${m.bg}`}
            >
              <span className="text-base leading-none">{m.icon}</span>
              <p className={`text-sm font-bold tabular-nums ${m.color}`}>{m.value}</p>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-lg font-bold">{customers.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-lg font-bold text-destructive">
              {customers.filter((c) => parseFloat(String(c.balance)) > 0).length}
            </p>
            <p className="text-xs text-muted-foreground">Outstanding</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-lg font-bold text-green-600">
              {customers.filter((c) => parseFloat(String(c.balance)) === 0).length}
            </p>
            <p className="text-xs text-muted-foreground">Clear</p>
          </div>
        </div>

        {/* Customer list */}
        <div className="overflow-hidden rounded-xl border bg-card">
          {isLoading ? (
            <div className="divide-y">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-24 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <User className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search ? `No customers matching "${search}"` : "No customers yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {sorted.map((customer) => {
                const balance = parseFloat(String(customer.balance));
                const hasOutstanding = balance > 0;
                return (
                  <div
                    key={customer.id}
                    className="group flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-muted/30"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    {/* Avatar */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      hasOutstanding
                        ? "bg-destructive/10 text-destructive"
                        : "bg-green-500/10 text-green-700 dark:text-green-400"
                    }`}>
                      {customer.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.phone ?? "No phone"}</p>
                    </div>

                    {/* Balance */}
                    <div className="shrink-0 text-right">
                      {hasOutstanding ? (
                        <p className="text-sm font-bold text-destructive">
                          {formatCurrency(balance)}
                        </p>
                      ) : (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400">
                          Clear ✓
                        </span>
                      )}
                    </div>

                    {/* Quick actions (hover) */}
                    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {customer.phone && (
                        <button
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/10 text-green-700 hover:bg-green-500/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `https://wa.me/91${customer.phone!.replace(/\D/g, "")}`,
                              "_blank"
                            );
                          }}
                          title="WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {customer.phone && (
                        <a
                          href={`tel:${customer.phone}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-muted hover:bg-muted/70"
                          onClick={(e) => e.stopPropagation()}
                          title="Call"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Customers;
