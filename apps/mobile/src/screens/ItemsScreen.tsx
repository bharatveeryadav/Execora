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
  RefreshControl,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi, apiFetch } from "@execora/shared";
import { BarcodeScanner } from "../components/common/BarcodeScanner";
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
};

// ── Filter type ───────────────────────────────────────────────────────────────

type FilterMode = "all" | "low" | "out";

// ── Main screen ───────────────────────────────────────────────────────────────

export function ItemsScreen() {
  const qc = useQueryClient();
  useWsInvalidation(["products", "lowStock"]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<
    (Product & { minStock?: number }) | null
  >(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const {
    data: allData,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["products", "mobile", "all"],
    queryFn: () => productApi.list(1, 200),
    staleTime: 30_000,
  });

  const { data: lowData } = useQuery({
    queryKey: ["products", "mobile", "lowStock"],
    queryFn: () => productExtApi.lowStock(),
    staleTime: 30_000,
  });

  // ── Derived lists ─────────────────────────────────────────────────────────

  const allProducts: Array<Product & { minStock?: number }> =
    (allData?.products as Array<Product & { minStock?: number }>) ?? [];
  const lowStockIds = useMemo(
    () => new Set((lowData?.products ?? []).map((p) => p.id)),
    [lowData],
  );

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
    if (filter === "out") return list.filter((p) => num(p.stock) <= 0);
    if (filter === "low") return list.filter((p) => lowStockIds.has(p.id));
    return list;
  }, [allProducts, search, filter, lowStockIds]);

  const outCount = allProducts.filter((p) => num(p.stock) <= 0).length;
  const lowCount = lowData?.products.length ?? 0;

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

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View className="bg-card px-4 pt-2 pb-3 border-b border-slate-200">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-bold tracking-tight text-slate-800">Stock</Text>
            <Text className="text-xs text-slate-400">
              {allProducts.length} products
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setAddOpen(true)}
            activeOpacity={0.7}
            className="bg-primary px-4 min-h-[44px] rounded-xl flex-row items-center justify-center gap-1"
          >
            <Text className="text-white font-bold text-sm">+ Add</Text>
          </TouchableOpacity>
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
        <View className="flex-row gap-2">
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
      </View>

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
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
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
            onAdd={() => handleQuickAdjust(product, "add")}
            onSubtract={() => handleQuickAdjust(product, "subtract")}
            adjusting={
              adjustMutation.isPending &&
              (adjustMutation.variables as any)?.id === product.id
            }
            onLongPress={() => setAdjustTarget(product)}
          />
        ))}

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
    </SafeAreaView>
  );
}

// ── ProductCard ───────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onAdd,
  onSubtract,
  adjusting,
  onLongPress,
}: {
  product: Product & { minStock?: number };
  onAdd: () => void;
  onSubtract: () => void;
  adjusting: boolean;
  onLongPress: () => void;
}) {
  const status = stockStatus(product);
  const s = STATUS_STYLES[status];
  const stockVal = num(product.stock);
  const price = num(product.price);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onLongPress={onLongPress}
      delayLongPress={500}
      className="bg-white rounded-2xl border border-slate-200 mb-3 overflow-hidden"
    >
      <View className="flex-row items-center px-4 py-3">
        {/* Category icon */}
        <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center mr-3">
          <Text className="text-xl">{categoryIcon(product.category)}</Text>
        </View>

        {/* Name + meta */}
        <View className="flex-1 mr-3">
          <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
            {product.name}
          </Text>
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
          onPress={onSubtract}
          disabled={adjusting || stockVal <= 0}
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
          className="flex-1 py-2.5 items-center border-r border-slate-100"
        >
          <Text className="text-xs text-slate-400 font-medium">Custom qty</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onAdd}
          disabled={adjusting}
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
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
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
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800"
                placeholder="e.g. Grocery, Dairy, Personal Care"
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
