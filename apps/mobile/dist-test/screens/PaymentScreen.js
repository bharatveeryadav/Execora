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
exports.PaymentScreen = PaymentScreen;
/**
 * PaymentScreen — Record a payment for a customer.
 * Translated from web Payment.tsx.
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const vector_icons_1 = require("@expo/vector-icons");
const api_1 = require("../lib/api");
const utils_1 = require("../lib/utils");
const alerts_1 = require("../lib/alerts");
const haptics_1 = require("../lib/haptics");
const useResponsive_1 = require("../hooks/useResponsive");
const PAYMENT_METHODS = [
    { value: 'cash', label: '💵 Cash' },
    { value: 'upi', label: '📱 UPI' },
    { value: 'card', label: '💳 Card' },
    { value: 'bank_transfer', label: '🏦 Bank Transfer' },
    { value: 'cheque', label: '📝 Cheque' },
];
function PaymentScreen({ navigation, route }) {
    const { customerId } = route.params ?? {};
    const qc = (0, react_query_1.useQueryClient)();
    const { contentPad, contentWidth } = (0, useResponsive_1.useResponsive)();
    // Search state (if no customerId pre-filled)
    const [search, setSearch] = (0, react_1.useState)('');
    const [selectedCustomerId, setSelectedCustomerId] = (0, react_1.useState)(customerId);
    // Form state
    const [amount, setAmount] = (0, react_1.useState)('');
    const [method, setMethod] = (0, react_1.useState)('cash');
    const [reference, setReference] = (0, react_1.useState)('');
    const [note, setNote] = (0, react_1.useState)('');
    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: custData } = (0, react_query_1.useQuery)({
        queryKey: ['customer', selectedCustomerId],
        queryFn: () => api_1.customerApi.get(selectedCustomerId),
        enabled: !!selectedCustomerId,
        staleTime: 30_000,
    });
    const { data: searchData, isFetching: searching } = (0, react_query_1.useQuery)({
        queryKey: ['customer-search-pay', search],
        queryFn: () => api_1.customerApi.search(search, 6),
        enabled: search.length >= 1 && !selectedCustomerId,
        staleTime: 10_000,
    });
    // ── Mutations ─────────────────────────────────────────────────────────────
    const recordMutation = (0, react_query_1.useMutation)({
        mutationFn: () => api_1.paymentApi.record({
            customerId: selectedCustomerId,
            amount: parseFloat(amount),
            method,
            reference: reference || undefined,
        }),
        onSuccess: () => {
            (0, haptics_1.hapticSuccess)();
            qc.invalidateQueries({ queryKey: ['customers'] });
            qc.invalidateQueries({ queryKey: ['customer', selectedCustomerId] });
            qc.invalidateQueries({ queryKey: ['customer-invoices', selectedCustomerId] });
            qc.invalidateQueries({ queryKey: ['customer-ledger', selectedCustomerId] });
            qc.invalidateQueries({ queryKey: ['invoices'] });
            (0, alerts_1.showAlert)('', '💰 Payment recorded!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        },
        onError: (err) => {
            (0, haptics_1.hapticError)();
            (0, alerts_1.showError)(err?.message ?? 'Failed to record payment');
        },
    });
    // ── Derived ───────────────────────────────────────────────────────────────
    const customer = custData?.customer;
    const balance = (0, utils_1.toFloat)(customer?.balance);
    const searchResults = searchData?.customers ?? [];
    const canSubmit = selectedCustomerId && parseFloat(amount) > 0 && !recordMutation.isPending;
    // ── Render ────────────────────────────────────────────────────────────────
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50", edges: ['top', 'bottom'] },
        react_1.default.createElement(react_native_1.View, { style: { flex: 1, width: '100%', alignItems: 'center' } },
            react_1.default.createElement(react_native_1.View, { style: { width: '100%', maxWidth: contentWidth, flex: 1 } },
                react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: contentPad, paddingVertical: 12 }, className: "bg-white border-b border-slate-100 flex-row items-center" },
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "mr-3 p-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-2xl text-slate-600" }, "\u2190")),
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800" }, "Record Payment")),
                react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1", contentContainerStyle: { padding: contentPad, gap: 14 }, keyboardShouldPersistTaps: "handled" },
                    react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl p-4 shadow-sm" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold uppercase text-slate-400 mb-3" }, "Customer"),
                        selectedCustomerId && customer ? (
                        /* Selected customer card */
                        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center" },
                            react_1.default.createElement(react_native_1.View, { className: `w-10 h-10 rounded-full items-center justify-center mr-3 ${balance > 0 ? 'bg-red-100' : 'bg-green-100'}` },
                                react_1.default.createElement(react_native_1.Text, { className: `font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}` }, customer.name?.charAt(0)?.toUpperCase() ?? '?')),
                            react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-slate-800" }, customer.name),
                                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, customer.phone ?? ''),
                                balance !== 0 && (react_1.default.createElement(react_native_1.Text, { className: `text-xs font-medium mt-0.5 ${balance > 0 ? 'text-red-600' : 'text-green-600'}` }, balance > 0 ? `${(0, utils_1.formatCurrency)(balance)} outstanding` : `${(0, utils_1.formatCurrency)(Math.abs(balance))} credit`))),
                            !customerId && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => { setSelectedCustomerId(undefined); setSearch(''); setAmount(''); }, className: "p-2" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-slate-400 text-lg" }, "\u2715"))))) : (
                        /* Search box */
                        react_1.default.createElement(react_1.default.Fragment, null,
                            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center border border-slate-200 rounded-xl bg-slate-50 px-3 mb-2" },
                                react_1.default.createElement(vector_icons_1.Ionicons, { name: "search", size: 18, color: "#94a3b8", style: { marginRight: 8 } }),
                                react_1.default.createElement(react_native_1.TextInput, { value: search, onChangeText: setSearch, placeholder: "Search customer\u2026", placeholderTextColor: "#94a3b8", className: "flex-1 h-11 text-sm text-slate-800" }),
                                searching && react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: "#e67e22" })),
                            searchResults.length > 0 && (react_1.default.createElement(react_native_1.View, { className: "rounded-xl border border-slate-200 overflow-hidden" }, searchResults.map((c, i) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: c.id, onPress: () => { setSelectedCustomerId(c.id); setSearch(''); if (c.balance > 0)
                                    setAmount(String(c.balance)); }, className: `px-4 py-3 flex-row items-center justify-between ${i > 0 ? 'border-t border-slate-50' : ''}` },
                                react_1.default.createElement(react_native_1.View, null,
                                    react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800" }, c.name),
                                    c.phone && react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400" }, c.phone)),
                                c.balance > 0 && (react_1.default.createElement(react_native_1.Text, { className: "text-xs text-red-500 font-semibold" },
                                    (0, utils_1.formatCurrency)((0, utils_1.toFloat)(c.balance)),
                                    " due")))))))))),
                    react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl p-4 shadow-sm" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold uppercase text-slate-400 mb-2" }, "Amount"),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center border border-slate-200 rounded-xl bg-slate-50 px-3" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-slate-600 text-lg font-semibold mr-2" }, "\u20B9"),
                            react_1.default.createElement(react_native_1.TextInput, { value: amount, onChangeText: setAmount, keyboardType: "numeric", placeholder: "0.00", placeholderTextColor: "#94a3b8", className: "flex-1 h-12 text-xl font-bold text-slate-800" })),
                        balance > 0 && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setAmount(String(balance)), className: "mt-2 self-start" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-primary-600 font-medium" },
                                "Fill full balance: ",
                                (0, utils_1.formatCurrency)(balance))))),
                    react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl p-4 shadow-sm" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold uppercase text-slate-400 mb-3" }, "Payment Method"),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-2" }, PAYMENT_METHODS.map((m) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: m.value, onPress: () => setMethod(m.value), className: `px-4 py-2.5 rounded-xl border ${method === m.value ? 'bg-primary border-primary' : 'border-slate-200 bg-slate-50'}` },
                            react_1.default.createElement(react_native_1.Text, { className: `text-sm font-medium ${method === m.value ? 'text-white' : 'text-slate-600'}` }, m.label)))))),
                    react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl p-4 shadow-sm" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold uppercase text-slate-400 mb-2" },
                            "Reference / UTR ",
                            react_1.default.createElement(react_native_1.Text, { className: "normal-case font-normal" }, "(optional)")),
                        react_1.default.createElement(react_native_1.TextInput, { value: reference, onChangeText: setReference, placeholder: "e.g. UPI ref, cheque no\u2026", placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800" })),
                    selectedCustomerId && parseFloat(amount) > 0 && (react_1.default.createElement(react_native_1.View, { className: "bg-primary/10 border border-primary/30 rounded-2xl p-4" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold uppercase text-primary-400 mb-2" }, "Summary"),
                        react_1.default.createElement(react_native_1.View, { className: "gap-1" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-primary-700" }, "Customer"),
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-primary-800" }, customer?.name ?? '…')),
                            react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-primary-700" }, "Amount"),
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-primary-800" }, (0, utils_1.formatCurrency)(parseFloat(amount)))),
                            react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-primary-700" }, "Method"),
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-primary-800 capitalize" }, method.replace('_', ' '))),
                            balance > 0 && parseFloat(amount) >= balance && (react_1.default.createElement(react_native_1.View, { className: "mt-2 bg-green-100 rounded-xl px-3 py-2" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-green-700 font-medium text-center" }, "\u2705 Full balance cleared"))),
                            balance > 0 && parseFloat(amount) > 0 && parseFloat(amount) < balance && (react_1.default.createElement(react_native_1.View, { className: "mt-2 bg-yellow-50 rounded-xl px-3 py-2" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-yellow-700 text-center" },
                                    "Remaining: ",
                                    (0, utils_1.formatCurrency)(balance - parseFloat(amount)))))))),
                    react_1.default.createElement(react_native_1.View, { className: "h-6" })),
                react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: contentPad }, className: "bg-white border-t border-slate-100 py-4" },
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => recordMutation.mutate(), disabled: !canSubmit, className: `rounded-2xl py-4 items-center ${canSubmit ? 'bg-primary' : 'bg-slate-200'}` }, recordMutation.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff" })) : (react_1.default.createElement(react_native_1.Text, { className: `font-bold text-base ${canSubmit ? 'text-white' : 'text-slate-400'}` }, "\uD83D\uDCB0 Record Payment"))))))));
}
//# sourceMappingURL=PaymentScreen.js.map