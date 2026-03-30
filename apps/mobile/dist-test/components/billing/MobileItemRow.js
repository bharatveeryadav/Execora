"use strict";
/**
 * MobileItemRow — Compact invoice item row with inline editing
 * Supports product search, barcode scanning, and compact/expanded states
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
exports.MobileItemRow = MobileItemRow;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_query_1 = require("@tanstack/react-query");
const vector_icons_1 = require("@expo/vector-icons");
const shared_1 = require("@execora/shared");
const api_1 = require("../../lib/api");
const BarcodeScanner_1 = require("../common/BarcodeScanner");
const alerts_1 = require("../../lib/alerts");
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
            (0, alerts_1.showError)("No product with this barcode in your catalog.", "Not found");
        }
    }, [handleSelect]);
    return (react_1.default.createElement(react_native_1.View, { className: `px-3 py-1.5 min-w-0 ${isFirst ? "" : "border-t border-slate-100"}` }, !hasProduct ? (
    /* New row: compact search bar */
    react_1.default.createElement(react_native_1.View, { className: "relative min-w-0" },
        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center border border-slate-200 rounded-lg bg-white overflow-hidden min-w-0" },
            react_1.default.createElement(react_native_1.TextInput, { value: item.name, onChangeText: (t) => onUpdate({ name: t }), onFocus: () => setFocused(true), onBlur: () => setTimeout(() => setFocused(false), 200), placeholder: "Type or scan product\u2026", placeholderTextColor: "#94a3b8", className: "flex-1 min-w-0 px-3 h-9 text-sm text-slate-800", autoFocus: isFirst && item.name === "" }),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setScanOpen(true), className: "w-9 h-9 items-center justify-center border-l border-slate-200", hitSlop: { top: 8, bottom: 8, left: 8, right: 8 } },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "barcode-outline", size: 20, color: "#e67e22" }))),
        react_1.default.createElement(BarcodeScanner_1.BarcodeScanner, { visible: scanOpen, onClose: () => setScanOpen(false), onScan: handleBarcodeScan, hint: "Point at product barcode" }),
        focused && suggestions.length > 0 && (react_1.default.createElement(react_native_1.View, { className: "absolute top-10 left-0 right-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg max-h-44 overflow-hidden min-w-0", style: { elevation: 8 } },
            react_1.default.createElement(react_native_1.FlatList, { data: suggestions.slice(0, 6), keyExtractor: (p) => p.id, keyboardShouldPersistTaps: "always", renderItem: ({ item: p }) => {
                    const outOfStock = Number(p.stock) <= 0;
                    const lowStock = !outOfStock && Number(p.stock) < 5;
                    return (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => handleSelect(p), className: "flex-row items-center justify-between px-3 py-2 border-b border-slate-100" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800", numberOfLines: 1 }, p.name),
                            react_1.default.createElement(react_native_1.Text, { className: `text-[11px] ${outOfStock
                                    ? "text-red-500"
                                    : lowStock
                                        ? "text-orange-500"
                                        : "text-slate-400"}` },
                                p.unit,
                                " \u00B7 ",
                                outOfStock ? "Out" : `Stock: ${p.stock}`)),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-primary shrink-0 ml-2" },
                            "\u20B9",
                            getEffectivePrice(p).toLocaleString("en-IN"))));
                } }))))) : expanded ? (
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
//# sourceMappingURL=MobileItemRow.js.map