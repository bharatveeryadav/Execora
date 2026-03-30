"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillsMenuScreen = BillsMenuScreen;
/**
 * BillsMenuScreen — Full-page menu for Bills features.
 * Replaces the popup modal; user can navigate to features and easily go back to Bills.
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const typography_1 = require("../lib/typography");
const useResponsive_1 = require("../hooks/useResponsive");
const MENU_ITEMS = [
    { id: "expenses", icon: "cart", label: "Expenses", action: "screen", screen: "Expenses" },
    { id: "sales", icon: "document-text", label: "Sales Order", action: "billing" },
    { id: "purchases", icon: "cube", label: "Purchase Order", action: "screen", screen: "Purchases" },
    { id: "eway", icon: "car", label: "E-Way Bills", action: "screen", screen: "EInvoicing" },
    { id: "payment", icon: "wallet", label: "Payments", action: "screen", screen: "Payment" },
    { id: "credit", icon: "receipt", label: "Credit Notes", action: "screen", screen: "CreditNotes" },
    { id: "debit", icon: "document", label: "Debit Notes", action: "comingSoon", title: "Debit Notes" },
];
const QUICK_LINKS = [
    { id: "reports", icon: "bar-chart", label: "Reports", screen: "Reports" },
    { id: "analytics", icon: "trending-up", label: "Analytics", screen: "Reports" },
    { id: "aging", icon: "time", label: "Aging", screen: "ComingSoon", params: { title: "Aging Report" } },
    { id: "overdue", icon: "alert-circle", label: "Overdue", screen: "Overdue" },
];
function BillsMenuScreen({ navigation }) {
    const nav = navigation;
    const { contentPad: pad, contentWidth } = (0, useResponsive_1.useResponsive)();
    function handleMenuPress(item) {
        if (item.action === "billing") {
            nav.getParent()?.navigate("MoreTab", { screen: "Billing", params: { screen: "BillingForm" } });
            return;
        }
        if (item.action === "comingSoon" && item.title) {
            nav.navigate("ComingSoon", { title: item.title });
            return;
        }
        if (item.screen)
            nav.navigate(item.screen);
    }
    function handleQuickLink(item) {
        nav.navigate(item.screen, item.params);
    }
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1", contentContainerStyle: { padding: pad, alignItems: "center", paddingBottom: 32 } },
            react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth } },
                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle + " mb-3" }, "Menu"),
                react_1.default.createElement(react_native_1.View, { className: "rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm" }, MENU_ITEMS.map((item, idx) => (react_1.default.createElement(react_native_1.Pressable, { key: item.id, onPress: () => handleMenuPress(item), className: "flex-row items-center gap-3 px-4 py-3.5 min-h-[52]", style: ({ pressed }) => ({
                        backgroundColor: pressed ? "#f8fafc" : "#fff",
                        borderBottomWidth: idx < MENU_ITEMS.length - 1 ? 1 : 0,
                        borderBottomColor: "#f1f5f9",
                    }) },
                    react_1.default.createElement(react_native_1.View, { className: "w-10 h-10 rounded-lg bg-slate-100 items-center justify-center" },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: item.icon, size: 20, color: "#64748b" })),
                    react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.body + " flex-1 min-w-0", numberOfLines: 1 }, item.label),
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 18, color: "#94a3b8" }))))),
                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle + " mt-6 mb-3" }, "Quick links"),
                react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-2" }, QUICK_LINKS.map((item) => (react_1.default.createElement(react_native_1.Pressable, { key: item.label, onPress: () => handleQuickLink(item), className: "flex-row items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 min-h-[48] bg-white min-w-0", style: ({ pressed }) => ({ opacity: pressed ? 0.7 : 1 }) },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: item.icon, size: 18, color: "#64748b" }),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-700 min-w-0", numberOfLines: 1 }, item.label)))))))));
}
//# sourceMappingURL=BillsMenuScreen.js.map