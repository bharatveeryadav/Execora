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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceListScreen = InvoiceListScreen;
/**
 * InvoiceListScreen — Bills page, matches web app (Invoices.tsx) filter structure.
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const datetimepicker_1 = __importDefault(require("@react-native-community/datetimepicker"));
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const shared_1 = require("@execora/shared");
const useWsInvalidation_1 = require("../hooks/useWsInvalidation");
const useResponsive_1 = require("../hooks/useResponsive");
const FilterBar_1 = require("../components/composites/FilterBar");
const TabBar_1 = require("../components/composites/TabBar");
const EmptyState_1 = require("../components/ui/EmptyState");
const ErrorCard_1 = require("../components/ui/ErrorCard");
const typography_1 = require("../lib/typography");
const constants_1 = require("../lib/constants");
// Web: DATE_FILTERS, DATE_FILTER_LABELS
const DATE_FILTERS = [
    "all",
    "today",
    "yesterday",
    "this_week",
    "this_month",
    "last_month",
    "this_year",
    "last_year",
    "last_quarter",
    "custom",
];
const DATE_LABELS = {
    all: "All dates",
    today: "Today",
    yesterday: "Yesterday",
    this_week: "This week",
    this_month: "This month",
    last_month: "Last month",
    this_year: "This year",
    last_year: "Last year",
    last_quarter: "Last quarter",
    custom: "Custom",
};
// Web: STATUS_TABS
const STATUS_TABS = [
    "All",
    "Draft",
    "Pending",
    "Partial",
    "Paid",
    "Cancelled",
    "Proforma",
];
const MIN_TOUCH = 44;
const ROW_HEIGHT = MIN_TOUCH + 8; // 52 — matches renderInvoiceRow/renderPurchaseRow minHeight
const STATUS_STYLES = {
    paid: { bgColor: "#dcfce7", iconColor: "#16a34a", textColor: "#15803d" },
    pending: { bgColor: "#fef3c7", iconColor: "#d97706", textColor: "#b45309" },
    partial: { bgColor: "#fef3c7", iconColor: "#d97706", textColor: "#b45309" },
    draft: { bgColor: "#f1f5f9", iconColor: "#64748b", textColor: "#64748b" },
    proforma: { bgColor: "#dbeafe", iconColor: "#2563eb", textColor: "#1d4ed8" },
    cancelled: { bgColor: "#fee2e2", iconColor: "#94a3b8", textColor: "#94a3b8" },
};
// Web: getDateRange
function getDateRange(filter, customFrom, customTo) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const toEnd = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    if (filter === "all")
        return null;
    if (filter === "custom" && customFrom && customTo) {
        return { from: customFrom, to: toEnd(customTo) };
    }
    let from;
    let to = toEnd(now);
    switch (filter) {
        case "today":
            from = today;
            break;
        case "yesterday":
            from = new Date(today);
            from.setDate(from.getDate() - 1);
            to = toEnd(from);
            break;
        case "this_week":
            from = new Date(today);
            from.setDate(from.getDate() - from.getDay());
            break;
        case "this_month":
            from = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case "last_month":
            from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            to = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
            break;
        case "this_year":
            from = new Date(today.getFullYear(), 0, 1);
            break;
        case "last_year":
            from = new Date(today.getFullYear() - 1, 0, 1);
            to = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            break;
        case "last_quarter": {
            const q = Math.floor(now.getMonth() / 3) + 1;
            const prevQ = q === 1 ? 4 : q - 1;
            const prevYear = q === 1 ? now.getFullYear() - 1 : now.getFullYear();
            from = new Date(prevYear, (prevQ - 1) * 3, 1);
            to = new Date(prevYear, prevQ * 3, 0, 23, 59, 59, 999);
            break;
        }
        default:
            return null;
    }
    return { from, to };
}
function isInRange(d, range) {
    if (!range)
        return true;
    const invDate = new Date(d);
    invDate.setHours(0, 0, 0, 0);
    const from = new Date(range.from);
    from.setHours(0, 0, 0, 0);
    const to = new Date(range.to);
    to.setHours(23, 59, 59, 999);
    return invDate >= from && invDate <= to;
}
function fuzzyMatch(query, target) {
    if (!query)
        return true;
    const q = query.toLowerCase().replace(/\s+/g, "");
    const t = target.toLowerCase().replace(/\s+/g, "");
    if (t.includes(q))
        return true;
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi])
            qi++;
    }
    return qi === q.length;
}
function formatDate(d) {
    if (!d)
        return "—";
    try {
        return new Date(d).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    }
    catch {
        return "—";
    }
}
function InvoiceListScreen({ navigation }) {
    const { contentPad, contentWidth, isSmall } = (0, useResponsive_1.useResponsive)();
    const compactHeader = contentWidth < 380;
    const stackSearchControls = contentWidth < 380;
    const [docTypeTab, setDocTypeTab] = (0, react_1.useState)("sales");
    const [statusTab, setStatusTab] = (0, react_1.useState)("All");
    const [search, setSearch] = (0, react_1.useState)("");
    const [dateFilter, setDateFilter] = (0, react_1.useState)("all");
    const [customFrom, setCustomFrom] = (0, react_1.useState)();
    const [customTo, setCustomTo] = (0, react_1.useState)();
    const [dateFilterModalOpen, setDateFilterModalOpen] = (0, react_1.useState)(false);
    const [customDateModalOpen, setCustomDateModalOpen] = (0, react_1.useState)(false);
    const [customFromTemp, setCustomFromTemp] = (0, react_1.useState)(() => new Date());
    const [customToTemp, setCustomToTemp] = (0, react_1.useState)(() => new Date());
    const [customPickerMode, setCustomPickerMode] = (0, react_1.useState)(null);
    (0, useWsInvalidation_1.useWsInvalidation)(["invoices", "summary", "purchases"]);
    const { data: invData, isFetching, isError, refetch, } = (0, react_query_1.useQuery)({
        queryKey: ["invoices"],
        queryFn: () => api_1.invoiceApi.list(1, 500),
        staleTime: 30_000,
    });
    const { data: purchaseData, isFetching: purchasesLoading } = (0, react_query_1.useQuery)({
        queryKey: ["purchases"],
        queryFn: () => api_1.purchaseApi.list({}),
        staleTime: 30_000,
        enabled: docTypeTab === "purchase",
    });
    const allInvoices = invData?.invoices ?? [];
    const purchases = purchaseData?.purchases ?? [];
    const invoicesByDocType = (0, react_1.useMemo)(() => {
        if (docTypeTab === "sales")
            return allInvoices.filter((inv) => inv.status !== "proforma");
        if (docTypeTab === "quotation")
            return allInvoices.filter((inv) => inv.status === "proforma");
        return [];
    }, [allInvoices, docTypeTab]);
    const dateRange = (0, react_1.useMemo)(() => getDateRange(dateFilter, customFrom, customTo), [dateFilter, customFrom, customTo]);
    const invoicesByDate = (0, react_1.useMemo)(() => invoicesByDocType.filter((inv) => isInRange(inv.invoiceDate ?? inv.createdAt, dateRange)), [invoicesByDocType, dateRange]);
    const filteredInvoices = (0, react_1.useMemo)(() => {
        return invoicesByDate.filter((inv) => {
            const matchStatus = statusTab === "All" ||
                inv.status?.toLowerCase() === statusTab.toLowerCase();
            const q = search.toLowerCase();
            const matchSearch = !q ||
                fuzzyMatch(q, inv.invoiceNo ?? "") ||
                fuzzyMatch(q, inv.customer?.name ?? "");
            return matchStatus && matchSearch;
        });
    }, [invoicesByDate, statusTab, search]);
    const filteredPurchases = (0, react_1.useMemo)(() => {
        if (docTypeTab !== "purchase")
            return [];
        if (!search.trim())
            return purchases;
        const q = search.toLowerCase();
        return purchases.filter((p) => (p.itemName ?? "").toLowerCase().includes(q) ||
            (p.vendor ?? "").toLowerCase().includes(q) ||
            (p.category ?? "").toLowerCase().includes(q));
    }, [purchases, search, docTypeTab]);
    const counts = (0, react_1.useMemo)(() => invoicesByDate.reduce((acc, inv) => {
        const s = inv.status ?? "draft";
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
    }, {}), [invoicesByDate]);
    const totalValue = (0, react_1.useMemo)(() => filteredInvoices.reduce((s, inv) => s + parseFloat(String(inv.total ?? 0)), 0), [filteredInvoices]);
    const pendingAmount = (0, react_1.useMemo)(() => filteredInvoices.reduce((s, inv) => {
        if (inv.status === "paid" ||
            inv.status === "cancelled")
            return s;
        const total = parseFloat(String(inv.total ?? 0));
        const paid = parseFloat(String(inv.paidAmount ?? 0));
        return s + (total - paid);
    }, 0), [filteredInvoices]);
    const purchasesTotal = (0, react_1.useMemo)(() => filteredPurchases.reduce((s, p) => s + (parseFloat(String(p.amount)) || 0), 0), [filteredPurchases]);
    const docTypeCounts = {
        sales: allInvoices
            .filter((i) => i.status !== "proforma")
            .filter((i) => isInRange(i.invoiceDate ?? i.createdAt, dateRange))
            .length,
        purchase: purchases.length,
        quotation: allInvoices
            .filter((i) => i.status === "proforma")
            .filter((i) => isInRange(i.invoiceDate ?? i.createdAt, dateRange))
            .length,
    };
    const showInvoiceList = docTypeTab === "sales" || docTypeTab === "quotation";
    const handleNewInvoice = (0, react_1.useCallback)(() => {
        react_native_1.InteractionManager.runAfterInteractions(() => {
            try {
                const tabNav = navigation.getParent?.();
                if (docTypeTab === "purchase") {
                    tabNav?.navigate("MoreTab", { screen: "Purchases" });
                }
                else {
                    tabNav?.navigate("MoreTab", {
                        screen: "Billing",
                        params: { screen: "BillingForm" },
                    });
                }
            }
            catch (_) { }
        });
    }, [docTypeTab, navigation]);
    const handleBillsMenu = (0, react_1.useCallback)(() => {
        react_native_1.InteractionManager.runAfterInteractions(() => {
            navigation?.navigate?.("BillsMenu");
        });
    }, [navigation]);
    const handleDateSelect = (0, react_1.useCallback)((f) => {
        if (f === "custom") {
            setCustomFromTemp(customFrom ?? new Date());
            setCustomToTemp(customTo ?? new Date());
            setDateFilterModalOpen(false);
            setCustomDateModalOpen(true);
        }
        else {
            setDateFilter(f);
            setDateFilterModalOpen(false);
        }
    }, [customFrom, customTo]);
    const applyCustomDate = (0, react_1.useCallback)(() => {
        setCustomFrom(customFromTemp);
        setCustomTo(customToTemp);
        setDateFilter("custom");
        setCustomDateModalOpen(false);
    }, [customFromTemp, customToTemp]);
    const placeholder = docTypeTab === "purchase"
        ? "Search by item, supplier, category…"
        : docTypeTab === "quotation"
            ? "Search by estimate # or customer…"
            : "Search by invoice # or customer…";
    const dateFilterLabel = dateFilter === "custom" && customFrom && customTo
        ? `${customFrom.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}–${customTo.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`
        : DATE_LABELS[dateFilter];
    const dateFilterOptions = (0, react_1.useMemo)(() => DATE_FILTERS.map((id) => ({ id, label: DATE_LABELS[id] })), []);
    const activeDateFilters = (0, react_1.useMemo)(() => [{ id: dateFilter, label: dateFilterLabel }], [dateFilter, dateFilterLabel]);
    const statusTabItems = (0, react_1.useMemo)(() => STATUS_TABS.map((tab) => {
        const key = tab.toLowerCase();
        return {
            id: tab,
            label: tab,
            badge: tab === "All" ? invoicesByDate.length : (counts[key] ?? 0),
        };
    }), [counts, invoicesByDate.length]);
    const renderInvoiceRow = (0, react_1.useCallback)(({ item: inv }) => {
        const invAny = inv;
        const status = invAny.status ?? "draft";
        const s = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
        const amtColor = status === "paid"
            ? "#16a34a"
            : status === "cancelled"
                ? "#94a3b8"
                : "#0f172a";
        return (react_1.default.createElement(react_native_1.Pressable, { onPress: () => {
                react_native_1.InteractionManager.runAfterInteractions(() => {
                    navigation?.navigate?.("InvoiceDetail", { id: inv.id });
                });
            }, className: "flex-row items-center gap-2 px-4 py-3.5 border-b border-slate-100 bg-white min-w-0", style: ({ pressed }) => ({
                backgroundColor: pressed ? "#f8fafc" : "#fff",
                minHeight: MIN_TOUCH + 8,
            }) },
            react_1.default.createElement(react_native_1.View, { style: {
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: s.bgColor,
                } },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: status === "paid"
                        ? "checkmark-circle"
                        : status === "cancelled"
                            ? "close-circle"
                            : "document-outline", size: 18, color: s.iconColor })),
            react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0 shrink" },
                react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.labelBold} min-w-0`, numberOfLines: 1, ellipsizeMode: "tail" }, invAny.invoiceNo ?? inv.id.slice(-8).toUpperCase()),
                react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.caption} min-w-0`, numberOfLines: 1, ellipsizeMode: "tail" },
                    invAny.customer?.name ?? "Unknown",
                    " \u00B7 ",
                    formatDate(inv.createdAt))),
            react_1.default.createElement(react_native_1.View, { style: {
                    borderRadius: 9999,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    backgroundColor: s.bgColor,
                    flexShrink: 0,
                } },
                react_1.default.createElement(react_native_1.Text, { style: {
                        fontSize: constants_1.SIZES.FONT.xs,
                        fontWeight: "600",
                        color: s.textColor,
                        textTransform: "capitalize",
                    }, numberOfLines: 1 }, status)),
            react_1.default.createElement(react_native_1.Text, { style: {
                    fontSize: constants_1.SIZES.FONT.base,
                    fontWeight: "700",
                    color: amtColor,
                    textDecorationLine: status === "cancelled" ? "line-through" : undefined,
                    flexShrink: 0,
                }, numberOfLines: 1 },
                "\u20B9",
                (0, shared_1.inr)(inv.total)),
            react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 16, color: "#94a3b8", style: { flexShrink: 0 } })));
    }, [navigation]);
    const renderPurchaseRow = (0, react_1.useCallback)(({ item: p }) => (react_1.default.createElement(react_native_1.Pressable, { onPress: () => {
            react_native_1.InteractionManager.runAfterInteractions(() => {
                try {
                    navigation.getParent?.()?.navigate("MoreTab", {
                        screen: "Purchases",
                    });
                }
                catch (_) { }
            });
        }, className: "flex-row items-center gap-2 px-4 py-3.5 border-b border-slate-100 bg-white min-w-0", style: ({ pressed }) => ({
            backgroundColor: pressed ? "#f8fafc" : "#fff",
            minHeight: MIN_TOUCH + 8,
        }) },
        react_1.default.createElement(react_native_1.View, { className: "w-10 h-10 rounded-xl bg-amber-100 items-center justify-center shrink-0" },
            react_1.default.createElement(vector_icons_1.Ionicons, { name: "cube-outline", size: 18, color: "#d97706" })),
        react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0 shrink" },
            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.labelBold, numberOfLines: 1, ellipsizeMode: "tail" }, p.itemName ?? p.category),
            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption, numberOfLines: 1, ellipsizeMode: "tail" },
                p.vendor ?? "—",
                " \u00B7 ",
                formatDate(p.date ?? p.createdAt ?? ""))),
        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-red-600 shrink-0", numberOfLines: 1 },
            "\u20B9",
            (0, shared_1.inr)(parseFloat(String(p.amount)))),
        react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 16, color: "#94a3b8" }))), [navigation]);
    const navToReports = (0, react_1.useCallback)(() => {
        react_native_1.InteractionManager.runAfterInteractions(() => navigation?.navigate?.("Reports"));
    }, [navigation]);
    const navToComingSoon = (0, react_1.useCallback)((title) => () => {
        react_native_1.InteractionManager.runAfterInteractions(() => navigation?.navigate?.("ComingSoon", { title }));
    }, [navigation]);
    const navToOverdue = (0, react_1.useCallback)(() => {
        react_native_1.InteractionManager.runAfterInteractions(() => navigation?.navigate?.("Overdue"));
    }, [navigation]);
    const QUICK_LINK_ITEMS = [
        {
            id: "reports",
            icon: "bar-chart",
            label: "Reports",
            onPress: navToReports,
        },
        {
            id: "analytics",
            icon: "trending-up",
            label: "Analytics",
            onPress: navToReports,
        },
        {
            id: "aging",
            icon: "time",
            label: "Aging",
            onPress: navToComingSoon("Aging Report"),
        },
        {
            id: "overdue",
            icon: "alert-circle",
            label: "Overdue",
            onPress: navToOverdue,
        },
    ];
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { style: {
                paddingHorizontal: contentPad,
                paddingTop: 12,
                paddingBottom: 12,
            }, className: "" },
            react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth, alignSelf: "center" }, className: "rounded-xl border border-slate-200/80 bg-white px-3 pt-3 pb-2" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center min-w-0" },
                    [
                        { id: "sales", label: "Sales" },
                        { id: "purchase", label: "Purchase" },
                        { id: "quotation", label: "Quote" },
                    ].map(({ id, label }) => (react_1.default.createElement(react_native_1.Pressable, { key: id, onPress: () => requestAnimationFrame(() => setDocTypeTab(id)), style: ({ pressed }) => ({
                            opacity: pressed && docTypeTab !== id ? 0.7 : 1,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            marginRight: 4,
                            borderRadius: 8,
                            backgroundColor: docTypeTab === id ? "#fff" : "transparent",
                            borderWidth: docTypeTab === id ? 1 : 0,
                            borderColor: "#e2e8f0",
                            ...(docTypeTab === id && {
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.06,
                                shadowRadius: 2,
                                elevation: 1,
                            }),
                        }) },
                        react_1.default.createElement(react_native_1.Text, { style: {
                                fontSize: constants_1.SIZES.FONT.sm,
                                fontWeight: docTypeTab === id ? "600" : "500",
                                color: docTypeTab === id ? "#0f172a" : "#94a3b8",
                            }, numberOfLines: 1 }, label)))),
                    react_1.default.createElement(react_native_1.View, { style: { flex: 1 } }),
                    react_1.default.createElement(react_native_1.Pressable, { onPress: handleBillsMenu, style: ({ pressed }) => ({
                            width: 34,
                            height: 34,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: pressed ? 0.7 : 1,
                            backgroundColor: pressed ? "#e2e8f0" : "#f1f5f9",
                        }) },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "ellipsis-horizontal", size: 18, color: "#475569" }))),
                showInvoiceList && (react_1.default.createElement(TabBar_1.TabBar, { tabs: statusTabItems, activeTab: statusTab, onChange: (tab) => requestAnimationFrame(() => setStatusTab(tab)), scrollable: true, className: "mt-0" })),
                react_1.default.createElement(react_native_1.View, { className: "mt-2 rounded-lg border border-slate-200 bg-slate-50/50 p-1.5 min-w-0" },
                    react_1.default.createElement(react_native_1.View, { className: "rounded-lg border border-slate-200 bg-white min-w-0", style: {
                            flexDirection: stackSearchControls ? "column" : "row",
                            alignItems: stackSearchControls ? undefined : "center",
                        } },
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 flex-row items-center rounded-lg px-2.5 min-h-[34] min-w-0" },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "search", size: 16, color: "#64748b", style: { marginRight: 8 } }),
                            react_1.default.createElement(react_native_1.TextInput, { value: search, onChangeText: setSearch, placeholder: placeholder, placeholderTextColor: "#94a3b8", className: "flex-1 min-w-0 text-sm text-slate-800 py-1.5" }))),
                    showInvoiceList && !search.trim() && (react_1.default.createElement(FilterBar_1.FilterBar, { options: dateFilterOptions, activeFilters: activeDateFilters, onFilterChange: (toAdd) => {
                            handleDateSelect(toAdd);
                        }, onClearAll: () => {
                            setDateFilter("all");
                            setDateFilterModalOpen(false);
                        }, variant: "modal", isOpen: dateFilterModalOpen, onOpenChange: setDateFilterModalOpen, maxVisible: 3, className: stackSearchControls ? "mt-1.5" : "ml-1" })),
                    showInvoiceList && filteredInvoices.length > 0 && (react_1.default.createElement(react_native_1.View, { className: "mt-1.5 rounded-lg border border-slate-200 bg-white p-2 min-w-0 flex-row" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle }, "Total"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-slate-800 mt-0.5", numberOfLines: 1 },
                                "\u20B9",
                                (0, shared_1.inr)(totalValue))),
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0", style: {
                                borderLeftWidth: 1,
                                borderColor: "#e2e8f0",
                                paddingLeft: 10,
                            } },
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle }, "Pending"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-amber-600 mt-0.5", numberOfLines: 1 },
                                "\u20B9",
                                (0, shared_1.inr)(pendingAmount))))),
                    showInvoiceList && (react_1.default.createElement(react_native_1.View, { className: "mt-1.5 flex-row min-w-0", style: { gap: 4 } }, QUICK_LINK_ITEMS.map((item) => (react_1.default.createElement(react_native_1.Pressable, { key: item.id, onPress: item.onPress, className: "flex-1 flex-row items-center justify-center rounded-md border border-slate-200 py-2 bg-white min-h-[38]", style: ({ pressed }) => ({
                            opacity: pressed ? 0.7 : 1,
                            backgroundColor: pressed ? "#f8fafc" : "#fff",
                            gap: 3,
                        }) },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: item.icon, size: 12, color: "#64748b" }),
                        react_1.default.createElement(react_native_1.Text, { className: "text-[11px] font-medium text-slate-600", numberOfLines: 1 }, item.label))))))))),
        react_1.default.createElement(react_native_1.View, { style: {
                flex: 1,
                paddingHorizontal: contentPad,
                paddingTop: 12,
                alignItems: "center",
            } },
            react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth, flex: 1 }, className: "min-w-0" }, docTypeTab === "purchase" ? (purchasesLoading ? (react_1.default.createElement(react_native_1.View, { className: "py-16 items-center" },
                react_1.default.createElement(react_native_1.ActivityIndicator, { size: "large", color: "#e67e22" }))) : filteredPurchases.length === 0 ? (react_1.default.createElement(react_native_1.View, { className: "rounded-xl border border-slate-200 bg-white py-16" },
                react_1.default.createElement(EmptyState_1.EmptyState, { iconName: "cube-outline", title: search ? "No purchases match" : "No purchases yet", description: search
                        ? "Try a different search"
                        : "Add your first purchase", actionLabel: !search ? "Add Purchase" : undefined, onAction: !search
                        ? () => {
                            react_native_1.InteractionManager.runAfterInteractions(() => {
                                try {
                                    navigation.getParent?.()?.navigate("MoreTab", { screen: "Purchases" });
                                }
                                catch (_) { }
                            });
                        }
                        : undefined }))) : (react_1.default.createElement(react_native_1.View, { className: "flex-1 rounded-xl border border-slate-200 bg-white overflow-hidden" },
                react_1.default.createElement(react_native_1.FlatList, { data: filteredPurchases, keyExtractor: (p) => p.id, renderItem: renderPurchaseRow, getItemLayout: (_, index) => ({
                        length: ROW_HEIGHT,
                        offset: ROW_HEIGHT * index,
                        index,
                    }), ListFooterComponent: react_1.default.createElement(react_native_1.View, { className: "h-4" }), style: { flex: 1 }, initialNumToRender: 12, maxToRenderPerBatch: 8, windowSize: 6, removeClippedSubviews: true })))) : isError ? (react_1.default.createElement(react_native_1.View, { className: "rounded-xl border border-slate-200 bg-white py-8 px-4" },
                react_1.default.createElement(ErrorCard_1.ErrorCard, { message: "Failed to load invoices", onRetry: () => refetch() }))) : filteredInvoices.length === 0 ? (react_1.default.createElement(react_native_1.View, { className: "rounded-xl border border-slate-200 bg-white py-16" },
                react_1.default.createElement(EmptyState_1.EmptyState, { iconName: "receipt-outline", title: search || statusTab !== "All"
                        ? `No ${docTypeTab === "quotation" ? "quotations" : "invoices"} match`
                        : docTypeTab === "quotation"
                            ? "No quotations yet"
                            : "No invoices yet", description: "Create your first invoice to get started", actionLabel: statusTab === "All" && !search
                        ? docTypeTab === "quotation"
                            ? "Create Quotation"
                            : "Create Invoice"
                        : undefined, onAction: statusTab === "All" && !search ? handleNewInvoice : undefined }))) : (react_1.default.createElement(react_native_1.View, { className: "flex-1 rounded-xl border border-slate-200 bg-white overflow-hidden" },
                react_1.default.createElement(react_native_1.FlatList, { data: filteredInvoices, keyExtractor: (inv) => inv.id, renderItem: renderInvoiceRow, getItemLayout: (_, index) => ({
                        length: ROW_HEIGHT,
                        offset: ROW_HEIGHT * index,
                        index,
                    }), refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching, onRefresh: refetch, tintColor: "#e67e22" }), ListFooterComponent: react_1.default.createElement(react_native_1.View, { className: "h-24" }), style: { flex: 1 }, initialNumToRender: 12, maxToRenderPerBatch: 8, windowSize: 6, removeClippedSubviews: true }))))),
        react_1.default.createElement(react_native_1.Pressable, { onPress: handleNewInvoice, className: "w-14 h-14 rounded-full bg-primary items-center justify-center", style: ({ pressed }) => ({
                position: "absolute",
                bottom: 24,
                right: contentPad,
                opacity: pressed ? 0.9 : 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 8,
            }) },
            react_1.default.createElement(vector_icons_1.Ionicons, { name: "add", size: 28, color: "#fff" })),
        react_1.default.createElement(react_native_1.Modal, { visible: customDateModalOpen, transparent: true, animationType: "fade" },
            react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/50 justify-center items-center p-4", onPress: () => {
                    setCustomDateModalOpen(false);
                    setCustomPickerMode(null);
                } },
                react_1.default.createElement(react_native_1.Pressable, { className: "bg-white rounded-2xl p-5 w-full max-w-sm", onPress: (e) => e.stopPropagation() },
                    react_1.default.createElement(react_native_1.Text, { className: "text-base font-bold text-slate-800 mb-4" }, "Custom date range"),
                    react_1.default.createElement(react_native_1.View, { style: { gap: 16 } },
                        react_1.default.createElement(react_native_1.View, null,
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 mb-1" }, "From"),
                            react_1.default.createElement(react_native_1.Pressable, { onPress: () => setCustomPickerMode("from"), className: "py-3 px-4 rounded-xl border border-slate-200 bg-slate-50", style: ({ pressed }) => ({ opacity: pressed ? 0.8 : 1 }) },
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-800" }, customFromTemp.toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                }))),
                            customPickerMode === "from" && (react_1.default.createElement(datetimepicker_1.default, { value: customFromTemp, mode: "date", display: react_native_1.Platform.OS === "ios" ? "spinner" : "default", onChange: (_, d) => {
                                    if (d)
                                        setCustomFromTemp(d);
                                    setCustomPickerMode(null);
                                }, maximumDate: customToTemp }))),
                        react_1.default.createElement(react_native_1.View, null,
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 mb-1" }, "To"),
                            react_1.default.createElement(react_native_1.Pressable, { onPress: () => setCustomPickerMode("to"), className: "py-3 px-4 rounded-xl border border-slate-200 bg-slate-50", style: ({ pressed }) => ({ opacity: pressed ? 0.8 : 1 }) },
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-800" }, customToTemp.toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                }))),
                            customPickerMode === "to" && (react_1.default.createElement(datetimepicker_1.default, { value: customToTemp, mode: "date", display: react_native_1.Platform.OS === "ios" ? "spinner" : "default", onChange: (_, d) => {
                                    if (d)
                                        setCustomToTemp(d);
                                    setCustomPickerMode(null);
                                }, minimumDate: customFromTemp, maximumDate: new Date() })))),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2 mt-4" },
                        react_1.default.createElement(react_native_1.Pressable, { onPress: () => {
                                setCustomDateModalOpen(false);
                                setCustomPickerMode(null);
                            }, className: "flex-1 py-3 rounded-xl bg-slate-100 items-center", style: ({ pressed }) => ({ opacity: pressed ? 0.8 : 1 }) },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-600" }, "Cancel")),
                        react_1.default.createElement(react_native_1.Pressable, { onPress: applyCustomDate, className: "flex-1 py-3 rounded-xl bg-primary items-center", style: ({ pressed }) => ({ opacity: pressed ? 0.9 : 1 }) },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-white" }, "Apply"))))))));
}
//# sourceMappingURL=InvoiceListScreen.js.map