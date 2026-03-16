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
import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from "react";
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
  Calendar,
  MessageCircle,
  UserPlus,
  Printer,
  Settings,
  ChevronDown,
  ChevronUp,
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
import { useMe, useUpdateProfile } from "@/hooks/useQueries";
import { customerApi, invoiceApi, productApi } from "@/lib/api";
import { printThermalReceipt } from "@/lib/thermalReceipt";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Customer, Product } from "@/lib/api";
import {
  InvoiceTemplatePreview,
  TemplateThumbnail,
  TEMPLATES,
  type TemplateId,
  type PreviewData,
} from "@/components/InvoiceTemplatePreview";
import { isValidGstin, getGstinValidationError } from "@execora/shared";

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
  gstRate?: number; // per-item GST % from product catalog
}

type PaymentMode = "cash" | "upi" | "card" | "credit";
type SupplyType = "INTRASTATE" | "INTERSTATE";

/** Extract state code (01-38) from GSTIN first 2 chars */
function stateCodeFromGstin(gstin: string): string {
  if (gstin.length >= 2) return gstin.slice(0, 2);
  return "";
}

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

// ── Fuzzy product search ─────────────────────────────────────────────────────
function fuzzyScore(text: string, q: string): number {
  const t = text.toLowerCase();
  const query = q.toLowerCase();
  if (t.startsWith(query)) return 100;
  if (t.includes(query)) return 50;
  // character subsequence (handles typos like "mlk" → "milk")
  let ti = 0,
    qi = 0;
  while (ti < t.length && qi < query.length) {
    if (t[ti] === query[qi]) qi++;
    ti++;
  }
  return qi === query.length ? 20 : 0;
}

