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
  action: "inventory" | "expiry" | "comingSoon";
  title?: string;
}[] = [
  {
    id: "inventory",
    icon: "layers",
    label: "Inventory Center",
    subtitle: "Movements, valuation and warehouse locations",
    action: "inventory",
  },
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
    if (item.action === "inventory") {
      navigation.navigate("Inventory");
      return;
    }
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

  const actionRowClass =
    "min-h-[48] rounded-xl border px-3 py-3 flex-row items-center gap-3";

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4 mb-3">
          <Text className={TYPO.pageTitle}>Item Actions</Text>
          <Text className="text-xs text-slate-500 mt-1">
            Quick actions and tools
          </Text>
        </View>

        <View className="rounded-2xl border border-slate-200 bg-slate-50 p-2 gap-2">
          <View
            className={`${actionRowClass} border-amber-100 bg-amber-50`}
            pointerEvents="box-none"
          >
            <View className="w-8 h-8 rounded-lg bg-amber-100 items-center justify-center">
              <Ionicons name="notifications" size={18} color="#d97706" />
            </View>
            <View className="flex-1 min-w-0 pr-2">
              <Text className={TYPO.body}>Low Stock Notification</Text>
              <Text
                className="text-[11px] text-amber-700 mt-0.5"
                numberOfLines={1}
              >
                Show or hide low-stock alert banner on Items screen
              </Text>
            </View>
            <Switch
              value={lowStockAlertsEnabled}
              onValueChange={toggleLowStockAlerts}
              trackColor={{ false: "#cbd5e1", true: "#fcd34d" }}
              thumbColor={lowStockAlertsEnabled ? "#ffffff" : "#f8fafc"}
              accessibilityLabel="Toggle low stock notification"
            />
          </View>

          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleMenuPress(item)}
              className={`${actionRowClass} border-slate-200 bg-white`}
              style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
            >
              <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                <Ionicons name={item.icon as any} size={18} color="#64748b" />
              </View>
              <View className="flex-1 min-w-0 pr-2">
                <Text className={TYPO.body} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text
                  className="text-[11px] text-slate-500 mt-0.5"
                  numberOfLines={1}
                >
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => navigation.goBack()}
          className="mt-4 py-3 rounded-xl border border-slate-200 items-center min-h-[44] bg-white"
          style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
        >
          <Text className={TYPO.body}>Close</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
