import "./global.css";
import React, { useCallback, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { bootApi, setAuthExpiredHandler, authApi } from "./lib/api";
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

// Dev credentials from env — set EXPO_PUBLIC_LOGIN_EMAIL + EXPO_PUBLIC_LOGIN_PASSWORD
const AUTO_EMAIL = process.env.EXPO_PUBLIC_LOGIN_EMAIL ?? "";
const AUTO_PASSWORD = process.env.EXPO_PUBLIC_LOGIN_PASSWORD ?? "";

function AppContent() {
  const { isLoggedIn } = useAuth();

  return (
    <GestureHandlerRootView className="flex-1">
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
  const { isLoggedIn, login, logout } = useAuth();
  const { isOffline, pendingCount, isSyncing } = useOffline();

  usePushAndDeepLinks(navRef, isLoggedIn);

  useEffect(() => {
    if (isLoggedIn || !AUTO_EMAIL || !AUTO_PASSWORD) return;
    authApi.login(AUTO_EMAIL, AUTO_PASSWORD).then((data: { accessToken: string; refreshToken: string; user: unknown }) => {
      const { tokenStorage } = require("./lib/storage");
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      login();
    }).catch(() => { /* show login screen on failure */ });
  }, []);

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
        }}
      >
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
