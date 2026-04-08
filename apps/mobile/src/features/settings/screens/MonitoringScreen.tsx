/**
 * MonitoringScreen — Store monitoring dashboard (Sprint 14).
 * KPI bar, hourly chart, activity feed, cash reconciliation, employee cards, camera.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { showAlert } from "../../../lib/alerts";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import { monitoringApi, summaryApi } from "../../../lib/api";
import { formatCurrency } from "../../../lib/utils";
import { Chip } from "../../../components/ui/Chip";
import { ErrorCard } from "../../../components/ui/ErrorCard";
import { hapticLight } from "../../../lib/haptics";
import { COLORS } from "../../../lib/constants";

function getTodayRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    from: from.toISOString(),
    to: now.toISOString(),
  };
}

export function MonitoringScreen() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<
    "dashboard" | "activity" | "alerts" | "camera"
  >("dashboard");
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashActual, setCashActual] = useState("");
  const [cashExpected, setCashExpected] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [showDrawerLog, setShowDrawerLog] = useState(false);

  const { from, to } = getTodayRange();

  const {
    data: stats,
    isFetching: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["monitoring-stats", from, to],
    queryFn: () => monitoringApi.getStats({ from, to }),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const { data: summary } = useQuery({
    queryKey: ["summary-daily-monitoring"],
    queryFn: () => summaryApi.daily(new Date().toISOString().slice(0, 10)),
    staleTime: 30_000,
  });

  const {
    data: eventsData,
    isFetching: eventsLoading,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ["monitoring-events", tab],
    queryFn: () =>
      monitoringApi.getEvents({
        limit: 50,
        unreadOnly: tab === "alerts",
      }),
    staleTime: 5_000,
    refetchInterval: tab === "activity" || tab === "alerts" ? 10_000 : false,
  });

  const { data: unreadData, refetch: refetchUnread } = useQuery({
    queryKey: ["monitoring-unread"],
    queryFn: () => monitoringApi.getUnreadCount(),
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  const markAllRead = useMutation({
    mutationFn: () => monitoringApi.markAllRead(),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["monitoring-unread", "monitoring-events"],
      });
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => monitoringApi.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["monitoring-unread", "monitoring-events"],
      });
    },
  });

  const logEvent = useMutation({
    mutationFn: (desc: string) =>
      monitoringApi.logEvent({
        eventType: "drawer.opened",
        entityType: "manual",
        entityId: "mobile",
        description: desc,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["monitoring-events"] });
      setShowDrawerLog(false);
    },
  });

  const submitCash = useMutation({
    mutationFn: () => {
      const date = new Date().toISOString().slice(0, 10);
      const actual = parseFloat(cashActual) || 0;
      const expected = parseFloat(cashExpected) || 0;
      return monitoringApi.submitCashReconciliation({
        date,
        actual,
        expected,
        note: cashNote,
      });
    },
    onSuccess: () => {
      hapticLight();
      setShowCashModal(false);
      setCashActual("");
      setCashExpected("");
      setCashNote("");
      void qc.invalidateQueries({
        queryKey: ["monitoring-stats", "monitoring-events"],
      });
    },
    onError: (err: Error) => showAlert("Error", err.message),
  });

  const refetch = () => {
    refetchStats();
    refetchEvents();
    refetchUnread();
  };

  const events = eventsData?.events ?? [];
  const unreadCount = unreadData?.count ?? 0;
  const billCount = stats?.billCount ?? 0;
  const totalSales =
    summary?.summary?.totalSales ?? stats?.totalBillAmount ?? 0;
  const footfall = stats?.footfall ?? 0;
  const conversionRate = stats?.conversionRate ?? 0;
  const hourlyBills = stats?.hourlyBills ?? {};
  const peakHour = stats?.peakHour ?? null;
  const byEmployee = stats?.byEmployee ?? {};

  const maxHourly = Math.max(1, ...Object.values(hourlyBills).map(Number));

  if (statsError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center px-4">
          <ErrorCard
            message="Store monitoring requires owner or admin role"
            onRetry={() => refetch()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isCameraTab = tab === "camera";

  return (
    <SafeAreaView
      className={`flex-1 ${isCameraTab ? "bg-black" : "bg-background"}`}
      edges={["top", "bottom"]}
    >
      {isCameraTab ? (
        <>
          <View className="flex-row items-center justify-between px-4 py-3 bg-black/80">
            <TouchableOpacity onPress={() => setTab("dashboard")}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text.inverted} />
            </TouchableOpacity>
            <Text className="text-white font-bold">Camera</Text>
            <TouchableOpacity
              onPress={() => setShowDrawerLog(true)}
              className="bg-primary px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-semibold text-sm">
                Log Drawer
              </Text>
            </TouchableOpacity>
          </View>
          <View className="flex-1">
            <CameraView style={{ flex: 1 }} facing="back" />
          </View>
          <Modal
            visible={showDrawerLog}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDrawerLog(false)}
          >
            <View className="flex-1 bg-black/50 justify-center px-4">
              <View className="bg-white rounded-2xl p-4">
                <Text className="text-lg font-bold mb-2">
                  Log Drawer Opened
                </Text>
                <Text className="text-slate-600 text-sm mb-4">
                  Record that the cash drawer was opened (e.g. for no-ring sale
                  check).
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    logEvent.mutate(
                      "Cash drawer opened — manual log from mobile",
                    )
                  }
                  disabled={logEvent.isPending}
                  className="bg-primary py-3 rounded-xl items-center"
                >
                  {logEvent.isPending ? (
                    <ActivityIndicator color={COLORS.text.inverted} />
                  ) : (
                    <Text className="text-white font-semibold">Log Event</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowDrawerLog(false)}
                  className="mt-2 py-2 items-center"
                >
                  <Text className="text-slate-500">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <>
          <View className="px-4 pt-4 pb-3 border-b border-slate-200 bg-card">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xl font-bold tracking-tight text-slate-800">
                Store Monitor
              </Text>
              <TouchableOpacity
                onPress={() => refetch()}
                disabled={statsLoading}
              >
                <Ionicons
                  name="refresh"
                  size={22}
                  color={statsLoading ? COLORS.slate[400] : COLORS.slate[500]}
                />
              </TouchableOpacity>
            </View>
            <View className="flex-row gap-2">
              <Chip
                label="Dashboard"
                selected={tab === "dashboard"}
                onPress={() => setTab("dashboard")}
              />
              <Chip
                label="Activity"
                selected={tab === "activity"}
                onPress={() => setTab("activity")}
              />
              <Chip
                label={`Alerts ${unreadCount > 0 ? `(${unreadCount})` : ""}`}
                selected={tab === "alerts"}
                onPress={() => setTab("alerts")}
              />
              <Chip
                label="Camera"
                selected={isCameraTab}
                onPress={() => setTab("camera")}
              />
            </View>
          </View>

          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={statsLoading || eventsLoading}
                onRefresh={refetch}
              />
            }
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          >
            {tab === "dashboard" && (
              <>
                {/* KPI bar */}
                <View className="flex-row flex-wrap gap-2 mb-4">
                  <View className="flex-1 min-w-[140px] bg-primary/10 p-3 rounded-xl border border-primary/20">
                    <Text className="text-xs text-slate-600">Bills</Text>
                    <Text className="text-lg font-bold text-primary">
                      {billCount}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[140px] bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <Text className="text-xs text-slate-600">Sales</Text>
                    <Text className="text-lg font-bold text-emerald-700">
                      {formatCurrency(totalSales)}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[140px] bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <Text className="text-xs text-slate-600">Footfall</Text>
                    <Text className="text-lg font-bold text-amber-700">
                      {footfall}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[140px] bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <Text className="text-xs text-slate-600">Conversion</Text>
                    <Text className="text-lg font-bold text-blue-700">
                      {conversionRate}%
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setTab("alerts")}
                    className="flex-1 min-w-[140px] bg-red-50 p-3 rounded-xl border border-red-100"
                  >
                    <Text className="text-xs text-slate-600">Alerts</Text>
                    <Text className="text-lg font-bold text-red-700">
                      {unreadCount}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Hourly chart */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-slate-700 mb-2">
                    Bills by hour
                  </Text>
                  <View className="flex-row items-end h-24 gap-0.5">
                    {Array.from({ length: 24 }, (_, h) => {
                      const count = hourlyBills[String(h)] ?? 0;
                      const height =
                        maxHourly > 0 ? (count / maxHourly) * 80 : 0;
                      const isPeak = peakHour === h && count > 0;
                      return (
                        <View key={h} className="flex-1 items-center">
                          <View
                            className={`w-full rounded-t ${isPeak ? "bg-primary" : "bg-slate-300"}`}
                            style={{ height: Math.max(height, 2) }}
                          />
                          <Text className="text-[8px] text-slate-400 mt-0.5">
                            {h}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Employee cards */}
                {Object.keys(byEmployee).length > 0 && (
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-slate-700 mb-2">
                      Employees
                    </Text>
                    <View className="gap-2">
                      {Object.entries(byEmployee).map(([userId, emp]) => {
                        const cancelRate =
                          emp.bills > 0
                            ? (emp.cancellations / emp.bills) * 100
                            : 0;
                        const badge =
                          cancelRate > 10
                            ? "Alert"
                            : cancelRate > 5
                              ? "Watch"
                              : "OK";
                        const badgeColor =
                          badge === "Alert"
                            ? "bg-red-100"
                            : badge === "Watch"
                              ? "bg-amber-100"
                              : "bg-green-100";
                        const textColor =
                          badge === "Alert"
                            ? "text-red-700"
                            : badge === "Watch"
                              ? "text-amber-700"
                              : "text-green-700";
                        return (
                          <View
                            key={userId}
                            className="rounded-xl border border-slate-200 bg-card p-3"
                          >
                            <View className="flex-row items-center justify-between mb-1">
                              <Text className="font-medium text-slate-800">
                                User {userId.slice(0, 8)}
                              </Text>
                              <View
                                className={`px-2 py-0.5 rounded-full ${badgeColor}`}
                              >
                                <Text
                                  className={`text-[10px] font-semibold ${textColor}`}
                                >
                                  {badge}
                                </Text>
                              </View>
                            </View>
                            <View className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                              <View
                                className={`h-full ${cancelRate > 10 ? "bg-red-500" : cancelRate > 5 ? "bg-amber-500" : "bg-green-500"}`}
                                style={{
                                  width: `${Math.min(cancelRate, 100)}%`,
                                }}
                              />
                            </View>
                            <Text className="text-xs text-slate-500">
                              Bills: {emp.bills} · Cancels: {emp.cancellations}{" "}
                              · Cancel rate: {cancelRate.toFixed(1)}%
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Cash reconciliation */}
                <View className="rounded-xl border border-slate-200 bg-card p-4">
                  <Text className="text-sm font-semibold text-slate-700 mb-2">
                    EOD Cash Reconciliation
                  </Text>
                  <Text className="text-xs text-slate-500 mb-3">
                    Record actual cash count vs expected at end of day.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCashModal(true)}
                    className="bg-primary py-3 rounded-xl items-center"
                  >
                    <Text className="text-white font-semibold">
                      Submit Cash Count
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {(tab === "activity" || tab === "alerts") && (
              <View className="mb-4">
                {tab === "alerts" && unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={() => markAllRead.mutate()}
                    className="mb-3 bg-slate-100 py-2 px-4 rounded-lg self-start"
                  >
                    <Text className="text-sm font-medium text-slate-700">
                      Mark all read
                    </Text>
                  </TouchableOpacity>
                )}
                {events.length === 0 ? (
                  <Text className="text-slate-500 text-center py-8">
                    No events
                  </Text>
                ) : (
                  <View className="gap-2">
                    {events.map((e) => (
                      <TouchableOpacity
                        key={e.id}
                        onPress={() =>
                          e.severity !== "info" && markRead.mutate(e.id)
                        }
                        className={`rounded-xl border p-3 ${
                          e.severity === "alert"
                            ? "border-red-200 bg-red-50"
                            : e.severity === "warning"
                              ? "border-amber-200 bg-amber-50"
                              : "border-slate-200 bg-card"
                        } ${!e.isRead ? "border-l-4 border-l-primary" : ""}`}
                      >
                        <Text className="text-sm font-medium text-slate-800">
                          {e.description}
                        </Text>
                        <Text className="text-xs text-slate-500 mt-1">
                          {e.eventType} ·{" "}
                          {new Date(e.createdAt).toLocaleString("en-IN")}
                          {e.user?.name ? ` · ${e.user.name}` : ""}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Cash reconciliation modal */}
      <Modal
        visible={showCashModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCashModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-4">
          <View className="bg-white rounded-2xl p-4">
            <Text className="text-lg font-bold mb-3">EOD Cash Count</Text>
            <Text className="text-sm text-slate-600 mb-2">Expected (₹)</Text>
            <TextInput
              value={cashExpected}
              onChangeText={setCashExpected}
              placeholder="0"
              keyboardType="numeric"
              className="border border-slate-200 rounded-lg px-3 py-2 mb-3"
            />
            <Text className="text-sm text-slate-600 mb-2">
              Actual count (₹)
            </Text>
            <TextInput
              value={cashActual}
              onChangeText={setCashActual}
              placeholder="0"
              keyboardType="numeric"
              className="border border-slate-200 rounded-lg px-3 py-2 mb-3"
            />
            <TextInput
              value={cashNote}
              onChangeText={setCashNote}
              placeholder="Note (optional)"
              className="border border-slate-200 rounded-lg px-3 py-2 mb-4"
            />
            <TouchableOpacity
              onPress={() => submitCash.mutate()}
              disabled={submitCash.isPending || !cashActual || !cashExpected}
              className="bg-primary py-3 rounded-xl items-center mb-2"
            >
              {submitCash.isPending ? (
                <ActivityIndicator color={COLORS.text.inverted} />
              ) : (
                <Text className="text-white font-semibold">Submit</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowCashModal(false)}
              className="py-2 items-center"
            >
              <Text className="text-slate-500">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
