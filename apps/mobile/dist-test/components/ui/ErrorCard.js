"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCard = ErrorCard;
/**
 * ErrorCard — error state with retry (Sprint 19).
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const utils_1 = require("../../lib/utils");
function ErrorCard({ message = "Something went wrong", onRetry, className, }) {
    return (react_1.default.createElement(react_native_1.View, { className: (0, utils_1.cn)("rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-4 items-center", className) },
        react_1.default.createElement(vector_icons_1.Ionicons, { name: "alert-circle", size: 32, color: "#dc2626" }),
        react_1.default.createElement(react_native_1.Text, { className: "text-slate-800 dark:text-slate-200 font-medium mt-2 text-center" }, message),
        onRetry && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onRetry, activeOpacity: 0.7, className: "mt-3 bg-primary min-h-[44px] min-w-[120px] px-4 py-2.5 rounded-xl items-center justify-center" },
            react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, "Retry")))));
}
//# sourceMappingURL=ErrorCard.js.map