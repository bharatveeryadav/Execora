/**
 * Purchase Orders — Formal orders to suppliers before goods received.
 * List, create, receive (updates stock), cancel.
 */
import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Package,
  CheckCircle,
  XCircle,
  Truck,
  ChevronDown,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useReceivePurchaseOrder,
  useCancelPurchaseOrder,
  useSuppliers,
  useCreateSupplier,
  useProducts,
} from "@/hooks/useQueries";
import { formatCurrency, formatDate, type PurchaseOrder } from "@/lib/api";

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "partial", label: "Partial" },
  { key: "received", label: "Received" },
  { key: "draft", label: "Draft" },
  { key: "cancelled", label: "Cancelled" },
] as const;

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "pending":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>;
    case "partial":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Partial</Badge>;
    case "received":
      return <Badge className="bg-green-100 text-green-700 border-green-200">Received</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState<PurchaseOrder | null>(null);

  const { data, isLoading } = usePurchaseOrders({
    status: statusFilter || undefined,
    limit: 50,
  });
  const orders = data?.purchaseOrders ?? [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Purchase Orders</h1>
              <p className="text-xs text-muted-foreground">{orders.length} orders</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New PO
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="flex gap-1 overflow-x-auto scrollbar-none rounded-xl border bg-muted/30 p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === t.key ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <div>
                <p className="font-medium">No purchase orders yet</p>
                <p className="text-sm text-muted-foreground">
                  Create a PO to order stock from suppliers before receiving goods.
                </p>
              </div>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create First PO
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {orders.map((po) => (
              <Card key={po.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setReceiveOpen(po)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{po.poNo}</p>
                        {statusBadge(po.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {po.supplier?.name ?? "No supplier"} · {po.items?.length ?? 0} items
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(po.orderDate)}
                        {po.expectedDate && ` · Expected ${formatDate(po.expectedDate)}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">{formatCurrency(Number(po.total))}</p>
                      {(po.status === "pending" || po.status === "partial") && (
                        <Button size="sm" variant="outline" className="mt-1 gap-1">
                          <Truck className="h-3 w-3" /> Receive
                        </Button>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {createOpen && (
        <CreatePODialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            toast({ title: "Purchase order created" });
          }}
        />
      )}

      {receiveOpen && (
        <ReceiveDialog
          po={receiveOpen}
          open={!!receiveOpen}
          onClose={() => setReceiveOpen(null)}
          onSuccess={() => {
            setReceiveOpen(null);
            toast({ title: "Goods received", description: "Stock updated." });
          }}
        />
      )}
    </div>
  );
}

// ── Add Supplier Dialog ──────────────────────────────────────────────────────

function AddSupplierDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (id: string) => void;
}) {
  const { toast } = useToast();
  const createSupplier = useCreateSupplier();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSubmit() {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    try {
      const { supplier } = await createSupplier.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      onSuccess(supplier.id);
    } catch (e: any) {
      toast({ title: "Failed to add supplier", description: e?.message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Supplier</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Supplier name" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createSupplier.isPending}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create PO Dialog ─────────────────────────────────────────────────────────

interface LineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

function CreatePODialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { data: suppliersData, refetch: refetchSuppliers } = useSuppliers({ limit: 100 });
  const { data: productsData } = useProducts();
  const suppliers = suppliersData?.suppliers ?? [];
  const products = productsData ?? [];
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ productId: "", productName: "", quantity: 1, unitPrice: 0 }]);

  const createPO = useCreatePurchaseOrder();

  function addLine() {
    setLines((l) => [...l, { productId: "", productName: "", quantity: 1, unitPrice: 0 }]);
  }

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLines((l) => l.map((li, i) => (i === idx ? { ...li, ...patch } : li)));
  }

  function removeLine(idx: number) {
    setLines((l) => l.filter((_, i) => i !== idx));
  }

  function setProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (p) {
      updateLine(idx, {
        productId: p.id,
        productName: p.name,
        unitPrice: typeof p.price === "number" ? p.price : parseFloat(String(p.price ?? 0)) || 0,
      });
    } else {
      updateLine(idx, { productId: "", productName: "" });
    }
  }

  const validLines = lines.filter((l) => l.productId && l.quantity > 0 && l.unitPrice >= 0);
  const total = validLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  async function handleSubmit() {
    if (validLines.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    try {
      await createPO.mutateAsync({
        supplierId: supplierId || undefined,
        expectedDate: expectedDate || undefined,
        notes: notes.trim() || undefined,
        status: "pending",
        items: validLines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Failed to create PO", description: e?.message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Purchase Order</DialogTitle>
          <DialogDescription>Order stock from a supplier. Receive goods when they arrive.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label>Supplier</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAddSupplierOpen(true)}>
                + Add supplier
              </Button>
            </div>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— No supplier —</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.phone ? `· ${s.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {addSupplierOpen && (
            <AddSupplierDialog
              open={addSupplierOpen}
              onClose={() => setAddSupplierOpen(false)}
              onSuccess={async (newId) => {
                await refetchSuppliers();
                setSupplierId(newId);
                setAddSupplierOpen(false);
                toast({ title: "Supplier added" });
              }}
            />
          )}

          <div className="space-y-1.5">
            <Label>Expected Delivery</Label>
            <Input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Items</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addLine}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <Select value={line.productId} onValueChange={(v) => setProduct(idx, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.sku ? `(${p.sku})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    className="w-16"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, { quantity: parseInt(e.target.value) || 1 })}
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-20"
                    placeholder="Rate"
                    value={line.unitPrice || ""}
                    onChange={(e) => updateLine(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
            />
          </div>

          <p className="text-sm font-semibold">Total: {formatCurrency(total)}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createPO.isPending || validLines.length === 0}>
            {createPO.isPending ? "Creating…" : "Create PO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Receive Dialog ───────────────────────────────────────────────────────────

function ReceiveDialog({
  po,
  open,
  onClose,
  onSuccess,
}: {
  po: PurchaseOrder;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const receive = useReceivePurchaseOrder();
  const cancel = useCancelPurchaseOrder();

  const [receipts, setReceipts] = useState<Record<string, { qty: number; batchNo: string; expiryDate: string }>>({});

  const items = po.items ?? [];
  const pendingItems = items.filter((i) => i.receivedQuantity < i.quantity);

  function setReceipt(itemId: string, patch: Partial<{ qty: number; batchNo: string; expiryDate: string }>) {
    setReceipts((r) => ({
      ...r,
      [itemId]: { ...(r[itemId] ?? { qty: 0, batchNo: "", expiryDate: "" }), ...patch },
    }));
  }

  async function handleReceive() {
    const valid = pendingItems
      .map((i) => {
        const r = receipts[i.id];
        const qty = r?.qty ?? 0;
        const remaining = i.quantity - i.receivedQuantity;
        return { itemId: i.id, receivedQty: Math.min(qty || remaining, remaining), batchNo: r?.batchNo, expiryDate: r?.expiryDate };
      })
      .filter((x) => x.receivedQty > 0);

    if (valid.length === 0) {
      toast({ title: "Enter quantities to receive", variant: "destructive" });
      return;
    }
    try {
      await receive.mutateAsync({ id: po.id, receipts: valid });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Failed to receive", description: e?.message, variant: "destructive" });
    }
  }

  async function handleCancel() {
    try {
      await cancel.mutateAsync(po.id);
      toast({ title: "PO cancelled" });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Failed to cancel", variant: "destructive" });
    }
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{po.poNo} — Receive Goods</DialogTitle>
          <DialogDescription>
            {po.supplier?.name ?? "Supplier"} · Enter received quantities. Stock will be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {pendingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">All items already received.</p>
          ) : (
            pendingItems.map((item) => {
              const remaining = item.quantity - item.receivedQuantity;
              const r = receipts[item.id] ?? { qty: remaining, batchNo: "", expiryDate: "" };
              return (
                <div key={item.id} className="space-y-1.5 border rounded-lg p-3">
                  <p className="font-medium text-sm">{item.product?.name ?? "Product"}</p>
                  <p className="text-xs text-muted-foreground">
                    Ordered: {item.quantity} · Received: {item.receivedQuantity} · Pending: {remaining}
                  </p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min={0}
                      max={remaining}
                      placeholder="Qty"
                      value={r.qty || ""}
                      onChange={(e) => setReceipt(item.id, { qty: parseInt(e.target.value) || 0 })}
                      className="w-20"
                    />
                    <Input
                      placeholder="Batch (optional)"
                      value={r.batchNo}
                      onChange={(e) => setReceipt(item.id, { batchNo: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      type="date"
                      placeholder="Expiry"
                      value={r.expiryDate}
                      onChange={(e) => setReceipt(item.id, { expiryDate: e.target.value })}
                      className="w-32"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          {(po.status === "pending" || po.status === "partial") && (
            <Button variant="destructive" onClick={handleCancel} className="mr-auto">
              Cancel PO
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {pendingItems.length > 0 && (
            <Button onClick={handleReceive} disabled={receive.isPending}>
              {receive.isPending ? "Receiving…" : "Receive"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
