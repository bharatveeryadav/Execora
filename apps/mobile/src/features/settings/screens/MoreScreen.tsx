/**
 * MoreScreen — Quick access to all features.
 * Modern UI/UX per Expo docs + Apple HIG: grouped list, 44pt touch targets,
 * Pressable feedback, TYPO scale, 8px spacing grid.
 */
import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useResponsive } from "../../../hooks/useResponsive";
import { TYPO } from "../../../lib/typography";
import { COLORS } from "../../../lib/constants";

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
      {
        icon: "bar-chart",
        label: "Reports",
        route: "Reports",
        color: "#3d7a9e",
      },
      {
        icon: "calendar",
        label: "Day Book",
        route: "DayBook",
        color: "#0ea5e9",
      },
      { icon: "cash", label: "Cash Book", route: "CashBook", color: "#1a9248" },
      {
        icon: "wallet",
        label: "Balance",
        route: "BalanceSheet",
        color: "#1a9248",
      },
    ],
  },
  {
    title: "Business",
    tiles: [
      {
        icon: "business",
        label: "Company",
        route: "CompanyProfile",
        color: "#e67e22",
      },
      { icon: "cube", label: "Stock", route: "Items", color: "#1a9248" },
      { icon: "cart", label: "Expenses", route: "Expenses", color: "#e6a319" },
      {
        icon: "repeat",
        label: "Recurring",
        route: "Recurring",
        color: "#3d7a9e",
      },
      { icon: "bag", label: "Purchases", route: "Purchases", color: "#e67e22" },
      { icon: "time", label: "Overdue", route: "Overdue", color: "#cf2a2a" },
    ],
  },
  {
    title: "Reports & Compliance",
    tiles: [
      { icon: "hourglass", label: "Expiry", route: "Expiry", color: "#e6a319" },
      {
        icon: "swap-horizontal",
        label: "Bank Recon",
        route: "BankRecon",
        color: "#0ea5e9",
      },
      {
        icon: "shield-checkmark",
        label: "Monitor",
        route: "Monitoring",
        color: "#0ea5e9",
      },
      {
        icon: "document-lock",
        label: "Audit Log",
        route: "Audit",
        color: "#3d7a9e",
      },
      { icon: "document-text", label: "GST", route: "Gstr", color: "#e67e22" },
      {
        icon: "shield-checkmark",
        label: "Compliance",
        route: "Compliance",
        color: "#1a9248",
      },
      {
        icon: "document-text",
        label: "Aging",
        route: "ComingSoon",
        color: "#e6a319",
        params: { title: "Aging Report" },
      },
    ],
  },
  {
    title: "Documents",
    tiles: [
      { icon: "download", label: "Import", route: "Import", color: "#3d7a9e" },
      {
        icon: "receipt",
        label: "Credit Notes",
        route: "CreditNotes",
        color: "#3d7a9e",
      },
      {
        icon: "clipboard",
        label: "Purchase Orders",
        route: "PurchaseOrders",
        color: "#e67e22",
      },
      {
        icon: "document-attach",
        label: "E-Invoice",
        route: "EInvoicing",
        color: "#0ea5e9",
      },
      {
        icon: "layers",
        label: "Inventory",
        route: "Inventory",
        color: "#3d7a9e",
      },
      {
        icon: "calculator",
        label: "POS",
        route: "Pos",
        color: "#e67e22",
      },
      {
        icon: "cash",
        label: "Indirect Income",
        route: "IndirectIncome",
        color: "#1a9248",
      },
    ],
  },
  {
    title: "More",
    tiles: [
      {
        icon: "card-outline",
        label: "Debit Orders",
        route: "DebitOrders",
        color: "#3d7a9e",
      },
      {
        icon: "car",
        label: "Challans",
        route: "DeliveryChallans",
        color: "#0ea5e9",
      },
      {
        icon: "cube-outline",
        label: "Packaging",
        route: "PackagingLists",
        color: "#e6a319",
      },
      { icon: "book", label: "Journals", route: "Journals", color: "#3d7a9e" },
      {
        icon: "storefront",
        label: "Online Store",
        route: "OnlineStore",
        color: "#e67e22",
      },
      { icon: "apps", label: "Addons", route: "Addons", color: "#0ea5e9" },
      { icon: "cloud", label: "My Drive", route: "MyDrive", color: "#3d7a9e" },
      {
        icon: "school",
        label: "Tutorial",
        route: "Tutorial",
        color: "#1a9248",
      },
    ],
  },
  {
    title: "Account",
    tiles: [
      {
        icon: "chatbubble",
        label: "Feedback",
        route: "Feedback",
        color: "#e67e22",
      },
      {
        icon: "sparkles",
        label: "Subscription",
        route: "Subscription",
        color: "#0ea5e9",
      },
      {
        icon: "settings",
        label: "Settings",
        route: "Settings",
        color: "#64748b",
      },
    ],
  },
];

type Props = NativeStackScreenProps<
  import("../../../navigation").MoreStackParams,
  "More"
>;

export function MoreScreen({ navigation }: Props) {
  const { contentPad } = useResponsive();

  const handlePress = (tile: Tile) => {
    const parent = navigation.getParent() as any;
    if (tile.route === "Payment") {
      parent?.navigate("PartiesTab", { screen: "Payment" });
      return;
    }
    if (tile.route === "Overdue") {
      parent?.navigate("PartiesTab", { screen: "Overdue" });
      return;
    }
    navigation.navigate(tile.route as any, (tile.params ?? {}) as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: contentPad,
          paddingTop: contentPad,
          paddingBottom: 24,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%" }}>
          {/* Header */}
          <View style={{ paddingBottom: 24 }}>
            <Text className={TYPO.pageTitle}>More</Text>
            <Text className={TYPO.caption + " mt-1"}>
              Quick access to all features
            </Text>
          </View>

          {/* Grouped sections */}
          <View className="gap-6">
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
                      className="flex-row items-center gap-3 px-4 py-3.5"
                      style={({ pressed }) => ({
                        backgroundColor: pressed
                          ? COLORS.bg.primary
                          : COLORS.text.inverted,
                        minHeight: MIN_TOUCH + 8,
                        borderBottomWidth:
                          idx < section.tiles.length - 1 ? 1 : 0,
                        borderBottomColor: COLORS.slate[100],
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
                      <Text className={TYPO.body + " flex-1"}>
                        {tile.label}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={COLORS.slate[400]}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
