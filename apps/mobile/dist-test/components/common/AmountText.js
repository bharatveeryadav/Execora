"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmountText = AmountText;
/**
 * AmountText — ₹ formatted with optional credit/debit color (Sprint 2).
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const utils_1 = require("../../lib/utils");
const utils_2 = require("../../lib/utils");
function AmountText({ amount, type = "neutral", className, }) {
    const n = typeof amount === "string" ? parseFloat(amount) : amount;
    const colorClass = type === "credit"
        ? "text-emerald-600"
        : type === "debit"
            ? "text-red-600"
            : "text-slate-800";
    return (react_1.default.createElement(react_native_1.Text, { className: (0, utils_2.cn)("font-semibold", colorClass, className) }, (0, utils_1.formatCurrency)(n)));
}
//# sourceMappingURL=AmountText.js.map