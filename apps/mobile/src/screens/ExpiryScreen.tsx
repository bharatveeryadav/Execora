/**
 * ExpiryScreen — Product expiry management (Sprint 21).
 * GET /api/v1/products/expiry-page, PATCH batches/:id/write-off
 */
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productExtApi } from "../lib/api";
import { Chip } from "../components/ui/Chip";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorCard } from "../components/ui/ErrorCard";
import { hapticSuccess, hapticError } from "../lib/haptics";
import { useResponsive } from "../hooks/useResponsive";

const FILTERS = ["expired", "7d", "30d", "90d", "all"] as const;
const FILTER_LABELS: Record<(typeof FILTERS)[number], string> = {
  expired: "Expired",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  all: "All",
};

export function ExpiryScreen() {
  const qc = useQueryClient();
  const { contentPad } = useResponsive();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("30d");

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["expiry-page", filter],
    queryFn: () => productExtApi.expiryPage(filter),
    staleTime: 30_000,
  });

  const writeOff = useMutation({
    mutationFn: (batchId: string) => productExtApi.writeOffBatch(batchId),
    onSuccess: () => {
      hapticSuccess();
      void qc.invalidateQueries({ queryKey: ["expiry-page"] });
      void qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => {
      hapticError();
      Alert.alert("Error", err.message ?? "Write-off failed");
    },
  });

  const batches = data?.batches ?? [];
  const summary = data?.summary ?? { expiredCount: 0, critical7: 0, warning30: 0, valueAtRisk: 0 };

  const handleWriteOff = (batchId: string, productName: string) => {
    Alert.alert(
      "Write off batch?",
      `This will reduce stock to 0 for "${productName}". This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Write off", style: "destructive", onPress: () => writeOff.mutate(batchId) },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="px-4 pt-4 pb-3 border-b border-slate-200 bg-card">
        <Text className="text-xl font-bold tracking-tight text-slate-800 mb-3">Product Expiry</Text>
        <View className="flex-row flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Chip
              key={f}
              label={FILTER_LABELS[f]}
              selected={filter === f}
              onPress={() => requestAnimationFrame(() => setFilter(f))}
            />
          ))}
        </View>
        <View className="flex-row flex-wrap gap-3 mt-3">
          <Text className="text-xs text-slate-500">Expired: {summary.expiredCount}</Text>
          <Text className="text-xs text-amber-600">7d: {summary.critical7}</Text>
          <Text className="text-xs text-amber-500">30d: {summary.warning30}</Text>
          <Text className="text-xs text-slate-500">At risk: ₹{summary.valueAtRisk.toLocaleString("en-IN")}</Text>
        </View>
      </View>

      {isError ? (
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: contentPad }}>
          <ErrorCard message="Failed to load expiry data" onRetry={() => refetch()} />
        </View>
      ) : (
        <FlatList
          data={batches}
          keyExtractor={(b) => b.id}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} />
          }
          contentContainerStyle={{ padding: contentPad, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListEmptyComponent={
            isFetching ? (
              <View className="py-16 items-center">
                <ActivityIndicator size="large" color="#e67e22" />
              </View>
            ) : (
              <EmptyState
                icon="✅"
                title="No expiry concerns"
                description="No batches found in this filter"
              />
            )
          }
          renderItem={({ item }) => {
            const isExpired = item.status === "expired";
            return (
              <View className="rounded-xl border border-slate-200 bg-card px-4 py-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="font-bold text-slate-800">{item.product.name}</Text>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      Batch {item.batchNo} {item.product.unit && `• ${item.quantity} ${item.product.unit}`}
                    </Text>
                    <Text className={`text-xs mt-1 ${isExpired ? "text-red-600" : "text-amber-600"}`}>
                      Expiry: {new Date(item.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </Text>
                  </View>
                  {isExpired && item.quantity > 0 && (
                    <TouchableOpacity
                      onPress={() => handleWriteOff(item.id, item.product.name)}
                      disabled={writeOff.isPending}
                      className="bg-red-100 px-3 py-1.5 rounded-lg min-h-[36px] justify-center"
                    >
                      {writeOff.isPending ? (
                        <ActivityIndicator size="small" color="#dc2626" />
                      ) : (
                        <Text className="text-xs font-semibold text-red-700">Write off</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
