/**
 * Purchases — Track stock/supplier purchases.
 * Stores in localStorage under "execora:purchases".
 * Separate from Expenses: focused on inventory procurement with unit/qty/rate.
 */
import { useState, useMemo } from "react";
import { ArrowLeft, Plus, Trash2, Package, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
const PURCHASE_CATEGORIES = [
  "Stock Purchase",
  "Raw Material",
  "Packaging",
  "Equipment",
  "Office Supplies",
  "Miscellaneous",
] as const;

type PurchaseCategory = typeof PURCHASE_CATEGORIES[number];

const UNITS = ["Piece", "Kg", "Gram", "Litre", "ML", "Dozen", "Box", "Metre", "Foot"] as const;
type Unit = typeof UNITS[number];

interface Purchase {
  id: string;
  supplier: string;
  itemName: string;
  qty: number;
  unit: Unit;
  ratePerUnit: number;
  total: number;
  category: PurchaseCategory;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: number;
}

// ── Persistence ───────────────────────────────────────────────────────────────
const LS_KEY = "execora:purchases";

function loadPurchases(): Purchase[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function savePurchases(list: Purchase[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: n % 1 === 0 ? 0 : 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

const catIcon: Record<PurchaseCategory, string> = {
  "Stock Purchase": "📦",
  "Raw Material": "🌾",
  "Packaging": "📫",
  "Equipment": "🔧",
  "Office Supplies": "🗂️",
  "Miscellaneous": "🛒",
};

const TABS = ["All", "This Week", "This Month"] as const;
type Tab = typeof TABS[number];

function filterByTab(list: Purchase[], tab: Tab): Purchase[] {
  if (tab === "All") return list;
  const now = new Date();
  const cutoff = new Date(now);
  if (tab === "This Week") cutoff.setDate(now.getDate() - 7);
  else cutoff.setDate(1);
  return list.filter((p) => new Date(p.date) >= cutoff);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Purchases() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>(loadPurchases);
  const [filterTab, setFilterTab] = useState<Tab>("This Month");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  // Form state
  const [supplier, setSupplier] = useState("");
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState<Unit>("Piece");
  const [rate, setRate] = useState("");
  const [category, setCategory] = useState<PurchaseCategory>("Stock Purchase");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");

  const computedTotal = useMemo(() => {
    const q = parseFloat(qty) || 0;
    const r = parseFloat(rate) || 0;
    return q * r;
  }, [qty, rate]);

  function resetForm() {
    setSupplier(""); setItemName(""); setQty("1"); setUnit("Piece");
    setRate(""); setCategory("Stock Purchase"); setDate(today()); setNotes("");
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const q = parseFloat(qty);
    const r = parseFloat(rate);
    if (!q || q <= 0 || !r || r <= 0) {
      toast({ title: "Enter valid quantity and rate", variant: "destructive" });
      return;
    }
    if (!itemName.trim()) {
      toast({ title: "Item name is required", variant: "destructive" });
      return;
    }
    const newPurchase: Purchase = {
      id: `pur-${Date.now()}`,
      supplier: supplier.trim() || "—",
      itemName: itemName.trim(),
      qty: q,
      unit,
      ratePerUnit: r,
      total: Math.round(q * r * 100) / 100,
      category,
      date,
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
    };
    const updated = [newPurchase, ...purchases];
    setPurchases(updated);
    savePurchases(updated);
    toast({ title: `Purchase added — ${fmt(newPurchase.total)}` });
    resetForm();
    setOpen(false);
  }

  function handleDelete(id: string) {
    const updated = purchases.filter((p) => p.id !== id);
    setPurchases(updated);
    savePurchases(updated);
    toast({ title: "Purchase deleted" });
  }

  // ── Derived data ————————————————————————————————
  const visible = useMemo(() => {
    let list = filterByTab(purchases, filterTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.itemName.toLowerCase().includes(q) ||
          p.supplier.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [purchases, filterTab, search]);

  const monthPurchases = useMemo(() => filterByTab(purchases, "This Month"), [purchases]);
  const monthTotal = useMemo(() => monthPurchases.reduce((s, p) => s + p.total, 0), [monthPurchases]);

  // Top supplier this month
  const topSupplier = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const p of monthPurchases) {
      if (p.supplier && p.supplier !== "—")
        totals[p.supplier] = (totals[p.supplier] ?? 0) + p.total;
    }
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? "—";
  }, [monthPurchases]);

  const visibleTotal = useMemo(() => visible.reduce((s, p) => s + p.total, 0), [visible]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Purchases</h1>
          </div>
          <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-none shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-lg font-bold text-red-600">{fmt(monthTotal)}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Entries</p>
              <p className="text-lg font-bold">{monthPurchases.length}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Top Supplier</p>
              <p className="text-sm font-semibold truncate">{topSupplier}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Input
          placeholder="Search item, supplier, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-card"
        />

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setFilterTab(t)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filterTab === t
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No purchase entries</p>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add First Purchase
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {visible.length} {visible.length === 1 ? "entry" : "entries"}
              </p>
              <p className="text-sm font-semibold text-red-600">{fmt(visibleTotal)}</p>
            </div>

            <div className="space-y-2">
              {visible.map((p) => (
                <Card key={p.id} className="border-none shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="text-xl mt-0.5 shrink-0">{catIcon[p.category]}</span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.qty} {p.unit} × {fmt(p.ratePerUnit)}
                            {p.supplier !== "—" && (
                              <> · <span className="text-blue-600">{p.supplier}</span></>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                              {p.category}
                            </span>
                            <span className="text-xs text-muted-foreground">{p.date}</span>
                          </div>
                          {p.notes && (
                            <p className="mt-1 text-xs text-muted-foreground italic">{p.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="font-semibold text-red-600">{fmt(p.total)}</span>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Summary footer */}
        {visible.length > 0 && (
          <Card className="border-dashed">
            <CardContent className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingDown className="h-4 w-4" />
                <span className="text-sm">Total spend ({filterTab.toLowerCase()})</span>
              </div>
              <span className="font-bold text-red-600">{fmt(visibleTotal)}</span>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Add Purchase Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Purchase Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3 py-1">
            <div className="space-y-1">
              <Label>Item Name *</Label>
              <Input
                placeholder="e.g. Basmati Rice 1kg"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="0.001"
                  step="any"
                  placeholder="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Unit</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Rate per {unit} (₹) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
              />
              {computedTotal > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">{fmt(computedTotal)}</span>
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Supplier</Label>
              <Input
                placeholder="Supplier / vendor name"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as PurchaseCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURCHASE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {catIcon[c]} {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Invoice no., batch no., remarks…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!itemName.trim() || !rate || !qty}>
                Add Purchase
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
