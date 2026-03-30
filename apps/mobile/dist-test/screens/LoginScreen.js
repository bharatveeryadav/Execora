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
exports.LoginScreen = LoginScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const storage_1 = require("../lib/storage");
const AuthContext_1 = require("../contexts/AuthContext");
function LoginScreen({ onLogin }) {
    const { loginWithUser } = (0, AuthContext_1.useAuth)();
    const [email, setEmail] = (0, react_1.useState)("");
    const [password, setPassword] = (0, react_1.useState)("");
    const [backendReachable, setBackendReachable] = (0, react_1.useState)(null);
    const [checking, setChecking] = (0, react_1.useState)(false);
    const checkBackend = react_1.default.useCallback(() => {
        setChecking(true);
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        fetch(`${(0, api_1.getApiBaseUrl)()}/health`, { signal: ctrl.signal })
            .then(() => setBackendReachable(true))
            .catch(() => setBackendReachable(false))
            .finally(() => {
            clearTimeout(t);
            setChecking(false);
        });
    }, []);
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        fetch(`${(0, api_1.getApiBaseUrl)()}/health`, { signal: ctrl.signal })
            .then(() => !cancelled && setBackendReachable(true))
            .catch(() => !cancelled && setBackendReachable(false))
            .finally(() => clearTimeout(t));
        return () => {
            cancelled = true;
            ctrl.abort();
        };
    }, []);
    const login = (0, react_query_1.useMutation)({
        mutationFn: () => api_1.authApi.login(email.trim(), password),
        onSuccess: (data) => {
            storage_1.tokenStorage.setTokens(data.accessToken, data.refreshToken);
            const u = data.user;
            if (u?.id)
                loginWithUser(u);
            else
                onLogin?.();
        },
        onError: (err) => {
            const msg = err.message;
            const isNetworkError = msg.includes("Network") ||
                msg.includes("fetch") ||
                msg.includes("Failed to fetch") ||
                msg.includes("Connection") ||
                msg.includes("ECONNREFUSED") ||
                msg.includes("timeout");
            if (isNetworkError)
                setBackendReachable(false);
            const title = isNetworkError ? "Cannot reach backend" : "Login failed";
            const body = isNetworkError
                ? "Check:\n\n1) API is running (pnpm dev)\n2) EXPO_PUBLIC_API_URL in .env points to your machine\n3) On physical phone: use your PC's LAN IP (e.g. http://192.168.1.x:3006)\n4) On emulator: use http://10.0.2.2:3006"
                : msg;
            (0, alerts_1.showAlert)(title, body);
        },
    });
    const canSubmit = email.includes("@") && password.length >= 1;
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-background" },
        react_1.default.createElement(react_native_1.KeyboardAvoidingView, { className: "flex-1", behavior: react_native_1.Platform.OS === "ios" ? "padding" : "height", keyboardVerticalOffset: react_native_1.Platform.OS === "ios" ? 0 : 20 },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 px-6 justify-center" },
                react_1.default.createElement(react_native_1.Text, { className: "text-3xl font-bold tracking-tight" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-primary" }, "EXECORA")),
                react_1.default.createElement(react_native_1.Text, { className: "text-muted-foreground text-sm mb-10" }, "Smart billing for Indian businesses"),
                backendReachable === false && (react_1.default.createElement(react_native_1.View, { className: "bg-destructive/15 border border-destructive/40 rounded-xl px-4 py-3 mb-6" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-destructive font-semibold text-sm" }, "Cannot reach backend"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-destructive/90 text-xs mt-1" },
                        "1) API is running (pnpm dev)",
                        "\n",
                        "2) EXPO_PUBLIC_API_URL in .env points to your machine",
                        "\n",
                        "3) On physical phone: use your PC's LAN IP (e.g. http://192.168.1.x:3006)",
                        "\n",
                        "4) On emulator: use http://10.0.2.2:3006"),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: checkBackend, disabled: checking, className: "mt-3 py-2 px-4 bg-destructive/30 rounded-lg self-start" }, checking ? (react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: "#cf2a2a" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-destructive font-semibold text-sm" }, "Retry connection"))))),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5" }, "Email"),
                react_1.default.createElement(react_native_1.TextInput, { value: email, onChangeText: setEmail, placeholder: "you@example.com", placeholderTextColor: "#94a3b8", keyboardType: "email-address", autoCapitalize: "none", autoCorrect: false, className: "border border-slate-200 rounded-2xl px-4 h-14 text-base text-slate-800 bg-slate-50 mb-4" }),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5" }, "Password"),
                react_1.default.createElement(react_native_1.TextInput, { value: password, onChangeText: setPassword, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", placeholderTextColor: "#94a3b8", secureTextEntry: true, returnKeyType: "done", onSubmitEditing: () => canSubmit && void login.mutateAsync(), className: "border border-slate-200 rounded-2xl px-4 h-14 text-base text-slate-800 bg-slate-50 mb-6" }),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => void login.mutateAsync(), disabled: !canSubmit || login.isPending, className: `h-14 rounded-2xl items-center justify-center ${canSubmit ? "bg-primary" : "bg-slate-300"}` }, login.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-white font-bold text-base" }, "Sign In")))))));
}
//# sourceMappingURL=LoginScreen.js.map