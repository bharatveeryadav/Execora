import React from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { showAlert } from "../../../lib/alerts";
import { subscriptionApi } from "../../../lib/api";

const PLANS: Array<"free" | "pro" | "enterprise"> = ["free", "pro", "enterprise"];

export function SubscriptionScreen() {
  const qc = useQueryClient();

  const currentQuery = useQuery({
    queryKey: ["subscription", "current"],
    queryFn: () => subscriptionApi.getCurrent(),
    staleTime: 20_000,
  });

  const usageQuery = useQuery({
    queryKey: ["subscription", "usage"],
    queryFn: () => subscriptionApi.getUsage(),
    staleTime: 20_000,
  });

  const plansQuery = useQuery({
    queryKey: ["subscription", "plans"],
    queryFn: () => subscriptionApi.getPlans(),
    staleTime: 60_000,
  });

  const activate = useMutation({
    mutationFn: (plan: "free" | "pro" | "enterprise") => subscriptionApi.activate(plan),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["subscription"] });
      showAlert("Updated", "Subscription plan updated.");
    },
    onError: (e: Error) => showAlert("Error", e.message ?? "Failed to update plan"),
  });

  const cancel = useMutation({
    mutationFn: () => subscriptionApi.cancel(true),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["subscription"] });
      showAlert("Done", "Cancellation has been scheduled at period end.");
    },
    onError: (e: Error) => showAlert("Error", e.message ?? "Failed to cancel subscription"),
  });

  const refreshing = currentQuery.isFetching || usageQuery.isFetching;
  const current = currentQuery.data?.subscription;
  const usage = usageQuery.data;
  const plans = plansQuery.data?.plans ?? [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
          currentQuery.refetch();
          usageQuery.refetch();
          plansQuery.refetch();
        }} />}
      >
        <Text className="text-2xl font-bold text-slate-800">Subscription</Text>
        <Text className="text-slate-500 mt-1 mb-4">Plan, usage and quick actions</Text>

        <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
          <Text className="text-slate-500 text-xs">Current plan</Text>
          <Text className="text-xl font-bold text-slate-800 mt-1">{current?.plan ?? "-"}</Text>
          <Text className="text-slate-500 mt-1">Status: {current?.status ?? "-"}</Text>
          {current?.note ? <Text className="text-slate-400 mt-1 text-xs">{current.note}</Text> : null}
        </View>

        <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
          <Text className="text-base font-semibold text-slate-800 mb-3">Usage ({usage?.period ?? "-"})</Text>
          <Text className="text-slate-700">Invoices this month: {usage?.usage?.invoicesThisMonth ?? 0}</Text>
          <Text className="text-slate-700">Products: {usage?.usage?.totalProducts ?? 0}</Text>
          <Text className="text-slate-700">Users: {usage?.usage?.totalUsers ?? 0}</Text>
        </View>

        <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
          <Text className="text-base font-semibold text-slate-800 mb-3">Change plan</Text>
          <View className="flex-row gap-2">
            {PLANS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => activate.mutate(p)}
                disabled={activate.isPending}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
              >
                <Text className="font-semibold text-slate-700">{p.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {plans.length > 0 ? (
            <Text className="text-slate-400 text-xs mt-2">
              Available: {plans.map((p) => p.name).join(", ")}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() => cancel.mutate()}
          disabled={cancel.isPending}
          className="bg-rose-600 rounded-xl py-3 items-center"
        >
          <Text className="text-white font-semibold">Cancel at period end</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
