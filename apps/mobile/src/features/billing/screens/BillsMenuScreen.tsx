/**
 * BillsMenuScreen — Full-page menu for Bills features.
 * Replaces the popup modal; user can navigate to features and easily go back to Bills.
 */
import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { TYPO } from "../../../shared/lib/typography";
import { useResponsive } from "../../../shared/hooks/useResponsive";
import type { InvoicesStackParams } from "../../../navigation";

type Props = NativeStackScreenProps<InvoicesStackParams, "BillsMenu">;

const MENU_ITEMS: {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  action: "screen" | "billing" | "comingSoon";
  screen?: keyof InvoicesStackParams;
  title?: string;
}[] = [
  {
    id: "expenses",
    icon: "cart",
    label: "Expenses",
    action: "screen",
    screen: "Expenses",
  },
  {
    id: "sales",
    icon: "document-text",
    label: "Sales Order",
    action: "billing",
  },
  {
    id: "purchases",
    icon: "cube",
    label: "Purchase Order",
    action: "screen",
    screen: "Purchases",
  },
  {
    id: "eway",
    icon: "car",
    label: "E-Way Bills",
    action: "screen",
    screen: "EInvoicing",
  },
  {
    id: "payment",
    icon: "wallet",
    label: "Payments",
    action: "screen",
    screen: "Payment",
  },
  {
    id: "credit",
    icon: "receipt",
    label: "Credit Notes",
    action: "screen",
    screen: "CreditNotes",
  },
  {
    id: "debit",
    icon: "document",
    label: "Debit Notes",
    action: "comingSoon",
    title: "Debit Notes",
  },
];

const QUICK_LINKS: {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  screen: keyof InvoicesStackParams;
  params?: { title?: string };
}[] = [
  { id: "reports", icon: "bar-chart", label: "Reports", screen: "Reports" },
  {
    id: "analytics",
    icon: "trending-up",
    label: "Analytics",
    screen: "Reports",
  },
  {
    id: "aging",
    icon: "time",
    label: "Aging",
    screen: "ComingSoon",
    params: { title: "Aging Report" },
  },
  { id: "overdue", icon: "alert-circle", label: "Overdue", screen: "Overdue" },
];

export function BillsMenuScreen({ navigation }: Props) {
  const nav = navigation as any;
  const { contentPad: pad, contentWidth } = useResponsive();

  function handleMenuPress(item: (typeof MENU_ITEMS)[0]) {
    if (item.action === "billing") {
      nav
        .getParent()
        ?.navigate("MoreTab", {
          screen: "Billing",
          params: { screen: "InvoiceForm" },
        });
      return;
    }
    if (item.action === "comingSoon" && item.title) {
      nav.navigate("ComingSoon", { title: item.title });
      return;
    }
    if (item.screen) nav.navigate(item.screen);
  }

  function handleQuickLink(item: (typeof QUICK_LINKS)[0]) {
    nav.navigate(item.screen, item.params);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: pad,
          alignItems: "center",
          paddingBottom: 32,
        }}
      >
        <View style={{ width: "100%", maxWidth: contentWidth }}>
          <Text className={TYPO.sectionTitle + " mb-3"}>Menu</Text>
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
                <Text
                  className={TYPO.body + " flex-1 min-w-0"}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </Pressable>
            ))}
          </View>

          <Text className={TYPO.sectionTitle + " mt-6 mb-3"}>Quick links</Text>
          <View className="flex-row flex-wrap gap-2">
            {QUICK_LINKS.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => handleQuickLink(item)}
                className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 min-h-[48] bg-white min-w-0"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Ionicons name={item.icon as any} size={18} color="#64748b" />
                <Text
                  className="text-sm font-medium text-slate-700 min-w-0"
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
