import React, { useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../lib/api";
import { tokenStorage } from "../lib/storage";

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: () => authApi.login(email.trim(), password),
    onSuccess: (data) => {
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      onLogin();
    },
    onError: (err: Error) => Alert.alert("Login failed", err.message),
  });

  const canSubmit = email.includes("@") && password.length >= 1;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 px-6 justify-center">
          {/* Branding */}
          <Text className="text-4xl font-black text-indigo-600 mb-1">
            Execora
          </Text>
          <Text className="text-slate-500 text-sm mb-10">
            Smart billing for Indian businesses
          </Text>

          {/* Email */}
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#94a3b8"
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
            placeholderTextColor="#94a3b8"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => canSubmit && void login.mutateAsync()}
            className="border border-slate-200 rounded-2xl px-4 h-14 text-base text-slate-800 bg-slate-50 mb-6"
          />

          <TouchableOpacity
            onPress={() => void login.mutateAsync()}
            disabled={!canSubmit || login.isPending}
            className={`h-14 rounded-2xl items-center justify-center ${canSubmit ? "bg-indigo-600" : "bg-slate-300"}`}
          >
            {login.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
