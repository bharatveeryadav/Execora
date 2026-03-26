/**
 * CreditNotesScreen — Credit notes list (Sprint 22).
 * GET /api/v1/credit-notes
 */
import React, { useCallback } from "react";
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
import { creditNoteApi } from "../lib/api";
import { useResponsive } from "../hooks/useResponsive";
import { formatCurrency } from "../lib/utils";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorCard } from "../components/ui/ErrorCard";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  issued: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function CreditNotesScreen() {
  const { contentPad, contentWidth } = useResponsive();
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["credit-notes"],
    queryFn: () => creditNoteApi.list({ limit: 50 }),
    staleTime: 30_000,
  });

  const notes = data?.creditNotes ?? [];

  const keyExtractor = useCallback((n: { id: string }) => n.id, []);

  const renderCreditNote = useCallback(({ item }: { item: any }) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
    return (
      <TouchableOpacity
        className="flex-row items-center rounded-xl border border-slate-200 bg-card px-4 py-3"
        activeOpacity={0.7}
      >
        <View className="flex-1">
          <Text className="font-bold text-slate-800">{item.creditNoteNo}</Text>
          <Text className="text-xs text-slate-500">
            {item.customer?.name ?? "—"}{" "}
            {item.invoice?.invoiceNo ? `• Inv ${item.invoice.invoiceNo}` : ""}
          </Text>
        </View>
        <View className="items-end">
          <Text className="font-bold text-primary">{formatCurrency(item.total)}</Text>
          <View className={`mt-1 px-2 py-0.5 rounded-full ${sc}`}>
            <Text className="text-[10px] font-semibold">{item.status}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: contentPad }}>
          <ErrorCard message="Failed to load credit notes" onRetry={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View style={{ flex: 1, width: "100%", alignItems: "center" }}>
        <View style={{ width: "100%", maxWidth: contentWidth, flex: 1 }}>
      <View style={{ paddingHorizontal: contentPad, paddingTop: contentPad, paddingBottom: 12 }} className="border-b border-slate-200 bg-card">
        <Text className="text-xl font-bold tracking-tight text-slate-800">Credit Notes</Text>
      </View>

      <FlatList
        data={notes}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        contentContainerStyle={{ padding: contentPad, paddingBottom: 32 }}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          isFetching ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color="#e67e22" />
            </View>
          ) : (
            <EmptyState
              iconName="document-outline"
              title="No credit notes"
              description="Create credit notes from invoice returns"
            />
          )
        }
        renderItem={renderCreditNote}
      />
        </View>
      </View>
    </SafeAreaView>
  );
}
