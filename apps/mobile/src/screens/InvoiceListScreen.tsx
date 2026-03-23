/**
 * InvoiceListScreen — Bills page, matches web app (Invoices.tsx) filter structure.
 */
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Pressable,
  TouchableOpacity,
  InteractionManager,
  Modal,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { invoiceApi, purchaseApi } from "../lib/api";
import { inr, type Invoice } from "@execora/shared";
import { useWsInvalidation } from "../hooks/useWsInvalidation";
import { useResponsive } from "../hooks/useResponsive";
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
  | "this_year"
  | "last_year"
  | "last_quarter"
  | "custom";
type StatusTab =
  | "All"
  | "Draft"
  | "Pending"
  | "Partial"
  | "Paid"
  | "Cancelled"
  | "Proforma";

// Web: DATE_FILTERS, DATE_FILTER_LABELS
const DATE_FILTERS: DateFilter[] = [
  "all",
  "today",
  "yesterday",
  "this_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
  "last_quarter",
  "custom",
];

const DATE_LABELS: Record<DateFilter, string> = {
  all: "All dates",
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  this_month: "This month",
  last_month: "Last month",
  this_year: "This year",
  last_year: "Last year",
  last_quarter: "Last quarter",
  custom: "Custom",
};

// Web: STATUS_TABS
const STATUS_TABS: StatusTab[] = [
  "All",
  "Draft",
  "Pending",
  "Partial",
  "Paid",
  "Cancelled",
  "Proforma",
];

const MIN_TOUCH = 44;
const ROW_HEIGHT = MIN_TOUCH + 8; // 52 — matches renderInvoiceRow/renderPurchaseRow minHeight

const STATUS_STYLES: Record<
  string,
  { bgColor: string; iconColor: string; textColor: string }
> = {
  paid: { bgColor: "#dcfce7", iconColor: "#16a34a", textColor: "#15803d" },
  pending: { bgColor: "#fef3c7", iconColor: "#d97706", textColor: "#b45309" },
  partial: { bgColor: "#fef3c7", iconColor: "#d97706", textColor: "#b45309" },
  draft: { bgColor: "#f1f5f9", iconColor: "#64748b", textColor: "#64748b" },
  proforma: { bgColor: "#dbeafe", iconColor: "#2563eb", textColor: "#1d4ed8" },
  cancelled: { bgColor: "#fee2e2", iconColor: "#94a3b8", textColor: "#94a3b8" },
};

// Web: getDateRange
function getDateRange(
  filter: DateFilter,
  customFrom?: Date,
  customTo?: Date,
): { from: Date; to: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toEnd = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  if (filter === "all") return null;
  if (filter === "custom" && customFrom && customTo) {
    return { from: customFrom, to: toEnd(customTo) };
  }

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
    case "this_year":
      from = new Date(today.getFullYear(), 0, 1);
      break;
    case "last_year":
      from = new Date(today.getFullYear() - 1, 0, 1);
      to = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    case "last_quarter": {
      const q = Math.floor(now.getMonth() / 3) + 1;
      const prevQ = q === 1 ? 4 : q - 1;
      const prevYear = q === 1 ? now.getFullYear() - 1 : now.getFullYear();
      from = new Date(prevYear, (prevQ - 1) * 3, 1);
      to = new Date(prevYear, prevQ * 3, 0, 23, 59, 59, 999);
      break;
    }
    default:
      return null;
  }
  return { from, to };
}

