/**
 * S10-03: Classic Billing — full Indian-standard billing screen
 *
 * Features:
 *  • Product autocomplete with auto-fill rate + unit from catalog
 *  • Items table: Name | Qty | Unit | Rate | Disc% | Amount
 *  • Subtotal, overall discount, GST (CGST+SGST), grand total
 *  • Amount in words (Indian numbering — Lakh / Crore)
 *  • Payment mode: Cash / UPI / Card / Credit (with partial amount)
 *  • Notes / remarks
 *  • 4 invoice templates — user can switch and preview before saving
 *  • Template preference persisted in localStorage
 */
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  User,
  Search,
  Loader2,
  CheckCircle2,
  Eye,
  Receipt,
  Package,
  IndianRupee,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { customerApi, invoiceApi, productApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Customer, Product } from "@/lib/api";
import {
  InvoiceTemplatePreview,
  TemplateThumbnail,
  TEMPLATES,
  type TemplateId,
  type PreviewData,
} from "@/components/InvoiceTemplatePreview";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BillingItem {
  id: number;
  name: string;
  qty: string;
  rate: string;
  unit: string;
  discount: string; // % per line
  amount: number; // computed
  productId?: string;
  hsnCode?: string;
}

type PaymentMode = "cash" | "upi" | "card" | "credit";

interface PaymentSplit {
  id: number;
  mode: PaymentMode;
  amount: string;
}

let _splitId = 1;
const newSplit = (mode: PaymentMode = "cash"): PaymentSplit => ({
  id: _splitId++,
  mode,
  amount: "",
});

const PAY_MODES = [
  { id: "cash" as PaymentMode, label: "Cash", icon: "💵" },
  { id: "upi" as PaymentMode, label: "UPI", icon: "📱" },
  { id: "card" as PaymentMode, label: "Card", icon: "💳" },
  { id: "credit" as PaymentMode, label: "Credit", icon: "📒" },
];

let _id = 1;
const newItem = (): BillingItem => ({
  id: _id++,
  name: "",
  qty: "1",
  rate: "",
  unit: "pcs",
  discount: "",
  amount: 0,
});

// ── Indian amount-in-words ────────────────────────────────────────────────────
const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return (TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "")).trim();
}
function toIndianWords(n: number): string {
  if (n === 0) return "Zero";
  let r = "";
  if (n >= 1_00_00_000) {
    r += toIndianWords(Math.floor(n / 1_00_00_000)) + " Crore ";
    n %= 1_00_00_000;
  }
  if (n >= 1_00_000) {
    r += toIndianWords(Math.floor(n / 1_00_000)) + " Lakh ";
    n %= 1_00_000;
  }
  if (n >= 1_000) {
    r += toIndianWords(Math.floor(n / 1_000)) + " Thousand ";
    n %= 1_000;
  }
  if (n >= 100) {
    r += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n > 0) r += twoDigits(n);
  return r.trim();
}
function amountInWords(amount: number): string {
  const r = Math.floor(amount);
  const p = Math.round((amount - r) * 100);
  let w = "Rupees " + toIndianWords(r);
  if (p > 0) w += " and " + toIndianWords(p) + " Paise";
  return w + " Only";
}

// ── INR formatter ─────────────────────────────────────────────────────────────
const inr = (n: number) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ── Product filter ────────────────────────────────────────────────────────────
function filterProducts(products: Product[], query: string): Product[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q),
    )
    .slice(0, 8);
}

const DEFAULT_GST_RATE = 18;

// ── Main component ───────────────────────────────────────────────────────────

