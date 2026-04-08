/**
 * RecurringScreen — recurring billing templates (per Sprint 12).
 * Placeholder until recurring API is available.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reminderApi } from "../../parties";
import { formatDate } from "../../../lib/utils";
import { showError, showSuccess } from "../../../lib/alerts";

type Frequency = "once" | "weekly" | "monthly";

const FREQUENCIES: { label: string; value: Frequency }[] = [
  { label: "One-time", value: "once" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

const FREQ_BADGE: Record<Frequency, { bg: string; text: string }> = {
  once:    { bg: "bg-slate-100",   text: "text-slate-600"   },
  weekly:  { bg: "bg-blue-100",    text: "text-blue-700"    },
  monthly: { bg: "bg-purple-100",  text: "text-purple-700"  },
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  pending:   { bg: "bg-yellow-100", text: "text-yellow-700" },
  sent:      { bg: "bg-green-100",  text: "text-green-700"  },
  delivered: { bg: "bg-green-100",  text: "text-green-700"  },
  cancelled: { bg: "bg-red-100",    text: "text-red-600"    },
  failed:    { bg: "bg-red-100",    text: "text-red-600"    },
};

function parseMessage(message?: string): { freq: Frequency; note: string } {
  if (!message) return { freq: "once", note: "" };
  if (message.startsWith("[WEEKLY]"))
    return { freq: "weekly", note: message.replace(/^\[WEEKLY\]\s*/, "").trim() };
  if (message.startsWith("[MONTHLY]"))
    return { freq: "monthly", note: message.replace(/^\[MONTHLY\]\s*/, "").trim() };
  return { freq: "once", note: message };
}

function buildMessage(freq: Frequency, note: string): string {
  if (freq === "weekly")  return `[WEEKLY]${note ? ` ${note}` : ""}`;
  if (freq === "monthly") return `[MONTHLY]${note ? ` ${note}` : ""}`;
  return note;
}

