/**
 * BalanceSheetScreen — P&L summary (Sprint 21).
 * GET /api/v1/reports/pnl — revenue, expenses, profit, outstanding
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { reportsApi, expenseApi } from "../lib/api";
import { formatCurrency } from "../lib/utils";
import { Chip } from "../components/ui/Chip";
import { ErrorCard } from "../components/ui/ErrorCard";

export function BalanceSheetScreen() {
  const [fy, setFy] = useState<string | undefined>(undefined);

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["reports-pnl", fy],
    queryFn: () => reportsApi.pnl(fy ? { fy } : undefined),
    staleTime: 60_000,
  });

  const fyRange = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (m >= 3) return { from: `${y}-04-01`, to: `${y + 1}-03-31` };
    return { from: `${y - 1}-04-01`, to: `${y}-03-31` };
  })();

  const { data: expData } = useQuery({
    queryKey: ["expenses-summary-balance", fyRange.from, fyRange.to],
    queryFn: () => expenseApi.summary({ from: fyRange.from, to: fyRange.to }),
    staleTime: 60_000,
  });

  const report = data?.report;
  const totals = report?.totals ?? { revenue: 0, expenses: 0, collected: 0, outstanding: 0, netRevenue: 0, collectionRate: 0 };
  const expenses = expData?.total ?? 0;
  const profit = (totals.netRevenue ?? totals.revenue ?? 0) - expenses;

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center px-4">
          <ErrorCard message="Failed to load report" onRetry={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <View className="px-4 pt-4 pb-3 border-b border-slate-200 bg-card">
        <Text className="text-xl font-bold tracking-tight text-slate-800 mb-3">Balance / P&L</Text>
        <View className="flex-row gap-2">
          <Chip label="Current FY" selected={!fy} onPress={() => setFy(undefined)} />
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        contentContainerStyle={{ padding: 16 }}
      >
        {isFetching && !report ? (
          <View className="py-16 items-center">
            <ActivityIndicator size="large" color="#e67e22" />
          </View>
        ) : (
          <View className="gap-4">
            <View className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <Text className="text-sm text-slate-600">Revenue</Text>
              <Text className="text-2xl font-bold text-emerald-700">
                {formatCurrency(totals.revenue ?? 0)}
              </Text>
            </View>
            <View className="bg-red-50 rounded-xl p-4 border border-red-100">
              <Text className="text-sm text-slate-600">Expenses</Text>
              <Text className="text-2xl font-bold text-red-700">
                {formatCurrency(expenses)}
              </Text>
            </View>
            <View className="bg-primary/10 rounded-xl p-4 border border-primary/20">
              <Text className="text-sm text-slate-600">Profit</Text>
              <Text className="text-2xl font-bold text-primary">
                {formatCurrency(profit)}
              </Text>
            </View>
            <View className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <Text className="text-sm text-slate-600">Outstanding</Text>
              <Text className="text-2xl font-bold text-amber-700">
                {formatCurrency(totals.outstanding ?? 0)}
              </Text>
            </View>
            <View className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <Text className="text-sm text-slate-600">Collected</Text>
              <Text className="text-xl font-bold text-slate-800">
                {formatCurrency(totals.collected ?? 0)}
              </Text>
              <Text className="text-xs text-slate-500 mt-1">
                Collection rate: {(totals.collectionRate ?? 0).toFixed(1)}%
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
