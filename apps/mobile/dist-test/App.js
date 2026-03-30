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
exports.default = App;
require("./global.css");
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const ScaledText_1 = require("./components/ui/ScaledText");
const react_query_1 = require("@tanstack/react-query");
const native_1 = require("@react-navigation/native");
const react_native_gesture_handler_1 = require("react-native-gesture-handler");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const expo_status_bar_1 = require("expo-status-bar");
const SplashScreen = __importStar(require("expo-splash-screen"));
const inter_1 = require("@expo-google-fonts/inter");
const api_1 = require("./lib/api");
const env_1 = require("./lib/env");
// Keep splash visible until we hide it (prevents white flash)
try {
    SplashScreen.preventAutoHideAsync();
}
catch {
    // Ignore if splash module unavailable (e.g. web)
}
const navigation_1 = require("./navigation");
const WSProvider_1 = require("./providers/WSProvider");
const AuthContext_1 = require("./contexts/AuthContext");
const OfflineContext_1 = require("./contexts/OfflineContext");
const OfflineBanner_1 = require("./components/common/OfflineBanner");
const usePushAndDeepLinks_1 = require("./hooks/usePushAndDeepLinks");
const TypographyContext_1 = require("./contexts/TypographyContext");
const storage_1 = require("./lib/storage");
const constants_1 = require("./lib/constants");
const typography_1 = require("./lib/typography");
// Boot the API client once (token storage injected)
(0, api_1.bootApi)();
const TextComponent = react_native_1.Text;
const TextInputComponent = react_native_1.TextInput;
TextComponent.defaultProps = {
    ...(TextComponent.defaultProps ?? {}),
    allowFontScaling: true,
    maxFontSizeMultiplier: typography_1.MAX_FONT_SIZE_MULTIPLIER,
};
TextInputComponent.defaultProps = {
    ...(TextInputComponent.defaultProps ?? {}),
    allowFontScaling: true,
    maxFontSizeMultiplier: typography_1.MAX_FONT_SIZE_MULTIPLIER,
};
const queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: { staleTime: 30_000, retry: 1 },
        mutations: { retry: 0 },
    },
});
const NAV_STATE_KEY = "execora_nav_state";
function hasRoute(state, target) {
    if (!state || typeof state !== "object")
        return false;
    const navState = state;
    if (!Array.isArray(navState.routes))
        return false;
    return navState.routes.some((route) => route?.name === target || hasRoute(route?.state, target));
}
// Auto-login credentials — only when ENV.allowAutoLogin (dev/staging, never production)
const AUTO_EMAIL = env_1.ENV.allowAutoLogin
    ? (process.env.EXPO_PUBLIC_LOGIN_EMAIL ?? "")
    : "";
const AUTO_PASSWORD = env_1.ENV.allowAutoLogin
    ? (process.env.EXPO_PUBLIC_LOGIN_PASSWORD ?? "")
    : "";
