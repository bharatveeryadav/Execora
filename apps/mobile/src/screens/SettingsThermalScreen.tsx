/**
 * Thermal Print Settings — 58mm/80mm, header, footer (Sprint 17).
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  getThermalConfig,
  setThermalConfig,
  type ThermalConfig,
} from "../lib/thermalSettings";
import { printReceipt } from "../lib/printReceipt";
import { useResponsive } from "../hooks/useResponsive";
import type { ReceiptData } from "../lib/thermalReceipt";

type Props = NativeStackScreenProps<import("../navigation").MoreStackParams, "SettingsThermal">;

export function SettingsThermalScreen({ navigation }: Props) {
  const { contentPad } = useResponsive();
  const [width, setWidth] = useState<58 | 80>(80);
  const [header, setHeader] = useState("");
  const [footer, setFooter] = useState("Thank you! Visit again.");

  useEffect(() => {
    const c = getThermalConfig();
    setWidth(c.width);
    setHeader(c.header);
    setFooter(c.footer);
  }, []);

  const handleSave = () => {
    setThermalConfig({ width, header, footer });
    Alert.alert("Saved", "Thermal print settings saved.");
  };

  const handleTestPrint = async () => {
    const sampleData: ReceiptData = {
      shopName: "My Shop",
      invoiceNo: "TEST-001",
      date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      customerName: "Test Customer",
      items: [
        { name: "Sample Item 1", qty: 2, rate: 50, discountPct: 0, amount: 100 },
        { name: "Sample Item 2", qty: 1, rate: 75, discountPct: 10, amount: 67.5 },
      ],
      subtotal: 167.5,
      discountAmt: 0,
      taxableAmt: 167.5,
      withGst: false,
      totalGst: 0,
      grandTotal: 167.5,
      roundOff: 0,
      finalTotal: 167.5,
      amountInWords: "One Hundred Sixty Seven Rupees Fifty Paise Only",
      payments: [{ mode: "cash", amount: 167.5 }],
    };
    try {
      await printReceipt(sampleData);
    } catch (e) {
      Alert.alert("Print", (e as Error).message ?? "Could not print");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View style={{ paddingHorizontal: contentPad, paddingVertical: 12 }} className="flex-row items-center border-b border-slate-200">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800 flex-1 ml-2">
          Thermal Print
        </Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: contentPad, paddingVertical: contentPad }}>
        <Text className="text-xs text-slate-500 uppercase font-semibold mb-2">
          Paper Width
        </Text>
        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            onPress={() => setWidth(58)}
            className={`flex-1 py-3 rounded-xl border-2 items-center ${
              width === 58 ? "border-primary bg-primary/5" : "border-slate-200"
            }`}
          >
            <Text className={`font-semibold ${width === 58 ? "text-primary" : "text-slate-600"}`}>
              58mm
            </Text>
            <Text className="text-xs text-slate-500">32 chars/line</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setWidth(80)}
            className={`flex-1 py-3 rounded-xl border-2 items-center ${
              width === 80 ? "border-primary bg-primary/5" : "border-slate-200"
            }`}
          >
            <Text className={`font-semibold ${width === 80 ? "text-primary" : "text-slate-600"}`}>
              80mm
            </Text>
            <Text className="text-xs text-slate-500">48 chars/line</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-xs text-slate-500 uppercase font-semibold mb-2">
          Custom Header (optional)
        </Text>
        <TextInput
          value={header}
          onChangeText={setHeader}
          placeholder="e.g. Visit again!"
          placeholderTextColor="#94a3b8"
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 mb-4"
        />

        <Text className="text-xs text-slate-500 uppercase font-semibold mb-2">
          Footer Text
        </Text>
        <TextInput
          value={footer}
          onChangeText={setFooter}
          placeholder="Thank you! Visit again."
          placeholderTextColor="#94a3b8"
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 mb-6"
        />

        <TouchableOpacity
          onPress={handleSave}
          className="bg-primary py-3 rounded-xl items-center mb-3"
        >
          <Text className="text-white font-bold">Save Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void handleTestPrint()}
          className="flex-row items-center justify-center gap-2 py-3 rounded-xl border border-slate-200"
        >
          <Ionicons name="print-outline" size={20} color="#64748b" />
          <Text className="font-semibold text-slate-600">Test Print</Text>
        </TouchableOpacity>

        <Text className="text-xs text-slate-400 mt-6 text-center">
          Receipt prints as PDF via share sheet. Use "Print" from billing after saving an invoice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
