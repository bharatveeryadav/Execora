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
exports.DocumentTemplatesScreen = DocumentTemplatesScreen;
/**
 * DocumentTemplatesScreen — Full-page template gallery for Invoice, Purchase, Quotation.
 * Uses sample data from @execora/shared for previews.
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const storage_1 = require("../lib/storage");
const InvoiceTemplatePreview_1 = require("../components/InvoiceTemplatePreview");
const shared_1 = require("@execora/shared");
/** Map template ID to matching demo for preview */
const TEMPLATE_TO_DEMO = {
    amazon: shared_1.DEMO_AMAZON,
    tata: shared_1.DEMO_TATA,
    dmart: shared_1.DEMO_DMART,
    nike: shared_1.DEMO_NIKE,
    instagram: shared_1.DEMO_INSTAGRAM,
    unilever: shared_1.DEMO_UNILEVER,
    service: shared_1.DEMO_SERVICE_BILL_SHIP,
    classic: shared_1.DEMO_AMAZON,
    modern: shared_1.DEMO_AMAZON,
    vyapari: shared_1.DEMO_AMAZON,
    thermal: shared_1.DEMO_AMAZON,
    ecom: shared_1.DEMO_AMAZON,
    flipkart: shared_1.DEMO_AMAZON,
    minimal: shared_1.DEMO_AMAZON,
};
/** Convert demo data to PreviewData (compatible shape) */
function toPreviewData(d) {
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
function DocumentTemplatesScreen() {
    const [invoiceTemplate, setInvoiceTemplate] = (0, react_1.useState)("classic");
    const [templateTab, setTemplateTab] = (0, react_1.useState)("invoice");
    const demos = (0, react_1.useMemo)(() => {
        if (templateTab === "invoice")
            return shared_1.DEMO_INVOICES;
        if (templateTab === "purchase")
            return shared_1.DEMO_PURCHASES;
        return shared_1.DEMO_QUOTATIONS;
    }, [templateTab]);
    const getPreviewDataForTemplate = (t) => {
        const demo = templateTab === "invoice" ? (TEMPLATE_TO_DEMO[t] ?? demos[0]) : demos[0];
        return toPreviewData(demo);
    };
    (0, react_1.useEffect)(() => {
        const t = storage_1.storage.getString(storage_1.INV_TEMPLATE_KEY);
        if (t && InvoiceTemplatePreview_1.TEMPLATES.some((x) => x.id === t))
            setInvoiceTemplate(t);
    }, []);
    const handleTemplateSelect = (t) => {
        setInvoiceTemplate(t);
        storage_1.storage.set(storage_1.INV_TEMPLATE_KEY, t);
        const stored = (() => {
            try {
                const raw = storage_1.storage.getString(storage_1.BIZ_STORAGE_KEY);
                return raw ? JSON.parse(raw) : {};
            }
            catch {
                return {};
            }
        })();
        stored.invoiceTemplate = t;
        storage_1.storage.set(storage_1.BIZ_STORAGE_KEY, JSON.stringify(stored));
    };
    const btnClass = (active) => `px-3 py-1 rounded border ${active ? "border-primary bg-primary" : "border-slate-300"}`;
    const btnTextClass = (active) => `text-xs font-medium ${active ? "text-white" : "text-slate-600"}`;
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "px-4 py-2 border-b border-slate-200 bg-slate-50/50" },
            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-800" }, "Document Templates"),
            react_1.default.createElement(react_native_1.Text, { className: "text-[11px] text-slate-500 mt-0.5" }, "Same templates for Invoice, Purchase, Quotation")),
        react_1.default.createElement(react_native_1.View, { className: "flex-row border-b border-slate-200 bg-white" },
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setTemplateTab("invoice"), className: `flex-1 py-2.5 flex-row items-center justify-center gap-1.5 ${templateTab === "invoice" ? "border-b-2 border-primary bg-primary/5" : ""}` },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "document-text-outline", size: 18, color: templateTab === "invoice" ? "#e67e22" : "#64748b" }),
                react_1.default.createElement(react_native_1.Text, { className: `font-semibold text-xs ${templateTab === "invoice" ? "text-primary" : "text-slate-600"}` }, "Invoice")),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setTemplateTab("purchase"), className: `flex-1 py-2.5 flex-row items-center justify-center gap-1.5 ${templateTab === "purchase" ? "border-b-2 border-primary bg-primary/5" : ""}` },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "cube-outline", size: 18, color: templateTab === "purchase" ? "#e67e22" : "#64748b" }),
                react_1.default.createElement(react_native_1.Text, { className: `font-semibold text-xs ${templateTab === "purchase" ? "text-primary" : "text-slate-600"}` }, "Purchase")),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setTemplateTab("quotation"), className: `flex-1 py-2.5 flex-row items-center justify-center gap-1.5 ${templateTab === "quotation" ? "border-b-2 border-primary bg-primary/5" : ""}` },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "chatbubble-ellipses-outline", size: 18, color: templateTab === "quotation" ? "#e67e22" : "#64748b" }),
                react_1.default.createElement(react_native_1.Text, { className: `font-semibold text-xs ${templateTab === "quotation" ? "text-primary" : "text-slate-600"}` }, "Quotation"))),
        react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1 px-3 py-3", showsVerticalScrollIndicator: true },
            templateTab === "invoice" && (react_1.default.createElement(react_native_1.View, { className: "gap-4 pb-6" }, InvoiceTemplatePreview_1.TEMPLATES.map((t) => (react_1.default.createElement(react_native_1.View, { key: t.id, className: "gap-1.5" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between" },
                    react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-slate-800 text-sm" }, t.label),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => handleTemplateSelect(t.id), className: btnClass(invoiceTemplate === t.id) },
                        react_1.default.createElement(react_native_1.Text, { className: btnTextClass(invoiceTemplate === t.id) }, invoiceTemplate === t.id ? "Selected" : "Use"))),
                react_1.default.createElement(react_native_1.View, { className: "rounded-lg border border-slate-200 bg-slate-50/50 p-2 overflow-hidden" },
                    react_1.default.createElement(InvoiceTemplatePreview_1.InvoiceTemplatePreview, { template: t.id, data: getPreviewDataForTemplate(t.id) }))))))),
            templateTab === "purchase" && (react_1.default.createElement(react_native_1.View, { className: "gap-4 pb-6" }, InvoiceTemplatePreview_1.TEMPLATES.map((t) => (react_1.default.createElement(react_native_1.View, { key: t.id, className: "gap-1.5" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between" },
                    react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-slate-800 text-sm" }, t.label),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => handleTemplateSelect(t.id), className: btnClass(invoiceTemplate === t.id) },
                        react_1.default.createElement(react_native_1.Text, { className: btnTextClass(invoiceTemplate === t.id) }, invoiceTemplate === t.id ? "Selected" : "Use"))),
                react_1.default.createElement(react_native_1.View, { className: "rounded-lg border border-slate-200 bg-slate-50/50 p-2 overflow-hidden" },
                    react_1.default.createElement(InvoiceTemplatePreview_1.InvoiceTemplatePreview, { template: t.id, data: getPreviewDataForTemplate(t.id) }))))))),
            templateTab === "quotation" && (react_1.default.createElement(react_native_1.View, { className: "gap-4 pb-6" }, InvoiceTemplatePreview_1.TEMPLATES.map((t) => (react_1.default.createElement(react_native_1.View, { key: t.id, className: "gap-1.5" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between" },
                    react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-slate-800 text-sm" }, t.label),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => handleTemplateSelect(t.id), className: btnClass(invoiceTemplate === t.id) },
                        react_1.default.createElement(react_native_1.Text, { className: btnTextClass(invoiceTemplate === t.id) }, invoiceTemplate === t.id ? "Selected" : "Use"))),
                react_1.default.createElement(react_native_1.View, { className: "rounded-lg border border-slate-200 bg-slate-50/50 p-2 overflow-hidden" },
                    react_1.default.createElement(InvoiceTemplatePreview_1.InvoiceTemplatePreview, { template: t.id, data: getPreviewDataForTemplate(t.id) }))))))))));
}
//# sourceMappingURL=DocumentTemplatesScreen.js.map