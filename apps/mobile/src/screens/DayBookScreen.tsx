/**
 * DayBookScreen — all transactions in one view (per Sprint 10).
 * Combines invoices, payments, expenses, cash in/out.
 */
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { invoiceApi, expenseApi, cashbookApi } from "../lib/api";
import { useWsInvalidation } from "../hooks/useWsInvalidation";
import { useResponsive } from "../hooks/useResponsive";
import { formatCurrency } from "../lib/utils";
import { SIZES } from "../lib/constants";

type Period = "today" | "week" | "month";

function getRange(period: Period) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (period === "today") return { from: today, to: today };
  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return { from: start.toISOString().slice(0, 10), to: today };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: from.toISOString().slice(0, 10), to: today };
}

export function DayBookScreen() {
  const [period, setPeriod] = useState<Period>("today");
  const { contentPad } = useResponsive();
  const { from, to } = getRange(period);
  useWsInvalidation(["invoices", "expenses", "cashbook"]);

  const { data: invData, refetch: refetchInv } = useQuery({
    queryKey: ["invoices-daybook", from, to],
    queryFn: () => invoiceApi.list(1, 200),
    staleTime: 30_000,
  });

  const { data: expData, refetch: refetchExp } = useQuery({
    queryKey: ["expenses-daybook", from, to],
    queryFn: () => expenseApi.list({ from, to }),
    staleTime: 30_000,
  });

  const { data: cbData, refetch: refetchCb } = useQuery({
    queryKey: ["cashbook-daybook", from, to],
    queryFn: () => cashbookApi.get({ from, to }),
    staleTime: 30_000,
  });

  const refetch = () => {
    refetchInv();
    refetchExp();
    refetchCb();
  };

  const transactions = useMemo(() => {
    const list: Array<{ id: string; type: string; date: string; label: string; amount: number; sign: "in" | "out" }> = [];
    const invs = invData?.invoices ?? [];
    invs.forEach((i: any) => {
      const d = i.createdAt?.slice(0, 10) ?? "";
      if (d >= from && d <= to) {
        list.push({
          id: `inv-${i.id}`,
          type: "invoice",
          date: d,
          label: `Invoice #${i.invoiceNo ?? i.id}`,
          amount: Number(i.total ?? 0),
          sign: "in",
        });
      }
    });
    const exps = expData?.expenses ?? [];
    exps.forEach((e: any) => {
      list.push({
        id: `exp-${e.id}`,
        type: "expense",
        date: e.date?.slice(0, 10) ?? "",
        label: e.category,
        amount: Math.abs(Number(e.amount)),
        sign: "out",
      });
    });
    const entries = cbData?.entries ?? [];
    entries.forEach((e: any) => {
      const amt = Math.abs(Number(e.amount));
      list.push({
        id: `cb-${e.id}`,
        type: "cash",
        date: e.date?.slice(0, 10) ?? "",
        label: e.category ?? e.type,
        amount: amt,
        sign: e.type === "in" || Number(e.amount) > 0 ? "in" : "out",
      });
    });
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [invData, expData, cbData, from, to]);

  const moneyIn = transactions.filter((t) => t.sign === "in").reduce((s, t) => s + t.amount, 0);
  const moneyOut = transactions.filter((t) => t.sign === "out").reduce((s, t) => s + t.amount, 0);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="px-4 py-3 border-b border-slate-100">
        <Text className="text-xl font-bold text-slate-800">Day Book</Text>
        <View className="flex-row gap-2 mt-2">
          {(["today", "week", "month"] as const).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => requestAnimationFrame(() => setPeriod(p))}
              style={{ minHeight: SIZES.TOUCH_MIN }}
              className={`px-3 py-2 rounded-lg ${period === p ? "bg-primary" : "bg-slate-100"}`}
            >
              <Text className={period === p ? "text-white font-semibold text-sm" : "text-slate-600 text-sm"}>
                {p === "today" ? "Today" : p === "week" ? "Week" : "Month"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: contentPad,
          paddingVertical: SIZES.SPACING.md,
        }}
        className="flex-row bg-slate-50"
      >
        <View className="flex-1">
          <Text className="text-xs text-slate-500">Money In</Text>
          <Text className="text-lg font-bold text-emerald-600">{formatCurrency(moneyIn)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-slate-500">Money Out</Text>
          <Text className="text-lg font-bold text-red-600">{formatCurrency(moneyOut)}</Text>
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <View
            style={{
              paddingHorizontal: contentPad,
              paddingVertical: SIZES.SPACING.md,
              minHeight: SIZES.TOUCH_MIN,
            }}
            className="flex-row items-center justify-between border-b border-slate-100"
          >
            <View>
              <Text className="font-medium text-slate-800">{item.label}</Text>
              <Text className="text-xs text-slate-500">{item.date}</Text>
            </View>
            <Text className={item.sign === "in" ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
              {item.sign === "in" ? "+" : "-"}{formatCurrency(item.amount)}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text className="text-slate-500 text-center py-8">No transactions</Text>}
      />
    </SafeAreaView>
  );
}
