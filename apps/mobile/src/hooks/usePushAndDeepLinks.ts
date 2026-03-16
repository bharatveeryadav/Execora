/**
 * Sprint 15 — Push notifications + deep links.
 * Registers device for push, handles foreground toasts, and navigates on link/notification tap.
 */
import { useEffect, useRef } from "react";
import { Platform, Linking } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import type { NavigationContainerRef } from "@react-navigation/native";
import { pushApi } from "../lib/api";

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

function parseDeepLink(url: string): { screen: string; params?: Record<string, string> } | null {
  // execora://invoices/123 | execora://payment?customerId=abc | execora://pub/invoice/:id/:token
  const match = url.match(/^execora:\/\/([^?]+)(?:\?(.*))?$/);
  if (!match) return null;
  const path = match[1];
  const query = match[2] ? Object.fromEntries(new URLSearchParams(match[2])) : {};

  if (path.startsWith("pub/invoice/")) {
    const rest = path.slice("pub/invoice/".length);
    const [id, token] = rest.split("/");
    if (id && token) return { screen: "PubInvoice", params: { id, token } };
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

function navigateFromDeepLink(
  navRef: React.RefObject<NavigationContainerRef<any> | null>,
  parsed: { screen: string; params?: Record<string, string> }
) {
  const nav = navRef.current;
  if (!nav) return;

  try {
    if (parsed.screen === "PubInvoice" && parsed.params?.id && parsed.params?.token) {
      (nav as any).navigate("PubInvoice", {
        id: parsed.params.id,
        token: parsed.params.token,
      });
    } else if (parsed.screen === "InvoiceDetail" && parsed.params?.id) {
      (nav as any).navigate("Main", {
        screen: "InvoicesTab",
        params: {
          screen: "InvoiceDetail",
          params: { id: parsed.params.id },
        },
      });
    } else if (parsed.screen === "InvoiceList") {
      (nav as any).navigate("Main", {
        screen: "InvoicesTab",
        params: { screen: "InvoiceList" },
      });
    } else if (parsed.screen === "Payment" && parsed.params?.customerId) {
      (nav as any).navigate("Main", {
        screen: "CustomersTab",
        params: {
          screen: "Payment",
          params: { customerId: parsed.params.customerId },
        },
      });
    }
  } catch {
    // Navigation not ready yet
  }
}

export function usePushAndDeepLinks(
  navRef: React.RefObject<NavigationContainerRef<any> | null>,
  isLoggedIn: boolean
) {
  const registeredRef = useRef(false);

  // ── Push registration (when logged in) ─────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !Device.isDevice) return;

    async function register() {
      try {
        if (Platform.OS === "android") {
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
        if (finalStatus !== "granted") return;

        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId || projectId === "YOUR_EAS_PROJECT_ID") return;

        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (token && !registeredRef.current) {
          await pushApi.register(token, Platform.OS);
          registeredRef.current = true;
        }
      } catch {
        // Push not available (Expo Go, missing projectId, etc.)
      }
    }

    void register();
  }, [isLoggedIn]);

  // ── Deep link: initial URL + url events ─────────────────────────────────────
  // Pub invoice works without login; other links require login
  useEffect(() => {
    function handleUrl(url: string) {
      const parsed = parseDeepLink(url);
      if (!parsed) return;
      if (parsed.screen === "PubInvoice") {
        navigateFromDeepLink(navRef, parsed);
      } else if (isLoggedIn) {
        navigateFromDeepLink(navRef, parsed);
      }
    }

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [isLoggedIn, navRef]);

  // ── Notification tap → deep link ────────────────────────────────────────────
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url as string | undefined;
      if (typeof url === "string") {
        const parsed = parseDeepLink(url);
        if (parsed) navigateFromDeepLink(navRef, parsed);
      }
    });

    // Handle notification that launched the app
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification.request.content.data?.url) {
        const url = response.notification.request.content.data.url as string;
        const parsed = parseDeepLink(url);
        if (parsed) navigateFromDeepLink(navRef, parsed);
      }
    });

    return () => sub.remove();
  }, [navRef]);
}