export default function ClassicBilling() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Product catalog (cached for autocomplete) ──────────────────────────
  const { data: catalogData } = useQuery({
    queryKey: ["products"],
    queryFn: () => productApi.list(),
    staleTime: 5 * 60_000,
  });
  const catalog: Product[] = catalogData?.products ?? [];

  // ── Customer ──────────────────────────────────────────────────────────
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [showCustomerSuggest, setShowCustomerSuggest] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);

  const { data: suggestData, isFetching: searchingCustomers } = useQuery({
    queryKey: ["customers-suggest", customerQuery],
    queryFn: () => customerApi.search(customerQuery, 8),
    enabled: customerQuery.length >= 1 && !selectedCustomer,
    staleTime: 2000,
  });
  const customerSuggestions: Customer[] = suggestData?.customers ?? [];

  // ── Items ─────────────────────────────────────────────────────────────
  const [items, setItems] = useState<BillingItem[]>([newItem()]);
  const [activeSuggestRow, setActiveSuggestRow] = useState<number | null>(null);

  const computeAmount = (
    rate: string,
    qty: string,
    discount: string,
  ): number => {
    const r = parseFloat(rate) || 0;
    const q = parseFloat(qty) || 1;
    const d = parseFloat(discount) || 0;
    return Math.round(r * q * (1 - d / 100) * 100) / 100;
  };

  const updateItem = useCallback((id: number, patch: Partial<BillingItem>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, ...patch };
        updated.amount = computeAmount(
          patch.rate ?? it.rate,
          patch.qty ?? it.qty,
          patch.discount ?? it.discount,
        );
        return updated;
      }),
    );
  }, []);

  const applyProduct = (id: number, product: Product) => {
    const rate = String(parseFloat(product.price?.toString() ?? "0"));
    updateItem(id, {
      name: product.name,
      rate,
      unit: product.unit ?? "pcs",
      productId: product.id,
      hsnCode: (product as any).hsnCode ?? undefined,
    });
    setActiveSuggestRow(null);
  };

  const removeItem = (id: number) =>
    setItems((prev) =>
      prev.length > 1 ? prev.filter((it) => it.id !== id) : prev,
    );
  const addItem = () => {
    setItems((prev) => [...prev, newItem()]);
    setActiveSuggestRow(null);
  };

  // ── Billing options ───────────────────────────────────────────────────
  const [withGst, setWithGst] = useState(false);
  const [discountPct, setDiscountPct] = useState("");
  const [discountFlat, setDiscountFlat] = useState("");
  // Single-mode payment
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  // Split payment
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splits, setSplits] = useState<PaymentSplit[]>([newSplit("cash")]);
  const [notes, setNotes] = useState("");
  const [buyerGstin, setBuyerGstin] = useState("");

  // Split helpers
  const splitTotal = useMemo(
    () => splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0),
    [splits],
  );
  const updateSplit = (id: number, patch: Partial<PaymentSplit>) =>
    setSplits((prev) =>
      prev.map((sp) => (sp.id === id ? { ...sp, ...patch } : sp)),
    );
  const removeSplit = (id: number) =>
    setSplits((prev) =>
      prev.length > 1 ? prev.filter((sp) => sp.id !== id) : prev,
    );
  const addSplit = () => {
    const usedModes = splits.map((s) => s.mode);
    const next = PAY_MODES.find((m) => !usedModes.includes(m.id))?.id ?? "cash";
    setSplits((prev) => [...prev, newSplit(next)]);
  };

  // ── Template ──────────────────────────────────────────────────────────
  const [invoiceTemplate, setInvoiceTemplate] = useState<TemplateId>(() => {
    return (localStorage.getItem("inv_template") as TemplateId) ?? "classic";
  });
  const [showPreview, setShowPreview] = useState(false);

  const handleTemplateChange = (t: TemplateId) => {
    setInvoiceTemplate(t);
    localStorage.setItem("inv_template", t);
  };

  // ── Computed totals ───────────────────────────────────────────────────
  const subtotal = useMemo(
    () => items.reduce((s, it) => s + it.amount, 0),
    [items],
  );

  const discountAmt = useMemo(() => {
    if (discountPct && parseFloat(discountPct) > 0)
      return Math.round(subtotal * (parseFloat(discountPct) / 100) * 100) / 100;
    if (discountFlat && parseFloat(discountFlat) > 0)
      return parseFloat(discountFlat);
    return 0;
  }, [subtotal, discountPct, discountFlat]);

  const taxableAmt = Math.round((subtotal - discountAmt) * 100) / 100;
  const gstAmt = withGst
    ? Math.round(taxableAmt * (DEFAULT_GST_RATE / 100) * 100) / 100
    : 0;
  const cgst = withGst ? Math.round((gstAmt / 2) * 100) / 100 : 0;
  const sgst = cgst;
  const grandTotal = Math.round((taxableAmt + gstAmt) * 100) / 100;
  const grandTotalWords = amountInWords(grandTotal);

  const validItemCount = items.filter((it) => it.name.trim()).length;

  // ── Preview data ──────────────────────────────────────────────────────
  const previewData: PreviewData = {
    invoiceNo: "DRAFT",
    date: new Date().toLocaleDateString("en-IN"),
    shopName: "My Shop",
    customerName: selectedCustomer?.name ?? "Walk-in Customer",
    items: items
      .filter((it) => it.name.trim())
      .map((it) => ({
        name: it.name,
        qty: parseFloat(it.qty) || 1,
        unit: it.unit,
        rate: parseFloat(it.rate) || 0,
        discount: parseFloat(it.discount) || 0,
        amount: it.amount,
        hsnCode: it.hsnCode,
      })),
    subtotal,
    discountAmt,
    cgst,
    sgst,
    total: grandTotal,
    amountInWords: grandTotalWords,
    notes: notes || undefined,
    gstin: buyerGstin || undefined,
  };

  // ── Mutations ─────────────────────────────────────────────────────────
  const createWalkIn = useMutation({
    mutationFn: async () => {
      const { customers } = await customerApi.search("Walk-in", 10);
      const existing = customers.find((c: Customer) =>
        /walk\s*-?\s*in|cash\s*customer/i.test(c.name),
      );
      if (existing) return existing;
      const res = await customerApi.create({ name: "Walk-in Customer" });
      return (res as { customer: Customer }).customer;
    },
  });

  const createInvoice = useMutation({
    mutationFn: async (customerId: string) => {
      const validItems = items.filter((it) => it.name.trim());
      if (!validItems.length) throw new Error("Koi item nahi dala");
      return invoiceApi.create({
        customerId,
        items: validItems.map((it) => ({
          productName: it.name.trim(),
          quantity: Math.max(1, parseFloat(it.qty) || 1),
          unitPrice: parseFloat(it.rate) > 0 ? parseFloat(it.rate) : undefined,
          lineDiscountPercent:
            parseFloat(it.discount) > 0 ? parseFloat(it.discount) : undefined,
        })),
        notes: notes.trim() || undefined,
        withGst: withGst || undefined,
        discountPercent:
          parseFloat(discountPct) > 0 ? parseFloat(discountPct) : undefined,
        discountAmount:
          !discountPct && parseFloat(discountFlat) > 0
            ? parseFloat(discountFlat)
            : undefined,
        initialPayment: (() => {
          if (splitEnabled) {
            if (splitTotal <= 0) return undefined;
            const primary = splits[0]?.mode ?? "cash";
            return {
              amount: splitTotal,
              method: primary === "credit" ? "other" : primary,
            };
          }
          return parseFloat(paymentAmount) > 0
            ? {
                amount: parseFloat(paymentAmount),
                method: paymentMode === "credit" ? "other" : paymentMode,
              }
            : undefined;
        })(),
      });
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "✅ Invoice created!",
        description: `#${(data.invoice as any).invoiceNo ?? data.invoice.id.slice(-8).toUpperCase()}`,
      });
      navigate(`/invoices/${data.invoice.id}`);
    },
    onError: (err: Error) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  const handleSubmit = async () => {
    if (validItemCount === 0) return;
    let customerId = selectedCustomer?.id;
    if (!customerId) {
      const walkIn = await createWalkIn.mutateAsync();
      customerId = walkIn.id;
    }
    await createInvoice.mutateAsync(customerId);
  };

  const isSubmitting = createWalkIn.isPending || createInvoice.isPending;

  // Close customer suggestion on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !customerInputRef.current
          ?.closest(".cust-wrap")
          ?.contains(e.target as Node)
      ) {
        setShowCustomerSuggest(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close product suggestion on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-prod-row]")) {
        setActiveSuggestRow(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base leading-tight">
              Classic Billing
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {validItemCount > 0
                ? `${validItemCount} item${validItemCount > 1 ? "s" : ""} · ₹${inr(grandTotal)}`
                : "Add items to create invoice"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            disabled={validItemCount === 0}
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-5 pb-36">
        {/* ── Invoice Template Selector ────────────────────────────── */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Invoice Style
          </label>
          <div className="grid grid-cols-4 gap-2">
            {TEMPLATES.map((t) => (
              <TemplateThumbnail
                key={t.id}
                template={t}
                selected={invoiceTemplate === t.id}
                onClick={() => handleTemplateChange(t.id)}
              />
            ))}
          </div>
        </div>

        {/* ── Customer Search ──────────────────────────────────────── */}
        <div className="cust-wrap space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Customer
          </label>
          {selectedCustomer ? (
            <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2.5">
              <User className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {selectedCustomer.name}
                </p>
                {selectedCustomer.phone && (
                  <p className="text-[11px] text-muted-foreground">
                    {selectedCustomer.phone}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerQuery("");
                }}
                className="text-[10px] text-muted-foreground border rounded px-2 py-0.5 hover:border-destructive hover:text-destructive transition-colors"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={customerInputRef}
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setShowCustomerSuggest(true);
                }}
                onFocus={() => setShowCustomerSuggest(true)}
                placeholder="Search customer… (blank = Walk-in)"
                className="pl-9 pr-3"
              />
              {searchingCustomers && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {showCustomerSuggest && customerSuggestions.length > 0 && (
                <div className="absolute z-30 w-full mt-1 rounded-xl border bg-popover shadow-lg overflow-hidden">
                  {customerSuggestions.map((c) => (
                    <button
                      key={c.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedCustomer(c);
                        setCustomerQuery("");
                        setShowCustomerSuggest(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors"
                    >
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        {c.phone && (
                          <p className="text-[11px] text-muted-foreground">
                            {c.phone}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {customerQuery.length === 0 && (
                <p className="text-[11px] text-muted-foreground mt-1 pl-1">
                  Leave blank → Walk-in / cash customer
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Items Table ──────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Items
          </label>

          <div className="rounded-xl border overflow-hidden">
            {/* Column headers */}
            <div className="hidden sm:grid sm:grid-cols-[2fr_70px_60px_90px_60px_80px_36px] bg-muted/50 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide gap-1">
              <span className="pl-1">Product</span>
              <span className="text-center">Qty</span>
              <span className="text-center">Unit</span>
              <span className="text-right">Rate ₹</span>
              <span className="text-right">Disc%</span>
              <span className="text-right">Amount ₹</span>
              <span />
            </div>

            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                catalog={catalog}
                isActive={activeSuggestRow === item.id}
                onFocus={() => setActiveSuggestRow(item.id)}
                onUpdate={(patch) => updateItem(item.id, patch)}
                onApplyProduct={(p) => applyProduct(item.id, p)}
                onDismiss={() => setActiveSuggestRow(null)}
                onRemove={() => removeItem(item.id)}
                isLast={items[items.length - 1].id === item.id}
              />
            ))}

            <div className="border-t">
              <button
                onClick={addItem}
                className="w-full flex items-center gap-1.5 px-3 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add item
              </button>
            </div>
          </div>
        </div>

        {/* ── GST Toggle ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Include GST</p>
            <p className="text-[11px] text-muted-foreground">
              Adds {DEFAULT_GST_RATE}% GST (CGST+SGST) on taxable amount
            </p>
          </div>
          <Switch checked={withGst} onCheckedChange={setWithGst} />
        </div>

        {/* ── Discount ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Bill Discount %
            </label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                value={discountPct}
                onChange={(e) => {
                  setDiscountPct(e.target.value);
                  if (e.target.value) setDiscountFlat("");
                }}
                placeholder="0"
                className="pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Flat Discount ₹
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                ₹
              </span>
              <Input
                type="number"
                min={0}
                value={discountFlat}
                onChange={(e) => {
                  setDiscountFlat(e.target.value);
                  if (e.target.value) setDiscountPct("");
                }}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>
        </div>

        {/* ── Buyer GSTIN ───────────────────────────────────────────── */}
        {withGst && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Buyer GSTIN (optional)
            </label>
            <Input
              value={buyerGstin}
              onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
              placeholder="e.g. 29ABCDE1234F1Z5"
              maxLength={15}
              className="font-mono"
            />
          </div>
        )}

        {/* ── Totals Card ───────────────────────────────────────────── */}
        {validItemCount > 0 && (
          <div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-1.5">
            <TotalRow label="Subtotal" value={`₹${inr(subtotal)}`} />
            {discountAmt > 0 && (
              <TotalRow
                label={discountPct ? `Discount (${discountPct}%)` : "Discount"}
                value={`−₹${inr(discountAmt)}`}
                valueClass="font-semibold text-sm text-green-600"
              />
            )}
            {withGst && (
              <>
                <TotalRow
                  label="Taxable Amount"
                  value={`₹${inr(taxableAmt)}`}
                />
                <TotalRow
                  label={`CGST (${DEFAULT_GST_RATE / 2}%)`}
                  value={`₹${inr(cgst)}`}
                />
                <TotalRow
                  label={`SGST (${DEFAULT_GST_RATE / 2}%)`}
                  value={`₹${inr(sgst)}`}
                />
              </>
            )}
            <div className="border-t pt-2 mt-1 flex justify-between items-baseline">
              <span className="font-bold text-sm">Grand Total</span>
              <span className="font-black text-lg text-primary">
                ₹{inr(grandTotal)}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              {grandTotalWords}
            </p>
          </div>
        )}

        {/* ── Payment ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Header + Split toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5" />
              Payment
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Split</span>
              <Switch
                checked={splitEnabled}
                onCheckedChange={(v) => {
                  setSplitEnabled(v);
                  if (v) setSplits([newSplit("cash")]);
                }}
              />
            </div>
          </div>

          {/* ── Single mode ──────────────────────────────────────── */}
          {!splitEnabled && (
            <>
              <div className="grid grid-cols-4 gap-2">
                {PAY_MODES.map(({ id, label, icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMode(id)}
                    className={`flex flex-col items-center rounded-xl border-2 py-2.5 px-1 text-xs font-semibold transition-all
								  ${paymentMode === id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                  >
                    <span className="text-lg mb-0.5">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
              {paymentMode !== "credit" ? (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      type="number"
                      min={0}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={`Amount paid (₹${inr(grandTotal)})`}
                      className="pl-7"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => setPaymentAmount(String(grandTotal))}
                  >
                    Full
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Full amount added to customer's credit account
                </p>
              )}
            </>
          )}

          {/* ── Split mode ────────────────────────────────────────── */}
          {splitEnabled && (
            <div className="rounded-xl border overflow-hidden">
              {/* Summary bar */}
              <div className="flex items-center justify-between bg-muted/40 px-3 py-2 text-xs border-b">
                <span className="text-muted-foreground">
                  Total ₹{inr(grandTotal)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-green-700 font-semibold">
                    Paid ₹{inr(splitTotal)}
                  </span>
                  {grandTotal - splitTotal > 0.001 && (
                    <span className="text-amber-600 font-semibold">
                      Remaining ₹{inr(grandTotal - splitTotal)}
                    </span>
                  )}
                  {Math.abs(grandTotal - splitTotal) < 0.01 && (
                    <span className="text-green-700 font-bold">✓ Settled</span>
                  )}
                </div>
              </div>

              {/* Split rows */}
              {splits.map((sp, idx) => (
                <div
                  key={sp.id}
                  className="flex items-center gap-2 px-3 py-2 border-b last:border-0"
                >
                  {/* Mode selector pills */}
                  <div className="flex gap-1">
                    {PAY_MODES.map(({ id, icon, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => updateSplit(sp.id, { mode: id })}
                        title={label}
                        className={`text-base rounded-lg px-2 py-1 border-2 transition-all
													${sp.mode === id ? "border-primary bg-primary/10" : "border-transparent hover:border-border"}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  {/* Amount */}
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      type="number"
                      min={0}
                      value={sp.amount}
                      onChange={(e) =>
                        updateSplit(sp.id, { amount: e.target.value })
                      }
                      placeholder={`₹ ${PAY_MODES.find((m) => m.id === sp.mode)?.label} amount`}
                      className="pl-7 h-9"
                    />
                  </div>
                  {/* Quick-fill remaining */}
                  {idx === splits.length - 1 &&
                    grandTotal - splitTotal + (parseFloat(sp.amount) || 0) >
                      0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs shrink-0"
                        onClick={() => {
                          const rest =
                            grandTotal -
                            splits
                              .filter((s) => s.id !== sp.id)
                              .reduce(
                                (a, s) => a + (parseFloat(s.amount) || 0),
                                0,
                              );
                          updateSplit(sp.id, {
                            amount: String(
                              Math.max(0, Math.round(rest * 100) / 100),
                            ),
                          });
                        }}
                      >
                        Rem
                      </Button>
                    )}
                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeSplit(sp.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Add split button */}
              {splits.length < 4 && (
                <button
                  type="button"
                  onClick={addSplit}
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-primary hover:bg-primary/5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add another payment method
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Notes ────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Notes / Remarks (optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions, delivery address, etc."
            rows={2}
            className="text-sm resize-none"
          />
        </div>
      </div>

      {/* ── Sticky Footer CTA ──────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur px-4 py-3">
        <Button
          className="w-full h-12 text-base font-bold gap-2"
          disabled={validItemCount === 0 || isSubmitting}
          onClick={() => void handleSubmit()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Creating invoice…
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              {validItemCount > 0
                ? `Create Invoice — ₹${inr(grandTotal)}`
                : "Create Invoice"}
              {selectedCustomer ? ` · ${selectedCustomer.name}` : " (Walk-in)"}
            </>
          )}
        </Button>
      </div>

      {/* ── Invoice Preview Dialog ────────────────────────────────── */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base">
                Invoice Preview —{" "}
                {TEMPLATES.find((t) => t.id === invoiceTemplate)?.label}
              </DialogTitle>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-full p-1 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2 pt-2 flex-wrap">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateChange(t.id)}
                  className={`text-xs px-3 py-1 rounded-full border-2 font-medium transition-all
                    ${invoiceTemplate === t.id ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </DialogHeader>
          <div className="p-5 flex justify-center overflow-x-auto">
            <InvoiceTemplatePreview
              template={invoiceTemplate}
              data={previewData}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Item Row ──────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  catalog,
  isActive,
  onFocus,
  onUpdate,
  onApplyProduct,
  onDismiss,
  onRemove,
  isLast,
}: {
  item: BillingItem;
  catalog: Product[];
  isActive: boolean;
  onFocus: () => void;
  onUpdate: (patch: Partial<BillingItem>) => void;
  onApplyProduct: (p: Product) => void;
  onDismiss: () => void;
  onRemove: () => void;
  isLast: boolean;
}) {
  const suggestions = useMemo(
    () => filterProducts(catalog, item.name),
    [catalog, item.name],
  );

  const showSuggest =
    isActive && suggestions.length > 0 && item.name.length >= 1;

  return (
    <div className="border-t" data-prod-row="">
      {/* Mobile: stacked layout */}
      <div className="sm:hidden px-3 py-2 space-y-2">
        <div className="relative">
          <Input
            value={item.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            onFocus={onFocus}
            placeholder="Product name…"
            className="h-9 text-sm"
          />
          {showSuggest && (
            <ProductDropdown
              suggestions={suggestions}
              onSelect={onApplyProduct}
              onDismiss={onDismiss}
            />
          )}
        </div>
        {item.name && (
          <div className="grid grid-cols-4 gap-2">
            <div>
              <p className="text-[9px] text-muted-foreground mb-0.5">Qty</p>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={item.qty}
                onChange={(e) => onUpdate({ qty: e.target.value })}
                className="h-8 text-sm text-center px-1"
              />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground mb-0.5">Unit</p>
              <Input
                value={item.unit}
                onChange={(e) => onUpdate({ unit: e.target.value })}
                className="h-8 text-sm px-1"
                placeholder="pcs"
              />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground mb-0.5">Rate ₹</p>
              <Input
                type="number"
                min={0}
                value={item.rate}
                onChange={(e) => onUpdate({ rate: e.target.value })}
                className="h-8 text-sm px-1"
                placeholder="0"
              />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground mb-0.5">Disc%</p>
              <Input
                type="number"
                min={0}
                max={100}
                value={item.discount}
                onChange={(e) => onUpdate({ discount: e.target.value })}
                className="h-8 text-sm px-1"
                placeholder="0"
              />
            </div>
          </div>
        )}
        {item.name && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Amount:</span>
            <span className="font-semibold text-sm">
              ₹
              {item.amount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </span>
            <button
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Desktop: grid layout */}
      <div className="hidden sm:grid sm:grid-cols-[2fr_70px_60px_90px_60px_80px_36px] items-center gap-1 px-2 py-1">
        <div className="relative">
          <Input
            value={item.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            onFocus={onFocus}
            placeholder="Product name…"
            className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1 px-1"
            autoFocus={isLast && item.name === ""}
          />
          {showSuggest && (
            <ProductDropdown
              suggestions={suggestions}
              onSelect={onApplyProduct}
              onDismiss={onDismiss}
            />
          )}
          {item.productId && (
            <span className="absolute right-1 top-1/2 -translate-y-1/2">
              <Badge
                variant="outline"
                className="text-[8px] px-1 py-0 h-4 text-green-600 border-green-300"
              >
                DB
              </Badge>
            </span>
          )}
        </div>
        <Input
          type="number"
          min={0.1}
          step={0.1}
          value={item.qty}
          onChange={(e) => onUpdate({ qty: e.target.value })}
          className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1 px-1"
        />
        <Input
          value={item.unit}
          onChange={(e) => onUpdate({ unit: e.target.value })}
          className="h-8 text-xs text-center border-0 bg-transparent focus-visible:ring-1 px-0.5"
          placeholder="pcs"
        />
        <Input
          type="number"
          min={0}
          step={0.01}
          value={item.rate}
          onChange={(e) => onUpdate({ rate: e.target.value })}
          className="h-8 text-sm text-right border-0 bg-transparent focus-visible:ring-1 px-1"
          placeholder="0.00"
        />
        <Input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={item.discount}
          onChange={(e) => onUpdate({ discount: e.target.value })}
          className="h-8 text-sm text-right border-0 bg-transparent focus-visible:ring-1 px-1"
          placeholder="0"
        />
        <span className="text-sm font-semibold text-right pr-1 tabular-nums">
          {item.amount > 0 ? `₹${inr(item.amount)}` : "—"}
        </span>
        <button
          onClick={onRemove}
          className="flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors h-8"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Product Autocomplete Dropdown ─────────────────────────────────────────────

function ProductDropdown({
  suggestions,
  onSelect,
  onDismiss,
}: {
  suggestions: Product[];
  onSelect: (p: Product) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="absolute z-40 left-0 right-0 top-full mt-0.5 rounded-xl border bg-popover shadow-xl overflow-hidden">
      {suggestions.map((p) => (
        <button
          key={p.id}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(p);
          }}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {p.unit} · Stock: {p.stock}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-primary">
              ₹{parseFloat(p.price?.toString() ?? "0").toLocaleString("en-IN")}
            </p>
            {p.category && (
              <p className="text-[9px] text-muted-foreground">{p.category}</p>
            )}
          </div>
        </button>
      ))}
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onDismiss();
        }}
        className="w-full text-center text-[11px] text-muted-foreground py-1.5 hover:bg-muted/50 border-t transition-colors"
      >
        Dismiss suggestions
      </button>
    </div>
  );
}

// ── Total row helper ──────────────────────────────────────────────────────────

function TotalRow({
  label,
  value,
  valueClass = "font-semibold text-sm",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
