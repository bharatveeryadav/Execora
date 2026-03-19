/**
 * DashboardScreen — Full parity with web Index.tsx.
 * Order: Greeting → BusinessHealthScore → AiAgentFeed → QuickActions → KPICards → RecentActivity → LowStock → ExpiryAlert
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  invoiceApi,
  customerApi,
  summaryApi,
  productExtApi,
  reminderApi,
  authApi,
} from "../lib/api";
import { inr } from "@execora/shared";
import { useWsInvalidation } from "../hooks/useWsInvalidation";
import { useResponsive } from "../hooks/useResponsive";
import { useAuth } from "../contexts/AuthContext";
import { useWS } from "../hooks/useWS";
import { wsClient } from "../lib/ws";
import { PressableCard } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { formatCurrency } from "../lib/utils";
import { TYPO } from "../lib/typography";

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
  params?: Record<string, unknown>;
}> = [
  { label: "Quick Sale", icon: "flash-outline", primary: true, route: "BillingForm", color: "#ffffff", params: { startAsWalkIn: true } },
  { label: "Invoices", icon: "document-text-outline", primary: false, route: "InvoicesTab", color: ACTION_COLORS.primary },
  { label: "New Invoice", icon: "add-circle-outline", primary: false, route: "BillingForm", color: ACTION_COLORS.primary, params: { startAsWalkIn: false } },
  { label: "Insights", icon: "stats-chart-outline", primary: false, route: "Reports", color: ACTION_COLORS.secondary },
  { label: "Invoice Templates", icon: "layers-outline", primary: false, route: "DocumentTemplates", color: ACTION_COLORS.secondary },
  { label: "Pro forma", icon: "document-outline", primary: false, route: "InvoicesTab", color: ACTION_COLORS.primary },
  { label: "Purchase Order", icon: "bag-handle-outline", primary: false, route: "PurchaseOrders", color: ACTION_COLORS.secondary },
  { label: "Credit Note", icon: "receipt-outline", primary: false, route: "CreditNotes", color: ACTION_COLORS.primary },
  { label: "Quotation", icon: "clipboard-outline", primary: false, route: "InvoicesTab", color: ACTION_COLORS.primary },
  { label: "Delivery Challan", icon: "car-outline", primary: false, route: "DeliveryChallans", color: ACTION_COLORS.secondary },
  { label: "Payment", icon: "card-outline", primary: false, route: "Payment", color: ACTION_COLORS.success },
  { label: "Stock", icon: "cube-outline", primary: false, route: "Items", color: ACTION_COLORS.secondary },
  { label: "Parties", icon: "people-outline", primary: false, route: "CustomersTab", color: ACTION_COLORS.secondary },
  { label: "Expenses", icon: "cart-outline", primary: false, route: "Expenses", color: ACTION_COLORS.warning },
  { label: "Reports", icon: "bar-chart-outline", primary: false, route: "Reports", color: ACTION_COLORS.secondary },
];

// Command sets by category (matches web AiAgentFeed)
const COMMAND_SETS: Array<{ category: string; icon: keyof typeof Ionicons.glyphMap; items: string[] }> = [
  { category: "Sales", icon: "receipt-outline", items: ["Ramesh ka invoice banao 3 rice 50kg", "Suresh ko 3 bag diya 1200 ka", "Invoice print karo"] },
  { category: "Payment", icon: "wallet-outline", items: ["Ramesh ne 500 diya", "Sita ka payment 2000 record karo", "Aaj kitna collection hua?"] },
  { category: "Stock", icon: "cube-outline", items: ["Rice kitna bacha?", "Atta ka stock low hai", "Sugar 100kg add karo"] },
  { category: "Customers", icon: "people-outline", items: ["Ramesh ka balance batao", "Suresh ka udhar kitna hai?", "Naya customer Mohan add karo"] },
  { category: "Reports", icon: "bar-chart-outline", items: ["Aaj ki sale kitni hui?", "Is hafte ka report dikhao", "GSTR-1 download karo"] },
  { category: "Misc", icon: "ellipsis-horizontal", items: ["Kaunse customers ka pesa aana baaki hai?", "Low stock alert dikhao", "Business health kaisi hai?"] },
];

function useSecondsAgo(ts: number) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs(Math.round((Date.now() - ts) / 1000)), 1000);
    return () => clearInterval(t);
  }, [ts]);
  return secs;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function daysLabel(days: number) {
  if (days <= 0) return "EXPIRED";
  if (days === 1) return "1d left";
  return `${days}d left`;
}

function reminderPillStyle(days: number) {
  if (days <= 3) return { borderColor: "#fecaca", backgroundColor: "#fef2f2" };
  if (days <= 5) return { borderColor: "#fde68a", backgroundColor: "#fffbeb" };
  return { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" };
}

const SECTION_GAP = 16;
const QUICK_ACTIONS_PER_ROW = 4;
const QUICK_ACTIONS_SECTIONS_COLLAPSED = 2; // When collapsed, hide last 2 sections (show first 2)

type Props = BottomTabScreenProps<import("../navigation").MainTabParams, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
  const { contentWidth, contentPad: padding } = useResponsive();
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(false);
  const [businessHealthExpanded, setBusinessHealthExpanded] = useState(true);
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isConnected } = useWS();
  useWsInvalidation(["invoices", "customers", "summary", "products", "lowStock", "reminders", "expiringBatches"]);

  const { data: meData } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    staleTime: 5 * 60_000,
  });
  const meUser = meData?.user as {
    tenant?: {
      name?: string;
      legalName?: string;
      tradeName?: string;
      gstin?: string;
      settings?: Record<string, string | boolean>;
    };
  } | undefined;
  const tenant = meUser?.tenant;
  const settings = (tenant?.settings ?? {}) as Record<string, string>;
  const businessName = tenant?.legalName ?? tenant?.tradeName ?? tenant?.name ?? "My Business";
  const gstin = tenant?.gstin ?? "";
  const bankName = settings.bankName ?? "";
  const bankAccountNo = settings.bankAccountNo ?? "";
  const bankIfsc = settings.bankIfsc ?? "";
  const bankAccountHolder = settings.bankAccountHolder ?? "";

  const { data: summary, isLoading: isLoadingSummary, isFetching: sumFetching, dataUpdatedAt: sumAt } = useQuery({
    queryKey: ["summary", "daily"],
    queryFn: () => summaryApi.daily(),
    staleTime: 60_000,
  });

  const {
    data: invoices,
    refetch: refetchInvoices,
    isFetching: loadingInvoices,
    dataUpdatedAt: invAt,
  } = useQuery({
    queryKey: ["invoices", "dashboard"],
    queryFn: () => invoiceApi.list(1, 20),
    staleTime: 60_000,
  });

  const { data: customersData, isFetching: custFetching, dataUpdatedAt: custAt } = useQuery({
    queryKey: ["customers", "health"],
    queryFn: () => customerApi.list(1, 200),
    staleTime: 60_000,
  });

  const { data: lowStockData, isLoading: loadingLowStock, isFetching: stockFetching, dataUpdatedAt: stockAt } = useQuery({
    queryKey: ["products", "low-stock"],
    queryFn: () => productExtApi.lowStock(),
    staleTime: 60_000,
  });

  const { data: remindersData } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => reminderApi.list(),
    staleTime: 60_000,
  });

  const { data: expiringData } = useQuery({
    queryKey: ["expiringBatches", 30],
    queryFn: () => productExtApi.expiringBatches(30),
    staleTime: 300_000,
  });

  const refreshing = loadingInvoices;
  const healthRefreshing = sumFetching || custFetching || stockFetching;
  const todayInvoices = invoices?.invoices ?? [];
  const totalToday = summary?.summary?.totalSales ?? todayInvoices.reduce((s, i) => s + (i.total ?? 0), 0);
  const dailySummary = summary?.summary;
  const lowStock = lowStockData?.products ?? [];
  const batches = expiringData?.batches ?? [];
  const customers = customersData?.customers ?? [];
  const reminders = (remindersData?.reminders ?? []) as Array<{
    id: string;
    status: string;
    scheduledTime: string;
    customer?: { name?: string };
    amount?: number | string;
    notes?: string;
  }>;

  const collectionRate =
    dailySummary && dailySummary.totalSales > 0
      ? Math.min(100, Math.round((dailySummary.totalPayments / dailySummary.totalSales) * 100))
      : 0;
  const overdueCount = customers.filter((c) => parseFloat(String(c.balance ?? 0)) > 0).length;
  const stockScore = Math.max(0, 100 - lowStock.length * 15);
  const overdueScore = Math.max(0, 100 - overdueCount * 10);
  const overall = Math.round((collectionRate + stockScore + overdueScore) / 3);
  const overallColor = overall >= 70 ? "#1a9248" : overall >= 50 ? "#e6a319" : "#dc2626";
  const overallLabel = overall >= 70 ? "Good" : overall >= 50 ? "Needs Work" : "Critical";

  const upcomingReminders = reminders
    .filter((r) => r.status === "pending")
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
    .slice(0, 6);

  const overdueList = customers
    .filter((c) => parseFloat(String(c.balance ?? 0)) > 0)
    .sort((a, b) => parseFloat(String(b.balance)) - parseFloat(String(a.balance)));

  const lastUpdated = Math.max(sumAt ?? 0, invAt ?? 0, custAt ?? 0, stockAt ?? 0) || Date.now();
  const secsAgo = useSecondsAgo(lastUpdated);

  const [flashCollection, setFlashCollection] = useState(false);
  const [flashStock, setFlashStock] = useState(false);
  const [flashReceivables, setFlashReceivables] = useState(false);
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [cmdSetIdx, setCmdSetIdx] = useState(0);
  const [cmdItemIdx, setCmdItemIdx] = useState(0);
  const [businessMenuOpen, setBusinessMenuOpen] = useState(false);
  const [expirySelected, setExpirySelected] = useState<{
    id: string;
    batchNo: string;
    expiryDate: string;
    quantity: number;
    product: { name: string; unit: string };
  } | null>(null);
  const [feed, setFeed] = useState<Array<{ id: number; icon: string; text: string; subtext?: string; at: number }>>([]);
  const feedId = useRef(1);

  useEffect(() => {
    const tick = () => {
      setCmdItemIdx((i) => {
        const maxItems = COMMAND_SETS[cmdSetIdx].items.length;
        if (i + 1 >= maxItems) {
          setCmdSetIdx((s) => (s + 1) % COMMAND_SETS.length);
          return 0;
        }
        return i + 1;
      });
    };
    const t = setInterval(tick, 4000);
    return () => clearInterval(t);
  }, [cmdSetIdx]);

  useEffect(() => {
    const push = (icon: string, text: string, subtext?: string) =>
      setFeed((prev) => [{ id: feedId.current++, icon, text, subtext, at: Date.now() }, ...prev].slice(0, 15));

    const offs = [
      wsClient.on("invoice:confirmed", (p: unknown) => {
        const d = p as { customerName?: string; invoiceNo?: string; total?: number };
        push("receipt-outline", `Invoice — ${d.customerName ?? "Customer"}`, d.invoiceNo);
        const msg = d.total
          ? `Invoice confirmed — ₹${parseFloat(String(d.total)).toLocaleString("en-IN")}`
          : "Invoice confirmed";
        Alert.alert("", msg);
      }),
      wsClient.on("payment:recorded", (p: unknown) => {
        const d = p as { customerName?: string; amount?: number };
        push("wallet-outline", `Payment from ${d.customerName ?? "Customer"}`, d.amount ? formatCurrency(d.amount) : undefined);
        const msg = d.amount
          ? `Payment recorded — ₹${parseFloat(String(d.amount)).toLocaleString("en-IN")}`
          : "Payment recorded";
        Alert.alert("", msg);
      }),
      wsClient.on("customer:updated", (p: unknown) => {
        const d = p as { name?: string };
        push("person-outline", `Customer updated — ${d.name ?? ""}`);
      }),
      wsClient.on("product:updated", (p: unknown) => {
        const d = p as { name?: string };
        push("cube-outline", `Stock updated — ${d.name ?? "Product"}`);
      }),
    ];
    return () => offs.forEach((o) => o());
  }, []);

  // Flash pillars on WS events
  const flash = (setter: (v: boolean) => void, key: string) => {
    setter(true);
    if (flashTimers.current[key]) clearTimeout(flashTimers.current[key]);
    flashTimers.current[key] = setTimeout(() => setter(false), 2000);
  };
  useEffect(() => {
    const offs = [
      wsClient.on("payment:recorded", () => {
        void qc.invalidateQueries({ queryKey: ["summary"] });
        void qc.invalidateQueries({ queryKey: ["customers"] });
        flash(setFlashCollection, "col");
        flash(setFlashReceivables, "rec");
      }),
      wsClient.on("invoice:confirmed", () => {
        void qc.invalidateQueries({ queryKey: ["summary"] });
        void qc.invalidateQueries({ queryKey: ["customers"] });
        flash(setFlashCollection, "col");
      }),
      wsClient.on("invoice:draft", () => {
        void qc.invalidateQueries({ queryKey: ["summary"] });
        flash(setFlashCollection, "col");
      }),
      wsClient.on("customer:updated", () => {
        void qc.invalidateQueries({ queryKey: ["customers"] });
        flash(setFlashReceivables, "rec");
      }),
      wsClient.on("product:updated", () => {
        void qc.invalidateQueries({ queryKey: ["products"] });
        void qc.invalidateQueries({ queryKey: ["products", "low-stock"] });
        flash(setFlashStock, "stk");
      }),
    ];
    return () => offs.forEach((o) => o());
  }, [qc]);

  const handleQuickAction = (route: string, params?: Record<string, unknown>) => {
    if (route === "BillingForm") return navigation.getParent()?.navigate("MoreTab" as never, { screen: "Billing", params: { screen: "BillingForm", params } } as never);
    if (route === "Payment") return navigation.getParent()?.navigate("CustomersTab" as never, { screen: "Payment" } as never);
    if (route === "Items") return navigation.navigate("ItemsTab");
    if (route === "InvoicesTab") return navigation.navigate("InvoicesTab");
    if (route === "CustomersTab") return navigation.navigate("CustomersTab");
    if (route === "Expenses") return navigation.navigate("MoreTab", { screen: "Expenses" });
    if (route === "Reports") return navigation.navigate("MoreTab", { screen: "Reports" });
    if (route === "CreditNotes") return navigation.navigate("InvoicesTab", { screen: "CreditNotes" } as never);
    if (route === "PurchaseOrders") return navigation.navigate("MoreTab", { screen: "PurchaseOrders" });
    if (route === "DocumentTemplates") return navigation.navigate("MoreTab", { screen: "DocumentTemplates" });
    if (route === "DeliveryChallans") return navigation.navigate("MoreTab", { screen: "DeliveryChallans" });
  };

  const currentSet = COMMAND_SETS[cmdSetIdx];
  const currentCmd = currentSet.items[cmdItemIdx];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: padding,
          paddingBottom: 32,
          paddingTop: SECTION_GAP,
          alignItems: "center",
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetchInvoices} />
        }
      >
        <View style={{ width: "100%", maxWidth: contentWidth }}>
        {/* 1 — Header bar: Business name, tap for options */}
        <TouchableOpacity
          onPress={() => setBusinessMenuOpen(true)}
          activeOpacity={0.8}
          className="flex-row items-center gap-2 mb-4 py-2"
        >
          <View className="flex-1 min-w-0 flex-row items-center gap-2">
            <View className={`h-2 w-2 rounded-full shrink-0 ${isConnected ? "bg-green-500" : "bg-amber-500"}`} style={{ opacity: isConnected ? 1 : 0.8 }} />
            <Text className={TYPO.sectionTitle} numberOfLines={1}>
              {businessName}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#94a3b8" />
        </TouchableOpacity>

        {/* Business menu modal */}
        <Modal visible={businessMenuOpen} transparent animationType="fade">
          <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setBusinessMenuOpen(false)}>
            <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-2xl p-3 pb-6">
              <View className="w-8 h-0.5 rounded-full bg-slate-200 self-center mb-2" />
              <Text className={`${TYPO.sectionTitle} mb-2`}>Select Business</Text>
              <View className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 mb-4" style={{ position: "relative" }}>
                <View
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    marginTop: -9,
                  }}
                >
                  <Ionicons name="radio-button-on" size={18} color="#e67e22" />
                </View>
                <View className="flex-row items-center pr-8">
                  <Text className="text-xs font-semibold text-slate-800 flex-1" numberOfLines={1}>{businessName}</Text>
                </View>
                <View className="flex-row gap-3 mt-1.5">
                  <TouchableOpacity
                    onPress={() => {
                      setBusinessMenuOpen(false);
                      navigation.navigate("MoreTab", { screen: "CompanyProfile" });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs font-semibold text-primary">Edit Company</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setBusinessMenuOpen(false);
                      const parts: string[] = [businessName];
                      if (gstin) parts.push(`GSTIN: ${gstin}`);
                      if (bankAccountHolder || bankName || bankAccountNo || bankIfsc) {
                        const bankLines: string[] = [];
                        if (bankAccountHolder) bankLines.push(`A/c Holder: ${bankAccountHolder}`);
                        if (bankName) bankLines.push(`Bank: ${bankName}`);
                        if (bankAccountNo) bankLines.push(`A/c No: ${bankAccountNo}`);
                        if (bankIfsc) bankLines.push(`IFSC: ${bankIfsc}`);
                        if (bankLines.length) parts.push("Bank Details:\n" + bankLines.join("\n"));
                      }
                      Share.share({ message: parts.join("\n\n"), title: "Business Details" });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs font-semibold text-primary">Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View className="items-center">
                <TouchableOpacity
                  onPress={() => {
                    setBusinessMenuOpen(false);
                    navigation.navigate("MoreTab", { screen: "CompanyProfile" });
                  }}
                  className="flex-row items-center gap-1.5 py-2.5 px-4 rounded-lg bg-primary/10"
                >
                  <Ionicons name="add" size={18} color="#e67e22" />
                  <Text className="text-xs font-medium text-slate-700">Add New Business</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* 2 — Business Health Score (collapsible) */}
        <TouchableOpacity
          activeOpacity={businessHealthExpanded ? 1 : 0.7}
          onPress={() => !businessHealthExpanded && setBusinessHealthExpanded(true)}
          style={{
            borderRadius: 12,
            borderWidth: flashCollection || flashStock || flashReceivables ? 2 : 1,
            borderColor: flashCollection || flashStock || flashReceivables ? "#e67e22" : "#e2e8f0",
            backgroundColor: "#fff",
            padding: businessHealthExpanded ? 12 : 10,
            marginBottom: 16,
          }}
        >
          <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
            <View className="flex-1 min-w-0 flex-row items-center gap-3">
              <View
                className="w-12 h-12 rounded-full items-center justify-center shrink-0"
                style={{ borderWidth: 3, borderColor: overallColor, backgroundColor: "#f8fafc" }}
              >
                <Text className="text-xs font-bold tabular-nums" style={{ color: overallColor }}>
                  {overall}
                </Text>
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-1.5">
                  <Text className={TYPO.sectionTitle}>Business Health</Text>
                  <View className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-slate-400"}`} />
                  {healthRefreshing && <ActivityIndicator size="small" color="#e67e22" style={{ marginLeft: 4 }} />}
                </View>
                <Text className={`${TYPO.label} mt-0.5`} style={{ color: overallColor }}>
                  {overall}/100 · {overallLabel}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setBusinessHealthExpanded((e) => !e)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="flex-row items-center gap-1 shrink-0"
            >
              <Text className="text-xs font-semibold text-primary">
                {businessHealthExpanded ? "Hide" : "Show"}{" "}
              </Text>
              <Ionicons
                name={businessHealthExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color="#e67e22"
              />
            </TouchableOpacity>
          </View>

          {businessHealthExpanded && (
            <>
          <View className="h-1 w-full rounded-full bg-slate-200 mt-3 mb-3">
            <View
              className="h-full rounded-full"
              style={{ width: `${overall}%`, backgroundColor: overallColor }}
            />
          </View>
          {/* Pillar cards with progress bars and hints */}
          <View style={{ flexDirection: "row", gap: 6, marginBottom: overdueList.length > 0 || upcomingReminders.length > 0 ? 10 : 0 }}>
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate("CustomersTab" as never, { screen: "Payment" } as never)}
              activeOpacity={0.8}
              style={{
                flex: 1,
                minWidth: 0,
                borderRadius: 10,
                borderWidth: flashCollection ? 2 : 1,
                borderColor: flashCollection ? "#e67e22" : "#e2e8f0",
                backgroundColor: "#f8fafc",
                padding: 8,
              }}
            >
              <View className="flex-row items-center justify-between mb-0.5">
                <Text className={TYPO.micro}>💰 Collection</Text>
                <Text className={`${TYPO.microBold} ${collectionRate >= 80 ? "text-green-600" : collectionRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {collectionRate}%
                </Text>
              </View>
              <View className="h-1 w-full rounded-full bg-slate-200 mb-1">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${collectionRate}%`,
                    backgroundColor: collectionRate >= 80 ? "#1a9248" : collectionRate >= 50 ? "#e6a319" : "#dc2626",
                  }}
                />
              </View>
              <Text className={`${TYPO.micro} text-slate-500`}>{collectionRate}% today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("MoreTab", { screen: "Items" })}
              activeOpacity={0.8}
              style={{
                flex: 1,
                minWidth: 0,
                borderRadius: 10,
                borderWidth: flashStock ? 2 : 1,
                borderColor: flashStock ? "#e67e22" : "#e2e8f0",
                backgroundColor: "#f8fafc",
                padding: 8,
              }}
            >
              <View className="flex-row items-center justify-between mb-0.5">
                <View className="flex-row items-center gap-1">
                  <Ionicons name="cube-outline" size={12} color="#64748b" />
                  <Text className={TYPO.micro}>Stock</Text>
                </View>
                <Text className={`${TYPO.microBold} ${stockScore >= 80 ? "text-green-600" : stockScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {stockScore}%
                </Text>
              </View>
              <View className="h-1 w-full rounded-full bg-slate-200 mb-1">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${stockScore}%`,
                    backgroundColor: stockScore >= 80 ? "#1a9248" : stockScore >= 50 ? "#e6a319" : "#dc2626",
                  }}
                />
              </View>
              <Text className={`${TYPO.micro} text-slate-500`}>
                {lowStock.length === 0 ? "All stocked" : `${lowStock.length} low`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate("CustomersTab" as never, { screen: "Overdue" } as never)}
              activeOpacity={0.8}
              style={{
                flex: 1,
                minWidth: 0,
                borderRadius: 10,
                borderWidth: flashReceivables ? 2 : 1,
                borderColor: flashReceivables ? "#e67e22" : "#e2e8f0",
                backgroundColor: "#f8fafc",
                padding: 8,
              }}
            >
              <View className="flex-row items-center justify-between mb-0.5">
                <View className="flex-row items-center gap-1">
                  <Ionicons name="receipt-outline" size={12} color="#64748b" />
                  <Text className={TYPO.micro}>Receivables</Text>
                </View>
                <Text className={`${TYPO.microBold} ${overdueScore >= 80 ? "text-green-600" : overdueScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {overdueScore}%
                </Text>
              </View>
              <View className="h-1 w-full rounded-full bg-slate-200 mb-1">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${overdueScore}%`,
                    backgroundColor: overdueScore >= 80 ? "#1a9248" : overdueScore >= 50 ? "#e6a319" : "#dc2626",
                  }}
                />
              </View>
              <Text className={`${TYPO.micro} text-slate-500`}>
                {overdueCount === 0 ? "All clear" : `${overdueCount} overdue`}
              </Text>
            </TouchableOpacity>
          </View>
          {overdueList.length > 0 && (
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate("CustomersTab" as never, { screen: "Overdue" } as never)}
              activeOpacity={0.9}
              className="flex-row flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 mb-2"
            >
              <View className="flex-row items-center gap-1 shrink-0">
                <Ionicons name="alert-circle" size={14} color="#dc2626" />
                <Text className={TYPO.labelBold + " text-red-700"}>Overdue ({overdueList.length})</Text>
              </View>
              <View className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5">
                <Text className={`${TYPO.label} text-red-700`}>
                  {(overdueList[0].name ?? "—").slice(0, 12)}{(overdueList[0].name ?? "").length > 12 ? "…" : ""} {formatCurrency(overdueList[0].balance)}
                </Text>
              </View>
              <View className="rounded-full border border-red-300 bg-red-200/50 px-2 py-0.5">
                <Text className={`${TYPO.micro} font-semibold text-red-700`}>
                  {formatCurrency(overdueList.reduce((s, c) => s + parseFloat(String(c.balance ?? 0)), 0))} total
                </Text>
              </View>
              <Text className={`${TYPO.caption} ml-auto shrink-0`}>View All →</Text>
            </TouchableOpacity>
          )}
          {upcomingReminders.length > 0 && (
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate("CustomersTab" as never, { screen: "Overdue" } as never)}
              activeOpacity={0.9}
              className="flex-row flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5"
            >
              <View className="flex-row items-center gap-1">
                <Ionicons name="time-outline" size={14} color="#e67e22" />
                <Text className={TYPO.labelBold + " text-primary"}>Upcoming ({upcomingReminders.length})</Text>
              </View>
              {upcomingReminders.slice(0, 3).map((r) => {
                const days = Math.max(0, Math.ceil((new Date(r.scheduledTime).getTime() - Date.now()) / 86400000));
                const pillStyle = reminderPillStyle(days);
                const textColor = days <= 3 ? "text-red-700" : days <= 5 ? "text-amber-700" : "text-green-700";
                return (
                  <View key={r.id} className="rounded-full border px-2 py-0.5" style={pillStyle}>
                    <Text className={`${TYPO.label} ${textColor}`}>
                      {(r.customer?.name ?? "—").slice(0, 10)} {formatCurrency(r.amount ?? r.notes ?? 0)} · {days === 0 ? "Today" : `${days}d`}
                    </Text>
                  </View>
                );
              })}
              {upcomingReminders.length > 3 && (
                <View className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5">
                  <Text className={TYPO.caption}>+{upcomingReminders.length - 3} more</Text>
                </View>
              )}
              <Text className={`${TYPO.caption} ml-auto`}>View All →</Text>
            </TouchableOpacity>
          )}
            </>
          )}
        </TouchableOpacity>

        {/* 3 — AI Agent Feed (command hints + live feed) */}
        <View className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 mb-4">
          <View className="flex-row items-center gap-3">
            <View className="rounded-full bg-primary/10 p-2">
              <Ionicons name="mic" size={18} color="#e67e22" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className={TYPO.sectionTitle + " text-primary/80"}>{currentSet.category} · Say it naturally</Text>
              <Text className={TYPO.body} key={cmdItemIdx}>&ldquo;{currentCmd}&rdquo;</Text>
            </View>
          </View>
        </View>
        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 12, paddingHorizontal: 4 }}
          style={{ marginHorizontal: -4 }}
        >
          {COMMAND_SETS.map((s, i) => (
            <TouchableOpacity
              key={s.category}
              onPress={() => {
                setCmdSetIdx(i);
                setCmdItemIdx(0);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: i === cmdSetIdx ? "#e67e22" : "#e2e8f0",
                backgroundColor: i === cmdSetIdx ? "#e67e22" : "#fafbfc",
              }}
            >
              <Ionicons name={s.icon} size={14} color={i === cmdSetIdx ? "#fff" : "#64748b"} />
              <Text
                className={`text-xs font-medium ${i === cmdSetIdx ? "text-white" : "text-slate-500"}`}
              >
                {s.category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {feed.length > 0 && (
          <View className="rounded-xl border border-slate-200 bg-card px-4 py-2 mb-4">
            <View className="flex-row items-center gap-2 border-b border-slate-100 pb-2 mb-2">
              <View className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-slate-400"}`} />
              <Text className={TYPO.sectionTitle}>AI Activity Feed</Text>
            </View>
            {feed.slice(0, 5).map((item) => (
              <View key={item.id} className="flex-row items-start gap-2 py-1.5">
                {item.icon.includes("-") ? (
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color="#64748b" />
                ) : (
                  <Text className="text-base">{item.icon}</Text>
                )}
                <View className="flex-1">
                  <Text className={TYPO.body} numberOfLines={1}>{item.text}</Text>
                  {item.subtext && <Text className={TYPO.caption} numberOfLines={1}>{item.subtext}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 4 — Quick Actions (4 per row, collapsible) */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Text className={TYPO.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            onPress={() => setQuickActionsExpanded((e) => !e)}
            activeOpacity={0.7}
            className="flex-row items-center gap-1"
          >
            <Text className="text-xs font-semibold text-primary">
              {quickActionsExpanded ? "Show less" : "Expand all"}
            </Text>
            <Ionicons
              name={quickActionsExpanded ? "chevron-up" : "chevron-down"}
              size={14}
              color="#e67e22"
            />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {(quickActionsExpanded
            ? QUICK_ACTIONS
            : QUICK_ACTIONS.slice(0, QUICK_ACTIONS_PER_ROW * QUICK_ACTIONS_SECTIONS_COLLAPSED)
          ).map((a) => (
            <TouchableOpacity
              key={a.label}
              onPress={() => handleQuickAction(a.route, a.params)}
              activeOpacity={0.85}
              style={{
                width: Math.floor((contentWidth - 24) / QUICK_ACTIONS_PER_ROW),
                minHeight: 64,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                backgroundColor: a.primary ? "#e67e22" : "#fafbfc",
                paddingVertical: 10,
              }}
            >
              <Ionicons name={a.icon} size={20} color={a.primary ? "#fff" : a.color} />
              <Text className={`${TYPO.micro} font-semibold text-center ${a.primary ? "text-white" : "text-slate-600"}`} numberOfLines={1}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 5 — KPI Cards (2x2 grid) */}
        <Text className={`${TYPO.sectionTitle} mb-2`}>Today&apos;s Numbers</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          <PressableCard onPress={() => navigation.navigate("InvoicesTab")} style={{ width: (contentWidth - 8) / 2, flexGrow: 1, minWidth: 0 }} className="shadow-sm">
            <View className="flex-row items-start justify-between">
              <Text className={TYPO.label}>Today&apos;s Sales</Text>
              <View className="rounded-lg bg-primary/10 p-1">
                <Ionicons name="trending-up" size={14} color="#e67e22" />
              </View>
            </View>
            {isLoadingSummary ? <Skeleton className="mt-1.5 h-6 w-20 rounded" /> : (
              <Text className={`${TYPO.value} mt-1`}>{formatCurrency(totalToday)}</Text>
            )}
            <Text className={`${TYPO.caption} text-green-600 mt-0.5`}>{dailySummary?.invoiceCount ?? 0} bills today</Text>
          </PressableCard>
          <PressableCard onPress={() => navigation.navigate("InvoicesTab")} style={{ width: (contentWidth - 8) / 2, flexGrow: 1, minWidth: 0 }} className="shadow-sm">
            <View className="flex-row items-start justify-between">
              <Text className={TYPO.label}>Pending Dues</Text>
              <View className="rounded-lg bg-amber-100 p-1">
                <Ionicons name="calendar" size={14} color="#e6a319" />
              </View>
            </View>
            {isLoadingSummary ? <Skeleton className="mt-1.5 h-6 w-20 rounded" /> : (
              <Text className={`${TYPO.value} mt-1 text-right`}>{formatCurrency(dailySummary?.pendingAmount ?? 0)}</Text>
            )}
            <Text className={`${TYPO.caption} mt-0.5 text-right ${(dailySummary?.pendingAmount ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
              {(dailySummary?.pendingAmount ?? 0) > 0 ? "⚠️ Needs collection" : "✅ All clear"}
            </Text>
          </PressableCard>
          <PressableCard onPress={() => navigation.navigate("MoreTab", { screen: "Reports" })} style={{ width: (contentWidth - 8) / 2, flexGrow: 1, minWidth: 0 }} className="shadow-sm">
            <View className="flex-row items-start justify-between">
              <Text className={TYPO.label}>Collected Today</Text>
              <View className="rounded-lg bg-green-100 p-1">
                <Ionicons name="wallet" size={14} color="#1a9248" />
              </View>
            </View>
            {isLoadingSummary ? <Skeleton className="mt-1.5 h-6 w-20 rounded" /> : (
              <Text className={`${TYPO.value} mt-1 text-right`}>{formatCurrency(dailySummary?.totalPayments ?? 0)}</Text>
            )}
            <Text className={`${TYPO.caption} text-green-600 mt-0.5 text-right`}>
              Cash {formatCurrency(dailySummary?.cashPayments ?? 0)} · UPI {formatCurrency(dailySummary?.upiPayments ?? 0)}
            </Text>
          </PressableCard>
          <PressableCard onPress={() => navigation.navigate("MoreTab", { screen: "Reports" })} style={{ width: (contentWidth - 8) / 2, flexGrow: 1, minWidth: 0 }} className="shadow-sm">
            <View className="flex-row items-start justify-between">
              <Text className={TYPO.label}>Collection Rate</Text>
              <View className="rounded-lg bg-blue-100 p-1">
                <Ionicons name="pulse" size={14} color="#3d7a9e" />
              </View>
            </View>
            {isLoadingSummary ? <Skeleton className="mt-1.5 h-6 w-20 rounded" /> : (
              <Text className={`${TYPO.value} mt-1 text-right`}>{collectionRate}%</Text>
            )}
            <View className={`flex-row items-center justify-end gap-1 mt-0.5`}>
              {collectionRate >= 80 ? (
                <>
                  <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                  <Text className={`${TYPO.caption} text-green-600`}>Excellent</Text>
                </>
              ) : collectionRate >= 50 ? (
                <>
                  <Ionicons name="warning" size={14} color="#d97706" />
                  <Text className={`${TYPO.caption} text-amber-600`}>Below target</Text>
                </>
              ) : (
                <>
                  <Ionicons name="alert-circle" size={14} color="#dc2626" />
                  <Text className={`${TYPO.caption} text-red-600`}>Low</Text>
                </>
              )}
            </View>
          </PressableCard>
        </View>

        {/* 6 — Recent Activity (with LIVE) */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="document-text-outline" size={18} color="#0f172a" />
              <Text className={TYPO.sectionTitle}>Recent Activity</Text>
            </View>
            <View className="flex-row items-center gap-1 rounded-full bg-green-100 px-2 py-0.5">
              <View className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <Text className={`${TYPO.micro} font-semibold text-green-700`}>LIVE</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => void refetchInvoices()} className="flex-row items-center gap-1">
            <View className="flex-row items-center gap-1">
              <Ionicons name="refresh-outline" size={14} color="#64748b" />
              <Text className={TYPO.caption}>{secsAgo < 5 ? "just now" : `${secsAgo}s ago`}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View className="rounded-xl border border-slate-200 bg-card overflow-hidden shadow-sm mb-5">
          {todayInvoices.length === 0 && (
            <View className="py-8 items-center">
              <Text className={TYPO.bodyMuted}>No invoices yet today</Text>
            </View>
          )}
          {todayInvoices.slice(0, 5).map((inv, idx) => {
            const invWithDate = inv as { createdAt?: string };
            const timeStr = invWithDate.createdAt
              ? new Date(invWithDate.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
              : "";
            return (
              <TouchableOpacity
                key={inv.id}
                onPress={() =>
                  navigation.getParent()?.navigate("InvoicesTab" as never, { screen: "InvoiceDetail", params: { id: inv.id } } as never)
                }
                className={`flex-row items-center px-4 py-3 ${idx > 0 ? "border-t border-slate-100" : ""}`}
              >
                <View className="flex-1 min-w-0">
                  <Text className={TYPO.labelBold}>{(inv as { invoiceNo?: string }).invoiceNo ?? inv.id.slice(-6)}</Text>
                  <Text className={`${TYPO.caption} mt-0.5`}>{inv.customer?.name ?? "Walk-in"}</Text>
                </View>
                <View className="items-end shrink-0" style={{ marginLeft: 8 }}>
                  <Text className={`${TYPO.value} text-primary`}>₹{inr(inv.total)}</Text>
                  {timeStr ? <Text className={`${TYPO.micro} text-slate-500 mt-0.5`}>{timeStr}</Text> : null}
                  <View className={`mt-1 px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-green-100" : "bg-amber-100"}`}>
                    <Text className={`${TYPO.micro} font-semibold text-center ${inv.status === "paid" ? "text-green-700" : "text-amber-700"}`}>
                      {inv.status === "paid" ? "✅ Paid" : (inv as { status?: string }).status === "cancelled" ? "❌ Void" : "⏳ Due"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 7 — Low Stock */}
        {!loadingLowStock && lowStock.length > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate("MoreTab", { screen: "Items" })}
            activeOpacity={0.9}
            className="flex-row flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 mb-5"
          >
            <Text className={TYPO.labelBold + " text-amber-700"}>
              {lowStock.filter((p) => p.stock === 0).length > 0 ? "🔴" : "⚠️"} Stock Alert ({lowStock.length}):
            </Text>
            {lowStock.slice(0, 5).map((p) => (
              <View
                key={p.id}
                className={`rounded-full border px-2 py-0.5 ${p.stock === 0 ? "border-red-300 bg-red-100" : "border-amber-300 bg-amber-100"}`}
              >
                <Text className={`${TYPO.label} ${p.stock === 0 ? "text-red-700" : "text-amber-700"}`}>
                  {p.name} {p.stock}{p.unit ?? ""}
                </Text>
              </View>
            ))}
            {lowStock.length > 5 && (
              <View className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5">
                <Text className={TYPO.caption}>+{lowStock.length - 5} more</Text>
              </View>
            )}
            <Text className={`${TYPO.caption} ml-auto`}>Manage Inventory →</Text>
          </TouchableOpacity>
        )}

        {/* 8 — Expiry Alert */}
        {batches.length > 0 && (
          <View className="flex-row flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5">
            <Text className={TYPO.labelBold + " text-amber-700"}>
              {batches.filter((b) => daysUntil(b.expiryDate) <= 0).length > 0 ? "🔴" : "⚠️"} Expiry Alert ({batches.length}):
            </Text>
            {batches.slice(0, 6).map((batch) => {
              const days = daysUntil(batch.expiryDate);
              const pillClass = days <= 0 ? "border-red-300 bg-red-100" : days <= 7 ? "border-red-200 bg-red-50" : "border-amber-300 bg-amber-100";
              return (
                <TouchableOpacity
                  key={batch.id}
                  onPress={() => setExpirySelected(batch)}
                  className={`rounded-full border px-2 py-0.5 ${pillClass}`}
                >
                  <Text className={`${TYPO.label} ${days <= 7 ? "text-red-700" : "text-amber-700"}`}>
                    {batch.product.name.length > 14 ? batch.product.name.slice(0, 13) + "…" : batch.product.name}{" "}
                    <Text className="opacity-70">{daysLabel(days)}</Text>
                  </Text>
                </TouchableOpacity>
              );
            })}
            {batches.length > 6 && (
              <TouchableOpacity
                onPress={() => navigation.navigate("MoreTab", { screen: "Expiry" })}
                className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5"
              >
                <Text className={TYPO.caption}>+{batches.length - 6} more</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate("MoreTab", { screen: "Expiry" })}
              className="ml-auto"
            >
              <Text className={TYPO.caption}>View All →</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>
      </ScrollView>

      {/* Expiry detail modal */}
      <Modal visible={!!expirySelected} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/50 justify-center p-4" onPress={() => setExpirySelected(null)}>
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-4">
            {expirySelected && (
              <>
                <View className="flex-row items-center gap-2 mb-3">
                  <Ionicons name="warning" size={20} color="#dc2626" />
                  <Text className={TYPO.value}>Expiry Stock Alert</Text>
                </View>
                <View className={`rounded-lg p-3 mb-3 ${daysUntil(expirySelected.expiryDate) <= 7 ? "bg-red-50" : "bg-amber-50"}`}>
                  <Text className={`${TYPO.body} font-bold text-center ${daysUntil(expirySelected.expiryDate) <= 7 ? "text-red-700" : "text-amber-700"}`}>
                    {daysUntil(expirySelected.expiryDate) <= 0
                      ? "❌ This batch has EXPIRED"
                      : `⚠️ Expiring in ${daysUntil(expirySelected.expiryDate)} day${daysUntil(expirySelected.expiryDate) === 1 ? "" : "s"}!`}
                  </Text>
                </View>
                <View className="gap-2 mb-3">
                  <View className="flex-row justify-between py-2 border-b border-slate-100">
                    <Text className={TYPO.label}>Product</Text>
                    <Text className={TYPO.labelBold}>{expirySelected.product.name}</Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-b border-slate-100">
                    <Text className={TYPO.label}>Quantity</Text>
                    <Text className={TYPO.labelBold}>{expirySelected.quantity} {expirySelected.product.unit}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className={TYPO.label}>Expiry Date</Text>
                    <Text className={TYPO.labelBold}>
                      {new Date(expirySelected.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </Text>
                  </View>
                </View>
                <Text className={`${TYPO.caption} text-center mb-3`}>
                  Go to <Text className="font-semibold">Expiry Tracker</Text> to write off or manage this batch.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setExpirySelected(null);
                    navigation.navigate("MoreTab", { screen: "Expiry" });
                  }}
                  className="bg-primary rounded-xl py-3 items-center"
                >
                  <Text className={`${TYPO.labelBold} text-white`}>Open Expiry Tracker</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