function isInRange(
  d: string | Date,
  range: { from: Date; to: Date } | null,
): boolean {
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
  const insets = useSafeAreaInsets();
  const { contentPad, contentWidth, isSmall } = useResponsive();
  const compactHeader = contentWidth < 380;
  const stackTotals = contentWidth < 360;
  const stackSearchControls = contentWidth < 380;
  const quickLinkColumns = contentWidth < 360 ? 2 : 4;
  const quickLinkTileWidth = Math.floor(
    (contentWidth - (quickLinkColumns - 1) * 6) / quickLinkColumns,
  );
  const [docTypeTab, setDocTypeTab] = useState<DocTypeTab>("sales");
  const [statusTab, setStatusTab] = useState<StatusTab>("All");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [dateFilterModalOpen, setDateFilterModalOpen] = useState(false);
  const [customDateModalOpen, setCustomDateModalOpen] = useState(false);
  const [customFromTemp, setCustomFromTemp] = useState<Date>(() => new Date());
  const [customToTemp, setCustomToTemp] = useState<Date>(() => new Date());
  const [customPickerMode, setCustomPickerMode] = useState<
    "from" | "to" | null
  >(null);

  useWsInvalidation(["invoices", "summary", "purchases"]);

  const {
    data: invData,
    isFetching,
    isError,
    refetch,
  } = useQuery({
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

  const dateRange = useMemo(
    () => getDateRange(dateFilter, customFrom, customTo),
    [dateFilter, customFrom, customTo],
  );

  const invoicesByDate = useMemo(
    () =>
      invoicesByDocType.filter((inv) =>
        isInRange((inv as any).invoiceDate ?? inv.createdAt, dateRange),
      ),
    [invoicesByDocType, dateRange],
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
        (p.category ?? "").toLowerCase().includes(q),
    );
  }, [purchases, search, docTypeTab]);

  const counts = useMemo(
    () =>
      invoicesByDate.reduce<Record<string, number>>((acc, inv) => {
        const s = (inv as any).status ?? "draft";
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {}),
    [invoicesByDate],
  );

  const totalValue = useMemo(
    () =>
      filteredInvoices.reduce(
        (s, inv) => s + parseFloat(String(inv.total ?? 0)),
        0,
      ),
    [filteredInvoices],
  );
  const pendingAmount = useMemo(
    () =>
      filteredInvoices.reduce((s, inv) => {
        if (
          (inv as any).status === "paid" ||
          (inv as any).status === "cancelled"
        )
          return s;
        const total = parseFloat(String(inv.total ?? 0));
        const paid = parseFloat(String((inv as any).paidAmount ?? 0));
        return s + (total - paid);
      }, 0),
    [filteredInvoices],
  );
  const purchasesTotal = useMemo(
    () =>
      filteredPurchases.reduce(
        (s, p) => s + (parseFloat(String(p.amount)) || 0),
        0,
      ),
    [filteredPurchases],
  );

  const docTypeCounts = {
    sales: allInvoices
      .filter((i: any) => i.status !== "proforma")
      .filter((i: any) => isInRange(i.invoiceDate ?? i.createdAt, dateRange))
      .length,
    purchase: purchases.length,
    quotation: allInvoices
      .filter((i: any) => i.status === "proforma")
      .filter((i: any) => isInRange(i.invoiceDate ?? i.createdAt, dateRange))
      .length,
  };

  const showInvoiceList = docTypeTab === "sales" || docTypeTab === "quotation";

  const handleNewInvoice = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      try {
        const tabNav = (navigation.getParent as any)?.();
        if (docTypeTab === "purchase") {
          tabNav?.navigate("MoreTab", { screen: "Purchases" });
        } else {
          tabNav?.navigate("MoreTab", {
            screen: "Billing",
            params: { screen: "BillingForm" },
          });
        }
      } catch (_) {}
    });
  }, [docTypeTab, navigation]);

  const handleBillsMenu = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      navigation?.navigate?.("BillsMenu");
    });
  }, [navigation]);

  const handleDateSelect = useCallback(
    (f: DateFilter) => {
      if (f === "custom") {
        setCustomFromTemp(customFrom ?? new Date());
        setCustomToTemp(customTo ?? new Date());
        setDateFilterModalOpen(false);
        setCustomDateModalOpen(true);
      } else {
        setDateFilter(f);
        setDateFilterModalOpen(false);
      }
    },
    [customFrom, customTo],
  );

  const applyCustomDate = useCallback(() => {
    setCustomFrom(customFromTemp);
    setCustomTo(customToTemp);
    setDateFilter("custom");
    setCustomDateModalOpen(false);
  }, [customFromTemp, customToTemp]);

  const placeholder =
    docTypeTab === "purchase"
      ? "Search by item, supplier, category…"
      : docTypeTab === "quotation"
        ? "Search by estimate # or customer…"
        : "Search by invoice # or customer…";

  const dateFilterLabel =
    dateFilter === "custom" && customFrom && customTo
      ? `${customFrom.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}–${customTo.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`
      : DATE_LABELS[dateFilter];

  const renderInvoiceRow = useCallback(
    ({ item: inv }: { item: Invoice }) => {
      const invAny = inv as any;
      const status = invAny.status ?? "draft";
      const s = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
      const amtColor =
        status === "paid"
          ? "#16a34a"
          : status === "cancelled"
            ? "#94a3b8"
            : "#0f172a";

      return (
        <Pressable
          onPress={() => {
            InteractionManager.runAfterInteractions(() => {
              navigation?.navigate?.("InvoiceDetail", { id: inv.id });
            });
          }}
          className="flex-row items-center gap-2 px-4 py-3.5 border-b border-slate-100 bg-white min-w-0"
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#f8fafc" : "#fff",
            minHeight: MIN_TOUCH + 8,
          })}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: s.bgColor,
            }}
          >
            <Ionicons
              name={
                status === "paid"
                  ? "checkmark-circle"
                  : status === "cancelled"
                    ? "close-circle"
                    : "document-outline"
              }
              size={18}
              color={s.iconColor}
            />
          </View>
          <View className="flex-1 min-w-0 shrink">
            <Text
              className={`${TYPO.labelBold} min-w-0`}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {invAny.invoiceNo ?? inv.id.slice(-8).toUpperCase()}
            </Text>
            <Text
              className={`${TYPO.caption} min-w-0`}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {invAny.customer?.name ?? "Unknown"} · {formatDate(inv.createdAt)}
            </Text>
          </View>
          <View
            style={{
              borderRadius: 9999,
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: s.bgColor,
              flexShrink: 0,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: s.textColor,
                textTransform: "capitalize",
              }}
              numberOfLines={1}
            >
              {status}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: amtColor,
              textDecorationLine:
                status === "cancelled" ? "line-through" : undefined,
              flexShrink: 0,
            }}
            numberOfLines={1}
          >
            ₹{inr(inv.total)}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color="#94a3b8"
            style={{ flexShrink: 0 }}
          />
        </Pressable>
      );
    },
    [navigation],
  );

  const renderPurchaseRow = useCallback(
    ({ item: p }: { item: any }) => (
      <Pressable
        onPress={() => {
          InteractionManager.runAfterInteractions(() => {
            try {
              (navigation.getParent as any)?.()?.navigate("MoreTab", {
                screen: "Purchases",
              });
            } catch (_) {}
          });
        }}
        className="flex-row items-center gap-2 px-4 py-3.5 border-b border-slate-100 bg-white min-w-0"
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#f8fafc" : "#fff",
          minHeight: MIN_TOUCH + 8,
        })}
      >
        <View className="w-10 h-10 rounded-xl bg-amber-100 items-center justify-center shrink-0">
          <Ionicons name="cube-outline" size={18} color="#d97706" />
        </View>
        <View className="flex-1 min-w-0 shrink">
          <Text
            className={TYPO.labelBold}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {p.itemName ?? p.category}
          </Text>
          <Text className={TYPO.caption} numberOfLines={1} ellipsizeMode="tail">
            {p.vendor ?? "—"} · {formatDate(p.date ?? p.createdAt ?? "")}
          </Text>
        </View>
        <Text
          className="text-sm font-bold text-red-600 shrink-0"
          numberOfLines={1}
        >
          ₹{inr(parseFloat(String(p.amount)))}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
      </Pressable>
    ),
    [navigation],
  );

  const navToReports = useCallback(() => {
    InteractionManager.runAfterInteractions(() =>
      navigation?.navigate?.("Reports"),
    );
  }, [navigation]);
  const navToComingSoon = useCallback(
    (title: string) => () => {
      InteractionManager.runAfterInteractions(() =>
        navigation?.navigate?.("ComingSoon", { title }),
      );
    },
    [navigation],
  );
  const navToOverdue = useCallback(() => {
    InteractionManager.runAfterInteractions(() =>
      navigation?.navigate?.("Overdue"),
    );
  }, [navigation]);

  const QUICK_LINK_ITEMS = [
    {
      id: "reports",
      icon: "bar-chart" as const,
      label: "Reports",
      onPress: navToReports,
    },
    {
      id: "analytics",
      icon: "trending-up" as const,
      label: "Analytics",
      onPress: navToReports,
    },
    {
      id: "aging",
      icon: "time" as const,
      label: "Aging",
      onPress: navToComingSoon("Aging Report"),
    },
    {
      id: "overdue",
      icon: "alert-circle" as const,
      label: "Overdue",
      onPress: navToOverdue,
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <View style={{ flex: 1, width: "100%", alignItems: "center" }}>
        <View style={{ width: "100%", maxWidth: contentWidth, flex: 1 }}>
          {/* Header — matches web */}
          <View
            style={{
              paddingHorizontal: contentPad,
              paddingTop: 12,
              paddingBottom: 16,
            }}
            className="border-b border-slate-200/80 bg-white"
          >
            {/* Doc type tabs — web: Sales | Purchase | Quotation */}
            <View className="flex-row items-center min-w-0">
              {[
                { id: "sales" as DocTypeTab, label: "Sales" },
                { id: "purchase" as DocTypeTab, label: "Purchase" },
                { id: "quotation" as DocTypeTab, label: "Quote" },
              ].map(({ id, label }) => (
                <Pressable
                  key={id}
                  onPress={() => requestAnimationFrame(() => setDocTypeTab(id))}
                  style={({ pressed }) => ({
                    opacity: pressed && docTypeTab !== id ? 0.7 : 1,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    marginRight: 4,
                    borderRadius: 8,
                    backgroundColor: docTypeTab === id ? "#fff" : "transparent",
                    borderWidth: docTypeTab === id ? 1 : 0,
                    borderColor: "#e2e8f0",
                    ...(docTypeTab === id && {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.06,
                      shadowRadius: 2,
                      elevation: 1,
                    }),
                  })}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: docTypeTab === id ? "600" : "500",
                      color: docTypeTab === id ? "#0f172a" : "#94a3b8",
                    }}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={handleBillsMenu}
                style={({ pressed }) => ({
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: pressed ? "#e2e8f0" : "#f1f5f9",
                })}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={18}
                  color="#475569"
                />
              </Pressable>
            </View>

            {/* Status tabs — web: underline style, only for Sales/Quotation */}
            {showInvoiceList && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-0 -mx-1"
                contentContainerStyle={{ paddingHorizontal: 4, flexGrow: 0 }}
              >
                <View
                  className="flex-row border-t border-slate-200"
                  style={{ flexShrink: 0 }}
                >
                  {STATUS_TABS.map((tab) => {
                    const key = tab.toLowerCase();
                    const count =
                      tab === "All"
                        ? invoicesByDate.length
                        : (counts[key] ?? 0);
                    const active = statusTab === tab;
                    return (
                      <Pressable
                        key={tab}
                        onPress={() =>
                          requestAnimationFrame(() => setStatusTab(tab))
                        }
                        className="flex-row items-center gap-1.5 px-3 py-2 border-b-2"
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.8 : 1,
                          borderBottomColor: active ? "#e67e22" : "transparent",
                        })}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "500",
                            color: active ? "#e67e22" : "#64748b",
                          }}
                        >
                          {tab}
                        </Text>
                        {count > 0 && (
                          <View
                            style={{
                              borderRadius: 9999,
                              paddingHorizontal: 5,
                              paddingVertical: 1,
                              backgroundColor: "#e2e8f0",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "600",
                                color: "#475569",
                              }}
                            >
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

            {/* Compact controls container: search/date + totals */}
            <View className="mt-3 rounded-lg border border-slate-200 bg-slate-50/50 p-2 min-w-0">
              <View
                className="rounded-lg border border-slate-200 bg-white min-w-0"
                style={{
                  flexDirection: stackSearchControls ? "column" : "row",
                  alignItems: stackSearchControls ? undefined : "center",
                }}
              >
                <View className="flex-1 flex-row items-center rounded-lg px-3 min-h-[38] min-w-0">
                  <Ionicons
                    name="search"
                    size={16}
                    color="#64748b"
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder={placeholder}
                    placeholderTextColor="#94a3b8"
                    className="flex-1 min-w-0 text-sm text-slate-800 py-2"
                  />
                </View>
                {showInvoiceList && !search.trim() && !stackSearchControls && (
                  <Pressable
                    onPress={() => setDateFilterModalOpen(true)}
                    className="flex-row items-center gap-1 px-2 py-2 rounded-lg"
                    style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color="#64748b"
                    />
                    <Text
                      className="text-xs text-slate-600"
                      numberOfLines={1}
                      style={{ maxWidth: 100 }}
                    >
                      {dateFilterLabel}
                    </Text>
                  </Pressable>
                )}
              </View>

              {showInvoiceList && !search.trim() && stackSearchControls && (
                <Pressable
                  onPress={() => setDateFilterModalOpen(true)}
                  className="mt-2 flex-row items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2"
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <Ionicons name="calendar-outline" size={14} color="#64748b" />
                  <Text className="text-xs text-slate-600" numberOfLines={1}>
                    {dateFilterLabel}
                  </Text>
                </Pressable>
              )}

              {showInvoiceList && filteredInvoices.length > 0 && (
                <View
                  className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5 min-w-0"
                  style={{
                    flexDirection: stackTotals ? "column" : "row",
                    gap: stackTotals ? 8 : 0,
                  }}
                >
                  <View className="flex-1 min-w-0">
                    <Text className={TYPO.sectionTitle}>Total</Text>
                    <Text
                      className="text-sm font-bold text-slate-800 mt-0.5"
                      numberOfLines={1}
                    >
                      ₹{inr(totalValue)}
                    </Text>
                  </View>
                  <View
                    className="flex-1 min-w-0"
                    style={{
                      borderLeftWidth: stackTotals ? 0 : 1,
                      borderTopWidth: stackTotals ? 1 : 0,
                      borderColor: "#e2e8f0",
                      paddingLeft: stackTotals ? 0 : 12,
                      paddingTop: stackTotals ? 8 : 0,
                    }}
                  >
                    <Text className={TYPO.sectionTitle}>Pending</Text>
                    <Text
                      className="text-sm font-bold text-amber-600 mt-0.5"
                      numberOfLines={1}
                    >
                      ₹{inr(pendingAmount)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Quick links — web: Reports, Analytics, Aging, Overdue */}
          {showInvoiceList && (
            <View
              style={{ marginHorizontal: contentPad, marginTop: 16 }}
              className="flex-row flex-wrap gap-1.5 min-w-0"
            >
              {QUICK_LINK_ITEMS.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={item.onPress}
                  className="min-w-0 flex-row items-center justify-center gap-1 rounded-md border border-slate-200 py-2 px-1.5 bg-white min-h-[40]"
                  style={({ pressed }) => ({
                    width: quickLinkTileWidth,
                    opacity: pressed ? 0.7 : 1,
                    backgroundColor: pressed ? "#f8fafc" : "#fff",
                  })}
                >
                  <Ionicons name={item.icon} size={12} color="#64748b" />
                  <Text
                    className="text-[11px] font-medium text-slate-600"
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* List */}
          <View
            style={{ flex: 1, marginHorizontal: contentPad, marginTop: 12 }}
            className="min-w-0"
          >
            {docTypeTab === "purchase" ? (
              purchasesLoading ? (
                <View className="py-16 items-center">
                  <ActivityIndicator size="large" color="#e67e22" />
                </View>
              ) : filteredPurchases.length === 0 ? (
                <View className="rounded-xl border border-slate-200 bg-white py-16">
                  <EmptyState
                    iconName="cube-outline"
                    title={search ? "No purchases match" : "No purchases yet"}
                    description={
                      search
                        ? "Try a different search"
                        : "Add your first purchase"
                    }
                    actionLabel={!search ? "Add Purchase" : undefined}
                    onAction={
                      !search
                        ? () => {
                            InteractionManager.runAfterInteractions(() => {
                              try {
                                (navigation.getParent as any)?.()?.navigate(
                                  "MoreTab",
                                  { screen: "Purchases" },
                                );
                              } catch (_) {}
                            });
                          }
                        : undefined
                    }
                  />
                </View>
              ) : (
                <View className="flex-1 rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <FlatList
                    data={filteredPurchases}
                    keyExtractor={(p) => p.id}
                    renderItem={renderPurchaseRow}
                    getItemLayout={(_, index) => ({
                      length: ROW_HEIGHT,
                      offset: ROW_HEIGHT * index,
                      index,
                    })}
                    ListFooterComponent={<View className="h-4" />}
                    style={{ flex: 1 }}
                    initialNumToRender={12}
                    maxToRenderPerBatch={8}
                    windowSize={6}
                    removeClippedSubviews={true}
                  />
                </View>
              )
            ) : isError ? (
              <View className="rounded-xl border border-slate-200 bg-white py-8 px-4">
                <ErrorCard
                  message="Failed to load invoices"
                  onRetry={() => refetch()}
                />
              </View>
            ) : filteredInvoices.length === 0 ? (
              <View className="rounded-xl border border-slate-200 bg-white py-16">
                <EmptyState
                  iconName="receipt-outline"
                  title={
                    search || statusTab !== "All"
                      ? `No ${docTypeTab === "quotation" ? "quotations" : "invoices"} match`
                      : docTypeTab === "quotation"
                        ? "No quotations yet"
                        : "No invoices yet"
                  }
                  description="Create your first invoice to get started"
                  actionLabel={
                    statusTab === "All" && !search
                      ? docTypeTab === "quotation"
                        ? "Create Quotation"
                        : "Create Invoice"
                      : undefined
                  }
                  onAction={
                    statusTab === "All" && !search
                      ? handleNewInvoice
                      : undefined
                  }
                />
              </View>
            ) : (
              <View className="flex-1 rounded-xl border border-slate-200 bg-white overflow-hidden">
                <FlatList
                  data={filteredInvoices}
                  keyExtractor={(inv) => inv.id}
                  renderItem={renderInvoiceRow}
                  getItemLayout={(_, index) => ({
                    length: ROW_HEIGHT,
                    offset: ROW_HEIGHT * index,
                    index,
                  })}
                  refreshControl={
                    <RefreshControl
                      refreshing={isFetching}
                      onRefresh={refetch}
                      tintColor="#e67e22"
                    />
                  }
                  ListFooterComponent={<View className="h-24" />}
                  style={{ flex: 1 }}
                  initialNumToRender={12}
                  maxToRenderPerBatch={8}
                  windowSize={6}
                  removeClippedSubviews={true}
                />
              </View>
            )}
          </View>

          {/* FAB */}
          <TouchableOpacity
            onPress={handleNewInvoice}
            activeOpacity={0.85}
            style={{
              position: "absolute",
              bottom: Math.max(insets.bottom, 12),
              right: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 24,
              backgroundColor: "#e67e22",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
              zIndex: 20,
            }}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text className="text-white font-bold text-sm">Add Invoice</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date filter modal — web: Select dropdown */}
      <Modal visible={dateFilterModalOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setDateFilterModalOpen(false)}
        >
          <Pressable
            className="bg-white rounded-t-2xl p-4 pb-8"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-base font-bold text-slate-800 mb-3">
              Date
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {DATE_FILTERS.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => handleDateSelect(f)}
                  className="py-3 px-4 rounded-lg"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                    backgroundColor:
                      dateFilter === f ? "#f1f5f9" : "transparent",
                  })}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: dateFilter === f ? "600" : "400",
                      color: "#334155",
                    }}
                  >
                    {DATE_LABELS[f]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Custom date range modal — web: Popover with From/To calendar */}
      <Modal visible={customDateModalOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center p-4"
          onPress={() => {
            setCustomDateModalOpen(false);
            setCustomPickerMode(null);
          }}
        >
          <Pressable
            className="bg-white rounded-2xl p-5 w-full max-w-sm"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-base font-bold text-slate-800 mb-4">
              Custom date range
            </Text>
            <View style={{ gap: 16 }}>
              <View>
                <Text className="text-xs font-semibold text-slate-500 mb-1">
                  From
                </Text>
                <Pressable
                  onPress={() => setCustomPickerMode("from")}
                  className="py-3 px-4 rounded-xl border border-slate-200 bg-slate-50"
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <Text className="text-sm text-slate-800">
                    {customFromTemp.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </Pressable>
                {customPickerMode === "from" && (
                  <DateTimePicker
                    value={customFromTemp}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_, d) => {
                      if (d) setCustomFromTemp(d);
                      setCustomPickerMode(null);
                    }}
                    maximumDate={customToTemp}
                  />
                )}
              </View>
              <View>
                <Text className="text-xs font-semibold text-slate-500 mb-1">
                  To
                </Text>
                <Pressable
                  onPress={() => setCustomPickerMode("to")}
                  className="py-3 px-4 rounded-xl border border-slate-200 bg-slate-50"
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <Text className="text-sm text-slate-800">
                    {customToTemp.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </Pressable>
                {customPickerMode === "to" && (
                  <DateTimePicker
                    value={customToTemp}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_, d) => {
                      if (d) setCustomToTemp(d);
                      setCustomPickerMode(null);
                    }}
                    minimumDate={customFromTemp}
                    maximumDate={new Date()}
                  />
                )}
              </View>
            </View>
            <View className="flex-row gap-2 mt-4">
              <Pressable
                onPress={() => {
                  setCustomDateModalOpen(false);
                  setCustomPickerMode(null);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-100 items-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <Text className="text-sm font-semibold text-slate-600">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={applyCustomDate}
                className="flex-1 py-3 rounded-xl bg-primary items-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
              >
                <Text className="text-sm font-semibold text-white">Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
