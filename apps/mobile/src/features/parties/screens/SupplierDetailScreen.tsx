import React, { useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useResponsive } from "../../../hooks/useResponsive";
import { ScreenInner } from "../../../components/ui/ScreenLayout";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorCard } from "../../../components/ui/ErrorCard";
import { Skeleton } from "../../../components/ui/Skeleton";
import { expenseApi, purchaseApi, supplierApi } from "../../../lib/api";
import { inr } from "@execora/shared";
import { formatDate } from "../../../lib/utils";
import { TYPO } from "../../../lib/typography";
import type { PartiesStackParams } from "../../../navigation";

type Props = NativeStackScreenProps<PartiesStackParams, "SupplierDetail">;

export function SupplierDetailScreen({ navigation, route }: Props) {
  const { contentPad, contentWidth } = useResponsive();
  const { supplierId, supplierName } = route.params;

  const {
    data: supplierData,
    isFetching: supplierFetching,
    isError: supplierError,
    refetch: refetchSupplier,
  } = useQuery({
    queryKey: ["supplier", supplierId],
    queryFn: () => supplierApi.get(supplierId),
    staleTime: 30_000,
  });

  const supplier = supplierData?.supplier;
  const supplierFilter = supplier?.name || supplierName || "";

  const {
    data: purchasesData,
    isFetching: purchasesFetching,
    isError: purchasesError,
    refetch: refetchPurchases,
  } = useQuery({
    queryKey: ["supplier-purchases", supplierFilter],
    queryFn: () => purchaseApi.list({ supplier: supplierFilter, limit: 20 }),
    enabled: supplierFilter.length > 0,
    staleTime: 30_000,
  });

  const {
    data: expensesData,
    isFetching: expensesFetching,
    isError: expensesError,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ["supplier-expenses", supplierFilter],
    queryFn: () => expenseApi.list({ supplier: supplierFilter, limit: 20 }),
    enabled: supplierFilter.length > 0,
    staleTime: 30_000,
  });

  const purchases = purchasesData?.purchases ?? [];
  const expenses = expensesData?.expenses ?? [];

  const purchaseTotal = useMemo(
    () =>
      purchases.reduce(
        (sum, purchase) => sum + (parseFloat(String(purchase.amount)) || 0),
        0,
      ),
    [purchases],
  );
  const expenseTotal = useMemo(
    () =>
      expenses.reduce(
        (sum, expense) => sum + (parseFloat(String(expense.amount)) || 0),
        0,
      ),
    [expenses],
  );

  const openPhone = () => {
    if (supplier?.phone) {
      Linking.openURL(`tel:${supplier.phone}`);
    }
  };

  const openEmail = () => {
    if (supplier?.email) {
      Linking.openURL(`mailto:${supplier.email}`);
    }
  };

  const isInitialLoading = supplierFetching && !supplier;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: contentPad,
          paddingBottom: 32,
          alignItems: "center",
        }}
      >
        <ScreenInner>
          {isInitialLoading ? (
            <View className="gap-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-48 w-full" />
            </View>
          ) : supplierError || !supplier ? (
            <ErrorCard
              message="Failed to load supplier"
              onRetry={() => refetchSupplier()}
            />
          ) : (
            <View className="gap-3">
              <View className="rounded-2xl border border-slate-200 bg-white p-4">
                <View className="flex-row items-start gap-3">
                  <View className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center">
                    <Text className="text-base font-bold text-slate-700">
                      {supplier.name?.charAt(0)?.toUpperCase() ?? "S"}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text
                      className="text-lg font-bold text-slate-800"
                      numberOfLines={1}
                    >
                      {supplier.name}
                    </Text>
                    {!!supplier.companyName && (
                      <Text
                        className="text-sm text-slate-500 mt-0.5"
                        numberOfLines={1}
                      >
                        {supplier.companyName}
                      </Text>
                    )}
                    {!!supplier.gstin && (
                      <Text
                        className="text-xs text-slate-500 mt-1"
                        numberOfLines={1}
                      >
                        GSTIN: {supplier.gstin}
                      </Text>
                    )}
                  </View>
                </View>

                <View className="mt-4 gap-2">
                  {!!supplier.phone && (
                    <Text className="text-sm text-slate-600">
                      Phone: {supplier.phone}
                    </Text>
                  )}
                  {!!supplier.email && (
                    <Text className="text-sm text-slate-600">
                      Email: {supplier.email}
                    </Text>
                  )}
                  {!!supplier.address && (
                    <Text className="text-sm text-slate-600">
                      Address: {supplier.address}
                    </Text>
                  )}
                </View>

                <View className="mt-4 flex-row gap-2">
                  <Pressable
                    onPress={openPhone}
                    disabled={!supplier.phone}
                    className={`flex-1 min-h-[44] rounded-xl border px-3 py-3 flex-row items-center justify-center gap-2 ${supplier.phone ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"}`}
                  >
                    <Ionicons
                      name="call-outline"
                      size={16}
                      color={supplier.phone ? "#475569" : "#cbd5e1"}
                    />
                    <Text
                      className={`text-sm font-medium ${supplier.phone ? "text-slate-700" : "text-slate-400"}`}
                    >
                      Call
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={openEmail}
                    disabled={!supplier.email}
                    className={`flex-1 min-h-[44] rounded-xl border px-3 py-3 flex-row items-center justify-center gap-2 ${supplier.email ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"}`}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={16}
                      color={supplier.email ? "#475569" : "#cbd5e1"}
                    />
                    <Text
                      className={`text-sm font-medium ${supplier.email ? "text-slate-700" : "text-slate-400"}`}
                    >
                      Email
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View className="flex-row gap-2">
                <View className="flex-1 rounded-xl border border-red-100 bg-red-50 p-3">
                  <Text className="text-[11px] font-medium text-red-600">
                    Purchase Total
                  </Text>
                  <Text className="text-base font-bold text-red-700 mt-1">
                    ₹{inr(purchaseTotal)}
                  </Text>
                  <Text className="text-[11px] text-red-500 mt-1">
                    {purchases.length} purchases
                  </Text>
                </View>
                <View className="flex-1 rounded-xl border border-slate-200 bg-white p-3">
                  <Text className="text-[11px] font-medium text-slate-500">
                    Expense Total
                  </Text>
                  <Text className="text-base font-bold text-slate-800 mt-1">
                    ₹{inr(expenseTotal)}
                  </Text>
                  <Text className="text-[11px] text-slate-500 mt-1">
                    {expenses.length} expenses
                  </Text>
                </View>
              </View>

              <View className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <View className="px-4 py-3 border-b border-slate-100 flex-row items-center justify-between">
                  <Text className={TYPO.sectionTitle}>Recent Purchases</Text>
                  <Pressable
                    onPress={() =>
                      (navigation.getParent() as any)?.navigate("MoreTab", {
                        screen: "Purchases",
                      })
                    }
                  >
                    <Text className="text-sm font-medium text-primary">
                      View all
                    </Text>
                  </Pressable>
                </View>
                {purchasesFetching ? (
                  <View className="px-4 py-4 gap-3">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </View>
                ) : purchasesError ? (
                  <View className="p-4">
                    <ErrorCard
                      message="Failed to load purchases"
                      onRetry={() => refetchPurchases()}
                    />
                  </View>
                ) : purchases.length === 0 ? (
                  <View className="py-10 px-4">
                    <EmptyState
                      iconName="cube-outline"
                      title="No purchases yet"
                      description="No purchases are linked to this supplier yet."
                    />
                  </View>
                ) : (
                  purchases.slice(0, 5).map((purchase, index) => (
                    <View
                      key={purchase.id}
                      className={`px-4 py-3 ${index > 0 ? "border-t border-slate-100" : ""}`}
                    >
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1 min-w-0">
                          <Text
                            className="text-sm font-semibold text-slate-800"
                            numberOfLines={1}
                          >
                            {purchase.itemName || purchase.category}
                          </Text>
                          <Text
                            className="text-xs text-slate-500 mt-0.5"
                            numberOfLines={1}
                          >
                            {purchase.category} · {formatDate(purchase.date)}
                          </Text>
                          {!!purchase.note && (
                            <Text
                              className="text-xs text-slate-400 mt-1"
                              numberOfLines={1}
                            >
                              {purchase.note}
                            </Text>
                          )}
                        </View>
                        <Text className="text-sm font-bold text-slate-800">
                          ₹{inr(parseFloat(String(purchase.amount)) || 0)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              <View className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <View className="px-4 py-3 border-b border-slate-100 flex-row items-center justify-between">
                  <Text className={TYPO.sectionTitle}>Related Expenses</Text>
                  <Pressable
                    onPress={() =>
                      (navigation.getParent() as any)?.navigate("MoreTab", {
                        screen: "Expenses",
                      })
                    }
                  >
                    <Text className="text-sm font-medium text-primary">
                      View all
                    </Text>
                  </Pressable>
                </View>
                {expensesFetching ? (
                  <View className="px-4 py-4 items-center">
                    <ActivityIndicator size="small" color="#e67e22" />
                  </View>
                ) : expensesError ? (
                  <View className="p-4">
                    <ErrorCard
                      message="Failed to load expenses"
                      onRetry={() => refetchExpenses()}
                    />
                  </View>
                ) : expenses.length === 0 ? (
                  <View className="py-10 px-4">
                    <EmptyState
                      iconName="receipt-outline"
                      title="No related expenses"
                      description="No expenses are tagged with this supplier yet."
                    />
                  </View>
                ) : (
                  expenses.slice(0, 5).map((expense, index) => (
                    <View
                      key={expense.id}
                      className={`px-4 py-3 ${index > 0 ? "border-t border-slate-100" : ""}`}
                    >
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1 min-w-0">
                          <Text
                            className="text-sm font-semibold text-slate-800"
                            numberOfLines={1}
                          >
                            {expense.category}
                          </Text>
                          <Text
                            className="text-xs text-slate-500 mt-0.5"
                            numberOfLines={1}
                          >
                            {formatDate(expense.date)}
                          </Text>
                          {!!expense.note && (
                            <Text
                              className="text-xs text-slate-400 mt-1"
                              numberOfLines={1}
                            >
                              {expense.note}
                            </Text>
                          )}
                        </View>
                        <Text className="text-sm font-bold text-slate-800">
                          ₹{inr(parseFloat(String(expense.amount)) || 0)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}
        </ScreenInner>
      </ScrollView>
    </SafeAreaView>
  );
}
