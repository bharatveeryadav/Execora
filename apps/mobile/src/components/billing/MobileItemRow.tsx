/**
 * MobileItemRow — Compact invoice item row with inline editing
 * Supports product search, barcode scanning, and compact/expanded states
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { fuzzyFilter, type BillingItem, type Product } from "@execora/shared";
import { productApi } from "../../lib/api";
import { BarcodeScanner } from "../common/BarcodeScanner";
import { showError } from "../../lib/alerts";

export interface MobileItemRowProps {
  item: BillingItem;
  catalog: Product[];
  isFirst: boolean;
  getEffectivePrice: (
    p: Product & {
      wholesalePrice?: number | string | null;
      priceTier2?: number | string | null;
      priceTier3?: number | string | null;
    },
  ) => number;
  onUpdate: (patch: Partial<BillingItem>) => void;
  onRemove: () => void;
}

export function MobileItemRow({
  item,
  catalog,
  isFirst,
  getEffectivePrice,
  onUpdate,
  onRemove,
}: MobileItemRowProps) {
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const hasProduct = item.name.trim().length > 0;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(item.name.trim()), 80);
    return () => clearTimeout(t);
  }, [item.name]);

  const { data: searchData } = useQuery({
    queryKey: ["product-search", debouncedQ],
    queryFn: () => productApi.search(debouncedQ),
    enabled: debouncedQ.length >= 1,
    staleTime: 30_000,
  });

  const instantHits = useMemo(
    () => fuzzyFilter(catalog, item.name),
    [catalog, item.name],
  );
  const suggestions: Product[] =
    item.name.trim().length === 0
      ? []
      : searchData?.products?.length
        ? searchData.products
        : instantHits;

  const handleSelect = (
    p: Product & {
      wholesalePrice?: number | string | null;
      priceTier2?: number | string | null;
      priceTier3?: number | string | null;
      hsnCode?: string;
    },
  ) => {
    onUpdate({
      name: p.name,
      rate: String(getEffectivePrice(p)),
      unit: p.unit ?? "pcs",
      productId: p.id,
      hsnCode: p.hsnCode,
    });
    setFocused(false);
  };

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      try {
        const { product } = await productApi.byBarcode(barcode);
        handleSelect(product);
      } catch {
        showError("No product with this barcode in your catalog.", "Not found");
      }
    },
    [handleSelect],
  );

  return (
    <View
      className={`px-3 py-1.5 min-w-0 ${isFirst ? "" : "border-t border-slate-100"}`}
    >
      {!hasProduct ? (
        /* New row: compact search bar */
        <View className="relative min-w-0">
          <View className="flex-row items-center border border-slate-200 rounded-lg bg-white overflow-hidden min-w-0">
            <TextInput
              value={item.name}
              onChangeText={(t) => onUpdate({ name: t })}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              placeholder="Type or scan product…"
              placeholderTextColor="#94a3b8"
              className="flex-1 min-w-0 px-3 h-9 text-sm text-slate-800"
              autoFocus={isFirst && item.name === ""}
            />
            <TouchableOpacity
              onPress={() => setScanOpen(true)}
              className="w-9 h-9 items-center justify-center border-l border-slate-200"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="barcode-outline" size={20} color="#e67e22" />
            </TouchableOpacity>
          </View>
          <BarcodeScanner
            visible={scanOpen}
            onClose={() => setScanOpen(false)}
            onScan={handleBarcodeScan}
            hint="Point at product barcode"
          />
          {focused && suggestions.length > 0 && (
            <View
              className="absolute top-10 left-0 right-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg max-h-44 overflow-hidden min-w-0"
              style={{ elevation: 8 }}
            >
              <FlatList
                data={suggestions.slice(0, 6)}
                keyExtractor={(p) => p.id}
                keyboardShouldPersistTaps="always"
                renderItem={({ item: p }) => {
                  const outOfStock = Number(p.stock) <= 0;
                  const lowStock = !outOfStock && Number(p.stock) < 5;
                  return (
                    <TouchableOpacity
                      onPress={() => handleSelect(p)}
                      className="flex-row items-center justify-between px-3 py-2 border-b border-slate-100"
                    >
                      <View className="flex-1 min-w-0">
                        <Text
                          className="text-sm font-medium text-slate-800"
                          numberOfLines={1}
                        >
                          {p.name}
                        </Text>
                        <Text
                          className={`text-[11px] ${
                            outOfStock
                              ? "text-red-500"
                              : lowStock
                                ? "text-orange-500"
                                : "text-slate-400"
                          }`}
                        >
                          {p.unit} · {outOfStock ? "Out" : `Stock: ${p.stock}`}
                        </Text>
                      </View>
                      <Text className="text-sm font-bold text-primary shrink-0 ml-2">
                        ₹{getEffectivePrice(p).toLocaleString("en-IN")}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}
        </View>
      ) : expanded ? (
        /* Expanded: full edit */
        <>
          <View className="flex-row items-center justify-between mb-2">
            <Text
              className="text-sm font-semibold text-slate-800 flex-1"
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <TouchableOpacity
              onPress={() => setExpanded(false)}
              className="p-1"
            >
              <Ionicons name="chevron-up" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
          {/* 2x2 grid so Qty/Unit/Rate/Disc have room for full text */}
          <View className="gap-2 mb-2">
            <View className="flex-row gap-2">
              <View className="flex-1 min-w-0">
                <Text className="text-[10px] text-slate-500 mb-0.5">Qty</Text>
                <TextInput
                  value={item.qty}
                  onChangeText={(v) => onUpdate({ qty: v })}
                  keyboardType="decimal-pad"
                  className="border border-slate-200 rounded-lg px-2 h-9 text-sm"
                />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[10px] text-slate-500 mb-0.5">Unit</Text>
                <TextInput
                  value={item.unit}
                  onChangeText={(v) => onUpdate({ unit: v })}
                  placeholder="pcs"
                  placeholderTextColor="#94a3b8"
                  className="border border-slate-200 rounded-lg px-2 h-9 text-sm"
                />
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1 min-w-0">
                <Text className="text-[10px] text-slate-500 mb-0.5">
                  Rate ₹
                </Text>
                <TextInput
                  value={item.rate}
                  onChangeText={(v) => onUpdate({ rate: v })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  className="border border-slate-200 rounded-lg px-2 h-9 text-sm"
                />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[10px] text-slate-500 mb-0.5">
                  Disc %
                </Text>
                <TextInput
                  value={item.discount}
                  onChangeText={(v) => onUpdate({ discount: v })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  className="border border-slate-200 rounded-lg px-2 h-9 text-sm"
                />
              </View>
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onRemove} className="py-1">
              <Text className="text-red-500 text-xs font-medium">Remove</Text>
            </TouchableOpacity>
            <Text className="font-bold text-primary">
              ₹
              {item.amount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
        </>
      ) : (
        /* Compact: single row — name | qty×rate | amount | actions */
        <TouchableOpacity
          onPress={() => setExpanded(true)}
          activeOpacity={0.7}
          className="flex-row items-center gap-2 py-1"
        >
          <View className="flex-1 min-w-0">
            <Text
              className="text-sm font-medium text-slate-800"
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text className="text-[11px] text-slate-500">
              {item.qty} {item.unit} × ₹
              {parseFloat(item.rate || "0").toLocaleString("en-IN")}
              {item.discount ? ` (−${item.discount}%)` : ""}
            </Text>
          </View>
          <Text className="text-sm font-bold text-primary shrink-0 w-16 text-right">
            ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Text>
          <TouchableOpacity
            onPress={onRemove}
            className="w-8 h-8 items-center justify-center rounded-lg bg-red-50"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color="#dc2626" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
}
