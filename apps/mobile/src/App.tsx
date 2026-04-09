import "./global.css";
import "./lib/i18n"; // i18n must be initialized before any component renders
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { ScaledText } from "./components/ui/ScaledText";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  InitialState,
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { bootApi, setAuthExpiredHandler, authApi } from "./lib/api";
import { ENV } from "./lib/env";

// Keep splash visible until we hide it (prevents white flash)
try {
  SplashScreen.preventAutoHideAsync();
} catch {
  // Ignore if splash module unavailable (e.g. web)
}
import { RootNavigator } from "./navigation";
import { WSProvider } from "./providers/WSProvider";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { OfflineProvider, useOffline } from "./contexts/OfflineContext";
import { OfflineBanner } from "./components/common/OfflineBanner";
import { usePushAndDeepLinks } from "./hooks/usePushAndDeepLinks";
import { TypographyProvider } from "./contexts/TypographyContext";
import { storage } from "./lib/storage";
import { SIZES } from "./lib/constants";
import { MAX_FONT_SIZE_MULTIPLIER } from "./lib/typography";
import { useModuleStore } from "./stores/moduleStore";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { config as gluestackConfig } from "@gluestack-ui/config";
import { BREAKPOINTS } from "./hooks/useResponsive";

// Boot the API client once (token storage injected)
bootApi();

// Hydrate module store from MMKV on cold start
useModuleStore.getState().hydrate();

const TextComponent = Text as any;
const TextInputComponent = TextInput as any;

TextComponent.defaultProps = {
  ...(TextComponent.defaultProps ?? {}),
  allowFontScaling: true,
  maxFontSizeMultiplier: MAX_FONT_SIZE_MULTIPLIER,
};

TextInputComponent.defaultProps = {
  ...(TextInputComponent.defaultProps ?? {}),
  allowFontScaling: true,
  maxFontSizeMultiplier: MAX_FONT_SIZE_MULTIPLIER,
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
    mutations: { retry: 0 },
  },
});

// Versioned key: bump when navigator wiring changes to avoid restoring stale route trees.
const NAV_STATE_KEY = "execora_nav_state_v2";
const LEGACY_NAV_STATE_KEY = "execora_nav_state";

function hasRoute(state: unknown, target: string): boolean {
  if (!state || typeof state !== "object") return false;
  const navState = state as {
    routes?: Array<{ name?: string; state?: unknown }>;
  };
  if (!Array.isArray(navState.routes)) return false;
  return navState.routes.some(
    (route) => route?.name === target || hasRoute(route?.state, target),
  );
}

// Auto-login credentials — only when ENV.allowAutoLogin (dev/staging, never production)
const AUTO_EMAIL = ENV.allowAutoLogin
  ? (process.env.EXPO_PUBLIC_LOGIN_EMAIL ?? "")
  : "";
const AUTO_PASSWORD = ENV.allowAutoLogin
  ? (process.env.EXPO_PUBLIC_LOGIN_PASSWORD ?? "")
  : "";

