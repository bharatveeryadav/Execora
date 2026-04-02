import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useResponsive } from "../../../hooks/useResponsive";
import type { PartiesStackParams } from "../../../navigation";

type Props = NativeStackScreenProps<PartiesStackParams, "SupplierDetail">;

export function SupplierDetailScreen({ navigation, route }: Props) {
  const { contentPad, contentWidth } = useResponsive();
  const { supplierId, supplierName } = route.params;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <View style={{ flex: 1, width: "100%", alignItems: "center" }}>
        <View
          style={{ width: "100%", maxWidth: contentWidth, padding: contentPad }}
          className="gap-3"
        >
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-lg font-bold text-slate-800">
              {supplierName || "Supplier"}
            </Text>
            <Text className="text-xs text-slate-500 mt-1">
              ID: {supplierId}
            </Text>
            <Text className="text-sm text-slate-600 mt-3">
              Supplier detail and reconciliation actions are being expanded. You
              can continue from Purchases and Expenses for now.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              (navigation.getParent() as any)?.navigate("MoreTab", {
                screen: "Purchases",
              })
            }
            className="min-h-[48] rounded-xl border border-slate-200 bg-white px-4 py-3 flex-row items-center"
          >
            <Ionicons name="cube" size={18} color="#475569" />
            <Text className="ml-3 text-sm font-medium text-slate-700">
              View Purchases
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              (navigation.getParent() as any)?.navigate("MoreTab", {
                screen: "Expenses",
              })
            }
            className="min-h-[48] rounded-xl border border-slate-200 bg-white px-4 py-3 flex-row items-center"
          >
            <Ionicons name="receipt" size={18} color="#475569" />
            <Text className="ml-3 text-sm font-medium text-slate-700">
              View Expenses
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
