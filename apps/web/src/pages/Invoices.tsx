import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Plus, ChevronRight, Package, Quote, Calendar, BarChart3, TrendingUp, Clock, AlertCircle, MoreVertical, ShoppingCart, FileText, Truck, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useInvoices, usePurchases } from "@/hooks/useQueries";
import { useWsInvalidation } from "@/hooks/useWsInvalidation";
import { formatCurrency, formatDate } from "@/lib/api";
import { Invoice, Expense } from "@/lib/api";
import InvoiceCreation from "@/components/InvoiceCreation";
import BottomNav from "@/components/BottomNav";

const DATE_FILTERS = [
  "all",
  "today",
  "yesterday",
  "this_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
  "last_quarter",
  "custom",
] as const;
type DateFilter = (typeof DATE_FILTERS)[number];

function getDateRange(filter: DateFilter, customFrom?: Date, customTo?: Date): { from: Date; to: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  if (filter === "all") return null;
  if (filter === "custom" && customFrom && customTo) {
    return { from: customFrom, to: toEnd(customTo) };
  }

  let from: Date;
  let to: Date = toEnd(now);

  switch (filter) {
    case "today":
      from = today;
      break;
    case "yesterday":
      from = new Date(today);
      from.setDate(from.getDate() - 1);
      to = from;
      break;
    case "this_week":
      from = new Date(today);
      from.setDate(from.getDate() - from.getDay());
      break;
    case "this_month":
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case "last_month":
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      break;
    case "this_year":
      from = new Date(today.getFullYear(), 0, 1);
      break;
    case "last_year":
      from = new Date(today.getFullYear() - 1, 0, 1);
      to = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    case "last_quarter":
      const q = Math.floor(now.getMonth() / 3) + 1;
      const prevQ = q === 1 ? 4 : q - 1;
      const prevYear = q === 1 ? now.getFullYear() - 1 : now.getFullYear();
      from = new Date(prevYear, (prevQ - 1) * 3, 1);
      to = new Date(prevYear, prevQ * 3, 0, 23, 59, 59, 999);
      break;
    default:
      return null;
  }
  return { from, to };
}

function isInvoiceInRange(inv: Invoice, range: { from: Date; to: Date } | null): boolean {
  if (!range) return true;
  const d = inv.invoiceDate ?? inv.createdAt;
  const invDate = new Date(d);
  invDate.setHours(0, 0, 0, 0);
  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);
  const to = new Date(range.to);
  to.setHours(23, 59, 59, 999);
  return invDate >= from && invDate <= to;
}

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  all: "All dates",
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  this_month: "This month",
  last_month: "Last month",
  this_year: "This year",
  last_year: "Last year",
  last_quarter: "Last quarter",
  custom: "Custom",
};

const DOC_TYPE_TABS = [
  { id: "sales" as const, label: "Sales", icon: Plus },
  { id: "purchase" as const, label: "Purchase", icon: Package },
  { id: "quotation" as const, label: "Quotation", icon: Quote },
] as const;
type DocTypeTab = (typeof DOC_TYPE_TABS)[number]["id"];

// Fuzzy match: all characters of query appear in target in order (typo-tolerant)
function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().replace(/\s+/g, "");
  const t = target.toLowerCase().replace(/\s+/g, "");
  if (t.includes(q)) return true; // fast-path exact substring
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

const STATUS_TABS = [
  "All",
  "Draft",
  "Pending",
  "Partial",
  "Paid",
  "Cancelled",
  "Proforma",
] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-success/10 text-success",
  pending: "bg-info/10 text-info",
  partial: "bg-warning/10 text-warning",
  draft: "bg-muted         text-muted-foreground",
  proforma: "bg-info/10 text-info",
  cancelled: "bg-destructive/10 text-destructive",
};

const AMOUNT_COLORS: Record<string, string> = {
  paid: "text-success",
  cancelled: "text-muted-foreground line-through",
  default: "text-foreground",
};

