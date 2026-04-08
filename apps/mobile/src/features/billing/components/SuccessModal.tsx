/**
 * SuccessModal — Post-invoice-creation confirmation sheet
 * Shows invoice details, WhatsApp share, print, and navigation actions
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Customer } from "@execora/shared";
import { COLORS } from "../../../lib/constants";

export interface SavedInvoice {
  id: string;
  no: string;
  total: number;
  fromOffline?: boolean;
}

export interface SuccessModalProps {
  invoice: SavedInvoice | null;
  customer: Customer | null;
  computedDueDate: string;
  dueDate: string;
  inr: (n: number) => string;
  onPrint: () => void;
  onViewInvoice: () => void;
  onNewInvoice: () => void;
}

export function SuccessModal({
  invoice,
  customer,
  computedDueDate,
  dueDate,
  inr,
  onPrint,
  onViewInvoice,
  onNewInvoice,
}: SuccessModalProps) {
  return (
    <Modal visible={!!invoice} transparent animationType="fade">
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white rounded-3xl w-full p-6">
          <Text className="text-green-600 font-bold text-lg mb-3">
            ✅{" "}
            {invoice?.fromOffline ? "Queued for Sync!" : "Invoice Created!"}
          </Text>
          {invoice?.fromOffline && (
            <Text className="text-amber-600 text-sm mb-2">
              Will sync when you're back online
            </Text>
          )}
          <View className="bg-slate-50 rounded-xl px-4 py-3 mb-4 space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500">Invoice #</Text>
              <Text className="text-sm font-bold text-slate-800">
                {invoice?.no}
              </Text>
            </View>
            {customer && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-500">Customer</Text>
                <Text className="text-sm font-medium text-slate-800">
                  {customer.name}
                </Text>
              </View>
            )}
            {(computedDueDate || dueDate) && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-500">Due</Text>
                <Text className="text-sm font-medium text-slate-800">
                  {new Date(computedDueDate || dueDate).toLocaleDateString(
                    "en-IN",
                    { day: "2-digit", month: "short", year: "numeric" },
                  )}
                </Text>
              </View>
            )}
            <View className="flex-row justify-between pt-2 border-t border-slate-200">
              <Text className="text-sm text-slate-500">Amount</Text>
              <Text className="text-lg font-black text-primary">
                ₹{inr(invoice?.total ?? 0)}
              </Text>
            </View>
          </View>
          {customer?.phone && (
            <TouchableOpacity
              onPress={() => {
                if (!invoice) return;
                const phone = customer.phone!.replace(/\D/g, "");
                const effDue = computedDueDate || dueDate;
                const msg = encodeURIComponent(
                  `Invoice #${invoice.no}\nAmount: ₹${inr(invoice.total)}\nFrom: My Shop${effDue ? `\nDue: ${new Date(effDue).toLocaleDateString("en-IN")}` : ""}`,
                );
                void Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
              }}
              className="flex-row items-center justify-center gap-2 bg-green-500 rounded-2xl h-12 mb-3"
            >
              <Text className="text-white text-2xl">💬</Text>
              <Text className="text-white font-semibold text-sm">
                Share on WhatsApp
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onPrint}
            className="flex-row items-center justify-center gap-2 bg-slate-700 rounded-2xl h-12 mb-3"
          >
            <Ionicons name="print-outline" size={20} color={COLORS.text.inverted} />
            <Text className="text-white font-semibold text-sm">
              Print Receipt
            </Text>
          </TouchableOpacity>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onViewInvoice}
              className="flex-1 h-12 items-center justify-center border border-slate-200 rounded-xl"
            >
              <Text className="text-sm font-semibold text-slate-700">
                View Invoice
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onNewInvoice}
              className="flex-1 h-12 items-center justify-center bg-primary rounded-xl"
            >
              <Text className="text-white font-bold text-sm">New Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
