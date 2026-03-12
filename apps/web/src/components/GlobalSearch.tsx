import { useState, useEffect } from "react";
import {
  Search,
  FileText,
  Users,
  Package,
  X,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCustomers, useProducts, useInvoices } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";
import { useNavigate } from "react-router-dom";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_COLOR: Record<string, string> = {
  paid: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  partial: "bg-warning/10 text-warning",
  cancelled: "bg-destructive/10 text-destructive",
  draft: "bg-muted text-muted-foreground",
  proforma: "bg-info/10 text-info",
};

const QUICK_LINKS = [
  { icon: "🧾", label: "New Invoice", path: "/invoices", action: "invoice" },
  { icon: "👥", label: "Customers", path: "/customers", action: "nav" },
  { icon: "📦", label: "Inventory", path: "/inventory", action: "nav" },
  { icon: "💵", label: "Cash Book", path: "/cashbook", action: "nav" },
  { icon: "📊", label: "Reports", path: "/reports", action: "nav" },
  { icon: "📖", label: "Day Book", path: "/daybook", action: "nav" },
];

export default function GlobalSearch({
  open,
  onOpenChange,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: customers = [] } = useCustomers("", 200);
  const { data: products = [] } = useProducts();
  const { data: invoices = [] } = useInvoices(500);

  // Reset on close
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Keyboard shortcut Ctrl+K / Cmd+K + "execora:search" custom event (from header search icon)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    const customHandler = () => onOpenChange(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("execora:search", customHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("execora:search", customHandler);
    };
  }, [onOpenChange]);

  const q = query.toLowerCase().trim();

  const matchedCustomers = q
    ? customers
        .filter(
          (c) =>
            c.name?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            (c as any).nickname?.toLowerCase().includes(q),
        )
        .slice(0, 4)
    : [];

  const matchedInvoices = q
    ? invoices
        .filter(
          (inv) =>
            inv.invoiceNo?.toLowerCase().includes(q) ||
            inv.customer?.name?.toLowerCase().includes(q) ||
            inv.customer?.phone?.toLowerCase().includes(q),
        )
        .slice(0, 4)
    : [];

  const matchedProducts = q
    ? products.filter((p) => p.name?.toLowerCase().includes(q)).slice(0, 3)
    : [];

  const hasResults =
    matchedCustomers.length > 0 ||
    matchedInvoices.length > 0 ||
    matchedProducts.length > 0;

  function go(path: string) {
    onOpenChange(false);
    navigate(path);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, invoices, products…"
            className="h-9 border-0 p-0 shadow-none focus-visible:ring-0 text-sm"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Results */}
        <div
          className="max-h-[420px] overflow-y-auto"
          style={{ scrollbarWidth: "thin" }}
        >
          {/* Empty state — show quick links */}
          {!q && (
            <div>
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Links
              </p>
              <div className="grid grid-cols-3 gap-0">
                {QUICK_LINKS.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => go(link.path)}
                    className="flex flex-col items-center gap-1.5 py-4 hover:bg-accent transition-colors text-center"
                  >
                    <span className="text-2xl">{link.icon}</span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {link.label}
                    </span>
                  </button>
                ))}
              </div>
              <div className="border-t px-4 py-2.5 text-center text-xs text-muted-foreground">
                Type to search customers, invoices, or products
              </div>
            </div>
          )}

          {q && !hasResults && (
            <div className="py-10 text-center">
              <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No results for <strong>"{query}"</strong>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a name, phone number, or invoice #
              </p>
            </div>
          )}

          {/* ── Customers ── */}
          {matchedCustomers.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Customers
                </p>
                <button
                  className="text-[10px] text-primary hover:underline"
                  onClick={() => go(`/customers`)}
                >
                  View all
                </button>
              </div>
              {matchedCustomers.map((c) => {
                const bal = parseFloat(String((c as any).balance ?? 0));
                return (
                  <button
                    key={c.id}
                    onClick={() => go(`/customers/${c.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                      {c.name?.slice(0, 2).toUpperCase() ?? "??"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.phone ?? "No phone"} · Bal:{" "}
                        <span
                          className={
                            bal > 0
                              ? "text-destructive font-medium"
                              : "text-success"
                          }
                        >
                          {formatCurrency(bal)}
                        </span>
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Invoices ── */}
          {matchedInvoices.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Invoices
                </p>
                <button
                  className="text-[10px] text-primary hover:underline"
                  onClick={() => go(`/invoices`)}
                >
                  View all
                </button>
              </div>
              {matchedInvoices.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => go(`/invoices/${inv.id}`)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm shrink-0">
                    {inv.status === "paid"
                      ? "✅"
                      : inv.status === "cancelled"
                        ? "❌"
                        : "📄"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{inv.invoiceNo}</p>
                      <Badge
                        className={`h-4 px-1.5 text-[9px] font-semibold capitalize ${STATUS_COLOR[inv.status] ?? ""}`}
                      >
                        {inv.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {inv.customer?.name ?? "Unknown"} ·{" "}
                      {formatCurrency(parseFloat(String(inv.total ?? 0)))}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* ── Products ── */}
          {matchedProducts.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Products
                </p>
                <button
                  className="text-[10px] text-primary hover:underline"
                  onClick={() => go(`/inventory`)}
                >
                  View all
                </button>
              </div>
              {matchedProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => go("/inventory")}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 shrink-0">
                    <Package className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {(p as any).stock ?? 0} ·{" "}
                      {formatCurrency(parseFloat(String(p.price ?? 0)))}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t px-4 py-2 flex gap-3 text-[10px] text-muted-foreground">
          <span>
            <kbd className="rounded bg-muted px-1">↵</kbd> open
          </span>
          <span>
            <kbd className="rounded bg-muted px-1">Esc</kbd> close
          </span>
          <span>
            <kbd className="rounded bg-muted px-1">Ctrl+K</kbd> anywhere
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
