"use strict";
/**
 * OverdueScreen — Customers with unpaid balance (udhaar list).
 *
 * Daily use-case: shopkeeper opens this at the start/end of day to see
 * who owes money and tap to WhatsApp / record payment directly.
 *
 * API: GET /api/v1/customers/overdue
 * Returns: { customers: Array<{ id, name, balance, phone?, landmark? }> }
 */
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
exports.OverdueScreen = OverdueScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const shared_1 = require("@execora/shared");
const shared_2 = require("@execora/shared");
const useResponsive_1 = require("../hooks/useResponsive");
const constants_1 = require("../lib/constants");
function OverdueScreen({ navigation }) {
    const [refreshing, setRefreshing] = (0, react_1.useState)(false);
    const { contentPad, contentWidth } = (0, useResponsive_1.useResponsive)();
    const { data, isFetching, refetch } = (0, react_query_1.useQuery)({
        queryKey: ["customers", "overdue"],
        queryFn: () => (0, shared_1.apiFetch)("/api/v1/customers/overdue"),
        staleTime: 30_000,
    });
    const customers = data?.customers ?? [];
    const totalPending = customers.reduce((s, c) => s + Math.abs(c.balance), 0);
    const onRefresh = (0, react_1.useCallback)(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);
    function openWhatsApp(phone, name, balance) {
        const msg = encodeURIComponent(`Hello ${name}, aapka ${(0, shared_2.inr)(balance)} pending hai. Please settle karein. Thank you!`);
        react_native_1.Linking.openURL(`https://wa.me/${phone.replace(/\D/g, "")}?text=${msg}`);
    }
    function openCustomer(id) {
        navigation.getParent()?.navigate("CustomersTab", {
            screen: "CustomerDetail",
            params: { id },
        });
    }
    const renderItem = ({ item }) => (react_1.default.createElement(react_native_1.TouchableOpacity, { style: styles.card, onPress: () => openCustomer(item.id), activeOpacity: 0.75 },
        react_1.default.createElement(react_native_1.View, { style: styles.cardLeft },
            react_1.default.createElement(react_native_1.Text, { style: styles.customerName, numberOfLines: 1, ellipsizeMode: "tail" }, item.name),
            item.landmark ? (react_1.default.createElement(react_native_1.Text, { style: styles.landmark, numberOfLines: 1, ellipsizeMode: "tail" }, item.landmark)) : null,
            item.phone ? (react_1.default.createElement(react_native_1.Text, { style: styles.phone, numberOfLines: 1, ellipsizeMode: "tail" }, item.phone)) : null),
        react_1.default.createElement(react_native_1.View, { style: styles.cardRight },
            react_1.default.createElement(react_native_1.Text, { style: styles.balance }, (0, shared_2.inr)(Math.abs(item.balance))),
            item.phone ? (react_1.default.createElement(react_native_1.TouchableOpacity, { style: styles.waBtn, onPress: () => openWhatsApp(item.phone, item.name, Math.abs(item.balance)), hitSlop: { top: 8, bottom: 8, left: 8, right: 8 } },
                react_1.default.createElement(react_native_1.Text, { style: styles.waBtnText }, "WhatsApp"))) : null)));
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { style: styles.container },
        react_1.default.createElement(react_native_1.View, { style: { flex: 1, width: "100%", alignItems: "center" } },
            react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth, flex: 1 } },
                react_1.default.createElement(react_native_1.View, { style: [styles.header, { paddingHorizontal: contentPad }] },
                    react_1.default.createElement(react_native_1.Text, { style: styles.headerTitle }, "Overdue / Udhaar"),
                    isFetching && !refreshing ? (react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: "#e67e22" })) : null),
                customers.length > 0 && (react_1.default.createElement(react_native_1.View, { style: [styles.summaryBanner, { paddingHorizontal: contentPad }] },
                    react_1.default.createElement(react_native_1.Text, { style: styles.summaryText },
                        customers.length,
                        " customers \u00B7 Total pending:",
                        " ",
                        react_1.default.createElement(react_native_1.Text, { style: styles.summaryAmount }, (0, shared_2.inr)(totalPending))))),
                react_1.default.createElement(react_native_1.FlatList, { data: customers, keyExtractor: (item) => item.id, renderItem: renderItem, getItemLayout: (_, index) => ({
                        length: 80,
                        offset: 80 * index,
                        index,
                    }), contentContainerStyle: customers.length === 0
                        ? styles.emptyContainer
                        : { ...styles.listContent, padding: contentPad }, refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: refreshing, onRefresh: onRefresh, tintColor: "#e67e22" }), ListEmptyComponent: isFetching ? null : (react_1.default.createElement(react_native_1.View, { style: styles.emptyBox },
                        react_1.default.createElement(react_native_1.Text, { style: styles.emptyIcon }, "\uD83C\uDF89"),
                        react_1.default.createElement(react_native_1.Text, { style: styles.emptyTitle }, "Sab clear hai!"),
                        react_1.default.createElement(react_native_1.Text, { style: styles.emptySubtitle }, "Koi pending balance nahi hai."))) })))));
}
// ── Styles ────────────────────────────────────────────────────────────────────
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8fafc" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        backgroundColor: "#fff",
        borderBottomWidth: react_native_1.StyleSheet.hairlineWidth,
        borderBottomColor: "#e2e8f0",
    },
    headerTitle: {
        fontSize: constants_1.SIZES.FONT.xl,
        fontWeight: "800",
        color: "#0f172a",
    },
    summaryBanner: {
        backgroundColor: "#fff7ed",
        borderBottomWidth: react_native_1.StyleSheet.hairlineWidth,
        borderBottomColor: "#fed7aa",
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    summaryText: { fontSize: constants_1.SIZES.FONT.base, color: "#92400e" },
    summaryAmount: { fontWeight: "700", color: "#dc2626" },
    listContent: { gap: 8 },
    emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: react_native_1.StyleSheet.hairlineWidth,
        borderColor: "#e2e8f0",
        minHeight: 72,
    },
    cardLeft: { flex: 1, minWidth: 0, gap: 2 },
    customerName: {
        fontSize: constants_1.SIZES.FONT.lg,
        fontWeight: "700",
        color: "#0f172a",
        flexShrink: 1,
    },
    landmark: { fontSize: constants_1.SIZES.FONT.sm, color: "#94a3b8", flexShrink: 1 },
    phone: { fontSize: constants_1.SIZES.FONT.sm, color: "#64748b", flexShrink: 1 },
    cardRight: { alignItems: "flex-end", gap: 6, minWidth: 90 },
    balance: {
        fontSize: constants_1.SIZES.FONT.lg,
        fontWeight: "800",
        color: "#dc2626",
    },
    waBtn: {
        backgroundColor: "#25d366",
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        minHeight: constants_1.SIZES.TOUCH_MIN,
        alignItems: "center",
        justifyContent: "center",
    },
    waBtnText: {
        color: "#fff",
        fontSize: constants_1.SIZES.FONT.sm,
        fontWeight: "700",
    },
    emptyBox: { alignItems: "center", gap: 8, paddingTop: 60 },
    emptyIcon: { fontSize: 48 },
    emptyTitle: {
        fontSize: constants_1.SIZES.FONT["2xl"],
        fontWeight: "800",
        color: "#0f172a",
    },
    emptySubtitle: { fontSize: constants_1.SIZES.FONT.base, color: "#64748b" },
});
//# sourceMappingURL=OverdueScreen.js.map