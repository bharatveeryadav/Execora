/**
 * RecurringScreen — recurring billing templates (per Sprint 12).
 * Placeholder until recurring API is available.
 */
import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function RecurringScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="px-4 py-3 border-b border-slate-100">
        <Text className="text-xl font-bold text-slate-800">Recurring Billing</Text>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-4xl mb-4">🔄</Text>
        <Text className="text-lg font-semibold text-slate-800 text-center mb-2">
          Recurring billing
        </Text>
        <Text className="text-slate-500 text-center">
          Set up templates for weekly or monthly invoices. Coming soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}
