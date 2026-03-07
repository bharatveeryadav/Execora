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
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const sendOtp = useMutation({
    mutationFn: () => authApi.sendOtp(phone.trim()),
    onSuccess: () => setOtpSent(true),
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  const login = useMutation({
    mutationFn: () => authApi.login(phone.trim(), otp.trim()),
    onSuccess: (data) => {
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      onLogin();
    },
    onError: (err: Error) => Alert.alert("Invalid OTP", err.message),
  });

  const isLoading = sendOtp.isPending || login.isPending;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 px-6 justify-center">
          {/* Logo / branding */}
          <Text className="text-4xl font-black text-indigo-600 mb-1">
            Execora
          </Text>
          <Text className="text-slate-500 text-sm mb-10">
            Smart billing for Indian businesses
          </Text>

          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Mobile Number
          </Text>
          <View className="flex-row items-center border border-slate-200 rounded-2xl px-4 bg-slate-50 mb-4">
            <Text className="text-slate-500 mr-2 text-sm">🇮🇳 +91</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              maxLength={10}
              editable={!otpSent}
              className="flex-1 h-14 text-base text-slate-800"
            />
            {otpSent && (
              <TouchableOpacity
                onPress={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
              >
                <Text className="text-xs text-indigo-600 font-semibold">
                  Change
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {!otpSent ? (
            <TouchableOpacity
              onPress={() => void sendOtp.mutateAsync()}
              disabled={phone.length !== 10 || isLoading}
              className={`h-14 rounded-2xl items-center justify-center ${phone.length === 10 ? "bg-indigo-600" : "bg-slate-300"}`}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">Send OTP</Text>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Enter OTP
              </Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="6-digit OTP"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                className="border border-slate-200 rounded-2xl px-4 h-14 text-lg text-center tracking-[8px] text-slate-800 bg-slate-50 mb-4"
              />
              <TouchableOpacity
                onPress={() => void login.mutateAsync()}
                disabled={otp.length !== 6 || isLoading}
                className={`h-14 rounded-2xl items-center justify-center ${otp.length === 6 ? "bg-indigo-600" : "bg-slate-300"}`}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    Verify & Login
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void sendOtp.mutateAsync()}
                disabled={isLoading}
                className="mt-3 items-center py-2"
              >
                <Text className="text-indigo-600 text-sm">Resend OTP</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
