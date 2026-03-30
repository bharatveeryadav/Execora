/**
 * ItemsMenuScreen — Full-page menu for Items/Inventory features.
 * Opened from the ⋯ button in ItemsScreen header.
 */
import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  InteractionManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { TYPO } from "../lib/typography";
import type { ItemsStackParams } from "../navigation";

type Props = NativeStackScreenProps<ItemsStackParams, "ItemsMenu">;

const MENU_ITEMS: {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  action: "expiry" | "comingSoon";
  title?: string;
}[] = [
  { id: "expiry", icon: "calendar", label: "Product Expiry", action: "expiry" },
  {
    id: "import",
    icon: "cloud-upload",
    label: "Import Products",
    action: "comingSoon",
    title: "Import Products",
  },
  {
    id: "export",
    icon: "download",
    label: "Export Products",
    action: "comingSoon",
    title: "Export Products",
  },
  {
    id: "bulk",
    icon: "swap-vertical",
    label: "Bulk Stock Adjust",
    action: "comingSoon",
    title: "Bulk Stock Adjust",
  },
  {
    id: "reports",
    icon: "bar-chart",
    label: "Stock Reports",
    action: "comingSoon",
    title: "Stock Reports",
  },
];

export function ItemsMenuScreen({ navigation }: Props) {
  const nav = navigation as any;

  function handleMenuPress(item: (typeof MENU_ITEMS)[0]) {
    if (item.action === "expiry") {
      InteractionManager.runAfterInteractions(() => {
        // getParent() is ItemsStack→parent. When opened via ItemsTab that's MainTabs.
        // When opened via MoreStack→Items that's MoreStack — need one more level up.
        const parent = nav.getParent?.() as any;
        const tabNav = parent?.getState?.()?.routeNames?.includes?.("MoreTab")
          ? parent
          : ((parent?.getParent?.() as any) ?? parent);
        tabNav?.navigate?.("MoreTab", { screen: "Expiry" });
      });
      return;
    }
    if (item.action === "comingSoon" && item.title) {
      const parent = nav.getParent?.() as any;
      const tabNav = parent?.getState?.()?.routeNames?.includes?.("MoreTab")
        ? parent
        : ((parent?.getParent?.() as any) ?? parent);
      tabNav?.navigate?.("MoreTab", {
        screen: "ComingSoon",
        params: { title: item.title },
      });
      return;
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Text className={TYPO.sectionTitle + " mb-3"}>More</Text>
        <View className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
          {MENU_ITEMS.map((item, idx) => (
            <Pressable
              key={item.id}
              onPress={() => handleMenuPress(item)}
              className="flex-row items-center gap-3 px-4 py-3.5 min-h-[52]"
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#f8fafc" : "#fff",
                borderBottomWidth: idx < MENU_ITEMS.length - 1 ? 1 : 0,
                borderBottomColor: "#f1f5f9",
              })}
            >
              <View className="w-10 h-10 rounded-lg bg-slate-100 items-center justify-center">
                <Ionicons name={item.icon as any} size={20} color="#64748b" />
              </View>
              <Text className={TYPO.body + " flex-1"}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
