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
exports.BalanceSheetScreen = BalanceSheetScreen;
/**
 * BalanceSheetScreen — P&L summary (Sprint 21).
 * GET /api/v1/reports/pnl — revenue, expenses, profit, outstanding
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const utils_1 = require("../lib/utils");
const Chip_1 = require("../components/ui/Chip");
const ErrorCard_1 = require("../components/ui/ErrorCard");
function BalanceSheetScreen() {
    const [fy, setFy] = (0, react_1.useState)(undefined);
    const { data, isFetching, isError, refetch } = (0, react_query_1.useQuery)({
        queryKey: ["reports-pnl", fy],
        queryFn: () => api_1.reportsApi.pnl(fy ? { fy } : undefined),
        staleTime: 60_000,
    });
    const fyRange = (() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        if (m >= 3)
            return { from: `${y}-04-01`, to: `${y + 1}-03-31` };
        return { from: `${y - 1}-04-01`, to: `${y}-03-31` };
    })();
    const { data: expData } = (0, react_query_1.useQuery)({
        queryKey: ["expenses-summary-balance", fyRange.from, fyRange.to],
        queryFn: () => api_1.expenseApi.summary({ from: fyRange.from, to: fyRange.to }),
        staleTime: 60_000,
    });
    const report = data?.report;
    const totals = report?.totals ?? { revenue: 0, expenses: 0, collected: 0, outstanding: 0, netRevenue: 0, collectionRate: 0 };
    const expenses = expData?.total ?? 0;
    const profit = (totals.netRevenue ?? totals.revenue ?? 0) - expenses;
    if (isError) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-background" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 justify-center px-4" },
                react_1.default.createElement(ErrorCard_1.ErrorCard, { message: "Failed to load report", onRetry: () => refetch() }))));
    }
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-background", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "px-4 pt-4 pb-3 border-b border-slate-200 bg-card" },
            react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold tracking-tight text-slate-800 mb-3" }, "Balance / P&L"),
            react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2" },
                react_1.default.createElement(Chip_1.Chip, { label: "Current FY", selected: !fy, onPress: () => setFy(undefined) }))),
        react_1.default.createElement(react_native_1.ScrollView, { refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching, onRefresh: refetch }), contentContainerStyle: { padding: 16 } }, isFetching && !report ? (react_1.default.createElement(react_native_1.View, { className: "py-16 items-center" },
            react_1.default.createElement(react_native_1.ActivityIndicator, { size: "large", color: "#e67e22" }))) : (react_1.default.createElement(react_native_1.View, { className: "gap-4" },
            react_1.default.createElement(react_native_1.View, { className: "bg-emerald-50 rounded-xl p-4 border border-emerald-100" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "Revenue"),
                react_1.default.createElement(react_native_1.Text, { className: "text-2xl font-bold text-emerald-700" }, (0, utils_1.formatCurrency)(totals.revenue ?? 0))),
            react_1.default.createElement(react_native_1.View, { className: "bg-red-50 rounded-xl p-4 border border-red-100" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "Expenses"),
                react_1.default.createElement(react_native_1.Text, { className: "text-2xl font-bold text-red-700" }, (0, utils_1.formatCurrency)(expenses))),
            react_1.default.createElement(react_native_1.View, { className: "bg-primary/10 rounded-xl p-4 border border-primary/20" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "Profit"),
                react_1.default.createElement(react_native_1.Text, { className: "text-2xl font-bold text-primary" }, (0, utils_1.formatCurrency)(profit))),
            react_1.default.createElement(react_native_1.View, { className: "bg-amber-50 rounded-xl p-4 border border-amber-100" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "Outstanding"),
                react_1.default.createElement(react_native_1.Text, { className: "text-2xl font-bold text-amber-700" }, (0, utils_1.formatCurrency)(totals.outstanding ?? 0))),
            react_1.default.createElement(react_native_1.View, { className: "bg-slate-50 rounded-xl p-4 border border-slate-200" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "Collected"),
                react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-slate-800" }, (0, utils_1.formatCurrency)(totals.collected ?? 0)),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mt-1" },
                    "Collection rate: ",
                    (totals.collectionRate ?? 0).toFixed(1),
                    "%")))))));
}
//# sourceMappingURL=BalanceSheetScreen.js.map