export function RecurringScreen() {
  const qc = useQueryClient();

  const [showAdd, setShowAdd]       = useState(false);
  const [custId, setCustId]         = useState("");
  const [amount, setAmount]         = useState("");
  const [date, setDate]             = useState("");
  const [note, setNote]             = useState("");
  const [freq, setFreq]             = useState<Frequency>("monthly");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["reminders-all"],
    queryFn: () => reminderApi.list(),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      reminderApi.create({
        customerId: custId.trim(),
        amount: parseFloat(amount) || 0,
        datetime: new Date(date.trim()).toISOString(),
        message: buildMessage(freq, note.trim()),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders-all"] });
      setShowAdd(false);
      setCustId(""); setAmount(""); setDate(""); setNote(""); setFreq("monthly");
      showSuccess("Billing schedule created ✅");
    },
    onError: () => showError("Failed to create schedule"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => reminderApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders-all"] });
      showSuccess("Schedule cancelled");
    },
    onError: () => showError("Cancellation failed"),
  });

  const reminders = data?.reminders ?? [];
  const active    = reminders.filter((r) => r.status !== "cancelled");
  const pending   = active.filter((r) => r.status === "pending").length;

  function confirmCancel(id: string) {
    Alert.alert("Cancel Schedule", "Remove this billing schedule?", [
      { text: "No", style: "cancel" },
      { text: "Yes, cancel", style: "destructive", onPress: () => cancelMutation.mutate(id) },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-slate-100 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-slate-800">Recurring Billing</Text>
        <TouchableOpacity
          className="bg-indigo-600 px-3 py-1.5 rounded-lg flex-row items-center gap-1"
          onPress={() => setShowAdd(true)}
        >
          <Ionicons name="add" size={18} color="white" />
          <Text className="text-white text-sm font-medium">Add</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View className="flex-row px-4 py-3 gap-3">
        <View className="flex-1 bg-white rounded-xl border border-slate-100 p-3">
          <Text className="text-2xl font-bold text-indigo-700">{active.length}</Text>
          <Text className="text-xs text-slate-500 mt-0.5">Schedules</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl border border-slate-100 p-3">
          <Text className="text-2xl font-bold text-yellow-600">{pending}</Text>
          <Text className="text-xs text-slate-500 mt-0.5">Pending</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl border border-slate-100 p-3">
          <Text className="text-2xl font-bold text-purple-600">
            {reminders.filter((r) => parseMessage(r.message).freq === "monthly").length}
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">Monthly</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-10" color="#4f46e5" />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        >
          {reminders.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-5xl mb-4">🔄</Text>
              <Text className="text-base font-semibold text-slate-700 mb-1">No schedules yet</Text>
              <Text className="text-sm text-slate-400 text-center leading-5">
                Create recurring billing schedules to automatically{"\n"}remind customers to pay on time.
              </Text>
              <TouchableOpacity
                className="mt-6 bg-indigo-600 px-5 py-2.5 rounded-xl"
                onPress={() => setShowAdd(true)}
              >
                <Text className="text-white font-semibold">+ Add Schedule</Text>
              </TouchableOpacity>
            </View>
          ) : (
            reminders.map((r) => {
              const { freq: rFreq, note: rNote } = parseMessage(r.message);
              const fc = FREQ_BADGE[rFreq];
              const sc = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending;
              return (
                <View
                  key={r.id}
                  className="bg-white rounded-xl border border-slate-100 p-4 mb-3 shadow-sm"
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-3">
                      <Text className="text-xs text-slate-400 mb-0.5">Customer</Text>
                      <Text className="text-sm font-medium text-slate-800" numberOfLines={1}>
                        {r.customerId ?? "—"}
                      </Text>
                    </View>
                    <View className={`px-2 py-0.5 rounded-full ${sc.bg}`}>
                      <Text className={`text-xs font-medium ${sc.text} capitalize`}>{r.status}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2 flex-wrap">
                    {r.amount ? (
                      <Text className="text-lg font-bold text-slate-800">
                        ₹{Number(r.amount).toLocaleString("en-IN")}
                      </Text>
                    ) : null}
                    <View className={`px-2 py-0.5 rounded-full ${fc.bg}`}>
                      <Text className={`text-xs font-semibold ${fc.text} capitalize`}>{rFreq}</Text>
                    </View>
                    <Text className="text-xs text-slate-400">{formatDate(r.scheduledTime)}</Text>
                  </View>

                  {rNote ? (
                    <Text className="text-xs text-slate-500 mt-1.5">{rNote}</Text>
                  ) : null}

                  {r.status === "pending" && (
                    <TouchableOpacity
                      className="mt-3 self-start px-3 py-1.5 border border-red-200 rounded-lg"
                      onPress={() => confirmCancel(r.id)}
                      disabled={cancelMutation.isPending}
                    >
                      <Text className="text-xs text-red-600 font-medium">Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Add Schedule Modal */}
      <Modal visible={showAdd} animationType="slide" transparent presentationStyle="overFullScreen">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-2xl px-5 pt-5 pb-10">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-lg font-bold text-slate-800">New Billing Schedule</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Customer ID *
            </Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 mb-4 bg-slate-50"
              placeholder="Paste or type customer ID"
              value={custId}
              onChangeText={setCustId}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Amount (₹) *
            </Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 mb-4 bg-slate-50"
              placeholder="e.g. 5000"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Start Date *
            </Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 mb-4 bg-slate-50"
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={setDate}
            />

            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Frequency
            </Text>
            <View className="flex-row gap-2 mb-4">
              {FREQUENCIES.map((f) => (
                <Pressable
                  key={f.value}
                  onPress={() => setFreq(f.value)}
                  className={`flex-1 py-2 rounded-xl border items-center ${
                    freq === f.value
                      ? "bg-indigo-600 border-indigo-600"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      freq === f.value ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Note (optional)
            </Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 mb-5 bg-slate-50"
              placeholder="e.g. Monthly SaaS subscription"
              value={note}
              onChangeText={setNote}
            />

            <TouchableOpacity
              className={`py-3.5 rounded-xl items-center ${
                createMutation.isPending || !custId.trim() || !amount.trim() || !date.trim()
                  ? "bg-indigo-300"
                  : "bg-indigo-600"
              }`}
              onPress={() => createMutation.mutate()}
              disabled={
                createMutation.isPending || !custId.trim() || !amount.trim() || !date.trim()
              }
            >
              <Text className="text-white font-bold text-base">
                {createMutation.isPending ? "Creating…" : "Create Schedule"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
