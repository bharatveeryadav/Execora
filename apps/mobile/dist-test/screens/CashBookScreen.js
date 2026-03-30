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
exports.CashBookScreen = CashBookScreen;
/**
 * CashBookScreen — cash in/out ledger (per Sprint 10).
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const useWsInvalidation_1 = require("../hooks/useWsInvalidation");
const useResponsive_1 = require("../hooks/useResponsive");
const utils_1 = require("../lib/utils");
function getMonthRange() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date();
    return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
    };
}
function CashBookScreen() {
    const { from, to } = (0, react_1.useMemo)(() => getMonthRange(), []);
    const { contentPad } = (0, useResponsive_1.useResponsive)();
    (0, useWsInvalidation_1.useWsInvalidation)(["cashbook", "expenses"]);
    const { data, refetch, isFetching } = (0, react_query_1.useQuery)({
        queryKey: ["cashbook", from, to],
        queryFn: () => api_1.cashbookApi.get({ from, to }),
        staleTime: 30_000,
    });
    const entries = data?.entries ?? [];
    const totalIn = data?.totalIn ?? 0;
    const totalOut = data?.totalOut ?? 0;
    const balance = data?.balance ?? 0;
    const keyExtractor = (0, react_1.useCallback)((e) => e.id, []);
    const renderCashbookItem = (0, react_1.useCallback)(({ item }) => {
        const amt = Number(item.amount);
        const isIn = item.type === "in" || amt > 0;
        return (react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: contentPad, paddingVertical: 12 }, className: "flex-row items-center justify-between border-b border-slate-100" },
            react_1.default.createElement(react_native_1.View, null,
                react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, item.category ?? item.type),
                item.note && (react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, item.note))),
            react_1.default.createElement(react_native_1.Text, { className: isIn ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold" },
                isIn ? "+" : "-",
                (0, utils_1.formatCurrency)(Math.abs(amt)))));
    }, [contentPad]);
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 border-b border-slate-100" },
            react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-slate-800" }, "Cash Book")),
        react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: contentPad, paddingVertical: contentPad }, className: "bg-slate-50" },
            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "Net Cash"),
            react_1.default.createElement(react_native_1.Text, { className: `text-2xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}` }, (0, utils_1.formatCurrency)(balance)),
            react_1.default.createElement(react_native_1.View, { className: "flex-row gap-4 mt-2" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-emerald-600" },
                    "In: ",
                    (0, utils_1.formatCurrency)(totalIn)),
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-red-600" },
                    "Out: ",
                    (0, utils_1.formatCurrency)(totalOut)))),
        react_1.default.createElement(react_native_1.FlatList, { data: entries, keyExtractor: keyExtractor, refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching, onRefresh: refetch }), renderItem: renderCashbookItem, initialNumToRender: 12, maxToRenderPerBatch: 12, windowSize: 7, removeClippedSubviews: true, ListEmptyComponent: react_1.default.createElement(react_native_1.Text, { className: "text-slate-500 text-center py-8" }, "No entries") })));
}
//# sourceMappingURL=CashBookScreen.js.map