const Invoices = () => {
  const navigate = useNavigate();
  const [docTypeTab, setDocTypeTab] = useState<DocTypeTab>("sales");
  const [statusTab, setStatusTab] = useState<StatusTab>("All");
  const [search, setSearch] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [customOpen, setCustomOpen] = useState(false);

  const { data: invoices = [], isLoading } = useInvoices(200);
  const { data: purchasesData, isLoading: purchasesLoading } = usePurchases({});
  const purchases = purchasesData?.purchases ?? [];
  useWsInvalidation(["invoices", "summary", "purchases"]);

  // Filter invoices by doc type (sales = non-proforma, quotation = proforma)
  const invoicesByDocType = useMemo(() => {
    if (docTypeTab === "sales")
      return invoices.filter((inv: Invoice) => inv.status !== "proforma");
    if (docTypeTab === "quotation")
      return invoices.filter((inv: Invoice) => inv.status === "proforma");
    return [];
  }, [invoices, docTypeTab]);

  const dateRange = useMemo(
    () => getDateRange(dateFilter, customFrom, customTo),
    [dateFilter, customFrom, customTo]
  );

  const invoicesByDate = useMemo(() => {
    return invoicesByDocType.filter((inv) => isInvoiceInRange(inv, dateRange));
  }, [invoicesByDocType, dateRange]);

  const filtered = invoicesByDate.filter((inv: Invoice) => {
    const matchStatus =
      statusTab === "All" ||
      inv.status.toLowerCase() === statusTab.toLowerCase();
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      fuzzyMatch(q, inv.invoiceNo ?? "") ||
      fuzzyMatch(q, inv.customer?.name ?? "");
    return matchStatus && matchSearch;
  });

  // Filter purchases by search
  const filteredPurchases = useMemo(() => {
    if (docTypeTab !== "purchase") return [];
    if (!search.trim()) return purchases;
    const q = search.toLowerCase();
    return purchases.filter(
      (p: Expense) =>
        (p.itemName ?? "").toLowerCase().includes(q) ||
        (p.vendor ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q)
    );
  }, [purchases, search, docTypeTab]);

  // Count per status for badges (from invoicesByDate)
  const counts = invoicesByDate.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.status] = (acc[inv.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalValue = filtered.reduce(
    (s, inv) => s + parseFloat(String(inv.total ?? 0)),
    0,
  );
  const pendingAmount = filtered.reduce((s, inv) => {
    if (inv.status === "paid" || inv.status === "cancelled") return s;
    const total = parseFloat(String(inv.total ?? 0));
    const paid = parseFloat(String(inv.paidAmount ?? 0));
    return s + (total - paid);
  }, 0);
  const purchasesTotal = filteredPurchases.reduce(
    (s, p) => s + Number(p.amount ?? 0),
    0,
  );

  const showInvoiceList = docTypeTab === "sales" || docTypeTab === "quotation";
  const salesByDate = useMemo(
    () =>
      invoices
        .filter((i: Invoice) => i.status !== "proforma")
        .filter((i) => isInvoiceInRange(i, dateRange)),
    [invoices, dateRange]
  );
  const quotationByDate = useMemo(
    () =>
      invoices
        .filter((i: Invoice) => i.status === "proforma")
        .filter((i) => isInvoiceInRange(i, dateRange)),
    [invoices, dateRange]
  );
  const docTypeCounts = {
    sales: salesByDate.length,
    purchase: purchases.length,
    quotation: quotationByDate.length,
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="min-h-10 min-w-10 shrink-0 touch-manipulation" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold md:text-lg">🧾 Bills</h1>
            <p className="text-xs text-muted-foreground truncate">
              {docTypeTab === "purchase"
                ? `${filteredPurchases.length} shown · ${formatCurrency(purchasesTotal)} total`
                : `${filtered.length} shown · ${formatCurrency(totalValue)} total`}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="min-h-10 min-w-10 shrink-0 touch-manipulation" aria-label="More options">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => navigate("/expenses")}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Expenses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/billing")}>
                <FileText className="mr-2 h-4 w-4" />
                Sales Order
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/purchases")}>
                <Package className="mr-2 h-4 w-4" />
                Purchase Order
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/einvoicing")}>
                <Truck className="mr-2 h-4 w-4" />
                E-Way Bills
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/payment")}>
                <Wallet className="mr-2 h-4 w-4" />
                Payments
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/reports")}>
                <ArrowDownCircle className="mr-2 h-4 w-4" />
                Credit Notes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/reports")}>
                <ArrowUpCircle className="mr-2 h-4 w-4" />
                Debit Notes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Doc type tabs: Sales | Purchase | Quotation */}
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex gap-1 rounded-t-lg bg-muted/50 p-1">
            {DOC_TYPE_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setDocTypeTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  docTypeTab === id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {docTypeCounts[id] > 0 && (
                  <span className="rounded-full bg-muted px-1.5 text-[10px]">
                    {docTypeCounts[id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Status tabs — only for Sales / Quotation */}
        {showInvoiceList && (
          <div className="mx-auto max-w-3xl overflow-x-auto px-4">
            <div className="flex gap-0 border-t">
              {STATUS_TABS.map((tab) => {
                const key = tab.toLowerCase();
                const count =
                  tab === "All" ? invoicesByDate.length : (counts[key] ?? 0);
                return (
                  <button
                    key={tab}
                    onClick={() => setStatusTab(tab)}
                    className={`flex shrink-0 items-center gap-1 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                      statusTab === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                    {count > 0 && (
                      <span className="rounded-full bg-muted px-1.5 text-[10px]">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        {/* Search bar — date filter on right, hidden when user is searching */}
        <div className="flex items-center gap-2 rounded-lg border bg-background">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 pr-3 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder={
                docTypeTab === "purchase"
                  ? "Search by item, supplier, category…"
                  : docTypeTab === "quotation"
                    ? "Search by estimate # or customer…"
                    : "Search by invoice # or customer…"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {showInvoiceList && !search.trim() && (
            <div className="flex shrink-0 items-center pr-2">
              <Select
                value={dateFilter}
                onValueChange={(v) => setDateFilter(v as DateFilter)}
              >
                <SelectTrigger className="h-8 w-[130px] border-0 bg-transparent shadow-none text-xs focus:ring-0">
                  <Calendar className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent align="end">
                  {DATE_FILTERS.map((f) => (
                    <SelectItem key={f} value={f} className="text-xs">
                      {DATE_FILTER_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dateFilter === "custom" && (
                <Popover open={customOpen} onOpenChange={setCustomOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                      {customFrom && customTo
                        ? `${customFrom.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}–${customTo.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`
                        : "Pick"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="flex flex-col sm:flex-row gap-2 p-3">
                      <div>
                        <p className="text-xs font-medium mb-1">From</p>
                        <CalendarComponent
                          mode="single"
                          selected={customFrom}
                          onSelect={setCustomFrom}
                          disabled={(d) => d > (customTo ?? new Date())}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">To</p>
                        <CalendarComponent
                          mode="single"
                          selected={customTo}
                          onSelect={setCustomTo}
                          disabled={(d) => d < (customFrom ?? new Date(0))}
                        />
                      </div>
                    </div>
                    <div className="p-2 border-t">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => customFrom && customTo && setCustomOpen(false)}
                      >
                        Apply
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>

        {/* Total & Pending summary — when invoices shown */}
        {showInvoiceList && filtered.length > 0 && (
          <div className="flex gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-sm font-bold">{formatCurrency(totalValue)}</p>
            </div>
            <div className="flex-1 border-l pl-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pending</p>
              <p className="text-sm font-bold text-warning">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>
        )}

        {/* Quick links — Reports, Analytics, Aging, Overdue — compact, single row, all devices */}
        {showInvoiceList && (
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => navigate("/reports")}
              className="flex min-w-0 items-center justify-center gap-1 rounded-md border bg-card px-2 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted/50 active:bg-muted"
            >
              <BarChart3 className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">Reports</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/reports?tab=overview")}
              className="flex min-w-0 items-center justify-center gap-1 rounded-md border bg-card px-2 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted/50 active:bg-muted"
            >
              <TrendingUp className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/reports?tab=aging")}
              className="flex min-w-0 items-center justify-center gap-1 rounded-md border bg-card px-2 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted/50 active:bg-muted"
            >
              <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">Aging</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/overdue")}
              className="flex min-w-0 items-center justify-center gap-1 rounded-md border bg-card px-2 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted/50 active:bg-muted"
            >
              <AlertCircle className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">Overdue</span>
            </button>
          </div>
        )}

        {/* Purchase list */}
        {docTypeTab === "purchase" && (
          <div className="overflow-hidden rounded-xl border bg-card">
            {purchasesLoading ? (
              <div className="divide-y">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4">
                    <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : filteredPurchases.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-2xl">📦</p>
                <p className="text-sm text-muted-foreground">
                  {search ? "No purchases match your search" : "No purchase entries yet"}
                </p>
                {!search && (
                  <Button size="sm" onClick={() => navigate("/purchases")}>
                    Add Purchase
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredPurchases.map((p: Expense) => (
                  <div
                    key={p.id}
                    className="group flex cursor-pointer items-center gap-3 px-4 py-4 min-h-[60px] transition-colors hover:bg-muted/30 active:bg-muted/50 touch-manipulation"
                    onClick={() => navigate("/purchases")}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold">
                      📦
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {p.itemName ?? p.category}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.vendor ?? "—"} · {formatDate(p.date ?? p.createdAt)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-destructive">
                      {formatCurrency(Number(p.amount ?? 0))}
                    </p>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invoice list — Sales / Quotation */}
        {showInvoiceList && (
        <div className="overflow-hidden rounded-xl border bg-card">
          {isLoading ? (
            <div className="divide-y">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-2xl">🧾</p>
              <p className="text-sm text-muted-foreground">
                {search || statusTab !== "All"
                  ? `No ${docTypeTab === "quotation" ? "quotations" : "invoices"} match your filter`
                  : docTypeTab === "quotation"
                    ? "No quotations yet"
                    : "No invoices yet"}
              </p>
              {statusTab === "All" && !search && (
                <Button size="sm" onClick={() => setInvoiceOpen(true)}>
                  {docTypeTab === "quotation" ? "Create Quotation" : "Create First Invoice"}
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((inv: Invoice) => {
                const amtColor =
                  AMOUNT_COLORS[inv.status] ?? AMOUNT_COLORS.default;
                return (
                  <div
                    key={inv.id}
                    className="group flex cursor-pointer items-center gap-3 px-4 py-4 min-h-[60px] transition-colors hover:bg-muted/30 active:bg-muted/50 touch-manipulation"
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    {/* Invoice icon */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold">
                      {inv.status === "paid"
                        ? "✅"
                        : inv.status === "cancelled"
                          ? "❌"
                          : "📄"}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {inv.invoiceNo}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {inv.customer?.name ?? "Unknown"} ·{" "}
                        {formatDate(inv.createdAt)}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_STYLES[inv.status] ?? ""}`}
                    >
                      {inv.status}
                    </span>

                    {/* Amount */}
                    <p className={`shrink-0 text-sm font-bold ${amtColor}`}>
                      {formatCurrency(parseFloat(String(inv.total ?? 0)))}
                    </p>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}
      </main>

      {/* FAB: Invoice → Classic Billing / Add Purchase — bottom right, mobile-first */}
      <button
        onClick={() =>
          docTypeTab === "purchase"
            ? navigate("/purchases")
            : navigate("/billing")
        }
        className="fixed bottom-24 right-4 z-[60] flex h-10 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6 touch-manipulation"
        aria-label={docTypeTab === "purchase" ? "Add purchase" : docTypeTab === "quotation" ? "Estimate" : "Invoice"}
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        <span>
          {docTypeTab === "purchase" ? "Purchase" : docTypeTab === "quotation" ? "Estimate" : "Invoice"}
        </span>
      </button>

      <InvoiceCreation open={invoiceOpen} onOpenChange={setInvoiceOpen} />
      <BottomNav />
    </div>
  );
};

export default Invoices;
