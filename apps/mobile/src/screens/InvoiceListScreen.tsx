import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { invoiceApi } from "../lib/api";
import { inr, type Invoice } from "@execora/shared";
import { useWsInvalidation } from "../hooks/useWsInvalidation";
import { Chip } from "../components/ui/Chip";
import { EmptyState } from "../components/ui/EmptyState";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  paid: { bg: "bg-green-100", text: "text-green-700" },
  pending: { bg: "bg-amber-100", text: "text-amber-700" },
  partial: { bg: "bg-amber-100", text: "text-amber-700" },
  overdue: { bg: "bg-red-100", text: "text-red-700" },
  draft: { bg: "bg-slate-100", text: "text-slate-500" },
  confirmed: { bg: "bg-blue-100", text: "text-blue-700" },
  cancelled: { bg: "bg-red-100", text: "text-red-700" },
};

const STATUS_FILTERS = ["all", "paid", "pending", "draft"] as const;

export function InvoiceListScreen() {
  const navigation = useNavigation<any>();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  useWsInvalidation(["invoices", "summary"]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["invoices", page],
    queryFn: () => invoiceApi.list(page, 20),
    staleTime: 30_000,
  });

  const allInvoices: Invoice[] = data?.invoices ?? [];
  const invoices = useMemo(() => {
    if (statusFilter === "all") return allInvoices;
    return allInvoices.filter((inv) => inv.status === statusFilter);
  }, [allInvoices, statusFilter]);
  const total = data?.total ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-3 border-b border-slate-200 bg-card">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xl font-bold tracking-tight text-slate-800">Bills</Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-sm text-slate-400">{total} total</Text>
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate("Billing" as never)}
              className="bg-primary px-3 py-1.5 rounded-lg"
            >
              <Text className="text-white font-semibold text-sm">+ New</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
          <View className="flex-row gap-2">
            {STATUS_FILTERS.map((s) => (
              <Chip
                key={s}
                label={s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                selected={statusFilter === s}
                onPress={() => setStatusFilter(s)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(inv) => inv.id}
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
              title="No invoices yet"
              description="Create your first invoice to get started"
              actionLabel="Create first invoice"
              onAction={() => navigation.getParent()?.navigate("Billing" as never)}
            />
          )
        }
        renderItem={({ item: inv }) => {
          const sc = STATUS_COLORS[inv.status] ?? STATUS_COLORS.draft;
          return (
            <TouchableOpacity
              className="flex-row items-center rounded-xl border border-slate-200 bg-card px-4 py-3 shadow-sm"
              activeOpacity={0.7}
              onPress={() => (navigation as any).navigate("InvoiceDetail", { id: inv.id })}
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
                <Text className="text-base font-black text-primary">
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
          if (statusFilter === "all" && invoices.length < total) setPage((p) => p + 1);
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          page > 1 && isFetching ? (
            <View className="py-4 items-center">
              <ActivityIndicator color="#e67e22" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
