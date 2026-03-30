"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = Header;
/**
 * Header — back button + title + right slot (Sprint 2).
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const native_1 = require("@react-navigation/native");
const utils_1 = require("../../lib/utils");
function Header({ title, subtitle, showBack = true, rightSlot, className, }) {
    const navigation = (0, native_1.useNavigation)();
    return (react_1.default.createElement(react_native_1.View, { className: (0, utils_1.cn)("flex-row items-center px-4 py-3 border-b border-slate-100 bg-white", className) },
        showBack && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "mr-3 p-1 -ml-1" },
            react_1.default.createElement(react_native_1.Text, { className: "text-2xl text-slate-600" }, "\u2190"))),
        react_1.default.createElement(react_native_1.View, { className: "flex-1" },
            react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800" }, title),
            subtitle && (react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, subtitle))),
        rightSlot));
}
//# sourceMappingURL=Header.js.map