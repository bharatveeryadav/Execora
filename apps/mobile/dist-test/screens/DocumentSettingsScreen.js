"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentSettingsScreen = DocumentSettingsScreen;
/**
 * DocumentSettingsScreen — Invoice/document customization (per reference UI).
 * Sections: Invoice Templates, PREFERENCES, APPEARANCE, LAYOUT, HEADER & FOOTER.
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const native_1 = require("@react-navigation/native");
const vector_icons_1 = require("@expo/vector-icons");
const constants_1 = require("../lib/constants");
const storage_1 = require("../lib/storage");
const InvoiceTemplatePreview_1 = require("../components/InvoiceTemplatePreview");
const shared_1 = require("@execora/shared");
function toPreviewData(d) {
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
const SAMPLE_PREVIEW = toPreviewData(shared_1.DEMO_KIRANA);
const DEFAULT_SETTINGS = {
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
];
const FONT_STYLES = [
    { id: "default", label: "Default" },
    { id: "stylish", label: "Stylish" },
];
const PDF_ORIENTATIONS = [
    { id: "portrait", label: "Portrait" },
    { id: "landscape", label: "Landscape" },
];
const DECIMAL_OPTIONS = [0, 1, 2, 3];
function useDocumentSettings() {
    const [settings, setSettings] = (0, react_1.useState)(DEFAULT_SETTINGS);
    (0, react_1.useEffect)(() => {
        try {
            const raw = storage_1.storage.getString(storage_1.DOC_SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                setSettings((s) => ({ ...s, ...parsed }));
            }
        }
        catch { }
    }, []);
    const save = (0, react_1.useCallback)((updates) => {
        setSettings((prev) => {
            const next = { ...prev, ...updates };
            storage_1.storage.set(storage_1.DOC_SETTINGS_KEY, JSON.stringify(next));
            return next;
        });
    }, []);
    return [settings, save];
}
function SettingRow({ label, description, value, onPress, pro, right, }) {
    return (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onPress, disabled: !onPress, activeOpacity: onPress ? 0.7 : 1, className: "py-4 border-b border-slate-100" },
        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 mr-3" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-base font-medium text-slate-800" }, label),
                    pro && (react_1.default.createElement(react_native_1.View, { className: "bg-red-100 px-1.5 py-0.5 rounded" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-bold text-red-600" }, "PRO")))),
                description && (react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 mt-0.5" }, description))),
            right ?? (react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                value && react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, value),
                onPress && react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 20, color: "#94a3b8" }))))));
}
function SectionTitle({ title }) {
    return (react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-2" }, title));
}
function DocumentSettingsScreen({ navigation }) {
    const [settings, save] = useDocumentSettings();
    const [invoiceTemplate, setInvoiceTemplate] = (0, react_1.useState)("classic");
    const [showLanguageModal, setShowLanguageModal] = (0, react_1.useState)(false);
    const [showFontSizeModal, setShowFontSizeModal] = (0, react_1.useState)(false);
    const [showFontStyleModal, setShowFontStyleModal] = (0, react_1.useState)(false);
    const [showOrientationModal, setShowOrientationModal] = (0, react_1.useState)(false);
    const [showDecimalsModal, setShowDecimalsModal] = (0, react_1.useState)(false);
    const [hasChanges, setHasChanges] = (0, react_1.useState)(false);
    (0, native_1.useFocusEffect)((0, react_1.useCallback)(() => {
        const t = storage_1.storage.getString(storage_1.INV_TEMPLATE_KEY);
        if (t && InvoiceTemplatePreview_1.TEMPLATES.some((x) => x.id === t))
            setInvoiceTemplate(t);
    }, []));
    const handleUpdate = () => {
        setHasChanges(false);
        (0, alerts_1.showAlert)("Saved", "Document settings updated.");
    };
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1 px-4", contentContainerStyle: { paddingBottom: 100 } },
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.navigate("DocumentTemplates"), className: "mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-4" },
                    react_1.default.createElement(InvoiceTemplatePreview_1.InvoicePreviewThumbnail, { template: invoiceTemplate, data: SAMPLE_PREVIEW, width: 88, height: 120 }),
                    react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                        react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-slate-800" }, "Document Templates"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 mt-0.5" }, "Invoice, Purchase, Quotation \u2014 7 ready templates"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium mt-1", style: { color: InvoiceTemplatePreview_1.TEMPLATES.find((t) => t.id === invoiceTemplate)?.color ?? "#16a34a" } }, InvoiceTemplatePreview_1.TEMPLATES.find((t) => t.id === invoiceTemplate)?.label ?? "Classic")),
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 24, color: "#94a3b8" }))),
            react_1.default.createElement(SectionTitle, { title: "Preferences" }),
            react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-xl border border-slate-200 overflow-hidden" },
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.navigate("ComingSoon", { title: "Show / Hide Details" }), className: "px-4 py-4 border-b border-slate-100" },
                    react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, "Show / Hide Details"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 mt-0.5" }, "Turn invoice elements on or off to match your business needs"),
                    react_1.default.createElement(react_native_1.View, { className: "absolute right-4 top-4" },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 20, color: "#94a3b8" }))),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.navigate("ComingSoon", { title: "Export Settings" }), className: "px-4 py-4 border-b border-slate-100" },
                    react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, "Export Settings"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 mt-0.5" }, "Configure export related preferences"),
                    react_1.default.createElement(react_native_1.View, { className: "absolute right-4 top-4" },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 20, color: "#94a3b8" }))),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowDecimalsModal(true), className: "px-4 py-4 border-b border-slate-100" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                        react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, "Price Decimal Format"),
                        react_1.default.createElement(react_native_1.View, { className: "bg-red-100 px-1.5 py-0.5 rounded" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-bold text-red-600" }, "PRO"))),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 mt-0.5" }, "Set how many decimal places are shown for item prices"),
                    react_1.default.createElement(react_native_1.View, { className: "absolute right-4 top-4 flex-row items-center gap-2" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-slate-600" }, settings.priceDecimals),
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 20, color: "#94a3b8" }))),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.navigate("ComingSoon", { title: "Prefix & Suffix" }), className: "px-4 py-4" },
                    react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, "Prefix & Suffix"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 mt-0.5" }, "Add prefixes and suffixes to manage document numbering"),
                    react_1.default.createElement(react_native_1.View, { className: "absolute right-4 top-4" },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 20, color: "#94a3b8" })))),
            react_1.default.createElement(SectionTitle, { title: "Appearance" }),
            react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-xl border border-slate-200 overflow-hidden" },
                react_1.default.createElement(react_native_1.View, { className: "px-4 py-4 border-b border-slate-100" },
                    react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, "Theme Color"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 mt-0.5" }, "Customize your document's color theme"),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-2 mt-3" }, THEME_COLORS.map((c) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: c, onPress: () => {
                            save({ themeColor: c });
                            setHasChanges(true);
                        }, className: "w-10 h-10 rounded-full border-2", style: {
                            backgroundColor: c,
                            borderColor: settings.themeColor === c ? "#0f172a" : "transparent",
                        } })))),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mt-2" }, settings.themeColor)),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowLanguageModal(true), className: "px-4 py-4 border-b border-slate-100 flex-row items-center justify-between" },
                    react_1.default.createElement(react_native_1.View, null,
                        react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, "Language"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 mt-0.5" }, "Choose the language for your document")),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-slate-600" }, LANGUAGES.find((l) => l.id === settings.language)?.label ?? "English"),
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 20, color: "#94a3b8" }))),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowFontSizeModal(true), className: "px-4 py-4 border-b border-slate-100" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                        react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, "Font Size"),
                        react_1.default.createElement(react_native_1.View, { className: "bg-red-100 px-1.5 py-0.5 rounded" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-bold text-red-600" }, "PRO"))),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 mt-0.5" }, "This size will be applied to all documents"),
                    react_1.default.createElement(react_native_1.View, { className: "absolute right-4 top-4 flex-row items-center gap-2" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-slate-600 capitalize" }, settings.fontSize),
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 20, color: "#94a3b8" }))),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowFontStyleModal(true), className: "px-4 py-4" },
                    react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, "Font Style"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 mt-0.5" }, "Applies only to English"),
                    react_1.default.createElement(react_native_1.View, { className: "absolute right-4 top-4 flex-row items-center gap-2" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-slate-600" }, FONT_STYLES.find((f) => f.id === settings.fontStyle)?.label ?? "Default"),
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 20, color: "#94a3b8" })))),
            react_1.default.createElement(SectionTitle, { title: "Layout" }),
            react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-xl border border-slate-200 overflow-hidden" },
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowOrientationModal(true), className: "px-4 py-4 border-b border-slate-100 flex-row items-center justify-between" },
                    react_1.default.createElement(react_native_1.View, null,
                        react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" }, "PDF Orientation"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 mt-0.5" }, "Select portrait or landscape layout")),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-slate-600 capitalize" }, settings.pdfOrientation),
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 20, color: "#94a3b8" }))),
                react_1.default.createElement(SettingRow, { label: "Margins", description: "Adjust document's top, bottom, left, and right spacing", pro: true, onPress: () => navigation.navigate("ComingSoon", { title: "Margins" }) }),
                react_1.default.createElement(SettingRow, { label: "Custom Headers", description: "Create and save custom header layouts", pro: true, onPress: () => navigation.navigate("ComingSoon", { title: "Custom Headers" }) })),
            react_1.default.createElement(SectionTitle, { title: "Header & Footer" }),
            react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-xl border border-slate-200 overflow-hidden" },
                react_1.default.createElement(SettingRow, { label: "Header Settings", description: "Add header image and set repeat preference", pro: true, onPress: () => navigation.navigate("ComingSoon", { title: "Header Settings" }) }),
                react_1.default.createElement(SettingRow, { label: "Footer Settings", description: "Add footer image or message", pro: true, onPress: () => navigation.navigate("ComingSoon", { title: "Footer Settings" }) }),
                react_1.default.createElement(SettingRow, { label: "Watermark", description: "Add watermark to document", pro: true, onPress: () => navigation.navigate("ComingSoon", { title: "Watermark" }) }))),
        react_1.default.createElement(react_native_1.View, { className: "absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200" },
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleUpdate, className: "rounded-xl items-center justify-center", style: {
                    minHeight: constants_1.SIZES.BUTTON.lg.minHeight,
                    paddingVertical: constants_1.SIZES.BUTTON.lg.paddingY,
                    backgroundColor: hasChanges ? "#e67e22" : "#e2e8f0",
                } },
                react_1.default.createElement(react_native_1.Text, { style: {
                        fontWeight: "700",
                        fontSize: constants_1.SIZES.BUTTON.lg.fontSize,
                        color: hasChanges ? "#fff" : "#64748b",
                    } }, "Update Document Settings"))),
        react_1.default.createElement(react_native_1.Modal, { visible: showLanguageModal, transparent: true, animationType: "fade" },
            react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/40 justify-center items-center", onPress: () => setShowLanguageModal(false) },
                react_1.default.createElement(react_native_1.Pressable, { className: "bg-white rounded-2xl p-6 w-[90%] max-w-sm", onPress: (e) => e.stopPropagation() },
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800 mb-4" }, "Language"),
                    LANGUAGES.map((l) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: l.id, onPress: () => {
                            save({ language: l.id });
                            setShowLanguageModal(false);
                            setHasChanges(true);
                        }, className: "py-3 border-b border-slate-100 last:border-0" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-base" }, l.label))))))),
        react_1.default.createElement(react_native_1.Modal, { visible: showFontSizeModal, transparent: true, animationType: "fade" },
            react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/40 justify-center items-center", onPress: () => setShowFontSizeModal(false) },
                react_1.default.createElement(react_native_1.Pressable, { className: "bg-white rounded-2xl p-6 w-[90%] max-w-sm", onPress: (e) => e.stopPropagation() },
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800 mb-4" }, "Font Size"),
                    FONT_SIZES.map((f) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: f.id, onPress: () => {
                            save({ fontSize: f.id });
                            setShowFontSizeModal(false);
                            setHasChanges(true);
                        }, className: "py-3 border-b border-slate-100 last:border-0" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-base" }, f.label))))))),
        react_1.default.createElement(react_native_1.Modal, { visible: showFontStyleModal, transparent: true, animationType: "fade" },
            react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/40 justify-center items-center", onPress: () => setShowFontStyleModal(false) },
                react_1.default.createElement(react_native_1.Pressable, { className: "bg-white rounded-2xl p-6 w-[90%] max-w-sm", onPress: (e) => e.stopPropagation() },
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800 mb-4" }, "Font Style"),
                    FONT_STYLES.map((f) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: f.id, onPress: () => {
                            save({ fontStyle: f.id });
                            setShowFontStyleModal(false);
                            setHasChanges(true);
                        }, className: "py-3 border-b border-slate-100 last:border-0" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-base" }, f.label))))))),
        react_1.default.createElement(react_native_1.Modal, { visible: showOrientationModal, transparent: true, animationType: "fade" },
            react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/40 justify-center items-center", onPress: () => setShowOrientationModal(false) },
                react_1.default.createElement(react_native_1.Pressable, { className: "bg-white rounded-2xl p-6 w-[90%] max-w-sm", onPress: (e) => e.stopPropagation() },
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800 mb-4" }, "PDF Orientation"),
                    PDF_ORIENTATIONS.map((o) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: o.id, onPress: () => {
                            save({ pdfOrientation: o.id });
                            setShowOrientationModal(false);
                            setHasChanges(true);
                        }, className: "py-3 border-b border-slate-100 last:border-0" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-base" }, o.label))))))),
        react_1.default.createElement(react_native_1.Modal, { visible: showDecimalsModal, transparent: true, animationType: "fade" },
            react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/40 justify-center items-center", onPress: () => setShowDecimalsModal(false) },
                react_1.default.createElement(react_native_1.Pressable, { className: "bg-white rounded-2xl p-6 w-[90%] max-w-sm", onPress: (e) => e.stopPropagation() },
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800 mb-4" }, "Price Decimal Format"),
                    DECIMAL_OPTIONS.map((n) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: n, onPress: () => {
                            save({ priceDecimals: n });
                            setShowDecimalsModal(false);
                            setHasChanges(true);
                        }, className: "py-3 border-b border-slate-100 last:border-0" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-base" },
                            n,
                            " decimal places")))))))));
}
//# sourceMappingURL=DocumentSettingsScreen.js.map