"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemsMenuScreen = ItemsMenuScreen;
/**
 * ItemsMenuScreen — Full-page menu for Items/Inventory features.
 * Opened from the ⋯ button in ItemsScreen header.
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const typography_1 = require("../lib/typography");
const MENU_ITEMS = [
    { id: "expiry", icon: "calendar", label: "Product Expiry", action: "expiry" },
    { id: "import", icon: "cloud-upload", label: "Import Products", action: "comingSoon", title: "Import Products" },
    { id: "export", icon: "download", label: "Export Products", action: "comingSoon", title: "Export Products" },
    { id: "bulk", icon: "swap-vertical", label: "Bulk Stock Adjust", action: "comingSoon", title: "Bulk Stock Adjust" },
    { id: "reports", icon: "bar-chart", label: "Stock Reports", action: "comingSoon", title: "Stock Reports" },
];
function ItemsMenuScreen({ navigation }) {
    const nav = navigation;
    function handleMenuPress(item) {
        if (item.action === "expiry") {
            react_native_1.InteractionManager.runAfterInteractions(() => {
                (nav.getParent?.() ?? nav)?.navigate?.("MoreTab", { screen: "Expiry" });
            });
            return;
        }
        if (item.action === "comingSoon" && item.title) {
            (nav.getParent?.() ?? nav)?.navigate?.("MoreTab", {
                screen: "ComingSoon",
                params: { title: item.title },
            });
            return;
        }
    }
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1", contentContainerStyle: { padding: 16 } },
            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle + " mb-3" }, "More"),
            react_1.default.createElement(react_native_1.View, { className: "rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm" }, MENU_ITEMS.map((item, idx) => (react_1.default.createElement(react_native_1.Pressable, { key: item.id, onPress: () => handleMenuPress(item), className: "flex-row items-center gap-3 px-4 py-3.5 min-h-[52]", style: ({ pressed }) => ({
                    backgroundColor: pressed ? "#f8fafc" : "#fff",
                    borderBottomWidth: idx < MENU_ITEMS.length - 1 ? 1 : 0,
                    borderBottomColor: "#f1f5f9",
                }) },
                react_1.default.createElement(react_native_1.View, { className: "w-10 h-10 rounded-lg bg-slate-100 items-center justify-center" },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: item.icon, size: 20, color: "#64748b" })),
                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.body + " flex-1" }, item.label),
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 18, color: "#94a3b8" }))))))));
}
//# sourceMappingURL=ItemsMenuScreen.js.map