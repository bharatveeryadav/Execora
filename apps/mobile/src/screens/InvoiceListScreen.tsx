import React, { useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { invoiceApi } from "../lib/api";
import { inr, type Invoice } from "@execora/shared";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  paid: { bg: "bg-green-100", text: "text-green-700" },
  partial: { bg: "bg-amber-100", text: "text-amber-700" },
  overdue: { bg: "bg-red-100", text: "text-red-700" },
  draft: { bg: "bg-slate-100", text: "text-slate-500" },
  confirmed: { bg: "bg-blue-100", text: "text-blue-700" },
};

export function InvoiceListScreen() {
  const navigation = useNavigation();
  const [page, setPage] = useState(1);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["invoices", page],
    queryFn: () => invoiceApi.list(page, 20),
    staleTime: 30_000,
  });

  const invoices: Invoice[] = data?.invoices ?? [];
  const total = data?.total ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 pt-4 pb-3 border-b border-slate-100 flex-row items-center justify-between">
        <Text className="text-xl font-black text-slate-800">Invoices</Text>
        <Text className="text-sm text-slate-400">{total} total</Text>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(inv) => inv.id}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          isFetching ? (
            <View className="py-10 items-center">
              <ActivityIndicator color="#6366f1" />
            </View>
          ) : (
            <View className="py-10 items-center">
              <Text className="text-slate-400 text-sm">No invoices yet</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Billing" as never)}
                className="mt-3 bg-indigo-600 rounded-xl px-5 py-2"
              >
                <Text className="text-white font-semibold text-sm">
                  Create first invoice
                </Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item: inv }) => {
          const sc = STATUS_COLORS[inv.status] ?? STATUS_COLORS.draft;
          return (
            <TouchableOpacity
              className="flex-row items-center rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
              activeOpacity={0.7}
            >
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-0.5">
                  <Text className="text-sm font-bold text-slate-800">
                    #{(inv as any).invoiceNo ?? inv.id.slice(-8).toUpperCase()}
                  </Text>
                  <View className={`px-2 py-0.5 rounded-full ${sc.bg}`}>
                    <Text className={`text-[10px] font-semibold ${sc.text}`}>
                      {inv.status}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-slate-500">
                  {inv.customer?.name ?? "Walk-in"}
                </Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">
                  {new Date(inv.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-base font-black text-indigo-600">
                  ₹{inr(inv.total)}
                </Text>
                <Text className="text-[10px] text-slate-400 mt-0.5">
                  {inv.items?.length ?? 0} item
                  {(inv.items?.length ?? 0) !== 1 ? "s" : ""}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        onEndReached={() => {
          if (invoices.length < total) setPage((p) => p + 1);
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          page > 1 && isFetching ? (
            <View className="py-4 items-center">
              <ActivityIndicator color="#6366f1" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
