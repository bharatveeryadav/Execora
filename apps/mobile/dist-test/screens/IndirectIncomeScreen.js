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
exports.IndirectIncomeScreen = IndirectIncomeScreen;
/**
 * IndirectIncomeScreen — Income-type expenses (Sprint 22).
 * expenseApi.list with type=income
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const useWsInvalidation_1 = require("../hooks/useWsInvalidation");
const utils_1 = require("../lib/utils");
const Chip_1 = require("../components/ui/Chip");
const EmptyState_1 = require("../components/ui/EmptyState");
const ErrorCard_1 = require("../components/ui/ErrorCard");
function getPeriodRange(period) {
    const now = new Date();
    let from;
    const to = now;
    if (period === "week") {
        from = new Date(now);
        from.setDate(from.getDate() - 7);
    }
    else {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
    };
}
function IndirectIncomeScreen() {
    const [period, setPeriod] = (0, react_1.useState)("month");
    const { from, to } = (0, react_1.useMemo)(() => getPeriodRange(period), [period]);
    (0, useWsInvalidation_1.useWsInvalidation)(["expenses"]);
    const { data, isFetching, isError, refetch } = (0, react_query_1.useQuery)({
        queryKey: ["expenses-income", from, to],
        queryFn: () => api_1.expenseApi.list({ from, to, type: "income" }),
        staleTime: 30_000,
    });
    const expenses = data?.expenses ?? [];
    const total = data?.total ?? 0;
    const keyExtractor = (0, react_1.useCallback)((e) => e.id, []);
    const renderIncomeItem = (0, react_1.useCallback)(({ item }) => (react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between rounded-xl border border-slate-200 bg-card px-4 py-3" },
        react_1.default.createElement(react_native_1.View, null,
            react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, item.category),
            item.note && (react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, item.note)),
            item.vendor && (react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400" }, item.vendor))),
        react_1.default.createElement(react_native_1.Text, { className: "font-bold text-emerald-600" },
            "+",
            (0, utils_1.formatCurrency)(Number(item.amount))))), []);
    if (isError) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-background" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 justify-center px-4" },
                react_1.default.createElement(ErrorCard_1.ErrorCard, { message: "Failed to load income", onRetry: () => refetch() }))));
    }
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-background", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "px-4 pt-4 pb-3 border-b border-slate-200 bg-card" },
            react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold tracking-tight text-slate-800 mb-3" }, "Indirect Income"),
            react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2" },
                react_1.default.createElement(Chip_1.Chip, { label: "Week", selected: period === "week", onPress: () => setPeriod("week") }),
                react_1.default.createElement(Chip_1.Chip, { label: "Month", selected: period === "month", onPress: () => setPeriod("month") })),
            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-emerald-600 mt-2" },
                "Total: ",
                (0, utils_1.formatCurrency)(total))),
        react_1.default.createElement(react_native_1.FlatList, { data: expenses, keyExtractor: keyExtractor, refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching, onRefresh: refetch }), contentContainerStyle: { padding: 16, paddingBottom: 32 }, initialNumToRender: 12, maxToRenderPerBatch: 12, windowSize: 7, removeClippedSubviews: true, ItemSeparatorComponent: () => react_1.default.createElement(react_native_1.View, { className: "h-2" }), ListEmptyComponent: isFetching ? (react_1.default.createElement(react_native_1.View, { className: "py-16 items-center" },
                react_1.default.createElement(react_native_1.ActivityIndicator, { size: "large", color: "#e67e22" }))) : (react_1.default.createElement(EmptyState_1.EmptyState, { iconName: "wallet-outline", title: "No indirect income", description: "Add income entries from Expenses (type: income)" })), renderItem: renderIncomeItem })));
}
//# sourceMappingURL=IndirectIncomeScreen.js.map