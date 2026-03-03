import { useState, useEffect } from "react";
import { Search, FileText, Users, Package, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCustomers, useProducts } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";
import { useNavigate } from "react-router-dom";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();

  // Reset on close
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenChange]);

  const q = query.toLowerCase().trim();

  const matchedCustomers = q
    ? customers.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          (c as any).phone?.toLowerCase().includes(q)
      ).slice(0, 5)
    : [];

  const matchedProducts = q
    ? products.filter((p) => p.name?.toLowerCase().includes(q)).slice(0, 5)
    : [];

  const hasResults = matchedCustomers.length > 0 || matchedProducts.length > 0;

  function go(path: string) {
    onOpenChange(false);
    navigate(path);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, products…"
            className="h-9 border-0 p-0 shadow-none focus-visible:ring-0 text-sm"
          />
          {query && (
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setQuery("")}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {!q && (
            <div className="py-8 text-center">
              <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Type to search customers or products</p>
              <p className="mt-1 text-xs text-muted-foreground">Shortcut: Ctrl+K</p>
            </div>
          )}

          {q && !hasResults && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No results for "{query}"</p>
            </div>
          )}

          {matchedCustomers.length > 0 && (
            <div>
              <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Customers
              </p>
              {matchedCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => go("/payment")}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                    {c.name?.slice(0, 2).toUpperCase() ?? "??"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Balance: {formatCurrency(parseFloat(String((c as any).balance ?? 0)))}
                    </p>
                  </div>
                  <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {matchedProducts.length > 0 && (
            <div>
              <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Products
              </p>
              {matchedProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => go("/inventory")}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10 text-xs font-bold text-secondary shrink-0">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {(p as any).stock ?? 0} · ₹{(p as any).price ?? 0}
                    </p>
                  </div>
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t px-4 py-2 flex gap-3 text-[10px] text-muted-foreground">
          <span><kbd className="rounded bg-muted px-1">↵</kbd> open</span>
          <span><kbd className="rounded bg-muted px-1">Esc</kbd> close</span>
          <span><kbd className="rounded bg-muted px-1">Ctrl K</kbd> anywhere</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
