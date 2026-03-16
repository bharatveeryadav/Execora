/**
 * ExpensesScreen — expense list with add/delete (per Sprint 9).
 */
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expenseApi } from "../lib/api";
import { useWsInvalidation } from "../hooks/useWsInvalidation";
import { formatCurrency } from "../lib/utils";
import { BottomSheet } from "../components/ui/BottomSheet";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";

const CATEGORIES = [
  "Stock Purchase",
  "Rent",
  "Salary",
  "Electricity",
  "Transport",
  "Repairs",
  "Marketing",
  "Packaging",
  "Bank Charges",
  "Miscellaneous",
];

function getMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date();
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function ExpensesScreen() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [addOpen, setAddOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  useWsInvalidation(["expenses", "cashbook"]);

  const { from, to } = (() => {
    const now = new Date();
    if (period === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return {
        from: start.toISOString().slice(0, 10),
        to: now.toISOString().slice(0, 10),
      };
    }
    return getMonthRange();
  })();

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["expenses", from, to],
    queryFn: () => expenseApi.list({ from, to, type: "expense" }),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { category: string; amount: number; vendor?: string; note?: string; date?: string }) =>
      expenseApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["cashbook"] });
      setAmount("");
      setVendor("");
      setNote("");
      setDate(new Date().toISOString().slice(0, 10));
      setAddOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["cashbook"] });
    },
  });

  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (!amount || amt <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }
    createMutation.mutate(
      {
        category,
        amount: amt,
        vendor: vendor.trim() || undefined,
        note: note.trim() || undefined,
        date,
      },
      {
        onError: (err: Error) => Alert.alert("Error", err?.message ?? "Failed to add expense"),
      }
    );
  };

  const handleDelete = (id: string, categoryName: string, amountVal: number) => {
    Alert.alert("Delete expense", `Delete ${categoryName} for ${formatCurrency(amountVal)}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  const expenses = data?.expenses ?? [];
  const total = data?.total ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="px-4 py-3 border-b border-slate-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-slate-800">Expenses</Text>
          <TouchableOpacity
            onPress={() => setAddOpen(true)}
            className="bg-primary px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-semibold">+ Add</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity
            onPress={() => setPeriod("week")}
            className={`px-4 py-2 rounded-lg ${period === "week" ? "bg-primary" : "bg-slate-100"}`}
          >
            <Text className={period === "week" ? "text-white font-semibold" : "text-slate-600"}>
              This Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPeriod("month")}
            className={`px-4 py-2 rounded-lg ${period === "month" ? "bg-primary" : "bg-slate-100"}`}
          >
            <Text className={period === "month" ? "text-white font-semibold" : "text-slate-600"}>
              This Month
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-4 py-3 bg-primary/10">
        <Text className="text-sm text-slate-600">Total</Text>
        <Text className="text-2xl font-bold text-indigo-700">{formatCurrency(total)}</Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => handleDelete(item.id, item.category, Number(item.amount))}
            className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100"
          >
            <View>
              <Text className="font-semibold text-slate-800">{item.category}</Text>
              {item.vendor && (
                <Text className="text-sm text-slate-500">{item.vendor}</Text>
              )}
            </View>
            <Text className="font-bold text-red-600">{formatCurrency(Number(item.amount))}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isFetching ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color="#e67e22" />
            </View>
          ) : (
            <EmptyState
              icon="📤"
              title="No expenses yet"
              description="Track your business expenses here"
              actionLabel="Add expense"
              onAction={() => setAddOpen(true)}
            />
          )
        }
      />

      <BottomSheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add Expense">
        <Text className="text-sm font-medium text-slate-600 mb-2">Category</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategory(c)}
              className={`px-3 py-2 rounded-lg ${category === c ? "bg-primary" : "bg-slate-100"}`}
            >
              <Text className={category === c ? "text-white font-semibold text-sm" : "text-slate-600 text-sm"}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Amount (₹)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
        />

        <Input
          label="Vendor (optional)"
          value={vendor}
          onChangeText={setVendor}
          placeholder="Vendor name"
        />

        <Input
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Add a note"
        />

        <Input
          label="Date"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />

        <Button
          onPress={handleAdd}
          loading={createMutation.isPending}
          disabled={!amount || parseFloat(amount) <= 0}
          className="mt-4"
        >
          Add Expense
        </Button>
      </BottomSheet>
    </SafeAreaView>
  );
}
