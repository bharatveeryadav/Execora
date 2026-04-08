import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { auditApi } from "../../../lib/api";

export function AuditScreen() {
  const [tab, setTab] = useState<"activity" | "all">("activity");

  const listQuery = useQuery({
    queryKey: ["audit", "list"],
    queryFn: () => auditApi.list({ limit: 100 }),
    staleTime: 10_000,
  });

  const activityQuery = useQuery({
    queryKey: ["audit", "activity"],
    queryFn: () => auditApi.activity(100),
    staleTime: 10_000,
  });

  const entries = listQuery.data?.entries ?? [];
  const logs = activityQuery.data?.logs ?? [];
  const items = tab === "activity" ? logs : entries;
  const refreshing = listQuery.isFetching || activityQuery.isFetching;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <View className="px-4 pt-4 pb-3 border-b border-slate-200 bg-white">
        <Text className="text-2xl font-bold text-slate-800">Audit Log</Text>
        <Text className="text-slate-500 mt-1">
          Recent actions and immutable trail
        </Text>
        <View className="flex-row gap-2 mt-3">
          <TouchableOpacity
            onPress={() => setTab("activity")}
            className={`px-3 py-2 rounded-full ${tab === "activity" ? "bg-slate-800" : "bg-slate-200"}`}
          >
            <Text
              className={
                tab === "activity"
                  ? "text-white font-semibold"
                  : "text-slate-700 font-semibold"
              }
            >
              Activity
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab("all")}
            className={`px-3 py-2 rounded-full ${tab === "all" ? "bg-slate-800" : "bg-slate-200"}`}
          >
            <Text
              className={
                tab === "all"
                  ? "text-white font-semibold"
                  : "text-slate-700 font-semibold"
              }
            >
              All Entries
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              listQuery.refetch();
              activityQuery.refetch();
            }}
          />
        }
      >
        {items.length === 0 ? (
          <View className="bg-white rounded-2xl border border-slate-200 p-5">
            <Text className="text-slate-700">No audit entries found.</Text>
          </View>
        ) : (
          items.map((it: any) => (
            <View
              key={it.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 mb-2"
            >
              <Text className="text-slate-800 font-semibold">{it.action}</Text>
              <Text className="text-slate-500 mt-0.5">
                {it.entityType}
                {it.entityId ? ` · ${it.entityId}` : ""}
              </Text>
              <Text className="text-slate-400 text-xs mt-1">
                {new Date(it.createdAt).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
