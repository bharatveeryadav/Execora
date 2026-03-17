/**
 * BillingScreen — React Native port of ClassicBilling.tsx
 *
 * Key differences from web:
 *  • View / Text / TextInput instead of div / span / input
 *  • Switch from react-native (not shadcn)
 *  • FlatList for product suggestions (virtualized, performant on Android)
 *  • KeyboardAvoidingView so sticky footer stays above soft keyboard
 *  • MMKV for draft storage (synchronous, fast)
 *  • Linking.openURL for WhatsApp (instead of <a href>)
 *  • All shared business logic from @execora/shared (zero duplication)
 */
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  amountInWords,
  inr,
  computeAmount,
  computeTotals,
  fuzzyFilter,
  PAY_MODES,
  isDraftExpired,
  type BillingItem,
  type PaymentMode,
  type PaymentSplit,
  type Customer,
  type Product,
  type CreateInvoicePayload,
} from "@execora/shared";
import { Ionicons } from "@expo/vector-icons";
import { customerApi, productApi, invoiceApi } from "../lib/api";
import { storage, DRAFT_KEY, INVOICE_BAR_KEY, PRICE_TIER_KEY } from "../lib/storage";
import { BarcodeScanner } from "../components/common/BarcodeScanner";
import { printReceipt } from "../lib/printReceipt";
import { useOffline } from "../contexts/OfflineContext";
import { enqueueInvoice } from "../lib/offlineQueue";
import { hapticSuccess, hapticError, hapticLight } from "../lib/haptics";
import { cacheProducts } from "../lib/offlineQueue";
import type { ReceiptData } from "../lib/thermalReceipt";
import type { BillingStackParams } from "../navigation";

// ── ID counters ───────────────────────────────────────────────────────────────

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
let _splitId = 1;
const newSplit = (mode: PaymentMode = "cash"): PaymentSplit => ({
  id: _splitId++,
  mode,
  amount: "",
});

const DUE_DATE_PRESETS = [15, 30, 60] as const;
type DocumentTitle = "invoice" | "billOfSupply";

// Modern icons (Ionicons) — matches web Lucide: Banknote, Smartphone, CreditCard, Wallet
const PAY_MODE_ICONS: Record<PaymentMode, keyof typeof Ionicons.glyphMap> = {
  cash: "cash-outline",
  upi: "phone-portrait-outline",
  card: "card-outline",
  credit: "wallet-outline",
};
type DiscountOnType = "unit_price" | "price_with_tax" | "net_amount" | "total_amount";

