/**
 * ReportsScreen — summary KPIs and report links (per Sprint 11).
 */
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { summaryApi, expenseApi } from "../lib/api";
import { useWsInvalidation } from "../hooks/useWsInvalidation";
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

export function ReportsScreen() {
  const { from, to } = getMonthRange();
  useWsInvalidation(["summary", "expenses"]);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["summary-range", from, to],
    queryFn: () => summaryApi.range(from, to),
    staleTime: 60_000,
  });

  const { data: expData } = useQuery({
    queryKey: ["expenses-summary", from, to],
    queryFn: () => expenseApi.summary({ from, to }),
    staleTime: 60_000,
  });

  const summary = data?.summary ?? { totalSales: 0, totalPayments: 0, invoiceCount: 0 };
  const expenses = expData?.total ?? 0;
  const revenue = summary.totalSales;
  const profit = revenue - expenses;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="px-4 py-3 border-b border-slate-100">
        <Text className="text-xl font-bold text-slate-800">Reports</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        contentContainerStyle={{ padding: 16 }}
      >
        <View className="flex-row flex-wrap gap-3 mb-6">
          <View className="flex-1 min-w-[140px] bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <Text className="text-sm text-slate-600">Revenue</Text>
            <Text className="text-xl font-bold text-emerald-700">{formatCurrency(revenue)}</Text>
          </View>
          <View className="flex-1 min-w-[140px] bg-red-50 p-4 rounded-xl border border-red-100">
            <Text className="text-sm text-slate-600">Expenses</Text>
            <Text className="text-xl font-bold text-red-700">{formatCurrency(expenses)}</Text>
          </View>
          <View className="flex-1 min-w-[140px] bg-primary/10 p-4 rounded-xl border border-indigo-100">
            <Text className="text-sm text-slate-600">Profit</Text>
            <Text className="text-xl font-bold text-primary-700">{formatCurrency(profit)}</Text>
          </View>
          <View className="flex-1 min-w-[140px] bg-amber-50 p-4 rounded-xl border border-amber-100">
            <Text className="text-sm text-slate-600">Bills</Text>
            <Text className="text-xl font-bold text-amber-700">{summary.invoiceCount}</Text>
          </View>
        </View>

        <Text className="text-sm font-semibold text-slate-600 mb-2">Quick Reports</Text>
        <View className="gap-2">
          {[
            { label: "Sales Summary", emoji: "📈" },
            { label: "P&L Report", emoji: "📊" },
            { label: "GSTR-1", emoji: "🧾" },
            { label: "Party Statement", emoji: "👥" },
          ].map((r) => (
            <TouchableOpacity
              key={r.label}
              className="flex-row items-center p-4 bg-slate-50 rounded-xl border border-slate-100"
            >
              <Text className="text-2xl mr-3">{r.emoji}</Text>
              <Text className="font-medium text-slate-800">{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
