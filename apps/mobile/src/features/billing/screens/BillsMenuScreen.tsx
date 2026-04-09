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
import { COLORS } from "../../../shared/lib/constants";
import type { InvoicesStackParams, DocumentType } from "../../../navigation";
import {
  BILLING_DOC_SHORTCUTS,
  BILLING_MENU_ITEMS,
  type BillingMenuItem,
} from "../lib/menu-config";

type Props = NativeStackScreenProps<InvoicesStackParams, "BillsMenu">;

export function BillsMenuScreen({ navigation }: Props) {
  const nav = navigation as any;
  const { contentPad: pad } = useResponsive();

  function navigateToForm(documentType: DocumentType) {
    navigation.navigate("InvoiceForm", { documentType });
  }

  function handleMenuPress(item: BillingMenuItem) {
    if (item.action === "comingSoon" && item.title) {
      nav.navigate("ComingSoon", { title: item.title });
      return;
    }
    if (item.screen) nav.navigate(item.screen, item.params ?? undefined);
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
        <View style={{ width: "100%" }}>
          <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4 mb-3">
            <Text className={TYPO.pageTitle}>Bills Actions</Text>
            <Text className="text-xs text-slate-500 mt-1">
              Quick actions and tools
            </Text>
          </View>

          <View className="rounded-2xl border border-slate-200 bg-slate-50 p-2 gap-2 mb-3">
            {BILLING_DOC_SHORTCUTS.map((doc) => (
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
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.slate[400]}
                />
              </Pressable>
            ))}
          </View>

          <View className="rounded-2xl border border-slate-200 bg-slate-50 p-2 gap-2 mb-3">
            {BILLING_MENU_ITEMS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleMenuPress(item)}
                className="min-h-[48] rounded-xl border border-slate-200 bg-white px-3 py-3 flex-row items-center gap-3"
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={COLORS.slate[500]}
                  />
                </View>
                <Text
                  className={TYPO.body + " flex-1 min-w-0"}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.slate[400]}
                />
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
