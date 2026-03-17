import { useState, useRef, useCallback, type FormEvent } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Edit,
  Eye,
  ScanLine,
  ImagePlus,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowUpDown,
  Share2,
  Clock,
  Star,
  Info,
} from "lucide-react";
import VoiceBar from "@/components/VoiceBar";
import BarcodeScanner from "@/components/BarcodeScanner";
import { wsClient } from "@/lib/ws";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useReportsEmbed } from "@/contexts/ReportsEmbedContext";
import {
  useProducts,
  useLowStockProducts,
  useInvoices,
  useCreateProduct,
  useUpdateProduct,
  useAdjustStock,
  useProductByBarcode,
  useProductImageUrls,
  useUploadProductImage,
  useDeleteProductImage,
} from "@/hooks/useQueries";
import { useWsInvalidation } from "@/hooks/useWsInvalidation";
import {
  formatCurrency,
  draftApi,
  aiApi,
  productApi,
  type Product,
  type Draft,
  type OcrJob,
} from "@/lib/api";
import { DraftConfirmDialog } from "@/components/DraftConfirmDialog";
import { ProductImage } from "@/components/ProductImage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { ReplenishmentBanner } from "@/components/ReplenishmentBanner";
import DashboardExpiryAlert from "@/components/DashboardExpiryAlert";

const voiceCommands = [
  "Show low stock",
  "Find expiring products",
  "Search rice",
  "Show all products",
  "Check oil stock",
  "Order rice",
  "Update price",
  "Add new product",
];

