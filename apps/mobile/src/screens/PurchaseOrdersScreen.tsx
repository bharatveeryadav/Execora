/**
 * PurchaseOrdersScreen — Purchase orders list (Sprint 22).
 * GET /api/v1/purchase-orders
 */
import React from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { purchaseOrderApi } from "../lib/api";
import { formatCurrency } from "../lib/utils";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorCard } from "../components/ui/ErrorCard";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-amber-100 text-amber-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function PurchaseOrdersScreen() {
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => purchaseOrderApi.list({ limit: 50 }),
    staleTime: 30_000,
  });

  const orders = data?.purchaseOrders ?? [];

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center px-4">
          <ErrorCard message="Failed to load purchase orders" onRetry={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="px-4 pt-4 pb-3 border-b border-slate-200 bg-card">
        <Text className="text-xl font-bold tracking-tight text-slate-800">Purchase Orders</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          isFetching ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color="#e67e22" />
            </View>
          ) : (
            <EmptyState
              icon="📋"
              title="No purchase orders"
              description="Create POs from Purchases or web app"
            />
          )
        }
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
          return (
            <TouchableOpacity
              className="flex-row items-center rounded-xl border border-slate-200 bg-card px-4 py-3"
              activeOpacity={0.7}
            >
              <View className="flex-1">
                <Text className="font-bold text-slate-800">{item.poNo}</Text>
                <Text className="text-xs text-slate-500">
                  {(item as any).supplier?.name ?? "—"}
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-bold text-primary">{formatCurrency((item as any).total ?? 0)}</Text>
                <View className={`mt-1 px-2 py-0.5 rounded-full ${sc}`}>
                  <Text className="text-[10px] font-semibold">{item.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}
