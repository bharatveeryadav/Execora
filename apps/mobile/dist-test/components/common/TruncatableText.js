"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TruncatableText = TruncatableText;
/**
 * TruncatableText — Prevents text overflow across all devices.
 *
 * React Native best practices (reactnative.dev):
 * - numberOfLines + ellipsizeMode truncates long text
 * - flexShrink: 1 allows Text to shrink in flex layouts
 * - Parent must have minWidth: 0 (min-w-0) for flex shrink to work
 *
 * Usage: Wrap in a View with min-w-0 flex-1 for row layouts:
 *   <View className="flex-1 min-w-0">
 *     <TruncatableText numberOfLines={1}>{name}</TruncatableText>
 *   </View>
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
function TruncatableText({ numberOfLines = 1, ellipsizeMode = "tail", style, children, ...rest }) {
    return (react_1.default.createElement(react_native_1.Text, { numberOfLines: numberOfLines, ellipsizeMode: ellipsizeMode, style: [styles.base, style], ...rest }, children));
}
const styles = react_native_1.StyleSheet.create({
    base: {
        flexShrink: 1,
    },
});
//# sourceMappingURL=TruncatableText.js.map