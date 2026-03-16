/**
 * DashboardScreen — Sprint 3: Home with KPIs, quick actions, low stock.
 * Mirrors web Index.tsx structure. Icons match web QuickActions.
 */
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { invoiceApi, customerApi, summaryApi, productExtApi } from "../lib/api";
import { inr } from "@execora/shared";
import { useWsInvalidation } from "../hooks/useWsInvalidation";
import { PressableCard } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { formatCurrency } from "../lib/utils";

const ACTION_COLORS: Record<string, string> = {
  primary: "#e67e22",
  secondary: "#3d7a9e",
  success: "#1a9248",
  warning: "#e6a319",
};

const QUICK_ACTIONS: Array<{
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  primary: boolean;
  route: string;
  color: string;
}> = [
  { label: "Quick Sale", icon: "flash", primary: true, route: "BillingForm", color: "#ffffff" },
  { label: "New Bill", icon: "receipt", primary: false, route: "BillingForm", color: ACTION_COLORS.primary },
  { label: "Payment", icon: "card", primary: false, route: "Payment", color: ACTION_COLORS.success },
  { label: "Stock", icon: "cube", primary: false, route: "Items", color: ACTION_COLORS.secondary },
  { label: "Invoices", icon: "document-text", primary: false, route: "InvoicesTab", color: ACTION_COLORS.primary },
  { label: "Parties", icon: "people", primary: false, route: "CustomersTab", color: ACTION_COLORS.secondary },
  { label: "Expenses", icon: "cart", primary: false, route: "Expenses", color: ACTION_COLORS.warning },
  { label: "Reports", icon: "bar-chart", primary: false, route: "Reports", color: ACTION_COLORS.secondary },
];

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  useWsInvalidation(["invoices", "customers", "summary", "products", "lowStock"]);

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["summary", "daily"],
    queryFn: () => summaryApi.daily(),
    staleTime: 60_000,
  });

  const { data: invoices, refetch: refetchInvoices, isFetching: loadingInvoices } = useQuery({
    queryKey: ["invoices", "dashboard"],
    queryFn: () => invoiceApi.list(1, 5),
    staleTime: 60_000,
  });

  const { data: customers, isFetching: loadingCustomers } = useQuery({
    queryKey: ["customers", "dashboard"],
    queryFn: () => customerApi.list(1, 5),
    staleTime: 60_000,
  });

  const { data: lowStockData, isLoading: loadingLowStock } = useQuery({
    queryKey: ["products", "low-stock"],
    queryFn: () => productExtApi.lowStock(),
    staleTime: 60_000,
  });

  const refreshing = loadingInvoices || loadingCustomers;
  const todayInvoices = invoices?.invoices ?? [];
  const totalToday = summary?.summary?.totalSales ?? todayInvoices.reduce((s, i) => s + (i.total ?? 0), 0);
  const dailySummary = summary?.summary;
  const lowStock = lowStockData?.products ?? [];
  const collectionRate =
    dailySummary && dailySummary.totalSales > 0
      ? Math.round((dailySummary.totalPayments / dailySummary.totalSales) * 100)
      : 0;

  const handleQuickAction = (route: string) => {
    if (route === "BillingForm") return navigation.navigate("Billing", { screen: "BillingForm" });
    if (route === "Payment") return navigation.getParent()?.navigate("CustomersTab" as never, { screen: "Payment" } as never);
    if (route === "Items") return navigation.navigate("Items");
    if (route === "InvoicesTab") return navigation.navigate("InvoicesTab");
    if (route === "CustomersTab") return navigation.navigate("CustomersTab");
    if (route === "Expenses") return navigation.navigate("MoreTab", { screen: "Expenses" });
    if (route === "Reports") return navigation.navigate("MoreTab", { screen: "Reports" });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetchInvoices} />
        }
      >
        {/* Header — matches web DashboardGreeting */}
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-semibold text-slate-800">
              {(() => {
                const h = new Date().getHours();
                const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
                return `${g}, there!`;
              })()}
            </Text>
          </View>
          <Text className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </Text>
        </View>
        <Text className="text-sm text-slate-400 mb-5">Dashboard</Text>

        {/* KPI cards — matches web KPICards with icons */}
        <View className="flex-row flex-wrap gap-2 mb-5">
          <PressableCard
            onPress={() => navigation.navigate("InvoicesTab")}
            className="flex-1 min-w-[45%] shadow-sm"
          >
            <View className="flex-row items-start justify-between">
              <Text className="text-[11px] font-medium text-muted-foreground">Today's Sales</Text>
              <View className="rounded-lg bg-primary/10 p-1">
                <Ionicons name="trending-up" size={14} color="#e67e22" />
              </View>
            </View>
            {isLoadingSummary ? (
              <Skeleton className="mt-1.5 h-6 w-20 rounded" />
            ) : (
              <Text className="text-lg font-bold tracking-tight mt-1 text-slate-800">
                {formatCurrency(totalToday)}
              </Text>
            )}
            <Text className="text-[10px] font-medium text-success mt-0.5">
              {dailySummary?.invoiceCount ?? 0} bills today
            </Text>
          </PressableCard>

          <PressableCard
            onPress={() => navigation.navigate("InvoicesTab")}
            className="flex-1 min-w-[45%] shadow-sm"
          >
            <View className="flex-row items-start justify-between">
              <Text className="text-[11px] font-medium text-muted-foreground">Pending Dues</Text>
              <View className="rounded-lg bg-warning/20 p-1">
                <Ionicons name="calendar" size={14} color="#e6a319" />
              </View>
            </View>
            {isLoadingSummary ? (
              <Skeleton className="mt-1.5 h-6 w-20 rounded" />
            ) : (
              <Text className="text-lg font-bold tracking-tight mt-1 text-slate-800">
                {formatCurrency(dailySummary?.pendingAmount ?? 0)}
              </Text>
            )}
            <Text className={`text-[10px] font-medium mt-0.5 ${(dailySummary?.pendingAmount ?? 0) > 0 ? "text-destructive" : "text-success"}`}>
              {(dailySummary?.pendingAmount ?? 0) > 0 ? "⚠️ Needs collection" : "✅ All clear"}
            </Text>
          </PressableCard>

          <PressableCard
            onPress={() => navigation.navigate("MoreTab", { screen: "Reports" })}
            className="flex-1 min-w-[45%] shadow-sm"
          >
            <View className="flex-row items-start justify-between">
              <Text className="text-[11px] font-medium text-muted-foreground">Collected Today</Text>
              <View className="rounded-lg bg-success/20 p-1">
                <Ionicons name="wallet" size={14} color="#1a9248" />
              </View>
            </View>
            {isLoadingSummary ? (
              <Skeleton className="mt-1.5 h-6 w-20 rounded" />
            ) : (
              <Text className="text-lg font-bold tracking-tight mt-1 text-slate-800">
                {formatCurrency(dailySummary?.totalPayments ?? 0)}
              </Text>
            )}
            <Text className="text-[10px] font-medium text-success mt-0.5">
              Cash {formatCurrency(dailySummary?.cashPayments ?? 0)} · UPI {formatCurrency(dailySummary?.upiPayments ?? 0)}
            </Text>
          </PressableCard>

          <PressableCard
            onPress={() => navigation.navigate("MoreTab", { screen: "Reports" })}
            className="flex-1 min-w-[45%] shadow-sm"
          >
            <View className="flex-row items-start justify-between">
              <Text className="text-[11px] font-medium text-muted-foreground">Collection Rate</Text>
              <View className="rounded-lg bg-secondary/20 p-1">
                <Ionicons name="pulse" size={14} color="#3d7a9e" />
              </View>
            </View>
            {isLoadingSummary ? (
              <Skeleton className="mt-1.5 h-6 w-20 rounded" />
            ) : (
              <Text className="text-lg font-bold tracking-tight mt-1 text-slate-800">{collectionRate}%</Text>
            )}
            <Text className={`text-[10px] font-medium mt-0.5 ${collectionRate >= 50 ? "text-success" : "text-destructive"}`}>
              {collectionRate >= 80 ? "✅ Excellent" : collectionRate >= 50 ? "⚠️ Below target" : "🔴 Low"}
            </Text>
          </PressableCard>
        </View>

        {/* Quick actions — matches web QuickActions */}
        <Text className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Quick Actions
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              onPress={() => handleQuickAction(a.route)}
              activeOpacity={0.85}
              className={`flex-1 min-w-[22%] min-h-[72px] items-center justify-center gap-1 rounded-xl border py-3 ${
                a.primary
                  ? "bg-primary border-primary shadow-md"
                  : "bg-card border-border"
              }`}
            >
              <View className="mb-1">
                <Ionicons
                  name={a.icon}
                  size={22}
                  color={a.color}
                />
              </View>
              <Text
                className={`text-[10px] font-semibold ${a.primary ? "text-white" : "text-slate-600"}`}
              >
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Low stock alert — matches web DashboardLowStock */}
        {!loadingLowStock && lowStock.length > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate("Items")}
            activeOpacity={0.9}
            className="flex-row flex-wrap items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5 mb-5"
          >
            <Text className="text-xs font-semibold text-amber-700">
              {lowStock.filter((p) => p.stock === 0).length > 0 ? "🔴" : "⚠️"} Stock Alert ({lowStock.length}):
            </Text>
            {lowStock.slice(0, 5).map((p) => (
              <View
                key={p.id}
                className={`rounded-full border px-2 py-0.5 ${
                  p.stock === 0
                    ? "border-destructive/40 bg-destructive/10"
                    : "border-warning/40 bg-warning/15"
                }`}
              >
                <Text className={`text-xs font-medium ${p.stock === 0 ? "text-destructive" : "text-warning"}`}>
                  {p.name} {p.stock}{p.unit ?? ""}
                </Text>
              </View>
            ))}
            {lowStock.length > 5 && (
              <View className="rounded-full border border-border bg-muted px-2 py-0.5">
                <Text className="text-xs text-muted-foreground">+{lowStock.length - 5} more</Text>
              </View>
            )}
            <Text className="ml-auto text-[11px] text-muted-foreground">Manage Inventory →</Text>
          </TouchableOpacity>
        )}

        {/* Recent invoices — card style like web */}
        <Text className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Recent Invoices
        </Text>
        <View className="rounded-xl border border-slate-200 bg-card overflow-hidden shadow-sm">
          {todayInvoices.length === 0 && (
            <View className="py-8 items-center">
              <Text className="text-slate-400 text-sm">No invoices yet today</Text>
            </View>
          )}
          {todayInvoices.map((inv, idx) => (
            <TouchableOpacity
              key={inv.id}
              onPress={() =>
                navigation.getParent()?.navigate("InvoicesTab" as never, {
                  screen: "InvoiceDetail",
                  params: { id: inv.id },
                } as never)
              }
              className={`flex-row items-center px-4 py-3 ${idx > 0 ? "border-t border-slate-100" : ""}`}
            >
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-800">
                  {(inv as any).invoiceNo ?? inv.id.slice(-6)}
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5">
                  {inv.customer?.name ?? "Walk-in"}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-sm font-bold text-primary">
                  ₹{inr(inv.total)}
                </Text>
                <View
                  className={`mt-1 px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-green-100" : "bg-amber-100"}`}
                >
                  <Text
                    className={`text-[10px] font-semibold ${inv.status === "paid" ? "text-green-700" : "text-amber-700"}`}
                  >
                    {inv.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
