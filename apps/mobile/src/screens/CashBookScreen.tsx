/**
 * CashBookScreen — cash in/out ledger (per Sprint 10).
 */
import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { cashbookApi } from "../lib/api";
import { useWsInvalidation } from "../hooks/useWsInvalidation";
import { useResponsive } from "../hooks/useResponsive";
import { formatCurrency } from "../lib/utils";

function getMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date();
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function CashBookScreen() {
  const { from, to } = useMemo(() => getMonthRange(), []);
  const { contentPad } = useResponsive();
  useWsInvalidation(["cashbook", "expenses"]);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["cashbook", from, to],
    queryFn: () => cashbookApi.get({ from, to }),
    staleTime: 30_000,
  });

  const entries = data?.entries ?? [];
  const totalIn = data?.totalIn ?? 0;
  const totalOut = data?.totalOut ?? 0;
  const balance = data?.balance ?? 0;

  const keyExtractor = useCallback((e: { id: string }) => e.id, []);

  const renderCashbookItem = useCallback(
    ({ item }: { item: any }) => {
      const amt = Number(item.amount);
      const isIn = item.type === "in" || amt > 0;
      return (
        <View
          style={{ paddingHorizontal: contentPad, paddingVertical: 12 }}
          className="flex-row items-center justify-between border-b border-slate-100"
        >
          <View>
            <Text className="font-medium text-slate-800">
              {item.category ?? item.type}
            </Text>
            {item.note && (
              <Text className="text-sm text-slate-500">{item.note}</Text>
            )}
          </View>
          <Text
            className={
              isIn ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"
            }
          >
            {isIn ? "+" : "-"}
            {formatCurrency(Math.abs(amt))}
          </Text>
        </View>
      );
    },
    [contentPad],
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="px-4 py-3 border-b border-slate-100">
        <Text className="text-xl font-bold text-slate-800">Cash Book</Text>
      </View>

      <View style={{ paddingHorizontal: contentPad, paddingVertical: contentPad }} className="bg-slate-50">
        <Text className="text-sm text-slate-600">Net Cash</Text>
        <Text className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {formatCurrency(balance)}
        </Text>
        <View className="flex-row gap-4 mt-2">
          <Text className="text-sm text-emerald-600">In: {formatCurrency(totalIn)}</Text>
          <Text className="text-sm text-red-600">Out: {formatCurrency(totalOut)}</Text>
        </View>
      </View>

      <FlatList
        data={entries}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        renderItem={renderCashbookItem}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          <Text className="text-slate-500 text-center py-8">No entries</Text>
        }
      />
    </SafeAreaView>
  );
}
