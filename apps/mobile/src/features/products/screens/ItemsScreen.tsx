/**
 * ItemsScreen — Mobile product catalog & inventory management.
 *
 * PRD F-03: Inventory & Stock Management
 *
 * What competitors do                  | What we do better
 * ─────────────────────────────────────|──────────────────────────────────────
 * Vyapar: catalog list, requires       | One-tap ➕/➖ stock adjustment inline
 *         drill-in to adjust stock     | No extra screens needed
 * myBillBook: basic list, no alerts    | Color-coded stock badges (live)
 * Khatabook: no inventory at all       | Low-stock alert banner at top
 * Tally: complex item master           | Simple kirana-friendly card UI
 * All: manual refresh required         | React Query auto-refresh on focus
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  InteractionManager,
  StyleSheet,
} from "react-native";
import { showAlert } from "../../../lib/alerts";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi } from "@execora/shared";
import { BarcodeScanner } from "../../../components/common/BarcodeScanner";
import { hapticLight } from "../../../lib/haptics";
import { storage } from "../../../lib/storage";
import type { Product } from "@execora/shared";
import { Ionicons } from "@expo/vector-icons";
import { useWsInvalidation } from "../../../hooks/useWsInvalidation";
import { useResponsive } from "../../../hooks/useResponsive";
import { productExtApi } from "../../../lib/api";
import { QUERY_KEYS } from "../../../lib/queryKeys";
import { COLORS } from "../../../lib/constants";

// ── Helper: parse numeric fields returned as string | number from API ─────────

function num(v: string | number | undefined | null): number {
  if (v === undefined || v === null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isFinite(n) ? n : 0;
}

// ── Stock status logic (PRD F-03.3) ──────────────────────────────────────────

type StockStatus = "out" | "low" | "ok";

function stockStatus(product: Product & { minStock?: number }): StockStatus {
  const s = num(product.stock);
  if (s <= 0) return "out";
  const min = product.minStock ?? 5; // default reorder threshold if not set
  if (s <= min) return "low";
  return "ok";
}

const STATUS_STYLES: Record<
  StockStatus,
  { bg: string; text: string; label: string; dot: string }
> = {
  out: { bg: "bg-red-100", text: "text-red-700", label: "Out", dot: "🔴" },
  low: { bg: "bg-amber-100", text: "text-amber-700", label: "Low", dot: "🟡" },
  ok: {
    bg: "bg-green-100",
    text: "text-green-700",
    label: "In Stock",
    dot: "🟢",
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
      elevation: 6,
    },
    default: {},
  }),
});

// ── Filter & sort types ────────────────────────────────────────────────────────

type FilterMode = "all" | "low" | "out" | "favorites";

type SortMode =
  | "name"
  | "stockAsc"
  | "stockDesc"
  | "price"
  | "priceDesc"
  | "category";

type ListMode = "compact" | "full";

type Props = NativeStackScreenProps<
  import("../../../navigation").ItemsStackParams,
  "ItemsList"
>;

// ── Main screen ───────────────────────────────────────────────────────────────

export function ItemsScreen({ navigation }: Props) {
  const qc = useQueryClient();
  useWsInvalidation(["products", "lowStock"]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("name");
  const [addOpen, setAddOpen] = useState(false);
  const [showHint, setShowHint] = useState(
    () => !storage.getString("items-hint-dismissed"),
  );
  const [adjustTarget, setAdjustTarget] = useState<
    (Product & { minStock?: number }) | null
  >(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [listMode, setListMode] = useState<ListMode>(() => {
    const storedMode =
      storage.getString("items-list-mode") ??
      storage.getString("items-density-mode");
    return storedMode === "comfortable" || storedMode === "full"
      ? "full"
      : "compact";
  });
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    storage.set("items-list-mode", listMode);
  }, [listMode]);

  const openSearch = useCallback(() => {
    setShowSearch(true);
    setTimeout(() => searchInputRef.current?.focus(), 80);
  }, []);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearch("");
  }, []);

  const filtersActive = !!(
    filter !== "all" ||
    categoryFilter ||
    sortBy !== "name"
  );

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (categoryFilter) parts.push(categoryFilter);
    if (filter === "low") parts.push("Low stock");
    else if (filter === "out") parts.push("Out of stock");
    else if (filter === "favorites") parts.push("Favorites");
    if (sortBy === "stockAsc") parts.push("Stock ↑");
    else if (sortBy === "stockDesc") parts.push("Stock ↓");
    else if (sortBy === "price") parts.push("Price ↑");
    else if (sortBy === "priceDesc") parts.push("Price ↓");
    else if (sortBy === "category") parts.push("A-Z Category");
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [categoryFilter, filter, sortBy]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const [page, setPage] = useState(1);
  const [accumulatedProducts, setAccumulatedProducts] = useState<
    Array<Product & { minStock?: number }>
  >([]);

  const {
    data: allData,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.products.page(page),
    queryFn: () => productApi.list(page, 50),
    staleTime: 30_000,
  });

  const paginated = allData as
    | { products: Product[]; total: number; hasMore?: boolean }
    | undefined;
  const hasMore = paginated?.hasMore ?? false;

  // Accumulate products across pages (Sprint 27)
  React.useEffect(() => {
    const list = (paginated?.products ?? []) as Array<
      Product & { minStock?: number }
    >;
    if (page === 1) {
      setAccumulatedProducts(list);
    } else if (list.length > 0) {
      setAccumulatedProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const newOnes = list.filter((p) => !seen.has(p.id));
        return [...prev, ...newOnes];
      });
    }
  }, [paginated?.products, page]);

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) setPage((p) => p + 1);
  }, [hasMore, isFetching]);

  const { data: lowData } = useQuery({
    queryKey: QUERY_KEYS.products.lowStock(),
    queryFn: () => productExtApi.lowStock(),
    staleTime: 30_000,
  });

  // ── Derived lists ─────────────────────────────────────────────────────────

  const allProducts: Array<Product & { minStock?: number }> =
    accumulatedProducts.length > 0
      ? accumulatedProducts
      : ((paginated?.products ?? []) as Array<Product & { minStock?: number }>);
  const lowStockIds = useMemo(
    () => new Set((lowData?.products ?? []).map((p) => p.id)),
    [lowData],
  );

  const categories = useMemo(() => {
    const cats = new Set<string>();
    allProducts.forEach((p) => {
      const c = (p.category ?? "").trim();
      if (c) cats.add(c);
    });
    return Array.from(cats).sort();
  }, [allProducts]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allProducts.forEach((product) => {
      const category = (product.category ?? "").trim();
      if (!category) return;
      counts[category] = (counts[category] ?? 0) + 1;
    });
    return counts;
  }, [allProducts]);

  const { width, contentPad, contentWidth, isSmall } = useResponsive();

  // Reset stale category filter when product set changes.
  useEffect(() => {
    if (categoryFilter && !categories.includes(categoryFilter)) {
      setCategoryFilter(null);
    }
  }, [categoryFilter, categories]);

  const filtered = useMemo(() => {
    let list = allProducts;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q),
      );
    }
    if (filter === "out") list = list.filter((p) => num(p.stock) <= 0);
    else if (filter === "low") list = list.filter((p) => lowStockIds.has(p.id));
    else if (filter === "favorites")
      list = list.filter(
        (p) => (p as Product & { isFeatured?: boolean }).isFeatured,
      );

    if (categoryFilter) {
      list = list.filter((p) => (p.category ?? "").trim() === categoryFilter);
    }

    // Sort (Sprint 24 — Vyapar complaint: no sort by quantity)
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "stockAsc") return num(a.stock) - num(b.stock);
      if (sortBy === "stockDesc") return num(b.stock) - num(a.stock);
      if (sortBy === "price") return num(a.price) - num(b.price);
      if (sortBy === "priceDesc") return num(b.price) - num(a.price);
      if (sortBy === "category") {
        const ca = (a.category ?? "").localeCompare(b.category ?? "");
        return ca !== 0 ? ca : a.name.localeCompare(b.name);
      }
      return 0;
    });
    return sorted;
  }, [allProducts, search, filter, categoryFilter, lowStockIds, sortBy]);

  const outCount = allProducts.filter((p) => num(p.stock) <= 0).length;
  const lowCount = lowData?.products.length ?? 0;
  const favoritesCount = allProducts.filter(
    (p) => (p as Product & { isFeatured?: boolean }).isFeatured,
  ).length;
  const imageIds = useMemo(
    () => [...new Set(filtered.map((p) => p.id))].slice(0, 50),
    [filtered],
  );
  const { data: imageUrlsMap = {} } = useQuery({
    queryKey: QUERY_KEYS.products.imageUrls(imageIds),
    queryFn: () => productExtApi.getImageUrls(imageIds),
    enabled: imageIds.length > 0,
    staleTime: 50 * 60 * 1000,
  });

  // ── Stock adjustment mutation ─────────────────────────────────────────────

  const adjustMutation = useMutation({
    mutationFn: ({
      id,
      qty,
      op,
    }: {
      id: string;
      qty: number;
      op: "add" | "subtract";
    }) => productExtApi.adjustStock(id, qty, op),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.products.all() });
    },
    onError: (e: Error) => {
      showAlert("Error", e.message ?? "Stock adjustment failed");
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      productExtApi.update(id, { isFeatured }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.products.all() });
    },
  });

  const handleQuickAdjust = useCallback(
    (product: Product & { minStock?: number }, op: "add" | "subtract") => {
      const current = num(product.stock);
      if (op === "subtract" && current <= 0) {
        showAlert("Cannot subtract", "Stock is already at 0");
        return;
      }
      adjustMutation.mutate({ id: product.id, qty: 1, op });
    },
    [adjustMutation],
  );

  const insets = useSafeAreaInsets();
  const fabBottom = Math.max(insets.bottom + 16, 20);
  const fabRight = Math.max(
    contentPad,
    (width - contentWidth) / 2 + contentPad,
  );

  const openQuickAccess = useCallback(
    (
      target:
        | "stockSummary"
        | "itemDetails"
        | "lowStockSummary"
        | "onlineStore",
    ) => {
      const nav = navigation as any;

      try {
        if (target === "stockSummary") {
          nav.getParent?.()?.navigate?.("MoreTab", {
            screen: "ComingSoon",
            params: { title: "Stock Summary", emoji: "📊" },
          });
          return;
        }
        if (target === "itemDetails") {
          nav.navigate?.("ItemsMenu");
          return;
        }
        if (target === "lowStockSummary") {
          nav.getParent?.()?.navigate?.("MoreTab", {
            screen: "ComingSoon",
            params: { title: "Low Stock Summary", emoji: "⚠️" },
          });
          return;
        }

        nav.getParent?.()?.navigate?.("MoreTab", {
          screen: "OnlineStore",
          params: { title: "Online Store" },
        });
      } catch {
        showAlert("Not available", "This section opens from another screen");
      }
    },
    [navigation],
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View
        style={{
          paddingHorizontal: contentPad,
          paddingTop: 8,
          paddingBottom: 12,
        }}
        className=""
      >
        <View
          style={{ width: "100%", maxWidth: contentWidth, alignSelf: "center" }}
        >
          <View
            className={`rounded-[24px] border border-slate-200 bg-white ${
              isSmall ? "px-3.5 pt-3.5 pb-3.5" : "px-4 pt-4 pb-4"
            }`}
            style={styles.surfaceShadow}
          >
            {showSearch ? (
              <View className="flex-row items-center gap-2 mb-4">
                <View className="flex-1 flex-row items-center bg-slate-100 rounded-2xl px-3 min-h-[48]">
                  <Ionicons
                    name="search"
                    size={18}
                    color={COLORS.primary}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    ref={searchInputRef}
                    className="flex-1 text-sm text-slate-800 py-3"
                    placeholder="Search products, category..."
                    placeholderTextColor={COLORS.slate[400]}
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                    autoCapitalize="none"
                    spellCheck={false}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                    keyboardAppearance="light"
                    selectionColor={`${COLORS.primary}66`}
                    cursorColor={COLORS.primary}
                    disableFullscreenUI={true}
                  />
                </View>
                <Pressable
                  onPress={closeSearch}
                  accessibilityRole="button"
                  accessibilityLabel="Close search"
                  className="w-11 h-11 rounded-2xl items-center justify-center"
                  style={({ pressed }) => ({
                    backgroundColor: pressed
                      ? COLORS.slate[200]
                      : COLORS.slate[100],
                  })}
                >
                  <Ionicons name="close" size={20} color={COLORS.slate[600]} />
                </Pressable>
              </View>
            ) : (
              <>
              <View className="flex-row items-start justify-between mb-3 gap-3">
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-2xl font-bold tracking-tight text-slate-900">
                      All Items
                    </Text>
                    <View className="rounded-full bg-primary/10 px-2.5 py-1">
                      <Text className="text-[11px] font-bold text-primary uppercase">
                        Full List
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm text-slate-500 mt-1">
                    {filtersActive
                      ? `${filtered.length} of ${allProducts.length} items`
                      : `${allProducts.length} items • use filters for focus`}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={openSearch}
                    accessibilityRole="button"
                    accessibilityLabel="Search items"
                    className="w-11 h-11 rounded-2xl items-center justify-center"
                    style={({ pressed }) => ({
                      backgroundColor: pressed
                        ? COLORS.slate[200]
                        : COLORS.slate[100],
                    })}
                  >
                    <Ionicons
                      name="search"
                      size={20}
                      color={COLORS.slate[600]}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      InteractionManager.runAfterInteractions(() => {
                        navigation?.navigate?.("ItemsMenu");
                      });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Open items menu"
                    className="w-11 h-11 rounded-2xl items-center justify-center"
                    style={({ pressed }) => ({
                      backgroundColor: pressed
                        ? COLORS.slate[200]
                        : COLORS.slate[100],
                    })}
                  >
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={20}
                      color={COLORS.slate[600]}
                    />
                  </Pressable>
                </View>
              </View>

              <View className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-slate-500 mb-2 px-1">
                  Quick Access
                </Text>
                <View className="flex-row items-center gap-2">
                  {[
                    {
                      key: "stockSummary",
                      icon: "stats-chart-outline" as const,
                      label: "Stock Summary",
                      color: COLORS.warning,
                    },
                    {
                      key: "itemDetails",
                      icon: "receipt-outline" as const,
                      label: "Details",
                      color: COLORS.primary,
                    },
                    {
                      key: "lowStockSummary",
                      icon: "alert-circle-outline" as const,
                      label: "Low Stock",
                      color: COLORS.success,
                    },
                    {
                      key: "onlineStore",
                      icon: "storefront-outline" as const,
                      label: "Store",
                      color: COLORS.secondary,
                    },
                  ].map((action) => (
                    <Pressable
                      key={action.key}
                      onPress={() =>
                        openQuickAccess(
                          action.key as
                            | "stockSummary"
                            | "itemDetails"
                            | "lowStockSummary"
                            | "onlineStore",
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${action.label}`}
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 items-center"
                    >
                      <View
                        className="h-8 w-8 rounded-lg items-center justify-center"
                        style={{ backgroundColor: `${action.color}1A` }}
                      >
                        <Ionicons
                          name={action.icon}
                          size={16}
                          color={action.color}
                        />
                      </View>
                      <Text className="text-[11px] font-semibold text-slate-700 mt-1.5">
                        {action.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              </>
            )}

            <View>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => setShowControls((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle item filters and sorting"
                  className={`flex-1 flex-row items-center rounded-2xl px-3 ${
                    isSmall ? "min-h-[44]" : "min-h-[48]"
                  }`}
                  style={{ backgroundColor: COLORS.slate[100] }}
                >
                  <Ionicons
                    name="options-outline"
                    size={16}
                    color={filtersActive ? COLORS.primary : COLORS.slate[400]}
                  />
                  {filtersActive ? (
                    <Text
                      className="flex-1 text-xs font-semibold text-primary mx-2"
                      numberOfLines={1}
                    >
                      {filterSummary}
                    </Text>
                  ) : (
                    <Text className="flex-1 text-xs text-slate-400 mx-2">
                      Filter, categories and sorting
                    </Text>
                  )}
                  {filtersActive && (
                    <View className="w-2 h-2 rounded-full bg-primary mr-2" />
                  )}
                  <Ionicons
                    name={showControls ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={COLORS.slate[400]}
                  />
                </Pressable>

                <Pressable
                  onPress={() => setShowCategoryModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Open categories"
                  className={`${isSmall ? "h-11 w-11" : "h-12 w-12"} rounded-2xl items-center justify-center`}
                  style={{ backgroundColor: COLORS.slate[100] }}
                >
                  <Ionicons
                    name="grid-outline"
                    size={18}
                    color={COLORS.slate[600]}
                  />
                </Pressable>

                {filtersActive && (
                  <Pressable
                    onPress={() => {
                      setFilter("all");
                      setCategoryFilter(null);
                      setSortBy("name");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear active item filters"
                    className={`${isSmall ? "h-11 w-11" : "h-12 w-12"} rounded-2xl items-center justify-center border border-red-100`}
                    style={{ backgroundColor: COLORS.bg.error }}
                  >
                    <Ionicons name="close" size={16} color={COLORS.error} />
                  </Pressable>
                )}
              </View>

              {showControls && (
                <View
                  className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-3"
                  style={styles.cardShadow}
                >
                  {/* Categories */}
                  <View className="mb-2 flex-row items-center">
                    <View className="mr-2 h-6 w-6 items-center justify-center rounded-lg bg-slate-100">
                      <Ionicons name="grid-outline" size={13} color="#64748b" />
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6, paddingRight: 8 }}
                    >
                      <TouchableOpacity
                        onPress={() => setCategoryFilter(null)}
                        activeOpacity={0.8}
                        className={
                          !categoryFilter
                            ? "px-2.5 py-1 rounded-full border border-primary bg-primary"
                            : "px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50"
                        }
                      >
                        <Text
                          className={
                            !categoryFilter
                              ? "text-[11px] font-semibold text-white"
                              : "text-[11px] font-semibold text-slate-600"
                          }
                        >
                          All
                        </Text>
                      </TouchableOpacity>
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() =>
                            setCategoryFilter(
                              categoryFilter === cat ? null : cat,
                            )
                          }
                          activeOpacity={0.8}
                          className={
                            categoryFilter === cat
                              ? "px-2.5 py-1 rounded-full border border-primary bg-primary/10"
                              : "px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50"
                          }
                        >
                          <Text
                            className={
                              categoryFilter === cat
                                ? "text-[11px] font-semibold text-primary"
                                : "text-[11px] font-semibold text-slate-600"
                            }
                            numberOfLines={1}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Filters */}
                  <View className="mb-2 flex-row items-center">
                    <View className="mr-2 h-6 w-6 items-center justify-center rounded-lg bg-slate-100">
                      <Ionicons
                        name="funnel-outline"
                        size={13}
                        color="#64748b"
                      />
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6, paddingRight: 8 }}
                    >
                      {[
                        {
                          key: "all" as FilterMode,
                          label: `All (${allProducts.length})`,
                        },
                        {
                          key: "low" as FilterMode,
                          label: `Low (${lowCount})`,
                          disabled: lowCount === 0,
                        },
                        {
                          key: "out" as FilterMode,
                          label: `Out (${outCount})`,
                          disabled: outCount === 0,
                        },
                        {
                          key: "favorites" as FilterMode,
                          label: `Fav (${favoritesCount})`,
                          disabled: favoritesCount === 0,
                        },
                      ].map(({ key, label, disabled }) => (
                        <TouchableOpacity
                          key={key}
                          disabled={disabled}
                          onPress={() =>
                            requestAnimationFrame(() => setFilter(key))
                          }
                          activeOpacity={0.8}
                          className={
                            filter === key
                              ? "px-2.5 py-1 rounded-full border border-primary bg-primary/10"
                              : disabled
                                ? "px-2.5 py-1 rounded-full border border-slate-200 bg-slate-100 opacity-40"
                                : "px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50"
                          }
                        >
                          <Text
                            className={
                              filter === key
                                ? "text-[11px] font-semibold text-primary"
                                : "text-[11px] font-semibold text-slate-600"
                            }
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Sorting */}
                  <View className="flex-row items-center">
                    <View className="mr-2 h-6 w-6 items-center justify-center rounded-lg bg-slate-100">
                      <Ionicons
                        name="swap-vertical-outline"
                        size={13}
                        color="#64748b"
                      />
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6, paddingRight: 8 }}
                    >
                      {[
                        { key: "name" as SortMode, label: "Name" },
                        { key: "stockAsc" as SortMode, label: "Stock ↑" },
                        { key: "stockDesc" as SortMode, label: "Stock ↓" },
                        { key: "price" as SortMode, label: "Price ↑" },
                        { key: "priceDesc" as SortMode, label: "Price ↓" },
                        { key: "category" as SortMode, label: "Category" },
                      ].map(({ key, label }) => (
                        <TouchableOpacity
                          key={key}
                          onPress={() => setSortBy(key)}
                          activeOpacity={0.8}
                          className={
                            sortBy === key
                              ? "px-2.5 py-1 rounded-full border border-slate-700 bg-slate-700"
                              : "px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50"
                          }
                        >
                          <Text
                            className={
                              sortBy === key
                                ? "text-[11px] font-semibold text-white"
                                : "text-[11px] font-semibold text-slate-600"
                            }
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View className="mt-2 flex-row items-center">
                    <View className="mr-2 h-6 w-6 items-center justify-center rounded-lg bg-slate-100">
                      <Ionicons
                        name="albums-outline"
                        size={13}
                        color="#64748b"
                      />
                    </View>
                    <View className="flex-row gap-2">
                      {[
                        { key: "compact" as ListMode, label: "Compact" },
                        { key: "full" as ListMode, label: "Full" },
                      ].map(({ key, label }) => {
                        const active = listMode === key;

                        return (
                          <Pressable
                            key={key}
                            onPress={() => setListMode(key)}
                            accessibilityRole="button"
                            accessibilityLabel={`Use ${label.toLowerCase()} items list`}
                            className="rounded-full border px-3 py-1.5"
                            style={{
                              borderColor: active
                                ? COLORS.primary
                                : COLORS.slate[200],
                              backgroundColor: active
                                ? COLORS.bg.primary
                                : COLORS.slate[50],
                            }}
                          >
                            <Text
                              className="text-[11px] font-semibold"
                              style={{
                                color: active
                                  ? COLORS.primary
                                  : COLORS.slate[600],
                              }}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* ── First-time hint (Sprint 29) ───────────────────────────── */}
      {showHint && (
        <View
          style={{
            width: "100%",
            maxWidth: contentWidth,
            alignSelf: "center",
            marginTop: 12,
          }}
          className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-4"
        >
          <View className="flex-row items-start gap-3">
            <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center">
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-slate-800">
                Quick stock controls
              </Text>
              <Text className="text-sm text-slate-600 mt-1">
                Use <Text className="font-bold">+</Text> and{" "}
                <Text className="font-bold">−</Text> for instant adjustment, or
                long-press a card for custom quantity.
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setShowHint(false);
                storage.set("items-hint-dismissed", "1");
              }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss items hint"
            >
              <Text className="text-primary text-xs font-semibold">Got it</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Low-stock alert banner (PRD F-03.3) ───────────────────── */}
      {lowCount > 0 && filter === "all" && !search && (
        <Pressable
          onPress={() => requestAnimationFrame(() => setFilter("low"))}
          style={{
            width: "100%",
            maxWidth: contentWidth,
            alignSelf: "center",
            marginTop: 12,
          }}
          className="bg-amber-50 border border-amber-200 rounded-xl flex-row items-center px-3 py-2.5"
        >
          <View className="w-8 h-8 rounded-xl bg-amber-100 items-center justify-center mr-2.5">
            <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold text-amber-800" numberOfLines={1}>
              {lowCount} item{lowCount !== 1 ? "s" : ""} running low
            </Text>
            <Text className="text-[11px] text-amber-600" numberOfLines={1}>
              Tap to review & restock
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.warning} />
        </Pressable>
      )}

      {/* ── Product list ───────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: contentPad,
          paddingTop: 12,
          paddingBottom: 12,
          alignItems: "center",
        }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && page === 1}
            onRefresh={() => {
              setPage(1);
              setAccumulatedProducts([]);
              void qc.invalidateQueries({
                queryKey: QUERY_KEYS.products.all(),
              });
            }}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const padding = 100;
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - padding;
          if (isCloseToBottom && hasMore && !isFetching) loadMore();
        }}
        scrollEventThrottle={200}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: "100%", maxWidth: contentWidth }}>
          {isFetching && allProducts.length === 0 && (
            <View
              className="rounded-[24px] border border-slate-200 bg-white py-12 items-center"
              style={styles.surfaceShadow}
            >
              <ActivityIndicator color={COLORS.primary} />
              <Text className="text-slate-400 text-sm mt-2">
                Loading products…
              </Text>
            </View>
          )}

          {!isFetching && filtered.length === 0 && (
            <View
              className="rounded-[24px] border border-slate-200 bg-white py-12 items-center px-6"
              style={styles.surfaceShadow}
            >
              <Text className="text-4xl mb-3">📦</Text>
              <Text className="text-slate-600 font-semibold text-base">
                {search ? "No products match" : "No products yet"}
              </Text>
              <Text className="text-slate-400 text-sm mt-1">
                {search
                  ? "Try a different search term"
                  : 'Tap "+ Add" to add your first product'}
              </Text>
            </View>
          )}

          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              imageUrl={
                (
                  product as Product & { imageUrl?: string }
                ).imageUrl?.startsWith("http")
                  ? (product as Product & { imageUrl?: string }).imageUrl
                  : imageUrlsMap[product.id]
              }
              onPress={() =>
                (navigation as any).navigate("ProductDetail", {
                  id: product.id,
                  product,
                })
              }
              onAdd={() => handleQuickAdjust(product, "add")}
              onSubtract={() => handleQuickAdjust(product, "subtract")}
              adjusting={
                adjustMutation.isPending &&
                (adjustMutation.variables as any)?.id === product.id
              }
              onLongPress={() => setAdjustTarget(product)}
              onToggleFavorite={
                favoriteMutation.isPending
                  ? undefined
                  : () =>
                      favoriteMutation.mutate({
                        id: product.id,
                        isFeatured: !(
                          product as Product & { isFeatured?: boolean }
                        ).isFeatured,
                      })
              }
              listMode={listMode}
            />
          ))}

          {hasMore && (
            <Pressable
              onPress={loadMore}
              disabled={isFetching}
              className="py-4 items-center"
            >
              {isFetching ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <Text className="text-primary font-semibold text-sm">
                  Load more
                </Text>
              )}
            </Pressable>
          )}
          <View className="h-6" />
        </View>
      </ScrollView>

      {/* ── Add Product Modal ─────────────────────────────────────── */}
      <AddProductModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(keepOpen = false) => {
          void qc.invalidateQueries({ queryKey: QUERY_KEYS.products.all() });
          if (!keepOpen) setAddOpen(false);
        }}
        isSmallScreen={isSmall}
        categories={[
          ...new Set(
            allProducts
              .map((p) => p.category)
              .filter((c): c is string => !!c && c.trim() !== ""),
          ),
        ].sort()}
      />

      {/* ── Custom Quantity Adjust Modal ──────────────────────────── */}
      {adjustTarget && (
        <AdjustStockModal
          product={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onAdjusted={() => {
            void qc.invalidateQueries({ queryKey: QUERY_KEYS.products.all() });
            setAdjustTarget(null);
          }}
        />
      )}

      {/* ── All Categories Modal ──────────────────────────────────── */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View className="flex-1 justify-end bg-black/45">
          <TouchableOpacity
            activeOpacity={1}
            className="flex-1"
            onPress={() => setShowCategoryModal(false)}
          />
          <View
            className="bg-white rounded-t-[32px] px-4 pt-3 pb-6"
            style={{ maxHeight: "78%" }}
          >
            <View className="items-center mb-3">
              <View className="w-12 h-1.5 rounded-full bg-slate-200" />
            </View>

            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text className="text-xl font-bold text-slate-800">
                  Explore Categories
                </Text>
                <Text className="text-sm text-slate-400 mt-1">
                  Pick a category to filter products instantly
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(false)}
                activeOpacity={0.8}
                className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                setCategoryFilter(null);
                setShowCategoryModal(false);
              }}
              activeOpacity={0.8}
              className={
                !categoryFilter
                  ? "rounded-2xl border border-primary bg-primary px-4 py-4 mb-3"
                  : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 mb-3"
              }
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text
                    className={
                      !categoryFilter
                        ? "text-xs font-semibold uppercase tracking-wider text-white/80"
                        : "text-xs font-semibold uppercase tracking-wider text-slate-400"
                    }
                  >
                    All items
                  </Text>
                  <Text
                    className={
                      !categoryFilter
                        ? "text-base font-bold text-white mt-1"
                        : "text-base font-bold text-slate-800 mt-1"
                    }
                  >
                    All Products
                  </Text>
                </View>
                <Text
                  className={
                    !categoryFilter
                      ? "text-sm font-semibold text-white"
                      : "text-sm font-semibold text-slate-500"
                  }
                >
                  {allProducts.length}
                </Text>
              </View>
            </TouchableOpacity>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <View className="flex-row flex-wrap justify-between">
                {categories.map((cat) => {
                  const active = categoryFilter === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => {
                        setCategoryFilter(active ? null : cat);
                        setShowCategoryModal(false);
                      }}
                      activeOpacity={0.8}
                      style={{ width: "48%", marginBottom: 12 }}
                      className={
                        active
                          ? "rounded-2xl border border-primary bg-primary/10 px-4 py-4"
                          : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                      }
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-2">
                          <Text
                            className={
                              active
                                ? "text-xs font-semibold uppercase tracking-wider text-primary/70"
                                : "text-xs font-semibold uppercase tracking-wider text-slate-400"
                            }
                          >
                            Category
                          </Text>
                          <Text
                            className={
                              active
                                ? "text-sm font-bold text-primary mt-1"
                                : "text-sm font-bold text-slate-800 mt-1"
                            }
                            numberOfLines={2}
                          >
                            {cat}
                          </Text>
                          <Text
                            className={
                              active
                                ? "text-xs text-primary/80 mt-2"
                                : "text-xs text-slate-400 mt-2"
                            }
                          >
                            {categoryCounts[cat] ?? 0} items
                          </Text>
                        </View>
                        <Ionicons
                          name={
                            active
                              ? "checkmark-circle"
                              : "chevron-forward-circle-outline"
                          }
                          size={18}
                          color={active ? "#e67e22" : "#94a3b8"}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── FAB: Add Items (bottom right) ───────────────────────── */}
      <Pressable
        onPress={() => setAddOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Add item"
        style={{
          position: "absolute",
          bottom: fabBottom,
          right: fabRight,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 24,
          backgroundColor: COLORS.primary,
          ...styles.fabShadow,
        }}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text className="text-white font-bold text-sm">Add Items</Text>
      </Pressable>
    </SafeAreaView>
  );
}

// ── ProductCard ───────────────────────────────────────────────────────────────

function ProductCard({
  product,
  imageUrl,
  onPress,
  onAdd,
  onSubtract,
  adjusting,
  onLongPress,
  onToggleFavorite,
  listMode,
}: {
  product: Product & {
    minStock?: number;
    isFeatured?: boolean;
    cost?: number | string | null;
    wholesalePrice?: number | string | null;
    priceTier2?: number | string | null;
  };
  imageUrl?: string | null;
  onPress?: () => void;
  onAdd: () => void;
  onSubtract: () => void;
  adjusting: boolean;
  onLongPress: () => void;
  onToggleFavorite?: () => void;
  listMode: ListMode;
}) {
  const isCompact = listMode === "compact";
  const status = stockStatus(product);
  const s = STATUS_STYLES[status];
  const stockVal = num(product.stock);
  const price = num(product.price);
  const cost = num(product.cost);
  const wholesalePrice =
    product.wholesalePrice != null ? num(product.wholesalePrice) : null;
  const dealerPrice =
    product.priceTier2 != null ? num(product.priceTier2) : null;
  const hasTiers = wholesalePrice !== null || dealerPrice !== null;
  const quantityText = `QTY: ${stockVal}${product.unit ? ` ${product.unit}` : ""}`;
  const categoryLabel = (product.category ?? "General").trim() || "General";
  const statusTone =
    status === "out"
      ? COLORS.error
      : status === "low"
        ? COLORS.warning
        : COLORS.success;
  const statusBg =
    status === "out"
      ? COLORS.bg.error
      : status === "low"
        ? COLORS.bg.warning
        : COLORS.bg.success;

  const a11yLabel = `${product.name}, ${status === "out" ? "Out of stock" : status === "low" ? "Low stock" : "In stock"}, ${stockVal} ${product.unit ?? "units"}`;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      accessibilityLabel={a11yLabel}
      accessibilityRole="button"
      accessibilityHint="Tap to view details, long-press to adjust stock"
      className={`bg-white border border-slate-200 overflow-hidden ${
        isCompact ? "rounded-[22px] mb-2" : "rounded-[24px] mb-3"
      }`}
      style={({ pressed }) => ({
        backgroundColor: pressed ? COLORS.slate[50] : COLORS.text.inverted,
        ...styles.cardShadow,
      })}
    >
      {onToggleFavorite && (
        <Pressable
          onPress={onToggleFavorite}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className={`absolute z-10 items-center justify-center rounded-full border border-amber-100 bg-amber-50 ${
            isCompact ? "top-3 left-3 h-9 w-9" : "top-4 left-4 h-10 w-10"
          }`}
          accessibilityLabel={
            product.isFeatured ? "Remove from favorites" : "Add to favorites"
          }
        >
          <Ionicons
            name={product.isFeatured ? "star" : "star-outline"}
            size={isCompact ? 18 : 20}
            color={product.isFeatured ? COLORS.warning : COLORS.slate[400]}
          />
        </Pressable>
      )}

      <View
        className={`absolute rounded-full z-10 ${
          isCompact ? "top-3 right-3 px-2 py-1" : "top-4 right-4 px-2.5 py-1"
        }`}
        style={{ backgroundColor: statusTone }}
      >
        <Text className="text-[10px] font-bold uppercase tracking-wide text-white">
          {quantityText}
        </Text>
      </View>

      {isCompact ? (
        <View className="px-3 pt-10 pb-2.5">
          <View className="flex-row items-start gap-2.5">
            <View className="h-10 w-10 rounded-xl bg-primary/10 items-center justify-center overflow-hidden">
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-lg">{categoryIcon(product.category)}</Text>
              )}
            </View>

            <View className="flex-1 min-w-0">
              <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                {product.name}
              </Text>

              <View className="mt-1 flex-row items-center gap-1.5 flex-wrap">
                <Text className="text-[10px] font-semibold uppercase tracking-[0.8px] text-slate-500">
                  {categoryLabel}
                </Text>
                <View
                  className="rounded-full px-1.5 py-0.5"
                  style={{ backgroundColor: statusBg }}
                >
                  <Text className="text-[10px] font-semibold" style={{ color: statusTone }}>
                    {s.label}
                  </Text>
                </View>
                <Text className="text-[10px] font-medium text-slate-600">
                  {stockVal} {product.unit ?? "pcs"}
                </Text>
              </View>

              <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                <View className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                  <Text className="text-[10px] font-semibold text-slate-700">
                    SP ₹{price % 1 === 0 ? price : price.toFixed(2)}
                  </Text>
                </View>
                <View className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                  <Text className="text-[10px] font-semibold text-slate-700">
                    C ₹{cost % 1 === 0 ? cost : cost.toFixed(2)}
                  </Text>
                </View>
                <View className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                  <Text className="text-[10px] font-semibold text-slate-700">
                    M ₹{(price - cost).toFixed(2)}
                  </Text>
                </View>
                {wholesalePrice !== null && (
                  <View className="flex-row items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5">
                    <Text className="text-[9px] font-bold text-emerald-700">W</Text>
                    <Text className="text-[9px] font-semibold text-emerald-600">
                      ₹{wholesalePrice % 1 === 0 ? wholesalePrice : wholesalePrice.toFixed(2)}
                    </Text>
                  </View>
                )}
                {dealerPrice !== null && (
                  <View className="flex-row items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5">
                    <Text className="text-[9px] font-bold text-orange-700">D</Text>
                    <Text className="text-[9px] font-semibold text-orange-600">
                      ₹{dealerPrice % 1 === 0 ? dealerPrice : dealerPrice.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View className="px-4 pt-12 pb-4">
          <View className="flex-row items-start gap-3">
            <View className="h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center overflow-hidden">
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-2xl">{categoryIcon(product.category)}</Text>
              )}
            </View>

            <View className="flex-1 min-w-0">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 min-w-0 pr-2">
                  <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-slate-500">
                    {categoryLabel}
                  </Text>
                  <Text className="mt-1 text-base font-bold text-slate-900" numberOfLines={1}>
                    {product.name}
                  </Text>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    <View className="rounded-full bg-slate-100 px-3 py-1.5">
                      <Text className="text-[11px] font-medium text-slate-600">
                        Stock {stockVal} {product.unit ?? "pcs"}
                      </Text>
                    </View>
                    <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: statusBg }}>
                      <Text className="text-[11px] font-semibold" style={{ color: statusTone }}>
                        {s.label}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View className="mt-3 rounded-2xl bg-slate-50 px-3 py-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 min-w-0">
                <Text className="text-[10px] font-semibold uppercase tracking-[1px] text-slate-500">
                  Sales Price
                </Text>
                <Text className="mt-1 text-sm font-bold text-slate-900">
                  ₹{price % 1 === 0 ? price : price.toFixed(2)}
                </Text>
              </View>
              <View className="flex-1 min-w-0 items-center">
                <Text className="text-[10px] font-semibold uppercase tracking-[1px] text-slate-500">
                  Cost
                </Text>
                <Text className="mt-1 text-sm font-semibold text-slate-700">
                  ₹{cost % 1 === 0 ? cost : cost.toFixed(2)}
                </Text>
              </View>
              <View className="flex-1 min-w-0 items-end">
                <Text className="text-[10px] font-semibold uppercase tracking-[1px] text-slate-500">
                  Margin
                </Text>
                <Text className="mt-1 text-sm font-semibold text-slate-700">
                  ₹{(price - cost).toFixed(2)}
                </Text>
              </View>
            </View>

            {hasTiers && (
              <View className="mt-3 flex-row gap-1.5">
                {wholesalePrice !== null && (
                  <View className="flex-row items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1">
                    <Text className="text-[9px] font-bold text-emerald-700">W</Text>
                    <Text className="text-[9px] font-semibold text-emerald-600">
                      ₹
                      {wholesalePrice % 1 === 0
                        ? wholesalePrice
                        : wholesalePrice.toFixed(2)}
                    </Text>
                  </View>
                )}
                {dealerPrice !== null && (
                  <View className="flex-row items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1">
                    <Text className="text-[9px] font-bold text-orange-700">D</Text>
                    <Text className="text-[9px] font-semibold text-orange-600">
                      ₹
                      {dealerPrice % 1 === 0
                        ? dealerPrice
                        : dealerPrice.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      )}

      <View className="flex-row border-t border-slate-100 bg-white">
        <Pressable
          onPress={() => {
            hapticLight();
            onSubtract();
          }}
          disabled={adjusting || stockVal <= 0}
          accessibilityLabel="Subtract one from stock"
          className={`flex-1 items-center justify-center border-r border-slate-100 ${
            isCompact ? "min-h-11 py-2.5" : "min-h-12 py-3"
          }`}
        >
          <Text
            className={`${isCompact ? "text-xs" : "text-sm"} font-bold ${stockVal <= 0 ? "text-slate-300" : "text-red-500"}`}
          >
            {adjusting ? "Updating..." : "−1 stock"}
          </Text>
        </Pressable>

        <Pressable
          onPress={onLongPress}
          accessibilityLabel="Adjust stock with custom quantity"
          className={`flex-1 items-center justify-center border-r border-slate-100 ${
            isCompact ? "min-h-11 py-2.5" : "min-h-12 py-3"
          }`}
        >
          <Text className={`${isCompact ? "text-xs" : "text-sm"} font-semibold text-slate-500`}>
            Custom qty
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            hapticLight();
            onAdd();
          }}
          disabled={adjusting}
          accessibilityLabel="Add one to stock"
          className={`flex-1 items-center justify-center ${
            isCompact ? "min-h-11 py-2.5" : "min-h-12 py-3"
          }`}
        >
          <Text
            className={`${isCompact ? "text-xs" : "text-sm"} font-bold ${adjusting ? "text-slate-300" : "text-green-600"}`}
          >
            {adjusting ? "Updating..." : "+1 stock"}
          </Text>
        </Pressable>
      </View>

      {adjusting && (
        <View
          className="h-0.5 bg-primary/30"
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
        />
      )}
    </Pressable>
  );
}

// ── AddProductModal ───────────────────────────────────────────────────────────

function AddProductModal({
  visible,
  onClose,
  onCreated,
  isSmallScreen = false,
  categories = [],
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (keepOpen?: boolean) => void;
  isSmallScreen?: boolean;
  categories?: string[];
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("Piece");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("0");
  const [minStock, setMinStock] = useState("5");
  const [barcode, setBarcode] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName("");
    setPrice("");
    setUnit("Piece");
    setCategory("");
    setStock("0");
    setMinStock("5");
    setBarcode("");
  };

  const resetForNext = () => {
    setName("");
    setPrice("");
    setStock("0");
    setMinStock("5");
    setBarcode("");
  };

  const handleBarcodeScan = async (code: string) => {
    setBarcode(code);
    try {
      const { product } = await productApi.byBarcode(code);
      setName(product.name ?? "");
      setPrice(product.price != null ? String(product.price) : "");
      setUnit(product.unit ?? "Piece");
      if (product.category) setCategory(product.category);
      if (product.stock != null) setStock(String(product.stock));
    } catch {
      // Product not in catalog — just keep barcode for new product
    }
  };

  const handleCreate = async (keepOpen = false) => {
    if (!name.trim()) {
      showAlert("Required", "Product name is required");
      return;
    }
    setLoading(true);
    try {
      await productExtApi.create({
        name: name.trim(),
        price: price ? parseFloat(price) : undefined,
        unit: unit.trim() || "Piece",
        category: category.trim() || undefined,
        stock: parseInt(stock) || 0,
        minStock: parseInt(minStock) || 5,
        barcode: barcode.trim() || undefined,
      });
      if (keepOpen) {
        resetForNext();
        onCreated(true);
      } else {
        reset();
        onCreated(false);
      }
    } catch (e: any) {
      showAlert("Error", e.message ?? "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  const UNITS = [
    "Piece",
    "kg",
    "g",
    "litre",
    "ml",
    "packet",
    "box",
    "dozen",
    "bundle",
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView className="flex-1">
          <View
            className={`border-b border-slate-200 ${
              isSmallScreen ? "px-3.5 py-3" : "px-4 py-4"
            }`}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text
                  className={`${
                    isSmallScreen ? "text-lg" : "text-xl"
                  } font-black text-slate-900`}
                >
                  Add Item
                </Text>
                <Text className="text-sm text-slate-500 mt-1">
                  Quick entry for multiple products
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close add item modal"
                className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#475569" />
              </Pressable>
            </View>

            <View className="mt-3 rounded-xl bg-slate-100 p-1 flex-row">
              <View className="flex-1 rounded-lg bg-white px-3 py-2">
                <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-slate-500">
                  Unit
                </Text>
                <Text className="text-sm font-bold text-slate-800 mt-0.5">
                  {unit}
                </Text>
              </View>
              <View className="w-px bg-slate-200 mx-1" />
              <View className="flex-1 rounded-lg bg-white px-3 py-2">
                <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-slate-500">
                  Category
                </Text>
                <Text
                  className="text-sm font-bold text-slate-800 mt-0.5"
                  numberOfLines={1}
                >
                  {category.trim() || "General"}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            className={`flex-1 ${isSmallScreen ? "px-3.5 pt-3" : "px-4 pt-4"}`}
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Product Name *">
              <TextInput
                className={`bg-slate-50 border border-slate-200 rounded-xl px-4 ${
                  isSmallScreen ? "py-2.5" : "py-3"
                } text-sm text-slate-800`}
                placeholder="e.g. Aata, Amul Butter, Surf Excel"
                value={name}
                onChangeText={setName}
                autoFocus
                autoCorrect={false}
              />
            </FormField>

            <View className={`${isSmallScreen ? "gap-2" : "flex-row gap-3"}`}>
              <View className="flex-1">
                <FormField label="Selling Price (₹)">
                  <TextInput
                    className={`bg-slate-50 border border-slate-200 rounded-xl px-4 ${
                      isSmallScreen ? "py-2.5" : "py-3"
                    } text-sm text-slate-800`}
                    placeholder="0"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                  />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Unit">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2 py-1">
                      {UNITS.map((u) => (
                        <TouchableOpacity
                          key={u}
                          onPress={() => setUnit(u)}
                          className={`px-3 py-2 rounded-lg border ${
                            unit === u
                              ? "bg-primary border-primary"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${unit === u ? "text-white" : "text-slate-600"}`}
                          >
                            {u}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </FormField>
              </View>
            </View>

            <FormField label="Category (optional)">
              {categories.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-2"
                >
                  <View className="flex-row gap-2">
                    {categories.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setCategory(c)}
                        className={`px-3 py-2 rounded-lg border ${
                          category === c
                            ? "bg-primary border-primary"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${category === c ? "text-white" : "text-slate-600"}`}
                        >
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
              <TextInput
                className={`bg-slate-50 border border-slate-200 rounded-xl px-4 ${
                  isSmallScreen ? "py-2.5" : "py-3"
                } text-sm text-slate-800`}
                placeholder={
                  categories.length > 0
                    ? "Or type new category"
                    : "e.g. Grocery, Dairy, Personal Care"
                }
                value={category}
                onChangeText={setCategory}
                autoCorrect={false}
              />
            </FormField>

            <FormField label="Barcode (optional)">
              <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <TextInput
                  className={`flex-1 px-4 ${isSmallScreen ? "py-2.5" : "py-3"} text-sm text-slate-800`}
                  placeholder="Scan or type barcode"
                  value={barcode}
                  onChangeText={setBarcode}
                  autoCorrect={false}
                  keyboardType="numeric"
                />
                <Pressable
                  onPress={() => setScanOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Scan item barcode"
                  className="w-12 h-12 items-center justify-center border-l border-slate-200"
                >
                  <Ionicons name="barcode-outline" size={24} color="#e67e22" />
                </Pressable>
              </View>
            </FormField>
            <BarcodeScanner
              visible={scanOpen}
              onClose={() => setScanOpen(false)}
              onScan={handleBarcodeScan}
              hint="Scan product barcode to prefill"
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField label="Opening Stock">
                  <TextInput
                    className={`bg-slate-50 border border-slate-200 rounded-xl px-4 ${
                      isSmallScreen ? "py-2.5" : "py-3"
                    } text-sm text-slate-800`}
                    placeholder="0"
                    value={stock}
                    onChangeText={setStock}
                    keyboardType="number-pad"
                  />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Reorder Point">
                  <TextInput
                    className={`bg-slate-50 border border-slate-200 rounded-xl px-4 ${
                      isSmallScreen ? "py-2.5" : "py-3"
                    } text-sm text-slate-800`}
                    placeholder="5"
                    value={minStock}
                    onChangeText={setMinStock}
                    keyboardType="number-pad"
                  />
                </FormField>
              </View>
            </View>

            <View className="bg-primary/10 rounded-xl p-4 mt-2">
              <Text className="text-xs text-primary-700 font-medium">
                💡 Voice tip: After adding, say "50 kilo aata aaya" to add
                incoming stock by voice instantly.
              </Text>
            </View>

            <View className="h-4" />
          </ScrollView>

          <View
            className={`border-t border-slate-200 bg-white ${
              isSmallScreen ? "px-3.5 py-2.5" : "px-4 py-3"
            }`}
          >
            <View className={`${isSmallScreen ? "gap-2" : "flex-row gap-3"}`}>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cancel add item"
                className={`flex-1 rounded-xl border border-slate-200 items-center justify-center ${
                  isSmallScreen ? "min-h-[42]" : "min-h-[46]"
                }`}
              >
                <Text className="text-sm font-semibold text-slate-600">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void handleCreate(true)}
                disabled={loading || !name.trim()}
                accessibilityRole="button"
                accessibilityLabel="Save and add another item"
                className={`flex-1 rounded-xl items-center justify-center ${
                  isSmallScreen ? "min-h-[42]" : "min-h-[46]"
                } ${loading || !name.trim() ? "bg-slate-200" : "bg-slate-800"}`}
              >
                <Text
                  className={`text-sm font-bold ${
                    loading || !name.trim() ? "text-slate-400" : "text-white"
                  }`}
                >
                  {loading ? "Saving..." : "Save + Next"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void handleCreate(false)}
                disabled={loading || !name.trim()}
                accessibilityRole="button"
                accessibilityLabel="Save and close add item"
                className={`flex-1 rounded-xl items-center justify-center ${
                  isSmallScreen ? "min-h-[42]" : "min-h-[46]"
                } ${loading || !name.trim() ? "bg-slate-200" : "bg-primary"}`}
              >
                <Text
                  className={`text-sm font-bold ${
                    loading || !name.trim() ? "text-slate-400" : "text-white"
                  }`}
                >
                  {loading ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── AdjustStockModal ──────────────────────────────────────────────────────────

function AdjustStockModal({
  product,
  onClose,
  onAdjusted,
}: {
  product: Product & { minStock?: number };
  onClose: () => void;
  onAdjusted: () => void;
}) {
  const [qty, setQty] = useState("1");
  const [op, setOp] = useState<"add" | "subtract">("add");
  const [reason, setReason] = useState("Manual adjustment");
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    const quantity = parseInt(qty);
    if (!quantity || quantity <= 0) {
      showAlert("Invalid", "Enter a valid quantity");
      return;
    }
    const currentStock = num(product.stock);
    if (op === "subtract" && quantity > currentStock) {
      showAlert(
        "Not enough stock",
        `Only ${currentStock} units available to subtract`,
      );
      return;
    }
    setLoading(true);
    try {
      await productExtApi.adjustStock(product.id, quantity, op, reason);
      onAdjusted();
    } catch (e: any) {
      showAlert("Error", e.message ?? "Adjustment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 bg-black/40 justify-end"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="bg-white rounded-t-3xl px-5 pt-5 pb-10"
        >
          <View className="flex-row items-center mb-4">
            <View className="flex-1">
              <Text className="text-lg font-black text-slate-800">
                Adjust Stock
              </Text>
              <Text className="text-sm text-slate-500">{product.name}</Text>
              <Text className="text-xs text-slate-400">
                Current stock: {num(product.stock)} {product.unit ?? ""}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-slate-400 text-xl">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Add / Subtract toggle */}
          <View className="flex-row bg-slate-100 rounded-xl p-1 mb-4">
            {(["add", "subtract"] as const).map((o) => (
              <TouchableOpacity
                key={o}
                onPress={() => setOp(o)}
                className={`flex-1 py-2.5 rounded-lg items-center ${op === o ? "bg-white shadow-sm" : ""}`}
              >
                <Text
                  className={`font-bold text-sm ${
                    op === o
                      ? o === "add"
                        ? "text-green-600"
                        : "text-red-500"
                      : "text-slate-400"
                  }`}
                >
                  {o === "add" ? "+ Add Stock" : "− Remove Stock"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quantity input */}
          <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">
            Quantity
          </Text>
          <View className="flex-row items-center border border-slate-200 rounded-xl overflow-hidden mb-4">
            <TouchableOpacity
              onPress={() =>
                setQty(String(Math.max(1, parseInt(qty || "1") - 1)))
              }
              className="px-5 py-3 border-r border-slate-200"
            >
              <Text className="text-xl font-black text-slate-600">−</Text>
            </TouchableOpacity>
            <TextInput
              className="flex-1 text-center text-xl font-black text-slate-800 py-3"
              value={qty}
              onChangeText={(t) => setQty(t.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              onPress={() => setQty(String(parseInt(qty || "0") + 1))}
              className="px-5 py-3 border-l border-slate-200"
            >
              <Text className="text-xl font-black text-slate-600">+</Text>
            </TouchableOpacity>
          </View>

          {/* Reason */}
          <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">
            Reason
          </Text>
          <TextInput
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 mb-5"
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Supplier delivery, Damage"
          />

          <TouchableOpacity
            onPress={handleApply}
            disabled={loading}
            className={`py-4 rounded-2xl items-center ${
              loading
                ? "bg-slate-200"
                : op === "add"
                  ? "bg-green-600"
                  : "bg-red-500"
            }`}
          >
            <Text className="text-white font-black text-base">
              {loading
                ? "Applying…"
                : `${op === "add" ? "Add" : "Remove"} ${qty || 0} ${product.unit ?? "units"}`}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── FormField wrapper ─────────────────────────────────────────────────────────

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-slate-500 uppercase mb-1.5">
        {label}
      </Text>
      {children}
    </View>
  );
}

// ── Category icon helper ──────────────────────────────────────────────────────

function categoryIcon(category?: string): string {
  if (!category) return "📦";
  const c = category.toLowerCase();
  if (c.includes("dairy") || c.includes("milk")) return "🥛";
  if (
    c.includes("grocery") ||
    c.includes("grain") ||
    c.includes("atta") ||
    c.includes("rice")
  )
    return "🌾";
  if (c.includes("oil") || c.includes("ghee")) return "🫙";
  if (c.includes("personal") || c.includes("beauty") || c.includes("soap"))
    return "🧴";
  if (
    c.includes("beverag") ||
    c.includes("drink") ||
    c.includes("tea") ||
    c.includes("coffee")
  )
    return "☕";
  if (c.includes("snack") || c.includes("biscuit") || c.includes("chips"))
    return "🍪";
  if (c.includes("vegetable") || c.includes("sabzi")) return "🥦";
  if (c.includes("fruit")) return "🍎";
  if (c.includes("pharma") || c.includes("medicine") || c.includes("drug"))
    return "💊";
  if (c.includes("tobacco") || c.includes("pan")) return "🚬";
  if (c.includes("clean") || c.includes("detergent")) return "🧹";
  return "📦";
}
