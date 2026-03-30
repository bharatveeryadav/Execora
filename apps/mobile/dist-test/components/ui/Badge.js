"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Badge = Badge;
/**
 * Badge — design system component (Sprint 2).
 * Variants: success, warning, danger, info, muted.
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const utils_1 = require("../../lib/utils");
const variantStyles = {
    success: "bg-emerald-100",
    warning: "bg-amber-100",
    danger: "bg-red-100",
    info: "bg-primary/20",
    muted: "bg-slate-100",
};
const variantTextStyles = {
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-red-700",
    info: "text-primary-700",
    muted: "text-slate-600",
};
function Badge({ variant = "muted", children, className, }) {
    return (react_1.default.createElement(react_native_1.View, { className: (0, utils_1.cn)("px-2 py-0.5 rounded-full self-start", variantStyles[variant], className) },
        react_1.default.createElement(react_native_1.Text, { className: (0, utils_1.cn)("text-xs font-semibold", variantTextStyles[variant]) }, children)));
}
//# sourceMappingURL=Badge.js.map