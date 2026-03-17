/**
 * DocumentTemplatesScreen — Full-page template gallery for Invoice, Purchase, Quotation.
 * Same templates, different sample data per document type.
 */
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { storage, INV_TEMPLATE_KEY, BIZ_STORAGE_KEY } from "../lib/storage";
import {
  TEMPLATES,
  InvoiceTemplatePreview,
  type TemplateId,
  type PreviewData,
} from "../components/InvoiceTemplatePreview";

const SAMPLE_ITEMS: PreviewData["items"] = [
  { name: "Rice 1kg", qty: 5, unit: "pcs", rate: 80, discount: 0, amount: 400, hsnCode: "1006" },
  { name: "Dal Toor 500g", qty: 3, unit: "pcs", rate: 120, discount: 5, amount: 342, hsnCode: "1904" },
  { name: "Oil Sunflower 1L", qty: 2, unit: "pcs", rate: 180, discount: 0, amount: 360, hsnCode: "1507" },
];

const SAMPLE_INVOICE: PreviewData = {
  invoiceNo: "INV-2024-001",
  date: "14-Mar-2025",
  shopName: "My Store",
  customerName: "Ramesh Kumar",
  supplierGstin: "07ABCDE1234F1Z5",
  supplierAddress: "123 Main St, Bangalore, Karnataka 560001",
  recipientAddress: "45 MG Road, Bangalore 560001",
  items: SAMPLE_ITEMS,
  subtotal: 1102,
  discountAmt: 55,
  cgst: 52.35,
  sgst: 52.35,
  total: 1151.7,
  amountInWords: "One Thousand One Hundred Fifty One Rupees Seventy Paise Only",
  paymentMode: "UPI",
  notes: "Thank you for your business!",
  gstin: "29XYZAB5678K1Z2",
};

const SAMPLE_PURCHASE: PreviewData = {
  ...SAMPLE_INVOICE,
  shopName: "ABC Suppliers Pvt Ltd",
  customerName: "My Store",
  supplierAddress: "456 Industrial Area, Bangalore 560058",
  recipientAddress: "123 Main St, Bangalore 560001",
};

const SAMPLE_QUOTATION: PreviewData = {
  ...SAMPLE_INVOICE,
  invoiceNo: "QT-2024-042",
};

export function DocumentTemplatesScreen() {
  const [invoiceTemplate, setInvoiceTemplate] = useState<TemplateId>("classic");
  const [templateTab, setTemplateTab] = useState<"invoice" | "purchase" | "quotation">("invoice");

  useEffect(() => {
    const t = storage.getString(INV_TEMPLATE_KEY) as TemplateId | undefined;
    if (t && TEMPLATES.some((x) => x.id === t)) setInvoiceTemplate(t);
  }, []);

  const handleTemplateSelect = (t: TemplateId) => {
    setInvoiceTemplate(t);
    storage.set(INV_TEMPLATE_KEY, t);
    const stored = (() => {
      try {
        const raw = storage.getString(BIZ_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    })();
    stored.invoiceTemplate = t;
    storage.set(BIZ_STORAGE_KEY, JSON.stringify(stored));
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
        <Text className="text-base text-slate-600">
          Same templates for invoices, purchase orders, and quotations
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-slate-200 bg-white">
        <TouchableOpacity
          onPress={() => setTemplateTab("invoice")}
          className={`flex-1 py-4 flex-row items-center justify-center gap-2 ${templateTab === "invoice" ? "border-b-2 border-primary bg-primary/5" : ""}`}
        >
          <Ionicons name="document-text-outline" size={20} color={templateTab === "invoice" ? "#e67e22" : "#64748b"} />
          <Text className={`font-semibold text-sm ${templateTab === "invoice" ? "text-primary" : "text-slate-600"}`}>
            Invoice
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTemplateTab("purchase")}
          className={`flex-1 py-4 flex-row items-center justify-center gap-2 ${templateTab === "purchase" ? "border-b-2 border-primary bg-primary/5" : ""}`}
        >
          <Ionicons name="cube-outline" size={20} color={templateTab === "purchase" ? "#e67e22" : "#64748b"} />
          <Text className={`font-semibold text-sm ${templateTab === "purchase" ? "text-primary" : "text-slate-600"}`}>
            Purchase
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTemplateTab("quotation")}
          className={`flex-1 py-4 flex-row items-center justify-center gap-2 ${templateTab === "quotation" ? "border-b-2 border-primary bg-primary/5" : ""}`}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={templateTab === "quotation" ? "#e67e22" : "#64748b"} />
          <Text className={`font-semibold text-sm ${templateTab === "quotation" ? "text-primary" : "text-slate-600"}`}>
            Quotation
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={true}>
        {templateTab === "invoice" && (
          <View className="gap-6 pb-8">
            {TEMPLATES.map((t) => (
              <View key={t.id} className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-slate-800 text-base">{t.label}</Text>
                  <TouchableOpacity
                    onPress={() => handleTemplateSelect(t.id)}
                    className={`px-4 py-2 rounded-full border ${invoiceTemplate === t.id ? "border-primary bg-primary" : "border-slate-300"}`}
                  >
                    <Text className={`text-sm font-medium ${invoiceTemplate === t.id ? "text-white" : "text-slate-600"}`}>
                      {invoiceTemplate === t.id ? "Selected" : "Use this"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 overflow-hidden">
                  <InvoiceTemplatePreview template={t.id} data={SAMPLE_INVOICE} />
                </View>
              </View>
            ))}
          </View>
        )}
        {templateTab === "purchase" && (
          <View className="gap-6 pb-8">
            {TEMPLATES.map((t) => (
              <View key={t.id} className="gap-2">
                <Text className="font-semibold text-slate-800 text-base">{t.label}</Text>
                <View className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 overflow-hidden">
                  <InvoiceTemplatePreview template={t.id} data={SAMPLE_PURCHASE} />
                </View>
              </View>
            ))}
          </View>
        )}
        {templateTab === "quotation" && (
          <View className="gap-6 pb-8">
            {TEMPLATES.map((t) => (
              <View key={t.id} className="gap-2">
                <Text className="font-semibold text-slate-800 text-base">{t.label}</Text>
                <View className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 overflow-hidden">
                  <InvoiceTemplatePreview template={t.id} data={SAMPLE_QUOTATION} />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
