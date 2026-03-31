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
  useLayoutEffect,
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
  Alert,
  Image,
} from "react-native";
import { showAlert } from "../../../shared/lib/alerts";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
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
import {
  customerApi,
  productApi,
  invoiceApi,
  authApi,
  getApiBaseUrl,
} from "../../../lib/api";
import {
  storage,
  tokenStorage,
  INVOICE_DRAFT_KEY,
  INVOICE_BAR_KEY,
  PRICE_TIER_KEY,
  INV_TEMPLATE_KEY,
  BIZ_STORAGE_KEY,
  DOC_SETTINGS_KEY,
} from "../../../shared/lib/storage";
import { CustomerSection } from "../components/CustomerSection";
import { ItemsSection } from "../components/ItemsSection";
import { ProductPickerModal } from "../components/ProductPickerModal";
import { SuccessModal } from "../components/SuccessModal";
import { printReceipt } from "../../../lib/printReceipt";
import { useOffline } from "../../../contexts/OfflineContext";
import { useResponsive } from "../../../shared/hooks/useResponsive";
import { enqueueInvoice } from "../../../lib/offlineQueue";
import {
  hapticSuccess,
  hapticError,
  hapticLight,
} from "../../../shared/lib/haptics";
import { cacheProducts } from "../../../lib/offlineQueue";
import type { ReceiptData } from "../../../lib/thermalReceipt";
import type { InvoiceStackParams } from "../../../navigation";
import { useBillingForm as useInvoiceForm } from "../hooks/useBillingForm";
import {
  InvoiceTemplatePreview,
  TemplateThumbnail,
  TEMPLATES,
  type PreviewData,
  type TemplateId,
} from "../components/InvoiceTemplatePreview";

// ── ID counters ───────────────────────────────────────────────────────────────
// _id is used only to assign unique IDs to restored draft items.
// New items use the formReducer (max(id)+1). New splits use the formReducer too.
let _id = 1;

const DUE_DATE_PRESETS = [15, 30, 60] as const;
type DocumentTitle = "invoice" | "billOfSupply";

// Modern icons (Ionicons) — matches web Lucide: Banknote, Smartphone, CreditCard, Wallet
const PAY_MODE_ICONS: Record<PaymentMode, keyof typeof Ionicons.glyphMap> = {
  cash: "cash-outline",
  upi: "phone-portrait-outline",
  card: "card-outline",
  credit: "wallet-outline",
};
type DiscountOnType =
  | "unit_price"
  | "price_with_tax"
  | "net_amount"
  | "total_amount";

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

type InvoiceProps = NativeStackScreenProps<InvoiceStackParams, "InvoiceForm">;

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: 'New Invoice',
  quotation: 'New Quotation',
  proforma: 'Proforma Invoice',
  sales_order: 'Sales Order',
  delivery_challan: 'Delivery Challan',
  bill_of_supply: 'Bill of Supply',
  pos_sale: 'Quick Sale',
};

