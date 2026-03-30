"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BottomSheet = BottomSheet;
/**
 * BottomSheet — slide-up modal (Sprint 2).
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
function BottomSheet({ visible, onClose, title, children }) {
    return (react_1.default.createElement(react_native_1.Modal, { visible: visible, transparent: true, animationType: "slide", onRequestClose: onClose },
        react_1.default.createElement(react_native_1.Pressable, { onPress: onClose, className: "flex-1 bg-black/40 justify-end" },
            react_1.default.createElement(react_native_1.Pressable, { className: "bg-white rounded-t-3xl max-h-[90%]", onPress: () => { } },
                react_1.default.createElement(react_native_1.KeyboardAvoidingView, { behavior: react_native_1.Platform.OS === "ios" ? "padding" : undefined },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between px-4 py-3 border-b border-slate-100" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800" }, title),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onClose, activeOpacity: 0.7, hitSlop: { top: 12, bottom: 12, left: 12, right: 12 }, className: "min-w-[44px] min-h-[44px] items-center justify-center -mr-2" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-2xl text-slate-400" }, "\u00D7"))),
                    react_1.default.createElement(react_native_1.ScrollView, { keyboardShouldPersistTaps: "handled", contentContainerStyle: { padding: 16, paddingBottom: 32 } }, children))))));
}
//# sourceMappingURL=BottomSheet.js.map