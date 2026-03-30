"use strict";
/**
 * Reusable Tab Bar component
 * Used in: DashboardScreen, InvoiceListScreen, PartiesScreen, etc.
 * Eliminates duplication of tab switching logic
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
exports.TabBar = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const constants_1 = require("../../lib/constants");
const typography_1 = require("../../lib/typography");
/**
 * Production-ready TabBar component
 * - Supports icons, badges, scroll on small screens
 * - Accessible with testID
 * - Keyboard-aware
 */
exports.TabBar = react_1.default.memo(function TabBar({ tabs, activeTab, onChange, scrollable = false, variant = "default", className = "", }) {
    const handleTabPress = (0, react_1.useCallback)((tabId) => {
        onChange(tabId);
    }, [onChange]);
    const tabContent = (react_1.default.createElement(react_native_1.View, { className: "flex-row gap-0.5" }, tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const baseStyle = variant === "pills"
            ? "rounded-full min-h-[44px] px-4 border border-slate-200"
            : `${scrollable ? "" : "flex-1 "}min-h-[44px] px-3 border-b-2`;
        return (react_1.default.createElement(react_native_1.TouchableOpacity, { key: tab.id, testID: tab.testID, onPress: () => handleTabPress(tab.id), activeOpacity: 0.7, className: `${baseStyle} ${isActive
                ? variant === "pills"
                    ? "border-primary bg-primary"
                    : "border-primary"
                : "border-slate-200"} items-center justify-center flex-row gap-2` },
            tab.icon && (react_1.default.createElement(vector_icons_1.Ionicons, { name: tab.icon, size: 18, color: isActive
                    ? variant === "pills"
                        ? "#fff"
                        : "#e67e22"
                    : "#64748b" })),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: constants_1.SIZES.FONT.base }, maxFontSizeMultiplier: typography_1.MAX_FONT_SIZE_MULTIPLIER, className: `text-sm font-semibold ${isActive
                    ? variant === "pills"
                        ? "text-white"
                        : "text-primary"
                    : "text-slate-600"}`, numberOfLines: 1 }, tab.label),
            tab.badge !== undefined && tab.badge > 0 && (react_1.default.createElement(react_native_1.View, { className: "bg-red-500 rounded-full px-1.5 py-0.5 ml-1" },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: constants_1.SIZES.FONT.xs }, maxFontSizeMultiplier: typography_1.MAX_FONT_SIZE_MULTIPLIER, className: "text-white font-bold" }, tab.badge > 99 ? "99+" : tab.badge)))));
    })));
    return scrollable ? (react_1.default.createElement(react_native_1.ScrollView, { horizontal: true, showsHorizontalScrollIndicator: false, className: `flex-row ${className}` }, tabContent)) : (react_1.default.createElement(react_native_1.View, { className: `flex-row ${className}` }, tabContent));
});
exports.default = exports.TabBar;
//# sourceMappingURL=TabBar.js.map