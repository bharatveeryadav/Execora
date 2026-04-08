import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { posApi } from "../../../lib/api";
import { showAlert } from "../../../lib/alerts";

export function PosScreen() {
  const activeQuery = useQuery({
    queryKey: ["pos", "active"],
    queryFn: () => posApi.getActiveSession("default"),
    staleTime: 5_000,
  });

  const sessionsQuery = useQuery({
    queryKey: ["pos", "sessions"],
    queryFn: () => posApi.listSessions(20),
    staleTime: 5_000,
  });

  const cartsQuery = useQuery({
    queryKey: ["pos", "carts"],
    queryFn: () => posApi.listCarts("pending"),
    staleTime: 5_000,
  });

  const openSession = useMutation({
    mutationFn: () =>
      posApi.openSession({ counterId: "default", openingCash: 0 }),
    onSuccess: () => {
      activeQuery.refetch();
      sessionsQuery.refetch();
    },
    onError: (e: Error) =>
      showAlert("Error", e.message ?? "Failed to open POS session"),
  });

  const refreshing =
    activeQuery.isFetching || sessionsQuery.isFetching || cartsQuery.isFetching;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              activeQuery.refetch();
              sessionsQuery.refetch();
              cartsQuery.refetch();
            }}
          />
        }
      >
        <Text className="text-2xl font-bold text-slate-800">POS</Text>
        <Text className="text-slate-500 mt-1 mb-4">Session and cart APIs</Text>

        <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
          <Text className="font-semibold text-slate-800">Active session</Text>
          <Text className="text-slate-600 mt-1">
            {activeQuery.data?.session ? "Open" : "No active session"}
          </Text>
          <TouchableOpacity
            onPress={() => openSession.mutate()}
            className="mt-3 bg-slate-800 rounded-xl py-3 items-center"
            disabled={openSession.isPending}
          >
            <Text className="text-white font-semibold">Open Session</Text>
          </TouchableOpacity>
          <Text className="text-slate-400 text-xs mt-2">
            Backend POS session storage is currently stubbed.
          </Text>
        </View>

        <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
          <Text className="font-semibold text-slate-800">Recent sessions</Text>
          <Text className="text-slate-600 mt-1">
            {sessionsQuery.data?.count ?? 0} sessions
          </Text>
        </View>

        <View className="bg-white rounded-2xl border border-slate-200 p-4">
          <Text className="font-semibold text-slate-800">Pending carts</Text>
          <Text className="text-slate-600 mt-1">
            {(cartsQuery.data?.carts ?? []).length} carts
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
