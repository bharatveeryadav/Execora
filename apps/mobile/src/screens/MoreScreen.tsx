/**
 * MoreScreen — 4-column grid of 16 shortcuts (icons match web BottomNav).
 */
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const TILE_COLORS: Record<string, string> = {
  primary: "#e67e22",
  secondary: "#3d7a9e",
  success: "#1a9248",
  warning: "#e6a319",
  destructive: "#cf2a2a",
  info: "#0ea5e9",
};

type Tile = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  color: string;
  params?: object;
};

const TILES: Tile[][] = [
  [
    { icon: "card", label: "Payment", route: "Payment", color: TILE_COLORS.success, params: {} },
    { icon: "bar-chart", label: "Reports", route: "Reports", color: TILE_COLORS.secondary },
    { icon: "calendar", label: "Day Book", route: "DayBook", color: TILE_COLORS.info },
    { icon: "cash", label: "Cash Book", route: "CashBook", color: TILE_COLORS.success },
  ],
  [
    { icon: "cube", label: "Stock", route: "Items", color: TILE_COLORS.success },
    { icon: "cart", label: "Expenses", route: "Expenses", color: TILE_COLORS.warning },
    { icon: "repeat", label: "Recurring", route: "Recurring", color: TILE_COLORS.secondary },
    { icon: "bag", label: "Purchases", route: "Purchases", color: TILE_COLORS.primary },
    { icon: "time", label: "Overdue", route: "Overdue", color: TILE_COLORS.destructive },
  ],
  [
    { icon: "hourglass", label: "Expiry", route: "Expiry", color: TILE_COLORS.warning },
    { icon: "swap-horizontal", label: "Bank Recon", route: "BankRecon", color: TILE_COLORS.info },
    { icon: "shield-checkmark", label: "Monitor", route: "Monitoring", color: TILE_COLORS.info },
    { icon: "settings", label: "Settings", route: "Settings", color: "#64748b" },
  ],
  [
    { icon: "download", label: "Import", route: "Import", color: TILE_COLORS.secondary },
    { icon: "document-text", label: "GST", route: "Gstr", color: TILE_COLORS.primary },
    { icon: "receipt", label: "Credit Notes", route: "CreditNotes", color: TILE_COLORS.secondary },
    { icon: "clipboard", label: "POs", route: "PurchaseOrders", color: TILE_COLORS.primary },
    { icon: "document-attach", label: "E-Invoice", route: "EInvoicing", color: TILE_COLORS.info },
  ],
  [
    { icon: "wallet", label: "Balance", route: "BalanceSheet", color: TILE_COLORS.success },
    { icon: "document-text", label: "Aging", route: "ComingSoon", color: TILE_COLORS.warning, params: { title: "Aging Report" } },
    { icon: "cash", label: "Indirect Income", route: "IndirectIncome", color: TILE_COLORS.success },
    { icon: "chatbubble", label: "Feedback", route: "Feedback", color: TILE_COLORS.primary },
  ],
  [
    { icon: "card-outline", label: "Debit Orders", route: "DebitOrders", color: TILE_COLORS.secondary },
    { icon: "car", label: "Challans", route: "DeliveryChallans", color: TILE_COLORS.info },
    { icon: "cube-outline", label: "Packaging", route: "PackagingLists", color: TILE_COLORS.warning },
    { icon: "book", label: "Journals", route: "Journals", color: TILE_COLORS.secondary },
  ],
  [
    { icon: "storefront", label: "Online Store", route: "OnlineStore", color: TILE_COLORS.primary },
    { icon: "apps", label: "Addons", route: "Addons", color: TILE_COLORS.info },
    { icon: "cloud", label: "My Drive", route: "MyDrive", color: TILE_COLORS.secondary },
    { icon: "school", label: "Tutorial", route: "Tutorial", color: TILE_COLORS.success },
  ],
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
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView>
        <View className="px-4 py-6">
          <Text className="text-xl font-bold tracking-tight text-slate-800 mb-1">More</Text>
          <Text className="text-sm text-muted-foreground mb-6">
            Quick access to all features
          </Text>

          {TILES.map((row, rowIdx) => (
            <View key={rowIdx} className="flex-row mb-4 gap-2">
              {row.map((tile, colIdx) => (
                <TouchableOpacity
                  key={colIdx}
                  onPress={() => handlePress(tile)}
                  activeOpacity={0.85}
                  className="flex-1 min-h-[80px] items-center justify-center p-3 bg-card rounded-xl border border-border shadow-sm"
                >
                  <View className="mb-2">
                    <Ionicons name={tile.icon} size={26} color={tile.color} />
                  </View>
                  <Text className="text-xs font-semibold text-slate-700 text-center">
                    {tile.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
