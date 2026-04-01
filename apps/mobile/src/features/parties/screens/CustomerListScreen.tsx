import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { customerApi } from ".."; // customerApi from feature;
import { useWsInvalidation } from "../../../hooks/useWsInvalidation";
import { useResponsive } from "../../../hooks/useResponsive";
import { inr, type Customer } from "@execora/shared";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorCard } from "../../../components/ui/ErrorCard";

export function CustomersScreen() {
  const navigation = useNavigation<any>();
  const { contentPad } = useResponsive();
  useWsInvalidation(["customers", "summary"]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["customers", search, page],
    queryFn: () =>
      search.length >= 1
        ? customerApi.search(search, 20)
        : customerApi.list(page, 20),
    staleTime: 10_000,
  });

  const customers: Customer[] = data?.customers ?? [];
  const keyExtractor = useCallback((c: Customer) => c.id, []);
  const goToOverdue = useCallback(
    () => navigation.navigate("Overdue"),
    [navigation],
  );

  const renderCustomerItem = useCallback(
    ({ item: c }: { item: Customer }) => (
      <TouchableOpacity
        className="flex-row items-center rounded-xl border border-slate-200 bg-card px-4 py-3 shadow-sm"
        activeOpacity={0.7}
        onPress={() => navigation.navigate("PartyDetail", { id: c.id })}
      >
        <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
          <Text className="text-primary font-bold">
            {c.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-800">{c.name}</Text>
          {c.phone && (
            <Text className="text-xs text-slate-500 mt-0.5">{c.phone}</Text>
          )}
        </View>
        <View className="items-end">
          {c.balance > 0 && (
            <View className="bg-amber-100 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-semibold text-amber-700">
                ₹{inr(c.balance)} due
              </Text>
            </View>
          )}
          {c.balance < 0 && (
            <View className="bg-green-100 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-semibold text-green-700">
                ₹{inr(Math.abs(c.balance))} credit
              </Text>
            </View>
          )}
          {c.balance === 0 && (
            <Text className="text-[10px] text-slate-400">settled</Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    [navigation],
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header — matches web list headers */}
      <View
        style={{
          paddingHorizontal: contentPad,
          paddingTop: contentPad,
          paddingBottom: 12,
        }}
        className="border-b border-slate-200 bg-card"
      >
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xl font-bold tracking-tight text-slate-800">
            Parties
          </Text>
          <TouchableOpacity
            onPress={goToOverdue}
            activeOpacity={0.7}
            className="flex-row items-center gap-1.5 bg-red-50 border border-red-100 rounded-xl px-4 min-h-[44px] justify-center"
          >
            <Text className="text-xs font-bold text-red-600">Udhaar List</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center border border-slate-200 rounded-xl bg-slate-50 px-3">
          <Ionicons
            name="search"
            size={18}
            color="#94a3b8"
            style={{ marginRight: 8 }}
          />
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
            placeholder="Search by name or phone…"
            placeholderTextColor="#94a3b8"
            className="flex-1 h-11 text-sm text-slate-800"
          />
          {isFetching && <ActivityIndicator size="small" color="#e67e22" />}
        </View>
      </View>

      <FlatList
        data={customers}
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
          isError ? (
            <View
              style={{ paddingVertical: 64, paddingHorizontal: contentPad }}
            >
              <ErrorCard
                message="Failed to load customers"
                onRetry={() => refetch()}
              />
            </View>
          ) : (
            <EmptyState
              iconName={search ? "search-outline" : "people-outline"}
              title={search ? "No customers found" : "No customers yet"}
              description={
                search
                  ? "Try a different search term"
                  : "Add your first customer to get started"
              }
            />
          )
        }
        renderItem={renderCustomerItem}
      />
    </SafeAreaView>
  );
}
