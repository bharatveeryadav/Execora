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
exports.FeedbackScreen = FeedbackScreen;
/**
 * FeedbackScreen — NPS (0–10) + optional text feedback.
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const Button_1 = require("../components/ui/Button");
const NPS_LABELS = {
    0: "Not at all likely",
    5: "Neutral",
    10: "Extremely likely",
};
function FeedbackScreen({ navigation }) {
    const [npsScore, setNpsScore] = (0, react_1.useState)(null);
    const [text, setText] = (0, react_1.useState)("");
    const [submitted, setSubmitted] = (0, react_1.useState)(false);
    const submitMutation = (0, react_query_1.useMutation)({
        mutationFn: () => api_1.feedbackApi.submit({
            npsScore: npsScore,
            text: text.trim() || undefined,
        }),
        onSuccess: () => {
            setSubmitted(true);
        },
        onError: (err) => {
            (0, alerts_1.showAlert)("Error", err?.message ?? "Failed to submit feedback");
        },
    });
    const handleSubmit = () => {
        if (npsScore === null) {
            (0, alerts_1.showAlert)("Select a score", "Please select how likely you are to recommend Execora (0–10).");
            return;
        }
        submitMutation.mutate();
    };
    if (submitted) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white", edges: ["top", "bottom"] },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 items-center justify-center px-8" },
                react_1.default.createElement(react_native_1.Text, { className: "text-5xl mb-4" }, "\uD83D\uDE4F"),
                react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-slate-800 text-center mb-2" }, "Thank you for your feedback!"),
                react_1.default.createElement(react_native_1.Text, { className: "text-slate-500 text-center mb-6" }, "We value your input and use it to make Execora better."),
                react_1.default.createElement(Button_1.Button, { onPress: () => navigation.goBack(), variant: "outline" }, "Back"))));
    }
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 border-b border-slate-100" },
            react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-slate-800" }, "Feedback")),
        react_1.default.createElement(react_native_1.View, { className: "px-6 py-6" },
            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600 mb-6" }, "How likely are you to recommend Execora to a friend or colleague?"),
            react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-2 mb-4" }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: n, onPress: () => setNpsScore(n), className: "w-10 h-10 rounded-full items-center justify-center", style: { backgroundColor: npsScore === n ? "#e67e22" : "#f1f5f9" } },
                react_1.default.createElement(react_native_1.Text, { style: { color: npsScore === n ? "#fff" : "#475569", fontWeight: "600" } }, n))))),
            npsScore !== null && NPS_LABELS[npsScore] && (react_1.default.createElement(react_native_1.Text, { className: "text-center text-xs text-slate-500 mb-6" }, NPS_LABELS[npsScore])),
            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-600 mb-2" }, "Anything else? (optional)"),
            react_1.default.createElement(react_native_1.TextInput, { value: text, onChangeText: setText, placeholder: "What do you love? What could be better?", placeholderTextColor: "#94a3b8", multiline: true, numberOfLines: 4, maxLength: 2000, className: "border border-slate-200 rounded-xl px-4 py-3 text-slate-800 bg-white min-h-[100px]", textAlignVertical: "top" }),
            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 mb-6" },
                text.length,
                "/2000"),
            react_1.default.createElement(Button_1.Button, { onPress: handleSubmit, loading: submitMutation.isPending, disabled: npsScore === null }, "Submit Feedback"))));
}
//# sourceMappingURL=FeedbackScreen.js.map