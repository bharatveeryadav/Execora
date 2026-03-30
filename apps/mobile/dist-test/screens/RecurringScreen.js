"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecurringScreen = RecurringScreen;
/**
 * RecurringScreen — recurring billing templates (per Sprint 12).
 * Placeholder until recurring API is available.
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
function RecurringScreen() {
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 border-b border-slate-100" },
            react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-slate-800" }, "Recurring Billing")),
        react_1.default.createElement(react_native_1.View, { className: "flex-1 items-center justify-center px-8" },
            react_1.default.createElement(react_native_1.Text, { className: "text-4xl mb-4" }, "\uD83D\uDD04"),
            react_1.default.createElement(react_native_1.Text, { className: "text-lg font-semibold text-slate-800 text-center mb-2" }, "Recurring billing"),
            react_1.default.createElement(react_native_1.Text, { className: "text-slate-500 text-center" }, "Set up templates for weekly or monthly invoices. Coming soon."))));
}
//# sourceMappingURL=RecurringScreen.js.map