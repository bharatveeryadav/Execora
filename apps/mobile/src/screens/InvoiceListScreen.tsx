/**
 * InvoiceListScreen — Bills page with full web parity.
 * Doc types: Sales | Purchase | Quotation
 * Status filters, date filter, search, summary, quick links, menu.
 */
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { invoiceApi, purchaseApi } from "../lib/api";
import { inr, type Invoice } from "@execora/shared";
import { useWsInvalidation } from "../hooks/useWsInvalidation";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorCard } from "../components/ui/ErrorCard";
import { TYPO } from "../lib/typography";
import type { InvoicesStackParams } from "../navigation";

type DocTypeTab = "sales" | "purchase" | "quotation";
type DateFilter =
  | "all"
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month"
  | "custom";
type StatusTab = "All" | "Draft" | "Pending" | "Partial" | "Paid" | "Cancelled" | "Proforma";

const DATE_FILTERS: DateFilter[] = [
  "all",
  "today",
  "yesterday",
  "this_week",
  "this_month",
  "last_month",
  "custom",
];

const DATE_LABELS: Record<DateFilter, string> = {
  all: "All dates",
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  this_month: "This month",
  last_month: "Last month",
  custom: "Custom",
};

const STATUS_TABS: StatusTab[] = ["All", "Draft", "Pending", "Partial", "Paid", "Cancelled", "Proforma"];

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  partial: "bg-amber-100 text-amber-700",
  draft: "bg-slate-100 text-slate-500",
  proforma: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

function getDateRange(filter: DateFilter): { from: Date; to: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  if (filter === "all") return null;

  let from: Date;
  let to: Date = toEnd(now);

  switch (filter) {
    case "today":
      from = today;
      break;
    case "yesterday":
      from = new Date(today);
      from.setDate(from.getDate() - 1);
      to = toEnd(from);
      break;
    case "this_week":
      from = new Date(today);
      from.setDate(from.getDate() - from.getDay());
      break;
    case "this_month":
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case "last_month":
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      break;
    default:
      return null;
  }
  return { from, to };
}

function isInRange(d: string | Date, range: { from: Date; to: Date } | null): boolean {
  if (!range) return true;
  const invDate = new Date(d);
  invDate.setHours(0, 0, 0, 0);
  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);
  const to = new Date(range.to);
  to.setHours(23, 59, 59, 999);
  return invDate >= from && invDate <= to;
}