function AppContent() {
    const { isLoggedIn } = (0, AuthContext_1.useAuth)();
    const [fontsLoaded, fontError] = (0, inter_1.useFonts)({
        Inter_400Regular: inter_1.Inter_400Regular,
        Inter_500Medium: inter_1.Inter_500Medium,
        Inter_700Bold: inter_1.Inter_700Bold,
    });
    // Hide splash once fonts are ready or failed (render with system font fallback)
    const ready = fontsLoaded || !!fontError;
    (0, react_1.useEffect)(() => {
        if (!ready)
            return;
        const id = requestAnimationFrame(() => {
            SplashScreen.hideAsync().catch(() => { });
        });
        return () => cancelAnimationFrame(id);
    }, [ready]);
    if (!ready)
        return null;
    return (react_1.default.createElement(react_native_gesture_handler_1.GestureHandlerRootView, { style: { flex: 1, backgroundColor: "#f1f3f6" }, className: "flex-1" },
        react_1.default.createElement(react_native_safe_area_context_1.SafeAreaProvider, null,
            react_1.default.createElement(react_query_1.QueryClientProvider, { client: queryClient },
                react_1.default.createElement(OfflineContext_1.OfflineProvider, null,
                    react_1.default.createElement(WSProvider_1.WSProvider, { isLoggedIn: isLoggedIn },
                        react_1.default.createElement(AppContentInner, null)))))));
}
function AppContentInner() {
    const navRef = (0, react_1.useRef)(null);
    const { isLoggedIn, login, loginWithUser, logout } = (0, AuthContext_1.useAuth)();
    const { isOffline, pendingCount, isSyncing } = (0, OfflineContext_1.useOffline)();
    const initialNavState = (0, react_1.useMemo)(() => {
        if (!isLoggedIn)
            return undefined;
        try {
            const raw = storage_1.storage.getString(NAV_STATE_KEY);
            if (!raw)
                return undefined;
            const parsed = JSON.parse(raw);
            // Don't restore into auth flow; let RootNavigator decide auth branch.
            if (hasRoute(parsed, "Auth") || hasRoute(parsed, "Login")) {
                return undefined;
            }
            return parsed;
        }
        catch {
            return undefined;
        }
    }, [isLoggedIn]);
    (0, usePushAndDeepLinks_1.usePushAndDeepLinks)(navRef, isLoggedIn);
    // Fallback: hide splash after 1.5s if onReady never fires (e.g. boot error)
    (0, react_1.useEffect)(() => {
        const t = setTimeout(() => SplashScreen.hideAsync().catch(() => { }), 1500);
        return () => clearTimeout(t);
    }, []);
    (0, react_1.useEffect)(() => {
        if (isLoggedIn || !AUTO_EMAIL || !AUTO_PASSWORD)
            return;
        api_1.authApi
            .login(AUTO_EMAIL, AUTO_PASSWORD)
            .then((data) => {
            const { tokenStorage } = require("./lib/storage");
            tokenStorage.setTokens(data.accessToken, data.refreshToken);
            const u = data.user;
            if (u?.id)
                loginWithUser({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                });
            else
                login();
        })
            .catch(() => {
            /* show login screen on failure */
        });
    }, [login, loginWithUser]);
    const handleAuthExpired = (0, react_1.useCallback)(() => {
        queryClient.clear();
        logout();
    }, [logout]);
    (0, react_1.useEffect)(() => {
        (0, api_1.setAuthExpiredHandler)(handleAuthExpired);
    }, [handleAuthExpired]);
    (0, react_1.useEffect)(() => {
        if (!isLoggedIn) {
            storage_1.storage.delete(NAV_STATE_KEY);
        }
    }, [isLoggedIn]);
    return (react_1.default.createElement(react_1.default.Fragment, null,
        isOffline && (react_1.default.createElement(OfflineBanner_1.OfflineBanner, { pendingCount: pendingCount, isSyncing: isSyncing })),
        react_1.default.createElement(native_1.NavigationContainer, { ref: navRef, initialState: initialNavState, onStateChange: (state) => {
                if (!state || !isLoggedIn)
                    return;
                try {
                    storage_1.storage.set(NAV_STATE_KEY, JSON.stringify(state));
                }
                catch {
                    // Ignore persistence failures to avoid affecting navigation.
                }
            }, onReady: () => {
                (0, api_1.setAuthExpiredHandler)(() => navRef.current?.navigate("Login"));
                SplashScreen.hideAsync();
            } },
            react_1.default.createElement(expo_status_bar_1.StatusBar, { style: "auto" }),
            react_1.default.createElement(navigation_1.RootNavigator, null))));
}
// Error boundary — catches crashes, shows user-friendly UI, retry in dev
const IS_PROD = process.env.EXPO_PUBLIC_ENV === "production";
class AppErrorBoundary extends react_1.default.Component {
    state = { hasError: false, error: null };
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error) {
        SplashScreen.hideAsync().catch(() => { });
        if (__DEV__ || !IS_PROD)
            console.error("AppErrorBoundary:", error);
    }
    handleRetry = () => this.setState({ hasError: false, error: null });
    render() {
        if (this.state.hasError) {
            const userMessage = IS_PROD
                ? "Something went wrong. Please restart the app."
                : (this.state.error?.message ?? "Unknown error");
            return (react_1.default.createElement(react_native_1.View, { style: styles.errorContainer },
                react_1.default.createElement(ScaledText_1.ScaledText, { style: styles.errorTitle }, "Something went wrong"),
                react_1.default.createElement(ScaledText_1.ScaledText, { style: styles.errorText }, userMessage),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: this.handleRetry, style: styles.retryBtn },
                    react_1.default.createElement(ScaledText_1.ScaledText, { style: styles.retryText }, "Try again"))));
        }
        return this.props.children;
    }
}
const styles = react_native_1.StyleSheet.create({
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: "#fff",
    },
    errorTitle: {
        fontSize: constants_1.SIZES.FONT.xl,
        fontWeight: "600",
        marginBottom: constants_1.SIZES.SPACING.sm,
    },
    errorText: {
        fontSize: constants_1.SIZES.FONT.base,
        color: "#666",
        textAlign: "center",
        marginBottom: constants_1.SIZES.SPACING.lg,
    },
    retryBtn: {
        minHeight: constants_1.SIZES.TOUCH_MIN,
        paddingHorizontal: constants_1.SIZES.SPACING.xl,
        paddingVertical: constants_1.SIZES.SPACING.md,
        backgroundColor: "#e67e22",
        borderRadius: constants_1.SIZES.RADIUS.md,
    },
    retryText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: constants_1.SIZES.FONT.lg,
    },
});
function App() {
    return (react_1.default.createElement(TypographyContext_1.TypographyProvider, null,
        react_1.default.createElement(AppErrorBoundary, null,
            react_1.default.createElement(AuthContext_1.AuthProvider, null,
                react_1.default.createElement(AppContent, null)))));
}
//# sourceMappingURL=App.js.map