"use strict";
/**
 * ProductPickerModal — Modal for browsing/searching product catalog
 * Used in BillingScreen to add items to invoice
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
exports.ProductPickerModal = ProductPickerModal;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const shared_1 = require("@execora/shared");
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
    const renderProductItem = (0, react_1.useCallback)(({ item: p }) => {
        const outOfStock = Number(p.stock) <= 0;
        const lowStock = !outOfStock && Number(p.stock) < 5;
        return (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => onSelect(p), className: "flex-row items-center justify-between px-4 py-3 border-b border-slate-50" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800", numberOfLines: 1 }, p.name),
                react_1.default.createElement(react_native_1.Text, { className: `text-[11px] ${outOfStock
                        ? "text-red-500"
                        : lowStock
                            ? "text-orange-500"
                            : "text-slate-400"}` },
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
            react_1.default.createElement(react_native_1.FlatList, { data: filtered, keyExtractor: keyExtractor, keyboardShouldPersistTaps: "always", className: "max-h-80", ListHeaderComponent: listHeader, renderItem: renderProductItem, initialNumToRender: 12, maxToRenderPerBatch: 12, windowSize: 7, removeClippedSubviews: true, ListEmptyComponent: react_1.default.createElement(react_native_1.View, { className: "py-8 items-center" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-slate-400 text-sm" }, search ? "No products match" : "No products in catalog")) }))));
}
//# sourceMappingURL=ProductPickerModal.js.map