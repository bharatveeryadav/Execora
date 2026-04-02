/**
 * InvoiceListScreen — Bills page, matches web app (Invoices.tsx) filter structure.
 */
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Pressable,
  InteractionManager,
  Modal,
  Platform,
  StyleSheet,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { invoiceApi } from "../api/invoiceApi";
import { purchaseApi } from "../../../lib/api";
import { inr, type Invoice } from "@execora/shared";
import { useWsInvalidation } from "../../../shared/hooks/useWsInvalidation";
import { useResponsive } from "../../../shared/hooks/useResponsive";
import { TabBar, type TabItem } from "../../../components/composites/TabBar";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorCard } from "../../../components/ui/ErrorCard";
import { Skeleton } from "../../../components/ui/Skeleton";
import { ScreenInner } from "../../../components/ui/ScreenLayout";
import { TYPO } from "../../../shared/lib/typography";
import { COLORS, SIZES, STATUS_COLORS } from "../../../shared/lib/constants";
import type { InvoicesStackParams } from "../../../navigation";

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
type SortKey =
  | "latest"
  | "oldest"
  | "amount_high"
  | "amount_low"
  | "pending_high";
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
  paid: {
    bgColor: STATUS_COLORS.paid.bg,
    iconColor: STATUS_COLORS.paid.icon,
    textColor: STATUS_COLORS.paid.text,
  },
  pending: {
    bgColor: STATUS_COLORS.pending.bg,
    iconColor: STATUS_COLORS.pending.icon,
    textColor: STATUS_COLORS.pending.text,
  },
  partial: {
    bgColor: STATUS_COLORS.partial.bg,
    iconColor: STATUS_COLORS.partial.icon,
    textColor: STATUS_COLORS.partial.text,
  },
  draft: {
    bgColor: STATUS_COLORS.draft.bg,
    iconColor: STATUS_COLORS.draft.icon,
    textColor: STATUS_COLORS.draft.text,
  },
  proforma: {
    bgColor: COLORS.bg.secondary,
    iconColor: COLORS.secondary,
    textColor: COLORS.secondary,
  },
  cancelled: {
    bgColor: STATUS_COLORS.cancelled.bg,
    iconColor: STATUS_COLORS.cancelled.icon,
    textColor: STATUS_COLORS.cancelled.text,
  },
};

