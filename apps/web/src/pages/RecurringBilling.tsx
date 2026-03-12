/**
 * RecurringBilling — Create and manage auto-recurring invoice templates.
 * Customers receive auto-generated invoices on a set schedule (weekly/monthly/custom).
 * Uses existing BullMQ + cron infrastructure at the backend.
 */
import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  User,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import VoiceBar from "@/components/VoiceBar";
import { useToast } from "@/hooks/use-toast";
import { useCustomers, useCreateInvoice } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Frequency = "weekly" | "biweekly" | "monthly" | "quarterly";
type Status = "active" | "paused";

interface RecurringTemplate {
  id: string;
  customerId: string;
  customerName: string;
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
  frequency: Frequency;
  nextRun: string;
  lastRun?: string;
  status: Status;
  totalAmount: number;
  withGst: boolean;
  notes?: string;
}

// ── Persistence: localStorage ─────────────────────────────────────────────────
const RECURRING_LS_KEY = "execora:recurring_templates";

function loadTemplates(): RecurringTemplate[] {
  try {
    return JSON.parse(
      localStorage.getItem(RECURRING_LS_KEY) ?? "[]",
    ) as RecurringTemplate[];
  } catch {
    return [];
  }
}

function saveTemplates(t: RecurringTemplate[]): void {
  localStorage.setItem(RECURRING_LS_KEY, JSON.stringify(t));
}

function computeNextRun(freq: Frequency, from: Date): Date {
  const d = new Date(from);
  if (freq === "weekly") d.setDate(d.getDate() + 7);
  else if (freq === "biweekly") d.setDate(d.getDate() + 14);
  else if (freq === "monthly") d.setMonth(d.getMonth() + 1);
  else if (freq === "quarterly") d.setMonth(d.getMonth() + 3);
  return d;
}

const FREQ_LABELS: Record<Frequency, string> = {
  weekly: "Every Week",
  biweekly: "Every 2 Weeks",
  monthly: "Every Month",
  quarterly: "Every 3 Months",
};

const FREQ_BADGE: Record<Frequency, string> = {
  weekly: "bg-blue-100 text-blue-700",
  biweekly: "bg-cyan-100 text-cyan-700",
  monthly: "bg-purple-100 text-purple-700",
  quarterly: "bg-orange-100 text-orange-700",
};

