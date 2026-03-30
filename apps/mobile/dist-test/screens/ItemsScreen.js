"use strict";
/**
 * ItemsScreen — Mobile product catalog & inventory management.
 *
 * PRD F-03: Inventory & Stock Management
 *
 * What competitors do                  | What we do better
 * ─────────────────────────────────────|──────────────────────────────────────
 * Vyapar: catalog list, requires       | One-tap ➕/➖ stock adjustment inline
 *         drill-in to adjust stock     | No extra screens needed
 * myBillBook: basic list, no alerts    | Color-coded stock badges (live)
 * Khatabook: no inventory at all       | Low-stock alert banner at top
 * Tally: complex item master           | Simple kirana-friendly card UI
 * All: manual refresh required         | React Query auto-refresh on focus
 */
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
exports.ItemsScreen = ItemsScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const shared_1 = require("@execora/shared");
const BarcodeScanner_1 = require("../components/common/BarcodeScanner");
const haptics_1 = require("../lib/haptics");
const storage_1 = require("../lib/storage");
const vector_icons_1 = require("@expo/vector-icons");
const useWsInvalidation_1 = require("../hooks/useWsInvalidation");
const useResponsive_1 = require("../hooks/useResponsive");
const api_1 = require("../lib/api");
const queryKeys_1 = require("../lib/queryKeys");
// ── Helper: parse numeric fields returned as string | number from API ─────────
function num(v) {
    if (v === undefined || v === null)
        return 0;
    const n = typeof v === "string" ? parseFloat(v) : v;
    return isFinite(n) ? n : 0;
}
function stockStatus(product) {
    const s = num(product.stock);
    if (s <= 0)
        return "out";
    const min = product.minStock ?? 5; // default reorder threshold if not set
    if (s <= min)
        return "low";
    return "ok";
}
const STATUS_STYLES = {
    out: { bg: "bg-red-100", text: "text-red-700", label: "Out", dot: "🔴" },
    low: { bg: "bg-amber-100", text: "text-amber-700", label: "Low", dot: "🟡" },
    ok: {
        bg: "bg-green-100",
        text: "text-green-700",
        label: "In Stock",
        dot: "🟢",
    },
};
// ── Main screen ───────────────────────────────────────────────────────────────
function ItemsScreen({ navigation }) {
    const qc = (0, react_query_1.useQueryClient)();
    (0, useWsInvalidation_1.useWsInvalidation)(["products", "lowStock"]);
    const [search, setSearch] = (0, react_1.useState)("");
    const [filter, setFilter] = (0, react_1.useState)("all");
    const [categoryFilter, setCategoryFilter] = (0, react_1.useState)(null);
    const [sortBy, setSortBy] = (0, react_1.useState)("name");
    const [addOpen, setAddOpen] = (0, react_1.useState)(false);
    const [showHint, setShowHint] = (0, react_1.useState)(() => !storage_1.storage.getString("items-hint-dismissed"));
    const [adjustTarget, setAdjustTarget] = (0, react_1.useState)(null);
    const [showCategoryModal, setShowCategoryModal] = (0, react_1.useState)(false);
    const [showControls, setShowControls] = (0, react_1.useState)(false);
    const [showSearch, setShowSearch] = (0, react_1.useState)(false);
    const searchInputRef = (0, react_1.useRef)(null);
    const openSearch = (0, react_1.useCallback)(() => {
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 80);
    }, []);
    const closeSearch = (0, react_1.useCallback)(() => {
        setShowSearch(false);
        setSearch("");
    }, []);
    const filtersActive = !!(filter !== "all" ||
        categoryFilter ||
        sortBy !== "name");
    const filterSummary = (0, react_1.useMemo)(() => {
        const parts = [];
        if (categoryFilter)
            parts.push(categoryFilter);
        if (filter === "low")
            parts.push("Low stock");
        else if (filter === "out")
            parts.push("Out of stock");
        else if (filter === "favorites")
            parts.push("Favorites");
        if (sortBy === "stockAsc")
            parts.push("Stock ↑");
        else if (sortBy === "stockDesc")
            parts.push("Stock ↓");
        else if (sortBy === "price")
            parts.push("Price ↑");
        else if (sortBy === "priceDesc")
            parts.push("Price ↓");
        else if (sortBy === "category")
            parts.push("A-Z Category");
        return parts.length > 0 ? parts.join(" · ") : null;
    }, [categoryFilter, filter, sortBy]);
    // ── Data fetching ─────────────────────────────────────────────────────────
    const [page, setPage] = (0, react_1.useState)(1);
    const [accumulatedProducts, setAccumulatedProducts] = (0, react_1.useState)([]);
    const { data: allData, isFetching, refetch, } = (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.products.page(page),
        queryFn: () => shared_1.productApi.list(page, 50),
        staleTime: 30_000,
    });
    const paginated = allData;
    const hasMore = paginated?.hasMore ?? false;
    // Accumulate products across pages (Sprint 27)
    react_1.default.useEffect(() => {
        const list = (paginated?.products ?? []);
        if (page === 1) {
            setAccumulatedProducts(list);
        }
        else if (list.length > 0) {
            setAccumulatedProducts((prev) => {
                const seen = new Set(prev.map((p) => p.id));
                const newOnes = list.filter((p) => !seen.has(p.id));
                return [...prev, ...newOnes];
            });
        }
    }, [paginated?.products, page]);
    const loadMore = (0, react_1.useCallback)(() => {
        if (hasMore && !isFetching)
            setPage((p) => p + 1);
    }, [hasMore, isFetching]);
    const { data: lowData } = (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.products.lowStock(),
        queryFn: () => api_1.productExtApi.lowStock(),
        staleTime: 30_000,
    });
    // ── Derived lists ─────────────────────────────────────────────────────────
    const allProducts = accumulatedProducts.length > 0
        ? accumulatedProducts
        : (paginated?.products ?? []);
    const lowStockIds = (0, react_1.useMemo)(() => new Set((lowData?.products ?? []).map((p) => p.id)), [lowData]);
    const categories = (0, react_1.useMemo)(() => {
        const cats = new Set();
        allProducts.forEach((p) => {
            const c = (p.category ?? "").trim();
            if (c)
                cats.add(c);
        });
        return Array.from(cats).sort();
    }, [allProducts]);
    const categoryCounts = (0, react_1.useMemo)(() => {
        const counts = {};
        allProducts.forEach((product) => {
            const category = (product.category ?? "").trim();
            if (!category)
                return;
            counts[category] = (counts[category] ?? 0) + 1;
        });
        return counts;
    }, [allProducts]);
    const previewCategories = (0, react_1.useMemo)(() => categories.slice(0, 6), [categories]);
    // Reset stale category filter when product set changes.
    (0, react_1.useEffect)(() => {
        if (categoryFilter && !categories.includes(categoryFilter)) {
            setCategoryFilter(null);
        }
    }, [categoryFilter, categories]);
    const filtered = (0, react_1.useMemo)(() => {
        let list = allProducts;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((p) => p.name.toLowerCase().includes(q) ||
                (p.category ?? "").toLowerCase().includes(q));
        }
        if (filter === "out")
            list = list.filter((p) => num(p.stock) <= 0);
        else if (filter === "low")
            list = list.filter((p) => lowStockIds.has(p.id));
        else if (filter === "favorites")
            list = list.filter((p) => p.isFeatured);
        if (categoryFilter) {
            list = list.filter((p) => (p.category ?? "").trim() === categoryFilter);
        }
        // Sort (Sprint 24 — Vyapar complaint: no sort by quantity)
        const sorted = [...list].sort((a, b) => {
            if (sortBy === "name")
                return a.name.localeCompare(b.name);
            if (sortBy === "stockAsc")
                return num(a.stock) - num(b.stock);
            if (sortBy === "stockDesc")
                return num(b.stock) - num(a.stock);
            if (sortBy === "price")
                return num(a.price) - num(b.price);
            if (sortBy === "priceDesc")
                return num(b.price) - num(a.price);
            if (sortBy === "category") {
                const ca = (a.category ?? "").localeCompare(b.category ?? "");
                return ca !== 0 ? ca : a.name.localeCompare(b.name);
            }
            return 0;
        });
        return sorted;
    }, [allProducts, search, filter, categoryFilter, lowStockIds, sortBy]);
    const outCount = allProducts.filter((p) => num(p.stock) <= 0).length;
    const lowCount = lowData?.products.length ?? 0;
    const favoritesCount = allProducts.filter((p) => p.isFeatured).length;
    const imageIds = (0, react_1.useMemo)(() => [...new Set(filtered.map((p) => p.id))].slice(0, 50), [filtered]);
    const { data: imageUrlsMap = {} } = (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.products.imageUrls(imageIds),
        queryFn: () => api_1.productExtApi.getImageUrls(imageIds),
        enabled: imageIds.length > 0,
        staleTime: 50 * 60 * 1000,
    });
    // ── Stock adjustment mutation ─────────────────────────────────────────────
    const adjustMutation = (0, react_query_1.useMutation)({
        mutationFn: ({ id, qty, op, }) => api_1.productExtApi.adjustStock(id, qty, op),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys_1.QUERY_KEYS.products.all() });
        },
        onError: (e) => {
            (0, alerts_1.showAlert)("Error", e.message ?? "Stock adjustment failed");
        },
    });
    const favoriteMutation = (0, react_query_1.useMutation)({
        mutationFn: ({ id, isFeatured }) => api_1.productExtApi.update(id, { isFeatured }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys_1.QUERY_KEYS.products.all() });
        },
    });
    const handleQuickAdjust = (0, react_1.useCallback)((product, op) => {
        const current = num(product.stock);
        if (op === "subtract" && current <= 0) {
            (0, alerts_1.showAlert)("Cannot subtract", "Stock is already at 0");
            return;
        }
        adjustMutation.mutate({ id: product.id, qty: 1, op });
    }, [adjustMutation]);
    const insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    const { contentPad, contentWidth } = (0, useResponsive_1.useResponsive)();
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50" },
        react_1.default.createElement(react_native_1.View, { style: {
                paddingHorizontal: contentPad,
                paddingTop: 8,
                paddingBottom: 12,
            }, className: "bg-card border-b border-slate-200" },
            react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth, alignSelf: "center" } },
                showSearch ? (react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2 mb-3" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-1 flex-row items-center bg-slate-100 rounded-xl px-3 py-2" },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "search", size: 18, color: "#e67e22", style: { marginRight: 8 } }),
                        react_1.default.createElement(react_native_1.TextInput, { ref: searchInputRef, className: "flex-1 text-sm text-slate-800", placeholder: "Search products...", placeholderTextColor: "#94a3b8", value: search, onChangeText: setSearch, autoCorrect: false, autoCapitalize: "none", spellCheck: false, returnKeyType: "search", clearButtonMode: "while-editing", keyboardAppearance: "light", selectionColor: "#e67e2299", cursorColor: "#e67e22", disableFullscreenUI: true })),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: closeSearch, activeOpacity: 0.8, className: "w-10 h-10 rounded-xl bg-slate-100 items-center justify-center" },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "close", size: 20, color: "#475569" })))) : (react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-3" },
                    react_1.default.createElement(react_native_1.View, null,
                        react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold tracking-tight text-slate-800" }, "Items"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400" }, filtersActive
                            ? `${filtered.length} of ${allProducts.length} shown`
                            : `${allProducts.length} products`)),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: openSearch, activeOpacity: 0.8, className: "w-10 h-10 rounded-full bg-slate-100 items-center justify-center" },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "search", size: 20, color: "#475569" })),
                        react_1.default.createElement(react_native_1.Pressable, { onPress: () => {
                                react_native_1.InteractionManager.runAfterInteractions(() => {
                                    navigation?.navigate?.("ItemsMenu");
                                });
                            }, className: "w-10 h-10 rounded-full bg-slate-100 items-center justify-center", style: ({ pressed }) => ({
                                opacity: pressed ? 0.7 : 1,
                                backgroundColor: pressed ? "#e2e8f0" : "#f1f5f9",
                            }) },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "ellipsis-horizontal", size: 20, color: "#475569" }))))),
                react_1.default.createElement(react_native_1.View, null,
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowControls((v) => !v), activeOpacity: 0.8, className: "flex-1 flex-row items-center bg-slate-100 rounded-xl px-3 py-2.5" },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "options-outline", size: 16, color: filtersActive ? "#e67e22" : "#94a3b8" }),
                            filtersActive ? (react_1.default.createElement(react_native_1.Text, { className: "flex-1 text-xs font-semibold text-primary mx-2", numberOfLines: 1 }, filterSummary)) : (react_1.default.createElement(react_native_1.Text, { className: "flex-1 text-xs text-slate-400 mx-2" }, "Filter & sort")),
                            filtersActive && (react_1.default.createElement(react_native_1.View, { className: "w-2 h-2 rounded-full bg-primary mr-2" })),
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: showControls ? "chevron-up" : "chevron-down", size: 14, color: "#94a3b8" })),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowCategoryModal(true), activeOpacity: 0.8, className: "h-10 w-10 rounded-xl bg-slate-100 items-center justify-center" },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "grid-outline", size: 18, color: "#475569" })),
                        filtersActive && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                                setFilter("all");
                                setCategoryFilter(null);
                                setSortBy("name");
                            }, activeOpacity: 0.8, className: "h-10 w-10 rounded-xl bg-red-50 items-center justify-center border border-red-100" },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "close", size: 16, color: "#ef4444" })))),
                    showControls && (react_1.default.createElement(react_native_1.View, { className: "mt-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-2" },
                        react_1.default.createElement(react_native_1.View, { className: "mb-2 flex-row items-center" },
                            react_1.default.createElement(react_native_1.View, { className: "mr-2 h-6 w-6 items-center justify-center rounded-lg bg-slate-100" },
                                react_1.default.createElement(vector_icons_1.Ionicons, { name: "grid-outline", size: 13, color: "#64748b" })),
                            react_1.default.createElement(react_native_1.ScrollView, { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: { gap: 6, paddingRight: 8 } },
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setCategoryFilter(null), activeOpacity: 0.8, className: !categoryFilter
                                        ? "px-2.5 py-1 rounded-full border border-primary bg-primary"
                                        : "px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50" },
                                    react_1.default.createElement(react_native_1.Text, { className: !categoryFilter
                                            ? "text-[11px] font-semibold text-white"
                                            : "text-[11px] font-semibold text-slate-600" }, "All")),
                                categories.map((cat) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: cat, onPress: () => setCategoryFilter(categoryFilter === cat ? null : cat), activeOpacity: 0.8, className: categoryFilter === cat
                                        ? "px-2.5 py-1 rounded-full border border-primary bg-primary/10"
                                        : "px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50" },
                                    react_1.default.createElement(react_native_1.Text, { className: categoryFilter === cat
                                            ? "text-[11px] font-semibold text-primary"
                                            : "text-[11px] font-semibold text-slate-600", numberOfLines: 1 }, cat)))))),
                        react_1.default.createElement(react_native_1.View, { className: "mb-2 flex-row items-center" },
                            react_1.default.createElement(react_native_1.View, { className: "mr-2 h-6 w-6 items-center justify-center rounded-lg bg-slate-100" },
                                react_1.default.createElement(vector_icons_1.Ionicons, { name: "funnel-outline", size: 13, color: "#64748b" })),
                            react_1.default.createElement(react_native_1.ScrollView, { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: { gap: 6, paddingRight: 8 } }, [
                                {
                                    key: "all",
                                    label: `All (${allProducts.length})`,
                                },
                                {
                                    key: "low",
                                    label: `Low (${lowCount})`,
                                    disabled: lowCount === 0,
                                },
                                {
                                    key: "out",
                                    label: `Out (${outCount})`,
                                    disabled: outCount === 0,
                                },
                                {
                                    key: "favorites",
                                    label: `Fav (${favoritesCount})`,
                                    disabled: favoritesCount === 0,
                                },
                            ].map(({ key, label, disabled }) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: key, disabled: disabled, onPress: () => requestAnimationFrame(() => setFilter(key)), activeOpacity: 0.8, className: filter === key
                                    ? "px-2.5 py-1 rounded-full border border-primary bg-primary/10"
                                    : disabled
                                        ? "px-2.5 py-1 rounded-full border border-slate-200 bg-slate-100 opacity-40"
                                        : "px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50" },
                                react_1.default.createElement(react_native_1.Text, { className: filter === key
                                        ? "text-[11px] font-semibold text-primary"
                                        : "text-[11px] font-semibold text-slate-600" }, label)))))),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center" },
                            react_1.default.createElement(react_native_1.View, { className: "mr-2 h-6 w-6 items-center justify-center rounded-lg bg-slate-100" },
                                react_1.default.createElement(vector_icons_1.Ionicons, { name: "swap-vertical-outline", size: 13, color: "#64748b" })),
                            react_1.default.createElement(react_native_1.ScrollView, { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: { gap: 6, paddingRight: 8 } }, [
                                { key: "name", label: "Name" },
                                { key: "stockAsc", label: "Stock ↑" },
                                { key: "stockDesc", label: "Stock ↓" },
                                { key: "price", label: "Price ↑" },
                                { key: "priceDesc", label: "Price ↓" },
                                { key: "category", label: "Category" },
                            ].map(({ key, label }) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: key, onPress: () => setSortBy(key), activeOpacity: 0.8, className: sortBy === key
                                    ? "px-2.5 py-1 rounded-full border border-slate-700 bg-slate-700"
                                    : "px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50" },
                                react_1.default.createElement(react_native_1.Text, { className: sortBy === key
                                        ? "text-[11px] font-semibold text-white"
                                        : "text-[11px] font-semibold text-slate-600" }, label))))))))))),
        showHint && (react_1.default.createElement(react_native_1.View, { style: {
                width: "100%",
                maxWidth: contentWidth,
                alignSelf: "center",
                marginTop: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
            }, className: "flex-row items-center justify-between rounded-xl border border-primary/30 bg-primary/5" },
            react_1.default.createElement(react_native_1.Text, { className: "flex-1 text-sm text-slate-800" },
                "Tap ",
                react_1.default.createElement(react_native_1.Text, { className: "font-bold" }, "+"),
                " /",
                " ",
                react_1.default.createElement(react_native_1.Text, { className: "font-bold" }, "\u2212"),
                " to adjust stock. Long-press for custom qty."),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                    setShowHint(false);
                    storage_1.storage.set("items-hint-dismissed", "1");
                }, className: "ml-2" },
                react_1.default.createElement(react_native_1.Text, { className: "text-primary text-xs font-semibold" }, "Got it")))),
        lowCount > 0 && filter === "all" && !search && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => requestAnimationFrame(() => setFilter("low")), style: {
                width: "100%",
                maxWidth: contentWidth,
                alignSelf: "center",
                marginTop: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
            }, className: "bg-amber-50 border border-amber-200 rounded-xl flex-row items-center" },
            react_1.default.createElement(react_native_1.Text, { className: "text-lg mr-2" }, "\u26A0\uFE0F"),
            react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-amber-800" },
                    lowCount,
                    " item",
                    lowCount !== 1 ? "s" : "",
                    " running low"),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-amber-600" }, "Tap to review & restock")),
            react_1.default.createElement(react_native_1.Text, { className: "text-amber-500" }, "\u203A"))),
        react_1.default.createElement(react_native_1.ScrollView, { style: { flex: 1 }, contentContainerStyle: {
                paddingHorizontal: contentPad,
                paddingTop: 12,
                paddingBottom: 12,
                alignItems: "center",
            }, refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching && page === 1, onRefresh: () => {
                    setPage(1);
                    setAccumulatedProducts([]);
                    void qc.invalidateQueries({
                        queryKey: queryKeys_1.QUERY_KEYS.products.all(),
                    });
                } }), onScroll: ({ nativeEvent }) => {
                const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                const padding = 100;
                const isCloseToBottom = layoutMeasurement.height + contentOffset.y >=
                    contentSize.height - padding;
                if (isCloseToBottom && hasMore && !isFetching)
                    loadMore();
            }, scrollEventThrottle: 200, keyboardShouldPersistTaps: "handled" },
            react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth } },
                isFetching && allProducts.length === 0 && (react_1.default.createElement(react_native_1.View, { className: "py-12 items-center" },
                    react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#e67e22" }),
                    react_1.default.createElement(react_native_1.Text, { className: "text-slate-400 text-sm mt-2" }, "Loading products\u2026"))),
                !isFetching && filtered.length === 0 && (react_1.default.createElement(react_native_1.View, { className: "py-12 items-center" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-4xl mb-3" }, "\uD83D\uDCE6"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-slate-600 font-semibold text-base" }, search ? "No products match" : "No products yet"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-slate-400 text-sm mt-1" }, search
                        ? "Try a different search term"
                        : 'Tap "+ Add" to add your first product'))),
                filtered.map((product) => (react_1.default.createElement(ProductCard, { key: product.id, product: product, imageUrl: product.imageUrl?.startsWith("http")
                        ? product.imageUrl
                        : imageUrlsMap[product.id], onPress: () => navigation.navigate("ProductDetail", {
                        id: product.id,
                        product,
                    }), onAdd: () => handleQuickAdjust(product, "add"), onSubtract: () => handleQuickAdjust(product, "subtract"), adjusting: adjustMutation.isPending &&
                        adjustMutation.variables?.id === product.id, onLongPress: () => setAdjustTarget(product), onToggleFavorite: favoriteMutation.isPending
                        ? undefined
                        : () => favoriteMutation.mutate({
                            id: product.id,
                            isFeatured: !product.isFeatured,
                        }) }))),
                hasMore && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: loadMore, disabled: isFetching, className: "py-4 items-center" }, isFetching ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#e67e22", size: "small" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-primary font-semibold text-sm" }, "Load more")))),
                react_1.default.createElement(react_native_1.View, { className: "h-6" }))),
        react_1.default.createElement(AddProductModal, { visible: addOpen, onClose: () => setAddOpen(false), onCreated: () => {
                void qc.invalidateQueries({ queryKey: queryKeys_1.QUERY_KEYS.products.all() });
                setAddOpen(false);
            }, categories: [
                ...new Set(allProducts
                    .map((p) => p.category)
                    .filter((c) => !!c && c.trim() !== "")),
            ].sort() }),
        adjustTarget && (react_1.default.createElement(AdjustStockModal, { product: adjustTarget, onClose: () => setAdjustTarget(null), onAdjusted: () => {
                void qc.invalidateQueries({ queryKey: queryKeys_1.QUERY_KEYS.products.all() });
                setAdjustTarget(null);
            } })),
        react_1.default.createElement(react_native_1.Modal, { visible: showCategoryModal, transparent: true, animationType: "fade", onRequestClose: () => setShowCategoryModal(false) },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 justify-end bg-black/45" },
                react_1.default.createElement(react_native_1.TouchableOpacity, { activeOpacity: 1, className: "flex-1", onPress: () => setShowCategoryModal(false) }),
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-t-[32px] px-4 pt-3 pb-6", style: { maxHeight: "78%" } },
                    react_1.default.createElement(react_native_1.View, { className: "items-center mb-3" },
                        react_1.default.createElement(react_native_1.View, { className: "w-12 h-1.5 rounded-full bg-slate-200" })),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-start justify-between mb-4" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 pr-3" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-slate-800" }, "Explore Categories"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-400 mt-1" }, "Pick a category to filter products instantly")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowCategoryModal(false), activeOpacity: 0.8, className: "w-10 h-10 rounded-full bg-slate-100 items-center justify-center" },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "close", size: 20, color: "#475569" }))),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                            setCategoryFilter(null);
                            setShowCategoryModal(false);
                        }, activeOpacity: 0.8, className: !categoryFilter
                            ? "rounded-2xl border border-primary bg-primary px-4 py-4 mb-3"
                            : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 mb-3" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between" },
                            react_1.default.createElement(react_native_1.View, null,
                                react_1.default.createElement(react_native_1.Text, { className: !categoryFilter
                                        ? "text-xs font-semibold uppercase tracking-wider text-white/80"
                                        : "text-xs font-semibold uppercase tracking-wider text-slate-400" }, "All items"),
                                react_1.default.createElement(react_native_1.Text, { className: !categoryFilter
                                        ? "text-base font-bold text-white mt-1"
                                        : "text-base font-bold text-slate-800 mt-1" }, "All Products")),
                            react_1.default.createElement(react_native_1.Text, { className: !categoryFilter
                                    ? "text-sm font-semibold text-white"
                                    : "text-sm font-semibold text-slate-500" }, allProducts.length))),
                    react_1.default.createElement(react_native_1.ScrollView, { showsVerticalScrollIndicator: false, contentContainerStyle: { paddingBottom: 8 } },
                        react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap justify-between" }, categories.map((cat) => {
                            const active = categoryFilter === cat;
                            return (react_1.default.createElement(react_native_1.TouchableOpacity, { key: cat, onPress: () => {
                                    setCategoryFilter(active ? null : cat);
                                    setShowCategoryModal(false);
                                }, activeOpacity: 0.8, style: { width: "48%", marginBottom: 12 }, className: active
                                    ? "rounded-2xl border border-primary bg-primary/10 px-4 py-4"
                                    : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4" },
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-start justify-between" },
                                    react_1.default.createElement(react_native_1.View, { className: "flex-1 pr-2" },
                                        react_1.default.createElement(react_native_1.Text, { className: active
                                                ? "text-xs font-semibold uppercase tracking-wider text-primary/70"
                                                : "text-xs font-semibold uppercase tracking-wider text-slate-400" }, "Category"),
                                        react_1.default.createElement(react_native_1.Text, { className: active
                                                ? "text-sm font-bold text-primary mt-1"
                                                : "text-sm font-bold text-slate-800 mt-1", numberOfLines: 2 }, cat),
                                        react_1.default.createElement(react_native_1.Text, { className: active
                                                ? "text-xs text-primary/80 mt-2"
                                                : "text-xs text-slate-400 mt-2" },
                                            categoryCounts[cat] ?? 0,
                                            " items")),
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: active
                                            ? "checkmark-circle"
                                            : "chevron-forward-circle-outline", size: 18, color: active ? "#e67e22" : "#94a3b8" }))));
                        })))))),
        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setAddOpen(true), activeOpacity: 0.85, style: {
                position: "absolute",
                bottom: Math.max(insets.bottom, 12),
                right: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 24,
                backgroundColor: "#e67e22",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
            } },
            react_1.default.createElement(vector_icons_1.Ionicons, { name: "add", size: 22, color: "#fff" }),
            react_1.default.createElement(react_native_1.Text, { className: "text-white font-bold text-sm" }, "Add Items"))));
}
// ── ProductCard ───────────────────────────────────────────────────────────────
function ProductCard({ product, imageUrl, onPress, onAdd, onSubtract, adjusting, onLongPress, onToggleFavorite, }) {
    const status = stockStatus(product);
    const s = STATUS_STYLES[status];
    const stockVal = num(product.stock);
    const price = num(product.price);
    const cost = num(product.cost);
    const quantityText = `QTY: ${stockVal}${product.unit ? ` ${product.unit}` : ""}`;
    const a11yLabel = `${product.name}, ${status === "out" ? "Out of stock" : status === "low" ? "Low stock" : "In stock"}, ${stockVal} ${product.unit ?? "units"}`;
    return (react_1.default.createElement(react_native_1.TouchableOpacity, { activeOpacity: 0.75, onPress: onPress, onLongPress: onLongPress, delayLongPress: 500, accessibilityLabel: a11yLabel, accessibilityRole: "button", accessibilityHint: "Tap to view details, long-press to adjust stock", className: "bg-white rounded-2xl border border-slate-200 mb-3 overflow-hidden" },
        onToggleFavorite && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onToggleFavorite, hitSlop: { top: 8, bottom: 8, left: 8, right: 8 }, className: "absolute top-3 left-3 z-10 h-8 w-8 items-center justify-center rounded-full bg-amber-50 border border-amber-100", accessibilityLabel: product.isFeatured ? "Remove from favorites" : "Add to favorites" },
            react_1.default.createElement(vector_icons_1.Ionicons, { name: product.isFeatured ? "star" : "star-outline", size: 18, color: product.isFeatured ? "#f59e0b" : "#94a3b8" }))),
        react_1.default.createElement(react_native_1.View, { className: "absolute top-3 right-3 rounded-full bg-emerald-500 px-2.5 py-1 z-10" },
            react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-bold uppercase tracking-wide text-white" }, quantityText)),
        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center px-4 pt-10 pb-3" },
            react_1.default.createElement(react_native_1.View, { className: "w-10 h-10 rounded-xl bg-primary/10 items-center justify-center mr-3 overflow-hidden" }, imageUrl ? (react_1.default.createElement(react_native_1.Image, { source: { uri: imageUrl }, className: "w-full h-full", resizeMode: "cover" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-xl" }, categoryIcon(product.category)))),
            react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0 mr-2" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-slate-800", numberOfLines: 1 }, product.name),
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-3 mt-1" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-semibold uppercase tracking-wide text-slate-400" }, "Sales Price"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-bold text-slate-700" },
                            "\u20B9",
                            price % 1 === 0 ? price : price.toFixed(2))),
                    react_1.default.createElement(react_native_1.View, { className: "h-3.5 w-px bg-slate-200" }),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-semibold uppercase tracking-wide text-slate-400" }, "Purchase Price"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500" },
                            "\u20B9",
                            cost % 1 === 0 ? cost : cost.toFixed(2)))))),
        react_1.default.createElement(react_native_1.View, { className: "flex-row border-t border-slate-100" },
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                    (0, haptics_1.hapticLight)();
                    onSubtract();
                }, disabled: adjusting || stockVal <= 0, accessibilityLabel: "Subtract one from stock", className: "flex-1 py-2.5 items-center border-r border-slate-100" },
                react_1.default.createElement(react_native_1.Text, { className: `text-lg font-black ${stockVal <= 0 ? "text-slate-200" : "text-red-500"}` }, adjusting ? "…" : "−")),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onLongPress, accessibilityLabel: "Adjust stock with custom quantity", className: "flex-1 py-2.5 items-center border-r border-slate-100" },
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 font-medium" }, "Custom qty")),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                    (0, haptics_1.hapticLight)();
                    onAdd();
                }, disabled: adjusting, accessibilityLabel: "Add one to stock", className: "flex-1 py-2.5 items-center" },
                react_1.default.createElement(react_native_1.Text, { className: `text-lg font-black ${adjusting ? "text-slate-200" : "text-green-600"}` }, adjusting ? "…" : "+")))));
}
// ── AddProductModal ───────────────────────────────────────────────────────────
function AddProductModal({ visible, onClose, onCreated, categories = [], }) {
    const [name, setName] = (0, react_1.useState)("");
    const [price, setPrice] = (0, react_1.useState)("");
    const [unit, setUnit] = (0, react_1.useState)("Piece");
    const [category, setCategory] = (0, react_1.useState)("");
    const [stock, setStock] = (0, react_1.useState)("0");
    const [minStock, setMinStock] = (0, react_1.useState)("5");
    const [barcode, setBarcode] = (0, react_1.useState)("");
    const [scanOpen, setScanOpen] = (0, react_1.useState)(false);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const reset = () => {
        setName("");
        setPrice("");
        setUnit("Piece");
        setCategory("");
        setStock("0");
        setMinStock("5");
        setBarcode("");
    };
    const handleBarcodeScan = async (code) => {
        setBarcode(code);
        try {
            const { product } = await shared_1.productApi.byBarcode(code);
            setName(product.name ?? "");
            setPrice(product.price != null ? String(product.price) : "");
            setUnit(product.unit ?? "Piece");
            if (product.category)
                setCategory(product.category);
            if (product.stock != null)
                setStock(String(product.stock));
        }
        catch {
            // Product not in catalog — just keep barcode for new product
        }
    };
    const handleCreate = async () => {
        if (!name.trim()) {
            (0, alerts_1.showAlert)("Required", "Product name is required");
            return;
        }
        setLoading(true);
        try {
            await api_1.productExtApi.create({
                name: name.trim(),
                price: price ? parseFloat(price) : undefined,
                unit: unit.trim() || "Piece",
                category: category.trim() || undefined,
                stock: parseInt(stock) || 0,
                minStock: parseInt(minStock) || 5,
                barcode: barcode.trim() || undefined,
            });
            reset();
            onCreated();
        }
        catch (e) {
            (0, alerts_1.showAlert)("Error", e.message ?? "Failed to add product");
        }
        finally {
            setLoading(false);
        }
    };
    const UNITS = [
        "Piece",
        "kg",
        "g",
        "litre",
        "ml",
        "packet",
        "box",
        "dozen",
        "bundle",
    ];
    return (react_1.default.createElement(react_native_1.Modal, { visible: visible, animationType: "slide", presentationStyle: "pageSheet", onRequestClose: onClose },
        react_1.default.createElement(react_native_1.KeyboardAvoidingView, { className: "flex-1 bg-white", behavior: react_native_1.Platform.OS === "ios" ? "padding" : undefined },
            react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center border-b border-slate-200 px-4 py-4" },
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onClose, className: "mr-3" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-slate-500 text-base" }, "\u2715")),
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-black text-slate-800 flex-1" }, "Add Product"),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleCreate, disabled: loading || !name.trim(), className: `px-4 py-2 rounded-xl ${loading || !name.trim() ? "bg-slate-200" : "bg-primary"}` },
                        react_1.default.createElement(react_native_1.Text, { className: `font-bold text-sm ${loading || !name.trim() ? "text-slate-400" : "text-white"}` }, loading ? "Saving…" : "Save"))),
                react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1 px-4 pt-4", keyboardShouldPersistTaps: "handled" },
                    react_1.default.createElement(FormField, { label: "Product Name *" },
                        react_1.default.createElement(react_native_1.TextInput, { className: "bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800", placeholder: "e.g. Aata, Amul Butter, Surf Excel", value: name, onChangeText: setName, autoFocus: true, autoCorrect: false })),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                            react_1.default.createElement(FormField, { label: "Selling Price (\u20B9)" },
                                react_1.default.createElement(react_native_1.TextInput, { className: "bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800", placeholder: "0", value: price, onChangeText: setPrice, keyboardType: "decimal-pad" }))),
                        react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                            react_1.default.createElement(FormField, { label: "Unit" },
                                react_1.default.createElement(react_native_1.ScrollView, { horizontal: true, showsHorizontalScrollIndicator: false },
                                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2 py-1" }, UNITS.map((u) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: u, onPress: () => setUnit(u), className: `px-3 py-2 rounded-lg border ${unit === u
                                            ? "bg-primary border-primary"
                                            : "bg-white border-slate-200"}` },
                                        react_1.default.createElement(react_native_1.Text, { className: `text-xs font-semibold ${unit === u ? "text-white" : "text-slate-600"}` }, u))))))))),
                    react_1.default.createElement(FormField, { label: "Category (optional)" },
                        categories.length > 0 && (react_1.default.createElement(react_native_1.ScrollView, { horizontal: true, showsHorizontalScrollIndicator: false, className: "mb-2" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2" }, categories.map((c) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: c, onPress: () => setCategory(c), className: `px-3 py-2 rounded-lg border ${category === c
                                    ? "bg-primary border-primary"
                                    : "bg-white border-slate-200"}` },
                                react_1.default.createElement(react_native_1.Text, { className: `text-xs font-semibold ${category === c ? "text-white" : "text-slate-600"}` }, c))))))),
                        react_1.default.createElement(react_native_1.TextInput, { className: "bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800", placeholder: categories.length > 0
                                ? "Or type new category"
                                : "e.g. Grocery, Dairy, Personal Care", value: category, onChangeText: setCategory, autoCorrect: false })),
                    react_1.default.createElement(FormField, { label: "Barcode (optional)" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden" },
                            react_1.default.createElement(react_native_1.TextInput, { className: "flex-1 px-4 py-3 text-sm text-slate-800", placeholder: "Scan or type barcode", value: barcode, onChangeText: setBarcode, autoCorrect: false, keyboardType: "numeric" }),
                            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setScanOpen(true), className: "w-12 h-12 items-center justify-center border-l border-slate-200" },
                                react_1.default.createElement(vector_icons_1.Ionicons, { name: "barcode-outline", size: 24, color: "#e67e22" })))),
                    react_1.default.createElement(BarcodeScanner_1.BarcodeScanner, { visible: scanOpen, onClose: () => setScanOpen(false), onScan: handleBarcodeScan, hint: "Scan product barcode to prefill" }),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                            react_1.default.createElement(FormField, { label: "Opening Stock" },
                                react_1.default.createElement(react_native_1.TextInput, { className: "bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800", placeholder: "0", value: stock, onChangeText: setStock, keyboardType: "number-pad" }))),
                        react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                            react_1.default.createElement(FormField, { label: "Reorder Point" },
                                react_1.default.createElement(react_native_1.TextInput, { className: "bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800", placeholder: "5", value: minStock, onChangeText: setMinStock, keyboardType: "number-pad" })))),
                    react_1.default.createElement(react_native_1.View, { className: "bg-primary/10 rounded-xl p-4 mt-2" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-primary-700 font-medium" }, "\uD83D\uDCA1 Voice tip: After adding, say \"50 kilo aata aaya\" to add incoming stock by voice instantly.")),
                    react_1.default.createElement(react_native_1.View, { className: "h-8" }))))));
}
// ── AdjustStockModal ──────────────────────────────────────────────────────────
function AdjustStockModal({ product, onClose, onAdjusted, }) {
    const [qty, setQty] = (0, react_1.useState)("1");
    const [op, setOp] = (0, react_1.useState)("add");
    const [reason, setReason] = (0, react_1.useState)("Manual adjustment");
    const [loading, setLoading] = (0, react_1.useState)(false);
    const handleApply = async () => {
        const quantity = parseInt(qty);
        if (!quantity || quantity <= 0) {
            (0, alerts_1.showAlert)("Invalid", "Enter a valid quantity");
            return;
        }
        const currentStock = num(product.stock);
        if (op === "subtract" && quantity > currentStock) {
            (0, alerts_1.showAlert)("Not enough stock", `Only ${currentStock} units available to subtract`);
            return;
        }
        setLoading(true);
        try {
            await api_1.productExtApi.adjustStock(product.id, quantity, op, reason);
            onAdjusted();
        }
        catch (e) {
            (0, alerts_1.showAlert)("Error", e.message ?? "Adjustment failed");
        }
        finally {
            setLoading(false);
        }
    };
    return (react_1.default.createElement(react_native_1.Modal, { visible: true, transparent: true, animationType: "fade", onRequestClose: onClose },
        react_1.default.createElement(react_native_1.TouchableOpacity, { className: "flex-1 bg-black/40 justify-end", activeOpacity: 1, onPress: onClose },
            react_1.default.createElement(react_native_1.TouchableOpacity, { activeOpacity: 1, className: "bg-white rounded-t-3xl px-5 pt-5 pb-10" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center mb-4" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-lg font-black text-slate-800" }, "Adjust Stock"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, product.name),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400" },
                            "Current stock: ",
                            num(product.stock),
                            " ",
                            product.unit ?? "")),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onClose },
                        react_1.default.createElement(react_native_1.Text, { className: "text-slate-400 text-xl" }, "\u2715"))),
                react_1.default.createElement(react_native_1.View, { className: "flex-row bg-slate-100 rounded-xl p-1 mb-4" }, ["add", "subtract"].map((o) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: o, onPress: () => setOp(o), className: `flex-1 py-2.5 rounded-lg items-center ${op === o ? "bg-white shadow-sm" : ""}` },
                    react_1.default.createElement(react_native_1.Text, { className: `font-bold text-sm ${op === o
                            ? o === "add"
                                ? "text-green-600"
                                : "text-red-500"
                            : "text-slate-400"}` }, o === "add" ? "+ Add Stock" : "− Remove Stock"))))),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase mb-1" }, "Quantity"),
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center border border-slate-200 rounded-xl overflow-hidden mb-4" },
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setQty(String(Math.max(1, parseInt(qty || "1") - 1))), className: "px-5 py-3 border-r border-slate-200" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xl font-black text-slate-600" }, "\u2212")),
                    react_1.default.createElement(react_native_1.TextInput, { className: "flex-1 text-center text-xl font-black text-slate-800 py-3", value: qty, onChangeText: (t) => setQty(t.replace(/[^0-9]/g, "")), keyboardType: "number-pad" }),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setQty(String(parseInt(qty || "0") + 1)), className: "px-5 py-3 border-l border-slate-200" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xl font-black text-slate-600" }, "+"))),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase mb-1" }, "Reason"),
                react_1.default.createElement(react_native_1.TextInput, { className: "bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 mb-5", value: reason, onChangeText: setReason, placeholder: "e.g. Supplier delivery, Damage" }),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleApply, disabled: loading, className: `py-4 rounded-2xl items-center ${loading
                        ? "bg-slate-200"
                        : op === "add"
                            ? "bg-green-600"
                            : "bg-red-500"}` },
                    react_1.default.createElement(react_native_1.Text, { className: "text-white font-black text-base" }, loading
                        ? "Applying…"
                        : `${op === "add" ? "Add" : "Remove"} ${qty || 0} ${product.unit ?? "units"}`))))));
}
// ── FormField wrapper ─────────────────────────────────────────────────────────
function FormField({ label, children, }) {
    return (react_1.default.createElement(react_native_1.View, { className: "mb-4" },
        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase mb-1.5" }, label),
        children));
}
// ── Category icon helper ──────────────────────────────────────────────────────
function categoryIcon(category) {
    if (!category)
        return "📦";
    const c = category.toLowerCase();
    if (c.includes("dairy") || c.includes("milk"))
        return "🥛";
    if (c.includes("grocery") ||
        c.includes("grain") ||
        c.includes("atta") ||
        c.includes("rice"))
        return "🌾";
    if (c.includes("oil") || c.includes("ghee"))
        return "🫙";
    if (c.includes("personal") || c.includes("beauty") || c.includes("soap"))
        return "🧴";
    if (c.includes("beverag") ||
        c.includes("drink") ||
        c.includes("tea") ||
        c.includes("coffee"))
        return "☕";
    if (c.includes("snack") || c.includes("biscuit") || c.includes("chips"))
        return "🍪";
    if (c.includes("vegetable") || c.includes("sabzi"))
        return "🥦";
    if (c.includes("fruit"))
        return "🍎";
    if (c.includes("pharma") || c.includes("medicine") || c.includes("drug"))
        return "💊";
    if (c.includes("tobacco") || c.includes("pan"))
        return "🚬";
    if (c.includes("clean") || c.includes("detergent"))
        return "🧹";
    return "📦";
}
//# sourceMappingURL=ItemsScreen.js.map