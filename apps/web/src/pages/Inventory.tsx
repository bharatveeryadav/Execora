import { useState } from "react";
import { ArrowLeft, Plus, Search, Package, AlertTriangle, TrendingUp, TrendingDown, ShoppingCart, Edit, Eye } from "lucide-react";
import VoiceBar from "@/components/VoiceBar";
import { wsClient } from "@/lib/ws";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useProducts, useLowStockProducts, useInvoices, useCreateProduct, useUpdateProduct, useAdjustStock } from "@/hooks/useQueries";
import { formatCurrency, type Product } from "@/lib/api";

const voiceCommands = [
  "Show low stock", "Find expiring products", "Search rice", "Show all products",
  "Check oil stock", "Order rice", "Update price", "Add new product",
];

const Inventory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: lowStock = [], isLoading: lowStockLoading } = useLowStockProducts();
  const { data: allInvoices = [] } = useInvoices(200);
  const createProduct  = useCreateProduct();
  const updateProduct  = useUpdateProduct();
  const adjustStock    = useAdjustStock();

  // ── Edit product state ─────────────────────────────────────────────────────
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName]     = useState("");
  const [editPrice, setEditPrice]   = useState("");
  const [editCategory, setEditCategory] = useState("");

  // ── Stock adjust state ─────────────────────────────────────────────────────
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty]         = useState("1");
  const [adjustOp, setAdjustOp]           = useState<"add" | "subtract">("add");

  // ── Inline stock quick-edit ─────────────────────────────────────────────────
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditQty, setInlineEditQty] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);

  const startInlineEdit = (p: Product) => {
    setInlineEditId(p.id);
    setInlineEditQty(String(p.stock));
  };

  const saveInlineEdit = async (p: Product) => {
    const newQty = parseInt(inlineEditQty, 10);
    if (isNaN(newQty) || newQty < 0) {
      toast({ title: "⚠️ Invalid quantity", variant: "destructive" });
      return;
    }
    const delta = newQty - p.stock;
    if (delta === 0) { setInlineEditId(null); return; }
    setInlineSaving(true);
    try {
      await adjustStock.mutateAsync({
        id: p.id,
        quantity: Math.abs(delta),
        operation: delta > 0 ? "add" : "subtract",
      });
      toast({ title: `✅ Stock updated to ${newQty} ${p.unit}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast({ title: "❌ Stock update failed", description: msg, variant: "destructive" });
    }
    setInlineEditId(null);
    setInlineSaving(false);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditPrice(String(parseFloat(String(p.price))));
    setEditCategory(p.category ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    await updateProduct.mutateAsync({
      id: editingProduct.id,
      name: editName || undefined,
      price: editPrice ? parseFloat(editPrice) : undefined,
      category: editCategory || undefined,
    });
    toast({ title: "✅ Product updated" });
    setEditingProduct(null);
  };

  const handleAdjustStock = async () => {
    if (!adjustingProduct) return;
    const qty = parseInt(adjustQty, 10);
    if (!qty || qty <= 0) { toast({ title: "⚠️ Enter a valid quantity", variant: "destructive" }); return; }
    try {
      await adjustStock.mutateAsync({ id: adjustingProduct.id, quantity: qty, operation: adjustOp });
      toast({ title: `✅ Stock ${adjustOp === "add" ? "added" : "reduced"} by ${qty}` });
      setAdjustingProduct(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Stock update failed";
      toast({ title: "❌ Cannot update stock", description: msg, variant: "destructive" });
    }
  };

  // Compute per-product sales from invoice items
  const salesMap = new Map<string, { units: number; revenue: number }>();
  for (const inv of allInvoices) {
    if (inv.status === "cancelled") continue;
    for (const item of inv.items ?? []) {
      // Backend includes items via relation: item.product.name (not item.productName column)
      const name = item.product?.name ?? item.productName ?? "Unknown";
      const existing = salesMap.get(name) ?? { units: 0, revenue: 0 };
      salesMap.set(name, {
        units: existing.units + item.quantity,
        revenue: existing.revenue + parseFloat(String(item.itemTotal ?? 0)),
      });
    }
  }

  // Low stock IDs set
  const lowStockIds = new Set(lowStock.map((p) => p.id));

  // Summary stats
  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  const totalValue = products.reduce(
    (sum, p) => sum + parseFloat(String(p.price)) * p.stock,
    0
  );

  // Filtered products for the main table
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.category ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || p.category === category;
    return matchesSearch && matchesCategory;
  });

  // Top selling: sorted by revenue from invoices (fallback: lowest stock first)
  const topSelling = [...products]
    .filter((p) => p.isActive)
    .sort((a, b) => {
      const aRev = salesMap.get(a.name)?.revenue ?? 0;
      const bRev = salesMap.get(b.name)?.revenue ?? 0;
      return bRev - aRev || a.stock - b.stock;
    })
    .slice(0, 5);

  // Slow moving: active products with no sales and high stock
  const slowMoving = [...products]
    .filter((p) => p.isActive && p.stock > 0)
    .sort((a, b) => {
      const aUnits = salesMap.get(a.name)?.units ?? 0;
      const bUnits = salesMap.get(b.name)?.units ?? 0;
      return aUnits - bUnits || b.stock - a.stock;
    })
    .slice(0, 5);

  // Recent stock movements from invoices
  const recentMovements = allInvoices
    .filter((inv) => inv.status !== "cancelled")
    .slice(0, 10)
    .flatMap((inv) =>
      (inv.items ?? []).slice(0, 2).map((item) => ({
        time: new Date(inv.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        product: item.productName ?? "Unknown",
        qty: `-${item.quantity}`,
        type: "Sale",
        ref: inv.invoiceNo,
        notes: inv.customer?.name ? `Sold to ${inv.customer.name}` : "Sale",
      }))
    )
    .slice(0, 8);

  const handleAddProduct = async () => {
    // Opens browser prompt as a lightweight flow; full form can be added later
    const name = window.prompt("Product name:");
    if (!name?.trim()) return;
    const priceStr = window.prompt("Selling price (₹):");
    const price = parseFloat(priceStr ?? "0");
    const stockStr = window.prompt("Opening stock (units):");
    const stock = parseInt(stockStr ?? "0", 10);
    if (isNaN(price) || isNaN(stock)) { toast({ title: "⚠️ Invalid input", variant: "destructive" }); return; }
    await createProduct.mutateAsync({ name: name.trim(), price, stock });
    toast({ title: `✅ "${name}" added` });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">📦 Inventory Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddProduct} disabled={createProduct.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Add Product
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">

        {/* Voice Search Center */}
        <Card className="border-none bg-primary/5 shadow-sm">
          <CardContent className="p-4">
            <p className="mb-1 text-sm font-semibold">🎤 Voice Search Center</p>
            <VoiceBar
              idleHint={
                <>
                  <span className="font-medium text-foreground">"Search for rice"</span>
                  {" · "}
                  <span>"Show low stock"</span>
                  {" · "}
                  <span>"Find oil"</span>
                </>
              }
            />
          </CardContent>
        </Card>

        {/* Inventory Summary */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            📊 Inventory Summary
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Total Products", value: productsLoading ? "…" : String(products.length), sub: `${categories.length - 1} categories`, icon: Package, color: "text-primary" },
              { label: "Low Stock ⚠️", value: lowStockLoading ? "…" : String(lowStock.length), sub: "Need reorder", icon: AlertTriangle, color: "text-destructive" },
              { label: "Out of Stock 🔴", value: String(products.filter((p) => p.stock === 0).length), sub: "Needs urgent reorder", icon: TrendingDown, color: "text-destructive" },
              { label: "Total Value", value: formatCurrency(totalValue), sub: "", icon: TrendingUp, color: "text-primary" },
            ].map((s) => (
              <Card key={s.label} className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <p className="mt-2 text-2xl font-bold">{s.value}</p>
                  {s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Voice Quick Commands */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">🎤 Voice Quick Commands</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {voiceCommands.map((cmd) => (
                <Button
                  key={cmd}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    setSearch(cmd.replace(/^(Show |Find |Search |Check |Order |Update |Add )/, ""));
                    wsClient.send("voice:final", { text: cmd });
                    toast({ title: `🎤 "${cmd}"`, description: "Voice command sent" });
                  }}
                >
                  "{cmd}"
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="🔍 Search products by name or voice..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-md border border-input bg-background px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Low Stock Alerts */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">⚠️ Low Stock Alerts ({lowStockLoading ? "…" : lowStock.length})</CardTitle>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast({ title: "All items ordered!" })}>
                Order All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Min Stock</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading…</TableCell>
                    </TableRow>
                  ) : lowStock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">✅ All items well stocked!</TableCell>
                    </TableRow>
                  ) : (
                    lowStock.map((item, i) => (
                      <TableRow key={item.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">📦 {item.name}</TableCell>
                        <TableCell>
                          {item.stock} {item.unit}{" "}
                          {item.stock === 0 ? <span className="text-destructive">🔴</span> : <span className="text-yellow-500">🟡</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(String(item.price)))}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" className="h-7 text-xs" onClick={() => toast({ title: `Order placed for ${item.name}` })}>
                            Order
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Top Selling Products */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">🔥 Top Selling Products (This Month)</CardTitle>
              <Button size="sm" variant="ghost" className="h-7 text-xs">View All</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Units Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Reorder?</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSelling.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No products found</TableCell>
                    </TableRow>
                  ) : (
                    topSelling.map((p, i) => {
                      const sales = salesMap.get(p.name);
                      const needsReorder = lowStockIds.has(p.id) || p.stock === 0;
                      const stockLabel = p.stock === 0 ? `0 ${p.unit} 🔴` : p.stock <= 5 ? `${p.stock} ${p.unit} ⚠️` : `${p.stock} ${p.unit} ✅`;
                      return (
                        <TableRow key={p.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">📦 {p.name}</TableCell>
                          <TableCell>{sales?.units ?? 0}</TableCell>
                          <TableCell>{formatCurrency(sales?.revenue ?? 0)}</TableCell>
                          <TableCell>{stockLabel}</TableCell>
                          <TableCell>
                            {needsReorder ? (
                              <Badge variant="destructive" className="text-[10px]">YES - URGENT</Badge>
                            ) : "No"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant={needsReorder ? "default" : "ghost"} className="h-7 text-xs">
                              {needsReorder ? <><ShoppingCart className="mr-1 h-3 w-3" /> Order</> : <><Eye className="mr-1 h-3 w-3" /> View</>}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Slow Moving Products */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">🐢 Slow Moving Products (Risk of Dead Stock)</CardTitle>
              <Button size="sm" variant="ghost" className="h-7 text-xs">View All</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Units Sold</TableHead>
                    <TableHead>Loss Risk</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowMoving.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No slow moving products</TableCell>
                    </TableRow>
                  ) : (
                    slowMoving.map((p, i) => {
                      const sold = salesMap.get(p.name)?.units ?? 0;
                      const risk = sold === 0 ? "High" : sold < 5 ? "Medium" : "Low";
                      return (
                        <TableRow key={p.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">📦 {p.name}</TableCell>
                          <TableCell>{p.stock} {p.unit}</TableCell>
                          <TableCell>{sold} units</TableCell>
                          <TableCell>
                            <Badge variant={risk === "High" ? "destructive" : risk === "Medium" ? "secondary" : "outline"} className="text-[10px]">{risk}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              {risk !== "Low" ? "Discount" : "Promote"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* All Products */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">📋 All Products ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Reorder?</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading…</TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No products found</TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLow = lowStockIds.has(p.id) || p.stock === 0;
                      const isEditing = inlineEditId === p.id;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-lg">📦</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={inlineEditQty}
                                  onChange={(e) => setInlineEditQty(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") void saveInlineEdit(p);
                                    if (e.key === "Escape") setInlineEditId(null);
                                  }}
                                  autoFocus
                                  className="w-16 rounded border border-primary bg-background px-1.5 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <span className="text-xs text-muted-foreground">{p.unit}</span>
                                <button
                                  onClick={() => void saveInlineEdit(p)}
                                  disabled={inlineSaving}
                                  className="rounded px-1 text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                  title="Save (Enter)"
                                >✓</button>
                                <button
                                  onClick={() => setInlineEditId(null)}
                                  className="rounded px-1 text-xs text-muted-foreground hover:bg-muted"
                                  title="Cancel (Esc)"
                                >✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startInlineEdit(p)}
                                className="group flex items-center gap-1 rounded px-1 hover:bg-muted"
                                title="Click to edit stock"
                              >
                                <span className={isLow ? "text-destructive font-semibold" : ""}>
                                  {p.stock} {p.unit}
                                </span>
                                {isLow ? <span className="text-destructive">🔴</span> : <span>✅</span>}
                                <span className="invisible text-[10px] text-muted-foreground group-hover:visible">✎</span>
                              </button>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(parseFloat(String(p.price)))}/{p.unit}</TableCell>
                          <TableCell>{p.category}</TableCell>
                          <TableCell>
                            {isLow ? (
                              <Badge variant="destructive" className="text-[10px]">YES - URGENT</Badge>
                            ) : "No"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(p)}>
                                <Edit className="mr-1 h-3 w-3" /> Edit
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setAdjustingProduct(p); setAdjustQty("1"); setAdjustOp("add"); }}>
                                <ShoppingCart className="mr-1 h-3 w-3" /> Stock
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled>← Prev</Button>
              <span>Showing {filteredProducts.length} of {products.length} products</span>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled>Next →</Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Stock Movements */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">📦 Recent Stock Movements</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No movements yet</TableCell>
                    </TableRow>
                  ) : (
                    recentMovements.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{m.time}</TableCell>
                        <TableCell className="font-medium">{m.product}</TableCell>
                        <TableCell className="text-destructive font-medium">{m.qty}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">{m.type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{m.ref}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.notes}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Footer voice hints */}
        <div className="rounded-lg border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
          🎤 Voice Commands: "Search for rice" · "Find oil" · "Show low stock" · "Check sugar" · "Where is basmati rice?" · "Show me all products"
        </div>

        <div className="h-4" />
      </main>

      {/* ── Edit Product Modal ──────────────────────────────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setEditingProduct(null)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-base font-bold">✏️ Edit Product</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Price (₹)</label>
                <input type="number" min="0" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Category</label>
                <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingProduct(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSaveEdit} disabled={updateProduct.isPending}>
                {updateProduct.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Stock Modal ─────────────────────────────────────────── */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setAdjustingProduct(null)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-base font-bold">📦 Adjust Stock</h2>
            <p className="mb-4 text-sm text-muted-foreground">{adjustingProduct.name} · Current: {adjustingProduct.stock} {adjustingProduct.unit}</p>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setAdjustOp("add")} className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${adjustOp === "add" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                  + Add Stock
                </button>
                <button onClick={() => setAdjustOp("subtract")} className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${adjustOp === "subtract" ? "border-destructive bg-destructive/10 text-destructive" : "border-border"}`}>
                  - Remove Stock
                </button>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Quantity</label>
                <input type="number" min="1" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAdjustingProduct(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAdjustStock} disabled={adjustStock.isPending}
                variant={adjustOp === "subtract" ? "destructive" : "default"}>
                {adjustStock.isPending ? "Saving…" : (adjustOp === "add" ? `+ Add ${adjustQty}` : `- Remove ${adjustQty}`)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
