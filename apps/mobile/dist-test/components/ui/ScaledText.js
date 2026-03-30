"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScaledText = ScaledText;
/**
 * ScaledText — Text that respects system font scale with a safe cap.
 * Use for critical text where layout must not break at 200%+ font size.
 *
 * React Native Text already scales by default (allowFontScaling=true).
 * This component adds maxFontSizeMultiplier to prevent overflow.
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const TypographyContext_1 = require("../../contexts/TypographyContext");
function ScaledText({ style, ...props }) {
    const { maxFontSizeMultiplier } = (0, TypographyContext_1.useTypography)();
    return (react_1.default.createElement(react_native_1.Text, { allowFontScaling: true, maxFontSizeMultiplier: maxFontSizeMultiplier, style: style, ...props }));
}
//# sourceMappingURL=ScaledText.js.map