// ── Helper: safe numeric parse ────────────────────────────────────────────────
function num(v: string | number | undefined | null): number {
  if (v === undefined || v === null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isFinite(n) ? n : 0;
}

// ── Category icon helper (kirana-friendly emoji mapping) ─────────────────────
function categoryIcon(category?: string | null): string {
  if (!category) return "📦";
  const c = category.toLowerCase();
  if (c.includes("dairy") || c.includes("milk")) return "🥛";
  if (
    c.includes("grocery") ||
    c.includes("grain") ||
    c.includes("atta") ||
    c.includes("rice")
  )
    return "🌾";
  if (c.includes("oil") || c.includes("ghee")) return "🫙";
  if (c.includes("personal") || c.includes("beauty") || c.includes("soap"))
    return "🧴";
  if (
    c.includes("beverag") ||
    c.includes("drink") ||
    c.includes("tea") ||
    c.includes("coffee")
  )
    return "☕";
  if (c.includes("snack") || c.includes("biscuit") || c.includes("chips"))
    return "🍪";
  if (c.includes("vegetable") || c.includes("sabzi")) return "🥦";
  if (c.includes("fruit")) return "🍎";
  if (c.includes("pharma") || c.includes("medicine") || c.includes("drug"))
    return "💊";
  if (c.includes("tobacco") || c.includes("pan")) return "🚬";
  if (c.includes("clean") || c.includes("detergent")) return "🧹";
  return "📦";
}

const Inventory = () => {
  const navigate = useNavigate();
  const reportsEmbed = useReportsEmbed();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: lowStock = [], isLoading: lowStockLoading } =
    useLowStockProducts();
  const { data: allInvoices = [] } = useInvoices(200);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const lookupByBarcode = useProductByBarcode();
  const adjustStock = useAdjustStock();
  useWsInvalidation(["products", "lowStock"]);

  // ── Edit product state ─────────────────────────────────────────────────────
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editMinStock, setEditMinStock] = useState("");
  const [editWholesalePrice, setEditWholesalePrice] = useState("");
  const [editPriceTier2, setEditPriceTier2] = useState("");
  const [editPriceTier3, setEditPriceTier3] = useState("");

  // ── Stock adjust state ─────────────────────────────────────────────────────
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(
    null,
  );
  const [adjustQty, setAdjustQty] = useState("1");
  const [adjustOp, setAdjustOp] = useState<"add" | "subtract">("add");
  const [adjustReason, setAdjustReason] = useState("Manual Correction");

  // ── Inventory filter / sort state ─────────────────────────────────────────
  const [stockFilter, setStockFilter] = useState<
    "all" | "low" | "out" | "dead" | "favorites"
  >("all");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "value" | "price">(
    "name",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [deadStockDays, setDeadStockDays] = useState<30 | 60 | 90>(30);
  const [topSellingDays, setTopSellingDays] = useState<7 | 30 | 90>(30);
  const [showVoiceTools, setShowVoiceTools] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showHint, setShowHint] = useState(() => {
    try {
      return !localStorage.getItem("inventory-hint-dismissed");
    } catch {
      return true;
    }
  });

  // ── Add product state ──────────────────────────────────────────────────────
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addStock, setAddStock] = useState("0");
  const [addUnit, setAddUnit] = useState("Piece");
  const [addCategory, setAddCategory] = useState("");
  const [addBarcode, setAddBarcode] = useState("");
  const [addSku, setAddSku] = useState("");
  const [addHsnCode, setAddHsnCode] = useState("");
  const [addGstRate, setAddGstRate] = useState("0");
  const [addMrp, setAddMrp] = useState("");
  const [addCostPrice, setAddCostPrice] = useState("");
  const [addWholesalePrice, setAddWholesalePrice] = useState("");
  const [addPriceTier2, setAddPriceTier2] = useState("");
  const [addPriceTier3, setAddPriceTier3] = useState("");

  // Draft review state for the confirm dialog
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(null);

  // ── Bulk Product Import (OCR) state ───────────────────────────────────────
  const bulkImportFileRef = useRef<HTMLInputElement>(null);
  const csvImportFileRef = useRef<HTMLInputElement>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [bulkOcrJobId, setBulkOcrJobId] = useState<string | null>(null);
  const [bulkOcrJob, setBulkOcrJob] = useState<OcrJob | null>(null);
  const [bulkOcrOpen, setBulkOcrOpen] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);

  /** Poll catalog seed OCR job every 2 s until completed / failed */
  const pollBulkOcr = useCallback(
    (jobId: string) => {
      const timer = setInterval(async () => {
        try {
          const job = await aiApi.getOcrJob(jobId);
          setBulkOcrJob(job);
          if (job.status === "completed" || job.status === "failed") {
            clearInterval(timer);
            if (job.status === "completed") {
              await queryClient.invalidateQueries({ queryKey: ["drafts"] });
              // Auto-open the Draft panel so the user can review immediately
              window.dispatchEvent(new CustomEvent("open-draft-panel"));
              toast({
                title: "✅ Drafts ready for review",
                description: `${job.productsCreated ?? 0} product draft${(job.productsCreated ?? 0) === 1 ? "" : "s"} created — review in the Draft panel.`,
              });
            } else {
              toast({
                title: "Import failed",
                description:
                  job.errorMessage ?? "Could not read products from the image",
                variant: "destructive",
              });
            }
          }
        } catch {
          // silently retry
        }
      }, 2000);
    },
    [queryClient, toast],
  );

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setCsvImporting(true);
    try {
      const result = await productApi.importCsv(file);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "✅ CSV import complete",
        description: `${result.imported} imported${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
      });
      if (result.errors.length > 0) {
        console.warn("Import errors:", result.errors);
      }
    } catch (err) {
      toast({
        title: "❌ CSV import failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCsvImporting(false);
    }
  }

  async function handleBulkImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting same file

    setBulkUploading(true);
    setBulkOcrJob(null);
    setBulkOcrJobId(null);
    setBulkOcrOpen(true);
    try {
      const { jobId } = await aiApi.seedCatalogFromPhoto(file);
      setBulkOcrJobId(jobId);
      setBulkOcrJob({
        jobId,
        jobType: "product_catalog",
        status: "pending",
        productsCreated: 0,
      });
      pollBulkOcr(jobId);
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message,
        variant: "destructive",
      });
      setBulkOcrOpen(false);
    } finally {
      setBulkUploading(false);
    }
  }

  const resetAddProduct = () => {
    setAddName("");
    setAddPrice("");
    setAddStock("0");
    setAddUnit("Piece");
    setAddCategory("");
    setAddBarcode("");
    setAddSku("");
    setAddHsnCode("");
    setAddGstRate("0");
    setAddMrp("");
    setAddCostPrice("");
    setAddWholesalePrice("");
    setAddPriceTier2("");
    setAddPriceTier3("");
  };

  // ── Inline stock quick-edit ─────────────────────────────────────────────────
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditQty, setInlineEditQty] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inventoryScannerOpen, setInventoryScannerOpen] = useState(false);

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
    if (delta === 0) {
      setInlineEditId(null);
      return;
    }
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
      toast({
        title: "❌ Stock update failed",
        description: msg,
        variant: "destructive",
      });
    }
    setInlineEditId(null);
    setInlineSaving(false);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditPrice(String(parseFloat(String(p.price))));
    setEditCategory(p.category ?? "");
    setEditMinStock(p.minStock != null ? String(p.minStock) : "");
    setEditWholesalePrice(p.wholesalePrice != null ? String(p.wholesalePrice) : "");
    setEditPriceTier2(p.priceTier2 != null ? String(p.priceTier2) : "");
    setEditPriceTier3(p.priceTier3 != null ? String(p.priceTier3) : "");
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    await updateProduct.mutateAsync({
      id: editingProduct.id,
      name: editName || undefined,
      price: editPrice ? parseFloat(editPrice) : undefined,
      category: editCategory || undefined,
      minStock: editMinStock !== "" ? parseInt(editMinStock, 10) : undefined,
      wholesalePrice: editWholesalePrice ? parseFloat(editWholesalePrice) : undefined,
      priceTier2: editPriceTier2 ? parseFloat(editPriceTier2) : undefined,
      priceTier3: editPriceTier3 ? parseFloat(editPriceTier3) : undefined,
    });
    toast({ title: "✅ Product updated" });
    setEditingProduct(null);
  };

  const handleAdjustStock = async () => {
    if (!adjustingProduct) return;
    const qty = parseInt(adjustQty, 10);
    if (!qty || qty <= 0) {
      toast({ title: "⚠️ Enter a valid quantity", variant: "destructive" });
      return;
    }
    try {
      await adjustStock.mutateAsync({
        id: adjustingProduct.id,
        quantity: qty,
        operation: adjustOp,
      });
      toast({
        title: `✅ Stock ${adjustOp === "add" ? "added" : "reduced"} by ${qty}`,
      });
      setAdjustingProduct(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Stock update failed";
      toast({
        title: "❌ Cannot update stock",
        description: msg,
        variant: "destructive",
      });
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

  const topSellingCutoff = new Date();
  topSellingCutoff.setDate(topSellingCutoff.getDate() - topSellingDays);

  const topSalesMap = new Map<string, { units: number; revenue: number }>();
  for (const inv of allInvoices) {
    if (inv.status === "cancelled") continue;
    if (new Date(inv.createdAt) < topSellingCutoff) continue;
    for (const item of inv.items ?? []) {
      const name = item.product?.name ?? item.productName ?? "Unknown";
      const existing = topSalesMap.get(name) ?? { units: 0, revenue: 0 };
      topSalesMap.set(name, {
        units: existing.units + item.quantity,
        revenue: existing.revenue + num(item.itemTotal ?? 0),
      });
    }
  }

  // Low stock IDs set
  const lowStockIds = new Set(lowStock.map((p) => p.id));

  // Summary stats
  const categories = [
    "All",
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
  ];
  const totalValue = products.reduce(
    (sum, p) => sum + num(p.price) * num(p.stock),
    0,
  );
  const outCount = products.filter((p) => num(p.stock) === 0).length;
  const lowCount = lowStock.length;
  const deadCount = products.filter(
    (p) => (salesMap.get(p.name)?.units ?? 0) === 0 && p.stock > 0,
  ).length;
  const favoritesCount = products.filter((p) => p.isFeatured).length;

  const uploadProductImage = useUploadProductImage();
  const deleteProductImage = useDeleteProductImage();
  const editImageInputRef = useRef<HTMLInputElement>(null);

  // Filtered products for the main table
  const filteredProducts = products
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "All" || p.category === category;

      // Stock filter tabs
      const sold = salesMap.get(p.name)?.units ?? 0;
      let matchesStockFilter = true;
      if (stockFilter === "low")
        matchesStockFilter = lowStockIds.has(p.id) && p.stock > 0;
      if (stockFilter === "out") matchesStockFilter = p.stock === 0;
      if (stockFilter === "dead")
        matchesStockFilter = sold === 0 && p.stock > 0;
      if (stockFilter === "favorites") matchesStockFilter = !!p.isFeatured;

      return matchesSearch && matchesCategory && matchesStockFilter;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "stock") cmp = a.stock - b.stock;
      else if (sortBy === "value")
        cmp =
          parseFloat(String(a.price)) * a.stock -
          parseFloat(String(b.price)) * b.stock;
      else if (sortBy === "price")
        cmp = parseFloat(String(a.price)) - parseFloat(String(b.price));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const { data: imageUrlsMap = {} } = useProductImageUrls([
    ...filteredProducts.map((p) => p.id),
    ...lowStock.map((p) => p.id),
  ]);

  // Top selling: sorted by revenue from invoices (fallback: lowest stock first)
  const topSelling = [...products]
    .filter((p) => p.isActive)
    .sort((a, b) => {
      const aRev = topSalesMap.get(a.name)?.revenue ?? 0;
      const bRev = topSalesMap.get(b.name)?.revenue ?? 0;
      return bRev - aRev || a.stock - b.stock;
    })
    .filter((p) => (topSalesMap.get(p.name)?.units ?? 0) > 0)
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
        time: new Date(inv.createdAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        product: item.productName ?? "Unknown",
        qty: `-${item.quantity}`,
        type: "Sale",
        ref: inv.invoiceNo,
        notes: inv.customer?.name ? `Sold to ${inv.customer.name}` : "Sale",
      })),
    )
    .slice(0, 8);

  const handleAddProduct = () => setAddProductOpen(true);

  /** Called when BarcodeScanner finds a code in the Inventory add-product context */
  const handleInventoryBarcodeScan = async (code: string) => {
    setInventoryScannerOpen(false);
    setAddBarcode(code);
    // Try to look up an existing product with this barcode
    try {
      const res = await lookupByBarcode.mutateAsync(code);
      if (res?.product) {
        const p = res.product;
        setAddName(p.name);
        setAddPrice(String(parseFloat(String(p.price))));
        setAddUnit(p.unit || "Piece");
        if (p.category) setAddCategory(p.category);
        if (p.sku) setAddSku(p.sku);
        toast({
          title: `🔍 Found: ${p.name}`,
          description: "Details pre-filled from existing product",
        });
      }
    } catch {
      // 404 = new product — that's fine, barcode is set, user fills the rest
      toast({
        title: `🔷 Barcode: ${code}`,
        description: "New product — fill in the details below",
      });
    }
  };

  const handleSubmitAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    const price = parseFloat(addPrice);
    const stock = parseInt(addStock, 10);
    if (!addName.trim()) {
      toast({ title: "⚠️ Product name is required", variant: "destructive" });
      return;
    }
    if (isNaN(price) || price <= 0) {
      toast({ title: "⚠️ Enter a valid price", variant: "destructive" });
      return;
    }
    try {
      // Save as draft first — user reviews before final save
      const { draft } = await draftApi.create(
        "product",
        {
          name: addName.trim(),
          price,
          stock: isNaN(stock) ? 0 : stock,
          unit: addUnit || undefined,
          category: addCategory.trim() || undefined,
          barcode: addBarcode.trim() || undefined,
          sku: addSku.trim() || undefined,
          hsnCode: addHsnCode.trim() || undefined,
          gstRate: parseFloat(addGstRate) || 0,
          mrp: addMrp ? parseFloat(addMrp) : undefined,
          cost: addCostPrice ? parseFloat(addCostPrice) : undefined,
          wholesalePrice: addWholesalePrice ? parseFloat(addWholesalePrice) : undefined,
          priceTier2: addPriceTier2 ? parseFloat(addPriceTier2) : undefined,
          priceTier3: addPriceTier3 ? parseFloat(addPriceTier3) : undefined,
        },
        `New product: ${addName.trim()}`,
      );
      // Immediately refresh the draft panel badge
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      setPendingDraft(draft);
      resetAddProduct();
      setAddProductOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create draft";
      toast({
        title: "❌ Could not create draft",
        description: msg,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => reportsEmbed?.onBack?.() ?? navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">📦 Items</h1>
              <p className="text-xs text-muted-foreground">
                One-tap stock updates, barcode scan, OCR import, and live alerts
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Bulk Import via Photo — opens file picker, sends to AI OCR */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkImportFileRef.current?.click()}
              disabled={bulkUploading}
              title="Import from photo (OCR)"
            >
              {bulkUploading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="mr-1 h-4 w-4" />
              )}
              Photo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => csvImportFileRef.current?.click()}
              disabled={csvImporting}
              title="Import from CSV (name, price, stock, category, etc.)"
            >
              {csvImporting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Package className="mr-1 h-4 w-4" />
              )}
              CSV
            </Button>
            <Button size="sm" onClick={handleAddProduct}>
              <Plus className="mr-1 h-4 w-4" /> Add Product
            </Button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={bulkImportFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBulkImportFile}
          />
          <input
            ref={csvImportFileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={handleCsvImport}
          />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 p-4 pb-24 md:p-6 md:pb-6">
        {showHint && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <p className="text-sm text-foreground">
              <span className="font-semibold">Tip:</span> Tap <strong>+ Add Product</strong> to add items. Use <strong>+</strong> / <strong>−</strong> on each row to adjust stock quickly.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => {
                setShowHint(false);
                try {
                  localStorage.setItem("inventory-hint-dismissed", "1");
                } catch {
                  /* ignore */
                }
              }}
            >
              Dismiss
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {[
            "⚡ Real-time stock",
            "🟡 Reorder alerts",
            "📷 Barcode scan",
            "🧠 OCR import",
            "➕ Fast stock adjust",
          ].map((feature) => (
            <span
              key={feature}
              className="rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {feature}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={showVoiceTools ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => setShowVoiceTools((v) => !v)}
          >
            🎤 {showVoiceTools ? "Hide Voice Tools" : "Show Voice Tools"}
          </Button>
          <Button
            size="sm"
            variant={showInsights ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => setShowInsights((v) => !v)}
          >
            📈 {showInsights ? "Hide Insights" : "Show Insights"}
          </Button>
        </div>

        {showVoiceTools && (
          <Card className="border-none bg-primary/5 shadow-sm">
            <CardContent className="p-4">
              <p className="mb-1 text-sm font-semibold">
                🎤 Voice Search Center
              </p>
              <VoiceBar
                idleHint={
                  <>
                    <span className="font-medium text-foreground">
                      "Search for rice"
                    </span>
                    {" · "}
                    <span>"Show low stock"</span>
                    {" · "}
                    <span>"Find oil"</span>
                  </>
                }
              />
            </CardContent>
          </Card>
        )}

        {/* Replenishment Banner — AI stock advisor */}
        <ReplenishmentBanner />
        <DashboardExpiryAlert />

        {/* Inventory Summary */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            📊 Inventory Summary
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              {
                label: "Total Products",
                value: productsLoading ? "…" : String(products.length),
                sub: `${categories.length - 1} categories`,
                icon: Package,
                color: "text-primary",
              },
              {
                label: "Low Stock ⚠️",
                value: lowStockLoading ? "…" : String(lowCount),
                sub: "Need reorder",
                icon: AlertTriangle,
                color: "text-destructive",
              },
              {
                label: "Out of Stock 🔴",
                value: String(outCount),
                sub: "Needs urgent reorder",
                icon: TrendingDown,
                color: "text-destructive",
              },
              {
                label: "Total Value",
                value: formatCurrency(totalValue),
                sub: "",
                icon: TrendingUp,
                color: "text-primary",
              },
            ].map((s) => (
              <Card key={s.label} className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </p>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <p className="mt-2 text-2xl font-bold">{s.value}</p>
                  {s.sub && (
                    <p className="text-xs text-muted-foreground">{s.sub}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {showVoiceTools && (
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                🎤 Voice Quick Commands
              </CardTitle>
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
                      setSearch(
                        cmd.replace(
                          /^(Show |Find |Search |Check |Order |Update |Add )/,
                          "",
                        ),
                      );
                      wsClient.send("voice:final", { text: cmd });
                      toast({
                        title: `🎤 "${cmd}"`,
                        description: "Voice command sent",
                      });
                    }}
                  >
                    "{cmd}"
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setInventoryScannerOpen(true)}
          >
            <ScanLine className="mr-1 h-3.5 w-3.5" /> Scan barcode
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => bulkImportFileRef.current?.click()}
          >
            <ImagePlus className="mr-1 h-3.5 w-3.5" /> Import from photo
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={handleAddProduct}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> New item
          </Button>
          <Button
            size="sm"
            variant={stockFilter === "low" ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => setStockFilter("low")}
          >
            ⚠️ Low ({lowCount})
          </Button>
          <Button
            size="sm"
            variant={stockFilter === "out" ? "destructive" : "outline"}
            className="h-8 text-xs"
            onClick={() => setStockFilter("out")}
          >
            🔴 Out ({outCount})
          </Button>
        </div>

        {stockFilter === "all" && !search && lowCount > 0 && (
          <button
            onClick={() => setStockFilter("low")}
            className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100"
          >
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {lowCount} item{lowCount === 1 ? "" : "s"} below reorder level
              </p>
              <p className="text-xs text-amber-700">
                Tap to review low-stock items instantly
              </p>
            </div>
            <span className="text-sm font-semibold text-amber-700">View</span>
          </button>
        )}

        {/* Low Stock Alerts */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                ⚠️ Low Stock Alerts ({lowStockLoading ? "…" : lowStock.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    const lines = lowStock
                      .filter((p) =>
                        p.stock > 0 ? lowStockIds.has(p.id) : true,
                      )
                      .map((p) => `• ${p.name}: ${p.stock} ${p.unit}`)
                      .join("\n");
                    const msg = encodeURIComponent(
                      `⚠️ Low Stock Alert\n\n${lines}\n\nPlease arrange supply ASAP.`,
                    );
                    window.open(`https://wa.me/?text=${msg}`, "_blank");
                  }}
                >
                  <Share2 className="mr-1 h-3 w-3 text-green-600" /> WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => toast({ title: "All items ordered!" })}
                >
                  Order All
                </Button>
              </div>
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
                      <TableCell
                        colSpan={7}
                        className="text-center py-6 text-muted-foreground"
                      >
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : lowStock.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-6 text-muted-foreground"
                      >
                        ✅ All items well stocked!
                      </TableCell>
                    </TableRow>
                  ) : (
                    lowStock.map((item, i) => (
                      <TableRow key={item.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <ProductImage
                              product={item}
                              imageUrl={imageUrlsMap[item.id]}
                              size="sm"
                              className="shrink-0"
                            />
                            <span>
                              {categoryIcon(item.category)} {item.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.stock} {item.unit}{" "}
                          {item.stock === 0 ? (
                            <span className="text-destructive">🔴</span>
                          ) : (
                            <span className="text-yellow-500">🟡</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.minStock ?? 5}
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{formatCurrency(num(item.price))}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              toast({ title: `Order placed for ${item.name}` })
                            }
                          >
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

        {showInsights && (
          <>
            {/* Top Selling Products */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base">
                    🔥 Top Selling Products ({topSellingDays}d)
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    {([7, 30, 90] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setTopSellingDays(d)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${topSellingDays === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
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
                          <TableCell
                            colSpan={7}
                            className="text-center py-6 text-muted-foreground"
                          >
                            No products found
                          </TableCell>
                        </TableRow>
                      ) : (
                        topSelling.map((p, i) => {
                          const sales = topSalesMap.get(p.name);
                          const needsReorder =
                            lowStockIds.has(p.id) || p.stock === 0;
                          const stockLabel =
                            p.stock === 0
                              ? `0 ${p.unit} 🔴`
                              : p.stock <= 5
                                ? `${p.stock} ${p.unit} ⚠️`
                                : `${p.stock} ${p.unit} ✅`;
                          return (
                            <TableRow key={p.id}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell className="font-medium">
                                {categoryIcon(p.category)} {p.name}
                              </TableCell>
                              <TableCell>{sales?.units ?? 0}</TableCell>
                              <TableCell>
                                {formatCurrency(sales?.revenue ?? 0)}
                              </TableCell>
                              <TableCell>{stockLabel}</TableCell>
                              <TableCell>
                                {needsReorder ? (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px]"
                                  >
                                    YES - URGENT
                                  </Badge>
                                ) : (
                                  "No"
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant={needsReorder ? "default" : "ghost"}
                                  className="h-7 text-xs"
                                >
                                  {needsReorder ? (
                                    <>
                                      <ShoppingCart className="mr-1 h-3 w-3" />{" "}
                                      Order
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="mr-1 h-3 w-3" /> View
                                    </>
                                  )}
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

            {/* Slow Moving / Dead Stock Products */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">
                    💤 Dead Stock / Slow Moving Products
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      No sales in
                    </span>
                    {([30, 60, 90] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDeadStockDays(d)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${deadStockDays === d ? "bg-slate-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                      >
                        {d}d
                      </button>
                    ))}
                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                      View All
                    </Button>
                  </div>
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
                          <TableCell
                            colSpan={6}
                            className="text-center py-6 text-muted-foreground"
                          >
                            No slow moving products
                          </TableCell>
                        </TableRow>
                      ) : (
                        slowMoving.map((p, i) => {
                          const sold = salesMap.get(p.name)?.units ?? 0;
                          const risk =
                            sold === 0 ? "High" : sold < 5 ? "Medium" : "Low";
                          return (
                            <TableRow key={p.id}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell className="font-medium">
                                {categoryIcon(p.category)} {p.name}
                              </TableCell>
                              <TableCell>
                                {p.stock} {p.unit}
                              </TableCell>
                              <TableCell>{sold} units</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    risk === "High"
                                      ? "destructive"
                                      : risk === "Medium"
                                        ? "secondary"
                                        : "outline"
                                  }
                                  className="text-[10px]"
                                >
                                  {risk}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                >
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
          </>
        )}

        {/* All Products — Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              {
                key: "all",
                label: "All Items",
                count: products.length,
                color: "bg-primary text-primary-foreground",
              },
              {
                key: "low",
                label: "⚠️ Low Stock",
                count: lowCount,
                color: "bg-amber-500 text-white",
              },
              {
                key: "out",
                label: "🔴 Out of Stock",
                count: outCount,
                color: "bg-red-500 text-white",
              },
              {
                key: "dead",
                label: "💤 Dead Stock",
                count: deadCount,
                color: "bg-slate-500 text-white",
              },
              {
                key: "favorites",
                label: "⭐ Favorites",
                count: favoritesCount,
                color: "bg-amber-500 text-white",
              },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setStockFilter(t.key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                stockFilter === t.key
                  ? t.color
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${stockFilter === t.key ? "bg-white/25" : "bg-muted-foreground/20"}`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* All Products */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">
                {stockFilter === "all" && "📋 All Products"}
                {stockFilter === "low" && "⚠️ Low Stock Items"}
                {stockFilter === "out" && "🔴 Out of Stock Items"}
                {stockFilter === "dead" && "💤 Dead / Non-Moving Stock"}
                {stockFilter === "favorites" && "⭐ Favorites"}{" "}
                <span className="text-muted-foreground font-normal">
                  ({filteredProducts.length})
                </span>
              </CardTitle>
              {/* Sort control */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                >
                  <option value="name">Name A→Z</option>
                  <option value="stock">Stock Qty</option>
                  <option value="value">Stock Value</option>
                  <option value="price">Price</option>
                </select>
                <button
                  onClick={() =>
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                  }
                  className="rounded border border-input bg-background px-2 py-1 text-xs hover:bg-muted"
                  title={
                    sortDir === "asc" ? "Sort ascending" : "Sort descending"
                  }
                >
                  {sortDir === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>
            {stockFilter === "dead" && (
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  No sales in
                </span>
                {([30, 60, 90] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDeadStockDays(d)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${deadStockDays === d ? "bg-slate-600 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            )}
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
                    <TableHead>Value</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-6 text-muted-foreground"
                      >
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-6 text-muted-foreground"
                      >
                        {stockFilter === "dead"
                          ? `✅ No dead stock — all items have sales in the last ${deadStockDays} days`
                          : "No products found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p) => {
                      const isOut = p.stock === 0;
                      const isLow = !isOut && lowStockIds.has(p.id);
                      const isDead =
                        !isOut && (salesMap.get(p.name)?.units ?? 0) === 0;
                      const stockValue = parseFloat(String(p.price)) * p.stock;
                      const isEditing = inlineEditId === p.id;

                      // RAG status badge
                      const statusBadge = isOut
                        ? {
                            label: "Out of Stock",
                            cls: "bg-red-500 text-white",
                          }
                        : isLow
                          ? {
                              label: "Low Stock",
                              cls: "bg-amber-500 text-white",
                            }
                          : isDead
                            ? {
                                label: "Dead Stock",
                                cls: "bg-slate-500 text-white",
                              }
                            : {
                                label: "In Stock",
                                cls: "bg-green-500 text-white",
                              };

                      return (
                        <TableRow
                          key={p.id}
                          className={
                            isOut
                              ? "bg-red-50/40 dark:bg-red-950/20"
                              : isLow
                                ? "bg-amber-50/40 dark:bg-amber-950/20"
                                : isDead
                                  ? "bg-slate-50/40 dark:bg-slate-900/20"
                                  : ""
                          }
                        >
                          <TableCell>
                            <span
                              className={`inline-block w-1 h-8 rounded-full ${
                                isOut
                                  ? "bg-red-500"
                                  : isLow
                                    ? "bg-amber-500"
                                    : isDead
                                      ? "bg-slate-400"
                                      : "bg-green-500"
                              }`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <ProductImage
                                product={p}
                                imageUrl={imageUrlsMap[p.id]}
                                size="sm"
                                className="shrink-0"
                              />
                              <div>
                                <div>
                                  <span className="mr-1">
                                    {categoryIcon(p.category)}
                                  </span>
                                  {p.name}
                                </div>
                              {(p.sku || p.barcode || p.minStock != null) && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {p.sku && (
                                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                      SKU {p.sku}
                                    </span>
                                  )}
                                  {p.barcode && (
                                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                      EAN {p.barcode}
                                    </span>
                                  )}
                                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    Reorder {p.minStock ?? 5}
                                  </span>
                                </div>
                              )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={inlineEditQty}
                                  onChange={(e) =>
                                    setInlineEditQty(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      void saveInlineEdit(p);
                                    if (e.key === "Escape")
                                      setInlineEditId(null);
                                  }}
                                  autoFocus
                                  className="w-16 rounded border border-primary bg-background px-1.5 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {p.unit}
                                </span>
                                <button
                                  onClick={() => void saveInlineEdit(p)}
                                  disabled={inlineSaving}
                                  className="rounded px-1 text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                  title="Save (Enter)"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => setInlineEditId(null)}
                                  className="rounded px-1 text-xs text-muted-foreground hover:bg-muted"
                                  title="Cancel (Esc)"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startInlineEdit(p)}
                                className="group flex items-center gap-1 rounded px-1 hover:bg-muted"
                                title="Click to edit stock"
                              >
                                <span
                                  className={
                                    isOut
                                      ? "text-red-600 font-semibold"
                                      : isLow
                                        ? "text-amber-600 font-semibold"
                                        : ""
                                  }
                                >
                                  {p.stock} {p.unit}
                                </span>
                                <span className="invisible text-[10px] text-muted-foreground group-hover:visible">
                                  ✎
                                </span>
                              </button>
                            )}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(num(p.price))}/{p.unit}
                          </TableCell>
                          <TableCell className="font-medium text-primary">
                            {formatCurrency(stockValue)}
                          </TableCell>
                          <TableCell>
                            {p.category && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                                {p.category}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge.cls}`}
                            >
                              {statusBadge.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 items-center">
                              <button
                                onClick={() =>
                                  updateProduct.mutateAsync({
                                    id: p.id,
                                    isFeatured: !p.isFeatured,
                                  })
                                }
                                disabled={updateProduct.isPending}
                                className={`p-1 rounded hover:bg-muted ${p.isFeatured ? "text-amber-500" : "text-muted-foreground"}`}
                                title={p.isFeatured ? "Remove from favorites" : "Add to favorites"}
                              >
                                <Star
                                  className="h-4 w-4"
                                  fill={p.isFeatured ? "currentColor" : "none"}
                                />
                              </button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => openEdit(p)}
                              >
                                <Edit className="mr-1 h-3 w-3" /> Edit
                              </Button>
                              {/* Quick stock ±1 buttons (from mobile Items screen) */}
                              <button
                                onClick={() =>
                                  adjustStock.mutateAsync({
                                    id: p.id,
                                    quantity: 1,
                                    operation: "subtract",
                                  })
                                }
                                disabled={p.stock <= 0 || adjustStock.isPending}
                                className="flex h-7 w-7 items-center justify-center rounded border border-red-200 bg-red-50 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-30"
                                title="Quick −1 stock"
                              >
                                −
                              </button>
                              <button
                                onClick={() =>
                                  adjustStock.mutateAsync({
                                    id: p.id,
                                    quantity: 1,
                                    operation: "add",
                                  })
                                }
                                disabled={adjustStock.isPending}
                                className="flex h-7 w-7 items-center justify-center rounded border border-green-200 bg-green-50 text-sm font-bold text-green-600 hover:bg-green-100"
                                title="Quick +1 stock"
                              >
                                +
                              </button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setAdjustingProduct(p);
                                  setAdjustQty("1");
                                  setAdjustOp("add");
                                }}
                              >
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
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled
              >
                ← Prev
              </Button>
              <span>
                Showing {filteredProducts.length} of {products.length} products
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled
              >
                Next →
              </Button>
            </div>
          </CardContent>
        </Card>

        {showInsights && (
          <>
            {/* Recent Stock Movements */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  📦 Recent Stock Movements
                </CardTitle>
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
                          <TableCell
                            colSpan={6}
                            className="text-center py-6 text-muted-foreground"
                          >
                            No movements yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        recentMovements.map((m, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs text-muted-foreground">
                              {m.time}
                            </TableCell>
                            <TableCell className="font-medium">
                              {m.product}
                            </TableCell>
                            <TableCell className="text-destructive font-medium">
                              {m.qty}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {m.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{m.ref}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {m.notes}
                            </TableCell>
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
              🎤 Voice Commands: "Search for rice" · "Find oil" · "Show low
              stock" · "Check sugar" · "Where is basmati rice?" · "Show me all
              products"
            </div>
          </>
        )}

        <div className="h-4" />
      </main>

      {/* ── Edit Product Modal ──────────────────────────────────────────── */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-base font-bold">✏️ Edit Product</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Product Image
                </label>
                <div className="flex items-center gap-3">
                  <ProductImage
                    product={editingProduct}
                    imageUrl={
                      editingProduct.imageUrl?.startsWith("http")
                        ? editingProduct.imageUrl
                        : imageUrlsMap[editingProduct.id]
                    }
                    size="lg"
                  />
                  <div className="flex flex-col gap-1">
                    <input
                      ref={editImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !editingProduct) return;
                        e.target.value = "";
                        try {
                          await uploadProductImage.mutateAsync({
                            productId: editingProduct.id,
                            file,
                          });
                          queryClient.invalidateQueries({ queryKey: ["products"] });
                          queryClient.invalidateQueries({ queryKey: ["productImageUrls"] });
                          toast({ title: "✅ Image uploaded" });
                        } catch (err) {
                          toast({
                            title: "❌ Upload failed",
                            description: err instanceof Error ? err.message : "Unknown error",
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editImageInputRef.current?.click()}
                      disabled={uploadProductImage.isPending}
                    >
                      {uploadProductImage.isPending ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="mr-1 h-4 w-4" />
                      )}
                      Upload
                    </Button>
                    {editingProduct.imageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={async () => {
                          if (!editingProduct) return;
                          try {
                            await deleteProductImage.mutateAsync(editingProduct.id);
                            queryClient.invalidateQueries({ queryKey: ["products"] });
                            toast({ title: "Image removed" });
                          } catch {
                            toast({
                              title: "Could not remove image",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={deleteProductImage.isPending}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Name
                </label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Category
                </label>
                <input
                  list="edit-category-list"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Select or type new"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                />
                <datalist id="edit-category-list">
                  {categories
                    .filter((c) => c !== "All")
                    .sort()
                    .map((c) => (
                      <option key={c} value={c} />
                    ))}
                </datalist>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                  Min Stock Alert (units)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">
                          <Info className="h-3.5 w-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reorder level — you&apos;ll get a low-stock alert when quantity falls below this.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 5"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editMinStock}
                  onChange={(e) => setEditMinStock(e.target.value)}
                />
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Alert when stock falls below this level
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Wholesale (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="—"
                    value={editWholesalePrice}
                    onChange={(e) => setEditWholesalePrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Tier 2 (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="—"
                    value={editPriceTier2}
                    onChange={(e) => setEditPriceTier2(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Tier 3 (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="—"
                    value={editPriceTier3}
                    onChange={(e) => setEditPriceTier3(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingProduct(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveEdit}
                disabled={updateProduct.isPending}
              >
                {updateProduct.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Stock Modal ─────────────────────────────────────────── */}
      {adjustingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setAdjustingProduct(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-base font-bold">📦 Adjust Stock</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {adjustingProduct.name} · Current: {adjustingProduct.stock}{" "}
              {adjustingProduct.unit}
            </p>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setAdjustOp("add")}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${adjustOp === "add" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                >
                  + Add Stock
                </button>
                <button
                  onClick={() => setAdjustOp("subtract")}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${adjustOp === "subtract" ? "border-destructive bg-destructive/10 text-destructive" : "border-border"}`}
                >
                  - Remove Stock
                </button>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Reason
                </label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                >
                  {adjustOp === "add" ? (
                    <>
                      <option>Purchase Received</option>
                      <option>Return from Customer</option>
                      <option>Opening Stock Entry</option>
                      <option>Stock Transfer In</option>
                      <option>Manual Correction</option>
                    </>
                  ) : (
                    <>
                      <option>Sold / Billed</option>
                      <option>Damaged / Expired</option>
                      <option>Theft / Loss</option>
                      <option>Return to Supplier</option>
                      <option>Manual Correction</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAdjustingProduct(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAdjustStock}
                disabled={adjustStock.isPending}
                variant={adjustOp === "subtract" ? "destructive" : "default"}
              >
                {adjustStock.isPending
                  ? "Saving…"
                  : adjustOp === "add"
                    ? `+ Add ${adjustQty}`
                    : `- Remove ${adjustQty}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Product Modal ──────────────────────────────────────────── */}
      {addProductOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => {
            setAddProductOpen(false);
            resetAddProduct();
          }}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-base font-bold">➕ Add New Product</h2>
            <form onSubmit={handleSubmitAddProduct} className="space-y-3">
              {/*
               * Barcode row — SCAN ONLY.
               * No photo capture / camera image upload here.
               * Use the "Import" button in the header for bulk imports from photos.
               */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Barcode / EAN
                  </label>
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Scan or type barcode…"
                    value={addBarcode}
                    onChange={(e) => setAddBarcode(e.target.value)}
                  />
                </div>
                {/* Scan button — opens live barcode scanner (camera), NOT a photo picker */}
                <button
                  type="button"
                  onClick={() => setInventoryScannerOpen(true)}
                  className="mt-5 flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <ScanLine className="h-4 w-4" />
                  Scan
                </button>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Product Name *
                </label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Basmati Rice 1kg"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="0.00"
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Opening Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="0"
                    value={addStock}
                    onChange={(e) => setAddStock(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Unit
                  </label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={addUnit}
                    onChange={(e) => setAddUnit(e.target.value)}
                  >
                    <option>Piece</option>
                    <option>Kg</option>
                    <option>Gram</option>
                    <option>Litre</option>
                    <option>ML</option>
                    <option>Box</option>
                    <option>Dozen</option>
                    <option>Bag</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Category
                  </label>
                  <input
                    list="add-category-list"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Select or type new (e.g. Grains)"
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                  />
                  <datalist id="add-category-list">
                    {categories
                      .filter((c) => c !== "All")
                      .sort()
                      .map((c) => (
                        <option key={c} value={c} />
                      ))}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  SKU (optional)
                </label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g. SKU-001"
                  value={addSku}
                  onChange={(e) => setAddSku(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    HSN Code (optional)
                  </label>
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="e.g. 1001"
                    value={addHsnCode}
                    onChange={(e) => setAddHsnCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    GST Rate %
                  </label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={addGstRate}
                    onChange={(e) => setAddGstRate(e.target.value)}
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    MRP (₹, optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="0.00"
                    value={addMrp}
                    onChange={(e) => setAddMrp(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Cost Price (₹, optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="0.00"
                    value={addCostPrice}
                    onChange={(e) => setAddCostPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Wholesale (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="—"
                    value={addWholesalePrice}
                    onChange={(e) => setAddWholesalePrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Tier 2 (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="—"
                    value={addPriceTier2}
                    onChange={(e) => setAddPriceTier2(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Tier 3 (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="—"
                    value={addPriceTier3}
                    onChange={(e) => setAddPriceTier3(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setAddProductOpen(false);
                    resetAddProduct();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createProduct.isPending}
                >
                  {createProduct.isPending ? "Adding…" : "Add Product"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Barcode Scanner (inventory context) ───────────────────────── */}
      {inventoryScannerOpen && (
        <BarcodeScanner
          hint="Point camera at product barcode to auto-fill details"
          onScan={handleInventoryBarcodeScan}
          onClose={() => setInventoryScannerOpen(false)}
        />
      )}

      {/* ── Bulk Product Import — OCR progress dialog ────────────────── */}
      <Dialog
        open={bulkOcrOpen}
        onOpenChange={(o) => {
          if (
            !o &&
            bulkOcrJob?.status !== "pending" &&
            bulkOcrJob?.status !== "processing"
          ) {
            setBulkOcrOpen(false);
            setBulkOcrJobId(null);
            setBulkOcrJob(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5" />
              Bulk Product Import
            </DialogTitle>
          </DialogHeader>

          {/* Uploading / Processing */}
          {(!bulkOcrJob ||
            bulkOcrJob.status === "pending" ||
            bulkOcrJob.status === "processing") && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {bulkUploading
                  ? "Uploading image…"
                  : "AI is reading product details…"}
              </p>
              <p className="text-xs text-muted-foreground/60">
                This usually takes 5–20 seconds
              </p>
            </div>
          )}

          {/* Completed */}
          {bulkOcrJob?.status === "completed" && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-6 w-6 flex-shrink-0" />
                <div>
                  <p className="font-medium">Drafts created for review!</p>
                  <p className="text-sm text-muted-foreground">
                    {bulkOcrJob.productsCreated ||
                      (bulkOcrJob as any).parsedItems?.length ||
                      0}{" "}
                    product draft
                    {(bulkOcrJob.productsCreated ||
                      (bulkOcrJob as any).parsedItems?.length ||
                      0) === 1
                      ? ""
                      : "s"}{" "}
                    waiting for your approval
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
                📋 Open the <strong>Drafts panel</strong> (top-right) to review
                and confirm each product before it's saved.
              </div>
              {/* Preview parsed items */}
              {Array.isArray((bulkOcrJob as any).parsedItems) &&
                (bulkOcrJob as any).parsedItems.length > 0 && (
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                    {(
                      (bulkOcrJob as any).parsedItems as Array<{
                        name?: string;
                        price?: number;
                        category?: string;
                      }>
                    ).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="truncate pr-2">
                          {item.name ?? "Product"}
                        </span>
                        {item.price != null && (
                          <span className="shrink-0 text-muted-foreground">
                            ₹{item.price}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* Failed */}
          {bulkOcrJob?.status === "failed" && (
            <div className="flex items-start gap-2 py-4 text-destructive">
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Import failed</p>
                <p className="text-sm">
                  {bulkOcrJob.errorMessage ??
                    "Could not extract products from the image"}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkOcrOpen(false);
                setBulkOcrJobId(null);
                setBulkOcrJob(null);
              }}
            >
              Close
            </Button>
            {bulkOcrJob?.status === "failed" && (
              <Button
                onClick={() => {
                  setBulkOcrOpen(false);
                  setBulkOcrJob(null);
                  setBulkOcrJobId(null);
                  setTimeout(() => bulkImportFileRef.current?.click(), 100);
                }}
              >
                Try Again
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draft review & confirm */}
      <DraftConfirmDialog
        draft={pendingDraft}
        open={!!pendingDraft}
        onClose={() => setPendingDraft(null)}
        onConfirmed={() => setPendingDraft(null)}
        onDiscarded={() => setPendingDraft(null)}
        categories={categories.filter((c) => c !== "All")}
      />

    </div>
  );
};

export default Inventory;
