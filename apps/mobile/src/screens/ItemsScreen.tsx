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

import React, { useState, useCallback, useMemo } from "react";
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
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi, apiFetch } from "@execora/shared";
import { BarcodeScanner } from "../components/common/BarcodeScanner";
import { hapticLight } from "../lib/haptics";
import { storage } from "../lib/storage";
import type { Product } from "@execora/shared";
import { Ionicons } from "@expo/vector-icons";
import { useWsInvalidation } from "../hooks/useWsInvalidation";

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

// ── API helpers not yet in shared productApi ──────────────────────────────────

const productExtApi = {
  lowStock: () =>
    apiFetch<{ products: Array<Product & { minStock?: number }> }>(
      "/api/v1/products/low-stock",
    ),

  getImageUrls: (ids: string[]) =>
    apiFetch<Record<string, string>>(
      `/api/v1/products/image-urls?ids=${ids.slice(0, 50).join(",")}`,
    ),

  adjustStock: (
    id: string,
    quantity: number,
    operation: "add" | "subtract",
    reason = "Mobile app adjustment",
  ) =>
    apiFetch<{ product: Product & { minStock?: number } }>(
      `/api/v1/products/${id}/stock`,
      {
        method: "PATCH",
        body: JSON.stringify({ quantity, operation, reason }),
      },
    ),

  create: (data: {
    name: string;
    price?: number;
    unit?: string;
    category?: string;
    stock?: number;
    minStock?: number;
    barcode?: string;
  }) =>
    apiFetch<{ product: Product & { minStock?: number } }>("/api/v1/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: { isFeatured?: boolean; name?: string; price?: number; category?: string },
  ) =>
    apiFetch<{ product: Product & { minStock?: number } }>(
      `/api/v1/products/${id}`,
      { method: "PUT", body: JSON.stringify(data) },
    ),
};

// ── Filter & sort types ────────────────────────────────────────────────────────

type FilterMode = "all" | "low" | "out" | "favorites";

type SortMode = "name" | "stockAsc" | "stockDesc" | "price" | "priceDesc" | "category";

