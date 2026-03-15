import { useState, useImperativeHandle, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Phone,
  MessageCircle,
  ChevronRight,
  User,
  Plus,
  Users,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Mail,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCustomers, useCreateCustomer, useInvoices } from "@/hooks/useQueries";
import { useWsInvalidation } from "@/hooks/useWsInvalidation";
import { Customer, formatCurrency } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const CUSTOMER_TAGS = ["VIP", "Wholesale", "Blacklist", "Regular"] as const;
type FilterTab = "all" | "outstanding" | "clear" | "aging";

export type CustomersRef = { openAdd: () => void };

const Customers = forwardRef<CustomersRef, { embedded?: boolean }>(
  ({ embedded = false }, ref) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [searchOpen, setSearchOpen] = useState(false);

  // ── Add Customer dialog state ──────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newLandmark, setNewLandmark] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newOpeningBal, setNewOpeningBal] = useState("");
  const [newCreditLimit, setNewCreditLimit] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);

  const { data: customers = [], isLoading } = useCustomers(search, 200);
  const { data: invoices = [] } = useInvoices(1000);
  const createCustomer = useCreateCustomer();
  useWsInvalidation(["customers", "summary"]);

  const outstanding = customers.reduce(
    (s, c) => s + Math.max(0, parseFloat(String(c.balance))),
    0,
  );

  // ── Filtering ─────────────────────────────────────────────────────────────
  const outCount = customers.filter(
    (c) => parseFloat(String(c.balance)) > 0,
  ).length;
  const clearCount = customers.filter(
    (c) => parseFloat(String(c.balance)) <= 0,
  ).length;

  // ── Khata aging (GAP-11) ──────────────────────────────────────────────────
  // For each customer with outstanding balance, find the oldest unpaid invoice
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const agingMap = new Map<string, number>(); // customerId → days since oldest unpaid
  for (const inv of invoices) {
    if (inv.status === "paid" || inv.status === "cancelled") continue;
    const remaining =
      parseFloat(String(inv.total)) - parseFloat(String(inv.paidAmount));
    if (remaining <= 0) continue;
    const invDate = new Date(inv.invoiceDate ?? inv.createdAt);
    invDate.setHours(0, 0, 0, 0);
    const days = Math.floor(
      (today.getTime() - invDate.getTime()) / 86_400_000,
    );
    const existing = agingMap.get(inv.customerId);
    if (existing === undefined || days > existing) {
      agingMap.set(inv.customerId, days);
    }
  }

  // Customers with outstanding balance, bucketed by days
  const agingCustomers = customers
    .filter((c) => parseFloat(String(c.balance)) > 0)
    .map((c) => ({ ...c, ageDays: agingMap.get(c.id) ?? 0 }))
    .sort((a, b) => b.ageDays - a.ageDays);

  const agingBuckets = [
    {
      label: "60+ Days",
      sublabel: "Very Overdue",
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/30",
      items: agingCustomers.filter((c) => c.ageDays >= 60),
    },
    {
      label: "31–60 Days",
      sublabel: "Overdue",
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      items: agingCustomers.filter(
        (c) => c.ageDays >= 31 && c.ageDays < 60,
      ),
    },
    {
      label: "0–30 Days",
      sublabel: "Fresh",
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/30",
      items: agingCustomers.filter((c) => c.ageDays < 31),
    },
  ];

  const filtered = [...customers]
    .filter((c) => {
      const bal = parseFloat(String(c.balance));
      if (filter === "outstanding") return bal > 0;
      if (filter === "clear") return bal <= 0;
      return true;
    })
    .sort(
      (a, b) => parseFloat(String(b.balance)) - parseFloat(String(a.balance)),
    );

  // ── Add Customer helpers ──────────────────────────────────────────────────
  function openAdd() {
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setNewNickname("");
    setNewLandmark("");
    setNewNotes("");
    setNewOpeningBal("");
    setNewCreditLimit("");
    setNewTags([]);
    setAddOpen(true);
  }

  useImperativeHandle(ref, () => ({ openAdd }), []);

  function handleAdd() {
    if (!newName.trim()) return;
    createCustomer.mutate(
      {
        name: newName.trim(),
        phone: newPhone || undefined,
        email: newEmail || undefined,
        nickname: newNickname || undefined,
        landmark: newLandmark || undefined,
        notes: newNotes || undefined,
        openingBalance: newOpeningBal ? parseFloat(newOpeningBal) : undefined,
        creditLimit: newCreditLimit ? parseFloat(newCreditLimit) : undefined,
        tags: newTags.length ? newTags : undefined,
      },
      {
        onSuccess: (data) => {
          const customer = (data as { customer: Customer }).customer;
          toast({ title: `${newName} added` });
          setAddOpen(false);
          if (customer?.id) navigate(`/customers/${customer.id}`);
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof Error
              ? err.message
              : typeof err === "string"
                ? err
                : "Failed to add customer";
          toast({ title: msg, variant: "destructive" });
        },
      },
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {!embedded && (
        <>
          {/* ── Header ──────────────────────────────────────────────────────────────── */}
          <header className="sticky top-0 z-20 border-b bg-card">
            <div className="mx-auto max-w-3xl px-4 py-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                  <h1 className="text-base font-bold">👥 Customers</h1>
                  <p className="text-xs text-muted-foreground">
                    {customers.length} total
                    {outCount > 0 && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="text-destructive font-medium">
                          {outCount} owe ₹{formatCurrency(outstanding)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearchOpen((s) => !s);
                    if (searchOpen) setSearch("");
                  }}
                >
                  <Search className="h-5 w-5" />
                </Button>
                <Button size="sm" className="gap-1" onClick={openAdd}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>

              {/* Inline search (toggleable) */}
              {searchOpen && (
                <div className="mt-2 pb-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9 h-9 text-sm"
                      placeholder="Search by name or phone…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
              )}
            </div>
          </header>
        </>
      )}

      {embedded && (
        <div className="mx-auto max-w-3xl px-4 py-2 flex items-center gap-2 border-b bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSearchOpen((s) => !s);
              if (searchOpen) setSearch("");
            }}
          >
            <Search className="h-5 w-5" />
          </Button>
          {searchOpen && (
            <div className="flex-1">
              <Input
                className="h-9 text-sm"
                placeholder="Search by name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>
      )}

      <main className="mx-auto max-w-3xl space-y-3 p-4 md:p-6">
        {/* ── Summary strip ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Total",
              value: customers.length,
              icon: <Users className="h-4 w-4 text-muted-foreground" />,
              color: "text-foreground",
            },
            {
              label: "Has Due",
              value: outCount,
              icon: <AlertCircle className="h-4 w-4 text-destructive" />,
              color: "text-destructive",
            },
            {
              label: "Outstanding",
              value: `₹${formatCurrency(outstanding)}`,
              icon: <IndianRupee className="h-4 w-4 text-destructive" />,
              color: "text-destructive font-bold tabular-nums",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-0.5 rounded-xl border bg-card p-3"
            >
              {s.icon}
              <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex rounded-xl border bg-muted/50 p-1 gap-1 min-w-0 overflow-x-auto">
          {(
            [
              {
                key: "all",
                label: "All",
                count: customers.length,
                Icon: Users,
              },
              {
                key: "outstanding",
                label: "Has Due",
                count: outCount,
                Icon: AlertCircle,
              },
              {
                key: "clear",
                label: "Clear",
                count: clearCount,
                Icon: CheckCircle2,
              },
              {
                key: "aging",
                label: "Aging",
                count: agingCustomers.length,
                Icon: Clock,
              },
            ] as { key: FilterTab; label: string; count: number; Icon: any }[]
          ).map(({ key, label, count, Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex flex-1 min-w-0 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                filter === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 ${
                  key === "outstanding"
                    ? "text-destructive"
                    : key === "clear"
                      ? "text-success"
                      : key === "aging"
                        ? "text-orange-500"
                        : ""
                }`}
              />
              {label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  filter === key
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Aging view ──────────────────────────────────────────────────────── */}
        {filter === "aging" && (
          <div className="space-y-3">
            {agingCustomers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border bg-card py-14 text-center">
                <CheckCircle2 className="h-10 w-10 text-success/40" />
                <p className="text-sm text-muted-foreground">
                  No outstanding balances
                </p>
              </div>
            ) : (
              agingBuckets.map((bucket) =>
                bucket.items.length === 0 ? null : (
                  <div key={bucket.label} className={`rounded-xl border ${bucket.border} overflow-hidden`}>
                    {/* Bucket header */}
                    <div className={`flex items-center justify-between px-4 py-2 ${bucket.bg}`}>
                      <div className="flex items-center gap-2">
                        <Clock className={`h-4 w-4 ${bucket.color}`} />
                        <span className={`text-sm font-semibold ${bucket.color}`}>
                          {bucket.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {bucket.sublabel}
                        </span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${bucket.bg} ${bucket.color}`}>
                        {bucket.items.length}
                      </span>
                    </div>
                    {/* Customers in bucket */}
                    <div className="divide-y bg-card">
                      {bucket.items.map((customer) => {
                        const balance = parseFloat(String(customer.balance));
                        return (
                          <div
                            key={customer.id}
                            className="group flex cursor-pointer items-center gap-2 sm:gap-3 p-3 transition-colors hover:bg-muted/30 min-w-0"
                            onClick={() => navigate(`/customers/${customer.id}`)}
                          >
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${bucket.bg} ${bucket.color}`}>
                              {customer.name?.charAt(0)?.toUpperCase() ?? "?"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">
                                {customer.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {customer.ageDays === 0
                                  ? "Today"
                                  : `${customer.ageDays}d overdue`}
                                {customer.phone ? ` · ${customer.phone}` : ""}
                              </p>
                            </div>
                            <div className="shrink-0 text-right min-w-[4rem]">
                              <p className={`text-sm font-bold whitespace-nowrap tabular-nums ${bucket.color}`}>
                                ₹{formatCurrency(balance)}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              {customer.phone && (
                                <button
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10 text-success hover:bg-success/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(
                                      `https://wa.me/91${customer.phone!.replace(/\D/g, "")}`,
                                      "_blank",
                                    );
                                  }}
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        )}

        {/* Customer list */}
        <div className={`overflow-hidden rounded-xl border bg-card ${filter === "aging" ? "hidden" : ""}`}>
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
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <User className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? `No customers matching "${search}"`
                  : filter === "outstanding"
                    ? "No customers with outstanding balance"
                    : filter === "clear"
                      ? "All customers have cleared dues"
                      : "No customers yet. Tap + to add your first."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((customer) => {
                const balance = parseFloat(String(customer.balance));
                const hasOutstanding = balance > 0;
                return (
                  <div
                    key={customer.id}
                    className="group flex cursor-pointer items-center gap-2 sm:gap-3 p-3 transition-colors hover:bg-muted/30 min-w-0"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        hasOutstanding
                          ? "bg-destructive/10 text-destructive"
                          : "bg-success/10 text-success"
                      }`}
                    >
                      {customer.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">
                          {customer.name}
                        </p>
                        {(customer.tags ?? []).includes("VIP") && (
                          <span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-semibold text-warning">
                            VIP
                          </span>
                        )}
                        {(customer.tags ?? []).includes("Blacklist") && (
                          <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-semibold text-destructive">
                            ⛔
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {customer.phone ?? "No phone"}
                      </p>
                    </div>

                    {/* Balance */}
                    <div className="shrink-0 text-right min-w-[4rem]">
                      {hasOutstanding ? (
                        <p className="text-sm font-bold text-destructive whitespace-nowrap tabular-nums">
                          ₹{formatCurrency(balance)}
                        </p>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success whitespace-nowrap">
                          <CheckCircle2 className="h-3 w-3 shrink-0" /> Clear
                        </span>
                      )}
                    </div>

                    {/* Quick actions - visible on mobile, hover on desktop */}
                    <div className="flex shrink-0 gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      {customer.phone && (
                        <button
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10 text-success hover:bg-success/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `https://wa.me/91${customer.phone!.replace(/\D/g, "")}`,
                              "_blank",
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

      {!embedded && <BottomNav />}

      {/* ── FAB: Add Customer ────────────────────────────────────────────────────── */}
      {!embedded && (
      <button
        onClick={openAdd}
        className="fixed bottom-20 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
        aria-label="Add Customer"
      >
        <Plus className="h-6 w-6" />
      </button>
      )}

      {/* ── Add Customer Dialog ─────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                autoFocus
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="10-digit mobile"
                type="tel"
                inputMode="tel"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1 text-info font-semibold">
                <Mail className="h-3 w-3" />
                Email
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  (Enables PDF delivery)
                </span>
              </Label>
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
                inputMode="email"
                className="border-info/30 focus-visible:ring-info"
              />
            </div>

            {/* Nickname */}
            <div className="space-y-1.5">
              <Label className="text-xs">Nickname / Short Name</Label>
              <Input
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="e.g. Ramesh bhai"
              />
            </div>

            {/* Landmark */}
            <div className="space-y-1.5">
              <Label className="text-xs">Landmark / Area</Label>
              <Input
                value={newLandmark}
                onChange={(e) => setNewLandmark(e.target.value)}
                placeholder="e.g. near Rajiv Chowk"
              />
            </div>

            {/* Opening Balance */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Opening Balance (amount customer owes you)
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ₹
                </span>
                <Input
                  className="pl-7"
                  type="number"
                  min={0}
                  step="any"
                  value={newOpeningBal}
                  onChange={(e) => setNewOpeningBal(e.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                />
              </div>
              {newOpeningBal && parseFloat(newOpeningBal) > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Customer starts with ₹
                  {formatCurrency(parseFloat(newOpeningBal))} outstanding
                </p>
              )}
            </div>

            {/* Credit Limit */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Credit Limit (max outstanding allowed)
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ₹
                </span>
                <Input
                  className="pl-7"
                  type="number"
                  min={0}
                  step="any"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(e.target.value)}
                  placeholder="Leave blank for no limit"
                  inputMode="decimal"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Any notes about this customer…"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {CUSTOMER_TAGS.map((tag) => {
                  const active = newTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setNewTags((prev) =>
                          active
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag],
                        )
                      }
                      className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
                        active
                          ? tag === "Blacklist"
                            ? "border-destructive bg-destructive/10 text-destructive"
                            : "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted text-muted-foreground hover:border-foreground"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!newName.trim() || createCustomer.isPending}
            >
              {createCustomer.isPending ? "Adding…" : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

Customers.displayName = "Customers";

export default Customers;
