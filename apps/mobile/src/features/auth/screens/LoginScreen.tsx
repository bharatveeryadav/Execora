import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { showAlert } from "../../../lib/alerts";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { authApi, getApiBaseUrl } from "../../../lib/api";
import { tokenStorage } from "../../../lib/storage";
import { useAuth, type AuthUser } from "../../../contexts/AuthContext";
import { COLORS } from "../../../lib/constants";

export function LoginScreen({ onLogin }: { onLogin?: () => void }) {
  const { loginWithUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [backendReachable, setBackendReachable] = useState<boolean | null>(
    null,
  );
  const [checking, setChecking] = useState(false);

  const checkBackend = React.useCallback(() => {
    setChecking(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    fetch(`${getApiBaseUrl()}/health`, { signal: ctrl.signal })
      .then(() => setBackendReachable(true))
      .catch(() => setBackendReachable(false))
      .finally(() => {
        clearTimeout(t);
        setChecking(false);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    fetch(`${getApiBaseUrl()}/health`, { signal: ctrl.signal })
      .then(() => !cancelled && setBackendReachable(true))
      .catch(() => !cancelled && setBackendReachable(false))
      .finally(() => clearTimeout(t));
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  const login = useMutation({
    mutationFn: () => authApi.login(email.trim(), password),
    onSuccess: (data) => {
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      const u = data.user as AuthUser | undefined;
      if (u?.id) loginWithUser(u);
      else onLogin?.();
    },
    onError: (err: Error) => {
      const msg = err.message;
      const isNetworkError =
        msg.includes("Network") ||
        msg.includes("fetch") ||
        msg.includes("Failed to fetch") ||
        msg.includes("Connection") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("timeout");
      if (isNetworkError) setBackendReachable(false);
      const title = isNetworkError ? "Cannot reach backend" : "Login failed";
      const body = isNetworkError
        ? "Check:\n\n1) API is running (pnpm dev)\n2) EXPO_PUBLIC_API_URL in .env points to your machine\n3) On physical phone: use your PC's LAN IP (e.g. http://192.168.1.x:3006)\n4) On emulator: use http://10.0.2.2:3006"
        : msg;
      showAlert(title, body);
    },
  });

  const canSubmit = email.includes("@") && password.length >= 1;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View className="flex-1 px-6 justify-center">
          {/* Branding — matches web */}
          <Text className="text-3xl font-bold tracking-tight">
            <Text className="text-primary">EXECORA</Text>
          </Text>
          <Text className="text-muted-foreground text-sm mb-10">
            Smart billing for Indian businesses
          </Text>

          {backendReachable === false && (
            <View className="bg-destructive/15 border border-destructive/40 rounded-xl px-4 py-3 mb-6">
              <Text className="text-destructive font-semibold text-sm">
                Cannot reach backend
              </Text>
              <Text className="text-destructive/90 text-xs mt-1">
                1) API is running (pnpm dev){"\n"}
                2) EXPO_PUBLIC_API_URL in .env points to your machine{"\n"}
                3) On physical phone: use your PC's LAN IP (e.g.
                http://192.168.1.x:3006){"\n"}
                4) On emulator: use http://10.0.2.2:3006
              </Text>
              <TouchableOpacity
                onPress={checkBackend}
                disabled={checking}
                className="mt-3 py-2 px-4 bg-destructive/30 rounded-lg self-start"
              >
                {checking ? (
                  <ActivityIndicator size="small" color={COLORS.error} />
                ) : (
                  <Text className="text-destructive font-semibold text-sm">
                    Retry connection
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Email */}
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.slate[400]}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            className="border border-slate-200 rounded-2xl px-4 h-14 text-base text-slate-800 bg-slate-50 mb-4"
          />

          {/* Password */}
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={COLORS.slate[400]}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => canSubmit && void login.mutateAsync()}
            className="border border-slate-200 rounded-2xl px-4 h-14 text-base text-slate-800 bg-slate-50 mb-6"
          />

          <TouchableOpacity
            onPress={() => void login.mutateAsync()}
            disabled={!canSubmit || login.isPending}
            className={`h-14 rounded-2xl items-center justify-center ${canSubmit ? "bg-primary" : "bg-slate-300"}`}
          >
            {login.isPending ? (
              <ActivityIndicator color={COLORS.text.inverted} />
            ) : (
              <Text className="text-white font-bold text-base">Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
