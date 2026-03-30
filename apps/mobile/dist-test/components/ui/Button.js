"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = Button;
/**
 * Button — design system component (Sprint 2).
 * Variants: primary, outline, ghost, danger; sizes: sm, md, lg.
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const utils_1 = require("../../lib/utils");
const haptics_1 = require("../../lib/haptics");
const constants_1 = require("../../lib/constants");
const typography_1 = require("../../lib/typography");
const variantContainerStyles = {
    primary: "bg-primary border-0",
    outline: "bg-transparent border-2 border-slate-300",
    ghost: "bg-transparent border-0",
    danger: "bg-red-600 border-0",
};
const variantTextStyles = {
    primary: "text-white",
    outline: "text-slate-800",
    ghost: "text-slate-700",
    danger: "text-white",
};
const sizeStyles = {
    sm: {
        minHeight: constants_1.SIZES.BUTTON.sm.minHeight,
        paddingHorizontal: constants_1.SIZES.BUTTON.sm.paddingX,
        paddingVertical: constants_1.SIZES.BUTTON.sm.paddingY,
    },
    md: {
        minHeight: constants_1.SIZES.BUTTON.md.minHeight,
        paddingHorizontal: constants_1.SIZES.BUTTON.md.paddingX,
        paddingVertical: constants_1.SIZES.BUTTON.md.paddingY,
    },
    lg: {
        minHeight: constants_1.SIZES.BUTTON.lg.minHeight,
        paddingHorizontal: constants_1.SIZES.BUTTON.lg.paddingX,
        paddingVertical: constants_1.SIZES.BUTTON.lg.paddingY,
    },
};
const sizeTextStyles = {
    sm: { fontSize: constants_1.SIZES.BUTTON.sm.fontSize },
    md: { fontSize: constants_1.SIZES.BUTTON.md.fontSize },
    lg: { fontSize: constants_1.SIZES.BUTTON.lg.fontSize },
};
function Button({ variant = "primary", size = "md", onPress, disabled, loading, children, className, textClassName, }) {
    const isDisabled = disabled || loading;
    const handlePress = () => {
        if (!isDisabled && onPress) {
            (0, haptics_1.hapticLight)();
            onPress();
        }
    };
    return (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handlePress, disabled: isDisabled, activeOpacity: 0.7, style: sizeStyles[size], className: (0, utils_1.cn)("rounded-lg border items-center justify-center flex-row", variantContainerStyles[variant], isDisabled && "opacity-50", className) }, loading ? (react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: variant === "primary" || variant === "danger" ? "#fff" : "#475569" })) : (react_1.default.createElement(react_native_1.Text, { style: sizeTextStyles[size], maxFontSizeMultiplier: typography_1.MAX_FONT_SIZE_MULTIPLIER, className: (0, utils_1.cn)("font-semibold", variantTextStyles[variant], textClassName) }, children))));
}
//# sourceMappingURL=Button.js.map