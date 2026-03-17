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
  Switch,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { storage, DOC_SETTINGS_KEY, INV_TEMPLATE_KEY, BIZ_STORAGE_KEY } from "../lib/storage";
import { TEMPLATES, type TemplateId } from "../components/InvoiceTemplatePreview";
import { TemplateThumbnail } from "../components/InvoiceTemplatePreview";

export interface DocumentSettings {
  themeColor: string;
  language: string;
  fontSize: "small" | "normal" | "large";
  fontStyle: string;
  pdfOrientation: "portrait" | "landscape";
  priceDecimals: number;
  invoicePrefix: string;
  invoiceSuffix: string;
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
            <Text className="text-base font-medium text-slate-800">{label}</Text>
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
            {onPress && <Ionicons name="chevron-forward" size={20} color="#94a3b8" />}
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

export function DocumentSettingsScreen() {
  const navigation = useNavigation();
  const [settings, save] = useDocumentSettings();
  const [invoiceTemplate, setInvoiceTemplate] = useState<TemplateId>("classic");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [showFontStyleModal, setShowFontStyleModal] = useState(false);
  const [showOrientationModal, setShowOrientationModal] = useState(false);
  const [showDecimalsModal, setShowDecimalsModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
    setShowTemplateModal(false);
    setHasChanges(true);
  };

  const handleUpdate = () => {
    setHasChanges(false);
    Alert.alert("Saved", "Document settings updated.");
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="flex-row items-center border-b border-slate-200 px-4 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800 flex-1 ml-2">
          Document Settings
        </Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Invoice Templates */}
        <TouchableOpacity
          onPress={() => setShowTemplateModal(true)}
          className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="font-semibold text-slate-800">Invoice Templates</Text>
              <Text className="text-sm text-slate-500 mt-0.5">
                Choose from 7+ ready templates
              </Text>
              <Text className="text-sm text-primary font-medium mt-1">
                {TEMPLATES.find((t) => t.id === invoiceTemplate)?.label ?? "Classic"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
          </View>
        </TouchableOpacity>

        {/* PREFERENCES */}
        <SectionTitle title="Preferences" />
        <View className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <TouchableOpacity
            onPress={() => (navigation as any).navigate("ComingSoon", { title: "Show / Hide Details" })}
            className="px-4 py-4 border-b border-slate-100"
          >
            <Text className="font-medium text-slate-800">Show / Hide Details</Text>
            <Text className="text-sm text-slate-500 mt-0.5">
              Turn invoice elements on or off to match your business needs
            </Text>
            <View className="absolute right-4 top-4">
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate("ComingSoon", { title: "Export Settings" })}
            className="px-4 py-4 border-b border-slate-100"
          >
            <Text className="font-medium text-slate-800">Export Settings</Text>
            <Text className="text-sm text-slate-500 mt-0.5">
              Configure export related preferences
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
              <Text className="font-medium text-slate-800">Price Decimal Format</Text>
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
          <TouchableOpacity
            onPress={() => (navigation as any).navigate("ComingSoon", { title: "Prefix & Suffix" })}
            className="px-4 py-4"
          >
            <Text className="font-medium text-slate-800">Prefix & Suffix</Text>
            <Text className="text-sm text-slate-500 mt-0.5">
              Add prefixes and suffixes to manage document numbering
            </Text>
            <View className="absolute right-4 top-4">
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
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
                    borderColor: settings.themeColor === c ? "#0f172a" : "transparent",
                  }}
                />
              ))}
            </View>
            <Text className="text-xs text-slate-500 mt-2">{settings.themeColor}</Text>
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
                {LANGUAGES.find((l) => l.id === settings.language)?.label ?? "English"}
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
              <Text className="text-slate-600 capitalize">{settings.fontSize}</Text>
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
                {FONT_STYLES.find((f) => f.id === settings.fontStyle)?.label ?? "Default"}
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
              <Text className="font-medium text-slate-800">PDF Orientation</Text>
              <Text className="text-sm text-slate-500 mt-0.5">
                Select portrait or landscape layout
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-slate-600 capitalize">{settings.pdfOrientation}</Text>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
          <SettingRow
            label="Margins"
            description="Adjust document's top, bottom, left, and right spacing"
            pro
            onPress={() => (navigation as any).navigate("ComingSoon", { title: "Margins" })}
          />
          <SettingRow
            label="Custom Headers"
            description="Create and save custom header layouts"
            pro
            onPress={() => (navigation as any).navigate("ComingSoon", { title: "Custom Headers" })}
          />
        </View>

        {/* HEADER & FOOTER */}
        <SectionTitle title="Header & Footer" />
        <View className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <SettingRow
            label="Header Settings"
            description="Add header image and set repeat preference"
            pro
            onPress={() => (navigation as any).navigate("ComingSoon", { title: "Header Settings" })}
          />
          <SettingRow
            label="Footer Settings"
            description="Add footer image or message"
            pro
            onPress={() => (navigation as any).navigate("ComingSoon", { title: "Footer Settings" })}
          />
          <SettingRow
            label="Watermark"
            description="Add watermark to document"
            pro
            onPress={() => (navigation as any).navigate("ComingSoon", { title: "Watermark" })}
          />
        </View>
      </ScrollView>

      {/* Update Button */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200">
        <TouchableOpacity
          onPress={handleUpdate}
          className={`py-4 rounded-xl items-center justify-center ${hasChanges ? "bg-primary" : "bg-slate-200"}`}
        >
          <Text className={`font-bold text-base ${hasChanges ? "text-white" : "text-slate-500"}`}>
            Update Document Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Template Selection Modal */}
      <Modal visible={showTemplateModal} transparent animationType="slide">
        <Pressable className="flex-1 bg-black/40" onPress={() => setShowTemplateModal(false)} />
        <View className="bg-white rounded-t-3xl max-h-[80%]">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200">
            <Text className="text-lg font-bold text-slate-800">Invoice Templates</Text>
            <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-4">
            <View className="flex-row gap-3 px-4">
              {TEMPLATES.map((t) => (
                <TemplateThumbnail
                  key={t.id}
                  template={t}
                  selected={invoiceTemplate === t.id}
                  onPress={() => handleTemplateSelect(t.id)}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/40 justify-center items-center" onPress={() => setShowLanguageModal(false)}>
          <Pressable className="bg-white rounded-2xl p-6 w-[90%] max-w-sm" onPress={(e) => e.stopPropagation()}>
            <Text className="text-lg font-bold text-slate-800 mb-4">Language</Text>
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
      <Modal visible={showFontSizeModal} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/40 justify-center items-center" onPress={() => setShowFontSizeModal(false)}>
          <Pressable className="bg-white rounded-2xl p-6 w-[90%] max-w-sm" onPress={(e) => e.stopPropagation()}>
            <Text className="text-lg font-bold text-slate-800 mb-4">Font Size</Text>
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
      <Modal visible={showFontStyleModal} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/40 justify-center items-center" onPress={() => setShowFontStyleModal(false)}>
          <Pressable className="bg-white rounded-2xl p-6 w-[90%] max-w-sm" onPress={(e) => e.stopPropagation()}>
            <Text className="text-lg font-bold text-slate-800 mb-4">Font Style</Text>
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
      <Modal visible={showOrientationModal} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/40 justify-center items-center" onPress={() => setShowOrientationModal(false)}>
          <Pressable className="bg-white rounded-2xl p-6 w-[90%] max-w-sm" onPress={(e) => e.stopPropagation()}>
            <Text className="text-lg font-bold text-slate-800 mb-4">PDF Orientation</Text>
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
      <Modal visible={showDecimalsModal} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/40 justify-center items-center" onPress={() => setShowDecimalsModal(false)}>
          <Pressable className="bg-white rounded-2xl p-6 w-[90%] max-w-sm" onPress={(e) => e.stopPropagation()}>
            <Text className="text-lg font-bold text-slate-800 mb-4">Price Decimal Format</Text>
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
    </SafeAreaView>
  );
}
