"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComingSoonScreen = ComingSoonScreen;
/**
 * ComingSoonScreen — placeholder for features not yet implemented.
 * Shared by: Debit Orders, Delivery Challans, Packaging Lists, Journals, etc.
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
function ComingSoonScreen({ navigation, route }) {
    const title = route.params?.title ?? "Coming Soon";
    const emoji = route.params?.emoji ?? "🚧";
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "flex-1 items-center justify-center px-8" },
            react_1.default.createElement(react_native_1.Text, { className: "text-6xl mb-4" }, emoji),
            react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-slate-800 text-center mb-2" }, title),
            react_1.default.createElement(react_native_1.Text, { className: "text-slate-500 text-center mb-6" },
                title,
                " is coming soon. We'll notify you when it's ready."),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "bg-primary px-6 py-3 rounded-lg" },
                react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, "Go Back")))));
}
//# sourceMappingURL=ComingSoonScreen.js.map