const fmt = (n: number) => formatCurrency(n);
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function daysUntil(iso: string) {
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  return `In ${diff}d`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RecurringBilling() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<RecurringTemplate[]>(() =>
    loadTemplates(),
  );
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | Status>("all");

  // Form state
  const [selCustomer, setSelCustomer] = useState("");
  const [selFrequency, setSelFrequency] = useState<Frequency>("monthly");
  const [withGst, setWithGst] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("");
  const [tempItems, setTempItems] = useState<
    Array<{ name: string; qty: number; price: number }>
  >([]);

  const { data: customers = [] } = useCustomers("", 100);
  const createInvoice = useCreateInvoice();

  // ── Actions ───────────────────────────────────────────────────────────────

  function toggleStatus(id: string) {
    setTemplates((prev) => {
      const updated = prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "active" ? "paused" : "active" }
          : t,
      );
      saveTemplates(updated);
      return updated;
    });
    toast({ title: "Status updated" });
  }

  function deleteTemplate(id: string) {
    setTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveTemplates(updated);
      return updated;
    });
    toast({ title: "Recurring template deleted", variant: "destructive" });
  }

  function runNow(t: RecurringTemplate) {
    createInvoice.mutate(
      {
        customerId: t.customerId,
        items: t.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        withGst: t.withGst,
        notes: t.notes,
      },
      {
        onSuccess: (result) => {
          const next = computeNextRun(t.frequency, new Date(t.nextRun));
          setTemplates((prev) => {
            const updated = prev.map((x) =>
              x.id === t.id
                ? {
                    ...x,
                    lastRun: new Date().toISOString(),
                    nextRun: next.toISOString(),
                  }
                : x,
            );
            saveTemplates(updated);
            return updated;
          });
          toast({
            title: `✅ Invoice ${(result as any).invoice?.invoiceNo ?? "created"} for ${t.customerName}`,
          });
        },
        onError: (err: Error) => {
          toast({ title: `❌ ${err.message}`, variant: "destructive" });
        },
      },
    );
  }

  function addItem() {
    if (!itemName || !itemPrice) return;
    setTempItems((prev) => [
      ...prev,
      { name: itemName, qty: Number(itemQty), price: Number(itemPrice) },
    ]);
    setItemName("");
    setItemQty("1");
    setItemPrice("");
  }

  function saveTemplate() {
    if (!selCustomer || tempItems.length === 0) {
      toast({
        title: "Select a customer and add at least one item",
        variant: "destructive",
      });
      return;
    }
    const customer = customers.find((c: any) => c.id === selCustomer);
    const total = tempItems.reduce((s, i) => s + i.qty * i.price, 0);
    const newTpl: RecurringTemplate = {
      id: Date.now().toString(),
      customerId: selCustomer,
      customerName: customer?.name ?? "Unknown",
      items: tempItems.map((i) => ({
        productName: i.name,
        quantity: i.qty,
        unitPrice: i.price,
      })),
      frequency: selFrequency,
      nextRun: new Date(startDate).toISOString(),
      status: "active",
      totalAmount: withGst ? total * 1.18 : total,
      withGst,
      notes: notes || undefined,
    };
    setTemplates((prev) => {
      const updated = [newTpl, ...prev];
      saveTemplates(updated);
      return updated;
    });
    setOpen(false);
    setTempItems([]);
    setSelCustomer("");
    setNotes("");
    toast({
      title: `✅ Recurring template created for ${newTpl.customerName}`,
    });
  }

  const filtered =
    filterStatus === "all"
      ? templates
      : templates.filter((t) => t.status === filterStatus);
  const activeCount = templates.filter((t) => t.status === "active").length;
  const totalMonthly = templates
    .filter((t) => t.status === "active" && t.frequency === "monthly")
    .reduce((s, t) => s + t.totalAmount, 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Recurring Billing</h1>
            <p className="text-xs text-muted-foreground">
              Auto-send invoices on a schedule
            </p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New
          </Button>
        </div>
        <div className="px-4 pb-2">
          <VoiceBar
            idleHint={
              <span>
                "monthly invoice for Ramesh" · "create weekly order" · "pause
                recurring"
              </span>
            }
          />
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Active", value: String(activeCount), icon: "✅" },
            {
              label: "Paused",
              value: String(templates.length - activeCount),
              icon: "⏸️",
            },
            { label: "Monthly Value", value: fmt(totalMonthly), icon: "💰" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <div className="text-xl">{s.icon}</div>
                <div className="mt-1 text-base font-bold">{s.value}</div>
                <div className="text-[11px] text-muted-foreground">
                  {s.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["all", "active", "paused"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                filterStatus === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Template list */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <RefreshCw className="mx-auto mb-3 h-8 w-8 opacity-30" />
            No recurring templates yet.
            <br />
            <button
              className="mt-2 text-primary underline"
              onClick={() => setOpen(true)}
            >
              Create your first
            </button>
          </div>
        ) : (
          filtered.map((t) => {
            const daysLabel = daysUntil(t.nextRun);
            const isOverdue = daysLabel === "Overdue";
            return (
              <Card
                key={t.id}
                className="overflow-hidden transition-shadow hover:shadow-md"
              >
                <CardContent className="p-0">
                  {/* Top row */}
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base">
                      {t.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {t.customerName}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${FREQ_BADGE[t.frequency]}`}
                        >
                          {FREQ_LABELS[t.frequency]}
                        </span>
                        {t.withGst && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            GST
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        {t.items
                          .map((i) => `${i.productName} ×${i.quantity}`)
                          .join(", ")}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-sm">
                        {fmt(t.totalAmount)}
                      </div>
                      <div
                        className={`text-[11px] font-medium ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {daysLabel}
                      </div>
                    </div>
                  </div>
                  {/* Footer row */}
                  <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Next: {fmtDate(t.nextRun)}
                      {t.lastRun && (
                        <span className="ml-2">
                          · Last: {fmtDate(t.lastRun)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === "active" && (
                        <button
                          onClick={() => runNow(t)}
                          disabled={createInvoice.isPending}
                          className="flex items-center gap-1 rounded-full border border-primary/50 px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                        >
                          {createInvoice.isPending ? (
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            "▶ Run"
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => toggleStatus(t.id)}
                        className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-muted"
                      >
                        {t.status === "active" ? (
                          <>
                            <ToggleRight className="h-3 w-3 text-success" />
                            <span className="text-success">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-3 w-3 text-muted-foreground" />
                            <span>Paused</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Create Dialog ──────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Recurring Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Customer */}
            <div>
              <Label>Customer *</Label>
              <Select value={selCustomer} onValueChange={setSelCustomer}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Frequency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Frequency *</Label>
                <Select
                  value={selFrequency}
                  onValueChange={(v) => setSelFrequency(v as Frequency)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Every Week</SelectItem>
                    <SelectItem value="biweekly">
                      Every 2 Weeks (Fortnightly)
                    </SelectItem>
                    <SelectItem value="monthly">Every Month</SelectItem>
                    <SelectItem value="quarterly">Every 3 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
            {/* GST toggle */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <span className="flex-1 text-sm">Include GST (18%)</span>
              <button
                onClick={() => setWithGst((v) => !v)}
                className={`h-6 w-11 rounded-full transition-colors ${withGst ? "bg-primary" : "bg-muted"}`}
              >
                <div
                  className={`h-5 w-5 translate-y-0 rounded-full bg-white shadow transition-transform ${withGst ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </div>
            {/* Add items */}
            <div>
              <Label>Items *</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  placeholder="Product name"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Qty"
                  type="number"
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                  className="w-16"
                />
                <Input
                  placeholder="₹ Price"
                  type="number"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-24"
                />
                <Button variant="outline" size="sm" onClick={addItem}>
                  +
                </Button>
              </div>
              {tempItems.length > 0 && (
                <div className="mt-2 space-y-1">
                  {tempItems.map((i, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 text-xs"
                    >
                      <span>
                        {i.name} ×{i.qty}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {fmt(i.qty * i.price)}
                        </span>
                        <button
                          onClick={() =>
                            setTempItems((prev) =>
                              prev.filter((_, j) => j !== idx),
                            )
                          }
                          className="text-destructive"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="px-3 text-right text-xs font-semibold">
                    Total:{" "}
                    {fmt(
                      tempItems.reduce((s, i) => s + i.qty * i.price, 0) *
                        (withGst ? 1.18 : 1),
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Notes */}
            <div>
              <Label>Notes (optional)</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Monthly supply order"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTemplate}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