export function BillingScreen({ navigation, route }: BillingProps) {
  const qc = useQueryClient();
  const { isOffline } = useOffline();
  const { contentPad, contentWidth } = useResponsive();
  const insets = useSafeAreaInsets();
  const startAsWalkIn = route.params?.startAsWalkIn;
  const documentType = route.params?.documentType ?? 'invoice';
  const screenTitle = DOC_TYPE_LABELS[documentType] ?? 'New Invoice';

  // ── Form state (useInvoiceForm) ────────────────────────────────────────────
  const initialRoundOffRef = useRef(
    (() => {
      try {
        const raw = storage.getString(BIZ_STORAGE_KEY);
        const p = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        return p.roundOff === true || p.roundOff === "true";
      } catch {
        return false;
      }
    })(),
  );
  const {
    state: {
      items,
      selectedCustomer,
      customerQuery,
      showCustSuggest,
      withGst,
      discountPct,
      discountFlat,
      roundOffEnabled,
      paymentMode,
      paymentAmount,
      splitEnabled,
      splits,
      notes,
      dueDate,
      draftBanner,
      activeRow,
      showNewCust,
      productPickerOpen,
      newCustName,
      newCustPhone,
      billingSetupExpanded,
      invoiceStyleExpanded,
      showInvoiceBarEdit,
      showPreview,
    },
    dispatch: formDispatch,
    addItem: formAddItem,
    updateItem: formUpdateItem,
    removeItem: formRemoveItem,
    setCustomer,
    setCustomerQuery,
    setCustSuggest,
    setWithGst,
    setDiscountPct,
    setDiscountFlat,
    setRoundOff,
    setPaymentMode,
    setPaymentAmount,
    toggleSplit,
    addSplit,
    updateSplit,
    removeSplit,
    setNotes,
    setDueDate,
    setActiveRow,
    toggleNewCustModal,
    setNewCustName,
    setNewCustPhone,
    toggleProductPicker,
    toggleDraftBanner,
    toggleBillingSetup,
    toggleInvoiceStyle,
    toggleInvoiceBarEdit,
    togglePreview,
    resetForm: formReset,
    loadDraft,
  } = useInvoiceForm({ roundOffEnabled: initialRoundOffRef.current });

  // Success modal state (not part of form state)
  const [savedInvoice, setSavedInvoice] = useState<{
    id: string;
    no: string;
    total: number;
    fromOffline?: boolean;
  } | null>(null);
  const [invoiceTemplate, setInvoiceTemplate] = useState<TemplateId>(() => {
    const t = storage.getString(INV_TEMPLATE_KEY) as TemplateId | undefined;
    return t && TEMPLATES.some((x) => x.id === t) ? t : "classic";
  });
  const [compositionScheme, setCompositionScheme] = useState(() => {
    try {
      const raw = storage.getString(BIZ_STORAGE_KEY);
      const p = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      return p.compositionScheme === true || p.compositionScheme === "true";
    } catch {
      return false;
    }
  });

  function readBizProfile(): Record<string, unknown> {
    try {
      const raw = storage.getString(BIZ_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  function handleTemplateChange(t: TemplateId) {
    setInvoiceTemplate(t);
    storage.set(INV_TEMPLATE_KEY, t);
    const stored = readBizProfile();
    stored.invoiceTemplate = t;
    storage.set(BIZ_STORAGE_KEY, JSON.stringify(stored));
  }

  const { data: meData } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    staleTime: 5 * 60_000,
  });
  const meUser = meData?.user as
    | {
        tenant?: {
          legalName?: string;
          name?: string;
          gstin?: string;
          settings?: Record<string, unknown>;
        };
      }
    | undefined;
  const tenant = meUser?.tenant;
  const bizProfile = readBizProfile();
  const shopName =
    ((bizProfile.legalName ?? tenant?.legalName ?? tenant?.name) as string) ||
    "My Shop";
  const supplierGstin = (bizProfile.gstin ?? tenant?.gstin) as
    | string
    | undefined;
  const supplierAddressParts = [
    bizProfile.address,
    bizProfile.city,
    bizProfile.state,
    bizProfile.pincode,
  ].filter(Boolean) as string[];
  const supplierAddress =
    supplierAddressParts.length > 0
      ? supplierAddressParts.join(", ")
      : undefined;

  // ── Invoice bar (Indian standard) ───────────────────────────────────────
  // showInvoiceBarEdit is managed by useInvoiceForm (toggleInvoiceBarEdit)
  const [invoicePrefix, setInvoicePrefix] = useState(
    () => (readInvoiceBar().invoicePrefix as string) ?? "INV-",
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
    return [
      "unit_price",
      "price_with_tax",
      "net_amount",
      "total_amount",
    ].includes(v)
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
    (
      p: Product & {
        wholesalePrice?: number | string | null;
        priceTier2?: number | string | null;
        priceTier3?: number | string | null;
      },
    ): number => {
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
    const days =
      dueDateDays === "custom" ? parseInt(customDueDays, 10) || 0 : dueDateDays;
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
  }, [
    invoicePrefix,
    documentDate,
    dueDateDays,
    customDueDays,
    documentTitle,
    discountOnType,
  ]);

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

  // ── Customer search with debounce ────────────────────────────────────────
  const debouncedCustomerQuery = useMemo(() => customerQuery, [customerQuery]);
  const { data: custData, isFetching: searchingCustomers } = useQuery({
    queryKey: ["customers-search", debouncedCustomerQuery],
    queryFn: () => customerApi.search(debouncedCustomerQuery),
    enabled: debouncedCustomerQuery.length >= 1 && !selectedCustomer,
    staleTime: 5000,
  });
  const customerSuggestions: Customer[] = custData?.customers ?? [];

  // ── Totals ────────────────────────────────────────────────────────────────
  const validItems = useMemo(
    () => items.filter((it) => it.name.trim()),
    [items],
  );
  const validItemCount = useMemo(() => validItems.length, [validItems]);
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
  const grandTotalWords = useMemo(
    () => amountInWords(finalTotal),
    [finalTotal],
  );
  const splitTotal = useMemo(
    () => splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0),
    [splits],
  );
  const outstandingBalance = useMemo(
    () => parseFloat(String(selectedCustomer?.balance ?? 0)) || 0,
    [selectedCustomer?.balance],
  );

  // ── Logo for header (document icon) ───────────────────────────────────────
  const settings = (tenant?.settings as Record<string, unknown>) ?? {};
  const logoObjectKey = (settings.logoObjectKey ??
    (bizProfile as Record<string, unknown>).logoObjectKey) as
    | string
    | undefined;
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!logoObjectKey) {
      setLogoDataUrl(null);
      return;
    }
    const token = tokenStorage.getToken();
    if (!token) return;
    let cancelled = false;
    fetch(`${getApiBaseUrl()}/api/v1/tenant/logo`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((arrayBuffer) => {
        if (cancelled || !arrayBuffer) return;
        try {
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++)
            binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);
          if (!cancelled) setLogoDataUrl(`data:image/jpeg;base64,${base64}`);
        } catch {
          /* base64 conversion failed */
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [logoObjectKey]);

  // ── Header: title + Logo (document icon) or ellipsis → Document Settings ───
  useLayoutEffect(() => {
    (navigation as any).setOptions({
      title: screenTitle,
      headerRight: () => (
        <TouchableOpacity
          onPress={() =>
            (navigation as any).getParent()?.navigate("DocumentSettings")
          }
          className="p-2 -m-2"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Document Settings"
        >
          {logoDataUrl ? (
            <Image
              source={{ uri: logoDataUrl }}
              style={{ width: 28, height: 28, borderRadius: 6 }}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="document-text-outline" size={24} color="#0f172a" />
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, logoDataUrl, screenTitle]);

  // ── Item helpers ──────────────────────────────────────────────────────────
  // updateItem + removeItem come from useInvoiceForm (formUpdateItem, formRemoveItem)
  const updateItem = formUpdateItem;
  const removeItem = formRemoveItem;
  const addItem = useCallback(() => {
    hapticLight();
    formAddItem();
  }, [formAddItem]);
  const addItemWithProduct = useCallback(
    (
      p: Product & {
        wholesalePrice?: number | string | null;
        priceTier2?: number | string | null;
        priceTier3?: number | string | null;
        hsnCode?: string;
      },
    ) => {
      hapticLight();
      const rate = getEffectivePrice(p);
      const nextId = Math.max(0, ...items.map((i) => i.id ?? 0)) + 1;
      formDispatch({
        type: "LOAD_DRAFT",
        draft: {
          items: [
            ...items,
            {
              id: nextId,
              name: p.name,
              qty: "1",
              rate: String(rate),
              unit: p.unit ?? "pcs",
              productId: p.id,
              hsnCode: p.hsnCode,
              discount: "",
              amount: computeAmount(String(rate), "1", ""),
            },
          ],
        },
      });
    },
    [getEffectivePrice, items, formDispatch],
  );

  // ── Draft auto-save (2 s debounce) ───────────────────────────────────────
  useEffect(() => {
    if (validItemCount === 0 && !selectedCustomer) return;
    const t = setTimeout(() => {
      storage.set(
        INVOICE_DRAFT_KEY,
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
    const raw = storage.getString(INVOICE_DRAFT_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (!Array.isArray(d.items) || !d.items.length || !d.savedAt) return;
      if (isDraftExpired(Number(d.savedAt))) {
        storage.delete(INVOICE_DRAFT_KEY);
        return;
      }
      draftRestoredRef.current = true;
      const restored = (d.items as BillingItem[]).map((it) => ({
        ...it,
        id: _id++,
      }));
      loadDraft({
        items: restored,
        ...(d.withGst !== undefined ? { withGst: Boolean(d.withGst) } : {}),
        ...(d.discountPct ? { discountPct: String(d.discountPct) } : {}),
        ...(d.discountFlat ? { discountFlat: String(d.discountFlat) } : {}),
        ...(d.paymentMode ? { paymentMode: d.paymentMode as PaymentMode } : {}),
        ...(d.paymentAmount ? { paymentAmount: String(d.paymentAmount) } : {}),
        ...(d.splitEnabled ? { splitEnabled: Boolean(d.splitEnabled) } : {}),
        ...(d.notes ? { notes: String(d.notes) } : {}),
        ...(d.dueDate ? { dueDate: String(d.dueDate) } : {}),
        ...(d.customerName
          ? {
              selectedCustomer: {
                id: String(d.customerId ?? ""),
                tenantId: "",
                name: String(d.customerName),
                phone: d.customerPhone ? String(d.customerPhone) : undefined,
                balance: 0,
                totalPurchases: 0,
                totalPayments: 0,
                createdAt: "",
                updatedAt: "",
              },
            }
          : {}),
        draftBanner: true,
      });
    } catch {
      storage.delete(INVOICE_DRAFT_KEY);
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
        onSuccess: (c) => setCustomer(c),
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
      setCustomer(c);
      setCustomerQuery("");
      toggleNewCustModal(false);
      setNewCustName("");
      setNewCustPhone("");
      void qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: Error) => showAlert("Error", err.message),
  });

  const buildPayload = useCallback(
    (vars: {
      customerId: string;
      notesWithDue: string;
    }): CreateInvoicePayload => ({
      customerId: vars.customerId,
      items: validItems.map((it) => ({
        productName: it.name.trim(),
        quantity: Math.max(1, Math.round(parseFloat(it.qty) || 1)),
        unitPrice: parseFloat(it.rate) > 0 ? parseFloat(it.rate) : undefined,
        lineDiscountPercent:
          parseFloat(it.discount) > 0 ? parseFloat(it.discount) : undefined,
        ...(it.hsnCode && { hsnCode: it.hsnCode }),
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
            method: (primary === "credit" ? "other" : primary) as
              | "cash"
              | "upi"
              | "card"
              | "other",
          };
        }
        return parseFloat(paymentAmount) > 0
          ? {
              amount: parseFloat(paymentAmount),
              method: (paymentMode === "credit" ? "other" : paymentMode) as
                | "cash"
                | "upi"
                | "card"
                | "other",
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
    ],
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
        const id = enqueueInvoice(
          payload,
          vars.displayTotal,
          vars.notesWithDue,
        );
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
      storage.delete(INVOICE_DRAFT_KEY);
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
      showAlert("Error creating invoice", err.message);
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
      effectiveDueDate
        ? `Due: ${new Date(effectiveDueDate).toLocaleDateString("en-IN")}`
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

  const discardDraft = useCallback(() => {
    formReset();
    storage.delete(INVOICE_DRAFT_KEY);
  }, [formReset]);

  const resetForm = useCallback(() => {
    setSavedInvoice(null);
    formReset();
    storage.delete(INVOICE_DRAFT_KEY);
  }, [formReset]);

  const handlePrintReceipt = useCallback(async () => {
    if (!savedInvoice) return;
    const receiptData: ReceiptData = {
      shopName: "My Shop",
      invoiceNo: savedInvoice.no,
      date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
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
        ? splits
            .filter((s) => parseFloat(s.amount) > 0)
            .map((s) => ({ mode: s.mode, amount: parseFloat(s.amount) }))
        : parseFloat(paymentAmount) > 0
          ? [{ mode: paymentMode, amount: parseFloat(paymentAmount) }]
          : [{ mode: "cash", amount: finalTotal }],
      notes:
        [
          notes.trim(),
          computedDueDate || dueDate
            ? `Due: ${new Date(computedDueDate || dueDate).toLocaleDateString("en-IN")}`
            : "",
        ]
          .filter(Boolean)
          .join(" ") || undefined,
    };
    try {
      await printReceipt(receiptData);
    } catch (e) {
      showAlert("Print", (e as Error).message ?? "Could not print receipt");
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

  const handleCompositionSchemeChange = useCallback((v: boolean) => {
    setCompositionScheme(v);
    const stored = readBizProfile();
    stored.compositionScheme = v;
    storage.set(BIZ_STORAGE_KEY, JSON.stringify(stored));
  }, []);

  const handleRoundOffChange = useCallback(
    (v: boolean) => {
      setRoundOff(v);
      const stored = readBizProfile();
      stored.roundOff = v;
      storage.set(BIZ_STORAGE_KEY, JSON.stringify(stored));
    },
    [setRoundOff],
  );

  const handleNavigateSettings = useCallback(() => {
    toggleBillingSetup(false);
    (navigation as any).getParent()?.navigate("Settings");
  }, [navigation, toggleBillingSetup]);

  const handlePriceTierChange = useCallback(
    (idx: number) => {
      const next = priceTierIdx === idx ? null : idx;
      setPriceTierIdx(next);
      storage.set(PRICE_TIER_KEY, String(next ?? -1));
    },
    [priceTierIdx],
  );

  const handleInvoiceBarEdit = useCallback(() => {
    toggleInvoiceBarEdit(true);
  }, [toggleInvoiceBarEdit]);

  const handleInvoiceBarSave = useCallback(() => {
    saveInvoiceBar();
    toggleInvoiceBarEdit(false);
    if (documentTitle === "billOfSupply") {
      setWithGst(false);
    }
  }, [documentTitle, toggleInvoiceBarEdit, setWithGst]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={60}
      >
        <View style={{ flex: 1, width: "100%", alignItems: "center" }}>
          <View style={{ width: "100%", maxWidth: contentWidth, flex: 1 }}>
            <ScrollView
              style={{ flex: 1, paddingHorizontal: contentPad }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 120, paddingTop: 4 }}
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

              {/* ── Billing setup (collapsible) ───────────────────────────── */}
              <TouchableOpacity
                onPress={() => toggleBillingSetup(!billingSetupExpanded)}
                activeOpacity={0.7}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-2"
              >
                <View className="flex-row items-center justify-between px-3 py-2.5">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons
                      name="settings-outline"
                      size={14}
                      color="#64748b"
                    />
                    <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Billing setup
                    </Text>
                  </View>
                  <Text
                    className="text-[11px] text-slate-500 truncate max-w-[45%]"
                    numberOfLines={1}
                  >
                    {shopName || supplierGstin
                      ? `${shopName}${supplierGstin ? ` · ${supplierGstin}` : ""}`
                      : "Configure in Settings"}
                  </Text>
                  <Ionicons
                    name={billingSetupExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#94a3b8"
                  />
                </View>
                {billingSetupExpanded && (
                  <View className="border-t border-slate-100 px-3 py-3 gap-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-slate-800">
                        Composition scheme
                      </Text>
                      <Switch
                        value={compositionScheme}
                        onValueChange={handleCompositionSchemeChange}
                        trackColor={{ false: "#e2e8f0", true: "#818cf8" }}
                        thumbColor={compositionScheme ? "#e67e22" : "#f4f4f5"}
                      />
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-slate-800">
                        Round off total
                      </Text>
                      <Switch
                        value={roundOffEnabled}
                        onValueChange={handleRoundOffChange}
                        trackColor={{ false: "#e2e8f0", true: "#818cf8" }}
                        thumbColor={roundOffEnabled ? "#e67e22" : "#f4f4f5"}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={handleNavigateSettings}
                      className="flex-row items-center gap-2 py-2"
                    >
                      <Ionicons
                        name="settings-outline"
                        size={16}
                        color="#e67e22"
                      />
                      <Text className="text-sm font-medium text-primary">
                        Billing settings (GSTIN, address, bank…)
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>

              {/* ── Invoice Style (collapsible) ───────────────────────────── */}
              <TouchableOpacity
                onPress={() => toggleInvoiceStyle(!invoiceStyleExpanded)}
                activeOpacity={0.7}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-2"
              >
                <View className="flex-row items-center justify-between px-3 py-2.5">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons
                      name="document-text-outline"
                      size={14}
                      color="#64748b"
                    />
                    <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      My Store Invoice Style
                    </Text>
                  </View>
                  <Text className="text-[11px] text-slate-500 truncate max-w-[45%]">
                    {TEMPLATES.find((t) => t.id === invoiceTemplate)?.label ??
                      "Classic"}
                  </Text>
                  <Ionicons
                    name={invoiceStyleExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#94a3b8"
                  />
                </View>
                {invoiceStyleExpanded && (
                  <View className="border-t border-slate-100 px-3 py-3">
                    <Text className="text-[11px] text-slate-500 mb-2">
                      Tap to change — applies to all bills
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="-mx-1"
                    >
                      <View className="flex-row gap-2 pb-1">
                        {TEMPLATES.map((t) => (
                          <TemplateThumbnail
                            key={t.id}
                            template={t}
                            selected={invoiceTemplate === t.id}
                            onPress={() => handleTemplateChange(t.id)}
                          />
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </TouchableOpacity>

              {/* ── Invoice Bar (Indian standard — tap to edit) ───────────── */}
              <TouchableOpacity
                onPress={handleInvoiceBarEdit}
                activeOpacity={0.7}
                className="flex-row items-center rounded-xl border-2 border-slate-200 bg-white px-4 py-3 mb-3"
              >
                <View className="flex-1">
                  <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                    <View>
                      <Text className="text-[10px] font-semibold text-slate-500 uppercase">
                        {documentTitle === "billOfSupply"
                          ? "Bill of Supply"
                          : "Invoice"}{" "}
                        #
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
                          ? new Date(computedDueDate).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "—"}
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="pencil" size={18} color="#94a3b8" />
              </TouchableOpacity>

              {/* ── Customer ─────────────────────────────────────────────── */}
              <CustomerSection
                selectedCustomer={selectedCustomer}
                customerQuery={customerQuery}
                showCustSuggest={showCustSuggest}
                searchingCustomers={searchingCustomers}
                customerSuggestions={customerSuggestions}
                outstandingBalance={outstandingBalance}
                createWalkInPending={createWalkIn.isPending}
                inr={inr}
                onCreateWalkIn={() =>
                  createWalkIn.mutate(undefined, {
                    onSuccess: (c) => setCustomer(c),
                  })
                }
                onChangeCustomer={() => {
                  setCustomer(null);
                  setCustomerQuery("");
                }}
                onCustomerQueryChange={(t) => {
                  setCustomerQuery(t);
                  setCustSuggest(true);
                }}
                onCustomerInputFocus={() => setCustSuggest(true)}
                onCustomerInputBlur={() =>
                  setTimeout(() => setCustSuggest(false), 150)
                }
                onSelectSuggestion={(c) => {
                  setCustomer(c);
                  setCustomerQuery("");
                  setCustSuggest(false);
                }}
                onAddNewCustomer={(name) => {
                  setNewCustName(name);
                  toggleNewCustModal(true);
                  setCustSuggest(false);
                }}
              />

              {/* ── Items ────────────────────────────────────────────────── */}
              <ItemsSection
                priceTiers={PRICE_TIERS}
                priceTierIdx={priceTierIdx}
                items={items}
                catalog={catalog}
                getEffectivePrice={getEffectivePrice}
                onPriceTierChange={handlePriceTierChange}
                onUpdateItem={updateItem}
                onRemoveItem={removeItem}
                onOpenProductPicker={() => toggleProductPicker(true)}
                onAddItem={addItem}
              />

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
                      <Text className="font-bold text-slate-800">
                        Grand Total
                      </Text>
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
                        <Text className="text-xs text-slate-500">
                          Round off
                        </Text>
                        <Switch
                          value={roundOffEnabled}
                          onValueChange={handleRoundOffChange}
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
                        toggleSplit(v);
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
                              onPress={() => updateSplit(sp.id, { mode: id })}
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
                              updateSplit(sp.id, { amount: v })
                            }
                            keyboardType="decimal-pad"
                            placeholder="Amount"
                            placeholderTextColor="#94a3b8"
                            className="flex-1 h-10 text-sm text-slate-800"
                          />
                        </View>
                        {idx === splits.length - 1 &&
                          finalTotal -
                            splitTotal +
                            (parseFloat(sp.amount) || 0) >
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
                                updateSplit(sp.id, {
                                  amount: String(
                                    Math.max(0, Math.round(rest * 100) / 100),
                                  ),
                                });
                              }}
                              className="rounded-lg ml-2 px-2 py-1.5 bg-primary/10"
                            >
                              <Text className="text-xs font-semibold text-primary">
                                Fill ₹
                                {inr(
                                  finalTotal -
                                    splits
                                      .filter((x) => x.id !== sp.id)
                                      .reduce(
                                        (a, s) =>
                                          a + (parseFloat(s.amount) || 0),
                                        0,
                                      ),
                                )}
                              </Text>
                            </TouchableOpacity>
                          )}
                        <TouchableOpacity
                          onPress={() => removeSplit(sp.id)}
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
                            PAY_MODES.find((m) => !usedModes.includes(m.id))
                              ?.id ?? "cash";
                          const nextSplitId =
                            Math.max(0, ...splits.map((s) => s.id ?? 0)) + 1;
                          addSplit();
                          if (next !== "cash")
                            updateSplit(nextSplitId, { mode: next });
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
                  <Text className="text-slate-500 mr-2 text-sm">
                    📅 Due Date
                  </Text>
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
          </View>
        </View>
      </KeyboardAvoidingView>

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          right: 10,
          bottom: Math.max(12, insets.bottom + 10),
          zIndex: 50,
        }}
      >
        <TouchableOpacity
          testID="create-invoice-fab"
          accessibilityLabel="Create Invoice"
          onPress={() => void handleSubmit()}
          disabled={validItemCount === 0 || isSubmitting}
          className={`w-14 h-14 rounded-full items-center justify-center ${validItemCount > 0 && !isSubmitting ? "bg-primary" : "bg-slate-300"}`}
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 6,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="add" size={26} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Preview Modal (with template switching) ────────────────────── */}
      <Modal
        visible={showPreview}
        transparent
        animationType="slide"
        onRequestClose={() => togglePreview(false)}
      >
        <View className="flex-1 bg-black/40">
          <Pressable className="flex-1" onPress={() => togglePreview(false)} />
          <View className="bg-white rounded-t-3xl max-h-[90%]">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200">
              <Text className="text-lg font-bold text-slate-800">
                Invoice Preview —{" "}
                {TEMPLATES.find((t) => t.id === invoiceTemplate)?.label ??
                  "Classic"}
              </Text>
              <TouchableOpacity
                onPress={() => togglePreview(false)}
                className="p-2 -m-2"
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              className="py-2"
            >
              <View className="flex-row gap-2 px-4">
                {TEMPLATES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => handleTemplateChange(t.id)}
                    className={`rounded-full border px-3 py-1.5 ${invoiceTemplate === t.id ? "border-primary bg-primary" : "border-slate-300"}`}
                  >
                    <Text
                      className={`text-xs font-medium ${invoiceTemplate === t.id ? "text-white" : "text-slate-600"}`}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <InvoiceTemplatePreview
                template={invoiceTemplate}
                settings={(() => {
                  try {
                    const raw = storage.getString(DOC_SETTINGS_KEY);
                    if (!raw) return undefined;
                    const p = JSON.parse(raw) as Record<string, unknown>;
                    return {
                      themeColor:
                        typeof p.themeColor === "string"
                          ? p.themeColor
                          : undefined,
                      priceDecimals:
                        typeof p.priceDecimals === "number"
                          ? p.priceDecimals
                          : undefined,
                      showItemHsn:
                        typeof p.showItemHsn === "boolean"
                          ? p.showItemHsn
                          : undefined,
                      showCustomerAddress:
                        typeof p.showCustomerAddress === "boolean"
                          ? p.showCustomerAddress
                          : undefined,
                      showPaymentMode:
                        typeof p.showPaymentMode === "boolean"
                          ? p.showPaymentMode
                          : undefined,
                    };
                  } catch {
                    return undefined;
                  }
                })()}
                data={
                  {
                    invoiceNo: `${invoicePrefix}DRAFT`,
                    date: new Date(documentDate).toLocaleDateString("en-IN"),
                    shopName,
                    customerName: selectedCustomer?.name ?? "Walk-in Customer",
                    ...(supplierGstin && { supplierGstin }),
                    ...(supplierAddress && { supplierAddress }),
                    ...(selectedCustomer
                      ? (() => {
                          const c = selectedCustomer as Customer & {
                            addressLine1?: string;
                            addressLine2?: string;
                            city?: string;
                            state?: string;
                            pincode?: string;
                            gstin?: string;
                          };
                          const addr = [
                            c.addressLine1,
                            c.addressLine2,
                            c.city,
                            c.state,
                            c.pincode,
                          ]
                            .filter(Boolean)
                            .join(", ");
                          return {
                            ...(addr ? { recipientAddress: addr } : {}),
                            ...(c.gstin ? { gstin: c.gstin } : {}),
                          };
                        })()
                      : {}),
                    ...(compositionScheme && { compositionScheme: true }),
                    items: validItems.map((it) => ({
                      name: it.name.trim(),
                      qty: Math.max(1, parseFloat(it.qty) || 1),
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
                    total: finalTotal,
                    amountInWords: grandTotalWords,
                    notes: notes.trim() || undefined,
                  } as PreviewData
                }
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Invoice Bar Edit Modal ────────────────────────────────────── */}
      <Modal
        visible={showInvoiceBarEdit}
        transparent
        animationType="slide"
        onRequestClose={() => toggleInvoiceBarEdit(false)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => toggleInvoiceBarEdit(false)}
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
                onPress={() => toggleInvoiceBarEdit(false)}
                className="flex-1 h-12 items-center justify-center border border-slate-200 rounded-xl"
              >
                <Text className="text-sm font-semibold text-slate-600">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleInvoiceBarSave}
                className="flex-1 h-12 items-center justify-center bg-primary rounded-xl"
              >
                <Text className="text-white font-bold text-sm">Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Product Picker Modal (Browse from store) ───────────────────── */}
      <Modal
        visible={productPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => toggleProductPicker(false)}
      >
        <ProductPickerModal
          visible={productPickerOpen}
          onClose={() => toggleProductPicker(false)}
          catalog={catalog}
          getEffectivePrice={getEffectivePrice}
          onSelect={(p) => {
            addItemWithProduct(p);
            toggleProductPicker(false);
          }}
        />
      </Modal>

      {/* ── New Customer Modal ───────────────────────────────────────── */}
      <Modal
        visible={showNewCust}
        transparent
        animationType="slide"
        onRequestClose={() => toggleNewCustModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => toggleNewCustModal(false)}
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
              onPress={() => toggleNewCustModal(false)}
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
      <SuccessModal
        invoice={savedInvoice}
        customer={selectedCustomer}
        computedDueDate={computedDueDate}
        dueDate={dueDate}
        inr={inr}
        onPrint={() => void handlePrintReceipt()}
        onViewInvoice={() => {
          setSavedInvoice(null);
          navigation.navigate("Invoices" as never);
        }}
        onNewInvoice={resetForm}
      />
    </SafeAreaView>
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
