/**
 * DocumentSettingsScreen — Invoice/document customization (per reference UI).
 * Sections: Invoice Templates, PREFERENCES, APPEARANCE, LAYOUT, HEADER & FOOTER.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Share,
  Modal,
  Pressable,
} from "react-native";
import { showAlert } from "../../../lib/alerts";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { SIZES } from "../../../lib/constants";
import {
  storage,
  DOC_SETTINGS_KEY,
  INV_TEMPLATE_KEY,
  BIZ_STORAGE_KEY,
} from "../../../lib/storage";
import {
  TEMPLATES,
  InvoicePreviewThumbnail,
  type TemplateId,
  type PreviewData,
} from "../../../components/InvoiceTemplatePreview";
import { DEMO_KIRANA, type DemoInvoiceData } from "@execora/shared";

function toPreviewData(d: DemoInvoiceData): PreviewData {
  return {
    ...d,
    cgst: d.cgst ?? 0,
    sgst: d.sgst ?? 0,
    items: d.items.map((i) => ({
      name: i.name,
      qty: i.qty,
      unit: i.unit,
      rate: i.rate,
      discount: i.discount,
      amount: i.amount,
      hsnCode: i.hsnCode,
    })),
  };
}

const SAMPLE_PREVIEW = toPreviewData(DEMO_KIRANA);

export interface DocumentSettings {
  themeColor: string;
  language: string;
  fontSize: "small" | "normal" | "large";
  fontStyle: string;
  pdfOrientation: "portrait" | "landscape";
  priceDecimals: number;
  invoicePrefix: string;
  invoiceSuffix: string;
  nextInvoiceNumber: number;
  defaultDueDays: number;
  defaultNotes: string;
  termsAndConditions: string;
  showItemHsn: boolean;
  showCustomerAddress: boolean;
  showPaymentMode: boolean;
}

const DEFAULT_SETTINGS: DocumentSettings = {
  themeColor: "#e67e22",
  language: "en",
  fontSize: "normal",
  fontStyle: "default",
  pdfOrientation: "portrait",
  priceDecimals: 2,
  invoicePrefix: "INV-",
  invoiceSuffix: "",
  nextInvoiceNumber: 1,
  defaultDueDays: 15,
  defaultNotes: "Thank you for your business.",
  termsAndConditions: "Goods once sold will not be taken back.",
  showItemHsn: true,
  showCustomerAddress: true,
  showPaymentMode: true,
};

const THEME_COLORS = [
  "#e67e22",
  "#1e40af",
  "#16a34a",
  "#c2410c",
  "#6d28d9",
  "#2874f0",
  "#dc2626",
  "#0ea5e9",
];

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिन्दी" },
];

const FONT_SIZES = [
  { id: "small", label: "Small" },
  { id: "normal", label: "Normal" },
  { id: "large", label: "Large" },
] as const;

const FONT_STYLES = [
  { id: "default", label: "Default" },
  { id: "stylish", label: "Stylish" },
];

const PDF_ORIENTATIONS = [
  { id: "portrait" as const, label: "Portrait" },
  { id: "landscape" as const, label: "Landscape" },
];

const DECIMAL_OPTIONS = [0, 1, 2, 3];
const DEFAULT_DUE_OPTIONS = [0, 15, 30, 60] as const;

function useDocumentSettings() {
  const [settings, setSettings] = useState<DocumentSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    try {
      const raw = storage.getString(DOC_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DocumentSettings>;
        setSettings((s) => ({ ...s, ...parsed }));
      }
    } catch {}
  }, []);
  const save = useCallback((updates: Partial<DocumentSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      storage.set(DOC_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  return [settings, save] as const;
}

function SettingRow({
  label,
  description,
  value,
  onPress,
  pro,
  right,
}: {
  label: string;
  description?: string;
  value?: React.ReactNode;
  onPress?: () => void;
  pro?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className="py-4 border-b border-slate-100"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-medium text-slate-800">
              {label}
            </Text>
            {pro && (
              <View className="bg-red-100 px-1.5 py-0.5 rounded">
                <Text className="text-[10px] font-bold text-red-600">PRO</Text>
              </View>
            )}
          </View>
          {description && (
            <Text className="text-sm text-slate-500 mt-0.5">{description}</Text>
          )}
        </View>
        {right ?? (
          <View className="flex-row items-center gap-2">
            {value && <Text className="text-sm text-slate-600">{value}</Text>}
            {onPress && (
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-2">
      {title}
    </Text>
  );
}

type Props = NativeStackScreenProps<
  import("../../../navigation").MoreStackParams,
  "DocumentSettings"
>;

export function DocumentSettingsScreen({ navigation }: Props) {
  const [settings, save] = useDocumentSettings();
  const [invoiceTemplate, setInvoiceTemplate] = useState<TemplateId>("classic");
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [showFontStyleModal, setShowFontStyleModal] = useState(false);
  const [showOrientationModal, setShowOrientationModal] = useState(false);
  const [showDecimalsModal, setShowDecimalsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const t = storage.getString(INV_TEMPLATE_KEY) as TemplateId | undefined;
      if (t && TEMPLATES.some((x) => x.id === t)) setInvoiceTemplate(t);
    }, []),
  );

  const handleUpdate = () => {
    setHasChanges(false);
    showAlert("Saved", "Document settings updated.");
  };

  const handleExportSettings = useCallback(async () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        template: invoiceTemplate,
        settings,
      };
      await Share.share({
        title: "Execora Document Settings",
        message: JSON.stringify(payload, null, 2),
      });
    } catch {
      showAlert("Export failed", "Could not export document settings.");
    }
  }, [invoiceTemplate, settings]);

  const handleResetDefaults = useCallback(() => {
    Alert.alert(
      "Reset document settings?",
      "This will restore defaults for template preferences and billing defaults.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            storage.set(DOC_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
            setHasChanges(false);
            save(DEFAULT_SETTINGS);
            showAlert(
              "Reset complete",
              "Document settings restored to defaults.",
            );
          },
        },
      ],
    );
  }, [save]);

  const handleImportSettings = useCallback(() => {
    try {
      const parsed = JSON.parse(importText) as {
        template?: string;
        settings?: Partial<DocumentSettings>;
      };
      if (!parsed || typeof parsed !== "object" || !parsed.settings) {
        showAlert("Invalid JSON", "Paste a valid exported settings JSON.");
        return;
      }

      const merged: DocumentSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed.settings,
      };
      save(merged);
      storage.set(DOC_SETTINGS_KEY, JSON.stringify(merged));

      if (parsed.template && TEMPLATES.some((t) => t.id === parsed.template)) {
        const tpl = parsed.template as TemplateId;
        setInvoiceTemplate(tpl);
        storage.set(INV_TEMPLATE_KEY, tpl);
      }

      setImportText("");
      setShowImportModal(false);
      setHasChanges(false);
      showAlert("Imported", "Document settings imported successfully.");
    } catch {
      showAlert("Import failed", "Please check the pasted JSON and try again.");
    }
  }, [importText, save]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Document Templates — Invoice, Purchase, Quotation */}
        <TouchableOpacity
          onPress={() => (navigation as any).navigate("DocumentTemplates")}
          className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200"
        >
          <View className="flex-row items-center gap-4">
            {/* Demo invoice preview thumbnail (left) — shows selected template */}
            <InvoicePreviewThumbnail
              template={invoiceTemplate}
              data={SAMPLE_PREVIEW}
              width={88}
              height={120}
            />
            <View className="flex-1 min-w-0">
              <Text className="font-semibold text-slate-800">
                Document Templates
              </Text>
              <Text className="text-sm text-slate-500 mt-0.5">
                Invoice, Purchase, Quotation — 7 ready templates
              </Text>
              <Text
                className="text-sm font-medium mt-1"
                style={{
                  color:
                    TEMPLATES.find((t) => t.id === invoiceTemplate)?.color ??
                    "#16a34a",
                }}
              >
                {TEMPLATES.find((t) => t.id === invoiceTemplate)?.label ??
                  "Classic"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
          </View>
        </TouchableOpacity>

        {/* PREFERENCES */}
        <SectionTitle title="Preferences" />
        <View className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <View className="px-4 py-4 border-b border-slate-100">
            <Text className="font-medium text-slate-800">
              Show / Hide Details
            </Text>
            <Text className="text-sm text-slate-500 mt-0.5 mb-3">
              Turn invoice elements on or off to match your business needs
            </Text>
            <SettingRow
              label="Show HSN codes"
              description="Display HSN/SAC beside item rows in document preview"
              right={
                <Switch
                  value={settings.showItemHsn}
                  onValueChange={(value) => {
                    save({ showItemHsn: value });
                    setHasChanges(true);
                  }}
                  trackColor={{ false: "#cbd5e1", true: "#fdba74" }}
                  thumbColor={settings.showItemHsn ? "#e67e22" : "#f8fafc"}
                />
              }
            />
            <SettingRow
              label="Show customer address"
              description="Include billing address in templates and preview"
              right={
                <Switch
                  value={settings.showCustomerAddress}
                  onValueChange={(value) => {
                    save({ showCustomerAddress: value });
                    setHasChanges(true);
                  }}
                  trackColor={{ false: "#cbd5e1", true: "#fdba74" }}
                  thumbColor={
                    settings.showCustomerAddress ? "#e67e22" : "#f8fafc"
                  }
                />
              }
            />
            <SettingRow
              label="Show payment mode"
              description="Print payment mode on the invoice footer"
              right={
                <Switch
                  value={settings.showPaymentMode}
                  onValueChange={(value) => {
                    save({ showPaymentMode: value });
                    setHasChanges(true);
                  }}
                  trackColor={{ false: "#cbd5e1", true: "#fdba74" }}
                  thumbColor={settings.showPaymentMode ? "#e67e22" : "#f8fafc"}
                />
              }
            />
          </View>
          <View className="px-4 py-4 border-b border-slate-100">
            <Text className="font-medium text-slate-800">Billing Defaults</Text>
            <Text className="text-sm text-slate-500 mt-0.5">
              Prefill payment terms and notes when a new invoice opens
            </Text>
            <Text className="text-xs font-semibold text-slate-500 mt-3 mb-2 uppercase tracking-wide">
              Default Due Date
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {DEFAULT_DUE_OPTIONS.map((days) => {
                const selected = settings.defaultDueDays === days;
                return (
                  <TouchableOpacity
                    key={days}
                    onPress={() => {
                      save({ defaultDueDays: days });
                      setHasChanges(true);
                    }}
                    className={`px-3 py-2 rounded-lg border ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        selected ? "text-primary" : "text-slate-600"
                      }`}
                    >
                      {days === 0 ? "No due date" : `${days} days`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className="text-xs font-semibold text-slate-500 mt-4 mb-1 uppercase tracking-wide">
              Default Notes
            </Text>
            <TextInput
              value={settings.defaultNotes}
              onChangeText={(value) => {
                save({ defaultNotes: value });
                setHasChanges(true);
              }}
              placeholder="Add default thank-you note, bank details, or delivery instructions"
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 bg-slate-50 min-h-[92px]"
              accessibilityLabel="Default invoice notes"
            />
            <Text className="text-xs font-semibold text-slate-500 mt-4 mb-1 uppercase tracking-wide">
              Terms & Conditions
            </Text>
            <TextInput
              value={settings.termsAndConditions}
              onChangeText={(value) => {
                save({ termsAndConditions: value });
                setHasChanges(true);
              }}
              placeholder="Enter terms printed on invoice"
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              maxLength={500}
              className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 bg-slate-50 min-h-[88px]"
              accessibilityLabel="Invoice terms and conditions"
            />
            <Text className="text-[11px] text-slate-400 mt-1 text-right">
              {settings.termsAndConditions.length}/500
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleExportSettings}
            className="px-4 py-4 border-b border-slate-100"
          >
            <Text className="font-medium text-slate-800">Export Settings</Text>
            <Text className="text-sm text-slate-500 mt-0.5">
              Share your current document settings as JSON
            </Text>
            <View className="absolute right-4 top-4">
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowImportModal(true)}
            className="px-4 py-4 border-b border-slate-100"
          >
            <Text className="font-medium text-slate-800">Import Settings</Text>
            <Text className="text-sm text-slate-500 mt-0.5">
              Paste exported JSON to restore template and document preferences
            </Text>
            <View className="absolute right-4 top-4">
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowDecimalsModal(true)}
            className="px-4 py-4 border-b border-slate-100"
          >
            <View className="flex-row items-center gap-2">
              <Text className="font-medium text-slate-800">
                Price Decimal Format
              </Text>
              <View className="bg-red-100 px-1.5 py-0.5 rounded">
                <Text className="text-[10px] font-bold text-red-600">PRO</Text>
              </View>
            </View>
            <Text className="text-sm text-slate-500 mt-0.5">
              Set how many decimal places are shown for item prices
            </Text>
            <View className="absolute right-4 top-4 flex-row items-center gap-2">
              <Text className="text-slate-600">{settings.priceDecimals}</Text>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
          <View className="px-4 py-4">
            <Text className="font-medium text-slate-800">Prefix & Suffix</Text>
            <Text className="text-sm text-slate-500 mt-0.5">
              Customize document numbering (e.g. INV-0001, Q-2026-001)
            </Text>
            <View className="flex-row gap-3 mt-3">
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-500 mb-1">
                  Prefix
                </Text>
                <TextInput
                  value={settings.invoicePrefix}
                  onChangeText={(v) => {
                    save({ invoicePrefix: v });
                    setHasChanges(true);
                  }}
                  placeholder="INV-"
                  autoCapitalize="characters"
                  maxLength={10}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-slate-50"
                  accessibilityLabel="Invoice prefix"
                />
              </View>
              <View className="w-[120px]">
                <Text className="text-xs font-semibold text-slate-500 mb-1">
                  Next #
                </Text>
                <TextInput
                  value={String(settings.nextInvoiceNumber)}
                  onChangeText={(v) => {
                    const digits = v.replace(/[^0-9]/g, "");
                    const next = digits ? Math.max(1, parseInt(digits, 10)) : 1;
                    save({ nextInvoiceNumber: next });
                    setHasChanges(true);
                  }}
                  placeholder="1"
                  keyboardType="number-pad"
                  maxLength={9}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-slate-50"
                  accessibilityLabel="Next invoice number"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-500 mb-1">
                  Suffix
                </Text>
                <TextInput
                  value={settings.invoiceSuffix}
                  onChangeText={(v) => {
                    save({ invoiceSuffix: v });
                    setHasChanges(true);
                  }}
                  placeholder="none"
                  autoCapitalize="characters"
                  maxLength={10}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-slate-50"
                  accessibilityLabel="Invoice suffix"
                />
              </View>
            </View>
            <View className="mt-2 bg-slate-100 rounded-lg px-3 py-2">
              <Text className="text-xs text-slate-500">
                Preview:{" "}
                <Text className="font-semibold text-slate-700">
                  {settings.invoicePrefix || ""}
                  {String(
                    Math.max(1, settings.nextInvoiceNumber || 1),
                  ).padStart(4, "0")}
                  {settings.invoiceSuffix || ""}
                </Text>
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleResetDefaults}
              className="mt-3 px-3 py-2 rounded-lg border border-red-200 bg-red-50"
            >
              <Text className="text-xs font-semibold text-red-700">
                Reset to defaults
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* APPEARANCE */}
        <SectionTitle title="Appearance" />
        <View className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <View className="px-4 py-4 border-b border-slate-100">
            <Text className="font-medium text-slate-800">Theme Color</Text>
            <Text className="text-sm text-slate-500 mt-0.5">
              Customize your document&apos;s color theme
            </Text>
            <View className="flex-row flex-wrap gap-2 mt-3">
              {THEME_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => {
                    save({ themeColor: c });
                    setHasChanges(true);
                  }}
                  className="w-10 h-10 rounded-full border-2"
                  style={{
                    backgroundColor: c,
                    borderColor:
                      settings.themeColor === c ? "#0f172a" : "transparent",
                  }}
                />
              ))}
            </View>
            <Text className="text-xs text-slate-500 mt-2">
              {settings.themeColor}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowLanguageModal(true)}
            className="px-4 py-4 border-b border-slate-100 flex-row items-center justify-between"
          >
            <View>
              <Text className="font-medium text-slate-800">Language</Text>
              <Text className="text-sm text-slate-500 mt-0.5">
                Choose the language for your document
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-slate-600">
                {LANGUAGES.find((l) => l.id === settings.language)?.label ??
                  "English"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowFontSizeModal(true)}
            className="px-4 py-4 border-b border-slate-100"
          >
            <View className="flex-row items-center gap-2">
              <Text className="font-medium text-slate-800">Font Size</Text>
              <View className="bg-red-100 px-1.5 py-0.5 rounded">
                <Text className="text-[10px] font-bold text-red-600">PRO</Text>
              </View>
            </View>
            <Text className="text-sm text-slate-500 mt-0.5">
              This size will be applied to all documents
            </Text>
            <View className="absolute right-4 top-4 flex-row items-center gap-2">
              <Text className="text-slate-600 capitalize">
                {settings.fontSize}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowFontStyleModal(true)}
            className="px-4 py-4"
          >
            <Text className="font-medium text-slate-800">Font Style</Text>
            <Text className="text-sm text-slate-500 mt-0.5">
              Applies only to English
            </Text>
            <View className="absolute right-4 top-4 flex-row items-center gap-2">
              <Text className="text-slate-600">
                {FONT_STYLES.find((f) => f.id === settings.fontStyle)?.label ??
                  "Default"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* LAYOUT */}
        <SectionTitle title="Layout" />
        <View className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <TouchableOpacity
            onPress={() => setShowOrientationModal(true)}
            className="px-4 py-4 border-b border-slate-100 flex-row items-center justify-between"
          >
            <View>
              <Text className="font-medium text-slate-800">
                PDF Orientation
              </Text>
              <Text className="text-sm text-slate-500 mt-0.5">
                Select portrait or landscape layout
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-slate-600 capitalize">
                {settings.pdfOrientation}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
          <SettingRow
            label="Margins"
            description="Adjust document's top, bottom, left, and right spacing"
            pro
            onPress={() =>
              (navigation as any).navigate("ComingSoon", { title: "Margins" })
            }
          />
          <SettingRow
            label="Custom Headers"
            description="Create and save custom header layouts"
            pro
            onPress={() =>
              (navigation as any).navigate("ComingSoon", {
                title: "Custom Headers",
              })
            }
          />
        </View>

        {/* HEADER & FOOTER */}
        <SectionTitle title="Header & Footer" />
        <View className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <SettingRow
            label="Header Settings"
            description="Add header image and set repeat preference"
            pro
            onPress={() =>
              (navigation as any).navigate("ComingSoon", {
                title: "Header Settings",
              })
            }
          />
          <SettingRow
            label="Footer Settings"
            description="Add footer image or message"
            pro
            onPress={() =>
              (navigation as any).navigate("ComingSoon", {
                title: "Footer Settings",
              })
            }
          />
          <SettingRow
            label="Watermark"
            description="Add watermark to document"
            pro
            onPress={() =>
              (navigation as any).navigate("ComingSoon", { title: "Watermark" })
            }
          />
        </View>
      </ScrollView>

      {/* Update Button */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200">
        <TouchableOpacity
          disabled={!hasChanges}
          onPress={handleUpdate}
          className="rounded-xl items-center justify-center"
          style={{
            minHeight: SIZES.BUTTON.lg.minHeight,
            paddingVertical: SIZES.BUTTON.lg.paddingY,
            backgroundColor: hasChanges ? "#e67e22" : "#e2e8f0",
          }}
        >
          <Text
            style={{
              fontWeight: "700",
              fontSize: SIZES.BUTTON.lg.fontSize,
              color: hasChanges ? "#fff" : "#64748b",
            }}
          >
            Update Document Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-center items-center"
          onPress={() => setShowLanguageModal(false)}
        >
          <Pressable
            className="bg-white rounded-2xl p-6 w-[90%] max-w-sm"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-bold text-slate-800 mb-4">
              Language
            </Text>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.id}
                onPress={() => {
                  save({ language: l.id });
                  setShowLanguageModal(false);
                  setHasChanges(true);
                }}
                className="py-3 border-b border-slate-100 last:border-0"
              >
                <Text className="text-base">{l.label}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Font Size Modal */}
      <Modal
        visible={showFontSizeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFontSizeModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-center items-center"
          onPress={() => setShowFontSizeModal(false)}
        >
          <Pressable
            className="bg-white rounded-2xl p-6 w-[90%] max-w-sm"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-bold text-slate-800 mb-4">
              Font Size
            </Text>
            {FONT_SIZES.map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => {
                  save({ fontSize: f.id });
                  setShowFontSizeModal(false);
                  setHasChanges(true);
                }}
                className="py-3 border-b border-slate-100 last:border-0"
              >
                <Text className="text-base">{f.label}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Font Style Modal */}
      <Modal
        visible={showFontStyleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFontStyleModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-center items-center"
          onPress={() => setShowFontStyleModal(false)}
        >
          <Pressable
            className="bg-white rounded-2xl p-6 w-[90%] max-w-sm"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-bold text-slate-800 mb-4">
              Font Style
            </Text>
            {FONT_STYLES.map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => {
                  save({ fontStyle: f.id });
                  setShowFontStyleModal(false);
                  setHasChanges(true);
                }}
                className="py-3 border-b border-slate-100 last:border-0"
              >
                <Text className="text-base">{f.label}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* PDF Orientation Modal */}
      <Modal
        visible={showOrientationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOrientationModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-center items-center"
          onPress={() => setShowOrientationModal(false)}
        >
          <Pressable
            className="bg-white rounded-2xl p-6 w-[90%] max-w-sm"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-bold text-slate-800 mb-4">
              PDF Orientation
            </Text>
            {PDF_ORIENTATIONS.map((o) => (
              <TouchableOpacity
                key={o.id}
                onPress={() => {
                  save({ pdfOrientation: o.id });
                  setShowOrientationModal(false);
                  setHasChanges(true);
                }}
                className="py-3 border-b border-slate-100 last:border-0"
              >
                <Text className="text-base">{o.label}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Price Decimals Modal */}
      <Modal
        visible={showDecimalsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDecimalsModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-center items-center"
          onPress={() => setShowDecimalsModal(false)}
        >
          <Pressable
            className="bg-white rounded-2xl p-6 w-[90%] max-w-sm"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-bold text-slate-800 mb-4">
              Price Decimal Format
            </Text>
            {DECIMAL_OPTIONS.map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => {
                  save({ priceDecimals: n });
                  setShowDecimalsModal(false);
                  setHasChanges(true);
                }}
                className="py-3 border-b border-slate-100 last:border-0"
              >
                <Text className="text-base">{n} decimal places</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Import Settings Modal */}
      <Modal
        visible={showImportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImportModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-center items-center"
          onPress={() => setShowImportModal(false)}
        >
          <Pressable
            className="bg-white rounded-2xl p-5 w-[92%] max-w-md"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-bold text-slate-800 mb-2">
              Import Document Settings
            </Text>
            <Text className="text-sm text-slate-500 mb-3">
              Paste the exported JSON payload here.
            </Text>
            <TextInput
              value={importText}
              onChangeText={setImportText}
              placeholder='{"template":"classic","settings":{...}}'
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              className="border border-slate-200 rounded-xl px-3 py-3 text-xs text-slate-800 bg-slate-50 min-h-[180px]"
              accessibilityLabel="Import settings JSON"
            />
            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity
                onPress={() => {
                  setShowImportModal(false);
                  setImportText("");
                }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 items-center"
              >
                <Text className="text-slate-600 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleImportSettings}
                className="flex-1 rounded-xl bg-primary py-2.5 items-center"
              >
                <Text className="text-white font-semibold">Import</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
