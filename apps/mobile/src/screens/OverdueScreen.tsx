/**
 * OverdueScreen — Customers with unpaid balance (udhaar list).
 *
 * Daily use-case: shopkeeper opens this at the start/end of day to see
 * who owes money and tap to WhatsApp / record payment directly.
 *
 * API: GET /api/v1/customers/overdue
 * Returns: { customers: Array<{ id, name, balance, phone?, landmark? }> }
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Linking,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@execora/shared";
import { inr } from "@execora/shared";
import { useResponsive } from "../hooks/useResponsive";
import { SIZES } from "../lib/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OverdueCustomer {
  id: string;
  name: string;
  balance: number;
  phone?: string;
  landmark?: string;
}

// ── OverdueScreen ─────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<import("../navigation").InvoicesStackParams, "Overdue">;

export function OverdueScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const { contentPad, contentWidth } = useResponsive();

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["customers", "overdue"],
    queryFn: () =>
      apiFetch<{ customers: OverdueCustomer[] }>("/api/v1/customers/overdue"),
    staleTime: 30_000,
  });

  const customers = data?.customers ?? [];
  const totalPending = customers.reduce((s, c) => s + Math.abs(c.balance), 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function openWhatsApp(phone: string, name: string, balance: number) {
    const msg = encodeURIComponent(
      `Hello ${name}, aapka ${inr(balance)} pending hai. Please settle karein. Thank you!`,
    );
    Linking.openURL(`https://wa.me/${phone.replace(/\D/g, "")}?text=${msg}`);
  }

  function openCustomer(id: string) {
    (navigation.getParent() as any)?.navigate("CustomersTab", {
      screen: "CustomerDetail",
      params: { id },
    });
  }

  const renderItem = ({ item }: { item: OverdueCustomer }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openCustomer(item.id)}
      activeOpacity={0.75}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.customerName} numberOfLines={1} ellipsizeMode="tail">
          {item.name}
        </Text>
        {item.landmark ? (
          <Text style={styles.landmark} numberOfLines={1} ellipsizeMode="tail">
            {item.landmark}
          </Text>
        ) : null}
        {item.phone ? (
          <Text style={styles.phone} numberOfLines={1} ellipsizeMode="tail">
            {item.phone}
          </Text>
        ) : null}
      </View>

      <View style={styles.cardRight}>
        <Text style={styles.balance}>{inr(Math.abs(item.balance))}</Text>
        {item.phone ? (
          <TouchableOpacity
            style={styles.waBtn}
            onPress={() => openWhatsApp(item.phone!, item.name, Math.abs(item.balance))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.waBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, width: "100%", alignItems: "center" }}>
        <View style={{ width: "100%", maxWidth: contentWidth, flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: contentPad }]}>
        <Text style={styles.headerTitle}>Overdue / Udhaar</Text>
        {isFetching && !refreshing ? (
          <ActivityIndicator size="small" color="#e67e22" />
        ) : null}
      </View>

      {/* Summary banner */}
      {customers.length > 0 && (
        <View style={[styles.summaryBanner, { paddingHorizontal: contentPad }]}>
          <Text style={styles.summaryText}>
            {customers.length} customers · Total pending:{" "}
            <Text style={styles.summaryAmount}>{inr(totalPending)}</Text>
          </Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({ length: 80, offset: 80 * index, index })}
        contentContainerStyle={
          customers.length === 0
            ? styles.emptyContainer
            : { ...styles.listContent, padding: contentPad }
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e67e22"
          />
        }
        ListEmptyComponent={
          isFetching ? null : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>Sab clear hai!</Text>
              <Text style={styles.emptySubtitle}>
                Koi pending balance nahi hai.
              </Text>
            </View>
          )
        }
      />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: SIZES.FONT.xl,
    fontWeight: "800",
    color: "#0f172a",
  },

  summaryBanner: {
    backgroundColor: "#fff7ed",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#fed7aa",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  summaryText: { fontSize: SIZES.FONT.base, color: "#92400e" },
  summaryAmount: { fontWeight: "700", color: "#dc2626" },

  listContent: { gap: 8 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
    minHeight: 72,
  },
  cardLeft: { flex: 1, minWidth: 0, gap: 2 },
  customerName: {
    fontSize: SIZES.FONT.lg,
    fontWeight: "700",
    color: "#0f172a",
    flexShrink: 1,
  },
  landmark: { fontSize: SIZES.FONT.sm, color: "#94a3b8", flexShrink: 1 },
  phone: { fontSize: SIZES.FONT.sm, color: "#64748b", flexShrink: 1 },

  cardRight: { alignItems: "flex-end", gap: 6, minWidth: 90 },
  balance: {
    fontSize: SIZES.FONT.lg,
    fontWeight: "800",
    color: "#dc2626",
  },
  waBtn: {
    backgroundColor: "#25d366",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: SIZES.TOUCH_MIN,
    alignItems: "center",
    justifyContent: "center",
  },
  waBtnText: {
    color: "#fff",
    fontSize: SIZES.FONT.sm,
    fontWeight: "700",
  },

  emptyBox: { alignItems: "center", gap: 8, paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: SIZES.FONT["2xl"],
    fontWeight: "800",
    color: "#0f172a",
  },
  emptySubtitle: { fontSize: SIZES.FONT.base, color: "#64748b" },
});
