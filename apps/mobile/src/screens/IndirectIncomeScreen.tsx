/**
 * IndirectIncomeScreen — Income-type expenses (Sprint 22).
 * expenseApi.list with type=income
 */
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { expenseApi } from "../lib/api";
import { useWsInvalidation } from "../hooks/useWsInvalidation";
import { formatCurrency } from "../lib/utils";
import { Chip } from "../components/ui/Chip";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorCard } from "../components/ui/ErrorCard";

function getPeriodRange(period: string) {
  const now = new Date();
  let from: Date;
  const to = now;
  if (period === "week") {
    from = new Date(now);
    from.setDate(from.getDate() - 7);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function IndirectIncomeScreen() {
  const [period, setPeriod] = useState<"week" | "month">("month");
  const { from, to } = getPeriodRange(period);
  useWsInvalidation(["expenses"]);

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["expenses-income", from, to],
    queryFn: () => expenseApi.list({ from, to, type: "income" }),
    staleTime: 30_000,
  });

  const expenses = data?.expenses ?? [];
  const total = data?.total ?? 0;

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center px-4">
          <ErrorCard message="Failed to load income" onRetry={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="px-4 pt-4 pb-3 border-b border-slate-200 bg-card">
        <Text className="text-xl font-bold tracking-tight text-slate-800 mb-3">Indirect Income</Text>
        <View className="flex-row gap-2">
          <Chip label="Week" selected={period === "week"} onPress={() => setPeriod("week")} />
          <Chip label="Month" selected={period === "month"} onPress={() => setPeriod("month")} />
        </View>
        <Text className="text-sm font-semibold text-emerald-600 mt-2">
          Total: {formatCurrency(total)}
        </Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
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
              icon="💰"
              title="No indirect income"
              description="Add income entries from Expenses (type: income)"
            />
          )
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-card px-4 py-3">
            <View>
              <Text className="font-medium text-slate-800">{item.category}</Text>
              {item.note && <Text className="text-sm text-slate-500">{item.note}</Text>}
              {item.vendor && <Text className="text-xs text-slate-400">{item.vendor}</Text>}
            </View>
            <Text className="font-bold text-emerald-600">
              +{formatCurrency(Number(item.amount))}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
