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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePushAndDeepLinks = usePushAndDeepLinks;
/**
 * Sprint 15 — Push notifications + deep links.
 * Registers device for push, handles foreground toasts, and navigates on link/notification tap.
 */
const react_1 = require("react");
const react_native_1 = require("react-native");
const Device = __importStar(require("expo-device"));
const Notifications = __importStar(require("expo-notifications"));
const expo_constants_1 = __importDefault(require("expo-constants"));
const api_1 = require("../lib/api");
// Foreground: show banner (Expo default) — no custom toast for now
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});
function parseDeepLink(url) {
    // execora://invoices/123 | execora://payment?customerId=abc | execora://pub/invoice/:id/:token
    const match = url.match(/^execora:\/\/([^?]+)(?:\?(.*))?$/);
    if (!match)
        return null;
    const path = match[1];
    const query = match[2] ? Object.fromEntries(new URLSearchParams(match[2])) : {};
    if (path.startsWith("pub/invoice/")) {
        const rest = path.slice("pub/invoice/".length);
        const [id, token] = rest.split("/");
        if (id && token)
            return { screen: "PubInvoice", params: { id, token } };
    }
    if (path.startsWith("invoices/")) {
        const id = path.slice("invoices/".length);
        return { screen: "InvoiceDetail", params: { id } };
    }
    if (path === "invoices") {
        return { screen: "InvoiceList", params: {} };
    }
    if (path === "payment" && query.customerId) {
        return { screen: "Payment", params: { customerId: query.customerId } };
    }
    return null;
}
function navigateFromDeepLink(navRef, parsed) {
    const nav = navRef.current;
    if (!nav)
        return;
    try {
        if (parsed.screen === "PubInvoice" && parsed.params?.id && parsed.params?.token) {
            nav.navigate("PubInvoice", {
                id: parsed.params.id,
                token: parsed.params.token,
            });
        }
        else if (parsed.screen === "InvoiceDetail" && parsed.params?.id) {
            nav.navigate("Main", {
                screen: "InvoicesTab",
                params: {
                    screen: "InvoiceDetail",
                    params: { id: parsed.params.id },
                },
            });
        }
        else if (parsed.screen === "InvoiceList") {
            nav.navigate("Main", {
                screen: "InvoicesTab",
                params: { screen: "InvoiceList" },
            });
        }
        else if (parsed.screen === "Payment" && parsed.params?.customerId) {
            nav.navigate("Main", {
                screen: "CustomersTab",
                params: {
                    screen: "Payment",
                    params: { customerId: parsed.params.customerId },
                },
            });
        }
    }
    catch {
        // Navigation not ready yet
    }
}
function usePushAndDeepLinks(navRef, isLoggedIn) {
    const registeredRef = (0, react_1.useRef)(false);
    // ── Push registration (when logged in) ─────────────────────────────────────
    (0, react_1.useEffect)(() => {
        if (!isLoggedIn || !Device.isDevice)
            return;
        async function register() {
            try {
                if (react_native_1.Platform.OS === "android") {
                    await Notifications.setNotificationChannelAsync("default", {
                        name: "Default",
                        importance: Notifications.AndroidImportance.MAX,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: "#e67e22",
                    });
                }
                const { status: existing } = await Notifications.getPermissionsAsync();
                let finalStatus = existing;
                if (existing !== "granted") {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }
                if (finalStatus !== "granted")
                    return;
                const projectId = expo_constants_1.default?.expoConfig?.extra?.eas?.projectId ?? expo_constants_1.default?.easConfig?.projectId;
                if (!projectId || projectId === "YOUR_EAS_PROJECT_ID")
                    return;
                const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
                if (token && !registeredRef.current) {
                    await api_1.pushApi.register(token, react_native_1.Platform.OS);
                    registeredRef.current = true;
                }
            }
            catch {
                // Push not available (Expo Go, missing projectId, etc.)
            }
        }
        void register();
    }, [isLoggedIn]);
    // ── Deep link: initial URL + url events ─────────────────────────────────────
    // Pub invoice works without login; other links require login
    (0, react_1.useEffect)(() => {
        function handleUrl(url) {
            const parsed = parseDeepLink(url);
            if (!parsed)
                return;
            if (parsed.screen === "PubInvoice") {
                navigateFromDeepLink(navRef, parsed);
            }
            else if (isLoggedIn) {
                navigateFromDeepLink(navRef, parsed);
            }
        }
        react_native_1.Linking.getInitialURL().then((url) => {
            if (url)
                handleUrl(url);
        });
        const sub = react_native_1.Linking.addEventListener("url", ({ url }) => handleUrl(url));
        return () => sub.remove();
    }, [isLoggedIn, navRef]);
    // ── Notification tap → deep link ────────────────────────────────────────────
    (0, react_1.useEffect)(() => {
        const sub = Notifications.addNotificationResponseReceivedListener((response) => {
            const url = response.notification.request.content.data?.url;
            if (typeof url === "string") {
                const parsed = parseDeepLink(url);
                if (parsed)
                    navigateFromDeepLink(navRef, parsed);
            }
        });
        // Handle notification that launched the app
        Notifications.getLastNotificationResponseAsync().then((response) => {
            if (response?.notification.request.content.data?.url) {
                const url = response.notification.request.content.data.url;
                const parsed = parseDeepLink(url);
                if (parsed)
                    navigateFromDeepLink(navRef, parsed);
            }
        });
        return () => sub.remove();
    }, [navRef]);
}
//# sourceMappingURL=usePushAndDeepLinks.js.map