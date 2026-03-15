import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, FileX, RotateCcw, CheckCircle, XCircle,
  ChevronDown, Loader2, Trash2, Eye, MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  creditNoteApi, creditNoteApi as api,
  type CreditNote, type CreditNoteReason, type CreateCreditNoteBody,
  formatCurrency, formatDate,
} from "@/lib/api";
import { useCustomers, useInvoices } from "@/hooks/useQueries";

const REASON_LABELS: Record<CreditNoteReason, string> = {
  goods_returned:   "Goods Returned",
  price_adjustment: "Price Adjustment",
  discount:         "Discount",
  damaged_goods:    "Damaged Goods",
  short_supply:     "Short Supply",
  other:            "Other",
};

function statusBadge(status: CreditNote["status"]) {
  switch (status) {
    case "draft":     return <Badge variant="secondary">Draft</Badge>;
    case "issued":    return <Badge className="bg-green-100 text-green-700 border-green-200">Issued</Badge>;
    case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
  }
}

// ── New Credit Note form state ─────────────────────────────────────────────

interface LineItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  hsnCode: string;
  unit: string;
}

const emptyLine = (): LineItem => ({
  productName: "", quantity: 1, unitPrice: 0, gstRate: 0, hsnCode: "", unit: "pcs",
});

function computeLineTotals(line: LineItem) {
  const subtotal = line.quantity * line.unitPrice;
  const taxAmt   = subtotal * (line.gstRate / 100);
  return { subtotal, taxAmt, total: subtotal + taxAmt };
}

// ── Create Dialog ──────────────────────────────────────────────────────────

function CreateCreditNoteDialog({
  open, onClose,
}: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: customersData } = useCustomers("");
  const { data: invoicesData } = useInvoices(50);

  const [customerId, setCustomerId] = useState("");
  const [invoiceId,  setInvoiceId]  = useState("");
  const [reason,     setReason]     = useState<CreditNoteReason>("goods_returned");
  const [reasonNote, setReasonNote] = useState("");
  const [notes,      setNotes]      = useState("");
  const [lines,      setLines]      = useState<LineItem[]>([emptyLine()]);

  const mutation = useMutation({
    mutationFn: (body: CreateCreditNoteBody) => api.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-notes"] });
      toast({ title: "Credit note created", description: "Draft saved. Issue it when ready." });
      onClose();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.body?.error ?? e.message, variant: "destructive" });
    },
  });

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  const grandTotal = lines.reduce((s, l) => s + computeLineTotals(l).total, 0);

  function handleSubmit() {
    const validLines = lines.filter((l) => l.productName.trim() && l.quantity > 0);
    if (!validLines.length) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    mutation.mutate({
      customerId: customerId || undefined,
      invoiceId:  invoiceId  || undefined,
      reason,
      reasonNote: reasonNote || undefined,
      notes:      notes      || undefined,
      items: validLines.map((l) => ({
        productName: l.productName,
        quantity:    l.quantity,
        unitPrice:   l.unitPrice,
        unit:        l.unit,
        gstRate:     l.gstRate,
        hsnCode:     l.hsnCode || undefined,
      })),
    });
  }

  const customers = customersData ?? [];
  const invoices  = invoicesData  ?? [];

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-600" />
            New Credit Note
          </DialogTitle>
          <DialogDescription>
            Credit notes reduce the amount owed by a customer — for returns, adjustments, or discounts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer + Invoice */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Customer (optional)</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Against Invoice (optional)</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId}>
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Standalone —</SelectItem>
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reason */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Select value={reason} onValueChange={(v) => setReason(v as CreditNoteReason)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(REASON_LABELS) as [CreditNoteReason, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason Note</Label>
              <Input
                placeholder="e.g. Customer returned 2 packets"
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
              />
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items <span className="text-destructive">*</span></Label>
              <Button
                size="sm" variant="outline"
                onClick={() => setLines((ls) => [...ls, emptyLine()])}
                className="h-7 text-xs gap-1"
              >
                <Plus className="h-3 w-3" /> Add Row
              </Button>
            </div>

            {/* Header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-2 text-xs text-muted-foreground">
              <span>Item Name</span><span>Qty</span><span>Unit Price</span><span>GST %</span><span />
            </div>

            {lines.map((line, idx) => {
              const { subtotal, taxAmt, total } = computeLineTotals(line);
              return (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center">
                    <Input
                      placeholder="Product / item name"
                      value={line.productName}
                      onChange={(e) => updateLine(idx, { productName: e.target.value })}
                      className="text-sm"
                    />
                    <Input
                      type="number" min={0.001} step={0.001}
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                      className="text-sm"
                    />
                    <Input
                      type="number" min={0}
                      value={line.unitPrice}
                      onChange={(e) => updateLine(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                      className="text-sm"
                    />
                    <Select
                      value={String(line.gstRate)}
                      onValueChange={(v) => updateLine(idx, { gstRate: parseFloat(v) })}
                    >
                      <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[0, 5, 12, 18, 28].map((r) => (
                          <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon" variant="ghost"
                      disabled={lines.length === 1}
                      onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-4 px-1">
                    <span>Subtotal: {formatCurrency(subtotal)}</span>
                    <span>GST: {formatCurrency(taxAmt)}</span>
                    <span className="font-medium text-foreground">Total: {formatCurrency(total)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand total */}
          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Credit Note Total</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(grandTotal)}</p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Internal Notes</Label>
            <Textarea
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending} className="gap-2">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail Dialog ──────────────────────────────────────────────────────────

