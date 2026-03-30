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
exports.ExpiryScreen = ExpiryScreen;
/**
 * ExpiryScreen — Product expiry management (Sprint 21).
 * GET /api/v1/products/expiry-page, PATCH batches/:id/write-off
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const Chip_1 = require("../components/ui/Chip");
const EmptyState_1 = require("../components/ui/EmptyState");
const ErrorCard_1 = require("../components/ui/ErrorCard");
const haptics_1 = require("../lib/haptics");
const useResponsive_1 = require("../hooks/useResponsive");
const FILTERS = ["expired", "7d", "30d", "90d", "all"];
const FILTER_LABELS = {
    expired: "Expired",
    "7d": "7 days",
    "30d": "30 days",
    "90d": "90 days",
    all: "All",
};
function ExpiryScreen() {
    const qc = (0, react_query_1.useQueryClient)();
    const { contentPad } = (0, useResponsive_1.useResponsive)();
    const [filter, setFilter] = (0, react_1.useState)("30d");
    const { data, isFetching, isError, refetch } = (0, react_query_1.useQuery)({
        queryKey: ["expiry-page", filter],
        queryFn: () => api_1.productExtApi.expiryPage(filter),
        staleTime: 30_000,
    });
    const writeOff = (0, react_query_1.useMutation)({
        mutationFn: (batchId) => api_1.productExtApi.writeOffBatch(batchId),
        onSuccess: () => {
            (0, haptics_1.hapticSuccess)();
            void qc.invalidateQueries({ queryKey: ["expiry-page"] });
            void qc.invalidateQueries({ queryKey: ["products"] });
        },
        onError: (err) => {
            (0, haptics_1.hapticError)();
            (0, alerts_1.showAlert)("Error", err.message ?? "Write-off failed");
        },
    });
    const batches = data?.batches ?? [];
    const summary = data?.summary ?? {
        expiredCount: 0,
        critical7: 0,
        warning30: 0,
        valueAtRisk: 0,
    };
    const handleWriteOff = (0, react_1.useCallback)((batchId, productName) => {
        (0, alerts_1.showAlert)("Write off batch?", `This will reduce stock to 0 for "${productName}". This action cannot be undone.`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Write off",
                style: "destructive",
                onPress: () => writeOff.mutate(batchId),
            },
        ]);
    }, [writeOff]);
    const keyExtractor = (0, react_1.useCallback)((b) => b.id, []);
    const renderBatch = (0, react_1.useCallback)(({ item }) => {
        const isExpired = item.status === "expired";
        return (react_1.default.createElement(react_native_1.View, { className: "rounded-xl border border-slate-200 bg-card px-4 py-3" },
            react_1.default.createElement(react_native_1.View, { className: "flex-row items-start justify-between" },
                react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                    react_1.default.createElement(react_native_1.Text, { className: "font-bold text-slate-800" }, item.product.name),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mt-0.5" },
                        "Batch ",
                        item.batchNo,
                        " ",
                        item.product.unit && `• ${item.quantity} ${item.product.unit}`),
                    react_1.default.createElement(react_native_1.Text, { className: `text-xs mt-1 ${isExpired ? "text-red-600" : "text-amber-600"}` },
                        "Expiry:",
                        " ",
                        new Date(item.expiryDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                        }))),
                isExpired && item.quantity > 0 && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => handleWriteOff(item.id, item.product.name), disabled: writeOff.isPending, className: "bg-red-100 px-3 py-1.5 rounded-lg min-h-[36px] justify-center" }, writeOff.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: "#dc2626" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-red-700" }, "Write off")))))));
    }, [handleWriteOff, writeOff.isPending]);
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-background", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "px-4 pt-4 pb-3 border-b border-slate-200 bg-card" },
            react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold tracking-tight text-slate-800 mb-3" }, "Product Expiry"),
            react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-2" }, FILTERS.map((f) => (react_1.default.createElement(Chip_1.Chip, { key: f, label: FILTER_LABELS[f], selected: filter === f, onPress: () => requestAnimationFrame(() => setFilter(f)) })))),
            react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-3 mt-3" },
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" },
                    "Expired: ",
                    summary.expiredCount),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-amber-600" },
                    "7d: ",
                    summary.critical7),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-amber-500" },
                    "30d: ",
                    summary.warning30),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" },
                    "At risk: \u20B9",
                    summary.valueAtRisk.toLocaleString("en-IN")))),
        isError ? (react_1.default.createElement(react_native_1.View, { style: {
                flex: 1,
                justifyContent: "center",
                paddingHorizontal: contentPad,
            } },
            react_1.default.createElement(ErrorCard_1.ErrorCard, { message: "Failed to load expiry data", onRetry: () => refetch() }))) : (react_1.default.createElement(react_native_1.FlatList, { data: batches, keyExtractor: keyExtractor, refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching, onRefresh: refetch }), contentContainerStyle: { padding: contentPad, paddingBottom: 32 }, initialNumToRender: 12, maxToRenderPerBatch: 12, windowSize: 7, removeClippedSubviews: true, ItemSeparatorComponent: () => react_1.default.createElement(react_native_1.View, { className: "h-2" }), ListEmptyComponent: isFetching ? (react_1.default.createElement(react_native_1.View, { className: "py-16 items-center" },
                react_1.default.createElement(react_native_1.ActivityIndicator, { size: "large", color: "#e67e22" }))) : (react_1.default.createElement(EmptyState_1.EmptyState, { icon: "\u2705", title: "No expiry concerns", description: "No batches found in this filter" })), renderItem: renderBatch }))));
}
//# sourceMappingURL=ExpiryScreen.js.map