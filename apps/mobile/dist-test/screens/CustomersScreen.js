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
exports.CustomersScreen = CustomersScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const native_1 = require("@react-navigation/native");
const vector_icons_1 = require("@expo/vector-icons");
const api_1 = require("../lib/api");
const useWsInvalidation_1 = require("../hooks/useWsInvalidation");
const useResponsive_1 = require("../hooks/useResponsive");
const shared_1 = require("@execora/shared");
const EmptyState_1 = require("../components/ui/EmptyState");
const ErrorCard_1 = require("../components/ui/ErrorCard");
function CustomersScreen() {
    const navigation = (0, native_1.useNavigation)();
    const { contentPad } = (0, useResponsive_1.useResponsive)();
    (0, useWsInvalidation_1.useWsInvalidation)(["customers", "summary"]);
    const [search, setSearch] = (0, react_1.useState)("");
    const [page, setPage] = (0, react_1.useState)(1);
    const { data, isFetching, isError, refetch } = (0, react_query_1.useQuery)({
        queryKey: ["customers", search, page],
        queryFn: () => search.length >= 1
            ? api_1.customerApi.search(search, 20)
            : api_1.customerApi.list(page, 20),
        staleTime: 10_000,
    });
    const customers = data?.customers ?? [];
    const keyExtractor = (0, react_1.useCallback)((c) => c.id, []);
    const goToOverdue = (0, react_1.useCallback)(() => navigation.navigate("Overdue"), [navigation]);
    const renderCustomerItem = (0, react_1.useCallback)(({ item: c }) => (react_1.default.createElement(react_native_1.TouchableOpacity, { className: "flex-row items-center rounded-xl border border-slate-200 bg-card px-4 py-3 shadow-sm", activeOpacity: 0.7, onPress: () => navigation.navigate("CustomerDetail", { id: c.id }) },
        react_1.default.createElement(react_native_1.View, { className: "w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3" },
            react_1.default.createElement(react_native_1.Text, { className: "text-primary font-bold" }, c.name.charAt(0).toUpperCase())),
        react_1.default.createElement(react_native_1.View, { className: "flex-1" },
            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-slate-800" }, c.name),
            c.phone && (react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mt-0.5" }, c.phone))),
        react_1.default.createElement(react_native_1.View, { className: "items-end" },
            c.balance > 0 && (react_1.default.createElement(react_native_1.View, { className: "bg-amber-100 px-2 py-0.5 rounded-full" },
                react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-semibold text-amber-700" },
                    "\u20B9",
                    (0, shared_1.inr)(c.balance),
                    " due"))),
            c.balance < 0 && (react_1.default.createElement(react_native_1.View, { className: "bg-green-100 px-2 py-0.5 rounded-full" },
                react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-semibold text-green-700" },
                    "\u20B9",
                    (0, shared_1.inr)(Math.abs(c.balance)),
                    " credit"))),
            c.balance === 0 && (react_1.default.createElement(react_native_1.Text, { className: "text-[10px] text-slate-400" }, "settled"))))), [navigation]);
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-background" },
        react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: contentPad, paddingTop: contentPad, paddingBottom: 12 }, className: "border-b border-slate-200 bg-card" },
            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-3" },
                react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold tracking-tight text-slate-800" }, "Parties"),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: goToOverdue, activeOpacity: 0.7, className: "flex-row items-center gap-1.5 bg-red-50 border border-red-100 rounded-xl px-4 min-h-[44px] justify-center" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-bold text-red-600" }, "Udhaar List"))),
            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center border border-slate-200 rounded-xl bg-slate-50 px-3" },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "search", size: 18, color: "#94a3b8", style: { marginRight: 8 } }),
                react_1.default.createElement(react_native_1.TextInput, { value: search, onChangeText: (t) => {
                        setSearch(t);
                        setPage(1);
                    }, placeholder: "Search by name or phone\u2026", placeholderTextColor: "#94a3b8", className: "flex-1 h-11 text-sm text-slate-800" }),
                isFetching && react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: "#e67e22" }))),
        react_1.default.createElement(react_native_1.FlatList, { data: customers, keyExtractor: keyExtractor, refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching, onRefresh: refetch }), contentContainerStyle: { padding: contentPad, paddingBottom: 32 }, initialNumToRender: 12, maxToRenderPerBatch: 12, windowSize: 7, removeClippedSubviews: true, ItemSeparatorComponent: () => react_1.default.createElement(react_native_1.View, { className: "h-2" }), ListEmptyComponent: isError ? (react_1.default.createElement(react_native_1.View, { style: { paddingVertical: 64, paddingHorizontal: contentPad } },
                react_1.default.createElement(ErrorCard_1.ErrorCard, { message: "Failed to load customers", onRetry: () => refetch() }))) : (react_1.default.createElement(EmptyState_1.EmptyState, { iconName: search ? "search-outline" : "people-outline", title: search ? "No customers found" : "No customers yet", description: search ? "Try a different search term" : "Add your first customer to get started" })), renderItem: renderCustomerItem })));
}
//# sourceMappingURL=CustomersScreen.js.map