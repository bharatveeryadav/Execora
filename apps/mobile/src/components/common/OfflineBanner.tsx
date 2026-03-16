/**
 * Offline mode banner (Sprint 18).
 */
import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function OfflineBanner({
  pendingCount,
  isSyncing,
}: {
  pendingCount: number;
  isSyncing: boolean;
}) {
  return (
    <View className="bg-amber-500 px-4 py-2.5 flex-row items-center justify-center gap-2">
      <Ionicons name="cloud-offline-outline" size={18} color="#fff" />
      <Text className="text-white font-semibold text-sm">
        {isSyncing
          ? "Syncing…"
          : pendingCount > 0
            ? `Offline — ${pendingCount} bill${pendingCount !== 1 ? "s" : ""} queued`
            : "Offline mode"}
      </Text>
    </View>
  );
}
