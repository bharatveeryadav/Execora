import "./global.css";
import React, { useCallback, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { bootApi, setAuthExpiredHandler } from "./lib/api";
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

export default function App() {
  const navRef = useRef<NavigationContainerRef<any>>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!tokenStorage.getToken());

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
