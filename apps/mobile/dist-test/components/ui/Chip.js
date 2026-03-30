"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chip = Chip;
/**
 * Chip — selectable filter chip (Sprint 2).
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const utils_1 = require("../../lib/utils");
const constants_1 = require("../../lib/constants");
const typography_1 = require("../../lib/typography");
function Chip({ label, selected, onPress, className }) {
    return (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onPress, activeOpacity: 0.7, style: {
            minHeight: constants_1.SIZES.TOUCH_MIN,
            paddingHorizontal: constants_1.SIZES.SPACING.lg,
            paddingVertical: constants_1.SIZES.SPACING.sm,
        }, className: (0, utils_1.cn)("rounded-lg items-center justify-center", selected ? "bg-primary" : "bg-slate-100", className) },
        react_1.default.createElement(react_native_1.Text, { style: { fontSize: constants_1.SIZES.FONT.base }, maxFontSizeMultiplier: typography_1.MAX_FONT_SIZE_MULTIPLIER, className: (0, utils_1.cn)("font-semibold", selected ? "text-white" : "text-slate-600") }, label)));
}
//# sourceMappingURL=Chip.js.map