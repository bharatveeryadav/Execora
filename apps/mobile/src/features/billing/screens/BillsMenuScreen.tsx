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
  {
    id: "reports",
    icon: "bar-chart-outline",
    label: "Reports",
    screen: "Reports",
  },
  {
    id: "aging",
    icon: "time-outline",
    label: "Aging",
    screen: "ComingSoon",
    params: { title: "Aging Report" },
  },
  {
    id: "overdue",
    icon: "alert-circle-outline",
    label: "Overdue",
    screen: "Overdue",
  },
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
          paddingBottom: 24,
        }}
      >
        <View style={{ width: "100%", maxWidth: contentWidth }}>
          <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4 mb-3">
            <Text className={TYPO.pageTitle}>Bills Actions</Text>
            <Text className="text-xs text-slate-500 mt-1">
              Quick actions and tools
            </Text>
          </View>

          <View className="rounded-2xl border border-slate-200 bg-slate-50 p-2 gap-2 mb-3">
            {DOC_SHORTCUTS.map((doc) => (
              <Pressable
                key={doc.id}
                onPress={() => navigateToForm(doc.documentType)}
                className="min-h-[48] rounded-xl border border-slate-200 bg-white px-3 py-3 flex-row items-center gap-3"
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <View
                  className="w-8 h-8 rounded-lg items-center justify-center"
                  style={{ backgroundColor: doc.bgColor }}
                >
                  <Ionicons name={doc.icon} size={18} color={doc.color} />
                </View>
                <Text
                  className={TYPO.body + " flex-1 min-w-0"}
                  numberOfLines={1}
                >
                  {doc.label}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </Pressable>
            ))}
          </View>

          <View className="rounded-2xl border border-slate-200 bg-slate-50 p-2 gap-2 mb-3">
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleMenuPress(item)}
                className="min-h-[48] rounded-xl border border-slate-200 bg-white px-3 py-3 flex-row items-center gap-3"
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                  <Ionicons name={item.icon} size={18} color="#64748b" />
                </View>
                <Text
                  className={TYPO.body + " flex-1 min-w-0"}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </Pressable>
            ))}
          </View>

          <View className="rounded-2xl border border-slate-200 bg-slate-50 p-2 gap-2">
            {QUICK_LINKS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleQuickLink(item)}
                className="min-h-[48] rounded-xl border border-slate-200 bg-white px-3 py-3 flex-row items-center gap-3"
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                  <Ionicons name={item.icon} size={18} color="#64748b" />
                </View>
                <Text
                  className={TYPO.body + " flex-1 min-w-0"}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
