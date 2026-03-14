import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Plus, ChevronRight, FileText, Package, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInvoices, usePurchases } from "@/hooks/useQueries";
import { useWsInvalidation } from "@/hooks/useWsInvalidation";
import { formatCurrency, formatDate } from "@/lib/api";
import { Invoice, Expense } from "@/lib/api";
import InvoiceCreation from "@/components/InvoiceCreation";
import BottomNav from "@/components/BottomNav";

const DOC_TYPE_TABS = [
  { id: "sales" as const, label: "Sales", icon: FileText },
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

  const filtered = invoicesByDocType.filter((inv: Invoice) => {
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

  // Count per status for badges (from invoicesByDocType)
  const counts = invoicesByDocType.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.status] = (acc[inv.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalValue = filtered.reduce(
    (s, inv) => s + parseFloat(String(inv.total ?? 0)),
    0,
  );
  const purchasesTotal = filteredPurchases.reduce(
    (s, p) => s + Number(p.amount ?? 0),
    0,
  );

  const showInvoiceList = docTypeTab === "sales" || docTypeTab === "quotation";
  const docTypeCounts = {
    sales: invoices.filter((i: Invoice) => i.status !== "proforma").length,
    purchase: purchases.length,
    quotation: invoices.filter((i: Invoice) => i.status === "proforma").length,
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="min-h-10 min-w-10 touch-manipulation" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-base font-bold md:text-lg">🧾 Bills</h1>
            <p className="text-xs text-muted-foreground">
              {docTypeTab === "purchase"
                ? `${filteredPurchases.length} shown · ${formatCurrency(purchasesTotal)} total`
                : `${filtered.length} shown · ${formatCurrency(totalValue)} total`}
            </p>
          </div>
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
                  tab === "All" ? invoicesByDocType.length : (counts[key] ?? 0);
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
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={
              docTypeTab === "purchase"
                ? "Search by item, supplier, category…"
                : "Search by invoice # or customer…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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
        className="fixed bottom-20 right-4 z-[60] flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6 touch-manipulation"
        aria-label={docTypeTab === "purchase" ? "Add purchase" : "Invoice"}
      >
        <FileText className="h-5 w-5 shrink-0" />
        <span className="font-semibold">
          {docTypeTab === "purchase" ? "Purchase" : "Invoice"}
        </span>
      </button>

      <InvoiceCreation open={invoiceOpen} onOpenChange={setInvoiceOpen} />
      <BottomNav />
    </div>
  );
};

export default Invoices;
