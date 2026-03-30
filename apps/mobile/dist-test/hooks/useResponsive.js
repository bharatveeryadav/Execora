"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BREAKPOINTS = void 0;
exports.useResponsive = useResponsive;
/**
 * useResponsive — production-ready responsive layout for React Native.
 *
 * Uses useWindowDimensions (official API) which auto-updates on rotation,
 * foldables, and font scale changes.
 *
 * Breakpoints (logical px, iOS):
 *   small:  < 360  (iPhone SE)
 *   medium: 360–430 (iPhone 14/15/16)
 *   large:  ≥ 430   (Plus, Pro Max)
 *   tablet: ≥ 768  (iPad mini+)
 *
 * @see https://reactnative.dev/docs/usewindowdimensions
 */
const react_1 = require("react");
const react_native_1 = require("react-native");
const typography_1 = require("../lib/typography");
exports.BREAKPOINTS = {
    small: 360,
    large: 430,
    tablet: 768,
    maxContentWidth: 480,
};
function useResponsive() {
    const { width, height, fontScale } = (0, react_native_1.useWindowDimensions)();
    return (0, react_1.useMemo)(() => ({
        width,
        height,
        fontScale,
        // Scaled font sizes (respects system font scale, clamped to 1.5x max)
        scaledFont: (0, typography_1.getScaledFont)(fontScale),
        // Breakpoint flags
        isSmall: width < exports.BREAKPOINTS.small,
        isLarge: width >= exports.BREAKPOINTS.large,
        isTablet: width >= exports.BREAKPOINTS.tablet,
        // Content padding: 12–24px, scales with width (4% of screen, clamped)
        contentPad: Math.min(24, Math.max(12, Math.round(width * 0.04))),
        // Max content width for centered layouts (tablets)
        maxContentWidth: exports.BREAKPOINTS.maxContentWidth,
        contentWidth: Math.min(width - Math.min(24, Math.max(12, Math.round(width * 0.04))) * 2, exports.BREAKPOINTS.maxContentWidth),
    }), [width, height, fontScale]);
}
//# sourceMappingURL=useResponsive.js.map