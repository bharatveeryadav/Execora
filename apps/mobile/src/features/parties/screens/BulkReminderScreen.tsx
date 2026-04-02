import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { customerApi, reminderApi } from "..";
import { invoiceApi } from "../../../lib/api";
import { showAlert } from "../../../lib/alerts";
import { useResponsive } from "../../../hooks/useResponsive";
import { ScreenInner } from "../../../components/ui/ScreenLayout";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorCard } from "../../../components/ui/ErrorCard";
import { Skeleton } from "../../../components/ui/Skeleton";
import { inr, type Customer } from "@execora/shared";
import { TYPO } from "../../../lib/typography";
import type { PartiesStackParams } from "../../../navigation";

type Props = NativeStackScreenProps<PartiesStackParams, "BulkReminder">;

export function BulkReminderScreen({ navigation }: Props) {
  const qc = useQueryClient();
  const { contentPad } = useResponsive();

  const [daysOffset, setDaysOffset] = useState("0");
  const [message, setMessage] = useState("");
  const [onlyHighOverdue, setOnlyHighOverdue] = useState(true);

  const {
    data: customersData,
    isFetching: customersFetching,
    isError: customersError,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ["customers", "bulk-reminder"],
    queryFn: () => customerApi.list(1, 500),
    staleTime: 20_000,
  });

  const {
    data: invoicesData,
    isFetching: invoicesFetching,
    isError: invoicesError,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ["invoices", "bulk-reminder"],
    queryFn: () => invoiceApi.list(1, 1000),
    staleTime: 20_000,
  });

  const customers: Customer[] = customersData?.customers ?? [];
  const invoices = invoicesData?.invoices ?? [];

  const agingMap = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const map = new Map<string, number>();
    for (const inv of invoices) {
      if ((inv as any).status === "paid" || (inv as any).status === "cancelled")
        continue;
      const remaining =
        parseFloat(String((inv as any).total)) -
        parseFloat(String((inv as any).paidAmount ?? 0));
      if (remaining <= 0) continue;
      const invDate = new Date(
        (inv as any).invoiceDate ?? (inv as any).createdAt,
      );
      invDate.setHours(0, 0, 0, 0);
      const days = Math.floor(
        (today.getTime() - invDate.getTime()) / 86_400_000,
      );
      const customerId = (inv as any).customerId;
      const existing = map.get(customerId);
      if (existing === undefined || days > existing) map.set(customerId, days);
    }
    return map;
  }, [invoices]);

  const overdueCustomers = useMemo(
    () =>
      customers
        .filter((c) => parseFloat(String(c.balance)) > 0)
        .map((c) => ({ ...c, ageDays: agingMap.get(c.id) ?? 0 }))
        .sort((a, b) => (b as any).ageDays - (a as any).ageDays),
    [agingMap, customers],
  );

  const targets = useMemo(() => {
    if (!onlyHighOverdue) return overdueCustomers;
    return overdueCustomers.filter((c) => ((c as any).ageDays ?? 0) >= 31);
  }, [onlyHighOverdue, overdueCustomers]);

  const targetAmount = useMemo(
    () =>
      targets.reduce(
        (sum, c) => sum + Math.max(0, parseFloat(String(c.balance)) || 0),
        0,
      ),
    [targets],
  );

  const bulkReminderMutation = useMutation({
    mutationFn: (payload: {
      customerIds: string[];
      message?: string;
      daysOffset?: number;
    }) => reminderApi.bulkCreate(payload),
    onSuccess: (res) => {
      const scheduled = res?.reminders?.length ?? 0;
      qc.invalidateQueries({ queryKey: ["reminders"] });
      showAlert(
        "",
        `${scheduled} reminder${scheduled === 1 ? "" : "s"} scheduled`,
      );
      navigation.goBack();
    },
    onError: () => showAlert("Error", "Failed to schedule bulk reminders"),
  });

  const loading = customersFetching || invoicesFetching;
  const hasError = customersError || invoicesError;

  function submitBulkReminder() {
    if (targets.length === 0 || bulkReminderMutation.isPending) return;
    const parsedDaysOffset = Math.max(
      0,
      Math.min(30, parseInt(daysOffset || "0", 10) || 0),
    );
    bulkReminderMutation.mutate({
      customerIds: targets.map((c) => c.id),
      daysOffset: parsedDaysOffset,
      message: message.trim() || undefined,
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: contentPad, paddingBottom: 28 }}
      >
        <ScreenInner>
          <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-amber-800">
                Target Customers
              </Text>
              <Text className="text-base font-bold text-amber-900">
                {targets.length}
              </Text>
            </View>
            <Text className="text-xs text-amber-700 mt-1">
              Total pending amount: ₹{inr(targetAmount)}
            </Text>
          </View>

          <View className="rounded-2xl border border-slate-200 bg-white p-4 mb-3">
            <Pressable
              onPress={() => setOnlyHighOverdue((v) => !v)}
              className="flex-row items-center justify-between min-h-[44]"
            >
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-slate-700">
                  Only 31+ days overdue
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5">
                  Turn off to include all customers with pending balance.
                </Text>
              </View>
              <View
                className={`w-12 h-7 rounded-full px-1 justify-center ${onlyHighOverdue ? "items-end bg-primary" : "items-start bg-slate-300"}`}
              >
                <View className="w-5 h-5 rounded-full bg-white" />
              </View>
            </Pressable>

            <Text className={TYPO.label + " mt-4 mb-1"}>
              Schedule after days
            </Text>
            <TextInput
              value={daysOffset}
              onChangeText={setDaysOffset}
              keyboardType="number-pad"
              placeholder="0"
              className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800"
              placeholderTextColor="#94a3b8"
            />

            <Text className={TYPO.label + " mt-4 mb-1"}>
              Message (optional)
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Payment reminder from your store"
              multiline
              className="border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800 min-h-[92]"
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />
            <Text className="text-xs text-slate-500 mt-2">
              Reminders are scheduled at 6:00 PM (store timezone).
            </Text>
          </View>

          <View className="rounded-2xl border border-slate-200 bg-white overflow-hidden mb-3">
            <View className="px-4 py-3 border-b border-slate-100 flex-row items-center justify-between">
              <Text className={TYPO.sectionTitle}>Preview Targets</Text>
              <Text className="text-xs text-slate-500">{targets.length}</Text>
            </View>

            {loading ? (
              <View className="px-4 py-4 gap-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </View>
            ) : hasError ? (
              <View className="p-4">
                <ErrorCard
                  message="Failed to load overdue customers"
                  onRetry={() => {
                    refetchCustomers();
                    refetchInvoices();
                  }}
                />
              </View>
            ) : targets.length === 0 ? (
              <View className="py-10 px-4">
                <EmptyState
                  iconName="checkmark-done-outline"
                  title="No pending follow-ups"
                  description="No customers match the selected overdue criteria."
                />
              </View>
            ) : (
              targets.slice(0, 25).map((customer, idx) => {
                const ageDays = (customer as any).ageDays ?? 0;
                const balance = Math.max(
                  0,
                  parseFloat(String(customer.balance)) || 0,
                );
                return (
                  <View
                    key={customer.id}
                    className={`px-4 py-3 flex-row items-center justify-between ${idx > 0 ? "border-t border-slate-100" : ""}`}
                  >
                    <View className="flex-1 min-w-0 pr-2">
                      <Text
                        className="text-sm font-semibold text-slate-800"
                        numberOfLines={1}
                      >
                        {customer.name}
                      </Text>
                      <Text
                        className="text-xs text-slate-500 mt-0.5"
                        numberOfLines={1}
                      >
                        {ageDays === 0 ? "Today" : `${ageDays} days overdue`}
                      </Text>
                    </View>
                    <Text className="text-sm font-bold text-red-600">
                      ₹{inr(balance)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

          <TouchableOpacity
            onPress={submitBulkReminder}
            disabled={targets.length === 0 || bulkReminderMutation.isPending}
            className={`min-h-[48] rounded-xl items-center justify-center ${targets.length > 0 && !bulkReminderMutation.isPending ? "bg-primary" : "bg-slate-300"}`}
          >
            {bulkReminderMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View className="flex-row items-center gap-2">
                <Ionicons name="notifications" size={16} color="#fff" />
                <Text className="text-sm font-semibold text-white">
                  Schedule Bulk Follow-up
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </ScreenInner>
      </ScrollView>
    </SafeAreaView>
  );
}
