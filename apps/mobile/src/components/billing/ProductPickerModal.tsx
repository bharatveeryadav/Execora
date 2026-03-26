/**
 * ProductPickerModal — Modal for browsing/searching product catalog
 * Used in BillingScreen to add items to invoice
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fuzzyFilter, type Product } from "@execora/shared";

export interface ProductPickerModalProps {
  visible: boolean;
  onClose: () => void;
  catalog: Product[];
  getEffectivePrice: (
    p: Product & {
      wholesalePrice?: number | string | null;
      priceTier2?: number | string | null;
      priceTier3?: number | string | null;
    },
  ) => number;
  onSelect: (p: Product) => void;
}

export function ProductPickerModal({
  visible,
  onClose,
  catalog,
  getEffectivePrice,
  onSelect,
}: ProductPickerModalProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return catalog;
    const fuzzy = fuzzyFilter(catalog, search);
    if (fuzzy.length > 0) return fuzzy;
    const q = search.trim().toLowerCase();
    return catalog.filter((p) => p.name.toLowerCase().includes(q));
  }, [catalog, search]);

  if (!visible) return null;

  return (
    <Pressable className="flex-1 bg-black/40" onPress={onClose}>
      <Pressable
        onPress={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 max-h-[85%] bg-white rounded-t-2xl"
      >
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200">
          <Text className="text-base font-bold text-slate-800">
            Browse / Add items
          </Text>
          <TouchableOpacity onPress={onClose} className="p-2 -m-2">
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View className="px-4 py-2 border-b border-slate-100">
          <View className="flex-row items-center bg-slate-100 rounded-lg px-3">
            <Ionicons name="search" size={18} color="#94a3b8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Type to search all items…"
              placeholderTextColor="#94a3b8"
              className="flex-1 py-2.5 px-2 text-sm text-slate-800"
              autoFocus
            />
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="always"
          className="max-h-80"
          ListHeaderComponent={
            search.trim() ? null : (
              <Text className="px-4 py-2 text-[11px] text-slate-500">
                {catalog.length} item{catalog.length !== 1 ? "s" : ""} — tap to
                add, or type above to search
              </Text>
            )
          }
          renderItem={({ item: p }) => {
            const outOfStock = Number(p.stock) <= 0;
            const lowStock = !outOfStock && Number(p.stock) < 5;
            return (
              <TouchableOpacity
                onPress={() => onSelect(p)}
                className="flex-row items-center justify-between px-4 py-3 border-b border-slate-50"
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
                    {p.unit} ·{" "}
                    {outOfStock ? "Out of stock" : `Stock: ${p.stock}`}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-bold text-primary">
                    ₹{getEffectivePrice(p).toLocaleString("en-IN")}
                  </Text>
                  <Ionicons name="add-circle" size={22} color="#e67e22" />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="py-8 items-center">
              <Text className="text-slate-400 text-sm">
                {search ? "No products match" : "No products in catalog"}
              </Text>
            </View>
          }
        />
      </Pressable>
    </Pressable>
  );
}
