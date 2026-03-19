import "./global.css";
import React, { useCallback, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
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

// Boot the API client once (token storage injected)
bootApi();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
    mutations: { retry: 0 },
  },
});

// Auto-login credentials — only when ENV.allowAutoLogin (dev/staging, never production)
const AUTO_EMAIL = ENV.allowAutoLogin ? (process.env.EXPO_PUBLIC_LOGIN_EMAIL ?? "") : "";
const AUTO_PASSWORD = ENV.allowAutoLogin ? (process.env.EXPO_PUBLIC_LOGIN_PASSWORD ?? "") : "";

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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#f1f3f6" }} className="flex-1">
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

  usePushAndDeepLinks(navRef, isLoggedIn);

  // Fallback: hide splash after 1.5s if onReady never fires (e.g. boot error)
  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isLoggedIn || !AUTO_EMAIL || !AUTO_PASSWORD) return;
    authApi.login(AUTO_EMAIL, AUTO_PASSWORD).then((data: { accessToken: string; refreshToken: string; user: unknown }) => {
      const { tokenStorage } = require("./lib/storage");
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      const u = data.user as { id?: string; name?: string; email?: string; role?: string } | undefined;
      if (u?.id) loginWithUser({ id: u.id, name: u.name, email: u.email, role: u.role });
      else login();
    }).catch(() => { /* show login screen on failure */ });
  }, [login, loginWithUser]);

  const handleAuthExpired = useCallback(() => {
    queryClient.clear();
    logout();
  }, [logout]);

  useEffect(() => {
    setAuthExpiredHandler(handleAuthExpired);
  }, [handleAuthExpired]);

  return (
    <>
      {isOffline && <OfflineBanner pendingCount={pendingCount} isSyncing={isSyncing} />}
      <NavigationContainer
        ref={navRef}
        onReady={() => {
          setAuthExpiredHandler(() =>
            navRef.current?.navigate("Login" as never),
          );
          SplashScreen.hideAsync();
        }}
      >
        <StatusBar style="auto" />
        <RootNavigator />
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
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{userMessage}</Text>
          <TouchableOpacity onPress={this.handleRetry} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
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
  errorTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  errorText: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 16 },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#e67e22",
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
