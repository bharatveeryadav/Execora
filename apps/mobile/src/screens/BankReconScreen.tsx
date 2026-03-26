/**
 * BankReconScreen — Bank reconciliation view (Sprint 21).
 * GET /api/v1/cashbook — cash in/out with date range filter
 */
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { cashbookApi } from "../lib/api";
import { useWsInvalidation } from "../hooks/useWsInvalidation";
import { formatCurrency } from "../lib/utils";
import { Chip } from "../components/ui/Chip";
import { ErrorCard } from "../components/ui/ErrorCard";

function getPeriodRange(period: string) {
  const now = new Date();
  let from: Date;
  let to: Date = now;
  if (period === "week") {
    from = new Date(now);
    from.setDate(from.getDate() - 7);
  } else if (period === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 0);
  }
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function BankReconScreen() {
  const [period, setPeriod] = useState<"week" | "month" | "2month">("month");
  const { from, to } = useMemo(() => getPeriodRange(period), [period]);
  useWsInvalidation(["cashbook"]);

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["cashbook", from, to],
    queryFn: () => cashbookApi.get({ from, to }),
    staleTime: 30_000,
  });

  const entries = data?.entries ?? [];
  const totalIn = data?.totalIn ?? 0;
  const totalOut = data?.totalOut ?? 0;
  const balance = data?.balance ?? 0;

  const keyExtractor = useCallback((e: { id: string }) => e.id, []);

  const renderEntry = useCallback(({ item }: { item: any }) => {
    const amt = Number(item.amount);
    const isIn = item.type === "in" || amt > 0;
    return (
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
        <View>
          <Text className="font-medium text-slate-800">
            {item.category ?? item.type}
          </Text>
          {item.note && (
            <Text className="text-sm text-slate-500">{item.note}</Text>
          )}
          <Text className="text-xs text-slate-400 mt-0.5">
            {new Date(item.date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
        <Text
          className={
            isIn
              ? "text-emerald-600 font-semibold"
              : "text-red-600 font-semibold"
          }
        >
          {isIn ? "+" : "-"}
          {formatCurrency(Math.abs(amt))}
        </Text>
      </View>
    );
  }, []);

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center px-4">
          <ErrorCard
            message="Failed to load cashbook"
            onRetry={() => refetch()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="px-4 pt-4 pb-3 border-b border-slate-200 bg-card">
        <Text className="text-xl font-bold tracking-tight text-slate-800 mb-3">
          Bank Reconciliation
        </Text>
        <View className="flex-row gap-2">
          <Chip
            label="Week"
            selected={period === "week"}
            onPress={() => setPeriod("week")}
          />
          <Chip
            label="Month"
            selected={period === "month"}
            onPress={() => setPeriod("month")}
          />
          <Chip
            label="2 Months"
            selected={period === "2month"}
            onPress={() => setPeriod("2month")}
          />
        </View>
      </View>

      <View className="px-4 py-4 bg-slate-50">
        <Text className="text-sm text-slate-600">
          Net Cash ({from} to {to})
        </Text>
        <Text
          className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}
        >
          {formatCurrency(balance)}
        </Text>
        <View className="flex-row gap-4 mt-2">
          <Text className="text-sm text-emerald-600">
            In: {formatCurrency(totalIn)}
          </Text>
          <Text className="text-sm text-red-600">
            Out: {formatCurrency(totalOut)}
          </Text>
        </View>
      </View>

      <FlatList
        data={entries}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        renderItem={renderEntry}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          isFetching ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color="#e67e22" />
            </View>
          ) : (
            <Text className="text-slate-500 text-center py-8">
              No entries in this period
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}
