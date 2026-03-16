/**
 * MonitoringScreen — store monitoring dashboard (per Sprint 14).
 * Placeholder until monitoring API is wired.
 */
import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function MonitoringScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <View className="px-4 py-3 border-b border-slate-100">
        <Text className="text-xl font-bold text-slate-800">Store Monitor</Text>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-4xl mb-4">🛡</Text>
        <Text className="text-lg font-semibold text-slate-800 text-center mb-2">
          Store monitoring
        </Text>
        <Text className="text-slate-500 text-center">
          Activity feed, employee risk, and cash reconciliation. Coming soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}
