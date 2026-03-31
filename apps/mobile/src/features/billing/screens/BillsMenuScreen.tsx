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
import type { InvoicesStackParams, DocumentType } from "../../../navigation";

type Props = NativeStackScreenProps<InvoicesStackParams, "BillsMenu">;

// ── Document type shortcuts ───────────────────────────────────────────────────

const DOC_SHORTCUTS: {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  documentType: DocumentType;
  color: string;
  bgColor: string;
}[] = [
  {
    id: "invoice",
    icon: "receipt-outline",
    label: "Tax Invoice",
    documentType: "invoice",
    color: "#e67e22",
    bgColor: "#fff7ed",
  },
  {
    id: "quotation",
    icon: "document-text-outline",
    label: "Quotation",
    documentType: "quotation",
    color: "#3b82f6",
    bgColor: "#eff6ff",
  },
  {
    id: "proforma",
    icon: "clipboard-outline",
    label: "Proforma",
    documentType: "proforma",
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
  },
  {
    id: "sales_order",
    icon: "bag-outline",
    label: "Sales Order",
    documentType: "sales_order",
    color: "#10b981",
    bgColor: "#ecfdf5",
  },
  {
    id: "delivery_challan",
    icon: "car-outline",
    label: "Challan",
    documentType: "delivery_challan",
    color: "#0891b2",
    bgColor: "#ecfeff",
  },
  {
    id: "bill_of_supply",
    icon: "document-outline",
    label: "Bill of Supply",
    documentType: "bill_of_supply",
    color: "#64748b",
    bgColor: "#f8fafc",
  },
];

// ── Menu items ────────────────────────────────────────────────────────────────

const MENU_ITEMS: {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  action: "screen" | "comingSoon";
  screen?: keyof InvoicesStackParams;
  params?: Record<string, unknown>;
  title?: string;
}[] = [
  {
    id: "expenses",
    icon: "cart-outline",
    label: "Expenses",
    action: "screen",
    screen: "Expenses",
  },
  {
    id: "purchases",
    icon: "cube-outline",
    label: "Purchase Order",
    action: "screen",
    screen: "Purchases",
  },
  {
    id: "eway",
    icon: "car-outline",
    label: "E-Way Bills",
    action: "screen",
    screen: "EInvoicing",
    params: { title: "E-Way Bills" },
  },
  {
    id: "payment",
    icon: "wallet-outline",
    label: "Payments Received",
    action: "screen",
    screen: "Payment",
  },
  {
    id: "credit",
    icon: "receipt-outline",
    label: "Credit Notes",
    action: "screen",
    screen: "CreditNotes",
  },
  {
    id: "debit",
    icon: "document-outline",
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
  params?: Record<string, unknown>;
}[] = [
  { id: "reports", icon: "bar-chart-outline", label: "Reports", screen: "Reports" },
  {
    id: "aging",
    icon: "time-outline",
    label: "Aging",
    screen: "ComingSoon",
    params: { title: "Aging Report" },
  },
  { id: "overdue", icon: "alert-circle-outline", label: "Overdue", screen: "Overdue" },
];

export function BillsMenuScreen({ navigation }: Props) {
  const nav = navigation as any;
  const { contentPad: pad, contentWidth } = useResponsive();

  function navigateToForm(documentType: DocumentType) {
    navigation.navigate("InvoiceForm", { documentType });
  }

  function handleMenuPress(item: (typeof MENU_ITEMS)[0]) {
    if (item.action === "comingSoon" && item.title) {
      nav.navigate("ComingSoon", { title: item.title });
      return;
    }
    if (item.screen) nav.navigate(item.screen, item.params ?? undefined);
  }

  function handleQuickLink(item: (typeof QUICK_LINKS)[0]) {
    nav.navigate(item.screen, item.params ?? undefined);
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

          {/* ── Document Type Shortcuts ───────────────────────────────────── */}
          <Text className={TYPO.sectionTitle + " mb-3"}>Create New</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {DOC_SHORTCUTS.map((doc) => (
              <Pressable
                key={doc.id}
                onPress={() => navigateToForm(doc.documentType)}
                className="items-center justify-center rounded-xl border px-3 py-3 min-h-[72] flex-1"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? doc.bgColor : "#fff",
                  borderColor: "#e2e8f0",
                  minWidth: 96,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View
                  className="w-9 h-9 rounded-lg items-center justify-center mb-1.5"
                  style={{ backgroundColor: doc.bgColor }}
                >
                  <Ionicons name={doc.icon} size={20} color={doc.color} />
                </View>
                <Text
                  className="text-xs font-medium text-slate-700 text-center"
                  numberOfLines={1}
                >
                  {doc.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── Menu Items ────────────────────────────────────────────────── */}
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
                  <Ionicons name={item.icon} size={20} color="#64748b" />
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

          {/* ── Quick Links ───────────────────────────────────────────────── */}
          <Text className={TYPO.sectionTitle + " mt-6 mb-3"}>Quick links</Text>
          <View className="flex-row flex-wrap gap-2">
            {QUICK_LINKS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleQuickLink(item)}
                className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 min-h-[48] bg-white min-w-0"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Ionicons name={item.icon} size={18} color="#64748b" />
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
