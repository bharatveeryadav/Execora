"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = Card;
exports.PressableCard = PressableCard;
/**
 * Card — design system component (Sprint 2).
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const utils_1 = require("../../lib/utils");
function Card({ children, className, ...props }) {
    return (react_1.default.createElement(react_native_1.View, { className: (0, utils_1.cn)("rounded-xl border border-slate-200 bg-card p-4 shadow-sm", className), ...props }, children));
}
function PressableCard({ children, onPress, className, ...props }) {
    return (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onPress, activeOpacity: 0.7, className: (0, utils_1.cn)("rounded-xl border border-slate-200 bg-card p-4 shadow-sm", className), ...props }, children));
}
//# sourceMappingURL=Card.js.map