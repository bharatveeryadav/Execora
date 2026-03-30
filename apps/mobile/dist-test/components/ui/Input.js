"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = Input;
/**
 * Input — design system component (Sprint 2).
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const utils_1 = require("../../lib/utils");
const constants_1 = require("../../lib/constants");
const typography_1 = require("../../lib/typography");
function Input({ label, error, hint, className, containerClassName, ...props }) {
    return (react_1.default.createElement(react_native_1.View, { className: (0, utils_1.cn)("mb-4", containerClassName) },
        label && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: constants_1.SIZES.FONT.sm }, maxFontSizeMultiplier: typography_1.MAX_FONT_SIZE_MULTIPLIER, className: "font-medium text-slate-600 mb-1" }, label)),
        react_1.default.createElement(react_native_1.TextInput, { placeholderTextColor: "#94a3b8", style: {
                minHeight: constants_1.SIZES.TOUCH_MIN,
                paddingVertical: constants_1.SIZES.SPACING.md,
                fontSize: constants_1.SIZES.FONT.base,
            }, maxFontSizeMultiplier: typography_1.MAX_FONT_SIZE_MULTIPLIER, className: (0, utils_1.cn)("border border-slate-200 rounded-xl px-4 text-slate-800 bg-white", error && "border-red-400", className), ...props }),
        error && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: constants_1.SIZES.FONT.sm }, maxFontSizeMultiplier: typography_1.MAX_FONT_SIZE_MULTIPLIER, className: "text-red-600 mt-1" }, error)),
        hint && !error && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: constants_1.SIZES.FONT.sm }, maxFontSizeMultiplier: typography_1.MAX_FONT_SIZE_MULTIPLIER, className: "text-slate-500 mt-1" }, hint))));
}
//# sourceMappingURL=Input.js.map