"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyState = EmptyState;
/**
 * EmptyState — design system component (Sprint 2).
 * Supports emoji (icon) or Ionicons (iconName).
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const utils_1 = require("../../lib/utils");
function EmptyState({ icon = "📭", iconName, title, description, actionLabel, onAction, className, }) {
    return (react_1.default.createElement(react_native_1.View, { className: (0, utils_1.cn)("items-center justify-center py-12 px-6", className) },
        iconName ? (react_1.default.createElement(react_native_1.View, { className: "mb-3" },
            react_1.default.createElement(vector_icons_1.Ionicons, { name: iconName, size: 48, color: "#94a3b8" }))) : (react_1.default.createElement(react_native_1.Text, { className: "text-5xl mb-3" }, icon)),
        react_1.default.createElement(react_native_1.Text, { className: "text-lg font-semibold text-slate-800 dark:text-slate-200 text-center mb-1" }, title),
        description && (react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 dark:text-slate-400 text-center mb-4" }, description)),
        actionLabel && onAction && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onAction, activeOpacity: 0.7, className: "bg-primary px-5 min-h-[44px] py-2.5 rounded-xl items-center justify-center" },
            react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, actionLabel)))));
}
//# sourceMappingURL=EmptyState.js.map