const styles = StyleSheet.create({
  surfaceShadow: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 18,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  cardShadow: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }),
  fabShadow: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
});

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
export function InvoiceListScreen({ navigation, route }: Props) {
  const { width, contentPad, contentWidth } = useResponsive();
  const insets = useSafeAreaInsets();
  const stackSearchControls = contentWidth < 380;
  const isVerySmall = contentWidth < 360;
  const [docTypeTab, setDocTypeTab] = useState<DocTypeTab>("sales");
  const [statusTab, setStatusTab] = useState<StatusTab>(
    () => (route.params?.initialStatusFilter as StatusTab) ?? "All",
  );
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>(
    () => (route.params?.initialDateFilter as DateFilter) ?? "all",
  );
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [dateFilterModalOpen, setDateFilterModalOpen] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [customDateModalOpen, setCustomDateModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("latest");
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

  const {
    data: purchaseData,
    isFetching: purchasesLoading,
    isError: isPurchaseError,
    refetch: refetchPurchases,
  } = useQuery({
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
    const filtered = invoicesByDate.filter((inv: any) => {
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

    const withPending = filtered.map((inv) => {
      const invAny = inv as any;
      const total = parseFloat(String(inv.total ?? 0));
      const paid = parseFloat(String(invAny.paidAmount ?? 0));
      return {
        inv,
        pending: Math.max(total - paid, 0),
        date: new Date(invAny.invoiceDate ?? inv.createdAt).getTime(),
        amount: total,
      };
    });

    withPending.sort((a, b) => {
      if (sortBy === "oldest") return a.date - b.date;
      if (sortBy === "amount_high") return b.amount - a.amount;
      if (sortBy === "amount_low") return a.amount - b.amount;
      if (sortBy === "pending_high") return b.pending - a.pending;
      return b.date - a.date;
    });

    return withPending.map((x) => x.inv);
  }, [invoicesByDate, search, sortBy, statusTab]);

  const filteredPurchases = useMemo(() => {
    if (docTypeTab !== "purchase") return [];
    const base = !search.trim()
      ? purchases
      : purchases.filter(
          (p: any) =>
            (p.itemName ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (p.supplier ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (p.category ?? "").toLowerCase().includes(search.toLowerCase()),
        );

    return [...base].sort((a: any, b: any) => {
      const aDate = new Date(a.date ?? a.createdAt ?? 0).getTime();
      const bDate = new Date(b.date ?? b.createdAt ?? 0).getTime();
      const aAmount = parseFloat(String(a.amount ?? 0));
      const bAmount = parseFloat(String(b.amount ?? 0));

      if (sortBy === "oldest") return aDate - bDate;
      if (sortBy === "amount_high") return bAmount - aAmount;
      if (sortBy === "amount_low") return aAmount - bAmount;
      return bDate - aDate;
    });
  }, [docTypeTab, purchases, search, sortBy]);

  const counts = useMemo(
    () =>
      invoicesByDate.reduce<Record<string, number>>((acc, inv) => {
        const s = (inv as any).status ?? "draft";
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {}),
    [invoicesByDate],
  );

  const showInvoiceList = docTypeTab === "sales" || docTypeTab === "quotation";
  const isInvoicesInitialLoading = showInvoiceList && isFetching && !invData;
  const isPurchasesInitialLoading =
    docTypeTab === "purchase" && purchasesLoading && !purchaseData;
  const fabBottom = Math.max(insets.bottom + 16, 20);
  const fabRight = Math.max(
    contentPad,
    (width - contentWidth) / 2 + contentPad,
  );

  const handleNewInvoice = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      try {
        const tabNav = navigation.getParent() as any;
        if (docTypeTab === "purchase") {
          tabNav?.navigate("MoreTab", { screen: "Purchases" });
        } else {
          tabNav?.navigate("MoreTab", {
            screen: "Billing",
            params: { screen: "InvoiceForm" },
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

  const resetListControls = useCallback(() => {
    setDateFilter("all");
    setCustomFrom(undefined);
    setCustomTo(undefined);
    setSortBy("latest");
  }, []);

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

  const sortLabel = useMemo(() => {
    if (sortBy === "oldest") return "Oldest";
    if (sortBy === "amount_high") return "Amount high";
    if (sortBy === "amount_low") return "Amount low";
    if (sortBy === "pending_high") return "Pending high";
    return "Latest";
  }, [sortBy]);

  const hasActiveListControls =
    sortBy !== "latest" || (showInvoiceList && dateFilter !== "all");

  const statusTabItems = useMemo(
    (): TabItem[] =>
      STATUS_TABS.map((tab) => {
        const key = tab.toLowerCase();
        return {
          id: tab,
          label: tab,
          badge: tab === "All" ? invoicesByDate.length : (counts[key] ?? 0),
        };
      }),
    [counts, invoicesByDate.length],
  );

  const renderInvoiceRow = useCallback(
    ({ item: inv }: { item: Invoice }) => {
      const invAny = inv as any;
      const status = invAny.status ?? "draft";
      const s = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
      const invoiceNumber = invAny.invoiceNo ?? inv.id.slice(-8).toUpperCase();
      const invoiceDate = formatDate(invAny.invoiceDate ?? inv.createdAt);
      const dueDate = invAny.dueDate ? formatDate(invAny.dueDate) : null;
      const total = parseFloat(String(inv.total ?? 0));
      const paidAmount = parseFloat(String(invAny.paidAmount ?? 0));
      const balance = Math.max(total - paidAmount, 0);
      const amtColor =
        status === "paid"
          ? COLORS.success
          : status === "cancelled"
            ? COLORS.slate[400]
            : COLORS.slate[900];

      return (
        <Pressable
          onPress={() => {
            InteractionManager.runAfterInteractions(() => {
              navigation?.navigate?.("InvoiceDetail", { id: inv.id });
            });
          }}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 min-w-0"
          style={({ pressed }) => ({
            backgroundColor: pressed ? COLORS.slate[50] : COLORS.text.inverted,
            minHeight: 72,
            opacity: pressed ? 0.96 : 1,
            ...styles.cardShadow,
          })}
        >
          <View className="flex-row items-center gap-3">
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
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
                size={20}
                color={s.iconColor}
              />
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1 min-w-0">
                  <Text
                    className={TYPO.labelBold}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {invoiceNumber}
                  </Text>
                  <Text
                    className={`${TYPO.caption} mt-1 min-w-0`}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {(invAny.customer?.name ?? "Unknown customer") +
                      " • " +
                      invoiceDate +
                      (dueDate ? ` • Due ${dueDate}` : "")}
                  </Text>
                </View>
                <View className="items-end shrink-0">
                  <Text
                    style={{
                      fontSize: SIZES.FONT.base,
                      fontWeight: "700",
                      color: amtColor,
                      textDecorationLine:
                        status === "cancelled" ? "line-through" : undefined,
                    }}
                    numberOfLines={1}
                  >
                    ₹{inr(inv.total)}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between mt-2">
                <View
                  style={{
                    borderRadius: SIZES.RADIUS.full,
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    backgroundColor: s.bgColor,
                  }}
                >
                  <Text
                    style={{
                      fontSize: SIZES.FONT.xs,
                      fontWeight: "700",
                      color: s.textColor,
                      textTransform: "capitalize",
                    }}
                  >
                    {status}
                  </Text>
                </View>
                <Text className="text-xs font-medium text-slate-500">
                  Pending ₹{inr(balance)}
                </Text>
              </View>
            </View>
          </View>
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
              (navigation.getParent() as any)?.navigate("MoreTab", {
                screen: "Purchases",
              });
            } catch (_) {}
          });
        }}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 min-w-0"
        style={({ pressed }) => ({
          backgroundColor: pressed ? COLORS.slate[50] : COLORS.text.inverted,
          minHeight: 72,
          opacity: pressed ? 0.96 : 1,
          ...styles.cardShadow,
        })}
      >
        <View className="flex-row items-center gap-3">
          <View className="w-11 h-11 rounded-2xl bg-amber-100 items-center justify-center shrink-0">
            <Ionicons name="cube-outline" size={20} color="#d97706" />
          </View>
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 min-w-0 shrink">
                <Text
                  className={TYPO.labelBold}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {p.itemName ?? p.category}
                </Text>
                <Text
                  className={`${TYPO.caption} mt-1`}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {p.supplier ?? "Unknown supplier"} ·{" "}
                  {formatDate(p.date ?? p.createdAt ?? "")}
                </Text>
              </View>
              <View className="items-end shrink-0">
                <Text
                  className="text-sm font-bold text-red-600"
                  numberOfLines={1}
                >
                  ₹{inr(parseFloat(String(p.amount)))}
                </Text>
                <Text className="text-xs text-slate-500 mt-1">
                  Open purchases
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    ),
    [navigation],
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <View
        style={{
          paddingHorizontal: contentPad,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <ScreenInner
          className="rounded-[24px] border border-slate-200/80 bg-white px-4 pt-4 pb-4"
          style={styles.surfaceShadow}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2">
                <Text className="text-2xl font-bold text-slate-900">Bills</Text>
                <View className="rounded-full bg-primary/10 px-2.5 py-1">
                  <Text className="text-[11px] font-bold text-primary">
                    {docTypeTab === "quotation"
                      ? "Quotes"
                      : docTypeTab === "purchase"
                        ? "Purchases"
                        : "Sales"}
                  </Text>
                </View>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => {
                  if (searchExpanded && !search.trim()) {
                    setSearchExpanded(false);
                    return;
                  }
                  setSearchExpanded(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  searchExpanded ? "Close search" : "Open search"
                }
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: SIZES.RADIUS.full,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.8 : 1,
                  backgroundColor: pressed
                    ? COLORS.slate[200]
                    : COLORS.slate[100],
                })}
              >
                <Ionicons
                  name={
                    searchExpanded && !search.trim()
                      ? "close-outline"
                      : "search-outline"
                  }
                  size={18}
                  color={COLORS.slate[600]}
                />
              </Pressable>
              <Pressable
                onPress={handleBillsMenu}
                accessibilityRole="button"
                accessibilityLabel="Open bills menu"
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: SIZES.RADIUS.full,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.8 : 1,
                  backgroundColor: pressed
                    ? COLORS.slate[200]
                    : COLORS.slate[100],
                })}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={18}
                  color={COLORS.slate[600]}
                />
              </Pressable>
            </View>
          </View>

          <View className="mt-4 rounded-2xl bg-slate-100 p-1 flex-row items-center min-w-0">
            {[
              { id: "sales" as DocTypeTab, label: "Sales" },
              { id: "purchase" as DocTypeTab, label: "Purchase" },
              { id: "quotation" as DocTypeTab, label: "Quote" },
            ].map(({ id, label }) => (
              <Pressable
                key={id}
                onPress={() => requestAnimationFrame(() => setDocTypeTab(id))}
                accessibilityRole="button"
                accessibilityLabel={`Show ${label.toLowerCase()} bills`}
                style={({ pressed }) => ({
                  flex: 1,
                  opacity: pressed && docTypeTab !== id ? 0.8 : 1,
                  minHeight: SIZES.TOUCH_MIN,
                  borderRadius: SIZES.RADIUS.xl,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    docTypeTab === id ? COLORS.text.inverted : "transparent",
                  borderWidth: docTypeTab === id ? 1 : 0,
                  borderColor: COLORS.border.light,
                })}
              >
                <Text
                  style={{
                    fontSize: SIZES.FONT.sm,
                    fontWeight: docTypeTab === id ? "600" : "500",
                    color:
                      docTypeTab === id
                        ? COLORS.text.primary
                        : COLORS.text.tertiary,
                  }}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {showInvoiceList && (
            <TabBar
              tabs={statusTabItems}
              activeTab={statusTab}
              onChange={(tab) =>
                requestAnimationFrame(() => setStatusTab(tab as StatusTab))
              }
              scrollable
              className="mt-4"
            />
          )}

          <View className="mt-3 min-w-0">
            <View className="flex-row items-center justify-between gap-3 min-w-0">
              {showInvoiceList ? (
                <Pressable
                  onPress={() => setDateFilterModalOpen(true)}
                  className="min-h-[40] flex-row items-center gap-1.5"
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={COLORS.slate[600]}
                  />
                  <Text className="text-xs font-semibold text-slate-700">
                    Date Range
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={13}
                    color={COLORS.slate[500]}
                  />
                </Pressable>
              ) : (
                <View />
              )}

              <Pressable
                onPress={() => setSortModalOpen(true)}
                className="min-h-[40] flex-row items-center gap-1.5"
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <Ionicons
                  name="swap-vertical-outline"
                  size={14}
                  color={COLORS.slate[600]}
                />
                <Text className="text-xs font-semibold text-slate-700">
                  Sort By
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={13}
                  color={COLORS.slate[500]}
                />
              </Pressable>
            </View>

            {hasActiveListControls && (
              <View className="mt-1.5 flex-row items-center justify-between gap-1.5 flex-wrap">
                <View className="flex-row items-center gap-1 flex-wrap flex-1">
                  {showInvoiceList && dateFilter !== "all" && (
                    <View className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 flex-row items-center gap-1">
                      <Ionicons
                        name="calendar-outline"
                        size={11}
                        color="#0369a1"
                      />
                      <Text className="text-[11px] font-medium text-sky-700">
                        {dateFilterLabel}
                      </Text>
                    </View>
                  )}
                  {sortBy !== "latest" && (
                    <View className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 flex-row items-center gap-1">
                      <Ionicons
                        name="swap-vertical-outline"
                        size={11}
                        color="#b45309"
                      />
                      <Text className="text-[11px] font-medium text-amber-700">
                        {sortLabel}
                      </Text>
                    </View>
                  )}
                </View>

                <Pressable
                  onPress={resetListControls}
                  className="rounded-full border border-slate-200 bg-white px-2 py-0.5 flex-row items-center gap-1"
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={11}
                    color={COLORS.slate[500]}
                  />
                  <Text className="text-[11px] font-medium text-slate-600">
                    Reset
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {(searchExpanded || !!search.trim()) && (
            <View className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-2 min-w-0">
              {(searchExpanded || !!search.trim()) && (
                <View
                  className="rounded-2xl border border-slate-200 bg-white min-w-0"
                  style={{
                    flexDirection: stackSearchControls ? "column" : "row",
                    alignItems: stackSearchControls ? undefined : "center",
                  }}
                >
                  <View className="flex-1 flex-row items-center rounded-2xl px-3 min-h-[48] min-w-0">
                    <Ionicons
                      name="search"
                      size={16}
                      color={COLORS.slate[500]}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder={placeholder}
                      accessibilityLabel="Search bills"
                      placeholderTextColor={COLORS.slate[400]}
                      className="flex-1 min-w-0 text-sm text-slate-800 py-3"
                    />
                    {!!search.trim() && (
                      <Pressable
                        onPress={() => setSearch("")}
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                        })}
                        className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                      >
                        <Ionicons
                          name="close"
                          size={14}
                          color={COLORS.slate[500]}
                        />
                      </Pressable>
                    )}
                    {!search.trim() && (
                      <Pressable
                        onPress={() => setSearchExpanded(false)}
                        accessibilityRole="button"
                        accessibilityLabel="Collapse search"
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                        })}
                        className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                      >
                        <Ionicons
                          name="chevron-up"
                          size={14}
                          color={COLORS.slate[500]}
                        />
                      </Pressable>
                    )}
                    {isFetching && showInvoiceList && (
                      <ActivityIndicator
                        size="small"
                        color={COLORS.primary}
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </View>
                </View>
              )}

              {!!search.trim() && (
                <View
                  className="mt-2 self-start rounded-xl border border-slate-200 bg-white flex-row items-center gap-1.5"
                  style={{
                    paddingHorizontal: isVerySmall ? 10 : 12,
                    paddingVertical: isVerySmall ? 8 : 10,
                    maxWidth: isVerySmall ? 150 : 220,
                  }}
                >
                  <Ionicons
                    name="search-outline"
                    size={14}
                    color={COLORS.slate[500]}
                  />
                  <Text className="text-xs text-slate-600" numberOfLines={1}>
                    {search.trim()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScreenInner>
      </View>

      {/* List */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: contentPad,
          paddingTop: 12,
          alignItems: "center",
        }}
      >
        <ScreenInner style={{ flex: 1 }} className="min-w-0">
          {docTypeTab === "purchase" ? (
            isPurchaseError ? (
              <View
                className="rounded-[24px] border border-slate-200 bg-white py-8 px-4"
                style={styles.surfaceShadow}
              >
                <ErrorCard
                  message="Failed to load purchases"
                  onRetry={() => refetchPurchases()}
                />
              </View>
            ) : isPurchasesInitialLoading ? (
              <View
                className="rounded-[24px] border border-slate-200 bg-white p-4 gap-3"
                style={styles.surfaceShadow}
              >
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </View>
            ) : filteredPurchases.length === 0 ? (
              <View
                className="rounded-[24px] border border-slate-200 bg-white py-16"
                style={styles.surfaceShadow}
              >
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
                              (navigation.getParent() as any)?.navigate(
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
              <View className="flex-1">
                <FlashList
                  data={filteredPurchases}
                  keyExtractor={(p) => p.id}
                  renderItem={renderPurchaseRow}
                  contentContainerStyle={{ paddingBottom: 96 }}
                  ItemSeparatorComponent={() => (
                    <View style={{ height: SIZES.SPACING.sm }} />
                  )}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={purchasesLoading}
                      onRefresh={() => refetchPurchases()}
                      tintColor={COLORS.primary}
                    />
                  }
                  style={{ flex: 1 }}
                />
              </View>
            )
          ) : isError ? (
            <View
              className="rounded-[24px] border border-slate-200 bg-white py-8 px-4"
              style={styles.surfaceShadow}
            >
              <ErrorCard
                message="Failed to load invoices"
                onRetry={() => refetch()}
              />
            </View>
          ) : isInvoicesInitialLoading ? (
            <View
              className="rounded-[24px] border border-slate-200 bg-white p-4 gap-3"
              style={styles.surfaceShadow}
            >
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </View>
          ) : filteredInvoices.length === 0 ? (
            <View
              className="rounded-[24px] border border-slate-200 bg-white py-16"
              style={styles.surfaceShadow}
            >
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
                  statusTab === "All" && !search ? handleNewInvoice : undefined
                }
              />
            </View>
          ) : (
            <View className="flex-1">
              <FlashList
                data={filteredInvoices}
                keyExtractor={(inv) => inv.id}
                renderItem={renderInvoiceRow}
                contentContainerStyle={{ paddingBottom: 96 }}
                ItemSeparatorComponent={() => (
                  <View style={{ height: SIZES.SPACING.sm }} />
                )}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={isFetching}
                    onRefresh={refetch}
                    tintColor={COLORS.primary}
                  />
                }
                style={{ flex: 1 }}
              />
            </View>
          )}
        </ScreenInner>
      </View>

      {/* FAB */}
      <Pressable
        onPress={handleNewInvoice}
        className="w-14 h-14 rounded-full bg-primary items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel={
          docTypeTab === "purchase" ? "Add purchase" : "Create invoice"
        }
        style={{
          position: "absolute",
          bottom: fabBottom,
          right: fabRight,
          ...styles.fabShadow,
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <Modal
        visible={dateFilterModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDateFilterModalOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center p-4"
          onPress={() => setDateFilterModalOpen(false)}
        >
          <Pressable
            className="bg-white rounded-2xl p-4 w-full max-w-sm"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-base font-bold text-slate-800 mb-3">
              Filter by date
            </Text>
            {DATE_FILTERS.map((option) => (
              <Pressable
                key={option}
                onPress={() => handleDateSelect(option)}
                className="py-3 px-3 rounded-xl flex-row items-center justify-between"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                  backgroundColor:
                    dateFilter === option ? COLORS.slate[100] : "transparent",
                })}
              >
                <Text className="text-sm text-slate-800">
                  {DATE_LABELS[option]}
                </Text>
                {dateFilter === option && (
                  <Ionicons name="checkmark" size={16} color={COLORS.primary} />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Custom date range modal — web: Popover with From/To calendar */}
      <Modal
        visible={customDateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomDateModalOpen(false)}
      >
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

      <Modal
        visible={sortModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center p-4"
          onPress={() => setSortModalOpen(false)}
        >
          <Pressable
            className="bg-white rounded-2xl p-4 w-full max-w-sm"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-base font-bold text-slate-800 mb-3">
              Sort invoices
            </Text>
            {[
              { id: "latest" as SortKey, label: "Latest first" },
              { id: "oldest" as SortKey, label: "Oldest first" },
              { id: "amount_high" as SortKey, label: "Amount high to low" },
              { id: "amount_low" as SortKey, label: "Amount low to high" },
              ...(showInvoiceList
                ? ([
                    {
                      id: "pending_high" as SortKey,
                      label: "Pending high to low",
                    },
                  ] as const)
                : []),
            ].map((option) => (
              <Pressable
                key={option.id}
                onPress={() => {
                  setSortBy(option.id);
                  setSortModalOpen(false);
                }}
                className="py-3 px-3 rounded-xl flex-row items-center justify-between"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                  backgroundColor:
                    sortBy === option.id ? COLORS.slate[100] : "transparent",
                })}
              >
                <Text className="text-sm text-slate-800">{option.label}</Text>
                {sortBy === option.id && (
                  <Ionicons name="checkmark" size={16} color={COLORS.primary} />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
