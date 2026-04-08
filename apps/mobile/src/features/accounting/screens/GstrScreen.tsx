/**
 * GstrScreen — GSTR-1 / GSTR-3B summary (Sprint 22).
 * GET /api/v1/reports/gstr1
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
import { reportsApi } from "../../../lib/api";
import { Chip } from "../../../components/ui/Chip";
import { ErrorCard } from "../../../components/ui/ErrorCard";
import { COLORS } from "../../../lib/constants";

export function GstrScreen() {
  const [fy, setFy] = useState<string | undefined>(undefined);

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["reports-gstr1", fy],
    queryFn: () => reportsApi.gstr1(fy ? { fy } : undefined),
    staleTime: 60_000,
  });

  const report = data?.report;
  const b2b = (report?.b2b as unknown[]) ?? [];
  const b2cs = (report?.b2cs as unknown[]) ?? [];
  const hsn = (report?.hsn as unknown[]) ?? [];

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center px-4">
          <ErrorCard message="Failed to load GSTR report" onRetry={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="px-4 pt-4 pb-3 border-b border-slate-200 bg-card">
        <Text className="text-xl font-bold tracking-tight text-slate-800 mb-3">GSTR-1 / GSTR-3B</Text>
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
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : report ? (
          <View className="gap-4">
            <View className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <Text className="text-sm text-slate-600">Financial Year</Text>
              <Text className="text-lg font-bold text-slate-800">{report.fy}</Text>
            </View>
            <View className="bg-primary/10 rounded-xl p-4 border border-primary/20">
              <Text className="text-sm text-slate-600">B2B Invoices</Text>
              <Text className="text-2xl font-bold text-primary">{b2b.length}</Text>
            </View>
            <View className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <Text className="text-sm text-slate-600">B2CS (Small)</Text>
              <Text className="text-2xl font-bold text-emerald-700">{b2cs.length}</Text>
            </View>
            <View className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <Text className="text-sm text-slate-600">HSN Summary</Text>
              <Text className="text-2xl font-bold text-amber-700">{hsn.length} items</Text>
            </View>
            <Text className="text-xs text-slate-500 mt-2">
              Download PDF/CSV from web app for full export
            </Text>
          </View>
        ) : (
          <Text className="text-slate-500 text-center py-8">No data</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
