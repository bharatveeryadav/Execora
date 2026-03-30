"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsScreen = ReportsScreen;
/**
 * ReportsScreen — summary KPIs and report links (per Sprint 11).
 */
const react_1 = __importDefault(require("react"));
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
function ReportsScreen() {
    const { from, to } = getMonthRange();
    const { contentPad, contentWidth } = (0, useResponsive_1.useResponsive)();
    (0, useWsInvalidation_1.useWsInvalidation)(["summary", "expenses"]);
    const { data, refetch, isFetching } = (0, react_query_1.useQuery)({
        queryKey: ["summary-range", from, to],
        queryFn: () => api_1.summaryApi.range(from, to),
        staleTime: 60_000,
    });
    const { data: expData } = (0, react_query_1.useQuery)({
        queryKey: ["expenses-summary", from, to],
        queryFn: () => api_1.expenseApi.summary({ from, to }),
        staleTime: 60_000,
    });
    const summary = data?.summary ?? { totalSales: 0, totalPayments: 0, invoiceCount: 0 };
    const expenses = expData?.total ?? 0;
    const revenue = summary.totalSales;
    const profit = revenue - expenses;
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: contentPad, paddingVertical: 12 }, className: "border-b border-slate-100" },
            react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-slate-800" }, "Reports")),
        react_1.default.createElement(react_native_1.ScrollView, { refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching, onRefresh: refetch }), contentContainerStyle: { padding: contentPad, alignItems: "center", paddingBottom: 32 } },
            react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth } },
                react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-3 mb-6" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-[140px] bg-emerald-50 p-4 rounded-xl border border-emerald-100" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "Revenue"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-emerald-700" }, (0, utils_1.formatCurrency)(revenue))),
                    react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-[140px] bg-red-50 p-4 rounded-xl border border-red-100" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "Expenses"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-red-700" }, (0, utils_1.formatCurrency)(expenses))),
                    react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-[140px] bg-primary/10 p-4 rounded-xl border border-indigo-100" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "Profit"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-primary-700" }, (0, utils_1.formatCurrency)(profit))),
                    react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-[140px] bg-amber-50 p-4 rounded-xl border border-amber-100" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "Bills"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-amber-700" }, summary.invoiceCount))),
                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-600 mb-2" }, "Quick Reports"),
                react_1.default.createElement(react_native_1.View, { className: "gap-2" }, [
                    { label: "Sales Summary", emoji: "📈" },
                    { label: "P&L Report", emoji: "📊" },
                    { label: "GSTR-1", emoji: "🧾" },
                    { label: "Party Statement", emoji: "👥" },
                ].map((r) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: r.label, className: "flex-row items-center p-4 bg-slate-50 rounded-xl border border-slate-100" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-2xl mr-3" }, r.emoji),
                    react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, r.label)))))))));
}
//# sourceMappingURL=ReportsScreen.js.map