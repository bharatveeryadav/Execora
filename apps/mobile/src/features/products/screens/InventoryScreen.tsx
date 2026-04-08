import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "../../../lib/api";

export function InventoryScreen() {
  const valuationQuery = useQuery({
    queryKey: ["inventory", "valuation"],
    queryFn: () => inventoryApi.getValuation(),
    staleTime: 10_000,
  });

  const movementQuery = useQuery({
    queryKey: ["inventory", "movements"],
    queryFn: () => inventoryApi.getMovements({ limit: 30 }),
    staleTime: 10_000,
  });

  const locationQuery = useQuery({
    queryKey: ["inventory", "locations"],
    queryFn: () => inventoryApi.listLocations(),
    staleTime: 30_000,
  });

  const refreshing =
    valuationQuery.isFetching ||
    movementQuery.isFetching ||
    locationQuery.isFetching;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              valuationQuery.refetch();
              movementQuery.refetch();
              locationQuery.refetch();
            }}
          />
        }
      >
        <Text className="text-2xl font-bold text-slate-800">Inventory API</Text>
        <Text className="text-slate-500 mt-1 mb-4">
          Valuation, movements and warehouse locations
        </Text>

        <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
          <Text className="font-semibold text-slate-800">Stock valuation</Text>
          <Text className="text-slate-600 mt-1">
            Products: {valuationQuery.data?.productCount ?? 0}
          </Text>
          <Text className="text-slate-600">
            Total value: {valuationQuery.data?.totalValue ?? 0}
          </Text>
        </View>

        <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
          <Text className="font-semibold text-slate-800">Recent movements</Text>
          <Text className="text-slate-600 mt-1">
            Count: {movementQuery.data?.movements?.length ?? 0}
          </Text>
        </View>

        <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
          <Text className="font-semibold text-slate-800">
            Warehouse locations
          </Text>
          <Text className="text-slate-600 mt-1">
            {(locationQuery.data?.locations ?? []).length} locations
          </Text>
        </View>

        {(valuationQuery.data?.items ?? []).slice(0, 10).map((it) => (
          <TouchableOpacity
            key={it.productId}
            className="bg-white rounded-2xl border border-slate-200 p-4 mb-2"
          >
            <Text className="font-semibold text-slate-800">{it.name}</Text>
            <Text className="text-slate-600 mt-0.5">SKU: {it.sku ?? "-"}</Text>
            <Text className="text-slate-600">Stock: {it.stock}</Text>
            <Text className="text-slate-600">Value: {it.value}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