function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().replace(/\s+/g, "");
  const t = target.toLowerCase().replace(/\s+/g, "");
  if (t.includes(q)) return true;
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function formatDate(d: string | Date | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

type Props = NativeStackScreenProps<InvoicesStackParams, "InvoiceList">;

export function InvoiceListScreen({ navigation }: Props) {
  const [docTypeTab, setDocTypeTab] = useState<DocTypeTab>("sales");
  const [statusTab, setStatusTab] = useState<StatusTab>("All");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  useWsInvalidation(["invoices", "summary", "purchases"]);

  const { data: invData, isFetching, isError, refetch } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => invoiceApi.list(1, 500),
    staleTime: 30_000,
  });

  const { data: purchaseData, isFetching: purchasesLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => purchaseApi.list({}),
    staleTime: 30_000,
    enabled: docTypeTab === "purchase",
  });

  const allInvoices: Invoice[] = invData?.invoices ?? [];
  const purchases = purchaseData?.purchases ?? [];

  const invoicesByDocType = useMemo(() => {
    if (docTypeTab === "sales")
      return allInvoices.filter((inv: any) => inv.status !== "proforma");
    if (docTypeTab === "quotation")
      return allInvoices.filter((inv: any) => inv.status === "proforma");
    return [];
  }, [allInvoices, docTypeTab]);

  const dateRange = useMemo(() => getDateRange(dateFilter), [dateFilter]);

  const invoicesByDate = useMemo(
    () =>
      invoicesByDocType.filter((inv) =>
        isInRange((inv as any).invoiceDate ?? inv.createdAt, dateRange)
      ),
    [invoicesByDocType, dateRange]
  );

  const filteredInvoices = useMemo(() => {
    return invoicesByDate.filter((inv: any) => {
      const matchStatus =
        statusTab === "All" ||
        inv.status?.toLowerCase() === statusTab.toLowerCase();
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        fuzzyMatch(q, inv.invoiceNo ?? "") ||
        fuzzyMatch(q, inv.customer?.name ?? "");
      return matchStatus && matchSearch;
    });
  }, [invoicesByDate, statusTab, search]);

  const filteredPurchases = useMemo(() => {
    if (docTypeTab !== "purchase") return [];
    if (!search.trim()) return purchases;
    const q = search.toLowerCase();
    return purchases.filter(
      (p: any) =>
        (p.itemName ?? "").toLowerCase().includes(q) ||
        (p.vendor ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q)
    );
  }, [purchases, search, docTypeTab]);

  const counts = useMemo(
    () =>
      invoicesByDate.reduce<Record<string, number>>((acc, inv) => {
        const s = (inv as any).status ?? "draft";
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {}),
    [invoicesByDate]
  );

  const totalValue = filteredInvoices.reduce(
    (s, inv) => s + parseFloat(String(inv.total ?? 0)),
    0
  );
  const pendingAmount = filteredInvoices.reduce((s, inv) => {
    if ((inv as any).status === "paid" || (inv as any).status === "cancelled")
      return s;
    const total = parseFloat(String(inv.total ?? 0));
    const paid = parseFloat(String((inv as any).paidAmount ?? 0));
    return s + (total - paid);
  }, 0);
  const purchasesTotal = filteredPurchases.reduce(
    (s, p) => s + (parseFloat(String(p.amount)) || 0),
    0
  );

  const docTypeCounts = {
    sales: allInvoices.filter((i: any) => i.status !== "proforma").filter((i: any) => isInRange(i.invoiceDate ?? i.createdAt, dateRange)).length,
    purchase: purchases.length,
    quotation: allInvoices.filter((i: any) => i.status === "proforma").filter((i: any) => isInRange(i.invoiceDate ?? i.createdAt, dateRange)).length,
  };

  const showInvoiceList = docTypeTab === "sales" || docTypeTab === "quotation";

  function getTabNav() {
    try {
      return (navigation.getParent as any)?.();
    } catch {
      return undefined;
    }
  }

  function handleNewInvoice() {
    if (docTypeTab === "purchase") {
      getTabNav()?.navigate("MoreTab", { screen: "Purchases" });
    } else {
      getTabNav()?.navigate("Billing");
    }
  }

  const placeholder =
    docTypeTab === "purchase"
      ? "Search by item, supplier, category…"
      : docTypeTab === "quotation"
        ? "Search by estimate # or customer…"
        : "Search by invoice # or customer…";

  // ── Render invoice row ─────────────────────────────────────────────────────

  const renderInvoiceRow = ({ item: inv }: { item: Invoice }) => {
    const invAny = inv as any;
    const status = invAny.status ?? "draft";
    const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600";
    const amtColor =
      status === "paid"
        ? "text-green-600"
        : status === "cancelled"
          ? "text-slate-400 line-through"
          : "text-slate-800";
    const icon =
      status === "paid" ? "✅" : status === "cancelled" ? "❌" : "📄";

    return (
      <Pressable
        onPress={() => navigation.navigate("InvoiceDetail", { id: inv.id })}
        className="flex-row items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white"
        style={({ pressed }) => ({ backgroundColor: pressed ? "#f8fafc" : "#fff" })}
      >
        <View className="w-10 h-10 rounded-lg bg-slate-100 items-center justify-center">
          <Text className="text-base">{icon}</Text>
        </View>
        <View className="flex-1 min-w-0">
          <Text className={TYPO.labelBold} numberOfLines={1}>
            {invAny.invoiceNo ?? inv.id.slice(-8).toUpperCase()}
          </Text>
          <Text className={TYPO.caption} numberOfLines={1}>
            {invAny.customer?.name ?? "Walk-in"} · {formatDate(inv.createdAt)}
          </Text>
        </View>
        <View className={`rounded-full px-2 py-0.5 ${style}`}>
          <Text className="text-[10px] font-semibold capitalize">{status}</Text>
        </View>
        <Text className={`text-sm font-bold tabular-nums ${amtColor}`}>
          ₹{inr(inv.total)}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
      </Pressable>
    );
  };

  // ── Render purchase row ────────────────────────────────────────────────────

  const renderPurchaseRow = ({ item: p }: { item: any }) => (
    <Pressable
      onPress={() => getTabNav()?.navigate("MoreTab", { screen: "Purchases" })}
      className="flex-row items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white"
      style={({ pressed }) => ({ backgroundColor: pressed ? "#f8fafc" : "#fff" })}
    >
      <View className="w-10 h-10 rounded-lg bg-slate-100 items-center justify-center">
        <Text className="text-base">📦</Text>
      </View>
      <View className="flex-1 min-w-0">
        <Text className={TYPO.labelBold} numberOfLines={1}>
          {p.itemName ?? p.category}
        </Text>
        <Text className={TYPO.caption} numberOfLines={1}>
          {p.vendor ?? "—"} · {formatDate(p.date ?? p.createdAt ?? "")}
        </Text>
      </View>
      <Text className="text-sm font-bold text-red-600">₹{inr(parseFloat(String(p.amount)))}</Text>
      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="px-4 pt-4 pb-3 border-b border-slate-200/80 bg-white">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1">
            <Text className={TYPO.pageTitle}>Bills</Text>
            <Text className={TYPO.caption}>
              {docTypeTab === "purchase"
                ? `${filteredPurchases.length} shown · ₹${inr(purchasesTotal)} total`
                : `${filteredInvoices.length} shown · ₹${inr(totalValue)} total`}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => navigation.navigate("BillsMenu")}
              className="w-11 h-11 rounded-full bg-slate-100 items-center justify-center"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#475569" />
            </Pressable>
          </View>
        </View>

        {/* Doc type tabs */}
        <View className="flex-row rounded-2xl bg-slate-100 p-1">
          {[
            { id: "sales" as DocTypeTab, label: "Sales", icon: "add" },
            { id: "purchase" as DocTypeTab, label: "Purchase", icon: "cube" },
            { id: "quotation" as DocTypeTab, label: "Quotation", icon: "document-text" },
          ].map(({ id, label, icon }) => (
            <Pressable
              key={id}
              onPress={() => setDocTypeTab(id)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl min-h-[44] ${docTypeTab === id ? "bg-white shadow-sm" : ""}`}
              style={({ pressed }) => ({ opacity: pressed && docTypeTab !== id ? 0.7 : 1 })}
            >
              <Ionicons
                name={icon as any}
                size={18}
                color={docTypeTab === id ? "#0f172a" : "#64748b"}
              />
              <Text className={`text-xs font-semibold ${docTypeTab === id ? "text-slate-800" : "text-slate-500"}`}>
                {label}
              </Text>
              {docTypeCounts[id] > 0 && (
                <View className="rounded-full bg-slate-200 px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold text-slate-600">{docTypeCounts[id]}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Status tabs — Sales / Quotation only */}
        {showInvoiceList && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3 -mx-1"
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            <View className="flex-row gap-2">
            {STATUS_TABS.map((tab) => {
              const key = tab.toLowerCase();
              const count = tab === "All" ? invoicesByDate.length : (counts[key] ?? 0);
              return (
                <Pressable
                  key={tab}
                  onPress={() => setStatusTab(tab)}
                  className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${statusTab === tab ? "bg-primary" : "bg-slate-100"}`}
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <Text className={`text-xs font-medium ${statusTab === tab ? "text-white" : "text-slate-600"}`}>
                    {tab}
                  </Text>
                  {count > 0 && (
                    <View className={`rounded-full px-1.5 py-0.5 ${statusTab === tab ? "bg-white/20" : "bg-slate-200"}`}>
                      <Text className={`text-[10px] font-bold ${statusTab === tab ? "text-white" : "text-slate-600"}`}>
                        {count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Search + Date filter */}
      <View className="px-4 py-3 bg-white border-b border-slate-100">
        <View className="flex-row items-center rounded-2xl bg-slate-100 px-4 min-h-[48]">
          <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 12 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            className="flex-1 text-base text-slate-800 py-0"
          />
        </View>
        {showInvoiceList && !search.trim() && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-2 flex-row gap-2"
          >
            {DATE_FILTERS.filter((f) => f !== "custom").map((f) => (
              <Pressable
                key={f}
                onPress={() => setDateFilter(f)}
                className={`px-3 py-1.5 rounded-lg ${dateFilter === f ? "bg-primary" : "bg-slate-100"}`}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <Text className={`text-xs font-medium ${dateFilter === f ? "text-white" : "text-slate-600"}`}>
                  {DATE_LABELS[f]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Total & Pending summary */}
      {showInvoiceList && filteredInvoices.length > 0 && (
        <View className="mx-4 mt-3 flex-row rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <View className="flex-1">
            <Text className={TYPO.sectionTitle}>Total</Text>
            <Text className="text-base font-bold text-slate-800">₹{inr(totalValue)}</Text>
          </View>
          <View className="flex-1 border-l border-slate-200 pl-4">
            <Text className={TYPO.sectionTitle}>Pending</Text>
            <Text className="text-base font-bold text-amber-600">₹{inr(pendingAmount)}</Text>
          </View>
        </View>
      )}

      {/* Quick links — navigate to full screens within Bills stack */}
      {showInvoiceList && (
        <View className="mx-4 mt-3 flex-row flex-wrap gap-2">
          <Pressable
            onPress={() => navigation.navigate("Reports")}
            className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 min-h-[40] bg-white"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="bar-chart" size={16} color="#64748b" />
            <Text className="text-xs font-medium text-slate-700">Reports</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("Reports")}
            className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 min-h-[40] bg-white"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="trending-up" size={16} color="#64748b" />
            <Text className="text-xs font-medium text-slate-700">Analytics</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("ComingSoon", { title: "Aging Report" })}
            className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 min-h-[40] bg-white"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="time" size={16} color="#64748b" />
            <Text className="text-xs font-medium text-slate-700">Aging</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("Overdue")}
            className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 min-h-[40] bg-white"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="alert-circle" size={16} color="#64748b" />
            <Text className="text-xs font-medium text-slate-700">Overdue</Text>
          </Pressable>
        </View>
      )}

      {/* List */}
      <View className="flex-1 mx-4 mt-3">
        {docTypeTab === "purchase" ? (
          purchasesLoading ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color="#e67e22" />
            </View>
          ) : filteredPurchases.length === 0 ? (
            <View className="rounded-2xl border border-slate-200/80 bg-white py-16">
              <EmptyState
                icon="📦"
                title={search ? "No purchases match" : "No purchases yet"}
                description={search ? "Try a different search" : "Add your first purchase"}
                actionLabel={!search ? "Add Purchase" : undefined}
                onAction={!search ? () => getTabNav()?.navigate("MoreTab", { screen: "Purchases" }) : undefined}
              />
            </View>
          ) : (
            <View className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
              <FlatList
                data={filteredPurchases}
                keyExtractor={(p) => p.id}
                renderItem={renderPurchaseRow}
                ListFooterComponent={<View className="h-4" />}
              />
            </View>
          )
        ) : (
          isError ? (
            <View className="rounded-2xl border border-slate-200/80 bg-white py-8 px-4">
              <ErrorCard message="Failed to load invoices" onRetry={() => refetch()} />
            </View>
          ) : filteredInvoices.length === 0 ? (
            <View className="rounded-2xl border border-slate-200/80 bg-white py-16">
              <EmptyState
                icon="🧾"
                title={
                  search || statusTab !== "All"
                    ? `No ${docTypeTab === "quotation" ? "quotations" : "invoices"} match`
                    : docTypeTab === "quotation"
                      ? "No quotations yet"
                      : "No invoices yet"
                }
                description="Create your first invoice to get started"
                actionLabel={statusTab === "All" && !search ? (docTypeTab === "quotation" ? "Create Quotation" : "Create Invoice") : undefined}
                onAction={statusTab === "All" && !search ? handleNewInvoice : undefined}
              />
            </View>
          ) : (
            <View className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
              <FlatList
                data={filteredInvoices}
                keyExtractor={(inv) => inv.id}
                renderItem={renderInvoiceRow}
                refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#e67e22" />}
                ListFooterComponent={<View className="h-24" />}
              />
            </View>
          )
        )}
      </View>

      {/* FAB */}
      <Pressable
        onPress={handleNewInvoice}
        className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

    </SafeAreaView>
  );
}
