import "./global.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { bootApi, setAuthExpiredHandler, authApi } from "./lib/api";
import { tokenStorage } from "./lib/storage";
import { RootNavigator } from "./navigation";

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

export default function App() {
  const navRef = useRef<NavigationContainerRef<any>>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!tokenStorage.getToken());

  // Auto-login on first launch if env credentials are set and no token stored
  useEffect(() => {
    if (isLoggedIn || !AUTO_EMAIL || !AUTO_PASSWORD) return;
    authApi.login(AUTO_EMAIL, AUTO_PASSWORD).then((data: { accessToken: string; refreshToken: string; user: unknown }) => {
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      setIsLoggedIn(true);
    }).catch(() => { /* show login screen on failure */ });
  }, []);

  const handleAuthExpired = useCallback(() => {
    queryClient.clear();
    setIsLoggedIn(false);
  }, []);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer
            ref={navRef}
            onReady={() => {
              setAuthExpiredHandler(() =>
                navRef.current?.navigate("Login" as never),
              );
            }}
          >
            <StatusBar style="auto" />
            <RootNavigator
              isLoggedIn={isLoggedIn}
              onLogin={() => setIsLoggedIn(true)}
            />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
