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
exports.PurchasesScreen = PurchasesScreen;
/**
 * PurchasesScreen — stock purchases list with add/delete (per Sprint 12).
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const useWsInvalidation_1 = require("../hooks/useWsInvalidation");
const utils_1 = require("../lib/utils");
const BottomSheet_1 = require("../components/ui/BottomSheet");
const Button_1 = require("../components/ui/Button");
const Input_1 = require("../components/ui/Input");
const EmptyState_1 = require("../components/ui/EmptyState");
const useResponsive_1 = require("../hooks/useResponsive");
const constants_1 = require("../lib/constants");
const CATEGORIES = [
    "Stock Purchase",
    "Raw Material",
    "Packaging",
    "Equipment",
    "Office Supplies",
    "Miscellaneous",
];
function getMonthRange() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date();
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}
function PurchasesScreen() {
    const qc = (0, react_query_1.useQueryClient)();
    const { contentPad, contentWidth } = (0, useResponsive_1.useResponsive)();
    const [period, setPeriod] = (0, react_1.useState)("month");
    const [addOpen, setAddOpen] = (0, react_1.useState)(false);
    const [category, setCategory] = (0, react_1.useState)(CATEGORIES[0]);
    const [itemName, setItemName] = (0, react_1.useState)("");
    const [amount, setAmount] = (0, react_1.useState)("");
    const [vendor, setVendor] = (0, react_1.useState)("");
    const [quantity, setQuantity] = (0, react_1.useState)("");
    const [note, setNote] = (0, react_1.useState)("");
    const [date, setDate] = (0, react_1.useState)(new Date().toISOString().slice(0, 10));
    (0, useWsInvalidation_1.useWsInvalidation)(["purchases", "cashbook"]);
    const range = (0, react_1.useMemo)(() => {
        if (period === "week") {
            const now = new Date();
            const start = new Date(now);
            start.setDate(now.getDate() - 7);
            return {
                from: start.toISOString().slice(0, 10),
                to: now.toISOString().slice(0, 10),
            };
        }
        return getMonthRange();
    }, [period]);
    const { data, refetch, isFetching } = (0, react_query_1.useQuery)({
        queryKey: ["purchases", range.from, range.to],
        queryFn: () => api_1.purchaseApi.list({ from: range.from, to: range.to }),
        staleTime: 30_000,
    });
    const createMutation = (0, react_query_1.useMutation)({
        mutationFn: (payload) => api_1.purchaseApi.create(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["purchases"] });
            qc.invalidateQueries({ queryKey: ["cashbook"] });
            setItemName("");
            setAmount("");
            setVendor("");
            setQuantity("");
            setNote("");
            setDate(new Date().toISOString().slice(0, 10));
            setAddOpen(false);
        },
    });
    const deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: (id) => api_1.purchaseApi.remove(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["purchases"] });
            qc.invalidateQueries({ queryKey: ["cashbook"] });
        },
    });
    const handleAdd = (0, react_1.useCallback)(() => {
        const amt = parseFloat(amount);
        if (!itemName.trim()) {
            (0, alerts_1.showAlert)("Required", "Please enter item name.");
            return;
        }
        if (!amount || amt <= 0) {
            (0, alerts_1.showAlert)("Invalid amount", "Please enter a valid amount.");
            return;
        }
        createMutation.mutate({
            category,
            amount: amt,
            itemName: itemName.trim(),
            vendor: vendor.trim() || undefined,
            quantity: quantity.trim() ? parseFloat(quantity) : undefined,
            note: note.trim() || undefined,
            date,
        }, {
            onError: (err) => (0, alerts_1.showAlert)("Error", err?.message ?? "Failed to add purchase"),
        });
    }, [amount, category, createMutation, date, itemName, note, quantity, vendor]);
    const handleDelete = (0, react_1.useCallback)((id, item, amountVal) => {
        (0, alerts_1.showAlert)("Delete purchase", `Delete ${item} for ${(0, utils_1.formatCurrency)(amountVal)}?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () => deleteMutation.mutate(id),
            },
        ]);
    }, [deleteMutation]);
    const keyExtractor = (0, react_1.useCallback)((p) => p.id, []);
    const openAddSheet = (0, react_1.useCallback)(() => setAddOpen(true), []);
    const renderPurchaseItem = (0, react_1.useCallback)(({ item }) => (react_1.default.createElement(react_native_1.TouchableOpacity, { onLongPress: () => handleDelete(item.id, item.category, Number(item.amount)), style: {
            paddingHorizontal: contentPad,
            paddingVertical: constants_1.SIZES.SPACING.md,
            minHeight: constants_1.SIZES.TOUCH_MIN,
        }, className: "flex-row items-center justify-between border-b border-slate-100" },
        react_1.default.createElement(react_native_1.View, null,
            react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-slate-800" }, item.category),
            item.vendor && react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, item.vendor)),
        react_1.default.createElement(react_native_1.Text, { className: "font-bold text-slate-800" }, (0, utils_1.formatCurrency)(Number(item.amount))))), [contentPad, handleDelete]);
    const purchases = data?.purchases ?? [];
    const total = data?.total ?? 0;
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { style: { flex: 1, width: "100%", alignItems: "center" } },
            react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth, flex: 1 } },
                react_1.default.createElement(react_native_1.View, { style: {
                        paddingHorizontal: contentPad,
                        paddingVertical: constants_1.SIZES.SPACING.md,
                    }, className: "border-b border-slate-100" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-slate-800" }, "Purchases"),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: openAddSheet, style: { minHeight: constants_1.SIZES.TOUCH_MIN }, className: "bg-primary px-4 py-2 rounded-lg items-center justify-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, "+ Add"))),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2 mt-2" },
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setPeriod("week"), style: { minHeight: constants_1.SIZES.TOUCH_MIN }, className: `px-4 py-2 rounded-lg ${period === "week" ? "bg-primary" : "bg-slate-100"}` },
                            react_1.default.createElement(react_native_1.Text, { className: period === "week" ? "text-white font-semibold" : "text-slate-600" }, "This Week")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setPeriod("month"), style: { minHeight: constants_1.SIZES.TOUCH_MIN }, className: `px-4 py-2 rounded-lg ${period === "month" ? "bg-primary" : "bg-slate-100"}` },
                            react_1.default.createElement(react_native_1.Text, { className: period === "month" ? "text-white font-semibold" : "text-slate-600" }, "This Month")))),
                react_1.default.createElement(react_native_1.View, { style: {
                        paddingHorizontal: contentPad,
                        paddingVertical: constants_1.SIZES.SPACING.md,
                    }, className: "bg-primary/10" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "Total"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-2xl font-bold text-primary-700" }, (0, utils_1.formatCurrency)(total))),
                react_1.default.createElement(react_native_1.FlatList, { data: purchases, keyExtractor: keyExtractor, refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching, onRefresh: refetch }), renderItem: renderPurchaseItem, initialNumToRender: 10, maxToRenderPerBatch: 10, windowSize: 7, removeClippedSubviews: true, ListEmptyComponent: isFetching ? (react_1.default.createElement(react_native_1.View, { className: "py-16 items-center" },
                        react_1.default.createElement(react_native_1.ActivityIndicator, { size: "large", color: "#e67e22" }))) : (react_1.default.createElement(EmptyState_1.EmptyState, { iconName: "cube-outline", title: "No purchases yet", description: "Record stock purchases here", actionLabel: "Add purchase", onAction: openAddSheet })) }))),
        react_1.default.createElement(BottomSheet_1.BottomSheet, { visible: addOpen, onClose: () => setAddOpen(false), title: "Add Purchase" },
            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-600 mb-2" }, "Category"),
            react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-2 mb-4" }, CATEGORIES.map((c) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: c, onPress: () => setCategory(c), style: { minHeight: constants_1.SIZES.TOUCH_MIN }, className: `px-3 py-2 rounded-lg ${category === c ? "bg-primary" : "bg-slate-100"}` },
                react_1.default.createElement(react_native_1.Text, { className: category === c ? "text-white font-semibold text-sm" : "text-slate-600 text-sm" }, c))))),
            react_1.default.createElement(Input_1.Input, { label: "Item name *", value: itemName, onChangeText: setItemName, placeholder: "e.g. Rice 5kg" }),
            react_1.default.createElement(Input_1.Input, { label: "Amount (\u20B9) *", value: amount, onChangeText: setAmount, keyboardType: "decimal-pad", placeholder: "0" }),
            react_1.default.createElement(Input_1.Input, { label: "Vendor (optional)", value: vendor, onChangeText: setVendor, placeholder: "Supplier name" }),
            react_1.default.createElement(Input_1.Input, { label: "Quantity (optional)", value: quantity, onChangeText: setQuantity, keyboardType: "decimal-pad", placeholder: "e.g. 10" }),
            react_1.default.createElement(Input_1.Input, { label: "Note (optional)", value: note, onChangeText: setNote, placeholder: "Add a note" }),
            react_1.default.createElement(Input_1.Input, { label: "Date", value: date, onChangeText: setDate, placeholder: "YYYY-MM-DD" }),
            react_1.default.createElement(Button_1.Button, { onPress: handleAdd, loading: createMutation.isPending, disabled: !itemName.trim() || !amount || parseFloat(amount) <= 0, className: "mt-4" }, "Add Purchase"))));
}
//# sourceMappingURL=PurchasesScreen.js.map