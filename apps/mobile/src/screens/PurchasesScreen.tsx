/**
 * PurchasesScreen — stock purchases list with add/delete (per Sprint 12).
 */
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchaseApi } from "../lib/api";
import { useWsInvalidation } from "../hooks/useWsInvalidation";
import { formatCurrency } from "../lib/utils";
import { BottomSheet } from "../components/ui/BottomSheet";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";

const CATEGORIES = [
  "Stock Purchase",
  "Raw Material",
  "Packaging",
  "Equipment",
  "Office Supplies",
  "Miscellaneous",
];

function getMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date();
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function PurchasesScreen() {
  const qc = useQueryClient();
  const { from, to } = getMonthRange();
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [addOpen, setAddOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  useWsInvalidation(["purchases", "cashbook"]);

  const range =
    period === "week"
      ? (() => {
          const now = new Date();
          const start = new Date(now);
          start.setDate(now.getDate() - 7);
          return { from: start.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
        })()
      : getMonthRange();

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["purchases", range.from, range.to],
    queryFn: () => purchaseApi.list({ from: range.from, to: range.to }),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      category: string;
      amount: number;
      itemName: string;
      vendor?: string;
      quantity?: number;
      note?: string;
      date?: string;
    }) => purchaseApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["cashbook"] });
      setItemName("");
      setAmount("");
      setVendor("");
      setQuantity("");
      setNote("");
      setDate(new Date().toISOString().slice(0, 10));
      setAddOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchaseApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["cashbook"] });
    },
  });

  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (!itemName.trim()) {
      Alert.alert("Required", "Please enter item name.");
      return;
    }
    if (!amount || amt <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }
    createMutation.mutate(
      {
        category,
        amount: amt,
        itemName: itemName.trim(),
        vendor: vendor.trim() || undefined,
        quantity: quantity.trim() ? parseFloat(quantity) : undefined,
        note: note.trim() || undefined,
        date,
      },
      {
        onError: (err: Error) => Alert.alert("Error", err?.message ?? "Failed to add purchase"),
      }
    );
  };

  const handleDelete = (id: string, item: string, amountVal: number) => {
    Alert.alert("Delete purchase", `Delete ${item} for ${formatCurrency(amountVal)}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  const purchases = data?.purchases ?? [];
  const total = data?.total ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="px-4 py-3 border-b border-slate-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-slate-800">Purchases</Text>
          <TouchableOpacity onPress={() => setAddOpen(true)} className="bg-primary px-4 py-2 rounded-lg">
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
        <Text className="text-2xl font-bold text-primary-700">{formatCurrency(total)}</Text>
      </View>

      <FlatList
        data={purchases}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() =>
              handleDelete(item.id, item.category, Number(item.amount))
            }
            className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100"
          >
            <View>
              <Text className="font-semibold text-slate-800">{item.category}</Text>
              {item.vendor && <Text className="text-sm text-slate-500">{item.vendor}</Text>}
            </View>
            <Text className="font-bold text-slate-800">{formatCurrency(Number(item.amount))}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isFetching ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color="#e67e22" />
            </View>
          ) : (
            <EmptyState
              iconName="cube-outline"
              title="No purchases yet"
              description="Record stock purchases here"
              actionLabel="Add purchase"
              onAction={() => setAddOpen(true)}
            />
          )
        }
      />

      <BottomSheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add Purchase">
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
          label="Item name *"
          value={itemName}
          onChangeText={setItemName}
          placeholder="e.g. Rice 5kg"
        />

        <Input
          label="Amount (₹) *"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
        />

        <Input
          label="Vendor (optional)"
          value={vendor}
          onChangeText={setVendor}
          placeholder="Supplier name"
        />

        <Input
          label="Quantity (optional)"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          placeholder="e.g. 10"
        />

        <Input
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Add a note"
        />

        <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

        <Button
          onPress={handleAdd}
          loading={createMutation.isPending}
          disabled={!itemName.trim() || !amount || parseFloat(amount) <= 0}
          className="mt-4"
        >
          Add Purchase
        </Button>
      </BottomSheet>
    </SafeAreaView>
  );
}
