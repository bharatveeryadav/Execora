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
exports.PurchaseOrdersScreen = PurchaseOrdersScreen;
/**
 * PurchaseOrdersScreen — Purchase orders list (Sprint 22).
 * GET /api/v1/purchase-orders
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const utils_1 = require("../lib/utils");
const EmptyState_1 = require("../components/ui/EmptyState");
const ErrorCard_1 = require("../components/ui/ErrorCard");
const STATUS_COLORS = {
    draft: "bg-slate-100 text-slate-600",
    sent: "bg-amber-100 text-amber-700",
    received: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};
function PurchaseOrdersScreen() {
    const { data, isFetching, isError, refetch } = (0, react_query_1.useQuery)({
        queryKey: ["purchase-orders"],
        queryFn: () => api_1.purchaseOrderApi.list({ limit: 50 }),
        staleTime: 30_000,
    });
    const orders = data?.purchaseOrders ?? [];
    const keyExtractor = (0, react_1.useCallback)((o) => o.id, []);
    const renderOrder = (0, react_1.useCallback)(({ item }) => {
        const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
        return (react_1.default.createElement(react_native_1.TouchableOpacity, { className: "flex-row items-center rounded-xl border border-slate-200 bg-card px-4 py-3", activeOpacity: 0.7 },
            react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                react_1.default.createElement(react_native_1.Text, { className: "font-bold text-slate-800" }, item.poNo),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, item.supplier?.name ?? "—")),
            react_1.default.createElement(react_native_1.View, { className: "items-end" },
                react_1.default.createElement(react_native_1.Text, { className: "font-bold text-primary" }, (0, utils_1.formatCurrency)(item.total ?? 0)),
                react_1.default.createElement(react_native_1.View, { className: `mt-1 px-2 py-0.5 rounded-full ${sc}` },
                    react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-semibold" }, item.status)))));
    }, []);
    if (isError) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-background" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 justify-center px-4" },
                react_1.default.createElement(ErrorCard_1.ErrorCard, { message: "Failed to load purchase orders", onRetry: () => refetch() }))));
    }
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-background", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "px-4 pt-4 pb-3 border-b border-slate-200 bg-card" },
            react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold tracking-tight text-slate-800" }, "Purchase Orders")),
        react_1.default.createElement(react_native_1.FlatList, { data: orders, keyExtractor: keyExtractor, refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching, onRefresh: refetch }), contentContainerStyle: { padding: 16, paddingBottom: 32 }, initialNumToRender: 12, maxToRenderPerBatch: 12, windowSize: 7, removeClippedSubviews: true, ItemSeparatorComponent: () => react_1.default.createElement(react_native_1.View, { className: "h-2" }), ListEmptyComponent: isFetching ? (react_1.default.createElement(react_native_1.View, { className: "py-16 items-center" },
                react_1.default.createElement(react_native_1.ActivityIndicator, { size: "large", color: "#e67e22" }))) : (react_1.default.createElement(EmptyState_1.EmptyState, { iconName: "document-text-outline", title: "No purchase orders", description: "Create POs from Purchases or web app" })), renderItem: renderOrder })));
}
//# sourceMappingURL=PurchaseOrdersScreen.js.map