function AppContent() {
  const { isLoggedIn } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  // Hide splash once fonts are ready or failed (render with system font fallback)
  const ready = fontsLoaded || !!fontError;
  useEffect(() => {
    if (!ready) return;
    const id = requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
    return () => cancelAnimationFrame(id);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: "#f1f3f6" }}
      className="flex-1"
    >
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <OfflineProvider>
            <WSProvider isLoggedIn={isLoggedIn}>
              <AppContentInner />
            </WSProvider>
          </OfflineProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContentInner() {
  const navRef = useRef<NavigationContainerRef<any>>(null);
  const { isLoggedIn, login, loginWithUser, logout } = useAuth();
  const { isOffline, pendingCount, isSyncing } = useOffline();

  const initialNavState = useMemo<InitialState | undefined>(() => {
    if (!isLoggedIn) return undefined;
    try {
      const raw = storage.getString(NAV_STATE_KEY);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as InitialState;
      // Don't restore into auth flow; let RootNavigator decide auth branch.
      if (hasRoute(parsed, "Auth") || hasRoute(parsed, "Login")) {
        return undefined;
      }
      return parsed;
    } catch {
      return undefined;
    }
  }, [isLoggedIn]);

  usePushAndDeepLinks(navRef, isLoggedIn);

  // Fallback: hide splash after 1.5s if onReady never fires (e.g. boot error)
  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isLoggedIn || !AUTO_EMAIL || !AUTO_PASSWORD) return;
    authApi
      .login(AUTO_EMAIL, AUTO_PASSWORD)
      .then(
        (data: {
          accessToken: string;
          refreshToken: string;
          user: unknown;
        }) => {
          const { tokenStorage } = require("./lib/storage");
          tokenStorage.setTokens(data.accessToken, data.refreshToken);
          const u = data.user as
            | { id?: string; name?: string; email?: string; role?: string }
            | undefined;
          if (u?.id)
            loginWithUser({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
            });
          else login();
        },
      )
      .catch(() => {
        /* show login screen on failure */
      });
  }, [login, loginWithUser]);

  const handleAuthExpired = useCallback(() => {
    queryClient.clear();
    logout();
  }, [logout]);

  useEffect(() => {
    setAuthExpiredHandler(handleAuthExpired);
  }, [handleAuthExpired]);

  useEffect(() => {
    if (!isLoggedIn) {
      storage.delete(NAV_STATE_KEY);
      storage.delete(LEGACY_NAV_STATE_KEY);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    // Clean up legacy nav snapshots so old tab wiring cannot be restored.
    storage.delete(LEGACY_NAV_STATE_KEY);
  }, []);

  return (
    <>
      {isOffline && (
        <OfflineBanner pendingCount={pendingCount} isSyncing={isSyncing} />
      )}
      <NavigationContainer
        ref={navRef}
        initialState={initialNavState}
        onStateChange={(state) => {
          if (!state || !isLoggedIn) return;
          try {
            storage.set(NAV_STATE_KEY, JSON.stringify(state));
          } catch {
            // Ignore persistence failures to avoid affecting navigation.
          }
        }}
        onReady={() => {
          setAuthExpiredHandler(() =>
            navRef.current?.navigate("Login" as never),
          );
          SplashScreen.hideAsync();
        }}
      >
        <StatusBar style="auto" />
        <View style={styles.navFrameOuter}>
          <View style={styles.navFrameInner}>
            <RootNavigator />
          </View>
        </View>
      </NavigationContainer>
    </>
  );
}

// Error boundary — catches crashes, shows user-friendly UI, retry in dev
const IS_PROD = process.env.EXPO_PUBLIC_ENV === "production";

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    SplashScreen.hideAsync().catch(() => {});
    if (__DEV__ || !IS_PROD) console.error("AppErrorBoundary:", error);
  }

  handleRetry = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      const userMessage = IS_PROD
        ? "Something went wrong. Please restart the app."
        : (this.state.error?.message ?? "Unknown error");
      return (
        <View style={styles.errorContainer}>
          <ScaledText style={styles.errorTitle}>
            Something went wrong
          </ScaledText>
          <ScaledText style={styles.errorText}>{userMessage}</ScaledText>
          <TouchableOpacity onPress={this.handleRetry} style={styles.retryBtn}>
            <ScaledText style={styles.retryText}>Try again</ScaledText>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  errorTitle: {
    fontSize: SIZES.FONT.xl,
    fontWeight: "600",
    marginBottom: SIZES.SPACING.sm,
  },
  errorText: {
    fontSize: SIZES.FONT.base,
    color: "#666",
    textAlign: "center",
    marginBottom: SIZES.SPACING.lg,
  },
  retryBtn: {
    minHeight: SIZES.TOUCH_MIN,
    paddingHorizontal: SIZES.SPACING.xl,
    paddingVertical: SIZES.SPACING.md,
    backgroundColor: "#e67e22",
    borderRadius: SIZES.RADIUS.md,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: SIZES.FONT.lg,
  },
  navFrameOuter: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  navFrameInner: {
    flex: 1,
    width: "100%",
    maxWidth: BREAKPOINTS.maxContentWidth,
  },
});

export default function App() {
  return (
    <GluestackUIProvider config={gluestackConfig}>
      <TypographyProvider>
        <AppErrorBoundary>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </AppErrorBoundary>
      </TypographyProvider>
    </GluestackUIProvider>
  );
}
