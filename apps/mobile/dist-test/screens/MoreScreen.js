"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoreScreen = MoreScreen;
/**
 * MoreScreen — Quick access to all features.
 * Modern UI/UX per Expo docs + Apple HIG: grouped list, 44pt touch targets,
 * Pressable feedback, TYPO scale, 8px spacing grid.
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const useResponsive_1 = require("../hooks/useResponsive");
const typography_1 = require("../lib/typography");
const MIN_TOUCH = 44;
const SECTIONS = [
    {
        title: "Finance",
        tiles: [
            { icon: "card", label: "Payment", route: "Payment", color: "#1a9248" },
            {
                icon: "bar-chart",
                label: "Reports",
                route: "Reports",
                color: "#3d7a9e",
            },
            {
                icon: "calendar",
                label: "Day Book",
                route: "DayBook",
                color: "#0ea5e9",
            },
            { icon: "cash", label: "Cash Book", route: "CashBook", color: "#1a9248" },
            {
                icon: "wallet",
                label: "Balance",
                route: "BalanceSheet",
                color: "#1a9248",
            },
        ],
    },
    {
        title: "Business",
        tiles: [
            {
                icon: "business",
                label: "Company",
                route: "CompanyProfile",
                color: "#e67e22",
            },
            { icon: "cube", label: "Stock", route: "Items", color: "#1a9248" },
            { icon: "cart", label: "Expenses", route: "Expenses", color: "#e6a319" },
            {
                icon: "repeat",
                label: "Recurring",
                route: "Recurring",
                color: "#3d7a9e",
            },
            { icon: "bag", label: "Purchases", route: "Purchases", color: "#e67e22" },
            { icon: "time", label: "Overdue", route: "Overdue", color: "#cf2a2a" },
        ],
    },
    {
        title: "Reports & Compliance",
        tiles: [
            { icon: "hourglass", label: "Expiry", route: "Expiry", color: "#e6a319" },
            {
                icon: "swap-horizontal",
                label: "Bank Recon",
                route: "BankRecon",
                color: "#0ea5e9",
            },
            {
                icon: "shield-checkmark",
                label: "Monitor",
                route: "Monitoring",
                color: "#0ea5e9",
            },
            { icon: "document-text", label: "GST", route: "Gstr", color: "#e67e22" },
            {
                icon: "document-text",
                label: "Aging",
                route: "ComingSoon",
                color: "#e6a319",
                params: { title: "Aging Report" },
            },
        ],
    },
    {
        title: "Documents",
        tiles: [
            { icon: "download", label: "Import", route: "Import", color: "#3d7a9e" },
            {
                icon: "receipt",
                label: "Credit Notes",
                route: "CreditNotes",
                color: "#3d7a9e",
            },
            {
                icon: "clipboard",
                label: "Purchase Orders",
                route: "PurchaseOrders",
                color: "#e67e22",
            },
            {
                icon: "document-attach",
                label: "E-Invoice",
                route: "EInvoicing",
                color: "#0ea5e9",
            },
            {
                icon: "cash",
                label: "Indirect Income",
                route: "IndirectIncome",
                color: "#1a9248",
            },
        ],
    },
    {
        title: "More",
        tiles: [
            {
                icon: "card-outline",
                label: "Debit Orders",
                route: "DebitOrders",
                color: "#3d7a9e",
            },
            {
                icon: "car",
                label: "Challans",
                route: "DeliveryChallans",
                color: "#0ea5e9",
            },
            {
                icon: "cube-outline",
                label: "Packaging",
                route: "PackagingLists",
                color: "#e6a319",
            },
            { icon: "book", label: "Journals", route: "Journals", color: "#3d7a9e" },
            {
                icon: "storefront",
                label: "Online Store",
                route: "OnlineStore",
                color: "#e67e22",
            },
            { icon: "apps", label: "Addons", route: "Addons", color: "#0ea5e9" },
            { icon: "cloud", label: "My Drive", route: "MyDrive", color: "#3d7a9e" },
            {
                icon: "school",
                label: "Tutorial",
                route: "Tutorial",
                color: "#1a9248",
            },
        ],
    },
    {
        title: "Account",
        tiles: [
            {
                icon: "chatbubble",
                label: "Feedback",
                route: "Feedback",
                color: "#e67e22",
            },
            {
                icon: "settings",
                label: "Settings",
                route: "Settings",
                color: "#64748b",
            },
        ],
    },
];
function MoreScreen({ navigation }) {
    const { contentPad, contentWidth } = (0, useResponsive_1.useResponsive)();
    const handlePress = (tile) => {
        const parent = navigation.getParent();
        if (tile.route === "Payment") {
            parent?.navigate("CustomersTab", { screen: "Payment" });
            return;
        }
        if (tile.route === "Overdue") {
            parent?.navigate("CustomersTab", { screen: "Overdue" });
            return;
        }
        navigation.navigate(tile.route, (tile.params ?? {}));
    };
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1", contentContainerStyle: {
                paddingHorizontal: contentPad,
                paddingTop: contentPad,
                paddingBottom: 24,
                alignItems: "center",
            }, showsVerticalScrollIndicator: false },
            react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth } },
                react_1.default.createElement(react_native_1.View, { style: { paddingBottom: 24 } },
                    react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.pageTitle }, "More"),
                    react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption + " mt-1" }, "Quick access to all features")),
                react_1.default.createElement(react_native_1.View, { className: "gap-6" }, SECTIONS.map((section, sectionIdx) => (react_1.default.createElement(react_native_1.View, { key: sectionIdx },
                    react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle + " mb-2 px-1" }, section.title),
                    react_1.default.createElement(react_native_1.View, { className: "rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm" }, section.tiles.map((tile, idx) => (react_1.default.createElement(react_native_1.Pressable, { key: tile.route + tile.label, onPress: () => handlePress(tile), className: "flex-row items-center gap-3 px-4 py-3.5", style: ({ pressed }) => ({
                            backgroundColor: pressed ? "#f8fafc" : "#fff",
                            minHeight: MIN_TOUCH + 8,
                            borderBottomWidth: idx < section.tiles.length - 1 ? 1 : 0,
                            borderBottomColor: "#f1f5f9",
                        }) },
                        react_1.default.createElement(react_native_1.View, { className: "w-10 h-10 rounded-xl items-center justify-center", style: { backgroundColor: tile.color + "18" } },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: tile.icon, size: 20, color: tile.color })),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.body + " flex-1" }, tile.label),
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 18, color: "#94a3b8" })))))))))))));
}
//# sourceMappingURL=MoreScreen.js.map