function fuzzyFilter(products: Product[], query: string): Product[] {
  if (!query.trim()) return [];
  const q = query.trim();
  return products
    .map((p) => ({
      p,
      score: Math.max(fuzzyScore(p.name, q), fuzzyScore(p.sku ?? "", q)),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p)
    .slice(0, 8);
}

// ── Recently-used products (localStorage) ────────────────────────────────────
const RECENT_KEY = "cb_recent_products";
function getRecentIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}
function saveRecentId(id: string) {
  const ids = [id, ...getRecentIds().filter((x) => x !== id)].slice(0, 10);
  localStorage.setItem(RECENT_KEY, JSON.stringify(ids));
}

const DRAFT_KEY = "cb_billing_draft_v1";

// ── Main component ───────────────────────────────────────────────────────────

const BIZ_STORAGE_KEY = "execora:bizprofile";

export default function ClassicBilling() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();

  // ── Product catalog — preloaded once so ItemRow gets instant client results ──
  const { data: catalogData } = useQuery({
    queryKey: ["products-preload"],
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

  // S12-06: Price tier — Retail, Wholesale, Dealer use product tier prices when set
  const [priceTierIdx, setPriceTierIdx] = useState<number | null>(() => {
    try {
      const v = parseInt(localStorage.getItem("execora:priceTierIdx") ?? "-1", 10);
      return v >= 0 ? v : null;
    } catch { return null; }
  });
  const PRICE_TIERS = [
    { name: "Retail", key: 0 },
    { name: "Wholesale", key: 1 },
    { name: "Dealer", key: 2 },
    { name: "Tier 3", key: 3 },
  ];
  const getEffectivePrice = (p: Product): number => {
    const base = parseFloat(String(p.price ?? 0));
    if (priceTierIdx === 1 && p.wholesalePrice != null)
      return parseFloat(String(p.wholesalePrice));
    if (priceTierIdx === 2 && p.priceTier2 != null)
      return parseFloat(String(p.priceTier2));
    if (priceTierIdx === 3 && p.priceTier3 != null)
      return parseFloat(String(p.priceTier3));
    return base;
  };

  const applyProduct = (id: number, product: Product) => {
    const rate = String(getEffectivePrice(product));
    updateItem(id, {
      name: product.name,
      rate,
      unit: product.unit ?? "pcs",
      productId: product.id,
      hsnCode: (product as any).hsnCode ?? undefined,
      gstRate: parseFloat(String((product as any).gstRate ?? 0)) || 0,
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

  // ── Billing setup (composition, round-off) — synced with localStorage ──
  const readBizProfile = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}") as Record<string, unknown>;
    } catch { return {}; }
  }, []);

  const [compositionScheme, setCompositionScheme] = useState(() => {
    const v = readBizProfile().compositionScheme;
    return v === true || v === "true";
  });
  const persistComposition = useCallback((val: boolean) => {
    const stored = readBizProfile();
    stored.compositionScheme = val;
    localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(stored));
  }, [readBizProfile]);

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
  const [supplyType, setSupplyType] = useState<SupplyType>("INTRASTATE");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [reverseCharge, setReverseCharge] = useState(false);
  const [recipientAddressOverride, setRecipientAddressOverride] = useState("");
  // ── New features ─────────────────────────────────────────────────────────────
  const [dueDate, setDueDate] = useState("");
  const [roundOffEnabled, setRoundOffEnabledState] = useState(() => {
    const v = readBizProfile().roundOff;
    return v === true || v === "true";
  });
  const setRoundOffEnabled = useCallback((val: boolean) => {
    setRoundOffEnabledState(val);
    const stored = readBizProfile();
    stored.roundOff = val;
    localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(stored));
  }, [readBizProfile]);
  const [showNewCustDialog, setShowNewCustDialog] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [savedInvoice, setSavedInvoice] = useState<{
    id: string;
    no: string;
    total: number;
  } | null>(null);
  const [draftBanner, setDraftBanner] = useState(false);
  const [billingSetupExpanded, setBillingSetupExpanded] = useState(false);
  const [invoiceStyleExpanded, setInvoiceStyleExpanded] = useState(false);

  // Sync billing setup from localStorage when returning from Settings (e.g. visibility change)
  useEffect(() => {
    const onFocus = () => {
      const stored = readBizProfile();
      const comp = stored.compositionScheme === true || stored.compositionScheme === "true";
      const round = stored.roundOff === true || stored.roundOff === "true";
      const tpl = (stored.invoiceTemplate as TemplateId) ?? (localStorage.getItem("inv_template") as TemplateId);
      setCompositionScheme(comp);
      setRoundOffEnabledState(round);
      if (tpl) setInvoiceTemplate(tpl);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [readBizProfile]);

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
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}"); } catch { return {}; }
    })();
    return (stored.invoiceTemplate as TemplateId) ?? (localStorage.getItem("inv_template") as TemplateId) ?? "classic";
  });
  const [showPreview, setShowPreview] = useState(false);

  const handleTemplateChange = (t: TemplateId) => {
    setInvoiceTemplate(t);
    localStorage.setItem("inv_template", t);
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}"); } catch { return {}; }
    })();
    stored.invoiceTemplate = t;
    localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(stored));
    // Persist to Tenant.settings for cross-device sync
    updateProfile.mutate({ tenant: { settings: { invoiceTemplate: t } } });
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

  // Group items by GST rate → compute CGST/SGST (intra) or IGST (inter) per slab (GST Rule 46 compliant)
  const gstGroups = useMemo(() => {
    if (!withGst) return [];
    const discountFactor = subtotal > 0 ? discountAmt / subtotal : 0;
    const isInterstate = supplyType === "INTERSTATE";
    const map = new Map<
      number,
      { taxable: number; cgst: number; sgst: number; igst: number }
    >();
    for (const it of items) {
      if (!it.name.trim()) continue;
      const rate = it.gstRate ?? 0;
      const taxable = Math.round(it.amount * (1 - discountFactor) * 100) / 100;
      const slabCgst = isInterstate
        ? 0
        : Math.round(taxable * (rate / 200) * 100) / 100;
      const slabSgst = slabCgst;
      const slabIgst = isInterstate
        ? Math.round(taxable * (rate / 100) * 100) / 100
        : 0;
      const existing = map.get(rate) ?? {
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
      };
      map.set(rate, {
        taxable: Math.round((existing.taxable + taxable) * 100) / 100,
        cgst: Math.round((existing.cgst + slabCgst) * 100) / 100,
        sgst: Math.round((existing.sgst + slabSgst) * 100) / 100,
        igst: Math.round((existing.igst + slabIgst) * 100) / 100,
      });
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([rate, vals]) => ({ rate, ...vals }));
  }, [withGst, supplyType, items, discountAmt, subtotal]);

  // Composition scheme: 1% flat on taxable amount (no CGST/SGST breakdown)
  const compositionTax = compositionScheme && withGst
    ? Math.round(taxableAmt * 0.01 * 100) / 100
    : 0;
  const totalGstAmt = withGst
    ? compositionScheme
      ? compositionTax
      : gstGroups.reduce((s, g) => s + g.cgst + g.sgst + g.igst, 0)
    : 0;
  const isInterstate =
    supplyType === "INTERSTATE" && withGst && !compositionScheme;
  const igst = isInterstate
    ? gstGroups.reduce((s, g) => s + g.igst, 0)
    : 0;
  const cgst =
    !compositionScheme && withGst && !isInterstate
      ? Math.round((totalGstAmt / 2) * 100) / 100
      : 0;
  const sgst = cgst;
  const grandTotal = Math.round((taxableAmt + totalGstAmt) * 100) / 100;
  const roundOff = roundOffEnabled ? Math.round(grandTotal) - grandTotal : 0;
  const finalTotal = Math.round((grandTotal + roundOff) * 100) / 100;
  const grandTotalWords = amountInWords(finalTotal);
  const outstandingBalance =
    parseFloat(String(selectedCustomer?.balance ?? 0)) || 0;

  const validItemCount = items.filter((it) => it.name.trim()).length;

  // ── Supplier details from biz profile / tenant ─────────────────────────
  const bizProfile = (() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  })();
  const shopName =
    (bizProfile.legalName as string) ??
    me?.tenant?.legalName ??
    me?.tenant?.name ??
    "My Shop";
  const supplierGstin =
    (bizProfile.gstin as string) ?? me?.tenant?.gstin ?? undefined;
  const supplierAddressParts = [
    bizProfile.address,
    bizProfile.city,
    bizProfile.state,
    bizProfile.pincode,
  ].filter(Boolean) as string[];
  const supplierAddress = supplierAddressParts.length > 0 ? supplierAddressParts.join(", ") : undefined;
  const recipientAddress = (recipientAddressOverride && recipientAddressOverride.trim()) ||
    (selectedCustomer
    ? [
        selectedCustomer.addressLine1,
        selectedCustomer.addressLine2,
        selectedCustomer.city,
        selectedCustomer.state,
        selectedCustomer.pincode,
      ]
        .filter(Boolean)
        .join(", ") || undefined
    : undefined);

  // ── Preview data ──────────────────────────────────────────────────────
  const previewData: PreviewData = {
    invoiceNo: "DRAFT",
    date: new Date().toLocaleDateString("en-IN"),
    shopName,
    customerName: selectedCustomer?.name ?? "Walk-in Customer",
    ...(supplierGstin && { supplierGstin }),
    ...(supplierAddress && { supplierAddress }),
    ...(recipientAddress && { recipientAddress }),
    ...(compositionScheme && { compositionScheme: true }),
    ...(reverseCharge && { reverseCharge: true }),
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
    ...(igst > 0 && { igst }),
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

  const createCustomerInline = useMutation({
    mutationFn: async () =>
      customerApi.create({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
      }),
    onSuccess: (data) => {
      const c = (data as { customer: Customer }).customer;
      setSelectedCustomer(c);
      setCustomerQuery("");
      setShowNewCustDialog(false);
      setNewCustName("");
      setNewCustPhone("");
      void qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: Error) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  const createInvoice = useMutation({
    mutationFn: async (vars: {
      customerId: string;
      displayTotal: number;
      notesWithDue: string;
    }) => {
      const validItems = items.filter((it) => it.name.trim());
      if (!validItems.length) throw new Error("Koi item nahi dala");
      return invoiceApi.create({
        customerId: vars.customerId,
        items: validItems.map((it) => ({
          productName: it.name.trim(),
          quantity: Math.max(1, Math.floor(parseFloat(it.qty) || 1)),
          unitPrice: parseFloat(it.rate) > 0 ? parseFloat(it.rate) : undefined,
          lineDiscountPercent:
            parseFloat(it.discount) > 0 ? parseFloat(it.discount) : undefined,
          hsnCode: it.hsnCode || undefined,
        })),
        notes: vars.notesWithDue || undefined,
        withGst: withGst || undefined,
        supplyType:
          withGst && supplyType !== "INTRASTATE" ? supplyType : undefined,
        placeOfSupply:
          withGst && supplyType === "INTERSTATE" && placeOfSupply.trim()
            ? placeOfSupply.trim()
            : undefined,
        buyerGstin:
          withGst && buyerGstin.trim() ? buyerGstin.trim() : undefined,
        recipientAddress:
          withGst && recipientAddress ? recipientAddress.trim() : undefined,
        reverseCharge: withGst && reverseCharge ? true : undefined,
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
    onSuccess: (data, vars) => {
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
      localStorage.removeItem(DRAFT_KEY);
      setSavedInvoice({
        id: data.invoice.id,
        no:
          (data.invoice as any).invoiceNo ??
          data.invoice.id.slice(-8).toUpperCase(),
        total: vars.displayTotal,
      });
    },
    onError: (err: Error) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  const handlePrintReceipt = () => {
    const bizP = (() => {
      try { return JSON.parse(localStorage.getItem("execora:bizprofile") ?? "{}") as Record<string, unknown>; }
      catch { return {}; }
    })();
    printThermalReceipt({
      shopName: (bizP.legalName as string) ?? shopName,
      shopPhone: (bizP.phone as string) ?? undefined,
      shopGstin: supplierGstin,
      shopAddress: supplierAddress,
      invoiceNo: savedInvoice?.no ?? "",
      date: new Date().toLocaleDateString("en-IN"),
      customerName: selectedCustomer?.name ?? "Walk-in Customer",
      items: items
        .filter((it) => it.name.trim())
        .map((it) => ({
          name: it.name,
          qty: parseFloat(it.qty) || 1,
          rate: parseFloat(it.rate) || 0,
          discountPct: parseFloat(it.discount) || 0,
          amount: it.amount,
          gstRate: it.gstRate,
        })),
      subtotal,
      discountAmt,
      taxableAmt,
      withGst,
      compositionScheme,
      compositionTax,
      gstSlabs: gstGroups.map((g) => ({ rate: g.rate, taxable: g.taxable, cgst: g.cgst, sgst: g.sgst })),
      totalGst: totalGstAmt,
      grandTotal,
      roundOff,
      finalTotal,
      amountInWords: grandTotalWords,
      payments: splitEnabled
        ? splits.filter((s) => parseFloat(s.amount) > 0).map((s) => ({ mode: s.mode, amount: parseFloat(s.amount) }))
        : [{ mode: paymentMode, amount: finalTotal }],
      notes: notes || undefined,
      width: 80,
    });
  };

  const handleSubmit = async () => {
    if (validItemCount === 0) return;
    if (withGst && buyerGstin.trim()) {
      const gstErr = getGstinValidationError(buyerGstin.trim());
      if (gstErr) {
        toast({
          title: "Invalid GSTIN",
          description: gstErr,
          variant: "destructive",
        });
        return;
      }
    }
    let customerId = selectedCustomer?.id;
    if (!customerId) {
      const walkIn = await createWalkIn.mutateAsync();
      customerId = walkIn.id;
    }
    const notesWithDue = [
      notes.trim(),
      dueDate
        ? `Due: ${new Date(dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    await createInvoice.mutateAsync({
      customerId,
      displayTotal: finalTotal,
      notesWithDue,
    });
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

  // ── Draft auto-save (1.5 s debounce) ────────────────────────────────
  useEffect(() => {
    if (validItemCount === 0 && !selectedCustomer) return;
    const t = setTimeout(() => {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          items: items.filter((it) => it.name.trim()),
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.name,
          customerPhone: selectedCustomer?.phone,
          withGst,
          discountPct,
          discountFlat,
          paymentMode,
          paymentAmount,
          splitEnabled,
          notes,
          buyerGstin,
          supplyType,
          placeOfSupply,
          reverseCharge,
          dueDate,
          savedAt: Date.now(),
        }),
      );
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    items,
    selectedCustomer,
    withGst,
    discountPct,
    discountFlat,
    paymentMode,
    paymentAmount,
    splitEnabled,
    notes,
    buyerGstin,
    supplyType,
    placeOfSupply,
    reverseCharge,
    dueDate,
    validItemCount,
  ]);

  // ── Draft restore on mount (auto-populates form) ────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (!Array.isArray(d.items) || !d.items.length || !d.savedAt) return;
      const ageMin = (Date.now() - Number(d.savedAt)) / 60_000;
      if (ageMin > 480) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      const restored = (d.items as BillingItem[]).map((it) => ({
        ...it,
        id: _id++,
      }));
      setItems(restored);
      if (d.withGst !== undefined) setWithGst(Boolean(d.withGst));
      if (d.discountPct) setDiscountPct(String(d.discountPct));
      if (d.discountFlat) setDiscountFlat(String(d.discountFlat));
      if (d.paymentMode) setPaymentMode(d.paymentMode as PaymentMode);
      if (d.paymentAmount) setPaymentAmount(String(d.paymentAmount));
      if (d.splitEnabled !== undefined)
        setSplitEnabled(Boolean(d.splitEnabled));
      if (d.notes) setNotes(String(d.notes));
      if (d.buyerGstin) setBuyerGstin(String(d.buyerGstin));
      if (d.supplyType) setSupplyType(d.supplyType as SupplyType);
      if (d.placeOfSupply) setPlaceOfSupply(String(d.placeOfSupply));
      if (d.reverseCharge !== undefined) setReverseCharge(Boolean(d.reverseCharge));
      if (d.dueDate) setDueDate(String(d.dueDate));
      if (d.customerName) {
        setSelectedCustomer({
          id: String(d.customerId ?? ""),
          tenantId: "",
          name: String(d.customerName),
          phone: d.customerPhone ? String(d.customerPhone) : undefined,
          balance: 0,
          totalPurchases: 0,
          totalPayments: 0,
          createdAt: "",
          updatedAt: "",
        });
      }
      setDraftBanner(true);
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []); // only on mount

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 md:pb-0">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="touch-target flex items-center justify-center rounded-lg p-2 -m-1 hover:bg-muted transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base leading-tight">
              Classic Billing
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {validItemCount > 0
                ? `${validItemCount} item${validItemCount > 1 ? "s" : ""} · ₹${inr(finalTotal)}`
                : "Add items to create invoice"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs min-h-10 px-3 touch-manipulation"
            disabled={validItemCount === 0}
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
          <button
            onClick={() => navigate("/settings/billing")}
            className="touch-target flex items-center justify-center rounded-lg p-2 -m-1 hover:bg-muted transition-colors"
            aria-label="Billing settings"
            title="Billing settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-5 pb-32 md:pb-8">
        {/* ── Draft restored banner ──────────────────────────────────── */}
        {draftBanner && (
          <div className="flex items-center justify-between rounded-xl bg-warning/10 border border-warning/30 px-3 py-2 text-xs">
            <span className="text-warning font-medium">
              ↺ Draft restored from last session
            </span>
            <button
              onClick={() => {
                setDraftBanner(false);
                setItems([newItem()]);
                setSelectedCustomer(null);
                setCustomerQuery("");
                setWithGst(false);
                setDiscountPct("");
                setDiscountFlat("");
                setPaymentMode("cash");
                setPaymentAmount("");
                setSplitEnabled(false);
                setSplits([newSplit("cash")]);
                setNotes("");
                setBuyerGstin("");
                setSupplyType("INTRASTATE");
                setPlaceOfSupply("");
                setDueDate("");
                localStorage.removeItem(DRAFT_KEY);
              }}
              className="text-warning hover:text-destructive font-semibold underline transition-colors"
            >
              Discard
            </button>
          </div>
        )}
        {/* ── Billing setup (quick access to settings) ───────────────────── */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => setBillingSetupExpanded((e) => !e)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Billing setup
            </span>
            <span className="text-[11px] text-muted-foreground truncate max-w-[45%]">
              {(() => {
                const p = readBizProfile();
                const name = (p.legalName ?? p.shopName ?? "") as string;
                const gst = (p.gstin ?? "") as string;
                return name || gst ? `${name || "Shop"}${gst ? ` · ${gst}` : ""}` : "Configure in Settings";
              })()}
            </span>
            {billingSetupExpanded ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
          {billingSetupExpanded && (
            <div className="border-t px-3 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Composition scheme</span>
                <Switch
                  checked={compositionScheme}
                  onCheckedChange={(v) => {
                    setCompositionScheme(v);
                    persistComposition(v);
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Round off total</span>
                <Switch
                  checked={roundOffEnabled}
                  onCheckedChange={setRoundOffEnabled}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => navigate("/settings/billing")}
              >
                <Settings className="h-3.5 w-3.5" />
                Billing settings (GSTIN, address, bank…)
              </Button>
            </div>
          )}
        </div>
        {/* ── Invoice Style (collapsible like Billing setup) ─────────────── */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => setInvoiceStyleExpanded((e) => !e)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              My Store Invoice Style
            </span>
            <span className="text-[11px] text-muted-foreground truncate max-w-[45%]">
              {TEMPLATES.find((t) => t.id === invoiceTemplate)?.label ?? "Classic"}
            </span>
            {invoiceStyleExpanded ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
          {invoiceStyleExpanded && (
            <div className="border-t px-3 py-3">
              <p className="text-[11px] text-muted-foreground mb-2">
                Tap to change — applies to all bills
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 snap-x sm:grid sm:grid-cols-4 sm:overflow-visible sm:snap-none">
                {TEMPLATES.map((t) => (
                  <div
                    key={t.id}
                    className="shrink-0 snap-start w-[23vw] min-w-[72px] sm:w-auto"
                  >
                    <TemplateThumbnail
                      template={t}
                      selected={invoiceTemplate === t.id}
                      onClick={() => handleTemplateChange(t.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Price Tier (S12-06) ──────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground shrink-0">Price list</span>
          <div className="flex gap-1 flex-wrap">
            {PRICE_TIERS.map((tier, idx) => (
              <button
                key={tier.key}
                type="button"
                onClick={() => {
                  const next = priceTierIdx === idx ? null : idx;
                  setPriceTierIdx(next);
                  localStorage.setItem("execora:priceTierIdx", String(next ?? -1));
                }}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  priceTierIdx === idx
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {tier.name}
              </button>
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
                {outstandingBalance > 0 && (
                  <p className="text-[10px] font-semibold text-warning">
                    ⚠ ₹{inr(outstandingBalance)} outstanding
                  </p>
                )}
                {outstandingBalance < 0 && (
                  <p className="text-[10px] font-semibold text-success">
                    ✓ ₹{inr(Math.abs(outstandingBalance))} advance credit
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerQuery("");
                }}
                className="text-xs text-muted-foreground border rounded-lg px-3 py-1.5 hover:border-destructive hover:text-destructive transition-colors"
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
                className="pl-9 pr-3 h-11 text-base"
              />
              {searchingCustomers && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {showCustomerSuggest &&
                (customerSuggestions.length > 0 ||
                  customerQuery.length >= 1) && (
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
                    {customerQuery.length >= 1 && (
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setNewCustName(customerQuery.trim());
                          setShowNewCustDialog(true);
                          setShowCustomerSuggest(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary hover:bg-primary/5 border-t transition-colors"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add "{customerQuery}" as new customer
                      </button>
                    )}
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
            <div className={`hidden sm:grid bg-muted/50 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide gap-1 ${withGst ? "sm:grid-cols-[2fr_70px_60px_90px_60px_55px_80px_36px]" : "sm:grid-cols-[2fr_70px_60px_90px_60px_80px_36px]"}`}>
              <span className="pl-1">Product</span>
              <span className="text-center">Qty</span>
              <span className="text-center">Unit</span>
              <span className="text-right">Rate ₹</span>
              <span className="text-right">Disc%</span>
              {withGst && <span className="text-right">GST%</span>}
              <span className="text-right">Amount ₹</span>
              <span />
            </div>

            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                catalog={catalog}
                withGst={withGst}
                isActive={activeSuggestRow === item.id}
                onFocus={() => setActiveSuggestRow(item.id)}
                onUpdate={(patch) => updateItem(item.id, patch)}
                onApplyProduct={(p) => applyProduct(item.id, p)}
                onDismiss={() => setActiveSuggestRow(null)}
                onRemove={() => removeItem(item.id)}
                isLast={items[items.length - 1].id === item.id}
                isFirst={items[0].id === item.id}
              />
            ))}

            <div className="border-t">
              <button
                onClick={addItem}
                className="w-full flex items-center gap-1.5 px-3 py-3 text-sm font-medium text-primary hover:bg-primary/5 active:bg-primary/10 transition-colors"
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
              Applies per-item GST rate (CGST + SGST)
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
                inputMode="decimal"
                min={0}
                max={100}
                value={discountPct}
                onChange={(e) => {
                  setDiscountPct(e.target.value);
                  if (e.target.value) setDiscountFlat("");
                }}
                placeholder="0"
                className="pr-7 h-11 text-base"
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
                inputMode="decimal"
                min={0}
                value={discountFlat}
                onChange={(e) => {
                  setDiscountFlat(e.target.value);
                  if (e.target.value) setDiscountPct("");
                }}
                placeholder="0.00"
                className="pl-7 h-11 text-base"
              />
            </div>
          </div>
        </div>

        {/* ── Buyer GSTIN + Supply Type ───────────────────────────────── */}
        {withGst && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Buyer GSTIN (B2B — for ITC)
              </label>
              <Input
                value={buyerGstin}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
                  setBuyerGstin(v);
                  if (v.length >= 2 && supplyType === "INTERSTATE" && !placeOfSupply) {
                    setPlaceOfSupply(stateCodeFromGstin(v));
                  }
                }}
                placeholder="e.g. 29ABCDE1234F1Z5"
                maxLength={15}
                autoCapitalize="characters"
                inputMode="text"
                className={`font-mono h-11 text-base ${buyerGstin.length === 15 && !isValidGstin(buyerGstin) ? "border-destructive" : ""}`}
              />
              {buyerGstin.length === 15 && !isValidGstin(buyerGstin) && (
                <p className="text-[10px] text-destructive">
                  {getGstinValidationError(buyerGstin) ?? "Invalid GSTIN"}
                </p>
              )}
            </div>
            {buyerGstin && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Recipient Address (B2B — override if customer has none)
                </label>
                <Textarea
                  value={recipientAddressOverride}
                  onChange={(e) => setRecipientAddressOverride(e.target.value)}
                  placeholder="Address, city, state, PIN"
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Inter-state supply</p>
                <p className="text-[11px] text-muted-foreground">
                  IGST (vs CGST+SGST for same state)
                </p>
              </div>
              <Switch
                checked={supplyType === "INTERSTATE"}
                onCheckedChange={(v) => {
                  setSupplyType(v ? "INTERSTATE" : "INTRASTATE");
                  if (v && buyerGstin.length >= 2 && !placeOfSupply) {
                    setPlaceOfSupply(stateCodeFromGstin(buyerGstin));
                  }
                }}
              />
            </div>
            {supplyType === "INTERSTATE" && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Place of Supply (state code)
                </label>
                <Input
                  value={placeOfSupply}
                  onChange={(e) =>
                    setPlaceOfSupply(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  placeholder="e.g. 29 (Karnataka)"
                  maxLength={2}
                  className="font-mono h-11 text-base w-20"
                />
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Reverse Charge (RCM)</p>
                <p className="text-[11px] text-muted-foreground">
                  Tax payable by recipient (e.g. unregistered supplier)
                </p>
              </div>
              <Switch
                checked={reverseCharge}
                onCheckedChange={setReverseCharge}
              />
            </div>
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
                valueClass="font-semibold text-sm text-success"
              />
            )}
            {withGst && (
              <>
                <TotalRow
                  label="Taxable Amount"
                  value={`₹${inr(taxableAmt)}`}
                />
                {compositionScheme ? (
                  <TotalRow
                    label="Composition Tax (1%)"
                    value={`₹${inr(compositionTax)}`}
                  />
                ) : (
                  gstGroups.map((g) => (
                    <Fragment key={g.rate}>
                      {g.rate === 0 ? (
                        <TotalRow
                          label={`GST Exempt (0%)`}
                          value={`₹0.00`}
                          valueClass="text-muted-foreground"
                        />
                      ) : supplyType === "INTERSTATE" ? (
                        <TotalRow
                          label={`IGST (${g.rate}%) on ₹${inr(g.taxable)}`}
                          value={`₹${inr(g.igst)}`}
                        />
                      ) : (
                        <>
                          <TotalRow
                            label={`CGST (${g.rate / 2}%) on ₹${inr(g.taxable)}`}
                            value={`₹${inr(g.cgst)}`}
                          />
                          <TotalRow
                            label={`SGST (${g.rate / 2}%) on ₹${inr(g.taxable)}`}
                            value={`₹${inr(g.sgst)}`}
                          />
                        </>
                      )}
                    </Fragment>
                  ))
                )}
              </>
            )}
            <div className="border-t pt-2 mt-1">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-sm">Grand Total</span>
                <span className="font-black text-lg text-primary">
                  ₹{inr(finalTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[10px] text-muted-foreground italic flex-1">
                  {grandTotalWords}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    Round off
                  </span>
                  <Switch
                    checked={roundOffEnabled}
                    onCheckedChange={setRoundOffEnabled}
                    className="scale-75 origin-right"
                  />
                </div>
              </div>
              {roundOffEnabled && roundOff !== 0 && (
                <p className="text-[10px] text-info">
                  {roundOff > 0 ? "+" : ""}
                  {inr(roundOff)} rounded
                </p>
              )}
            </div>
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
                    className={`flex flex-col items-center justify-center rounded-xl border-2 py-3 px-1 text-xs font-semibold transition-all min-h-[56px] ${paymentMode === id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
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
                      inputMode="decimal"
                      min={0}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={`Amount paid (₹${inr(finalTotal)})`}
                      className="pl-7 h-11 text-base"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 text-sm shrink-0 px-4"
                    onClick={() => setPaymentAmount(String(finalTotal))}
                  >
                    Full
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
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
                  Total ₹{inr(finalTotal)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-success font-semibold">
                    Paid ₹{inr(splitTotal)}
                  </span>
                  {finalTotal - splitTotal > 0.001 && (
                    <span className="text-warning font-semibold">
                      Remaining ₹{inr(finalTotal - splitTotal)}
                    </span>
                  )}
                  {Math.abs(finalTotal - splitTotal) < 0.01 && (
                    <span className="text-success font-bold">✓ Settled</span>
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
                      inputMode="decimal"
                      min={0}
                      value={sp.amount}
                      onChange={(e) =>
                        updateSplit(sp.id, { amount: e.target.value })
                      }
                      placeholder={`₹ ${PAY_MODES.find((m) => m.id === sp.mode)?.label} amount`}
                      className="pl-7 h-10 text-base"
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
                            finalTotal -
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
                  className="w-full flex items-center gap-1.5 px-3 py-3 text-sm font-medium text-primary hover:bg-primary/5 active:bg-primary/10 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add another payment method
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Notes + Due Date ───────────────────────────────────── */}
        <div className="space-y-2">
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
          {/* Due date inline row */}
          <div className="flex items-center gap-3 rounded-xl border px-3 py-2.5">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Due Date
            </span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 h-9 min-w-0 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate("")}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky Footer CTA (above BottomNav on mobile) ────────────── */}
      <div className="fixed left-0 right-0 z-20 border-t bg-background/95 backdrop-blur px-4 py-3 bottom-[56px] md:bottom-0 pb-safe">
        <Button
          className="w-full min-h-12 h-12 text-base font-bold gap-2 touch-manipulation"
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
                ? `Create Invoice — ₹${inr(finalTotal)}`
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

      {/* ── Success Modal ─────────────────────────────────────────── */}
      {savedInvoice && (
        <Dialog open onOpenChange={() => undefined}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                Invoice Created!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice #</span>
                  <span className="font-bold">{savedInvoice.no}</span>
                </div>
                {selectedCustomer && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium">{selectedCustomer.name}</span>
                  </div>
                )}
                {dueDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due</span>
                    <span className="font-medium">
                      {new Date(dueDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1.5">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-black text-base text-primary">
                    ₹{inr(savedInvoice.total)}
                  </span>
                </div>
              </div>
              {selectedCustomer?.phone && (
                <a
                  href={`https://wa.me/91${selectedCustomer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Invoice #${savedInvoice.no}\nAmount: ₹${inr(savedInvoice.total)}\nFrom: My Shop${dueDate ? `\nDue: ${new Date(dueDate).toLocaleDateString("en-IN")}` : ""}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-success hover:bg-success/90 text-success-foreground font-semibold py-2.5 text-sm transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Share on WhatsApp
                </a>
              )}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handlePrintReceipt}
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSavedInvoice(null);
                    navigate(`/invoices/${savedInvoice.id}`);
                  }}
                >
                  View Invoice
                </Button>
                <Button
                  onClick={() => {
                    setSavedInvoice(null);
                    setItems([newItem()]);
                    setSelectedCustomer(null);
                    setCustomerQuery("");
                    setWithGst(false);
                    setDiscountPct("");
                    setDiscountFlat("");
                    setPaymentMode("cash");
                    setPaymentAmount("");
                    setSplitEnabled(false);
                    setSplits([newSplit("cash")]);
                    setNotes("");
                    setBuyerGstin("");
                    setSupplyType("INTRASTATE");
                    setPlaceOfSupply("");
                    setDueDate("");
                    const stored = readBizProfile();
                    setRoundOffEnabled(stored.roundOff === true || stored.roundOff === "true");
                  }}
                >
                  New Invoice
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}


      {/* ── New Customer Dialog ────────────────────────────────────── */}
      <Dialog open={showNewCustDialog} onOpenChange={setShowNewCustDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              New Customer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Name *
              </label>
              <Input
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                placeholder="Customer name"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Phone (optional)
              </label>
              <Input
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                placeholder="10-digit mobile"
                type="tel"
                maxLength={15}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowNewCustDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!newCustName.trim() || createCustomerInline.isPending}
                onClick={() => void createCustomerInline.mutateAsync()}
              >
                {createCustomerInline.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save & Use"
                )}
              </Button>
            </div>
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
  withGst,
  isActive,
  onFocus,
  onUpdate,
  onApplyProduct,
  onDismiss,
  onRemove,
  isLast,
  isFirst,
}: {
  item: BillingItem;
  catalog: Product[];
  withGst: boolean;
  isActive: boolean;
  onFocus: () => void;
  onUpdate: (patch: Partial<BillingItem>) => void;
  onApplyProduct: (p: Product) => void;
  onDismiss: () => void;
  onRemove: () => void;
  isLast: boolean;
  isFirst?: boolean;
}) {
  // ── Recently-used products ────────────────────────────────────────────────
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentIds());
  const recentProducts = useMemo(
    () =>
      recentIds
        .map((id) => catalog.find((p) => String(p.id) === id))
        .filter(Boolean) as Product[],
    [recentIds, catalog],
  );

  // ── Instant client-side fuzzy results (0 ms) ─────────────────────────────
  const instantHits = useMemo(
    () => fuzzyFilter(catalog, item.name),
    [catalog, item.name],
  );

  // ── Debounced server search — refines / adds fresher results ─────────────
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(item.name.trim()), 80);
    return () => clearTimeout(t);
  }, [item.name]);

  const { data: searchData, isFetching: searchLoading } = useQuery({
    queryKey: ["product-search", debouncedQ],
    queryFn: () => productApi.search(debouncedQ),
    enabled: debouncedQ.length >= 1,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  // Empty box → recently used  |  typing → server results or fuzzy fallback
  const isEmpty = item.name.trim() === "";
  const suggestions: Product[] = isEmpty
    ? recentProducts.slice(0, 5)
    : searchData?.products?.length
      ? searchData.products
      : instantHits;

  const showRecent = isEmpty && recentProducts.length > 0;

  const showSuggest =
    isActive &&
    (showRecent ||
      (item.name.length >= 1 && (suggestions.length > 0 || searchLoading)));

  // ── Keyboard navigation + barcode scan ───────────────────────────────────
  const [activeIdx, setActiveIdx] = useState(-1);
  useEffect(() => setActiveIdx(-1), [suggestions]);

  const handleSelect = useCallback(
    (p: Product) => {
      saveRecentId(String(p.id));
      setRecentIds(getRecentIds());
      onApplyProduct(p);
    },
    [onApplyProduct],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        if (!showSuggest) return;
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        if (!showSuggest) return;
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        if (showSuggest && activeIdx >= 0 && suggestions[activeIdx]) {
          e.preventDefault();
          handleSelect(suggestions[activeIdx]);
        } else if (/^\d{6,}$/.test(item.name.trim())) {
          // 6+ digits with no suggestions → barcode scan
          e.preventDefault();
          productApi
            .byBarcode(item.name.trim())
            .then(({ product }) => handleSelect(product))
            .catch(() => {});
        }
      } else if (e.key === "Escape") {
        onDismiss();
      }
    },
    [showSuggest, suggestions, activeIdx, handleSelect, onDismiss, item.name],
  );

  return (
    <div className="border-t" data-prod-row="">
      {/* Mobile: stacked layout */}
      <div className="sm:hidden px-3 py-2 space-y-2">
        <div className="relative">
          <Input
            value={item.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            onFocus={onFocus}
            onKeyDown={handleKeyDown}
            placeholder="Product name…"
            className="h-11 text-base"
            autoFocus={isFirst && item.name === ""}
          />
          {showSuggest && (
            <ProductDropdown
              suggestions={suggestions}
              onSelect={handleSelect}
              onDismiss={onDismiss}
              loading={searchLoading}
              activeIdx={activeIdx}
              showRecent={showRecent}
            />
          )}
        </div>
        {item.name && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">
                Qty
              </p>
              <Input
                type="number"
                inputMode="decimal"
                min={0.1}
                step={0.1}
                value={item.qty}
                onChange={(e) => onUpdate({ qty: e.target.value })}
                className="h-10 text-base text-center px-2"
              />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">
                Unit
              </p>
              <Input
                value={item.unit}
                onChange={(e) => onUpdate({ unit: e.target.value })}
                className="h-10 text-base px-2"
                placeholder="pcs"
              />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">
                Rate ₹
              </p>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={item.rate}
                onChange={(e) => onUpdate({ rate: e.target.value })}
                className="h-10 text-base px-2"
                placeholder="0.00"
              />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">
                Disc %
              </p>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                value={item.discount}
                onChange={(e) => onUpdate({ discount: e.target.value })}
                className="h-10 text-base px-2"
                placeholder="0"
              />
            </div>
            {withGst && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1">
                  GST %
                </p>
                <select
                  value={String(item.gstRate ?? 0)}
                  onChange={(e) => onUpdate({ gstRate: parseFloat(e.target.value) })}
                  className="w-full h-10 text-base px-2 rounded-md border border-input bg-background"
                >
                  {[0, 5, 12, 18, 28].map((r) => (
                    <option key={r} value={r}>{r}%</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        {item.name && (
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">Amount</span>
            <span className="font-bold text-base text-primary">
              ₹
              {item.amount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </span>
            <button
              onClick={onRemove}
              className="min-h-10 min-w-10 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors touch-manipulation"
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Desktop: grid layout */}
      <div className={`hidden sm:grid items-center gap-1 px-2 py-1 ${withGst ? "sm:grid-cols-[2fr_70px_60px_90px_60px_55px_80px_36px]" : "sm:grid-cols-[2fr_70px_60px_90px_60px_80px_36px]"}`}>
        <div className="relative">
          <Input
            value={item.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            onFocus={onFocus}
            onKeyDown={handleKeyDown}
            placeholder="Product name…"
            className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1 px-1"
            autoFocus={(isFirst || isLast) && item.name === ""}
          />
          {showSuggest && (
            <ProductDropdown
              suggestions={suggestions}
              onSelect={handleSelect}
              onDismiss={onDismiss}
              loading={searchLoading}
              activeIdx={activeIdx}
              showRecent={showRecent}
            />
          )}
          {item.productId && (
            <span className="absolute right-1 top-1/2 -translate-y-1/2">
              <Badge
                variant="outline"
                className="text-[8px] px-1 py-0 h-4 text-success border-success/40"
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
        {withGst && (
          <select
            value={String(item.gstRate ?? 0)}
            onChange={(e) => onUpdate({ gstRate: parseFloat(e.target.value) })}
            className="h-8 text-sm text-right border-0 bg-transparent focus-visible:ring-1 px-1 w-full"
          >
            {[0, 5, 12, 18, 28].map((r) => (
              <option key={r} value={r}>{r}%</option>
            ))}
          </select>
        )}
        <span className="text-sm font-semibold text-right pr-1 tabular-nums">
          {item.amount > 0 ? `₹${inr(item.amount)}` : "—"}
        </span>
        <button
          onClick={onRemove}
          className="flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors min-h-10 min-w-10 touch-manipulation"
          aria-label="Remove item"
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
  loading = false,
  activeIdx = -1,
  showRecent = false,
}: {
  suggestions: Product[];
  onSelect: (p: Product) => void;
  onDismiss: () => void;
  loading?: boolean;
  activeIdx?: number;
  showRecent?: boolean;
}) {
  return (
    <div className="absolute z-40 left-0 right-0 top-full mt-0.5 rounded-xl border bg-popover shadow-xl max-h-72 overflow-y-auto">
      {showRecent && (
        <p className="px-3 pt-2 pb-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
          Recently used
        </p>
      )}
      {loading && suggestions.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Searching…
        </div>
      )}
      {suggestions.map((p, i) => {
        const outOfStock = Number(p.stock) <= 0;
        const lowStock = !outOfStock && Number(p.stock) < 5;
        const stockClass = outOfStock
          ? "text-destructive font-medium"
          : lowStock
            ? "text-warning"
            : "text-muted-foreground";
        const stockLabel = outOfStock ? "Out of stock" : `Stock: ${p.stock}`;
        return (
          <button
            key={p.id}
            ref={(el) => {
              if (el && i === activeIdx)
                el.scrollIntoView({ block: "nearest" });
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(p);
            }}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
              i === activeIdx ? "bg-primary/10" : "hover:bg-muted"
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.name}</p>
              <p className={`text-[10px] ${stockClass}`}>
                {p.unit} · {stockLabel}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-primary">
                ₹
                {parseFloat(p.price?.toString() ?? "0").toLocaleString("en-IN")}
              </p>
              {p.category && (
                <p className="text-[9px] text-muted-foreground">{p.category}</p>
              )}
            </div>
          </button>
        );
      })}
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onDismiss();
        }}
        className="w-full text-center text-[11px] text-muted-foreground py-1.5 hover:bg-muted/50 border-t transition-colors"
      >
        {suggestions.length > 0 ? "Dismiss" : "Close"}
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
