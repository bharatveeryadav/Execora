"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingScreen = BillingScreen;
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
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const shared_1 = require("@execora/shared");
const vector_icons_1 = require("@expo/vector-icons");
const api_1 = require("../lib/api");
const storage_1 = require("../lib/storage");
const BarcodeScanner_1 = require("../components/common/BarcodeScanner");
const printReceipt_1 = require("../lib/printReceipt");
const OfflineContext_1 = require("../contexts/OfflineContext");
const useResponsive_1 = require("../hooks/useResponsive");
const offlineQueue_1 = require("../lib/offlineQueue");
const haptics_1 = require("../lib/haptics");
const offlineQueue_2 = require("../lib/offlineQueue");
const useBillingForm_1 = require("../hooks/useBillingForm");
const InvoiceTemplatePreview_1 = require("../components/InvoiceTemplatePreview");
// ── ID counters ───────────────────────────────────────────────────────────────
// _id is used only to assign unique IDs to restored draft items.
// New items use the formReducer (max(id)+1). New splits use the formReducer too.
let _id = 1;
const DUE_DATE_PRESETS = [15, 30, 60];
// Modern icons (Ionicons) — matches web Lucide: Banknote, Smartphone, CreditCard, Wallet
const PAY_MODE_ICONS = {
    cash: "cash-outline",
    upi: "phone-portrait-outline",
    card: "card-outline",
    credit: "wallet-outline",
};
function readInvoiceBar() {
    try {
        const raw = storage_1.storage.getString(storage_1.INVOICE_BAR_KEY);
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
function persistInvoiceBar(data) {
    storage_1.storage.set(storage_1.INVOICE_BAR_KEY, JSON.stringify(data));
}
function BillingScreen({ navigation, route }) {
    const qc = (0, react_query_1.useQueryClient)();
    const { isOffline } = (0, OfflineContext_1.useOffline)();
    const { contentPad, contentWidth } = (0, useResponsive_1.useResponsive)();
    const insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    const startAsWalkIn = route.params?.startAsWalkIn;
    // ── Form state (useBillingForm) ────────────────────────────────────────────
    const initialRoundOffRef = (0, react_1.useRef)((() => {
        try {
            const raw = storage_1.storage.getString(storage_1.BIZ_STORAGE_KEY);
            const p = raw ? JSON.parse(raw) : {};
            return p.roundOff === true || p.roundOff === "true";
        }
        catch {
            return false;
        }
    })());
    const { state: { items, selectedCustomer, customerQuery, showCustSuggest, withGst, discountPct, discountFlat, roundOffEnabled, paymentMode, paymentAmount, splitEnabled, splits, notes, dueDate, draftBanner, activeRow, showNewCust, productPickerOpen, newCustName, newCustPhone, billingSetupExpanded, invoiceStyleExpanded, showInvoiceBarEdit, showPreview, }, dispatch: formDispatch, addItem: formAddItem, updateItem: formUpdateItem, removeItem: formRemoveItem, setCustomer, setCustomerQuery, setCustSuggest, setWithGst, setDiscountPct, setDiscountFlat, setRoundOff, setPaymentMode, setPaymentAmount, toggleSplit, addSplit, updateSplit, removeSplit, setNotes, setDueDate, setActiveRow, toggleNewCustModal, setNewCustName, setNewCustPhone, toggleProductPicker, toggleDraftBanner, toggleBillingSetup, toggleInvoiceStyle, toggleInvoiceBarEdit, togglePreview, resetForm: formReset, loadDraft, } = (0, useBillingForm_1.useBillingForm)({ roundOffEnabled: initialRoundOffRef.current });
    // Success modal state (not part of form state)
    const [savedInvoice, setSavedInvoice] = (0, react_1.useState)(null);
    const [invoiceTemplate, setInvoiceTemplate] = (0, react_1.useState)(() => {
        const t = storage_1.storage.getString(storage_1.INV_TEMPLATE_KEY);
        return t && InvoiceTemplatePreview_1.TEMPLATES.some((x) => x.id === t) ? t : "classic";
    });
    const [compositionScheme, setCompositionScheme] = (0, react_1.useState)(() => {
        try {
            const raw = storage_1.storage.getString(storage_1.BIZ_STORAGE_KEY);
            const p = raw ? JSON.parse(raw) : {};
            return p.compositionScheme === true || p.compositionScheme === "true";
        }
        catch {
            return false;
        }
    });
    function readBizProfile() {
        try {
            const raw = storage_1.storage.getString(storage_1.BIZ_STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        }
        catch {
            return {};
        }
    }
    function handleTemplateChange(t) {
        setInvoiceTemplate(t);
        storage_1.storage.set(storage_1.INV_TEMPLATE_KEY, t);
        const stored = readBizProfile();
        stored.invoiceTemplate = t;
        storage_1.storage.set(storage_1.BIZ_STORAGE_KEY, JSON.stringify(stored));
    }
    const { data: meData } = (0, react_query_1.useQuery)({
        queryKey: ["auth", "me"],
        queryFn: () => api_1.authApi.me(),
        staleTime: 5 * 60_000,
    });
    const meUser = meData?.user;
    const tenant = meUser?.tenant;
    const bizProfile = readBizProfile();
    const shopName = (bizProfile.legalName ?? tenant?.legalName ?? tenant?.name) ||
        "My Shop";
    const supplierGstin = (bizProfile.gstin ?? tenant?.gstin);
    const supplierAddressParts = [
        bizProfile.address,
        bizProfile.city,
        bizProfile.state,
        bizProfile.pincode,
    ].filter(Boolean);
    const supplierAddress = supplierAddressParts.length > 0
        ? supplierAddressParts.join(", ")
        : undefined;
    // ── Invoice bar (Indian standard) ───────────────────────────────────────
    // showInvoiceBarEdit is managed by useBillingForm (toggleInvoiceBarEdit)
    const [invoicePrefix, setInvoicePrefix] = (0, react_1.useState)(() => readInvoiceBar().invoicePrefix ?? "INV-");
    const [documentDate, setDocumentDate] = (0, react_1.useState)(() => {
        const today = new Date().toISOString().slice(0, 10);
        return readInvoiceBar().documentDate ?? today;
    });
    const [dueDateDays, setDueDateDays] = (0, react_1.useState)(() => {
        const v = readInvoiceBar().dueDateDays;
        return v === "custom" || (typeof v === "number" && [15, 30, 60].includes(v))
            ? v
            : 15;
    });
    const [customDueDays, setCustomDueDays] = (0, react_1.useState)(() => String(readInvoiceBar().customDueDays ?? 45));
    const [documentTitle, setDocumentTitle] = (0, react_1.useState)(() => {
        const v = readInvoiceBar().documentTitle;
        return v === "billOfSupply" ? "billOfSupply" : "invoice";
    });
    const [discountOnType, setDiscountOnType] = (0, react_1.useState)(() => {
        const v = readInvoiceBar().discountOnType;
        return [
            "unit_price",
            "price_with_tax",
            "net_amount",
            "total_amount",
        ].includes(v)
            ? v
            : "net_amount";
    });
    // S12-06: Price tier — Retail, Wholesale, Dealer
    const [priceTierIdx, setPriceTierIdx] = (0, react_1.useState)(() => {
        const v = parseInt(storage_1.storage.getString(storage_1.PRICE_TIER_KEY) ?? "-1", 10);
        return v >= 0 ? v : null;
    });
    const PRICE_TIERS = [
        { name: "Retail", key: 0 },
        { name: "Wholesale", key: 1 },
        { name: "Dealer", key: 2 },
    ];
    const getEffectivePrice = (0, react_1.useCallback)((p) => {
        const base = parseFloat(String(p.price ?? 0));
        if (priceTierIdx === 1 && p.wholesalePrice != null)
            return parseFloat(String(p.wholesalePrice));
        if (priceTierIdx === 2 && p.priceTier2 != null)
            return parseFloat(String(p.priceTier2));
        if (priceTierIdx === 3 && p.priceTier3 != null)
            return parseFloat(String(p.priceTier3));
        return base;
    }, [priceTierIdx]);
    const computedDueDate = (0, react_1.useMemo)(() => {
        const base = new Date(documentDate);
        const days = dueDateDays === "custom" ? parseInt(customDueDays, 10) || 0 : dueDateDays;
        if (days <= 0)
            return "";
        base.setDate(base.getDate() + days);
        return base.toISOString().slice(0, 10);
    }, [documentDate, dueDateDays, customDueDays]);
    const saveInvoiceBar = (0, react_1.useCallback)(() => {
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
    const { data: catalogData } = (0, react_query_1.useQuery)({
        queryKey: ["products-catalog"],
        queryFn: () => api_1.productApi.list(1, 200),
        staleTime: 5 * 60_000,
    });
    const catalog = catalogData?.products ?? [];
    (0, react_1.useEffect)(() => {
        if (catalogData?.products?.length)
            (0, offlineQueue_2.cacheProducts)(catalogData.products);
    }, [catalogData?.products]);
    // ── Customer search with debounce ────────────────────────────────────────
    const debouncedCustomerQuery = (0, react_1.useMemo)(() => customerQuery, [customerQuery]);
    const { data: custData, isFetching: searchingCustomers } = (0, react_query_1.useQuery)({
        queryKey: ["customers-search", debouncedCustomerQuery],
        queryFn: () => api_1.customerApi.search(debouncedCustomerQuery),
        enabled: debouncedCustomerQuery.length >= 1 && !selectedCustomer,
        staleTime: 5000,
    });
    const customerSuggestions = custData?.customers ?? [];
    // ── Totals ────────────────────────────────────────────────────────────────
    const validItems = (0, react_1.useMemo)(() => items.filter((it) => it.name.trim()), [items]);
    const validItemCount = (0, react_1.useMemo)(() => validItems.length, [validItems]);
    const totals = (0, react_1.useMemo)(() => (0, shared_1.computeTotals)(items, discountPct, discountFlat, withGst, roundOffEnabled), [items, discountPct, discountFlat, withGst, roundOffEnabled]);
    const { subtotal, discountAmt, taxableAmt, cgst, sgst, grandTotal, roundOff, finalTotal, } = totals;
    const grandTotalWords = (0, react_1.useMemo)(() => (0, shared_1.amountInWords)(finalTotal), [finalTotal]);
    const splitTotal = (0, react_1.useMemo)(() => splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0), [splits]);
    const outstandingBalance = (0, react_1.useMemo)(() => parseFloat(String(selectedCustomer?.balance ?? 0)) || 0, [selectedCustomer?.balance]);
    // ── Logo for header (document icon) ───────────────────────────────────────
    const settings = tenant?.settings ?? {};
    const logoObjectKey = (settings.logoObjectKey ??
        bizProfile.logoObjectKey);
    const [logoDataUrl, setLogoDataUrl] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (!logoObjectKey) {
            setLogoDataUrl(null);
            return;
        }
        const token = storage_1.tokenStorage.getToken();
        if (!token)
            return;
        let cancelled = false;
        fetch(`${(0, api_1.getApiBaseUrl)()}/api/v1/tenant/logo`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => (res.ok ? res.arrayBuffer() : null))
            .then((arrayBuffer) => {
            if (cancelled || !arrayBuffer)
                return;
            try {
                const bytes = new Uint8Array(arrayBuffer);
                let binary = "";
                for (let i = 0; i < bytes.length; i++)
                    binary += String.fromCharCode(bytes[i]);
                const base64 = btoa(binary);
                if (!cancelled)
                    setLogoDataUrl(`data:image/jpeg;base64,${base64}`);
            }
            catch {
                /* base64 conversion failed */
            }
        })
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, [logoObjectKey]);
    // ── Header: Logo (document icon) or ellipsis → Document Settings ───────────
    (0, react_1.useLayoutEffect)(() => {
        navigation.setOptions({
            headerRight: () => (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.getParent()?.navigate("DocumentSettings"), className: "p-2 -m-2", hitSlop: { top: 12, bottom: 12, left: 12, right: 12 }, accessibilityLabel: "Document Settings" }, logoDataUrl ? (react_1.default.createElement(react_native_1.Image, { source: { uri: logoDataUrl }, style: { width: 28, height: 28, borderRadius: 6 }, resizeMode: "cover" })) : (react_1.default.createElement(vector_icons_1.Ionicons, { name: "document-text-outline", size: 24, color: "#0f172a" })))),
        });
    }, [navigation, logoDataUrl]);
    // ── Item helpers ──────────────────────────────────────────────────────────
    // updateItem + removeItem come from useBillingForm (formUpdateItem, formRemoveItem)
    const updateItem = formUpdateItem;
    const removeItem = formRemoveItem;
    const addItem = (0, react_1.useCallback)(() => {
        (0, haptics_1.hapticLight)();
        formAddItem();
    }, [formAddItem]);
    const addItemWithProduct = (0, react_1.useCallback)((p) => {
        (0, haptics_1.hapticLight)();
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
                        amount: (0, shared_1.computeAmount)(String(rate), "1", ""),
                    },
                ],
            },
        });
    }, [getEffectivePrice, items, formDispatch]);
    // ── Draft auto-save (2 s debounce) ───────────────────────────────────────
    (0, react_1.useEffect)(() => {
        if (validItemCount === 0 && !selectedCustomer)
            return;
        const t = setTimeout(() => {
            storage_1.storage.set(storage_1.DRAFT_KEY, JSON.stringify({
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
            }));
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
    const draftRestoredRef = (0, react_1.useRef)(false);
    // ── Draft restore on mount ────────────────────────────────────────────────
    (0, react_1.useEffect)(() => {
        const raw = storage_1.storage.getString(storage_1.DRAFT_KEY);
        if (!raw)
            return;
        try {
            const d = JSON.parse(raw);
            if (!Array.isArray(d.items) || !d.items.length || !d.savedAt)
                return;
            if ((0, shared_1.isDraftExpired)(Number(d.savedAt))) {
                storage_1.storage.delete(storage_1.DRAFT_KEY);
                return;
            }
            draftRestoredRef.current = true;
            const restored = d.items.map((it) => ({
                ...it,
                id: _id++,
            }));
            loadDraft({
                items: restored,
                ...(d.withGst !== undefined ? { withGst: Boolean(d.withGst) } : {}),
                ...(d.discountPct ? { discountPct: String(d.discountPct) } : {}),
                ...(d.discountFlat ? { discountFlat: String(d.discountFlat) } : {}),
                ...(d.paymentMode
                    ? { paymentMode: d.paymentMode }
                    : {}),
                ...(d.paymentAmount
                    ? { paymentAmount: String(d.paymentAmount) }
                    : {}),
                ...(d.splitEnabled
                    ? { splitEnabled: Boolean(d.splitEnabled) }
                    : {}),
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
        }
        catch {
            storage_1.storage.delete(storage_1.DRAFT_KEY);
        }
    }, []);
    // ── Mutations ─────────────────────────────────────────────────────────────
    const createWalkIn = (0, react_query_1.useMutation)({
        mutationFn: async () => {
            const { customers } = await api_1.customerApi.search("Walk-in", 5);
            const existing = customers.find((c) => /walk\s*-?\s*in/i.test(c.name));
            if (existing)
                return existing;
            const res = await api_1.customerApi.create({ name: "Walk-in Customer" });
            return res.customer;
        },
    });
    // ── Auto-select Walk-in when opened as Quick Sale ──────────────────────────
    (0, react_1.useEffect)(() => {
        if (startAsWalkIn && !draftRestoredRef.current) {
            createWalkIn.mutate(undefined, {
                onSuccess: (c) => setCustomer(c),
            });
        }
    }, [startAsWalkIn]); // eslint-disable-line react-hooks/exhaustive-deps
    const createCustomerInline = (0, react_query_1.useMutation)({
        mutationFn: async () => api_1.customerApi.create({
            name: newCustName.trim(),
            phone: newCustPhone.trim() || undefined,
        }),
        onSuccess: (data) => {
            const c = data.customer;
            setCustomer(c);
            setCustomerQuery("");
            toggleNewCustModal(false);
            setNewCustName("");
            setNewCustPhone("");
            void qc.invalidateQueries({ queryKey: ["customers"] });
        },
        onError: (err) => (0, alerts_1.showAlert)("Error", err.message),
    });
    const buildPayload = (0, react_1.useCallback)((vars) => ({
        customerId: vars.customerId,
        items: validItems.map((it) => ({
            productName: it.name.trim(),
            quantity: Math.max(1, Math.round(parseFloat(it.qty) || 1)),
            unitPrice: parseFloat(it.rate) > 0 ? parseFloat(it.rate) : undefined,
            lineDiscountPercent: parseFloat(it.discount) > 0 ? parseFloat(it.discount) : undefined,
            ...(it.hsnCode && { hsnCode: it.hsnCode }),
        })),
        notes: vars.notesWithDue || undefined,
        withGst: withGst || undefined,
        discountPercent: parseFloat(discountPct) > 0 ? parseFloat(discountPct) : undefined,
        discountAmount: !discountPct && parseFloat(discountFlat) > 0
            ? parseFloat(discountFlat)
            : undefined,
        initialPayment: (() => {
            if (splitEnabled) {
                if (splitTotal <= 0)
                    return undefined;
                const primary = splits[0]?.mode ?? "cash";
                return {
                    amount: splitTotal,
                    method: (primary === "credit" ? "other" : primary),
                };
            }
            return parseFloat(paymentAmount) > 0
                ? {
                    amount: parseFloat(paymentAmount),
                    method: (paymentMode === "credit" ? "other" : paymentMode),
                }
                : undefined;
        })(),
    }), [
        validItems,
        withGst,
        discountPct,
        discountFlat,
        splitEnabled,
        splits,
        paymentMode,
        paymentAmount,
    ]);
    const createInvoice = (0, react_query_1.useMutation)({
        mutationFn: async (vars) => {
            if (!validItems.length)
                throw new Error("No items added");
            if (isOffline) {
                const payload = buildPayload(vars);
                const id = (0, offlineQueue_1.enqueueInvoice)(payload, vars.displayTotal, vars.notesWithDue);
                return {
                    invoice: {
                        id,
                        invoiceNo: `OFFLINE-${Date.now().toString(36).toUpperCase()}`,
                    },
                };
            }
            return api_1.invoiceApi.create(buildPayload(vars));
        },
        onSuccess: (data, vars) => {
            (0, haptics_1.hapticSuccess)();
            void qc.invalidateQueries({ queryKey: ["invoices"] });
            void qc.invalidateQueries({ queryKey: ["customers"] });
            storage_1.storage.delete(storage_1.DRAFT_KEY);
            const fromOffline = data.invoice.id.startsWith("offline-");
            setSavedInvoice({
                id: data.invoice.id,
                no: data.invoice.invoiceNo ??
                    data.invoice.id.slice(-8).toUpperCase(),
                total: vars.displayTotal,
                fromOffline,
            });
        },
        onError: (err) => {
            (0, haptics_1.hapticError)();
            (0, alerts_1.showAlert)("Error creating invoice", err.message);
        },
    });
    const handleSubmit = async () => {
        if (validItemCount === 0)
            return;
        let customerId = selectedCustomer?.id;
        if (!customerId) {
            if (isOffline) {
                customerId = "offline-walkin";
            }
            else {
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
    const discardDraft = (0, react_1.useCallback)(() => {
        formReset();
        storage_1.storage.delete(storage_1.DRAFT_KEY);
    }, [formReset]);
    const resetForm = (0, react_1.useCallback)(() => {
        setSavedInvoice(null);
        formReset();
        storage_1.storage.delete(storage_1.DRAFT_KEY);
    }, [formReset]);
    const handlePrintReceipt = (0, react_1.useCallback)(async () => {
        if (!savedInvoice)
            return;
        const receiptData = {
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
                amount: (0, shared_1.computeAmount)(it.rate, it.qty, it.discount),
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
            notes: [
                notes.trim(),
                computedDueDate || dueDate
                    ? `Due: ${new Date(computedDueDate || dueDate).toLocaleDateString("en-IN")}`
                    : "",
            ]
                .filter(Boolean)
                .join(" ") || undefined,
        };
        try {
            await (0, printReceipt_1.printReceipt)(receiptData);
        }
        catch (e) {
            (0, alerts_1.showAlert)("Print", e.message ?? "Could not print receipt");
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
    const handleCompositionSchemeChange = (0, react_1.useCallback)((v) => {
        setCompositionScheme(v);
        const stored = readBizProfile();
        stored.compositionScheme = v;
        storage_1.storage.set(storage_1.BIZ_STORAGE_KEY, JSON.stringify(stored));
    }, []);
    const handleRoundOffChange = (0, react_1.useCallback)((v) => {
        setRoundOff(v);
        const stored = readBizProfile();
        stored.roundOff = v;
        storage_1.storage.set(storage_1.BIZ_STORAGE_KEY, JSON.stringify(stored));
    }, [setRoundOff]);
    const handleNavigateSettings = (0, react_1.useCallback)(() => {
        toggleBillingSetup(false);
        navigation.getParent()?.navigate("Settings");
    }, [navigation, toggleBillingSetup]);
    const handlePriceTierChange = (0, react_1.useCallback)((idx) => {
        const next = priceTierIdx === idx ? null : idx;
        setPriceTierIdx(next);
        storage_1.storage.set(storage_1.PRICE_TIER_KEY, String(next ?? -1));
    }, [priceTierIdx]);
    const handleInvoiceBarEdit = (0, react_1.useCallback)(() => {
        toggleInvoiceBarEdit(true);
    }, [toggleInvoiceBarEdit]);
    const handleInvoiceBarSave = (0, react_1.useCallback)(() => {
        saveInvoiceBar();
        toggleInvoiceBarEdit(false);
        if (documentTitle === "billOfSupply") {
            setWithGst(false);
        }
    }, [documentTitle, toggleInvoiceBarEdit, setWithGst]);
    // ── Render ────────────────────────────────────────────────────────────────
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white", edges: ["bottom"] },
        react_1.default.createElement(react_native_1.KeyboardAvoidingView, { className: "flex-1", behavior: react_native_1.Platform.OS === "ios" ? "padding" : "height", keyboardVerticalOffset: 60 },
            react_1.default.createElement(react_native_1.View, { style: { flex: 1, width: "100%", alignItems: "center" } },
                react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth, flex: 1 } },
                    react_1.default.createElement(react_native_1.ScrollView, { style: { flex: 1, paddingHorizontal: contentPad }, keyboardShouldPersistTaps: "handled", contentContainerStyle: { paddingBottom: 120, paddingTop: 4 } },
                        draftBanner && (react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 mt-3 mb-1" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-amber-700 text-xs font-semibold flex-1" }, "\u21BA Draft restored from last session"),
                            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: discardDraft, className: "ml-3" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-amber-600 text-xs font-bold underline" }, "Discard")))),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => toggleBillingSetup(!billingSetupExpanded), activeOpacity: 0.7, className: "rounded-xl border border-slate-200 bg-white overflow-hidden mb-2" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between px-3 py-2.5" },
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1.5" },
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "settings-outline", size: 14, color: "#64748b" }),
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider" }, "Billing setup")),
                                react_1.default.createElement(react_native_1.Text, { className: "text-[11px] text-slate-500 truncate max-w-[45%]", numberOfLines: 1 }, shopName || supplierGstin
                                    ? `${shopName}${supplierGstin ? ` · ${supplierGstin}` : ""}`
                                    : "Configure in Settings"),
                                react_1.default.createElement(vector_icons_1.Ionicons, { name: billingSetupExpanded ? "chevron-up" : "chevron-down", size: 16, color: "#94a3b8" })),
                            billingSetupExpanded && (react_1.default.createElement(react_native_1.View, { className: "border-t border-slate-100 px-3 py-3 gap-3" },
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-800" }, "Composition scheme"),
                                    react_1.default.createElement(react_native_1.Switch, { value: compositionScheme, onValueChange: handleCompositionSchemeChange, trackColor: { false: "#e2e8f0", true: "#818cf8" }, thumbColor: compositionScheme ? "#e67e22" : "#f4f4f5" })),
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-800" }, "Round off total"),
                                    react_1.default.createElement(react_native_1.Switch, { value: roundOffEnabled, onValueChange: handleRoundOffChange, trackColor: { false: "#e2e8f0", true: "#818cf8" }, thumbColor: roundOffEnabled ? "#e67e22" : "#f4f4f5" })),
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleNavigateSettings, className: "flex-row items-center gap-2 py-2" },
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "settings-outline", size: 16, color: "#e67e22" }),
                                    react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-primary" }, "Billing settings (GSTIN, address, bank\u2026)"))))),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => toggleInvoiceStyle(!invoiceStyleExpanded), activeOpacity: 0.7, className: "rounded-xl border border-slate-200 bg-white overflow-hidden mb-2" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between px-3 py-2.5" },
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1.5" },
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "document-text-outline", size: 14, color: "#64748b" }),
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider" }, "My Store Invoice Style")),
                                react_1.default.createElement(react_native_1.Text, { className: "text-[11px] text-slate-500 truncate max-w-[45%]" }, InvoiceTemplatePreview_1.TEMPLATES.find((t) => t.id === invoiceTemplate)?.label ??
                                    "Classic"),
                                react_1.default.createElement(vector_icons_1.Ionicons, { name: invoiceStyleExpanded ? "chevron-up" : "chevron-down", size: 16, color: "#94a3b8" })),
                            invoiceStyleExpanded && (react_1.default.createElement(react_native_1.View, { className: "border-t border-slate-100 px-3 py-3" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-[11px] text-slate-500 mb-2" }, "Tap to change \u2014 applies to all bills"),
                                react_1.default.createElement(react_native_1.ScrollView, { horizontal: true, showsHorizontalScrollIndicator: false, className: "-mx-1" },
                                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2 pb-1" }, InvoiceTemplatePreview_1.TEMPLATES.map((t) => (react_1.default.createElement(InvoiceTemplatePreview_1.TemplateThumbnail, { key: t.id, template: t, selected: invoiceTemplate === t.id, onPress: () => handleTemplateChange(t.id) })))))))),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleInvoiceBarEdit, activeOpacity: 0.7, className: "flex-row items-center rounded-xl border-2 border-slate-200 bg-white px-4 py-3 mb-3" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                                react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-x-4 gap-y-1" },
                                    react_1.default.createElement(react_native_1.View, null,
                                        react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-semibold text-slate-500 uppercase" },
                                            documentTitle === "billOfSupply"
                                                ? "Bill of Supply"
                                                : "Invoice",
                                            " ",
                                            "#"),
                                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-slate-800" },
                                            invoicePrefix,
                                            "DRAFT")),
                                    react_1.default.createElement(react_native_1.View, null,
                                        react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-semibold text-slate-500 uppercase" }, "Doc Date"),
                                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800" }, new Date(documentDate).toLocaleDateString("en-IN", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        }))),
                                    react_1.default.createElement(react_native_1.View, null,
                                        react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-semibold text-slate-500 uppercase" }, "Due"),
                                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800" }, computedDueDate
                                            ? new Date(computedDueDate).toLocaleDateString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })
                                            : "—")))),
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "pencil", size: 18, color: "#94a3b8" })),
                        react_1.default.createElement(react_native_1.View, { className: "mt-2 mb-2" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-1.5" },
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1.5" },
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "person-outline", size: 14, color: "#64748b" }),
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider" }, "Customer")),
                                !selectedCustomer && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => createWalkIn.mutate(undefined, {
                                        onSuccess: (c) => setCustomer(c),
                                    }), disabled: createWalkIn.isPending, className: "flex-row items-center gap-1 px-2 py-1 rounded-lg border border-primary/40 bg-primary/10" },
                                    createWalkIn.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: "#e67e22" })) : (react_1.default.createElement(vector_icons_1.Ionicons, { name: "cart-outline", size: 14, color: "#e67e22" })),
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-primary" }, "Walk-in")))),
                            selectedCustomer ? (react_1.default.createElement(react_native_1.View, { className: "flex-row items-center rounded-xl border border-primary/30 bg-primary/10 px-3 py-3" },
                                react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-slate-800" }, selectedCustomer.name),
                                    selectedCustomer.phone && (react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mt-0.5" }, selectedCustomer.phone)),
                                    outstandingBalance > 0 && (react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1 mt-0.5" },
                                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "warning-outline", size: 12, color: "#d97706" }),
                                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-amber-600" },
                                            "\u20B9",
                                            (0, shared_1.inr)(outstandingBalance),
                                            " outstanding"))),
                                    outstandingBalance < 0 && (react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1 mt-0.5" },
                                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "checkmark-circle-outline", size: 12, color: "#16a34a" }),
                                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-green-600" },
                                            "\u20B9",
                                            (0, shared_1.inr)(Math.abs(outstandingBalance)),
                                            " advance credit")))),
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                                        setCustomer(null);
                                        setCustomerQuery("");
                                    }, className: "border border-slate-300 rounded-lg px-3 py-2 ml-2" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 font-medium" }, "Change")))) : (react_1.default.createElement(react_native_1.View, null,
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center border border-slate-200 rounded-xl bg-white px-3" },
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "search", size: 18, color: "#94a3b8", style: { marginRight: 8 } }),
                                    react_1.default.createElement(react_native_1.TextInput, { value: customerQuery, onChangeText: (t) => {
                                            setCustomerQuery(t);
                                            setCustSuggest(true);
                                        }, onFocus: () => setCustSuggest(true), onBlur: () => setTimeout(() => setCustSuggest(false), 150), placeholder: "Search customer\u2026 (blank = Walk-in)", placeholderTextColor: "#94a3b8", className: "flex-1 h-12 text-sm text-slate-800" }),
                                    searchingCustomers && (react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: "#e67e22" }))),
                                showCustSuggest && customerQuery.length >= 1 && (react_1.default.createElement(react_native_1.View, { className: "border border-slate-200 rounded-xl mt-1 bg-white shadow-sm overflow-hidden" },
                                    customerSuggestions.map((c) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: c.id, onPress: () => {
                                            setCustomer(c);
                                            setCustomerQuery("");
                                            setCustSuggest(false);
                                        }, className: "flex-row items-center px-3 py-3 border-b border-slate-100 last:border-0" },
                                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800 flex-1" }, c.name),
                                        c.phone && (react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, c.phone))))),
                                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                                            setNewCustName(customerQuery.trim());
                                            toggleNewCustModal(true);
                                            setCustSuggest(false);
                                        }, className: "flex-row items-center px-3 py-3 border-t border-slate-100 bg-primary/10" },
                                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-primary font-semibold" },
                                            "\u2795 Add \"",
                                            customerQuery,
                                            "\" as new customer")))),
                                customerQuery.length === 0 && (react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 mt-1 pl-1" }, "Leave blank \u2192 Walk-in customer"))))),
                        react_1.default.createElement(react_native_1.View, { className: "mt-2 mb-2" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-1.5" },
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1.5" },
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "cube-outline", size: 14, color: "#64748b" }),
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider" }, "Items")),
                                react_1.default.createElement(react_native_1.View, { className: "flex-row gap-1" }, PRICE_TIERS.map((tier, idx) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: tier.key, onPress: () => handlePriceTierChange(idx), className: `rounded-full border px-2.5 py-1 text-xs font-medium ${priceTierIdx === idx
                                        ? "border-primary bg-primary"
                                        : "border-slate-300 bg-white"}` },
                                    react_1.default.createElement(react_native_1.Text, { className: priceTierIdx === idx
                                            ? "text-white"
                                            : "text-slate-600" }, tier.name)))))),
                            react_1.default.createElement(react_native_1.View, { className: "border border-slate-200 rounded-xl overflow-hidden" },
                                items.map((item, idx) => (react_1.default.createElement(MobileItemRow, { key: item.id, item: item, catalog: catalog, isFirst: idx === 0, getEffectivePrice: getEffectivePrice, onUpdate: (patch) => updateItem(item.id, patch), onRemove: () => removeItem(item.id) }))),
                                react_1.default.createElement(react_native_1.View, { className: "flex-row border-t border-slate-100" },
                                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => toggleProductPicker(true), className: "flex-1 flex-row items-center justify-center gap-2 px-3 py-2.5" },
                                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "storefront-outline", size: 18, color: "#e67e22" }),
                                        react_1.default.createElement(react_native_1.Text, { className: "text-primary text-sm font-semibold" }, "Browse products")),
                                    react_1.default.createElement(react_native_1.View, { className: "w-px bg-slate-200" }),
                                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: addItem, className: "flex-1 flex-row items-center justify-center gap-2 px-3 py-2.5" },
                                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "add-circle-outline", size: 18, color: "#e67e22" }),
                                        react_1.default.createElement(react_native_1.Text, { className: "text-primary text-sm font-semibold" }, "Type to add"))))),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between rounded-xl border border-slate-200 px-4 py-3 mb-2" },
                            react_1.default.createElement(react_native_1.View, null,
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-800" }, "Include GST"),
                                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mt-0.5" }, "Adds 18% GST (CGST+SGST)")),
                            react_1.default.createElement(react_native_1.Switch, { value: withGst, onValueChange: setWithGst, trackColor: { false: "#e2e8f0", true: "#818cf8" }, thumbColor: withGst ? "#e67e22" : "#f4f4f5" })),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3 mb-2" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1" }, "Bill Disc %"),
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center border border-slate-200 rounded-xl px-3 bg-white" },
                                    react_1.default.createElement(react_native_1.TextInput, { value: discountPct, onChangeText: (v) => {
                                            setDiscountPct(v);
                                            if (v)
                                                setDiscountFlat("");
                                        }, keyboardType: "decimal-pad", placeholder: "0", placeholderTextColor: "#94a3b8", className: "flex-1 h-12 text-base text-slate-800" }),
                                    react_1.default.createElement(react_native_1.Text, { className: "text-slate-400 text-sm" }, "%"))),
                            react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1" }, "Flat Disc \u20B9"),
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center border border-slate-200 rounded-xl px-3 bg-white" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-slate-400 text-sm mr-1" }, "\u20B9"),
                                    react_1.default.createElement(react_native_1.TextInput, { value: discountFlat, onChangeText: (v) => {
                                            setDiscountFlat(v);
                                            if (v)
                                                setDiscountPct("");
                                        }, keyboardType: "decimal-pad", placeholder: "0.00", placeholderTextColor: "#94a3b8", className: "flex-1 h-12 text-base text-slate-800" })))),
                        validItemCount > 0 && (react_1.default.createElement(react_native_1.View, { className: "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-2" },
                            react_1.default.createElement(TotalRow, { label: "Subtotal", value: `₹${(0, shared_1.inr)(subtotal)}` }),
                            discountAmt > 0 && (react_1.default.createElement(TotalRow, { label: "Discount", value: `−₹${(0, shared_1.inr)(discountAmt)}`, valueClass: "text-green-600 font-semibold" })),
                            withGst && (react_1.default.createElement(react_1.default.Fragment, null,
                                react_1.default.createElement(TotalRow, { label: "Taxable", value: `₹${(0, shared_1.inr)(taxableAmt)}` }),
                                react_1.default.createElement(TotalRow, { label: "CGST (9%)", value: `₹${(0, shared_1.inr)(cgst)}` }),
                                react_1.default.createElement(TotalRow, { label: "SGST (9%)", value: `₹${(0, shared_1.inr)(sgst)}` }))),
                            react_1.default.createElement(react_native_1.View, { className: "border-t border-slate-200 mt-2 pt-2" },
                                react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between items-center" },
                                    react_1.default.createElement(react_native_1.Text, { className: "font-bold text-slate-800" }, "Grand Total"),
                                    react_1.default.createElement(react_native_1.Text, { className: "font-black text-xl text-primary" },
                                        "\u20B9",
                                        (0, shared_1.inr)(finalTotal))),
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mt-2" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 italic flex-1 pr-2", numberOfLines: 2 }, grandTotalWords),
                                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, "Round off"),
                                        react_1.default.createElement(react_native_1.Switch, { value: roundOffEnabled, onValueChange: handleRoundOffChange, trackColor: { false: "#e2e8f0", true: "#818cf8" }, thumbColor: roundOffEnabled ? "#e67e22" : "#f4f4f5" }))),
                                roundOffEnabled && roundOff !== 0 && (react_1.default.createElement(react_native_1.Text, { className: "text-xs text-blue-600 mt-1" },
                                    roundOff > 0 ? "+" : "",
                                    (0, shared_1.inr)(roundOff),
                                    " rounded"))))),
                        react_1.default.createElement(react_native_1.View, { className: "mb-2" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-2" },
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1.5" },
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "card-outline", size: 14, color: "#64748b" }),
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider" }, "Payment")),
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, "Split"),
                                    react_1.default.createElement(react_native_1.Switch, { value: splitEnabled, onValueChange: (v) => {
                                            toggleSplit(v);
                                        }, trackColor: { false: "#e2e8f0", true: "#818cf8" }, thumbColor: splitEnabled ? "#e67e22" : "#f4f4f5" }))),
                            !splitEnabled ? (react_1.default.createElement(react_1.default.Fragment, null,
                                react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2 mb-2" }, shared_1.PAY_MODES.map(({ id, label }) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: id, onPress: () => setPaymentMode(id), className: `flex-1 items-center justify-center rounded-xl border-2 py-3 ${paymentMode === id ? "border-primary bg-primary/10" : "border-slate-200"}` },
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: PAY_MODE_ICONS[id], size: 28, color: paymentMode === id ? "#e67e22" : "#64748b" }),
                                    react_1.default.createElement(react_native_1.Text, { className: `text-xs font-semibold mt-0.5 ${paymentMode === id ? "text-primary" : "text-slate-500"}` }, label))))),
                                paymentMode !== "credit" && (react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                                    react_1.default.createElement(react_native_1.View, { className: "flex-row flex-1 items-center border border-slate-200 rounded-xl px-3 bg-white" },
                                        react_1.default.createElement(react_native_1.Text, { className: "text-slate-400 mr-1" }, "\u20B9"),
                                        react_1.default.createElement(react_native_1.TextInput, { value: paymentAmount, onChangeText: setPaymentAmount, keyboardType: "decimal-pad", placeholder: `Amount paid (₹${(0, shared_1.inr)(finalTotal)})`, placeholderTextColor: "#94a3b8", className: "flex-1 h-12 text-base text-slate-800" })),
                                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setPaymentAmount(String(finalTotal)), className: "border border-slate-200 rounded-xl px-4 h-12 items-center justify-center" },
                                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-700" }, "Full")))),
                                paymentMode === "credit" && (react_1.default.createElement(react_native_1.View, { className: "bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs text-amber-700" }, "Full amount added to customer credit account"))))) : (react_1.default.createElement(react_native_1.View, { className: "border-2 border-slate-200 rounded-xl overflow-hidden bg-white" },
                                react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 bg-slate-50" },
                                    react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between text-xs mb-2" },
                                        react_1.default.createElement(react_native_1.Text, { className: "text-slate-500" }, "Total"),
                                        react_1.default.createElement(react_native_1.Text, { className: "font-bold text-slate-800" },
                                            "\u20B9",
                                            (0, shared_1.inr)(finalTotal))),
                                    react_1.default.createElement(react_native_1.View, { className: "h-1.5 rounded-full bg-slate-200 overflow-hidden" },
                                        react_1.default.createElement(react_native_1.View, { className: "h-full rounded-full bg-primary", style: {
                                                width: `${Math.min(100, finalTotal > 0 ? (splitTotal / finalTotal) * 100 : 0)}%`,
                                            } })),
                                    react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between text-xs mt-1" },
                                        react_1.default.createElement(react_native_1.Text, { className: splitTotal >= finalTotal - 0.01
                                                ? "text-green-600 font-semibold"
                                                : "text-slate-500" }, Math.abs(finalTotal - splitTotal) < 0.01
                                            ? "✓ Settled"
                                            : `Paid ₹${(0, shared_1.inr)(splitTotal)}`),
                                        finalTotal - splitTotal > 0.001 && (react_1.default.createElement(react_native_1.Text, { className: "text-amber-600 font-semibold" },
                                            "\u20B9",
                                            (0, shared_1.inr)(finalTotal - splitTotal),
                                            " left")))),
                                splits.map((sp, idx) => (react_1.default.createElement(react_native_1.View, { key: sp.id, className: "flex-row items-center px-3 py-2 border-b border-slate-100" },
                                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-1 mr-2" }, shared_1.PAY_MODES.map(({ id }) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: id, onPress: () => updateSplit(sp.id, { mode: id }), className: `w-9 h-9 items-center justify-center rounded-lg border ${sp.mode === id ? "border-primary bg-primary/10" : "border-transparent"}` },
                                        react_1.default.createElement(vector_icons_1.Ionicons, { name: PAY_MODE_ICONS[id], size: 22, color: sp.mode === id ? "#e67e22" : "#64748b" }))))),
                                    react_1.default.createElement(react_native_1.View, { className: "flex-row flex-1 items-center border border-slate-200 rounded-xl px-2 bg-white" },
                                        react_1.default.createElement(react_native_1.Text, { className: "text-slate-400 text-xs mr-1" }, "\u20B9"),
                                        react_1.default.createElement(react_native_1.TextInput, { value: sp.amount, onChangeText: (v) => updateSplit(sp.id, { amount: v }), keyboardType: "decimal-pad", placeholder: "Amount", placeholderTextColor: "#94a3b8", className: "flex-1 h-10 text-sm text-slate-800" })),
                                    idx === splits.length - 1 &&
                                        finalTotal -
                                            splitTotal +
                                            (parseFloat(sp.amount) || 0) >
                                            0.001 && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                                            const rest = finalTotal -
                                                splits
                                                    .filter((s) => s.id !== sp.id)
                                                    .reduce((a, s) => a + (parseFloat(s.amount) || 0), 0);
                                            updateSplit(sp.id, {
                                                amount: String(Math.max(0, Math.round(rest * 100) / 100)),
                                            });
                                        }, className: "rounded-lg ml-2 px-2 py-1.5 bg-primary/10" },
                                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-primary" },
                                            "Fill \u20B9",
                                            (0, shared_1.inr)(finalTotal -
                                                splits
                                                    .filter((x) => x.id !== sp.id)
                                                    .reduce((a, s) => a + (parseFloat(s.amount) || 0), 0))))),
                                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => removeSplit(sp.id), className: "ml-2 w-9 h-9 items-center justify-center" },
                                        react_1.default.createElement(react_native_1.Text, { className: "text-red-400 text-lg" }, "\u00D7"))))),
                                splits.length < 4 && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                                        const usedModes = splits.map((s) => s.mode);
                                        const next = shared_1.PAY_MODES.find((m) => !usedModes.includes(m.id))
                                            ?.id ?? "cash";
                                        const nextSplitId = Math.max(0, ...splits.map((s) => s.id ?? 0)) + 1;
                                        addSplit();
                                        if (next !== "cash")
                                            updateSplit(nextSplitId, { mode: next });
                                    }, className: "flex-row items-center px-3 py-3" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-primary text-sm font-semibold" }, "\uFF0B Add payment method")))))),
                        react_1.default.createElement(react_native_1.View, { className: "mb-4" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5" }, "\uD83D\uDCDD Notes / Due Date"),
                            react_1.default.createElement(react_native_1.TextInput, { value: notes, onChangeText: setNotes, placeholder: "Special instructions, delivery address\u2026", placeholderTextColor: "#94a3b8", multiline: true, numberOfLines: 3, className: "border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 bg-white min-h-[72px]", style: { textAlignVertical: "top" } }),
                            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center border border-slate-200 rounded-xl px-3 py-2.5 mt-2 bg-white" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-slate-500 mr-2 text-sm" }, "\uD83D\uDCC5 Due Date"),
                                react_1.default.createElement(react_native_1.TextInput, { value: dueDate, onChangeText: setDueDate, placeholder: "DD/MM/YYYY or leave blank", placeholderTextColor: "#94a3b8", keyboardType: "numbers-and-punctuation", className: "flex-1 text-sm text-slate-800 h-9" }),
                                dueDate ? (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setDueDate(""), className: "w-8 h-8 items-center justify-center" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-slate-400 text-lg" }, "\u00D7"))) : null)))))),
        react_1.default.createElement(react_native_1.View, { pointerEvents: "box-none", style: {
                position: "absolute",
                right: 10,
                bottom: Math.max(12, insets.bottom + 10),
                zIndex: 50,
            } },
            react_1.default.createElement(react_native_1.TouchableOpacity, { testID: "create-invoice-fab", accessibilityLabel: "Create Invoice", onPress: () => void handleSubmit(), disabled: validItemCount === 0 || isSubmitting, className: `w-14 h-14 rounded-full items-center justify-center ${validItemCount > 0 && !isSubmitting ? "bg-primary" : "bg-slate-300"}`, style: {
                    shadowColor: "#000",
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 6,
                } }, isSubmitting ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff" })) : (react_1.default.createElement(vector_icons_1.Ionicons, { name: "add", size: 26, color: "#fff" })))),
        react_1.default.createElement(react_native_1.Modal, { visible: showPreview, transparent: true, animationType: "slide" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 bg-black/40" },
                react_1.default.createElement(react_native_1.Pressable, { className: "flex-1", onPress: () => togglePreview(false) }),
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-t-3xl max-h-[90%]" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between px-5 py-4 border-b border-slate-200" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800" },
                            "Invoice Preview \u2014",
                            " ",
                            InvoiceTemplatePreview_1.TEMPLATES.find((t) => t.id === invoiceTemplate)?.label ??
                                "Classic"),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => togglePreview(false), className: "p-2 -m-2" },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "close", size: 24, color: "#64748b" }))),
                    react_1.default.createElement(react_native_1.ScrollView, { horizontal: true, showsHorizontalScrollIndicator: true, className: "py-2" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2 px-4" }, InvoiceTemplatePreview_1.TEMPLATES.map((t) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: t.id, onPress: () => handleTemplateChange(t.id), className: `rounded-full border px-3 py-1.5 ${invoiceTemplate === t.id ? "border-primary bg-primary" : "border-slate-300"}` },
                            react_1.default.createElement(react_native_1.Text, { className: `text-xs font-medium ${invoiceTemplate === t.id ? "text-white" : "text-slate-600"}` }, t.label)))))),
                    react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1", showsVerticalScrollIndicator: false },
                        react_1.default.createElement(InvoiceTemplatePreview_1.InvoiceTemplatePreview, { template: invoiceTemplate, settings: (() => {
                                try {
                                    const raw = storage_1.storage.getString(storage_1.DOC_SETTINGS_KEY);
                                    if (!raw)
                                        return undefined;
                                    const p = JSON.parse(raw);
                                    return {
                                        themeColor: typeof p.themeColor === "string"
                                            ? p.themeColor
                                            : undefined,
                                        priceDecimals: typeof p.priceDecimals === "number"
                                            ? p.priceDecimals
                                            : undefined,
                                        showItemHsn: typeof p.showItemHsn === "boolean"
                                            ? p.showItemHsn
                                            : undefined,
                                        showCustomerAddress: typeof p.showCustomerAddress === "boolean"
                                            ? p.showCustomerAddress
                                            : undefined,
                                        showPaymentMode: typeof p.showPaymentMode === "boolean"
                                            ? p.showPaymentMode
                                            : undefined,
                                    };
                                }
                                catch {
                                    return undefined;
                                }
                            })(), data: {
                                invoiceNo: `${invoicePrefix}DRAFT`,
                                date: new Date(documentDate).toLocaleDateString("en-IN"),
                                shopName,
                                customerName: selectedCustomer?.name ?? "Walk-in Customer",
                                ...(supplierGstin && { supplierGstin }),
                                ...(supplierAddress && { supplierAddress }),
                                ...(selectedCustomer
                                    ? (() => {
                                        const c = selectedCustomer;
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
                            } }))))),
        react_1.default.createElement(react_native_1.Modal, { visible: showInvoiceBarEdit, transparent: true, animationType: "slide" },
            react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/40", onPress: () => toggleInvoiceBarEdit(false) }),
            react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-t-3xl px-5 pt-5 pb-8 max-h-[85%]" },
                react_1.default.createElement(react_native_1.ScrollView, { showsVerticalScrollIndicator: false },
                    react_1.default.createElement(react_native_1.Text, { className: "text-base font-bold text-slate-800 mb-4" }, "Invoice Details"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase mb-1" }, "Invoice Prefix"),
                    react_1.default.createElement(react_native_1.TextInput, { value: invoicePrefix, onChangeText: setInvoicePrefix, placeholder: "e.g. INV-, BOS-", placeholderTextColor: "#94a3b8", maxLength: 16, className: "border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3" }),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase mb-1" }, "Document Date"),
                    react_1.default.createElement(react_native_1.TextInput, { value: documentDate, onChangeText: setDocumentDate, placeholder: "YYYY-MM-DD", placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3" }),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase mb-2" }, "Due Date (days)"),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2 mb-2" },
                        DUE_DATE_PRESETS.map((d) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: d, onPress: () => setDueDateDays(d), className: `flex-1 py-2.5 rounded-xl border items-center ${dueDateDays === d
                                ? "border-primary bg-primary/10"
                                : "border-slate-200"}` },
                            react_1.default.createElement(react_native_1.Text, { className: `text-xs font-semibold ${dueDateDays === d ? "text-primary" : "text-slate-600"}` },
                                d,
                                " days")))),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setDueDateDays("custom"), className: `flex-1 py-2.5 rounded-xl border items-center ${dueDateDays === "custom"
                                ? "border-primary bg-primary/10"
                                : "border-slate-200"}` },
                            react_1.default.createElement(react_native_1.Text, { className: `text-xs font-semibold ${dueDateDays === "custom" ? "text-primary" : "text-slate-600"}` }, "Custom"))),
                    dueDateDays === "custom" && (react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2 mb-3" },
                        react_1.default.createElement(react_native_1.TextInput, { value: customDueDays, onChangeText: setCustomDueDays, keyboardType: "number-pad", className: "border border-slate-200 rounded-xl px-3 h-10 w-20 text-slate-800" }),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, "days"))),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase mb-2" }, "Document Title"),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-4 mb-3" },
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setDocumentTitle("invoice"), className: "flex-row items-center gap-2" },
                            react_1.default.createElement(react_native_1.View, { className: `w-5 h-5 rounded-full border-2 ${documentTitle === "invoice"
                                    ? "border-primary bg-primary"
                                    : "border-slate-300"}` }),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-800" }, "Invoice")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setDocumentTitle("billOfSupply"), className: "flex-row items-center gap-2" },
                            react_1.default.createElement(react_native_1.View, { className: `w-5 h-5 rounded-full border-2 ${documentTitle === "billOfSupply"
                                    ? "border-primary bg-primary"
                                    : "border-slate-300"}` }),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-800" }, "Bill of Supply"))),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase mb-1" }, "Discount on (base)"),
                    react_1.default.createElement(react_native_1.View, { className: "border border-slate-200 rounded-xl mb-4 overflow-hidden" }, [
                        { id: "unit_price", label: "Unit Price" },
                        { id: "price_with_tax", label: "Price with Tax" },
                        { id: "net_amount", label: "Net Amount" },
                        { id: "total_amount", label: "Total Amount" },
                    ].map(({ id, label }) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: id, onPress: () => setDiscountOnType(id), className: `flex-row items-center px-3 py-3 border-b border-slate-100 last:border-0 ${discountOnType === id ? "bg-primary/5" : ""}` },
                        react_1.default.createElement(react_native_1.View, { className: `w-4 h-4 rounded border-2 mr-2 ${discountOnType === id
                                ? "border-primary bg-primary"
                                : "border-slate-300"}` }),
                        react_1.default.createElement(react_native_1.Text, { className: discountOnType === id
                                ? "text-sm font-semibold text-primary"
                                : "text-sm text-slate-700" }, label))))),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3" },
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => toggleInvoiceBarEdit(false), className: "flex-1 h-12 items-center justify-center border border-slate-200 rounded-xl" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-600" }, "Cancel")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleInvoiceBarSave, className: "flex-1 h-12 items-center justify-center bg-primary rounded-xl" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-white font-bold text-sm" }, "Save")))))),
        react_1.default.createElement(react_native_1.Modal, { visible: productPickerOpen, transparent: true, animationType: "slide" },
            react_1.default.createElement(ProductPickerModal, { visible: productPickerOpen, onClose: () => toggleProductPicker(false), catalog: catalog, getEffectivePrice: getEffectivePrice, onSelect: (p) => {
                    addItemWithProduct(p);
                    toggleProductPicker(false);
                } })),
        react_1.default.createElement(react_native_1.Modal, { visible: showNewCust, transparent: true, animationType: "slide" },
            react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/40", onPress: () => toggleNewCustModal(false) }),
            react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-t-3xl px-5 pt-5 pb-8" },
                react_1.default.createElement(react_native_1.Text, { className: "text-base font-bold text-slate-800 mb-4" }, "\u2795 New Customer"),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1" }, "Name *"),
                react_1.default.createElement(react_native_1.TextInput, { value: newCustName, onChangeText: setNewCustName, placeholder: "Customer name", placeholderTextColor: "#94a3b8", autoFocus: true, className: "border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3" }),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1" }, "Phone (optional)"),
                react_1.default.createElement(react_native_1.TextInput, { value: newCustPhone, onChangeText: setNewCustPhone, placeholder: "10-digit mobile", placeholderTextColor: "#94a3b8", keyboardType: "phone-pad", maxLength: 15, className: "border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-4" }),
                react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3" },
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => toggleNewCustModal(false), className: "flex-1 h-12 items-center justify-center border border-slate-200 rounded-xl" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-600" }, "Cancel")),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => void createCustomerInline.mutateAsync(), disabled: !newCustName.trim() || createCustomerInline.isPending, className: `flex-1 h-12 items-center justify-center rounded-xl ${newCustName.trim() ? "bg-primary" : "bg-slate-300"}` }, createCustomerInline.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-white font-bold text-sm" }, "Save & Use")))))),
        react_1.default.createElement(react_native_1.Modal, { visible: !!savedInvoice, transparent: true, animationType: "fade" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 bg-black/50 items-center justify-center px-6" },
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-3xl w-full p-6" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-green-600 font-bold text-lg mb-3" },
                        "\u2705",
                        " ",
                        savedInvoice?.fromOffline
                            ? "Queued for Sync!"
                            : "Invoice Created!"),
                    savedInvoice?.fromOffline && (react_1.default.createElement(react_native_1.Text, { className: "text-amber-600 text-sm mb-2" }, "Will sync when you're back online")),
                    react_1.default.createElement(react_native_1.View, { className: "bg-slate-50 rounded-xl px-4 py-3 mb-4 space-y-2" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, "Invoice #"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-slate-800" }, savedInvoice?.no)),
                        selectedCustomer && (react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, "Customer"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800" }, selectedCustomer.name))),
                        (computedDueDate || dueDate) && (react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, "Due"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800" }, new Date(computedDueDate || dueDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })))),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between pt-2 border-t border-slate-200" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, "Amount"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-lg font-black text-primary" },
                                "\u20B9",
                                (0, shared_1.inr)(savedInvoice?.total ?? 0)))),
                    selectedCustomer?.phone && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                            if (!savedInvoice)
                                return;
                            const phone = selectedCustomer.phone.replace(/\D/g, "");
                            const effDue = computedDueDate || dueDate;
                            const msg = encodeURIComponent(`Invoice #${savedInvoice.no}\nAmount: ₹${(0, shared_1.inr)(savedInvoice.total)}\nFrom: My Shop${effDue ? `\nDue: ${new Date(effDue).toLocaleDateString("en-IN")}` : ""}`);
                            void react_native_1.Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
                        }, className: "flex-row items-center justify-center gap-2 bg-green-500 rounded-2xl h-12 mb-3" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-white text-2xl" }, "\uD83D\uDCAC"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold text-sm" }, "Share on WhatsApp"))),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => void handlePrintReceipt(), className: "flex-row items-center justify-center gap-2 bg-slate-700 rounded-2xl h-12 mb-3" },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "print-outline", size: 20, color: "#fff" }),
                        react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold text-sm" }, "Print Receipt")),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3" },
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                                setSavedInvoice(null);
                                navigation.navigate("Invoices");
                            }, className: "flex-1 h-12 items-center justify-center border border-slate-200 rounded-xl" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-700" }, "View Invoice")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: resetForm, className: "flex-1 h-12 items-center justify-center bg-primary rounded-xl" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-white font-bold text-sm" }, "New Invoice"))))))));
}
// ── Product Picker Modal (Browse products from store) ───────────────────────────
function ProductPickerModal({ visible, onClose, catalog, getEffectivePrice, onSelect, }) {
    const [search, setSearch] = (0, react_1.useState)("");
    const filtered = (0, react_1.useMemo)(() => {
        if (!search.trim())
            return catalog;
        const fuzzy = (0, shared_1.fuzzyFilter)(catalog, search);
        if (fuzzy.length > 0)
            return fuzzy;
        const q = search.trim().toLowerCase();
        return catalog.filter((p) => p.name.toLowerCase().includes(q));
    }, [catalog, search]);
    const keyExtractor = (0, react_1.useCallback)((p) => p.id, []);
    const listHeader = (0, react_1.useMemo)(() => search.trim() ? null : (react_1.default.createElement(react_native_1.Text, { className: "px-4 py-2 text-[11px] text-slate-500" },
        catalog.length,
        " item",
        catalog.length !== 1 ? "s" : "",
        " \u2014 tap to add, or type above to search")), [catalog.length, search]);
    const renderCatalogItem = (0, react_1.useCallback)(({ item: p }) => {
        const outOfStock = Number(p.stock) <= 0;
        const lowStock = !outOfStock && Number(p.stock) < 5;
        return (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => onSelect(p), className: "flex-row items-center justify-between px-4 py-3 border-b border-slate-50" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800", numberOfLines: 1 }, p.name),
                react_1.default.createElement(react_native_1.Text, { className: `text-[11px] ${outOfStock ? "text-red-500" : lowStock ? "text-orange-500" : "text-slate-400"}` },
                    p.unit,
                    " \u00B7 ",
                    outOfStock ? "Out of stock" : `Stock: ${p.stock}`)),
            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-primary" },
                    "\u20B9",
                    getEffectivePrice(p).toLocaleString("en-IN")),
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "add-circle", size: 22, color: "#e67e22" }))));
    }, [getEffectivePrice, onSelect]);
    if (!visible)
        return null;
    return (react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/40", onPress: onClose },
        react_1.default.createElement(react_native_1.Pressable, { onPress: (e) => e.stopPropagation(), className: "absolute bottom-0 left-0 right-0 max-h-[85%] bg-white rounded-t-2xl" },
            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between px-4 py-3 border-b border-slate-200" },
                react_1.default.createElement(react_native_1.Text, { className: "text-base font-bold text-slate-800" }, "Browse / Add items"),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onClose, className: "p-2 -m-2" },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "close", size: 24, color: "#64748b" }))),
            react_1.default.createElement(react_native_1.View, { className: "px-4 py-2 border-b border-slate-100" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center bg-slate-100 rounded-lg px-3" },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "search", size: 18, color: "#94a3b8" }),
                    react_1.default.createElement(react_native_1.TextInput, { value: search, onChangeText: setSearch, placeholder: "Type to search all items\u2026", placeholderTextColor: "#94a3b8", className: "flex-1 py-2.5 px-2 text-sm text-slate-800", autoFocus: true }))),
            react_1.default.createElement(react_native_1.FlatList, { data: filtered, keyExtractor: keyExtractor, keyboardShouldPersistTaps: "always", className: "max-h-80", ListHeaderComponent: listHeader, renderItem: renderCatalogItem, initialNumToRender: 12, maxToRenderPerBatch: 12, windowSize: 7, removeClippedSubviews: true, ListEmptyComponent: react_1.default.createElement(react_native_1.View, { className: "py-8 items-center" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-slate-400 text-sm" }, search ? "No products match" : "No products in catalog")) }))));
}
// ── Mobile Item Row (compact inbox-style) ──────────────────────────────────────
function MobileItemRow({ item, catalog, isFirst, getEffectivePrice, onUpdate, onRemove, }) {
    const [focused, setFocused] = (0, react_1.useState)(false);
    const [expanded, setExpanded] = (0, react_1.useState)(false);
    const [debouncedQ, setDebouncedQ] = (0, react_1.useState)("");
    const [scanOpen, setScanOpen] = (0, react_1.useState)(false);
    const hasProduct = item.name.trim().length > 0;
    (0, react_1.useEffect)(() => {
        const t = setTimeout(() => setDebouncedQ(item.name.trim()), 80);
        return () => clearTimeout(t);
    }, [item.name]);
    const { data: searchData } = (0, react_query_1.useQuery)({
        queryKey: ["product-search", debouncedQ],
        queryFn: () => api_1.productApi.search(debouncedQ),
        enabled: debouncedQ.length >= 1,
        staleTime: 30_000,
    });
    const instantHits = (0, react_1.useMemo)(() => (0, shared_1.fuzzyFilter)(catalog, item.name), [catalog, item.name]);
    const suggestions = item.name.trim().length === 0
        ? []
        : searchData?.products?.length
            ? searchData.products
            : instantHits;
    const handleSelect = (p) => {
        onUpdate({
            name: p.name,
            rate: String(getEffectivePrice(p)),
            unit: p.unit ?? "pcs",
            productId: p.id,
            hsnCode: p.hsnCode,
        });
        setFocused(false);
    };
    const handleBarcodeScan = (0, react_1.useCallback)(async (barcode) => {
        try {
            const { product } = await api_1.productApi.byBarcode(barcode);
            handleSelect(product);
        }
        catch {
            (0, alerts_1.showAlert)("Not found", "No product with this barcode in your catalog.");
        }
    }, [handleSelect]);
    const keyExtractorSuggestion = (0, react_1.useCallback)((p) => p.id, []);
    const renderSuggestion = (0, react_1.useCallback)(({ item: p }) => {
        const outOfStock = Number(p.stock) <= 0;
        const lowStock = !outOfStock && Number(p.stock) < 5;
        return (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => handleSelect(p), className: "flex-row items-center justify-between px-3 py-2 border-b border-slate-100" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800", numberOfLines: 1 }, p.name),
                react_1.default.createElement(react_native_1.Text, { className: `text-[11px] ${outOfStock ? "text-red-500" : lowStock ? "text-orange-500" : "text-slate-400"}` },
                    p.unit,
                    " \u00B7 ",
                    outOfStock ? "Out" : `Stock: ${p.stock}`)),
            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-primary shrink-0 ml-2" },
                "\u20B9",
                getEffectivePrice(p).toLocaleString("en-IN"))));
    }, [getEffectivePrice, handleSelect]);
    return (react_1.default.createElement(react_native_1.View, { className: `px-3 py-1.5 min-w-0 ${isFirst ? "" : "border-t border-slate-100"}` }, !hasProduct ? (
    /* New row: compact search bar */
    react_1.default.createElement(react_native_1.View, { className: "relative min-w-0" },
        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center border border-slate-200 rounded-lg bg-white overflow-hidden min-w-0" },
            react_1.default.createElement(react_native_1.TextInput, { value: item.name, onChangeText: (t) => onUpdate({ name: t }), onFocus: () => setFocused(true), onBlur: () => setTimeout(() => setFocused(false), 200), placeholder: "Type or scan product\u2026", placeholderTextColor: "#94a3b8", className: "flex-1 min-w-0 px-3 h-9 text-sm text-slate-800", autoFocus: isFirst && item.name === "" }),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setScanOpen(true), className: "w-9 h-9 items-center justify-center border-l border-slate-200", hitSlop: { top: 8, bottom: 8, left: 8, right: 8 } },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "barcode-outline", size: 20, color: "#e67e22" }))),
        react_1.default.createElement(BarcodeScanner_1.BarcodeScanner, { visible: scanOpen, onClose: () => setScanOpen(false), onScan: handleBarcodeScan, hint: "Point at product barcode" }),
        focused && suggestions.length > 0 && (react_1.default.createElement(react_native_1.View, { className: "absolute top-10 left-0 right-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg max-h-44 overflow-hidden min-w-0", style: { elevation: 8 } },
            react_1.default.createElement(react_native_1.FlatList, { data: suggestions.slice(0, 6), keyExtractor: keyExtractorSuggestion, keyboardShouldPersistTaps: "always", renderItem: renderSuggestion, initialNumToRender: 6, maxToRenderPerBatch: 6, windowSize: 3 }))))) : expanded ? (
    /* Expanded: full edit */
    react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-2" },
            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-800 flex-1", numberOfLines: 1 }, item.name),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setExpanded(false), className: "p-1" },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-up", size: 18, color: "#64748b" }))),
        react_1.default.createElement(react_native_1.View, { className: "gap-2 mb-2" },
            react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2" },
                react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-[10px] text-slate-500 mb-0.5" }, "Qty"),
                    react_1.default.createElement(react_native_1.TextInput, { value: item.qty, onChangeText: (v) => onUpdate({ qty: v }), keyboardType: "decimal-pad", className: "border border-slate-200 rounded-lg px-2 h-9 text-sm" })),
                react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-[10px] text-slate-500 mb-0.5" }, "Unit"),
                    react_1.default.createElement(react_native_1.TextInput, { value: item.unit, onChangeText: (v) => onUpdate({ unit: v }), placeholder: "pcs", placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-lg px-2 h-9 text-sm" }))),
            react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2" },
                react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-[10px] text-slate-500 mb-0.5" }, "Rate \u20B9"),
                    react_1.default.createElement(react_native_1.TextInput, { value: item.rate, onChangeText: (v) => onUpdate({ rate: v }), keyboardType: "decimal-pad", placeholder: "0", placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-lg px-2 h-9 text-sm" })),
                react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-[10px] text-slate-500 mb-0.5" }, "Disc %"),
                    react_1.default.createElement(react_native_1.TextInput, { value: item.discount, onChangeText: (v) => onUpdate({ discount: v }), keyboardType: "decimal-pad", placeholder: "0", placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-lg px-2 h-9 text-sm" })))),
        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between" },
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onRemove, className: "py-1" },
                react_1.default.createElement(react_native_1.Text, { className: "text-red-500 text-xs font-medium" }, "Remove")),
            react_1.default.createElement(react_native_1.Text, { className: "font-bold text-primary" },
                "\u20B9",
                item.amount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                }))))) : (
    /* Compact: single row — name | qty×rate | amount | actions */
    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setExpanded(true), activeOpacity: 0.7, className: "flex-row items-center gap-2 py-1" },
        react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800", numberOfLines: 1 }, item.name),
            react_1.default.createElement(react_native_1.Text, { className: "text-[11px] text-slate-500" },
                item.qty,
                " ",
                item.unit,
                " \u00D7 \u20B9",
                parseFloat(item.rate || "0").toLocaleString("en-IN"),
                item.discount ? ` (−${item.discount}%)` : "")),
        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-primary shrink-0 w-16 text-right" },
            "\u20B9",
            item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })),
        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onRemove, className: "w-8 h-8 items-center justify-center rounded-lg bg-red-50", hitSlop: { top: 8, bottom: 8, left: 8, right: 8 } },
            react_1.default.createElement(vector_icons_1.Ionicons, { name: "trash-outline", size: 16, color: "#dc2626" }))))));
}
// ── Total Row ─────────────────────────────────────────────────────────────────
function TotalRow({ label, value, valueClass = "text-sm font-semibold text-slate-700", }) {
    return (react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between items-center py-0.5" },
        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, label),
        react_1.default.createElement(react_native_1.Text, { className: valueClass }, value)));
}
//# sourceMappingURL=BillingScreen.js.map