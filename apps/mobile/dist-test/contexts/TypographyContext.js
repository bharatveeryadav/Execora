"use strict";
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
exports.TypographyProvider = TypographyProvider;
exports.useTypography = useTypography;
/**
 * TypographyContext — provides fontScale-aware typography for dynamic font sizing.
 * Respects system font size (accessibility) while capping scale to prevent layout breakage.
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const typography_1 = require("../lib/typography");
const TypographyContext = (0, react_1.createContext)(null);
function TypographyProvider({ children }) {
    const { fontScale } = (0, react_native_1.useWindowDimensions)();
    const value = (0, react_1.useMemo)(() => ({
        fontScale,
        scaledFont: (0, typography_1.getScaledFont)(fontScale),
        maxFontSizeMultiplier: typography_1.MAX_FONT_SIZE_MULTIPLIER,
    }), [fontScale]);
    return (react_1.default.createElement(TypographyContext.Provider, { value: value }, children));
}
function useTypography() {
    const ctx = (0, react_1.useContext)(TypographyContext);
    if (!ctx) {
        // Fallback when used outside provider (e.g. tests)
        const fontScale = 1;
        return {
            fontScale,
            scaledFont: (0, typography_1.getScaledFont)(fontScale),
            maxFontSizeMultiplier: typography_1.MAX_FONT_SIZE_MULTIPLIER,
        };
    }
    return ctx;
}
//# sourceMappingURL=TypographyContext.js.map