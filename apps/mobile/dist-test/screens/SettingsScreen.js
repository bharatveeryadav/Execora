"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsScreen = SettingsScreen;
/**
 * SettingsScreen — app settings (per Sprint 13).
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const AuthContext_1 = require("../contexts/AuthContext");
const useResponsive_1 = require("../hooks/useResponsive");
function SettingsScreen({ navigation }) {
    const { logout } = (0, AuthContext_1.useAuth)();
    const { contentPad } = (0, useResponsive_1.useResponsive)();
    const handleLogout = () => {
        (0, alerts_1.showAlert)("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: () => logout(),
            },
        ]);
    };
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 border-b border-slate-100" },
            react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-slate-800" }, "Settings")),
        react_1.default.createElement(react_native_1.ScrollView, { contentContainerStyle: { padding: contentPad } },
            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-500 uppercase mb-2" }, "Profile"),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.navigate("CompanyProfile"), className: "p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4" },
                react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, "Business Profile"),
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, "Company name, GSTIN, address")),
            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-500 uppercase mb-2" }, "General"),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.navigate("SettingsThermal"), className: "p-4 bg-slate-50 rounded-xl border border-slate-100 mb-2" },
                react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, "Thermal Print"),
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, "58mm/80mm receipt, header, footer")),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.navigate("DocumentSettings"), className: "p-4 bg-slate-50 rounded-xl border border-slate-100 mb-2" },
                react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, "Document Settings"),
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, "Templates, appearance, layout, header & footer")),
            react_1.default.createElement(react_native_1.TouchableOpacity, { className: "p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4" },
                react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, "Theme"),
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, "Light / Dark / System")),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleLogout, className: "p-4 bg-red-50 rounded-xl border border-red-100 mt-4" },
                react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-red-600" }, "Logout")),
            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 text-center mt-8" }, "Execora v0.1.0"))));
}
//# sourceMappingURL=SettingsScreen.js.map