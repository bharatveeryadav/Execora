/**
 * MoreScreen — Quick access to all features.
 * Modern UI/UX per Expo docs + Apple HIG: grouped list, 44pt touch targets,
 * Pressable feedback, TYPO scale, 8px spacing grid.
 */
import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { TYPO } from "../lib/typography";

const MIN_TOUCH = 44;

type Tile = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  color: string;
  params?: object;
};

type Section = { title: string; tiles: Tile[] };

const SECTIONS: Section[] = [
  {
    title: "Finance",
    tiles: [
      { icon: "card", label: "Payment", route: "Payment", color: "#1a9248" },
      { icon: "bar-chart", label: "Reports", route: "Reports", color: "#3d7a9e" },
      { icon: "calendar", label: "Day Book", route: "DayBook", color: "#0ea5e9" },
      { icon: "cash", label: "Cash Book", route: "CashBook", color: "#1a9248" },
      { icon: "wallet", label: "Balance", route: "BalanceSheet", color: "#1a9248" },
    ],
  },
  {
    title: "Business",
    tiles: [
      { icon: "business", label: "Company", route: "CompanyProfile", color: "#e67e22" },
      { icon: "cube", label: "Stock", route: "Items", color: "#1a9248" },
      { icon: "cart", label: "Expenses", route: "Expenses", color: "#e6a319" },
      { icon: "repeat", label: "Recurring", route: "Recurring", color: "#3d7a9e" },
      { icon: "bag", label: "Purchases", route: "Purchases", color: "#e67e22" },
      { icon: "time", label: "Overdue", route: "Overdue", color: "#cf2a2a" },
    ],
  },
  {
    title: "Reports & Compliance",
    tiles: [
      { icon: "hourglass", label: "Expiry", route: "Expiry", color: "#e6a319" },
      { icon: "swap-horizontal", label: "Bank Recon", route: "BankRecon", color: "#0ea5e9" },
      { icon: "shield-checkmark", label: "Monitor", route: "Monitoring", color: "#0ea5e9" },
      { icon: "document-text", label: "GST", route: "Gstr", color: "#e67e22" },
      { icon: "document-text", label: "Aging", route: "ComingSoon", color: "#e6a319", params: { title: "Aging Report" } },
    ],
  },
  {
    title: "Documents",
    tiles: [
      { icon: "download", label: "Import", route: "Import", color: "#3d7a9e" },
      { icon: "receipt", label: "Credit Notes", route: "CreditNotes", color: "#3d7a9e" },
      { icon: "clipboard", label: "Purchase Orders", route: "PurchaseOrders", color: "#e67e22" },
      { icon: "document-attach", label: "E-Invoice", route: "EInvoicing", color: "#0ea5e9" },
      { icon: "cash", label: "Indirect Income", route: "IndirectIncome", color: "#1a9248" },
    ],
  },
  {
    title: "More",
    tiles: [
      { icon: "card-outline", label: "Debit Orders", route: "DebitOrders", color: "#3d7a9e" },
      { icon: "car", label: "Challans", route: "DeliveryChallans", color: "#0ea5e9" },
      { icon: "cube-outline", label: "Packaging", route: "PackagingLists", color: "#e6a319" },
      { icon: "book", label: "Journals", route: "Journals", color: "#3d7a9e" },
      { icon: "storefront", label: "Online Store", route: "OnlineStore", color: "#e67e22" },
      { icon: "apps", label: "Addons", route: "Addons", color: "#0ea5e9" },
      { icon: "cloud", label: "My Drive", route: "MyDrive", color: "#3d7a9e" },
      { icon: "school", label: "Tutorial", route: "Tutorial", color: "#1a9248" },
    ],
  },
  {
    title: "Account",
    tiles: [
      { icon: "chatbubble", label: "Feedback", route: "Feedback", color: "#e67e22" },
      { icon: "settings", label: "Settings", route: "Settings", color: "#64748b" },
    ],
  },
];

export function MoreScreen() {
  const navigation = useNavigation<any>();

  const handlePress = (tile: Tile) => {
    if (tile.route === "Payment") {
      navigation.getParent()?.navigate("CustomersTab" as never, { screen: "Payment" } as never);
      return;
    }
    if (tile.route === "Overdue") {
      navigation.getParent()?.navigate("CustomersTab" as never, { screen: "Overdue" } as never);
      return;
    }
    navigation.navigate(tile.route as never, (tile.params ?? {}) as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-4 pt-4 pb-6">
          <Text className={TYPO.pageTitle}>More</Text>
          <Text className={TYPO.caption + " mt-1"}>
            Quick access to all features
          </Text>
        </View>

        {/* Grouped sections */}
        <View className="px-4 gap-6">
          {SECTIONS.map((section, sectionIdx) => (
            <View key={sectionIdx}>
              <Text className={TYPO.sectionTitle + " mb-2 px-1"}>
                {section.title}
              </Text>
              <View className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
                {section.tiles.map((tile, idx) => (
                  <Pressable
                    key={tile.route + tile.label}
                    onPress={() => handlePress(tile)}
                    className={`flex-row items-center gap-3 px-4 py-3.5 ${idx < section.tiles.length - 1 ? "border-b border-slate-100" : ""}`}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? "#f8fafc" : "#fff",
                      minHeight: MIN_TOUCH + 8,
                    })}
                  >
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: tile.color + "18" }}
                    >
                      <Ionicons
                        name={tile.icon as any}
                        size={20}
                        color={tile.color}
                      />
                    </View>
                    <Text className={TYPO.body + " flex-1"}>{tile.label}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#94a3b8"
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