function CreditNoteDetailDialog({
  cn, onClose,
}: { cn: CreditNote; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const issueMutation = useMutation({
    mutationFn: () => api.issue(cn.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-notes"] });
      toast({ title: "Credit note issued", description: cn.creditNoteNo });
      onClose();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.body?.error ?? e.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancel(cn.id, cancelReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-notes"] });
      toast({ title: "Credit note cancelled" });
      onClose();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.body?.error ?? e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{cn.creditNoteNo}</DialogTitle>
            {statusBadge(cn.status)}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Customer</p>
              <p className="font-medium">{cn.customer?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Against Invoice</p>
              <p className="font-medium">{cn.invoice?.invoiceNo ?? "Standalone"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reason</p>
              <p className="font-medium">{REASON_LABELS[cn.reason]}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{formatDate(cn.createdAt)}</p>
            </div>
          </div>
          {cn.reasonNote && (
            <p className="text-sm text-muted-foreground border-l-2 border-blue-200 pl-3">{cn.reasonNote}</p>
          )}

          {/* Items */}
          <div>
            <p className="text-sm font-medium mb-2">Items</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-right">GST</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cn.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <p>{item.productName}</p>
                        {item.hsnCode && <p className="text-xs text-muted-foreground">HSN: {item.hsnCode}</p>}
                      </td>
                      <td className="px-3 py-2 text-right">{Number(item.quantity)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right">{Number(item.gstRate)}%</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex gap-8">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(cn.subtotal)}</span>
            </div>
            {Number(cn.cgst) > 0 && (
              <div className="flex gap-8">
                <span className="text-muted-foreground">CGST + SGST</span>
                <span>{formatCurrency(Number(cn.cgst) + Number(cn.sgst))}</span>
              </div>
            )}
            {Number(cn.igst) > 0 && (
              <div className="flex gap-8">
                <span className="text-muted-foreground">IGST</span>
                <span>{formatCurrency(cn.igst)}</span>
              </div>
            )}
            <div className="flex gap-8 font-bold text-blue-600 text-base border-t pt-1 mt-1">
              <span>Credit Total</span>
              <span>{formatCurrency(cn.total)}</span>
            </div>
          </div>

          {cn.notes && (
            <p className="text-sm text-muted-foreground">{cn.notes}</p>
          )}

          {/* Cancel form */}
          {showCancel && (
            <div className="space-y-2 border rounded-lg p-3 bg-destructive/5">
              <p className="text-sm font-medium text-destructive">Cancel Credit Note</p>
              <Input
                placeholder="Reason for cancellation"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive" size="sm"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="gap-1"
                >
                  {cancelMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Confirm Cancel
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)}>
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {cn.status === "draft" && (
            <>
              <Button
                variant="outline" size="sm"
                className="text-destructive gap-1"
                onClick={() => setShowCancel(true)}
              >
                <XCircle className="h-4 w-4" /> Cancel CN
              </Button>
              <Button
                onClick={() => issueMutation.mutate()}
                disabled={issueMutation.isPending}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {issueMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCircle className="h-4 w-4" /> Issue Credit Note
              </Button>
            </>
          )}
          {cn.status === "issued" && !showCancel && (
            <Button
              variant="outline" size="sm"
              className="text-destructive gap-1"
              onClick={() => setShowCancel(true)}
            >
              <XCircle className="h-4 w-4" /> Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CreditNotes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<CreditNote | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["credit-notes", statusFilter],
    queryFn: () => creditNoteApi.list({ status: statusFilter === "all" ? undefined : statusFilter, limit: 100 }),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-notes"] });
      toast({ title: "Draft deleted" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.body?.error ?? e.message, variant: "destructive" });
    },
  });

  const notes = data?.creditNotes ?? [];
  const filtered = notes.filter((cn) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      cn.creditNoteNo.toLowerCase().includes(q) ||
      cn.customer?.name.toLowerCase().includes(q) ||
      cn.invoice?.invoiceNo.toLowerCase().includes(q)
    );
  });

  const totalCredit = filtered
    .filter((cn) => cn.status === "issued")
    .reduce((s, cn) => s + Number(cn.total), 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-blue-600" />
            Credit Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Issue credit notes for returns, adjustments, and discounts
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          New Credit Note
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["all", "draft", "issued", "cancelled"] as const).map((s) => {
          const count = notes.filter((cn) => s === "all" || cn.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                statusFilter === s ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "hover:bg-muted/50"
              }`}
            >
              <p className="text-xs text-muted-foreground capitalize">{s}</p>
              <p className="text-2xl font-bold">{count}</p>
            </button>
          );
        })}
      </div>

      {statusFilter === "issued" && totalCredit > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-4 flex items-center justify-between">
          <p className="text-sm text-blue-700 dark:text-blue-300">Total issued credit</p>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totalCredit)}</p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by CN number, customer, or invoice..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <FileX className="h-12 w-12 opacity-30" />
          <p className="font-medium">No credit notes yet</p>
          <p className="text-sm">Create your first credit note when a customer returns goods or needs an adjustment.</p>
          <Button onClick={() => setShowCreate(true)} className="mt-2 gap-2">
            <Plus className="h-4 w-4" /> New Credit Note
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs">
              <tr>
                <th className="px-4 py-3 text-left">CN No.</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Invoice</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((cn) => (
                <tr
                  key={cn.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => setSelected(cn)}
                >
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">{cn.creditNoteNo}</td>
                  <td className="px-4 py-3">{cn.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cn.invoice?.invoiceNo ?? "—"}</td>
                  <td className="px-4 py-3">{REASON_LABELS[cn.reason]}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(cn.createdAt)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(cn.total)}</td>
                  <td className="px-4 py-3">{statusBadge(cn.status)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelected(cn)}>
                          <Eye className="h-4 w-4 mr-2" /> View
                        </DropdownMenuItem>
                        {cn.status === "draft" && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => deleteMutation.mutate(cn.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Draft
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateCreditNoteDialog open={showCreate} onClose={() => setShowCreate(false)} />
      )}
      {selected && (
        <CreditNoteDetailDialog cn={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
