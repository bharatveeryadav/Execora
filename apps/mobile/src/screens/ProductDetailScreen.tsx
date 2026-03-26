/**
 * ProductDetailScreen — Read-only product details view.
 * Double-tap any field to open Update Product page for editing.
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { showAlert } from "../lib/alerts";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi, apiFetch } from "@execora/shared";
import { Ionicons } from "@expo/vector-icons";
import { useWsInvalidation } from "../hooks/useWsInvalidation";
import { useResponsive } from "../hooks/useResponsive";

function num(v: string | number | undefined | null): number {
  if (v === undefined || v === null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isFinite(n) ? n : 0;
}

const DOUBLE_TAP_DELAY = 400;

function useDoubleTap(onDoubleTap: () => void) {
  const lastTap = useRef(0);
  return () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      lastTap.current = 0;
      onDoubleTap();
    } else {
      lastTap.current = now;
    }
  };
}

type Props = NativeStackScreenProps<import("../navigation").ItemsStackParams, "ProductDetail">;

export function ProductDetailScreen({ navigation, route }: Props) {
  const qc = useQueryClient();
  const { contentPad } = useResponsive();
  useWsInvalidation(["products", "lowStock"]);
  const params = route.params;
  const id = params?.id ?? "";
  const passedProduct = params?.product;

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [gstRate, setGstRate] = useState("");
  const [cost, setCost] = useState("");
  const [mrp, setMrp] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("piece");
  const [category, setCategory] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [barcode, setBarcode] = useState("");
  const [description, setDescription] = useState("");
  const [showAddDetailsBanner, setShowAddDetailsBanner] = useState(true);

  const goToUpdate = () => {
    navigation.navigate("UpdateProduct", { id, product });
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productApi.get(id),
    enabled: !!id,
    retry: false,
  });

  const fetchedProduct = data?.product as Record<string, unknown> | undefined;
  const product = (fetchedProduct ?? passedProduct) as Record<string, unknown> | undefined;
  const rawImageUrl = product?.["imageUrl"] as string | undefined;
  const needsPresigned = rawImageUrl && !rawImageUrl.startsWith("http");

  const { data: imageUrlData } = useQuery({
    queryKey: ["productImageUrl", id],
    queryFn: () => apiFetch<{ url: string }>(`/api/v1/products/${id}/image-url`),
    enabled: Boolean(id && rawImageUrl && needsPresigned),
    retry: false,
  });
  const imageUrl = rawImageUrl?.startsWith("http") ? rawImageUrl : (imageUrlData as { url?: string } | undefined)?.url;

  useEffect(() => {
    if (product) {
      setName(String(product.name ?? ""));
      setPrice(String(num(product.price as number) ?? ""));
      setGstRate(String(num(product.gstRate as number) ?? ""));
      setCost(String(num(product.cost as number) ?? ""));
      setMrp(String(num(product.mrp as number) ?? ""));
      setStock(String(num(product.stock as number) ?? ""));
      setUnit(String(product.unit ?? "piece"));
      setCategory(String(product.category ?? ""));
      setHsnCode(String(product.hsnCode ?? ""));
      setBarcode(String(product.barcode ?? ""));
      setDescription(String(product.description ?? ""));
    }
  }, [product]);

  const adjustStockMutation = useMutation({
    mutationFn: ({ op }: { op: "add" | "subtract" }) =>
      apiFetch<{ product: { stock?: number } }>(`/api/v1/products/${id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: 1, operation: op }),
      }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["products"] });
      void qc.invalidateQueries({ queryKey: ["product", id] });
      if (data?.product?.stock !== undefined) setStock(String(data.product.stock));
    },
    onError: (e: Error) => showAlert("Error", e.message ?? "Stock update failed"),
  });

  const priceWithTax = num(price) * (1 + num(gstRate) / 100);
  const costWithTax = num(cost) * (1 + num(gstRate) / 100);

  if (!id) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-slate-600">No product selected</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 bg-primary px-6 py-2 rounded-xl">
            <Text className="text-white font-semibold">Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isError && !passedProduct) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-slate-600">Product not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 bg-primary px-6 py-2 rounded-xl">
            <Text className="text-white font-semibold">Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if ((isLoading || !product) && !passedProduct) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#e67e22" />
          <Text className="mt-2 text-slate-500">Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasMissingDetails = !category || !hsnCode || !barcode || !description;
  const displayUnit = (unit === "kg" || unit === "KGS" ? "KGS" : unit).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header: back, product name, menu */}
      <View style={{ paddingHorizontal: contentPad, paddingVertical: 12 }} className="flex-row items-center justify-between border-b border-slate-200 bg-white">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800 flex-1 text-center" numberOfLines={1}>
          {name || "Product"}
        </Text>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity onPress={goToUpdate} className="p-2">
            <Ionicons name="create-outline" size={22} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => showAlert("More", "Options coming soon")} className="p-2">
            <Ionicons name="ellipsis-horizontal" size={22} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Missing Details banner */}
      {showAddDetailsBanner && hasMissingDetails && (
        <TouchableOpacity
          onPress={goToUpdate}
          activeOpacity={0.8}
          style={{ marginHorizontal: contentPad, marginTop: 12, paddingHorizontal: contentPad, paddingVertical: 12 }}
          className="flex-row items-center justify-between rounded-xl bg-slate-200/80"
        >
          <Text className="text-sm font-medium text-slate-700">Add Missing Details — Tap to edit</Text>
          <TouchableOpacity onPress={() => setShowAddDetailsBanner(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={20} color="#64748b" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Product Details card — read-only, double-tap to edit */}
        <View style={{ marginHorizontal: contentPad, marginTop: contentPad }} className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <Text style={{ paddingHorizontal: contentPad, paddingTop: contentPad, paddingBottom: 8 }} className="text-base font-bold text-slate-800">Product Details</Text>
          <Text style={{ paddingHorizontal: contentPad, paddingBottom: 12 }} className="text-xs text-slate-500">Double-tap any field to edit</Text>

          <DetailRow label="Product Name*" value={name} badge={num(stock) > 0 ? "Online" : undefined} onDoubleTap={goToUpdate} contentPad={contentPad} />
          <DetailRow label="Selling Price" sublabel="With Tax" value={`₹${priceWithTax.toFixed(2)}`} onDoubleTap={goToUpdate} contentPad={contentPad} />
          <DetailRow label="Tax Rate" value={`${gstRate}%`} onDoubleTap={goToUpdate} contentPad={contentPad} />
          <DetailRow label="Purchase Price" sublabel="With Tax" value={`₹${costWithTax.toFixed(2)}`} onDoubleTap={goToUpdate} contentPad={contentPad} />
          <DetailRow label="Quantity" value={stock} valueGreen onDoubleTap={goToUpdate} contentPad={contentPad} />
          <DetailRow label="Unit" value={displayUnit} onDoubleTap={goToUpdate} contentPad={contentPad} />
          <DetailRow label="Category" value={category || "—"} addButton={!category} onDoubleTap={goToUpdate} contentPad={contentPad} />
          <DetailRow label="HSN/SAC Code" value={hsnCode || "—"} addButton={!hsnCode} onDoubleTap={goToUpdate} contentPad={contentPad} />
          <DetailRow label="Type" value="Product" contentPad={contentPad} />
          <DetailRow label="MRP (₹)" value={mrp ? `₹${parseFloat(mrp).toFixed(2)}` : "—"} onDoubleTap={goToUpdate} contentPad={contentPad} />
          <DetailRow label="Barcode" value={barcode || "—"} addButton={!barcode} onDoubleTap={goToUpdate} contentPad={contentPad} />

          <View style={{ paddingHorizontal: contentPad, paddingVertical: 12 }} className="border-t border-slate-100">
            <Text className="text-xs text-slate-500 mb-1">Product Description</Text>
            <TouchableOpacity onPress={goToUpdate} className="py-2">
              <Text className="text-sm text-slate-800">{description || "—"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Footer: STOCK OUT / STOCK IN */}
      <View style={{ paddingHorizontal: contentPad, paddingTop: 12, paddingBottom: 24 }} className="flex-row border-t border-slate-200 bg-white">
        <TouchableOpacity
          onPress={() => adjustStockMutation.mutate({ op: "subtract" })}
          disabled={adjustStockMutation.isPending || num(stock) <= 0}
          className="flex-1 py-3.5 rounded-xl bg-red-500 items-center justify-center mr-2"
          style={{ opacity: num(stock) <= 0 ? 0.5 : 1 }}
        >
          {adjustStockMutation.isPending && (adjustStockMutation.variables as { op: string })?.op === "subtract" ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">STOCK OUT</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => adjustStockMutation.mutate({ op: "add" })}
          disabled={adjustStockMutation.isPending}
          className="flex-1 py-3.5 rounded-xl bg-green-500 items-center justify-center ml-2"
        >
          {adjustStockMutation.isPending && (adjustStockMutation.variables as { op: string })?.op === "add" ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">STOCK IN</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  sublabel,
  value,
  valueGreen,
  addButton,
  badge,
  onDoubleTap,
  contentPad = 16,
}: {
  label: string;
  sublabel?: string;
  value: string;
  valueGreen?: boolean;
  addButton?: boolean;
  badge?: string;
  onDoubleTap?: () => void;
  contentPad?: number;
}) {
  const handlePress = useDoubleTap(onDoubleTap ?? (() => {}));

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={onDoubleTap ? 0.7 : 1} disabled={!onDoubleTap}>
      <View style={{ paddingHorizontal: contentPad, paddingVertical: 12 }} className="border-t border-slate-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View>
              <Text className="text-xs text-slate-500">{label}</Text>
              {sublabel && <Text className="text-[10px] text-slate-400 mt-0.5">{sublabel}</Text>}
            </View>
            {badge && (
              <View className="bg-green-100 px-2 py-0.5 rounded">
                <Text className="text-[10px] font-semibold text-green-700">{badge}</Text>
              </View>
            )}
          </View>
          {addButton && (
            <View className="bg-slate-200 px-3 py-1 rounded-lg">
              <Text className="text-xs font-semibold text-slate-600">ADD</Text>
            </View>
          )}
        </View>
        <Text className={`text-sm font-medium mt-1 ${valueGreen ? "text-green-600" : "text-slate-800"}`}>
          {value || "—"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
