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
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { TYPO } from "../../../lib/typography";
import { storage } from "../../../lib/storage";
import type { ItemsStackParams } from "../../../navigation";

type Props = NativeStackScreenProps<ItemsStackParams, "ItemsMenu">;

const LOW_STOCK_ALERTS_KEY = "items-low-stock-alerts-enabled";

const MENU_ITEMS: {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  action: "expiry" | "comingSoon";
  title?: string;
}[] = [
  {
    id: "expiry",
    icon: "calendar",
    label: "Product Expiry",
    subtitle: "Track products nearing expiry date",
    action: "expiry",
  },
  {
    id: "import",
    icon: "cloud-upload",
    label: "Import Products",
    subtitle: "Upload item list from file",
    action: "comingSoon",
    title: "Import Products",
  },
  {
    id: "export",
    icon: "download",
    label: "Export Products",
    subtitle: "Download catalog and stock data",
    action: "comingSoon",
    title: "Export Products",
  },
  {
    id: "bulk",
    icon: "swap-vertical",
    label: "Bulk Stock Adjust",
    subtitle: "Update stock in one operation",
    action: "comingSoon",
    title: "Bulk Stock Adjust",
  },
];

export function ItemsMenuScreen({ navigation }: Props) {
  const nav = navigation as any;
  const [lowStockAlertsEnabled, setLowStockAlertsEnabled] = React.useState(
    () => storage.getString(LOW_STOCK_ALERTS_KEY) !== "0",
  );

  const toggleLowStockAlerts = React.useCallback((enabled: boolean) => {
    setLowStockAlertsEnabled(enabled);
    storage.set(LOW_STOCK_ALERTS_KEY, enabled ? "1" : "0");
  }, []);

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
        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4 mb-3">
          <Text className="text-lg font-bold text-slate-900">Item Actions</Text>
          <Text className="text-xs text-slate-500 mt-1">
            Manage inventory tools from one place.
          </Text>
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4 mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-9 h-9 rounded-lg bg-amber-100 items-center justify-center mr-3">
                <Ionicons name="notifications" size={18} color="#b45309" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-800">
                  Low Stock Notification
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">
                  Show or hide low-stock alert banner on Items screen
                </Text>
              </View>
            </View>
            <Switch
              value={lowStockAlertsEnabled}
              onValueChange={toggleLowStockAlerts}
              trackColor={{ false: "#cbd5e1", true: "#fcd34d" }}
              thumbColor={lowStockAlertsEnabled ? "#ffffff" : "#f8fafc"}
              accessibilityLabel="Toggle low stock notification"
            />
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleMenuPress(item)}
              className="w-[48.5%] rounded-2xl border border-slate-200 bg-white px-3 py-3 min-h-[116]"
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#f8fafc" : "#fff",
              })}
            >
              <View className="w-9 h-9 rounded-lg bg-slate-100 items-center justify-center mb-2">
                <Ionicons name={item.icon as any} size={18} color="#64748b" />
              </View>
              <Text
                className="text-sm font-semibold text-slate-800"
                numberOfLines={1}
              >
                {item.label}
              </Text>
              <Text
                className="text-[11px] text-slate-500 mt-1"
                numberOfLines={2}
              >
                {item.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
