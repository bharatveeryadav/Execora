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
exports.GstrScreen = GstrScreen;
/**
 * GstrScreen — GSTR-1 / GSTR-3B summary (Sprint 22).
 * GET /api/v1/reports/gstr1
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const Chip_1 = require("../components/ui/Chip");
const ErrorCard_1 = require("../components/ui/ErrorCard");
function GstrScreen() {
    const [fy, setFy] = (0, react_1.useState)(undefined);
    const { data, isFetching, isError, refetch } = (0, react_query_1.useQuery)({
        queryKey: ["reports-gstr1", fy],
        queryFn: () => api_1.reportsApi.gstr1(fy ? { fy } : undefined),
        staleTime: 60_000,
    });
    const report = data?.report;
    const b2b = report?.b2b ?? [];
    const b2cs = report?.b2cs ?? [];
    const hsn = report?.hsn ?? [];
    if (isError) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-background" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 justify-center px-4" },
                react_1.default.createElement(ErrorCard_1.ErrorCard, { message: "Failed to load GSTR report", onRetry: () => refetch() }))));
    }
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-background", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "px-4 pt-4 pb-3 border-b border-slate-200 bg-card" },
            react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold tracking-tight text-slate-800 mb-3" }, "GSTR-1 / GSTR-3B"),
            react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2" },
                react_1.default.createElement(Chip_1.Chip, { label: "Current FY", selected: !fy, onPress: () => setFy(undefined) }))),
        react_1.default.createElement(react_native_1.ScrollView, { refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching, onRefresh: refetch }), contentContainerStyle: { padding: 16 } }, isFetching && !report ? (react_1.default.createElement(react_native_1.View, { className: "py-16 items-center" },
            react_1.default.createElement(react_native_1.ActivityIndicator, { size: "large", color: "#e67e22" }))) : report ? (react_1.default.createElement(react_native_1.View, { className: "gap-4" },
            react_1.default.createElement(react_native_1.View, { className: "bg-slate-50 rounded-xl p-4 border border-slate-200" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "Financial Year"),
                react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800" }, report.fy)),
            react_1.default.createElement(react_native_1.View, { className: "bg-primary/10 rounded-xl p-4 border border-primary/20" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "B2B Invoices"),
                react_1.default.createElement(react_native_1.Text, { className: "text-2xl font-bold text-primary" }, b2b.length)),
            react_1.default.createElement(react_native_1.View, { className: "bg-emerald-50 rounded-xl p-4 border border-emerald-100" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "B2CS (Small)"),
                react_1.default.createElement(react_native_1.Text, { className: "text-2xl font-bold text-emerald-700" }, b2cs.length)),
            react_1.default.createElement(react_native_1.View, { className: "bg-amber-50 rounded-xl p-4 border border-amber-100" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "HSN Summary"),
                react_1.default.createElement(react_native_1.Text, { className: "text-2xl font-bold text-amber-700" },
                    hsn.length,
                    " items")),
            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mt-2" }, "Download PDF/CSV from web app for full export"))) : (react_1.default.createElement(react_native_1.Text, { className: "text-slate-500 text-center py-8" }, "No data")))));
}
//# sourceMappingURL=GstrScreen.js.map