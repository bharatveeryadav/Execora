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
exports.DayBookScreen = DayBookScreen;
/**
 * DayBookScreen — all transactions in one view (per Sprint 10).
 * Combines invoices, payments, expenses, cash in/out.
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const useWsInvalidation_1 = require("../hooks/useWsInvalidation");
const useResponsive_1 = require("../hooks/useResponsive");
const utils_1 = require("../lib/utils");
const constants_1 = require("../lib/constants");
function getRange(period) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (period === "today")
        return { from: today, to: today };
    if (period === "week") {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return { from: start.toISOString().slice(0, 10), to: today };
    }
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString().slice(0, 10), to: today };
}
function DayBookScreen() {
    const [period, setPeriod] = (0, react_1.useState)("today");
    const { contentPad } = (0, useResponsive_1.useResponsive)();
    const { from, to } = getRange(period);
    (0, useWsInvalidation_1.useWsInvalidation)(["invoices", "expenses", "cashbook"]);
    const { data: invData, refetch: refetchInv } = (0, react_query_1.useQuery)({
        queryKey: ["invoices-daybook", from, to],
        queryFn: () => api_1.invoiceApi.list(1, 200),
        staleTime: 30_000,
    });
    const { data: expData, refetch: refetchExp } = (0, react_query_1.useQuery)({
        queryKey: ["expenses-daybook", from, to],
        queryFn: () => api_1.expenseApi.list({ from, to }),
        staleTime: 30_000,
    });
    const { data: cbData, refetch: refetchCb } = (0, react_query_1.useQuery)({
        queryKey: ["cashbook-daybook", from, to],
        queryFn: () => api_1.cashbookApi.get({ from, to }),
        staleTime: 30_000,
    });
    const refetch = (0, react_1.useCallback)(() => {
        refetchInv();
        refetchExp();
        refetchCb();
    }, [refetchCb, refetchExp, refetchInv]);
    const transactions = (0, react_1.useMemo)(() => {
        const list = [];
        const invs = invData?.invoices ?? [];
        invs.forEach((i) => {
            const d = i.createdAt?.slice(0, 10) ?? "";
            if (d >= from && d <= to) {
                list.push({
                    id: `inv-${i.id}`,
                    type: "invoice",
                    date: d,
                    label: `Invoice #${i.invoiceNo ?? i.id}`,
                    amount: Number(i.total ?? 0),
                    sign: "in",
                });
            }
        });
        const exps = expData?.expenses ?? [];
        exps.forEach((e) => {
            list.push({
                id: `exp-${e.id}`,
                type: "expense",
                date: e.date?.slice(0, 10) ?? "",
                label: e.category,
                amount: Math.abs(Number(e.amount)),
                sign: "out",
            });
        });
        const entries = cbData?.entries ?? [];
        entries.forEach((e) => {
            const amt = Math.abs(Number(e.amount));
            list.push({
                id: `cb-${e.id}`,
                type: "cash",
                date: e.date?.slice(0, 10) ?? "",
                label: e.category ?? e.type,
                amount: amt,
                sign: e.type === "in" || Number(e.amount) > 0 ? "in" : "out",
            });
        });
        list.sort((a, b) => b.date.localeCompare(a.date));
        return list;
    }, [invData, expData, cbData, from, to]);
    const { moneyIn, moneyOut } = (0, react_1.useMemo)(() => {
        let inTotal = 0;
        let outTotal = 0;
        for (const t of transactions) {
            if (t.sign === "in")
                inTotal += t.amount;
            else
                outTotal += t.amount;
        }
        return { moneyIn: inTotal, moneyOut: outTotal };
    }, [transactions]);
    const keyExtractor = (0, react_1.useCallback)((t) => t.id, []);
    const renderTransactionItem = (0, react_1.useCallback)(({ item }) => (react_1.default.createElement(react_native_1.View, { style: {
            paddingHorizontal: contentPad,
            paddingVertical: constants_1.SIZES.SPACING.md,
            minHeight: constants_1.SIZES.TOUCH_MIN,
        }, className: "flex-row items-center justify-between border-b border-slate-100" },
        react_1.default.createElement(react_native_1.View, null,
            react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, item.label),
            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, item.date)),
        react_1.default.createElement(react_native_1.Text, { className: item.sign === "in" ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold" },
            item.sign === "in" ? "+" : "-",
            (0, utils_1.formatCurrency)(item.amount)))), [contentPad]);
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 border-b border-slate-100" },
            react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-slate-800" }, "Day Book"),
            react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2 mt-2" }, ["today", "week", "month"].map((p) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: p, onPress: () => requestAnimationFrame(() => setPeriod(p)), style: { minHeight: constants_1.SIZES.TOUCH_MIN }, className: `px-3 py-2 rounded-lg ${period === p ? "bg-primary" : "bg-slate-100"}` },
                react_1.default.createElement(react_native_1.Text, { className: period === p ? "text-white font-semibold text-sm" : "text-slate-600 text-sm" }, p === "today" ? "Today" : p === "week" ? "Week" : "Month")))))),
        react_1.default.createElement(react_native_1.View, { style: {
                paddingHorizontal: contentPad,
                paddingVertical: constants_1.SIZES.SPACING.md,
            }, className: "flex-row bg-slate-50" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, "Money In"),
                react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-emerald-600" }, (0, utils_1.formatCurrency)(moneyIn))),
            react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, "Money Out"),
                react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-red-600" }, (0, utils_1.formatCurrency)(moneyOut)))),
        react_1.default.createElement(react_native_1.FlatList, { data: transactions, keyExtractor: keyExtractor, refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: false, onRefresh: refetch }), renderItem: renderTransactionItem, initialNumToRender: 12, maxToRenderPerBatch: 12, windowSize: 7, removeClippedSubviews: true, ListEmptyComponent: react_1.default.createElement(react_native_1.Text, { className: "text-slate-500 text-center py-8" }, "No transactions") })));
}
//# sourceMappingURL=DayBookScreen.js.map