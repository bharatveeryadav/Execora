import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BillingItem, Product } from "@execora/shared";
import { MobileItemRow } from "./MobileItemRow";

interface PriceTier {
  key: number;
  name: string;
}

export interface ItemsSectionProps {
  priceTiers: PriceTier[];
  priceTierIdx: number | null;
  items: BillingItem[];
  catalog: Product[];
  getEffectivePrice: (
    p: Product & {
      wholesalePrice?: number | string | null;
      priceTier2?: number | string | null;
      priceTier3?: number | string | null;
    },
  ) => number;
  onPriceTierChange: (idx: number) => void;
  onUpdateItem: (id: number, patch: Partial<BillingItem>) => void;
  onRemoveItem: (id: number) => void;
  onOpenProductPicker: () => void;
  onAddItem: () => void;
}

export function ItemsSection({
  priceTiers,
  priceTierIdx,
  items,
  catalog,
  getEffectivePrice,
  onPriceTierChange,
  onUpdateItem,
  onRemoveItem,
  onOpenProductPicker,
  onAddItem,
}: ItemsSectionProps) {
  return (
    <View className="mt-2 mb-2">
      <View className="flex-row items-center justify-between mb-1.5">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="cube-outline" size={14} color="#64748b" />
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Items
          </Text>
        </View>
        <View className="flex-row gap-1">
          {priceTiers.map((tier, idx) => (
            <TouchableOpacity
              key={tier.key}
              onPress={() => onPriceTierChange(idx)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                priceTierIdx === idx
                  ? "border-primary bg-primary"
                  : "border-slate-300 bg-white"
              }`}
            >
              <Text
                className={
                  priceTierIdx === idx ? "text-white" : "text-slate-600"
                }
              >
                {tier.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View className="border border-slate-200 rounded-xl overflow-hidden">
        {items.map((item, idx) => (
          <MobileItemRow
            key={item.id}
            item={item}
            catalog={catalog}
            isFirst={idx === 0}
            priceTierIdx={priceTierIdx}
            priceTiers={priceTiers}
            getEffectivePrice={getEffectivePrice}
            onUpdate={(patch) => {
              // Handle tier-switch signal from expanded row
              if ((patch as any)._priceTier !== undefined) {
                onPriceTierChange((patch as any)._priceTier as number);
              } else {
                onUpdateItem(item.id, patch);
              }
            }}
            onRemove={() => onRemoveItem(item.id)}
          />
        ))}

        <View className="flex-row border-t border-slate-100">
          <TouchableOpacity
            onPress={onOpenProductPicker}
            className="flex-1 flex-row items-center justify-center gap-2 px-3 py-2.5"
          >
            <Ionicons name="storefront-outline" size={18} color="#e67e22" />
            <Text className="text-primary text-sm font-semibold">
              Browse products
            </Text>
          </TouchableOpacity>
          <View className="w-px bg-slate-200" />
          <TouchableOpacity
            onPress={onAddItem}
            className="flex-1 flex-row items-center justify-center gap-2 px-3 py-2.5"
          >
            <Ionicons name="add-circle-outline" size={18} color="#e67e22" />
            <Text className="text-primary text-sm font-semibold">
              Type to add
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
