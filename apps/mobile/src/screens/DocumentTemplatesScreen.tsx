/**
 * DocumentTemplatesScreen — Full-page template gallery for Invoice, Purchase, Quotation.
 * Uses sample data from @execora/shared for previews.
 */
import React, { useState, useEffect, useMemo } from "react";
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
import {
  DEMO_INVOICES,
  DEMO_PURCHASES,
  DEMO_QUOTATIONS,
  DEMO_AMAZON,
  DEMO_TATA,
  DEMO_DMART,
  DEMO_NIKE,
  DEMO_INSTAGRAM,
  DEMO_UNILEVER,
  DEMO_SERVICE_BILL_SHIP,
  type DemoInvoiceData,
} from "@execora/shared";

/** Map template ID to matching demo for preview */
const TEMPLATE_TO_DEMO: Record<TemplateId, DemoInvoiceData> = {
  amazon: DEMO_AMAZON,
  tata: DEMO_TATA,
  dmart: DEMO_DMART,
  nike: DEMO_NIKE,
  instagram: DEMO_INSTAGRAM,
  unilever: DEMO_UNILEVER,
  service: DEMO_SERVICE_BILL_SHIP,
  classic: DEMO_AMAZON,
  modern: DEMO_AMAZON,
  vyapari: DEMO_AMAZON,
  thermal: DEMO_AMAZON,
  ecom: DEMO_AMAZON,
  flipkart: DEMO_AMAZON,
  minimal: DEMO_AMAZON,
};

/** Convert demo data to PreviewData (compatible shape) */
function toPreviewData(d: DemoInvoiceData): PreviewData {
  return {
    ...d,
    cgst: d.cgst ?? 0,
    sgst: d.sgst ?? 0,
    tags: d.tags,
    logoPlaceholder: d.logoPlaceholder,
    shipToAddress: d.shipToAddress,
    themeLabel: d.themeLabel,
    placeOfSupply: d.placeOfSupply,
    dueDate: d.dueDate,
    upiId: d.upiId,
    bankName: d.bankName,
    bankAccountNo: d.bankAccountNo,
    bankIfsc: d.bankIfsc,
    bankBranch: d.bankBranch,
    items: d.items.map((i) => ({
      name: i.name,
      qty: i.qty,
      unit: i.unit,
      rate: i.rate,
      discount: i.discount,
      amount: i.amount,
      hsnCode: i.hsnCode,
      mrp: i.mrp,
    })),
  };
}

export function DocumentTemplatesScreen() {
  const [invoiceTemplate, setInvoiceTemplate] = useState<TemplateId>("classic");
  const [templateTab, setTemplateTab] = useState<"invoice" | "purchase" | "quotation">("invoice");

  const demos = useMemo(() => {
    if (templateTab === "invoice") return DEMO_INVOICES;
    if (templateTab === "purchase") return DEMO_PURCHASES;
    return DEMO_QUOTATIONS;
  }, [templateTab]);

  const getPreviewDataForTemplate = (t: TemplateId) => {
    const demo = templateTab === "invoice" ? (TEMPLATE_TO_DEMO[t] ?? demos[0]) : demos[0];
    return toPreviewData(demo);
  };

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

  const btnClass = (active: boolean) =>
    `px-3 py-1 rounded border ${active ? "border-primary bg-primary" : "border-slate-300"}`;
  const btnTextClass = (active: boolean) =>
    `text-xs font-medium ${active ? "text-white" : "text-slate-600"}`;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="px-4 py-2 border-b border-slate-200 bg-slate-50/50">
        <Text className="text-sm font-semibold text-slate-800">Document Templates</Text>
        <Text className="text-[11px] text-slate-500 mt-0.5">Same templates for Invoice, Purchase, Quotation</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-slate-200 bg-white">
        <TouchableOpacity
          onPress={() => setTemplateTab("invoice")}
          className={`flex-1 py-2.5 flex-row items-center justify-center gap-1.5 ${templateTab === "invoice" ? "border-b-2 border-primary bg-primary/5" : ""}`}
        >
          <Ionicons name="document-text-outline" size={18} color={templateTab === "invoice" ? "#e67e22" : "#64748b"} />
          <Text className={`font-semibold text-xs ${templateTab === "invoice" ? "text-primary" : "text-slate-600"}`}>
            Invoice
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTemplateTab("purchase")}
          className={`flex-1 py-2.5 flex-row items-center justify-center gap-1.5 ${templateTab === "purchase" ? "border-b-2 border-primary bg-primary/5" : ""}`}
        >
          <Ionicons name="cube-outline" size={18} color={templateTab === "purchase" ? "#e67e22" : "#64748b"} />
          <Text className={`font-semibold text-xs ${templateTab === "purchase" ? "text-primary" : "text-slate-600"}`}>
            Purchase
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTemplateTab("quotation")}
          className={`flex-1 py-2.5 flex-row items-center justify-center gap-1.5 ${templateTab === "quotation" ? "border-b-2 border-primary bg-primary/5" : ""}`}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={templateTab === "quotation" ? "#e67e22" : "#64748b"} />
          <Text className={`font-semibold text-xs ${templateTab === "quotation" ? "text-primary" : "text-slate-600"}`}>
            Quotation
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <ScrollView className="flex-1 px-3 py-3" showsVerticalScrollIndicator={true}>
        {templateTab === "invoice" && (
          <View className="gap-4 pb-6">
            {TEMPLATES.map((t) => (
              <View key={t.id} className="gap-1.5">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-slate-800 text-sm">{t.label}</Text>
                  <TouchableOpacity
                    onPress={() => handleTemplateSelect(t.id)}
                    className={btnClass(invoiceTemplate === t.id)}
                  >
                    <Text className={btnTextClass(invoiceTemplate === t.id)}>
                      {invoiceTemplate === t.id ? "Selected" : "Use"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 overflow-hidden">
                  <InvoiceTemplatePreview template={t.id} data={getPreviewDataForTemplate(t.id)} />
                </View>
              </View>
            ))}
          </View>
        )}
        {templateTab === "purchase" && (
          <View className="gap-4 pb-6">
            {TEMPLATES.map((t) => (
              <View key={t.id} className="gap-1.5">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-slate-800 text-sm">{t.label}</Text>
                  <TouchableOpacity
                    onPress={() => handleTemplateSelect(t.id)}
                    className={btnClass(invoiceTemplate === t.id)}
                  >
                    <Text className={btnTextClass(invoiceTemplate === t.id)}>
                      {invoiceTemplate === t.id ? "Selected" : "Use"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 overflow-hidden">
                  <InvoiceTemplatePreview template={t.id} data={getPreviewDataForTemplate(t.id)} />
                </View>
              </View>
            ))}
          </View>
        )}
        {templateTab === "quotation" && (
          <View className="gap-4 pb-6">
            {TEMPLATES.map((t) => (
              <View key={t.id} className="gap-1.5">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-slate-800 text-sm">{t.label}</Text>
                  <TouchableOpacity
                    onPress={() => handleTemplateSelect(t.id)}
                    className={btnClass(invoiceTemplate === t.id)}
                  >
                    <Text className={btnTextClass(invoiceTemplate === t.id)}>
                      {invoiceTemplate === t.id ? "Selected" : "Use"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 overflow-hidden">
                  <InvoiceTemplatePreview template={t.id} data={getPreviewDataForTemplate(t.id)} />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