type Props = NativeStackScreenProps<import("../navigation").ItemsStackParams, "ItemsList">;

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
    queryKey: ["products", "mobile", "all", page],
    queryFn: () => productApi.list(page, 50),
    staleTime: 30_000,
  });

  const paginated = allData as
    | { products: Product[]; total: number; hasMore?: boolean }
    | undefined;
  const hasMore = paginated?.hasMore ?? false;

  // Accumulate products across pages (Sprint 27)
  React.useEffect(() => {
    const list = (paginated?.products ?? []) as Array<Product & { minStock?: number }>;
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
    queryKey: ["products", "mobile", "lowStock"],
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
      list = list.filter((p) => (p as Product & { isFeatured?: boolean }).isFeatured);

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
    queryKey: ["productImageUrls", imageIds.join(",")],
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
      void qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => {
      Alert.alert("Error", e.message ?? "Stock adjustment failed");
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      productExtApi.update(id, { isFeatured }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleQuickAdjust = useCallback(
    (product: Product & { minStock?: number }, op: "add" | "subtract") => {
      const current = num(product.stock);
      if (op === "subtract" && current <= 0) {
        Alert.alert("Cannot subtract", "Stock is already at 0");
        return;
      }
      adjustMutation.mutate({ id: product.id, qty: 1, op });
    },
    [adjustMutation],
  );

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View className="bg-card px-4 pt-2 pb-3 border-b border-slate-200">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-bold tracking-tight text-slate-800">Items</Text>
            <Text className="text-xs text-slate-400">
              {allProducts.length} products
            </Text>
          </View>
          <Pressable
            onPress={() => {
              InteractionManager.runAfterInteractions(() => {
                navigation?.navigate?.("ItemsMenu");
              });
            }}
            className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, backgroundColor: pressed ? "#e2e8f0" : "#f1f5f9" })}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color="#475569" />
          </Pressable>
        </View>

        {/* Search */}
        <View className="bg-slate-100 rounded-xl flex-row items-center px-3 py-2 mb-3">
          <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 text-sm text-slate-800"
            placeholder="Search products..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Filter chips */}
        <View className="flex-row gap-2 flex-wrap">
          {(
            [
              { key: "all", label: `All (${allProducts.length})` },
              {
                key: "low",
                label: `🟡 Low (${lowCount})`,
                disabled: lowCount === 0,
              },
              {
                key: "out",
                label: `🔴 Out (${outCount})`,
                disabled: outCount === 0,
              },
              {
                key: "favorites",
                label: `⭐ Fav (${favoritesCount})`,
                disabled: favoritesCount === 0,
              },
            ] as Array<{ key: FilterMode; label: string; disabled?: boolean }>
          ).map(({ key, label, disabled }) => (
            <TouchableOpacity
              key={key}
              disabled={disabled}
              onPress={() => setFilter(key)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              className={`px-4 py-2 rounded-full border items-center justify-center min-h-[40px] ${
                filter === key
                  ? "bg-primary border-primary"
                  : disabled
                    ? "bg-slate-100 border-slate-200 opacity-40"
                    : "bg-white border-slate-300"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${filter === key ? "text-white" : "text-slate-600"}`}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category filter chips */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row gap-2 mt-2 -mx-4 px-4"
            contentContainerStyle={{ gap: 8 }}
          >
            <TouchableOpacity
              onPress={() => setCategoryFilter(null)}
              activeOpacity={0.7}
              className={`px-3 py-1.5 rounded-full border items-center justify-center min-h-[32px] ${
                !categoryFilter ? "bg-slate-700 border-slate-700" : "bg-white border-slate-200"
              }`}
            >
              <Text className={`text-xs font-medium ${!categoryFilter ? "text-white" : "text-slate-600"}`}>
                All
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                activeOpacity={0.7}
                className={`px-3 py-1.5 rounded-full border items-center justify-center min-h-[32px] ${
                  categoryFilter === cat ? "bg-slate-700 border-slate-700" : "bg-white border-slate-200"
                }`}
              >
                <Text className={`text-xs font-medium ${categoryFilter === cat ? "text-white" : "text-slate-600"}`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Sort chips (Sprint 24 — sort by quantity) */}
        <View className="flex-row gap-2 mt-2 flex-wrap">
          {(
            [
              { key: "name" as SortMode, label: "Name" },
              { key: "stockAsc" as SortMode, label: "Stock ↑" },
              { key: "stockDesc" as SortMode, label: "Stock ↓" },
              { key: "price" as SortMode, label: "Price ↑" },
              { key: "priceDesc" as SortMode, label: "Price ↓" },
              { key: "category" as SortMode, label: "Category" },
            ] as Array<{ key: SortMode; label: string }>
          ).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setSortBy(key)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              className={`px-3 py-1.5 rounded-full border items-center justify-center min-h-[36px] ${
                sortBy === key ? "bg-slate-600 border-slate-600" : "bg-white border-slate-200"
              }`}
            >
              <Text
                className={`text-xs font-medium ${sortBy === key ? "text-white" : "text-slate-600"}`}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── First-time hint (Sprint 29) ───────────────────────────── */}
      {showHint && (
        <View className="mx-4 mt-3 flex-row items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <Text className="flex-1 text-sm text-slate-800">
            Tap <Text className="font-bold">+</Text> / <Text className="font-bold">−</Text> to adjust stock. Long-press for custom qty.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setShowHint(false);
              storage.set("items-hint-dismissed", "1");
            }}
            className="ml-2"
          >
            <Text className="text-primary text-xs font-semibold">Got it</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Low-stock alert banner (PRD F-03.3) ───────────────────── */}
      {lowCount > 0 && filter === "all" && !search && (
        <TouchableOpacity
          onPress={() => setFilter("low")}
          className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex-row items-center"
        >
          <Text className="text-lg mr-2">⚠️</Text>
          <View className="flex-1">
            <Text className="text-sm font-bold text-amber-800">
              {lowCount} item{lowCount !== 1 ? "s" : ""} running low
            </Text>
            <Text className="text-xs text-amber-600">
              Tap to review & restock
            </Text>
          </View>
          <Text className="text-amber-500">›</Text>
        </TouchableOpacity>
      )}

      {/* ── Product list ───────────────────────────────────────────── */}
      <ScrollView
        className="flex-1 px-4 pt-3"
        refreshControl={
          <RefreshControl
            refreshing={isFetching && page === 1}
            onRefresh={() => {
              setPage(1);
              setAccumulatedProducts([]);
              void qc.invalidateQueries({ queryKey: ["products"] });
            }}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const padding = 100;
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - padding;
          if (isCloseToBottom && hasMore && !isFetching) loadMore();
        }}
        scrollEventThrottle={200}
        keyboardShouldPersistTaps="handled"
      >
        {isFetching && allProducts.length === 0 && (
          <View className="py-12 items-center">
            <ActivityIndicator color="#e67e22" />
            <Text className="text-slate-400 text-sm mt-2">
              Loading products…
            </Text>
          </View>
        )}

        {!isFetching && filtered.length === 0 && (
          <View className="py-12 items-center">
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
              (product as Product & { imageUrl?: string }).imageUrl?.startsWith("http")
                ? (product as Product & { imageUrl?: string }).imageUrl
                : imageUrlsMap[product.id]
            }
            onPress={() => navigation.navigate("ProductDetail" as never, { id: product.id, product } as never)}
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
                      isFeatured: !(product as Product & { isFeatured?: boolean }).isFeatured,
                    })
            }
          />
        ))}

        {hasMore && (
          <TouchableOpacity
            onPress={loadMore}
            disabled={isFetching}
            className="py-4 items-center"
          >
            {isFetching ? (
              <ActivityIndicator color="#e67e22" size="small" />
            ) : (
              <Text className="text-primary font-semibold text-sm">
                Load more
              </Text>
            )}
          </TouchableOpacity>
        )}
        <View className="h-6" />
      </ScrollView>

      {/* ── Add Product Modal ─────────────────────────────────────── */}
      <AddProductModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          void qc.invalidateQueries({ queryKey: ["products"] });
          setAddOpen(false);
        }}
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
            void qc.invalidateQueries({ queryKey: ["products"] });
            setAdjustTarget(null);
          }}
        />
      )}

      {/* ── FAB: Add Items (bottom right) ───────────────────────── */}
      <TouchableOpacity
        onPress={() => setAddOpen(true)}
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
        }}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text className="text-white font-bold text-sm">Add Items</Text>
      </TouchableOpacity>
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
}: {
  product: Product & { minStock?: number; isFeatured?: boolean };
  imageUrl?: string | null;
  onPress?: () => void;
  onAdd: () => void;
  onSubtract: () => void;
  adjusting: boolean;
  onLongPress: () => void;
  onToggleFavorite?: () => void;
}) {
  const status = stockStatus(product);
  const s = STATUS_STYLES[status];
  const stockVal = num(product.stock);
  const price = num(product.price);

  const a11yLabel = `${product.name}, ${status === "out" ? "Out of stock" : status === "low" ? "Low stock" : "In stock"}, ${stockVal} ${product.unit ?? "units"}`;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      accessibilityLabel={a11yLabel}
      accessibilityRole="button"
      accessibilityHint="Tap to view details, long-press to adjust stock"
      className="bg-white rounded-2xl border border-slate-200 mb-3 overflow-hidden"
    >
      <View className="flex-row items-center px-4 py-3">
        {/* Product image or category icon */}
        <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center mr-3 overflow-hidden">
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Text className="text-xl">{categoryIcon(product.category)}</Text>
          )}
        </View>

        {/* Name + meta */}
        <View className="flex-1 mr-2">
          <View className="flex-row items-center gap-1">
            <Text className="text-sm font-bold text-slate-800 flex-1" numberOfLines={1}>
              {product.name}
            </Text>
            {onToggleFavorite && (
              <TouchableOpacity
                onPress={onToggleFavorite}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="p-1"
                accessibilityLabel={product.isFeatured ? "Remove from favorites" : "Add to favorites"}
              >
                <Ionicons
                  name={product.isFeatured ? "star" : "star-outline"}
                  size={18}
                  color={product.isFeatured ? "#f59e0b" : "#94a3b8"}
                />
              </TouchableOpacity>
            )}
          </View>
          <View className="flex-row items-center gap-2 mt-0.5">
            {product.category ? (
              <Text className="text-xs text-slate-400">{product.category}</Text>
            ) : null}
            {product.unit ? (
              <Text className="text-xs text-slate-400">· {product.unit}</Text>
            ) : null}
          </View>
        </View>

        {/* Price */}
        {price > 0 && (
          <Text className="text-sm font-bold text-slate-700 mr-3">
            ₹{price % 1 === 0 ? price : price.toFixed(2)}
          </Text>
        )}

        {/* Stock badge */}
        <View className={`px-2 py-1 rounded-lg ${s.bg} mr-3`}>
          <Text className={`text-xs font-bold ${s.text}`}>
            {s.dot} {stockVal > 0 ? stockVal : s.label}
          </Text>
        </View>
      </View>

      {/* Quick stock actions (PRD F-03.2 — adjustment trigger) */}
      <View className="flex-row border-t border-slate-100">
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            onSubtract();
          }}
          disabled={adjusting || stockVal <= 0}
          accessibilityLabel="Subtract one from stock"
          className="flex-1 py-2.5 items-center border-r border-slate-100"
        >
          <Text
            className={`text-lg font-black ${stockVal <= 0 ? "text-slate-200" : "text-red-500"}`}
          >
            {adjusting ? "…" : "−"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onLongPress}
          accessibilityLabel="Adjust stock with custom quantity"
          className="flex-1 py-2.5 items-center border-r border-slate-100"
        >
          <Text className="text-xs text-slate-400 font-medium">Custom qty</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            hapticLight();
            onAdd();
          }}
          disabled={adjusting}
          accessibilityLabel="Add one to stock"
          className="flex-1 py-2.5 items-center"
        >
          <Text
            className={`text-lg font-black ${adjusting ? "text-slate-200" : "text-green-600"}`}
          >
            {adjusting ? "…" : "+"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── AddProductModal ───────────────────────────────────────────────────────────

function AddProductModal({
  visible,
  onClose,
  onCreated,
  categories = [],
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
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

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Product name is required");
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
      reset();
      onCreated();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to add product");
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
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center border-b border-slate-200 px-4 py-4">
            <TouchableOpacity onPress={onClose} className="mr-3">
              <Text className="text-slate-500 text-base">✕</Text>
            </TouchableOpacity>
            <Text className="text-lg font-black text-slate-800 flex-1">
              Add Product
            </Text>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading || !name.trim()}
              className={`px-4 py-2 rounded-xl ${loading || !name.trim() ? "bg-slate-200" : "bg-primary"}`}
            >
              <Text
                className={`font-bold text-sm ${loading || !name.trim() ? "text-slate-400" : "text-white"}`}
              >
                {loading ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-4 pt-4"
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Product Name *">
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800"
                placeholder="e.g. Aata, Amul Butter, Surf Excel"
                value={name}
                onChangeText={setName}
                autoFocus
                autoCorrect={false}
              />
            </FormField>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField label="Selling Price (₹)">
                  <TextInput
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800"
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
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800"
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
                  className="flex-1 px-4 py-3 text-sm text-slate-800"
                  placeholder="Scan or type barcode"
                  value={barcode}
                  onChangeText={setBarcode}
                  autoCorrect={false}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  onPress={() => setScanOpen(true)}
                  className="w-12 h-12 items-center justify-center border-l border-slate-200"
                >
                  <Ionicons name="barcode-outline" size={24} color="#e67e22" />
                </TouchableOpacity>
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
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800"
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
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800"
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

            <View className="h-8" />
          </ScrollView>
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
      Alert.alert("Invalid", "Enter a valid quantity");
      return;
    }
    const currentStock = num(product.stock);
    if (op === "subtract" && quantity > currentStock) {
      Alert.alert(
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
      Alert.alert("Error", e.message ?? "Adjustment failed");
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
