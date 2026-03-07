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
import { invoiceApi, customerApi } from "../lib/api";
import { inr } from "@execora/shared";

export function DashboardScreen() {
  const {
    data: invoices,
    refetch: refetchInvoices,
    isFetching: loadingInvoices,
  } = useQuery({
    queryKey: ["invoices", "dashboard"],
    queryFn: () => invoiceApi.list(1, 5),
    staleTime: 60_000,
  });

  const { data: customers, isFetching: loadingCustomers } = useQuery({
    queryKey: ["customers", "dashboard"],
    queryFn: () => customerApi.list(1, 5),
    staleTime: 60_000,
  });

  const refreshing = loadingInvoices || loadingCustomers;
  const todayInvoices = invoices?.invoices ?? [];
  const totalToday = todayInvoices.reduce((s, i) => s + (i.total ?? 0), 0);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetchInvoices} />
        }
      >
        {/* Header */}
        <Text className="text-2xl font-black text-slate-800 mb-1">
          Dashboard
        </Text>
        <Text className="text-sm text-slate-400 mb-4">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </Text>

        {/* Stats row */}
        <View className="flex-row gap-3 mb-4">
          <StatCard
            label="Today's Sales"
            value={`₹${inr(totalToday)}`}
            icon="💰"
            color="bg-indigo-50 border-indigo-100"
            valueColor="text-indigo-700"
          />
          <StatCard
            label="Invoices"
            value={String(invoices?.total ?? 0)}
            icon="🧾"
            color="bg-emerald-50 border-emerald-100"
            valueColor="text-emerald-700"
          />
        </View>
        <View className="flex-row gap-3 mb-6">
          <StatCard
            label="Customers"
            value={String(customers?.total ?? 0)}
            icon="👥"
            color="bg-amber-50 border-amber-100"
            valueColor="text-amber-700"
          />
          <StatCard
            label="Pending"
            value="—"
            icon="⏳"
            color="bg-slate-50 border-slate-100"
            valueColor="text-slate-500"
          />
        </View>

        {/* Recent invoices */}
        <Text className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-2">
          Recent Invoices
        </Text>
        <View className="border border-slate-200 rounded-2xl overflow-hidden">
          {todayInvoices.length === 0 && (
            <View className="py-8 items-center">
              <Text className="text-slate-400 text-sm">
                No invoices yet today
              </Text>
            </View>
          )}
          {todayInvoices.map((inv, idx) => (
            <View
              key={inv.id}
              className={`flex-row items-center px-4 py-3 ${idx > 0 ? "border-t border-slate-100" : ""}`}
            >
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-800">
                  {(inv as any).invoiceNo ?? inv.id.slice(-6)}
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5">
                  {inv.customer?.name ?? "Walk-in"}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-sm font-bold text-indigo-600">
                  ₹{inr(inv.total)}
                </Text>
                <View
                  className={`mt-1 px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-green-100" : "bg-amber-100"}`}
                >
                  <Text
                    className={`text-[10px] font-semibold ${inv.status === "paid" ? "text-green-700" : "text-amber-700"}`}
                  >
                    {inv.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  valueColor,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  valueColor: string;
}) {
  return (
    <View className={`flex-1 rounded-2xl border p-4 ${color}`}>
      <Text className="text-2xl mb-1">{icon}</Text>
      <Text className={`text-xl font-black ${valueColor}`}>{value}</Text>
      <Text className="text-xs text-slate-500 mt-0.5">{label}</Text>
    </View>
  );
}