function readInvoiceBar(): Record<string, unknown> {
  try {
    const raw = storage.getString(INVOICE_BAR_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function persistInvoiceBar(data: Record<string, unknown>) {
  storage.set(INVOICE_BAR_KEY, JSON.stringify(data));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BillingScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<BillingStackParams, "BillingForm">>();
  const qc = useQueryClient();
  const { isOffline } = useOffline();
  const startAsWalkIn = route.params?.startAsWalkIn;

  // ── State ─────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<BillingItem[]>([newItem()]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerQuery, setCustomerQuery] = useState("");
  const [showCustSuggest, setShowCustSuggest] = useState(false);
  const [withGst, setWithGst] = useState(false);
  const [discountPct, setDiscountPct] = useState("");
  const [discountFlat, setDiscountFlat] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splits, setSplits] = useState<PaymentSplit[]>([newSplit("cash")]);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [roundOffEnabled, setRoundOffEnabled] = useState(false);
  const [draftBanner, setDraftBanner] = useState(false);
  // Active row for product suggestions
  const [activeRow, setActiveRow] = useState<number | null>(null);
  // New customer dialog
  const [showNewCust, setShowNewCust] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  // Success modal
  const [savedInvoice, setSavedInvoice] = useState<{
    id: string;
    no: string;
    total: number;
    fromOffline?: boolean;
  } | null>(null);

  // ── Invoice bar (Indian standard) ───────────────────────────────────────
  const [showInvoiceBarEdit, setShowInvoiceBarEdit] = useState(false);
  const [invoicePrefix, setInvoicePrefix] = useState(() =>
    (readInvoiceBar().invoicePrefix as string) ?? "INV-",
  );
  const [documentDate, setDocumentDate] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (readInvoiceBar().documentDate as string) ?? today;
  });
  const [dueDateDays, setDueDateDays] = useState<number | "custom">(() => {
    const v = readInvoiceBar().dueDateDays;
    return v === "custom" || (typeof v === "number" && [15, 30, 60].includes(v))
      ? (v as number | "custom")
      : 15;
  });
  const [customDueDays, setCustomDueDays] = useState(() =>
    String((readInvoiceBar().customDueDays as number) ?? 45),
  );
  const [documentTitle, setDocumentTitle] = useState<DocumentTitle>(() => {
    const v = readInvoiceBar().documentTitle as string;
    return v === "billOfSupply" ? "billOfSupply" : "invoice";
  });
  const [discountOnType, setDiscountOnType] = useState<DiscountOnType>(() => {
    const v = readInvoiceBar().discountOnType as string;
    return ["unit_price", "price_with_tax", "net_amount", "total_amount"].includes(v)
      ? (v as DiscountOnType)
      : "net_amount";
  });

  // S12-06: Price tier — Retail, Wholesale, Dealer
  const [priceTierIdx, setPriceTierIdx] = useState<number | null>(() => {
    const v = parseInt(storage.getString(PRICE_TIER_KEY) ?? "-1", 10);
    return v >= 0 ? v : null;
  });
  const PRICE_TIERS = [
    { name: "Retail", key: 0 },
    { name: "Wholesale", key: 1 },
    { name: "Dealer", key: 2 },
  ];
  const getEffectivePrice = useCallback(
    (p: Product & { wholesalePrice?: number | string | null; priceTier2?: number | string | null; priceTier3?: number | string | null }): number => {
      const base = parseFloat(String(p.price ?? 0));
      if (priceTierIdx === 1 && p.wholesalePrice != null)
        return parseFloat(String(p.wholesalePrice));
      if (priceTierIdx === 2 && p.priceTier2 != null)
        return parseFloat(String(p.priceTier2));
      if (priceTierIdx === 3 && p.priceTier3 != null)
        return parseFloat(String(p.priceTier3));
      return base;
    },
    [priceTierIdx],
  );

  const computedDueDate = useMemo(() => {
    const base = new Date(documentDate);
    const days = dueDateDays === "custom" ? (parseInt(customDueDays, 10) || 0) : dueDateDays;
    if (days <= 0) return "";
    base.setDate(base.getDate() + days);
    return base.toISOString().slice(0, 10);
  }, [documentDate, dueDateDays, customDueDays]);

  const saveInvoiceBar = useCallback(() => {
    persistInvoiceBar({
      invoicePrefix,
      documentDate,
      dueDateDays,
      customDueDays: parseInt(customDueDays, 10) || 15,
      documentTitle,
      discountOnType,
    });
  }, [invoicePrefix, documentDate, dueDateDays, customDueDays, documentTitle, discountOnType]);

  // ── Preloaded product catalog (for instant fuzzy search) ──────────────────
  const { data: catalogData } = useQuery({
    queryKey: ["products-catalog"],
    queryFn: () => productApi.list(1, 200),
    staleTime: 5 * 60_000,
  });
  const catalog: Product[] = catalogData?.products ?? [];

  useEffect(() => {
    if (catalogData?.products?.length) cacheProducts(catalogData.products);
  }, [catalogData?.products]);

  // ── Customer search ───────────────────────────────────────────────────────
  const { data: custData, isFetching: searchingCustomers } = useQuery({
    queryKey: ["customers-search", customerQuery],
    queryFn: () => customerApi.search(customerQuery),
    enabled: customerQuery.length >= 1 && !selectedCustomer,
    staleTime: 2000,
  });
  const customerSuggestions: Customer[] = custData?.customers ?? [];

  // ── Totals ────────────────────────────────────────────────────────────────
  const validItems = items.filter((it) => it.name.trim());
  const validItemCount = validItems.length;
  const totals = useMemo(
    () =>
      computeTotals(items, discountPct, discountFlat, withGst, roundOffEnabled),
    [items, discountPct, discountFlat, withGst, roundOffEnabled],
  );
  const {
    subtotal,
    discountAmt,
    taxableAmt,
    cgst,
    sgst,
    grandTotal,
    roundOff,
    finalTotal,
  } = totals;
  const grandTotalWords = amountInWords(finalTotal);
  const splitTotal = useMemo(
    () => splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0),
    [splits],
  );
  const outstandingBalance =
    parseFloat(String(selectedCustomer?.balance ?? 0)) || 0;

  // ── Item helpers ──────────────────────────────────────────────────────────
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
  const addItem = () => {
    hapticLight();
    setItems((prev) => [...prev, newItem()]);
  };
  const removeItem = (id: number) =>
    setItems((prev) =>
      prev.length > 1 ? prev.filter((it) => it.id !== id) : prev,
    );

  // ── Draft auto-save (2 s debounce) ───────────────────────────────────────
  useEffect(() => {
    if (validItemCount === 0 && !selectedCustomer) return;
    const t = setTimeout(() => {
      storage.set(
        DRAFT_KEY,
        JSON.stringify({
          items: validItems,
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
          dueDate,
          savedAt: Date.now(),
        }),
      );
    }, 2000);
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
    dueDate,
    validItemCount,
  ]);

  const draftRestoredRef = useRef(false);

  // ── Draft restore on mount ────────────────────────────────────────────────
  useEffect(() => {
    const raw = storage.getString(DRAFT_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (!Array.isArray(d.items) || !d.items.length || !d.savedAt) return;
      if (isDraftExpired(Number(d.savedAt))) {
        storage.delete(DRAFT_KEY);
        return;
      }
      draftRestoredRef.current = true;
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
      if (d.splitEnabled) setSplitEnabled(Boolean(d.splitEnabled));
      if (d.notes) setNotes(String(d.notes));
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
      storage.delete(DRAFT_KEY);
    }
  }, []);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createWalkIn = useMutation({
    mutationFn: async () => {
      const { customers } = await customerApi.search("Walk-in", 5);
      const existing = customers.find((c: Customer) =>
        /walk\s*-?\s*in/i.test(c.name),
      );
      if (existing) return existing;
      const res = await customerApi.create({ name: "Walk-in Customer" });
      return (res as { customer: Customer }).customer;
    },
  });

  // ── Auto-select Walk-in when opened as Quick Sale ──────────────────────────
  useEffect(() => {
    if (startAsWalkIn && !draftRestoredRef.current) {
      createWalkIn.mutate(undefined, {
        onSuccess: (c) => setSelectedCustomer(c),
      });
    }
  }, [startAsWalkIn]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setShowNewCust(false);
      setNewCustName("");
      setNewCustPhone("");
      void qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  const buildPayload = useCallback(
    (vars: { customerId: string; notesWithDue: string }): CreateInvoicePayload => ({
      customerId: vars.customerId,
      items: validItems.map((it) => ({
        productName: it.name.trim(),
        quantity: Math.max(1, parseFloat(it.qty) || 1),
        unitPrice: parseFloat(it.rate) > 0 ? parseFloat(it.rate) : undefined,
        lineDiscountPercent:
          parseFloat(it.discount) > 0 ? parseFloat(it.discount) : undefined,
      })),
      notes: vars.notesWithDue || undefined,
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
            method: (primary === "credit" ? "other" : primary) as "cash" | "upi" | "card" | "other",
          };
        }
        return parseFloat(paymentAmount) > 0
          ? {
              amount: parseFloat(paymentAmount),
              method: (paymentMode === "credit" ? "other" : paymentMode) as "cash" | "upi" | "card" | "other",
            }
          : undefined;
      })(),
    }),
    [
      validItems,
      withGst,
      discountPct,
      discountFlat,
      splitEnabled,
      splits,
      paymentMode,
      paymentAmount,
    ]
  );

  const createInvoice = useMutation({
    mutationFn: async (vars: {
      customerId: string;
      displayTotal: number;
      notesWithDue: string;
    }) => {
      if (!validItems.length) throw new Error("No items added");
      if (isOffline) {
        const payload = buildPayload(vars);
        const id = enqueueInvoice(payload, vars.displayTotal, vars.notesWithDue);
        return {
          invoice: {
            id,
            invoiceNo: `OFFLINE-${Date.now().toString(36).toUpperCase()}`,
          },
        } as { invoice: { id: string; invoiceNo: string } };
      }
      return invoiceApi.create(buildPayload(vars));
    },
    onSuccess: (data, vars) => {
      hapticSuccess();
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
      storage.delete(DRAFT_KEY);
      const fromOffline = data.invoice.id.startsWith("offline-");
      setSavedInvoice({
        id: data.invoice.id,
        no:
          (data.invoice as any).invoiceNo ??
          data.invoice.id.slice(-8).toUpperCase(),
        total: vars.displayTotal,
        fromOffline,
      });
    },
    onError: (err: Error) => {
      hapticError();
      Alert.alert("Error creating invoice", err.message);
    },
  });

  const handleSubmit = async () => {
    if (validItemCount === 0) return;
    let customerId = selectedCustomer?.id;
    if (!customerId) {
      if (isOffline) {
        customerId = "offline-walkin";
      } else {
        const walkIn = await createWalkIn.mutateAsync();
        customerId = walkIn.id;
      }
    }
    const effectiveDueDate = computedDueDate || dueDate;
    const notesWithDue = [
      notes.trim(),
      effectiveDueDate ? `Due: ${new Date(effectiveDueDate).toLocaleDateString("en-IN")}` : "",
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

  const discardDraft = () => {
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
    setDueDate("");
    setRoundOffEnabled(false);
    storage.delete(DRAFT_KEY);
  };

  const resetForm = () => {
    setSavedInvoice(null);
    discardDraft();
  };

  const handlePrintReceipt = useCallback(async () => {
    if (!savedInvoice) return;
    const receiptData: ReceiptData = {
      shopName: "My Shop",
      invoiceNo: savedInvoice.no,
      date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      customerName: selectedCustomer?.name ?? "Walk-in",
      items: validItems.map((it) => ({
        name: it.name.trim(),
        qty: Math.max(1, parseFloat(it.qty) || 1),
        rate: parseFloat(it.rate) || 0,
        discountPct: parseFloat(it.discount) || 0,
        amount: computeAmount(it.rate, it.qty, it.discount),
      })),
      subtotal,
      discountAmt,
      taxableAmt,
      withGst,
      totalGst: cgst + sgst,
      grandTotal,
      roundOff,
      finalTotal,
      amountInWords: grandTotalWords,
      payments: splitEnabled
        ? splits.filter((s) => parseFloat(s.amount) > 0).map((s) => ({ mode: s.mode, amount: parseFloat(s.amount) }))
        : parseFloat(paymentAmount) > 0
          ? [{ mode: paymentMode, amount: parseFloat(paymentAmount) }]
          : [{ mode: "cash", amount: finalTotal }],
      notes: [notes.trim(), (computedDueDate || dueDate) ? `Due: ${new Date(computedDueDate || dueDate).toLocaleDateString("en-IN")}` : ""].filter(Boolean).join(" ") || undefined,
    };
    try {
      await printReceipt(receiptData);
    } catch (e) {
      Alert.alert("Print", (e as Error).message ?? "Could not print receipt");
    }
  }, [
    savedInvoice,
    selectedCustomer,
    validItems,
    subtotal,
    discountAmt,
    taxableAmt,
    withGst,
    cgst,
    sgst,
    grandTotal,
    roundOff,
    finalTotal,
    grandTotalWords,
    splitEnabled,
    splits,
    paymentMode,
    paymentAmount,
    notes,
    dueDate,
    computedDueDate,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={60}
      >
        <ScrollView
          className="flex-1 px-4"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 80, paddingTop: 4 }}
        >
          {/* ── Draft Banner ─────────────────────────────────────────── */}
          {draftBanner && (
            <View className="flex-row items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 mt-3 mb-1">
              <Text className="text-amber-700 text-xs font-semibold flex-1">
                ↺ Draft restored from last session
              </Text>
              <TouchableOpacity onPress={discardDraft} className="ml-3">
                <Text className="text-amber-600 text-xs font-bold underline">
                  Discard
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Invoice Bar (Indian standard — tap to edit) ───────────── */}
          <TouchableOpacity
            onPress={() => setShowInvoiceBarEdit(true)}
            activeOpacity={0.7}
            className="flex-row items-center rounded-xl border-2 border-slate-200 bg-white px-4 py-3 mb-3"
          >
            <View className="flex-1">
              <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                <View>
                  <Text className="text-[10px] font-semibold text-slate-500 uppercase">
                    {documentTitle === "billOfSupply" ? "Bill of Supply" : "Invoice"} #
                  </Text>
                  <Text className="text-sm font-bold text-slate-800">
                    {invoicePrefix}DRAFT
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-semibold text-slate-500 uppercase">
                    Doc Date
                  </Text>
                  <Text className="text-sm font-medium text-slate-800">
                    {new Date(documentDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-semibold text-slate-500 uppercase">
                    Due
                  </Text>
                  <Text className="text-sm font-medium text-slate-800">
                    {computedDueDate
                      ? new Date(computedDueDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="pencil" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* ── Customer ─────────────────────────────────────────────── */}
          <View className="mt-2 mb-2">
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="person-outline" size={14} color="#64748b" />
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Customer
                </Text>
              </View>
              {!selectedCustomer && (
                <TouchableOpacity
                  onPress={() =>
                    createWalkIn.mutate(undefined, {
                      onSuccess: (c) => setSelectedCustomer(c),
                    })
                  }
                  disabled={createWalkIn.isPending}
                  className="flex-row items-center gap-1 px-2 py-1 rounded-lg border border-primary/40 bg-primary/10"
                >
                  {createWalkIn.isPending ? (
                    <ActivityIndicator size="small" color="#e67e22" />
                  ) : (
                    <Ionicons name="cart-outline" size={14} color="#e67e22" />
                  )}
                  <Text className="text-xs font-semibold text-primary">Walk-in</Text>
                </TouchableOpacity>
              )}
            </View>
            {selectedCustomer ? (
              <View className="flex-row items-center rounded-xl border border-primary/30 bg-primary/10 px-3 py-3">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-800">
                    {selectedCustomer.name}
                  </Text>
                  {selectedCustomer.phone && (
                    <Text className="text-xs text-slate-500 mt-0.5">
                      {selectedCustomer.phone}
                    </Text>
                  )}
                  {outstandingBalance > 0 && (
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Ionicons name="warning-outline" size={12} color="#d97706" />
                      <Text className="text-xs font-semibold text-amber-600">
                        ₹{inr(outstandingBalance)} outstanding
                      </Text>
                    </View>
                  )}
                  {outstandingBalance < 0 && (
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Ionicons name="checkmark-circle-outline" size={12} color="#16a34a" />
                      <Text className="text-xs font-semibold text-green-600">
                        ₹{inr(Math.abs(outstandingBalance))} advance credit
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCustomer(null);
                    setCustomerQuery("");
                  }}
                  className="border border-slate-300 rounded-lg px-3 py-2 ml-2"
                >
                  <Text className="text-xs text-slate-500 font-medium">
                    Change
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View className="flex-row items-center border border-slate-200 rounded-xl bg-white px-3">
                  <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput
                    value={customerQuery}
                    onChangeText={(t) => {
                      setCustomerQuery(t);
                      setShowCustSuggest(true);
                    }}
                    onFocus={() => setShowCustSuggest(true)}
                    onBlur={() =>
                      setTimeout(() => setShowCustSuggest(false), 150)
                    }
                    placeholder="Search customer… (blank = Walk-in)"
                    placeholderTextColor="#94a3b8"
                    className="flex-1 h-12 text-sm text-slate-800"
                  />
                  {searchingCustomers && (
                    <ActivityIndicator size="small" color="#e67e22" />
                  )}
                </View>
                {showCustSuggest && customerQuery.length >= 1 && (
                  <View className="border border-slate-200 rounded-xl mt-1 bg-white shadow-sm overflow-hidden">
                    {customerSuggestions.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => {
                          setSelectedCustomer(c);
                          setCustomerQuery("");
                          setShowCustSuggest(false);
                        }}
                        className="flex-row items-center px-3 py-3 border-b border-slate-100 last:border-0"
                      >
                        <Text className="text-sm font-medium text-slate-800 flex-1">
                          {c.name}
                        </Text>
                        {c.phone && (
                          <Text className="text-xs text-slate-500">
                            {c.phone}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      onPress={() => {
                        setNewCustName(customerQuery.trim());
                        setShowNewCust(true);
                        setShowCustSuggest(false);
                      }}
                      className="flex-row items-center px-3 py-3 border-t border-slate-100 bg-primary/10"
                    >
                      <Text className="text-sm text-primary font-semibold">
                        ➕ Add "{customerQuery}" as new customer
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {customerQuery.length === 0 && (
                  <Text className="text-xs text-slate-400 mt-1 pl-1">
                    Leave blank → Walk-in customer
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* ── Items ────────────────────────────────────────────────── */}
          <View className="mt-2 mb-2">
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="cube-outline" size={14} color="#64748b" />
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Items
                </Text>
              </View>
              <View className="flex-row gap-1">
                {PRICE_TIERS.map((tier, idx) => (
                  <TouchableOpacity
                    key={tier.key}
                    onPress={() => {
                      const next = priceTierIdx === idx ? null : idx;
                      setPriceTierIdx(next);
                      storage.set(PRICE_TIER_KEY, String(next ?? -1));
                    }}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      priceTierIdx === idx
                        ? "border-primary bg-primary"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    <Text
                      className={
                        priceTierIdx === idx ? "text-white" : "text-slate-600"
                      }
                    >
                      {tier.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View className="border border-slate-200 rounded-xl overflow-hidden">
              {items.map((item, idx) => (
                <MobileItemRow
                  key={item.id}
                  item={item}
                  catalog={catalog}
                  isFirst={idx === 0}
                  getEffectivePrice={getEffectivePrice}
                  onUpdate={(patch) => updateItem(item.id, patch)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
              <TouchableOpacity
                onPress={addItem}
                className="flex-row items-center gap-2 px-4 py-3 border-t border-slate-100"
              >
                <Ionicons name="add-circle-outline" size={20} color="#e67e22" />
                <Text className="text-primary text-base font-semibold">
                  Add item
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── GST ──────────────────────────────────────────────────── */}
          <View className="flex-row items-center justify-between rounded-xl border border-slate-200 px-4 py-3 mb-2">
            <View>
              <Text className="text-sm font-semibold text-slate-800">
                Include GST
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                Adds 18% GST (CGST+SGST)
              </Text>
            </View>
            <Switch
              value={withGst}
              onValueChange={setWithGst}
              trackColor={{ false: "#e2e8f0", true: "#818cf8" }}
              thumbColor={withGst ? "#e67e22" : "#f4f4f5"}
            />
          </View>

          {/* ── Discount ─────────────────────────────────────────────── */}
          <View className="flex-row gap-3 mb-2">
            <View className="flex-1">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Bill Disc %
              </Text>
              <View className="flex-row items-center border border-slate-200 rounded-xl px-3 bg-white">
                <TextInput
                  value={discountPct}
                  onChangeText={(v) => {
                    setDiscountPct(v);
                    if (v) setDiscountFlat("");
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 h-12 text-base text-slate-800"
                />
                <Text className="text-slate-400 text-sm">%</Text>
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Flat Disc ₹
              </Text>
              <View className="flex-row items-center border border-slate-200 rounded-xl px-3 bg-white">
                <Text className="text-slate-400 text-sm mr-1">₹</Text>
                <TextInput
                  value={discountFlat}
                  onChangeText={(v) => {
                    setDiscountFlat(v);
                    if (v) setDiscountPct("");
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 h-12 text-base text-slate-800"
                />
              </View>
            </View>
          </View>

          {/* ── Totals Card ───────────────────────────────────────────── */}
          {validItemCount > 0 && (
            <View className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-2">
              <TotalRow label="Subtotal" value={`₹${inr(subtotal)}`} />
              {discountAmt > 0 && (
                <TotalRow
                  label="Discount"
                  value={`−₹${inr(discountAmt)}`}
                  valueClass="text-green-600 font-semibold"
                />
              )}
              {withGst && (
                <>
                  <TotalRow label="Taxable" value={`₹${inr(taxableAmt)}`} />
                  <TotalRow label="CGST (9%)" value={`₹${inr(cgst)}`} />
                  <TotalRow label="SGST (9%)" value={`₹${inr(sgst)}`} />
                </>
              )}
              {/* Grand total + round off */}
              <View className="border-t border-slate-200 mt-2 pt-2">
                <View className="flex-row justify-between items-center">
                  <Text className="font-bold text-slate-800">Grand Total</Text>
                  <Text className="font-black text-xl text-primary">
                    ₹{inr(finalTotal)}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between mt-2">
                  <Text
                    className="text-xs text-slate-400 italic flex-1 pr-2"
                    numberOfLines={2}
                  >
                    {grandTotalWords}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xs text-slate-500">Round off</Text>
                    <Switch
                      value={roundOffEnabled}
                      onValueChange={setRoundOffEnabled}
                      trackColor={{ false: "#e2e8f0", true: "#818cf8" }}
                      thumbColor={roundOffEnabled ? "#e67e22" : "#f4f4f5"}
                    />
                  </View>
                </View>
                {roundOffEnabled && roundOff !== 0 && (
                  <Text className="text-xs text-blue-600 mt-1">
                    {roundOff > 0 ? "+" : ""}
                    {inr(roundOff)} rounded
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* ── Payment ───────────────────────────────────────────────── */}
          <View className="mb-2">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="card-outline" size={14} color="#64748b" />
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Payment
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-xs text-slate-500">Split</Text>
                <Switch
                  value={splitEnabled}
                  onValueChange={(v) => {
                    setSplitEnabled(v);
                    if (v) setSplits([newSplit("cash")]);
                  }}
                  trackColor={{ false: "#e2e8f0", true: "#818cf8" }}
                  thumbColor={splitEnabled ? "#e67e22" : "#f4f4f5"}
                />
              </View>
            </View>

            {!splitEnabled ? (
              <>
                <View className="flex-row gap-2 mb-2">
                  {PAY_MODES.map(({ id, label }) => (
                    <TouchableOpacity
                      key={id}
                      onPress={() => setPaymentMode(id)}
                      className={`flex-1 items-center justify-center rounded-xl border-2 py-3 ${paymentMode === id ? "border-primary bg-primary/10" : "border-slate-200"}`}
                    >
                      <Ionicons
                        name={PAY_MODE_ICONS[id]}
                        size={28}
                        color={paymentMode === id ? "#e67e22" : "#64748b"}
                      />
                      <Text
                        className={`text-xs font-semibold mt-0.5 ${paymentMode === id ? "text-primary" : "text-slate-500"}`}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {paymentMode !== "credit" && (
                  <View className="flex-row items-center gap-2">
                    <View className="flex-row flex-1 items-center border border-slate-200 rounded-xl px-3 bg-white">
                      <Text className="text-slate-400 mr-1">₹</Text>
                      <TextInput
                        value={paymentAmount}
                        onChangeText={setPaymentAmount}
                        keyboardType="decimal-pad"
                        placeholder={`Amount paid (₹${inr(finalTotal)})`}
                        placeholderTextColor="#94a3b8"
                        className="flex-1 h-12 text-base text-slate-800"
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => setPaymentAmount(String(finalTotal))}
                      className="border border-slate-200 rounded-xl px-4 h-12 items-center justify-center"
                    >
                      <Text className="text-sm font-semibold text-slate-700">
                        Full
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {paymentMode === "credit" && (
                  <View className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <Text className="text-xs text-amber-700">
                      Full amount added to customer credit account
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View className="border-2 border-slate-200 rounded-xl overflow-hidden bg-white">
                <View className="px-4 py-3 bg-slate-50">
                  <View className="flex-row justify-between text-xs mb-2">
                    <Text className="text-slate-500">Total</Text>
                    <Text className="font-bold text-slate-800">
                      ₹{inr(finalTotal)}
                    </Text>
                  </View>
                  <View className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <View
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, finalTotal > 0 ? (splitTotal / finalTotal) * 100 : 0)}%`,
                      }}
                    />
                  </View>
                  <View className="flex-row justify-between text-xs mt-1">
                    <Text
                      className={
                        splitTotal >= finalTotal - 0.01
                          ? "text-green-600 font-semibold"
                          : "text-slate-500"
                      }
                    >
                      {Math.abs(finalTotal - splitTotal) < 0.01
                        ? "✓ Settled"
                        : `Paid ₹${inr(splitTotal)}`}
                    </Text>
                    {finalTotal - splitTotal > 0.001 && (
                      <Text className="text-amber-600 font-semibold">
                        ₹{inr(finalTotal - splitTotal)} left
                      </Text>
                    )}
                  </View>
                </View>
                {splits.map((sp, idx) => (
                  <View
                    key={sp.id}
                    className="flex-row items-center px-3 py-2 border-b border-slate-100"
                  >
                    <View className="flex-row gap-1 mr-2">
                      {PAY_MODES.map(({ id }) => (
                        <TouchableOpacity
                          key={id}
                          onPress={() =>
                            setSplits((prev) =>
                              prev.map((s) =>
                                s.id === sp.id ? { ...s, mode: id } : s,
                              ),
                            )
                          }
                          className={`w-9 h-9 items-center justify-center rounded-lg border ${sp.mode === id ? "border-primary bg-primary/10" : "border-transparent"}`}
                        >
                          <Ionicons
                            name={PAY_MODE_ICONS[id]}
                            size={22}
                            color={sp.mode === id ? "#e67e22" : "#64748b"}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View className="flex-row flex-1 items-center border border-slate-200 rounded-xl px-2 bg-white">
                      <Text className="text-slate-400 text-xs mr-1">₹</Text>
                      <TextInput
                        value={sp.amount}
                        onChangeText={(v) =>
                          setSplits((prev) =>
                            prev.map((s) =>
                              s.id === sp.id ? { ...s, amount: v } : s,
                            ),
                          )
                        }
                        keyboardType="decimal-pad"
                        placeholder="Amount"
                        placeholderTextColor="#94a3b8"
                        className="flex-1 h-10 text-sm text-slate-800"
                      />
                    </View>
                    {idx === splits.length - 1 &&
                      finalTotal - splitTotal + (parseFloat(sp.amount) || 0) >
                        0.001 && (
                        <TouchableOpacity
                          onPress={() => {
                            const rest =
                              finalTotal -
                              splits
                                .filter((s) => s.id !== sp.id)
                                .reduce(
                                  (a, s) => a + (parseFloat(s.amount) || 0),
                                  0,
                                );
                            setSplits((prev) =>
                              prev.map((s) =>
                                s.id === sp.id
                                  ? {
                                      ...s,
                                      amount: String(
                                        Math.max(
                                          0,
                                          Math.round(rest * 100) / 100,
                                        ),
                                      ),
                                    }
                                  : s,
                              ),
                            );
                          }}
                          className="rounded-lg ml-2 px-2 py-1.5 bg-primary/10"
                        >
                          <Text className="text-xs font-semibold text-primary">
                            Fill ₹{inr(finalTotal - splits.filter((x) => x.id !== sp.id).reduce((a, s) => a + (parseFloat(s.amount) || 0), 0))}
                          </Text>
                        </TouchableOpacity>
                      )}
                    <TouchableOpacity
                      onPress={() =>
                        setSplits((prev) =>
                          prev.length > 1
                            ? prev.filter((s) => s.id !== sp.id)
                            : prev,
                        )
                      }
                      className="ml-2 w-9 h-9 items-center justify-center"
                    >
                      <Text className="text-red-400 text-lg">×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {splits.length < 4 && (
                  <TouchableOpacity
                    onPress={() => {
                      const usedModes = splits.map((s) => s.mode);
                      const next =
                        PAY_MODES.find((m) => !usedModes.includes(m.id))?.id ??
                        "cash";
                      setSplits((prev) => [...prev, newSplit(next)]);
                    }}
                    className="flex-row items-center px-3 py-3"
                  >
                    <Text className="text-primary text-sm font-semibold">
                      ＋ Add payment method
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* ── Notes + Due Date ──────────────────────────────────────── */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              📝 Notes / Due Date
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Special instructions, delivery address…"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 bg-white min-h-[72px]"
              style={{ textAlignVertical: "top" }}
            />
            <View className="flex-row items-center border border-slate-200 rounded-xl px-3 py-2.5 mt-2 bg-white">
              <Text className="text-slate-500 mr-2 text-sm">📅 Due Date</Text>
              <TextInput
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="DD/MM/YYYY or leave blank"
                placeholderTextColor="#94a3b8"
                keyboardType="numbers-and-punctuation"
                className="flex-1 text-sm text-slate-800 h-9"
              />
              {dueDate ? (
                <TouchableOpacity
                  onPress={() => setDueDate("")}
                  className="w-8 h-8 items-center justify-center"
                >
                  <Text className="text-slate-400 text-lg">×</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </ScrollView>

        {/* ── Sticky CTA ───────────────────────────────────────────────── */}
        <View className="border-t border-slate-200 bg-white px-4 py-3">
          <TouchableOpacity
            onPress={() => void handleSubmit()}
            disabled={validItemCount === 0 || isSubmitting}
            className={`rounded-2xl h-14 items-center justify-center ${validItemCount > 0 && !isSubmitting ? "bg-primary active:opacity-90" : "bg-slate-300"}`}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">
                {validItemCount > 0
                  ? `✓ Create Invoice — ₹${inr(finalTotal)}${selectedCustomer ? ` · ${selectedCustomer.name}` : " (Walk-in)"}`
                  : "Create Invoice"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Invoice Bar Edit Modal ────────────────────────────────────── */}
      <Modal visible={showInvoiceBarEdit} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setShowInvoiceBarEdit(false)}
        />
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8 max-h-[85%]">
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-base font-bold text-slate-800 mb-4">
              Invoice Details
            </Text>
            <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">
              Invoice Prefix
            </Text>
            <TextInput
              value={invoicePrefix}
              onChangeText={setInvoicePrefix}
              placeholder="e.g. INV-, BOS-"
              placeholderTextColor="#94a3b8"
              maxLength={16}
              className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3"
            />
            <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">
              Document Date
            </Text>
            <TextInput
              value={documentDate}
              onChangeText={setDocumentDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3"
            />
            <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Due Date (days)
            </Text>
            <View className="flex-row gap-2 mb-2">
              {DUE_DATE_PRESETS.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDueDateDays(d)}
                  className={`flex-1 py-2.5 rounded-xl border items-center ${
                    dueDateDays === d
                      ? "border-primary bg-primary/10"
                      : "border-slate-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      dueDateDays === d ? "text-primary" : "text-slate-600"
                    }`}
                  >
                    {d} days
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setDueDateDays("custom")}
                className={`flex-1 py-2.5 rounded-xl border items-center ${
                  dueDateDays === "custom"
                    ? "border-primary bg-primary/10"
                    : "border-slate-200"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    dueDateDays === "custom" ? "text-primary" : "text-slate-600"
                  }`}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
            {dueDateDays === "custom" && (
              <View className="flex-row items-center gap-2 mb-3">
                <TextInput
                  value={customDueDays}
                  onChangeText={setCustomDueDays}
                  keyboardType="number-pad"
                  className="border border-slate-200 rounded-xl px-3 h-10 w-20 text-slate-800"
                />
                <Text className="text-sm text-slate-500">days</Text>
              </View>
            )}
            <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Document Title
            </Text>
            <View className="flex-row gap-4 mb-3">
              <TouchableOpacity
                onPress={() => setDocumentTitle("invoice")}
                className="flex-row items-center gap-2"
              >
                <View
                  className={`w-5 h-5 rounded-full border-2 ${
                    documentTitle === "invoice"
                      ? "border-primary bg-primary"
                      : "border-slate-300"
                  }`}
                />
                <Text className="text-sm text-slate-800">Invoice</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDocumentTitle("billOfSupply")}
                className="flex-row items-center gap-2"
              >
                <View
                  className={`w-5 h-5 rounded-full border-2 ${
                    documentTitle === "billOfSupply"
                      ? "border-primary bg-primary"
                      : "border-slate-300"
                  }`}
                />
                <Text className="text-sm text-slate-800">Bill of Supply</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">
              Discount on (base)
            </Text>
            <View className="border border-slate-200 rounded-xl mb-4 overflow-hidden">
              {(
                [
                  { id: "unit_price" as const, label: "Unit Price" },
                  { id: "price_with_tax" as const, label: "Price with Tax" },
                  { id: "net_amount" as const, label: "Net Amount" },
                  { id: "total_amount" as const, label: "Total Amount" },
                ] as const
              ).map(({ id, label }) => (
                <TouchableOpacity
                  key={id}
                  onPress={() => setDiscountOnType(id)}
                  className={`flex-row items-center px-3 py-3 border-b border-slate-100 last:border-0 ${
                    discountOnType === id ? "bg-primary/5" : ""
                  }`}
                >
                  <View
                    className={`w-4 h-4 rounded border-2 mr-2 ${
                      discountOnType === id
                        ? "border-primary bg-primary"
                        : "border-slate-300"
                    }`}
                  />
                  <Text
                    className={
                      discountOnType === id
                        ? "text-sm font-semibold text-primary"
                        : "text-sm text-slate-700"
                    }
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowInvoiceBarEdit(false)}
                className="flex-1 h-12 items-center justify-center border border-slate-200 rounded-xl"
              >
                <Text className="text-sm font-semibold text-slate-600">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  saveInvoiceBar();
                  setShowInvoiceBarEdit(false);
                  if (documentTitle === "billOfSupply") {
                    setWithGst(false);
                  }
                }}
                className="flex-1 h-12 items-center justify-center bg-primary rounded-xl"
              >
                <Text className="text-white font-bold text-sm">Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── New Customer Modal ───────────────────────────────────────── */}
      <Modal visible={showNewCust} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setShowNewCust(false)}
        />
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
          <Text className="text-base font-bold text-slate-800 mb-4">
            ➕ New Customer
          </Text>
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Name *
          </Text>
          <TextInput
            value={newCustName}
            onChangeText={setNewCustName}
            placeholder="Customer name"
            placeholderTextColor="#94a3b8"
            autoFocus
            className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3"
          />
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Phone (optional)
          </Text>
          <TextInput
            value={newCustPhone}
            onChangeText={setNewCustPhone}
            placeholder="10-digit mobile"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            maxLength={15}
            className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-4"
          />
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setShowNewCust(false)}
              className="flex-1 h-12 items-center justify-center border border-slate-200 rounded-xl"
            >
              <Text className="text-sm font-semibold text-slate-600">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void createCustomerInline.mutateAsync()}
              disabled={!newCustName.trim() || createCustomerInline.isPending}
              className={`flex-1 h-12 items-center justify-center rounded-xl ${newCustName.trim() ? "bg-primary" : "bg-slate-300"}`}
            >
              {createCustomerInline.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-sm">Save & Use</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Success Modal ─────────────────────────────────────────────── */}
      <Modal visible={!!savedInvoice} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-3xl w-full p-6">
            <Text className="text-green-600 font-bold text-lg mb-3">
              ✅ {savedInvoice?.fromOffline ? "Queued for Sync!" : "Invoice Created!"}
            </Text>
            {savedInvoice?.fromOffline && (
              <Text className="text-amber-600 text-sm mb-2">
                Will sync when you're back online
              </Text>
            )}
            <View className="bg-slate-50 rounded-xl px-4 py-3 mb-4 space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-500">Invoice #</Text>
                <Text className="text-sm font-bold text-slate-800">
                  {savedInvoice?.no}
                </Text>
              </View>
              {selectedCustomer && (
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-500">Customer</Text>
                  <Text className="text-sm font-medium text-slate-800">
                    {selectedCustomer.name}
                  </Text>
                </View>
              )}
              {(computedDueDate || dueDate) && (
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-500">Due</Text>
                  <Text className="text-sm font-medium text-slate-800">
                    {new Date(computedDueDate || dueDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between pt-2 border-t border-slate-200">
                <Text className="text-sm text-slate-500">Amount</Text>
                <Text className="text-lg font-black text-primary">
                  ₹{inr(savedInvoice?.total ?? 0)}
                </Text>
              </View>
            </View>
            {selectedCustomer?.phone && (
              <TouchableOpacity
                onPress={() => {
                  if (!savedInvoice) return;
                  const phone = selectedCustomer.phone!.replace(/\D/g, "");
                  const effDue = computedDueDate || dueDate;
                  const msg = encodeURIComponent(
                    `Invoice #${savedInvoice.no}\nAmount: ₹${inr(savedInvoice.total)}\nFrom: My Shop${effDue ? `\nDue: ${new Date(effDue).toLocaleDateString("en-IN")}` : ""}`,
                  );
                  void Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
                }}
                className="flex-row items-center justify-center gap-2 bg-green-500 rounded-2xl h-12 mb-3"
              >
                <Text className="text-white text-2xl">💬</Text>
                <Text className="text-white font-semibold text-sm">
                  Share on WhatsApp
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => void handlePrintReceipt()}
              className="flex-row items-center justify-center gap-2 bg-slate-700 rounded-2xl h-12 mb-3"
            >
              <Ionicons name="print-outline" size={20} color="#fff" />
              <Text className="text-white font-semibold text-sm">
                Print Receipt
              </Text>
            </TouchableOpacity>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setSavedInvoice(null);
                  navigation.navigate("Invoices" as never);
                }}
                className="flex-1 h-12 items-center justify-center border border-slate-200 rounded-xl"
              >
                <Text className="text-sm font-semibold text-slate-700">
                  View Invoice
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={resetForm}
                className="flex-1 h-12 items-center justify-center bg-primary rounded-xl"
              >
                <Text className="text-white font-bold text-sm">
                  New Invoice
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Mobile Item Row ───────────────────────────────────────────────────────────

function MobileItemRow({
  item,
  catalog,
  isFirst,
  getEffectivePrice,
  onUpdate,
  onRemove,
}: {
  item: BillingItem;
  catalog: Product[];
  isFirst: boolean;
  getEffectivePrice: (p: Product & { wholesalePrice?: number | string | null; priceTier2?: number | string | null; priceTier3?: number | string | null }) => number;
  onUpdate: (patch: Partial<BillingItem>) => void;
  onRemove: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(item.name.trim()), 80);
    return () => clearTimeout(t);
  }, [item.name]);

  const { data: searchData } = useQuery({
    queryKey: ["product-search", debouncedQ],
    queryFn: () => productApi.search(debouncedQ),
    enabled: debouncedQ.length >= 1,
    staleTime: 30_000,
  });

  const instantHits = useMemo(
    () => fuzzyFilter(catalog, item.name),
    [catalog, item.name],
  );
  const suggestions: Product[] =
    item.name.trim().length === 0
      ? []
      : searchData?.products?.length
        ? searchData.products
        : instantHits;

  const handleSelect = (p: Product & { wholesalePrice?: number | string | null; priceTier2?: number | string | null; priceTier3?: number | string | null; hsnCode?: string }) => {
    onUpdate({
      name: p.name,
      rate: String(getEffectivePrice(p)),
      unit: p.unit ?? "pcs",
      productId: p.id,
      hsnCode: p.hsnCode,
    });
    setFocused(false);
  };

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      try {
        const { product } = await productApi.byBarcode(barcode);
        handleSelect(product);
      } catch {
        Alert.alert("Not found", "No product with this barcode in your catalog.");
      }
    },
    [handleSelect],
  );

  return (
    <View
      className={`px-3 py-2.5 ${isFirst ? "" : "border-t border-slate-100"}`}
    >
      {/* Product name + scan + suggestions */}
      <View className="relative mb-2">
        <View className="flex-row items-center border border-slate-200 rounded-xl bg-white overflow-hidden">
          <TextInput
            value={item.name}
            onChangeText={(t) => onUpdate({ name: t })}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Product name or scan barcode…"
            placeholderTextColor="#94a3b8"
            className="flex-1 px-3 h-11 text-sm text-slate-800"
            autoFocus={isFirst && item.name === ""}
          />
          <TouchableOpacity
            onPress={() => setScanOpen(true)}
            className="w-11 h-11 items-center justify-center border-l border-slate-200"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="barcode-outline" size={22} color="#e67e22" />
          </TouchableOpacity>
        </View>
        <BarcodeScanner
          visible={scanOpen}
          onClose={() => setScanOpen(false)}
          onScan={handleBarcodeScan}
          hint="Point at product barcode"
        />
        {focused && suggestions.length > 0 && (
          <View className="absolute top-12 left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-hidden">
            <FlatList
              data={suggestions.slice(0, 6)}
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="always"
              renderItem={({ item: p }) => {
                const outOfStock = Number(p.stock) <= 0;
                const lowStock = !outOfStock && Number(p.stock) < 5;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelect(p)}
                    className="flex-row items-center justify-between px-3 py-2.5 border-b border-slate-100"
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-slate-800">
                        {p.name}
                      </Text>
                      <Text
                        className={`text-xs ${outOfStock ? "text-red-500" : lowStock ? "text-orange-500" : "text-slate-400"}`}
                      >
                        {p.unit} ·{" "}
                        {outOfStock ? "Out of stock" : `Stock: ${p.stock}`}
                      </Text>
                    </View>
                    <Text className="text-sm font-bold text-primary">
                      ₹
                      {getEffectivePrice(p).toLocaleString("en-IN")}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </View>

      {/* Qty / Unit / Rate / Disc in 2x2 grid */}
      {item.name.trim().length > 0 && (
        <>
          <View className="flex-row gap-2 mb-2">
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1">Qty</Text>
              <TextInput
                value={item.qty}
                onChangeText={(v) => onUpdate({ qty: v })}
                keyboardType="decimal-pad"
                className="border border-slate-200 rounded-xl px-3 h-11 text-base text-center text-slate-800 bg-white"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1">Unit</Text>
              <TextInput
                value={item.unit}
                onChangeText={(v) => onUpdate({ unit: v })}
                placeholder="pcs"
                placeholderTextColor="#94a3b8"
                className="border border-slate-200 rounded-xl px-3 h-11 text-base text-slate-800 bg-white"
              />
            </View>
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1">Rate ₹</Text>
              <TextInput
                value={item.rate}
                onChangeText={(v) => onUpdate({ rate: v })}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                className="border border-slate-200 rounded-xl px-3 h-11 text-base text-slate-800 bg-white"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1">Disc %</Text>
              <TextInput
                value={item.discount}
                onChangeText={(v) => onUpdate({ discount: v })}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#94a3b8"
                className="border border-slate-200 rounded-xl px-3 h-11 text-base text-slate-800 bg-white"
              />
            </View>
          </View>
          {/* Amount + remove */}
          <View className="flex-row items-center justify-between mt-2 bg-slate-50 rounded-xl px-3 py-2">
            <Text className="text-xs text-slate-500">Amount</Text>
            <Text className="font-bold text-base text-primary">
              ₹
              {item.amount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </Text>
            <TouchableOpacity
              onPress={onRemove}
              className="w-10 h-10 items-center justify-center rounded-xl"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-red-400 text-xl">🗑</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

// ── Total Row ─────────────────────────────────────────────────────────────────

function TotalRow({
  label,
  value,
  valueClass = "text-sm font-semibold text-slate-700",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <View className="flex-row justify-between items-center py-0.5">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className={valueClass}>{value}</Text>
    </View>
  );
}
