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
exports.TEMPLATES = void 0;
exports.InvoiceTemplatePreview = InvoiceTemplatePreview;
exports.InvoicePreviewThumbnail = InvoicePreviewThumbnail;
exports.TemplateThumbnail = TemplateThumbnail;
/**
 * InvoiceTemplatePreview — React Native invoice template previews.
 * Matches web InvoiceTemplatePreview (7 templates).
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const PreviewSettingsContext = (0, react_1.createContext)({});
exports.TEMPLATES = [
    {
        id: "classic",
        label: "Classic",
        desc: "Traditional B&W",
        color: "#374151",
    },
    { id: "modern", label: "Modern", desc: "Clean blue", color: "#1e40af" },
    { id: "vyapari", label: "Vyapari", desc: "Indian market", color: "#c2410c" },
    { id: "thermal", label: "Thermal", desc: "80mm receipt", color: "#111827" },
    { id: "ecom", label: "E-Com", desc: "Amazon-style", color: "#ff9900" },
    { id: "flipkart", label: "Flipkart", desc: "Blue e-com", color: "#2874f0" },
    { id: "minimal", label: "Minimal", desc: "Typography", color: "#6d28d9" },
    { id: "amazon", label: "Amazon", desc: "E-commerce", color: "#ff9900" },
    { id: "tata", label: "Tata", desc: "Corporate", color: "#0066b3" },
    { id: "dmart", label: "DMart", desc: "Retail", color: "#e31837" },
    { id: "nike", label: "Nike", desc: "Sportswear", color: "#111827" },
    { id: "instagram", label: "Instagram", desc: "Landscape", color: "#e4405f" },
    { id: "unilever", label: "Unilever", desc: "FMCG", color: "#0066b3" },
    {
        id: "service",
        label: "Service",
        desc: "Bill To / Ship To",
        color: "#059669",
    },
];
const formatInr = (n, decimals = 2) => "₹" +
    n.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
function useFormatInr() {
    const { priceDecimals = 2 } = (0, react_1.useContext)(PreviewSettingsContext);
    return (n) => formatInr(n, priceDecimals);
}
// ── Shared totals block ───────────────────────────────────────────────────────
function TotalsBlock({ d, accentColor = "#374151", thermal = false, showTotalItems = false, }) {
    const fmt = useFormatInr();
    const totalQty = d.items.reduce((s, i) => s + i.qty, 0);
    return (react_1.default.createElement(react_native_1.View, { style: [styles.totalsBlock, thermal && styles.totalsBlockThermal] },
        showTotalItems && !thermal && (react_1.default.createElement(react_native_1.View, { style: styles.totalsRow },
            react_1.default.createElement(react_native_1.Text, { style: styles.totalsLabel },
                "Total Items / Qty: ",
                d.items.length,
                " / ",
                totalQty.toFixed(3)))),
        react_1.default.createElement(react_native_1.View, { style: styles.totalsRow },
            react_1.default.createElement(react_native_1.Text, { style: thermal ? styles.thermalText : styles.totalsLabel }, "Subtotal"),
            react_1.default.createElement(react_native_1.Text, { style: thermal ? styles.thermalText : styles.totalsValue }, fmt(d.subtotal))),
        d.discountAmt > 0 && (react_1.default.createElement(react_native_1.View, { style: styles.totalsRow },
            react_1.default.createElement(react_native_1.Text, { style: [styles.totalsLabel, { color: "#16a34a" }] }, "Discount"),
            react_1.default.createElement(react_native_1.Text, { style: [styles.totalsValue, { color: "#16a34a" }] },
                "-",
                fmt(d.discountAmt)))),
        (d.igst ?? 0) > 0 && (react_1.default.createElement(react_native_1.View, { style: styles.totalsRow },
            react_1.default.createElement(react_native_1.Text, { style: thermal ? styles.thermalText : styles.totalsLabel }, "IGST"),
            react_1.default.createElement(react_native_1.Text, { style: thermal ? styles.thermalText : styles.totalsValue }, fmt(d.igst)))),
        d.cgst > 0 && (react_1.default.createElement(react_native_1.View, { style: styles.totalsRow },
            react_1.default.createElement(react_native_1.Text, { style: thermal ? styles.thermalText : styles.totalsLabel }, "CGST"),
            react_1.default.createElement(react_native_1.Text, { style: thermal ? styles.thermalText : styles.totalsValue }, fmt(d.cgst)))),
        d.sgst > 0 && (react_1.default.createElement(react_native_1.View, { style: styles.totalsRow },
            react_1.default.createElement(react_native_1.Text, { style: thermal ? styles.thermalText : styles.totalsLabel }, "SGST"),
            react_1.default.createElement(react_native_1.Text, { style: thermal ? styles.thermalText : styles.totalsValue }, fmt(d.sgst)))),
        react_1.default.createElement(react_native_1.View, { style: [styles.totalsTotal, { borderTopColor: accentColor }] },
            react_1.default.createElement(react_native_1.Text, { style: [styles.totalsTotalLabel, { color: accentColor }] }, "Total"),
            react_1.default.createElement(react_native_1.Text, { style: [styles.totalsTotalValue, { color: accentColor }] }, fmt(d.total))),
        d.amountInWords ? (react_1.default.createElement(react_native_1.Text, { style: [styles.amountWords, thermal && styles.thermalText] }, d.amountInWords)) : null,
        d.reverseCharge && (react_1.default.createElement(react_native_1.Text, { style: styles.reverseCharge }, "Tax is payable on Reverse Charge"))));
}
// ── Classic ───────────────────────────────────────────────────────────────────
function ClassicPreview({ d }) {
    const { themeColor, showItemHsn, showCustomerAddress } = (0, react_1.useContext)(PreviewSettingsContext);
    const accent = themeColor ?? "#374151";
    return (react_1.default.createElement(react_native_1.View, { style: [styles.card, styles.classicCard] },
        react_1.default.createElement(react_native_1.View, { style: styles.classicHeader },
            react_1.default.createElement(react_native_1.Text, { style: styles.classicShopName }, d.shopName),
            d.supplierAddress && (react_1.default.createElement(react_native_1.Text, { style: styles.classicSub }, d.supplierAddress)),
            d.supplierGstin && (react_1.default.createElement(react_native_1.Text, { style: styles.classicSub },
                "GSTIN: ",
                d.supplierGstin)),
            d.compositionScheme && (react_1.default.createElement(react_native_1.Text, { style: styles.compositionText }, "Composition Taxable Person")),
            react_1.default.createElement(react_native_1.Text, { style: styles.classicSub }, "TAX INVOICE")),
        react_1.default.createElement(react_native_1.View, { style: styles.metaRow },
            react_1.default.createElement(react_native_1.View, null,
                react_1.default.createElement(react_native_1.Text, { style: styles.metaBold }, "Bill To:"),
                react_1.default.createElement(react_native_1.Text, null, d.customerName),
                showCustomerAddress !== false && d.recipientAddress && (react_1.default.createElement(react_native_1.Text, { style: styles.metaSmall }, d.recipientAddress)),
                d.gstin && react_1.default.createElement(react_native_1.Text, null,
                    "GSTIN: ",
                    d.gstin)),
            react_1.default.createElement(react_native_1.View, { style: { alignItems: "flex-end" } },
                react_1.default.createElement(react_native_1.Text, { style: styles.metaBold },
                    "Invoice #: ",
                    d.invoiceNo),
                react_1.default.createElement(react_native_1.Text, { style: styles.metaBold },
                    "Date: ",
                    d.date),
                d.tags && d.tags.length > 0 && (react_1.default.createElement(react_native_1.Text, { style: [styles.metaSmall, { marginTop: 2 }] }, d.tags.join(" • "))))),
        react_1.default.createElement(ItemsTable, { items: d.items, thermal: false, showHsn: showItemHsn ?? false }),
        react_1.default.createElement(TotalsBlock, { d: d, accentColor: accent })));
}
// ── Modern ───────────────────────────────────────────────────────────────────
function ModernPreview({ d }) {
    const { themeColor } = (0, react_1.useContext)(PreviewSettingsContext);
    const hdr = themeColor ?? "#1e40af";
    return (react_1.default.createElement(react_native_1.View, { style: [styles.card, styles.modernCard] },
        react_1.default.createElement(react_native_1.View, { style: [styles.modernHeader, { backgroundColor: hdr }] },
            react_1.default.createElement(react_native_1.View, null,
                react_1.default.createElement(react_native_1.Text, { style: styles.modernShopName }, d.shopName),
                d.supplierAddress && (react_1.default.createElement(react_native_1.Text, { style: styles.modernHeaderSub }, d.supplierAddress)),
                d.supplierGstin && (react_1.default.createElement(react_native_1.Text, { style: styles.modernHeaderSub },
                    "GSTIN: ",
                    d.supplierGstin)),
                react_1.default.createElement(react_native_1.Text, { style: styles.modernHeaderSub }, "TAX INVOICE")),
            react_1.default.createElement(react_native_1.View, { style: { alignItems: "flex-end" } },
                react_1.default.createElement(react_native_1.Text, { style: styles.modernInvNo },
                    "#",
                    d.invoiceNo),
                react_1.default.createElement(react_native_1.Text, { style: styles.modernHeaderSub }, d.date))),
        react_1.default.createElement(react_native_1.View, { style: styles.modernBillTo },
            react_1.default.createElement(react_native_1.Text, null,
                react_1.default.createElement(react_native_1.Text, { style: styles.metaBold }, "Customer:"),
                " ",
                d.customerName),
            d.gstin && react_1.default.createElement(react_native_1.Text, null,
                "GSTIN: ",
                d.gstin)),
        react_1.default.createElement(ItemsTable, { items: d.items, thermal: false }),
        react_1.default.createElement(TotalsBlock, { d: d, accentColor: hdr })));
}
// ── Vyapari ──────────────────────────────────────────────────────────────────
function VyapariPreview({ d }) {
    const { themeColor, showItemHsn } = (0, react_1.useContext)(PreviewSettingsContext);
    const hdr = themeColor ?? "#c2410c";
    return (react_1.default.createElement(react_native_1.View, { style: [styles.card, styles.vyapariCard, { borderColor: hdr }] },
        react_1.default.createElement(react_native_1.View, { style: [styles.vyapariHeader, { backgroundColor: hdr }] },
            react_1.default.createElement(react_native_1.Text, { style: styles.vyapariShopName }, d.shopName.toUpperCase()),
            d.supplierGstin && (react_1.default.createElement(react_native_1.Text, { style: styles.vyapariSub },
                "GSTIN: ",
                d.supplierGstin)),
            react_1.default.createElement(react_native_1.Text, { style: styles.vyapariSub }, "GST TAX INVOICE / \u0915\u0930 \u092C\u0940\u091C\u0915")),
        react_1.default.createElement(react_native_1.View, { style: styles.vyapariMeta },
            react_1.default.createElement(react_native_1.Text, null,
                react_1.default.createElement(react_native_1.Text, { style: styles.metaBold }, "Bill No:"),
                " ",
                d.invoiceNo),
            react_1.default.createElement(react_native_1.Text, null,
                react_1.default.createElement(react_native_1.Text, { style: styles.metaBold }, "Date:"),
                " ",
                d.date),
            react_1.default.createElement(react_native_1.Text, null,
                react_1.default.createElement(react_native_1.Text, { style: styles.metaBold }, "Customer:"),
                " ",
                d.customerName)),
        react_1.default.createElement(ItemsTable, { items: d.items, thermal: false, showHsn: showItemHsn ?? true }),
        react_1.default.createElement(TotalsBlock, { d: d, accentColor: hdr })));
}
// ── Thermal ──────────────────────────────────────────────────────────────────
function ThermalPreview({ d }) {
    const fmt = useFormatInr();
    return (react_1.default.createElement(react_native_1.View, { style: [styles.card, styles.thermalCard] },
        react_1.default.createElement(react_native_1.View, { style: styles.thermalHeader },
            react_1.default.createElement(react_native_1.Text, { style: styles.thermalShopName }, d.shopName),
            react_1.default.createElement(react_native_1.Text, { style: styles.thermalSub }, "** TAX INVOICE **"),
            react_1.default.createElement(react_native_1.Text, { style: styles.thermalSub },
                "Bill: ",
                d.invoiceNo),
            react_1.default.createElement(react_native_1.Text, { style: styles.thermalSub },
                "Date: ",
                d.date)),
        react_1.default.createElement(react_native_1.Text, { style: styles.thermalSub },
            "Customer: ",
            d.customerName),
        d.items.map((it, i) => (react_1.default.createElement(react_native_1.View, { key: i, style: styles.thermalItem },
            react_1.default.createElement(react_native_1.Text, { style: styles.thermalText },
                i + 1,
                ". ",
                it.name),
            react_1.default.createElement(react_native_1.View, { style: styles.thermalItemRow },
                react_1.default.createElement(react_native_1.Text, { style: styles.thermalText },
                    it.qty,
                    " ",
                    it.unit,
                    " \u00D7 ",
                    fmt(it.rate),
                    it.discount > 0 ? ` -${it.discount}%` : ""),
                react_1.default.createElement(react_native_1.Text, { style: styles.thermalText }, fmt(it.amount)))))),
        react_1.default.createElement(TotalsBlock, { d: d, thermal: true }),
        react_1.default.createElement(react_native_1.Text, { style: [styles.thermalSub, { textAlign: "center", marginTop: 8 }] },
            "Thank you! Come again.",
            d.upiId && `\nUPI: ${d.upiId}`)));
}
// ── E-Com ────────────────────────────────────────────────────────────────────
function EcomPreview({ d }) {
    const { themeColor } = (0, react_1.useContext)(PreviewSettingsContext);
    const accent = themeColor ?? "#ff9900";
    return (react_1.default.createElement(react_native_1.View, { style: [styles.card, styles.ecomCard] },
        react_1.default.createElement(react_native_1.View, { style: styles.ecomHeader },
            react_1.default.createElement(react_native_1.Text, { style: styles.ecomShopName }, d.shopName),
            react_1.default.createElement(react_native_1.View, { style: { alignItems: "flex-end" } },
                react_1.default.createElement(react_native_1.Text, { style: styles.ecomInvLabel }, "TAX INVOICE"),
                react_1.default.createElement(react_native_1.Text, { style: styles.ecomInvNo },
                    "Order # ",
                    d.invoiceNo))),
        react_1.default.createElement(react_native_1.View, { style: styles.ecomStripe }),
        react_1.default.createElement(react_native_1.View, { style: styles.ecomBillTo },
            react_1.default.createElement(react_native_1.View, null,
                react_1.default.createElement(react_native_1.Text, { style: styles.ecomLabel }, "BILL TO"),
                react_1.default.createElement(react_native_1.Text, { style: styles.ecomValue }, d.customerName),
                d.gstin && react_1.default.createElement(react_native_1.Text, { style: styles.ecomSub },
                    "GSTIN: ",
                    d.gstin)),
            react_1.default.createElement(react_native_1.View, null,
                react_1.default.createElement(react_native_1.Text, { style: styles.ecomLabel }, "ORDER DATE"),
                react_1.default.createElement(react_native_1.Text, { style: styles.ecomValue }, d.date),
                react_1.default.createElement(react_native_1.Text, { style: styles.ecomSub },
                    "Invoice: ",
                    d.invoiceNo))),
        react_1.default.createElement(ItemsTable, { items: d.items, thermal: false }),
        react_1.default.createElement(TotalsBlock, { d: d, accentColor: accent })));
}
// ── Flipkart ─────────────────────────────────────────────────────────────────
function FlipkartPreview({ d }) {
    const { themeColor } = (0, react_1.useContext)(PreviewSettingsContext);
    const blue = themeColor ?? "#2874f0";
    return (react_1.default.createElement(react_native_1.View, { style: [styles.card, styles.flipkartCard] },
        react_1.default.createElement(react_native_1.View, { style: [styles.flipkartHeader, { backgroundColor: blue }] },
            react_1.default.createElement(react_native_1.Text, { style: styles.flipkartShopName }, d.shopName),
            react_1.default.createElement(react_native_1.View, { style: styles.flipkartInvBox },
                react_1.default.createElement(react_native_1.Text, { style: styles.flipkartInvNo },
                    "#",
                    d.invoiceNo),
                react_1.default.createElement(react_native_1.Text, { style: styles.flipkartDate }, d.date))),
        react_1.default.createElement(react_native_1.View, { style: styles.flipkartCustomer },
            react_1.default.createElement(react_native_1.Text, null,
                react_1.default.createElement(react_native_1.Text, { style: { color: "#878787" } }, "Customer: "),
                react_1.default.createElement(react_native_1.Text, { style: styles.metaBold }, d.customerName)),
            d.gstin && (react_1.default.createElement(react_native_1.Text, null,
                react_1.default.createElement(react_native_1.Text, { style: { color: "#878787" } }, "GSTIN: "),
                react_1.default.createElement(react_native_1.Text, { style: styles.metaBold }, d.gstin)))),
        react_1.default.createElement(ItemsTable, { items: d.items, thermal: false }),
        react_1.default.createElement(TotalsBlock, { d: d, accentColor: blue })));
}
// ── Minimal ──────────────────────────────────────────────────────────────────
function MinimalPreview({ d }) {
    const { themeColor } = (0, react_1.useContext)(PreviewSettingsContext);
    const accent = themeColor ?? "#6d28d9";
    return (react_1.default.createElement(react_native_1.View, { style: [styles.card, styles.minimalCard] },
        react_1.default.createElement(react_native_1.Text, { style: [
                styles.minimalShopName,
                { color: accent, borderBottomColor: accent },
            ] }, d.shopName),
        react_1.default.createElement(react_native_1.View, { style: styles.minimalMeta },
            react_1.default.createElement(react_native_1.View, null,
                react_1.default.createElement(react_native_1.Text, { style: styles.minimalLabel }, "Billed To"),
                react_1.default.createElement(react_native_1.Text, { style: styles.minimalValue }, d.customerName),
                d.gstin && react_1.default.createElement(react_native_1.Text, { style: styles.minimalSub },
                    "GSTIN: ",
                    d.gstin)),
            react_1.default.createElement(react_native_1.View, { style: { alignItems: "flex-end" } },
                react_1.default.createElement(react_native_1.Text, { style: styles.minimalLabel }, "Invoice"),
                react_1.default.createElement(react_native_1.Text, { style: [styles.minimalValue, { color: accent }] }, d.invoiceNo),
                react_1.default.createElement(react_native_1.Text, { style: styles.minimalSub }, d.date))),
        react_1.default.createElement(ItemsTable, { items: d.items, thermal: false }),
        react_1.default.createElement(TotalsBlock, { d: d, accentColor: accent })));
}
// ── Pay using UPI + QR + Bank Details (matches sample invoice format) ───────────
function PaymentSection({ d }) {
    const hasUpi = !!d.upiId;
    const hasBank = !!(d.bankName && d.bankAccountNo && d.bankIfsc);
    if (!hasUpi && !hasBank)
        return null;
    const upiUrl = hasUpi
        ? `upi://pay?pa=${encodeURIComponent(d.upiId)}&pn=${encodeURIComponent(d.shopName)}&am=${d.total.toFixed(2)}&cu=INR`
        : "";
    const qrUri = hasUpi
        ? `https://api.qrserver.com/v1/create-qr-code/?size=80x80&margin=2&data=${encodeURIComponent(upiUrl)}`
        : null;
    return (react_1.default.createElement(react_native_1.View, { style: {
            flexDirection: "row",
            padding: 10,
            backgroundColor: "#f8fafc",
            borderTopWidth: 1,
            borderTopColor: "#e2e8f0",
            gap: 12,
        } },
        qrUri && (react_1.default.createElement(react_native_1.View, null,
            react_1.default.createElement(react_native_1.Text, { style: [styles.metaBold, { fontSize: 8, marginBottom: 4 }] }, "Pay using UPI"),
            react_1.default.createElement(react_native_1.Image, { source: { uri: qrUri }, style: {
                    width: 64,
                    height: 64,
                    backgroundColor: "#fff",
                    borderRadius: 4,
                } }))),
        hasBank && (react_1.default.createElement(react_native_1.View, { style: { flex: 1 } },
            react_1.default.createElement(react_native_1.Text, { style: [styles.metaBold, { fontSize: 8, marginBottom: 4 }] }, "Bank Details"),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9 } },
                "Bank: ",
                d.bankName),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9 } },
                "Account #: ",
                d.bankAccountNo),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9 } },
                "IFSC: ",
                d.bankIfsc),
            d.bankBranch && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9 } },
                "Branch: ",
                d.bankBranch))))));
}
// ── Demo logo placeholder (brand-style) ───────────────────────────────────────
const LOGO_STYLES = {
    amazon: { bg: "#ff9900", text: "#fff", label: "a" },
    tata: { bg: "#0066b3", text: "#fff", label: "T" },
    dmart: { bg: "#e31837", text: "#fff", label: "D" },
    nike: { bg: "#111827", text: "#fff", label: "✓" },
    instagram: { bg: "#e4405f", text: "#fff", label: "📷" },
    unilever: { bg: "#0066b3", text: "#fff", label: "U" },
    service: { bg: "#059669", text: "#fff", label: "S" },
};
function DemoLogo({ placeholder, size = 36, }) {
    if (!placeholder)
        return null;
    const s = LOGO_STYLES[placeholder] ?? LOGO_STYLES.amazon;
    return (react_1.default.createElement(react_native_1.View, { style: {
            width: size,
            height: size,
            borderRadius: 6,
            backgroundColor: s.bg,
            alignItems: "center",
            justifyContent: "center",
        } },
        react_1.default.createElement(react_native_1.Text, { style: { color: s.text, fontSize: size * 0.5, fontWeight: "800" } }, s.label)));
}
// ── Amazon template (with logo) ───────────────────────────────────────────────
function AmazonPreview({ d }) {
    const accent = "#ff9900";
    return (react_1.default.createElement(react_native_1.View, { style: [styles.card, styles.ecomCard] },
        d.themeLabel ? (react_1.default.createElement(react_native_1.Text, { style: {
                textAlign: "center",
                fontSize: 9,
                fontWeight: "700",
                color: "#888",
                letterSpacing: 2,
                marginBottom: 4,
            } }, d.themeLabel)) : null,
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                justifyContent: "space-between",
                paddingHorizontal: 10,
                marginBottom: 4,
            } },
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#64748b" } }, "TAX INVOICE"),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 8, color: "#94a3b8" } }, "ORIGINAL FOR RECIPIENT")),
        react_1.default.createElement(react_native_1.View, { style: [
                styles.ecomHeader,
                { flexDirection: "row", alignItems: "center", gap: 10 },
            ] },
            react_1.default.createElement(DemoLogo, { placeholder: d.logoPlaceholder, size: 32 }),
            react_1.default.createElement(react_native_1.View, { style: { flex: 1 } },
                react_1.default.createElement(react_native_1.Text, { style: styles.ecomShopName }, d.shopName),
                d.supplierGstin && (react_1.default.createElement(react_native_1.Text, { style: [styles.ecomInvLabel, { fontSize: 9 }] },
                    "GSTIN ",
                    d.supplierGstin))),
            react_1.default.createElement(react_native_1.View, { style: { alignItems: "flex-end" } },
                react_1.default.createElement(react_native_1.Text, { style: styles.ecomInvNo },
                    "Invoice #: ",
                    d.invoiceNo),
                react_1.default.createElement(react_native_1.Text, { style: [styles.ecomInvLabel, { fontSize: 9 }] },
                    "Invoice Date: ",
                    d.date),
                d.dueDate && (react_1.default.createElement(react_native_1.Text, { style: [styles.ecomInvLabel, { fontSize: 9 }] },
                    "Due Date: ",
                    d.dueDate)),
                d.placeOfSupply && (react_1.default.createElement(react_native_1.Text, { style: [styles.ecomInvLabel, { fontSize: 9 }] },
                    "Place of Supply: ",
                    d.placeOfSupply)))),
        react_1.default.createElement(react_native_1.View, { style: styles.ecomStripe }),
        react_1.default.createElement(react_native_1.View, { style: styles.ecomBillTo },
            react_1.default.createElement(react_native_1.View, null,
                react_1.default.createElement(react_native_1.Text, { style: styles.ecomLabel }, "BILL TO"),
                react_1.default.createElement(react_native_1.Text, { style: styles.ecomValue }, d.customerName),
                d.recipientAddress && (react_1.default.createElement(react_native_1.Text, { style: styles.ecomSub }, d.recipientAddress))),
            d.shipToAddress && (react_1.default.createElement(react_native_1.View, null,
                react_1.default.createElement(react_native_1.Text, { style: styles.ecomLabel }, "SHIP TO"),
                react_1.default.createElement(react_native_1.Text, { style: styles.ecomValue }, d.customerName),
                react_1.default.createElement(react_native_1.Text, { style: styles.ecomSub }, d.shipToAddress)))),
        react_1.default.createElement(ItemsTable, { items: d.items, thermal: false }),
        react_1.default.createElement(TotalsBlock, { d: d, accentColor: accent, showTotalItems: true }),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                padding: 8,
                borderTopWidth: 1,
                borderTopColor: "#e2e8f0",
                alignItems: "center",
                gap: 8,
            } },
            react_1.default.createElement(react_native_1.View, { style: { flex: 1 } }),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#64748b" } },
                "For ",
                d.shopName),
            react_1.default.createElement(react_native_1.View, { style: {
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "#cbd5e1",
                    alignItems: "center",
                    justifyContent: "center",
                } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 8, color: "#94a3b8" } }, "\u2713"))),
        react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: 10, paddingBottom: 4 } },
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 7, color: "#94a3b8" } }, "Authorised Signatory")),
        react_1.default.createElement(PaymentSection, { d: d })));
}
// ── Tata template ────────────────────────────────────────────────────────────
function TataPreview({ d }) {
    const blue = "#0066b3";
    return (react_1.default.createElement(react_native_1.View, { style: [
            styles.card,
            {
                borderWidth: 1,
                borderColor: "#e5e7eb",
                overflow: "hidden",
                borderRadius: 8,
            },
        ] },
        d.themeLabel ? (react_1.default.createElement(react_native_1.Text, { style: {
                textAlign: "center",
                fontSize: 9,
                fontWeight: "700",
                color: "#888",
                letterSpacing: 2,
                marginBottom: 4,
            } }, d.themeLabel)) : null,
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                justifyContent: "space-between",
                paddingHorizontal: 10,
                paddingTop: 4,
            } },
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#64748b" } }, "TAX INVOICE"),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 8, color: "#94a3b8" } }, "ORIGINAL FOR RECIPIENT")),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                backgroundColor: blue,
            } },
            react_1.default.createElement(DemoLogo, { placeholder: d.logoPlaceholder, size: 40 }),
            react_1.default.createElement(react_native_1.View, { style: { marginLeft: 10, flex: 1 } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 16, fontWeight: "800", color: "#fff" } }, d.shopName),
                d.supplierGstin && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "rgba(255,255,255,0.9)" } },
                    "GSTIN: ",
                    d.supplierGstin))),
            react_1.default.createElement(react_native_1.View, { style: { alignItems: "flex-end" } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 10, fontWeight: "700", color: "#fff" } },
                    "Invoice #: ",
                    d.invoiceNo),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "rgba(255,255,255,0.9)" } },
                    "Invoice Date: ",
                    d.date),
                d.dueDate && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "rgba(255,255,255,0.9)" } },
                    "Due Date: ",
                    d.dueDate)),
                d.placeOfSupply && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "rgba(255,255,255,0.9)" } },
                    "Place of Supply: ",
                    d.placeOfSupply)))),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                padding: 10,
                backgroundColor: "#f8fafc",
                borderBottomWidth: 1,
                borderBottomColor: "#e2e8f0",
            } },
            react_1.default.createElement(react_native_1.View, { style: { flex: 1 } },
                react_1.default.createElement(react_native_1.Text, { style: [styles.metaBold, { fontSize: 9 }] }, "BILL TO"),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 11 } }, d.customerName),
                d.recipientAddress && (react_1.default.createElement(react_native_1.Text, { style: styles.metaSmall }, d.recipientAddress))),
            d.shipToAddress && (react_1.default.createElement(react_native_1.View, { style: {
                    flex: 1,
                    borderLeftWidth: 1,
                    borderLeftColor: "#e2e8f0",
                    paddingLeft: 8,
                } },
                react_1.default.createElement(react_native_1.Text, { style: [styles.metaBold, { fontSize: 9 }] }, "SHIP TO"),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 11 } }, d.customerName),
                react_1.default.createElement(react_native_1.Text, { style: styles.metaSmall }, d.shipToAddress)))),
        react_1.default.createElement(ItemsTable, { items: d.items, thermal: false }),
        react_1.default.createElement(TotalsBlock, { d: d, accentColor: blue, showTotalItems: true }),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                padding: 8,
                borderTopWidth: 1,
                borderTopColor: "#e2e8f0",
                alignItems: "center",
                gap: 8,
            } },
            react_1.default.createElement(react_native_1.View, { style: { flex: 1 } }),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#64748b" } },
                "For ",
                d.shopName),
            react_1.default.createElement(react_native_1.View, { style: {
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "#cbd5e1",
                    alignItems: "center",
                    justifyContent: "center",
                } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 8, color: "#94a3b8" } }, "\u2713"))),
        react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: 10, paddingBottom: 4 } },
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 7, color: "#94a3b8" } }, "Authorised Signatory")),
        react_1.default.createElement(PaymentSection, { d: d })));
}
// ── DMart template ───────────────────────────────────────────────────────────
function DmartPreview({ d }) {
    const red = "#e31837";
    const showMrp = d.items.some((i) => i.mrp != null);
    return (react_1.default.createElement(react_native_1.View, { style: [
            styles.card,
            { borderWidth: 2, borderColor: red, borderRadius: 4 },
        ] },
        d.themeLabel ? (react_1.default.createElement(react_native_1.View, { style: { backgroundColor: red, paddingVertical: 6, marginBottom: 0 } },
            react_1.default.createElement(react_native_1.Text, { style: {
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: "900",
                    color: "#fff",
                    letterSpacing: 1,
                } }, d.themeLabel))) : null,
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                justifyContent: "space-between",
                paddingHorizontal: 10,
                paddingTop: 4,
            } },
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#64748b" } }, "TAX INVOICE"),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 8, color: "#94a3b8" } }, "ORIGINAL FOR RECIPIENT")),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                alignItems: "center",
                padding: 10,
                backgroundColor: red,
            } },
            react_1.default.createElement(DemoLogo, { placeholder: d.logoPlaceholder, size: 36 }),
            react_1.default.createElement(react_native_1.View, { style: { marginLeft: 8, flex: 1 } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 18, fontWeight: "900", color: "#fff" } }, d.shopName),
                d.supplierGstin && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "rgba(255,255,255,0.9)" } },
                    "GSTIN ",
                    d.supplierGstin))),
            react_1.default.createElement(react_native_1.View, { style: { alignItems: "flex-end" } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 10, fontWeight: "700", color: "#fff" } },
                    "Invoice #: ",
                    d.invoiceNo),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "rgba(255,255,255,0.9)" } },
                    "Invoice Date: ",
                    d.date),
                d.dueDate && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "rgba(255,255,255,0.9)" } },
                    "Due Date: ",
                    d.dueDate)),
                d.placeOfSupply && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "rgba(255,255,255,0.9)" } },
                    "Place of Supply: ",
                    d.placeOfSupply)))),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                padding: 10,
                backgroundColor: "#fef2f2",
                borderBottomWidth: 1,
                borderBottomColor: "#fecaca",
            } },
            react_1.default.createElement(react_native_1.View, { style: { flex: 1 } },
                react_1.default.createElement(react_native_1.Text, { style: [styles.metaBold, { fontSize: 9 }] }, "BILL TO"),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 11 } }, d.customerName),
                d.recipientAddress && (react_1.default.createElement(react_native_1.Text, { style: styles.metaSmall }, d.recipientAddress))),
            d.shipToAddress && (react_1.default.createElement(react_native_1.View, { style: {
                    flex: 1,
                    borderLeftWidth: 1,
                    borderLeftColor: "#fecaca",
                    paddingLeft: 8,
                } },
                react_1.default.createElement(react_native_1.Text, { style: [styles.metaBold, { fontSize: 9 }] }, "SHIP TO"),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 11 } }, d.customerName),
                react_1.default.createElement(react_native_1.Text, { style: styles.metaSmall }, d.shipToAddress)))),
        react_1.default.createElement(ItemsTable, { items: d.items, thermal: false, showMrp: showMrp }),
        react_1.default.createElement(TotalsBlock, { d: d, accentColor: red, showTotalItems: true }),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                padding: 8,
                borderTopWidth: 1,
                borderTopColor: "#e2e8f0",
                alignItems: "center",
                gap: 8,
            } },
            react_1.default.createElement(react_native_1.View, { style: { flex: 1 } }),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#64748b" } },
                "For ",
                d.shopName),
            react_1.default.createElement(react_native_1.View, { style: {
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "#cbd5e1",
                    alignItems: "center",
                    justifyContent: "center",
                } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 8, color: "#94a3b8" } }, "\u2713"))),
        react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: 10, paddingBottom: 4 } },
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 7, color: "#94a3b8" } }, "Authorised Signatory")),
        react_1.default.createElement(PaymentSection, { d: d })));
}
// ── Nike template ────────────────────────────────────────────────────────────
function NikePreview({ d }) {
    return (react_1.default.createElement(react_native_1.View, { style: [
            styles.card,
            { borderWidth: 1, borderColor: "#111", backgroundColor: "#fff" },
        ] },
        d.themeLabel ? (react_1.default.createElement(react_native_1.Text, { style: {
                textAlign: "center",
                fontSize: 9,
                fontWeight: "700",
                color: "#888",
                letterSpacing: 2,
                marginBottom: 4,
            } }, d.themeLabel)) : null,
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                justifyContent: "space-between",
                paddingHorizontal: 10,
                paddingTop: 4,
            } },
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#64748b" } }, "TAX INVOICE"),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 8, color: "#94a3b8" } }, "ORIGINAL FOR RECIPIENT")),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                backgroundColor: "#111",
            } },
            react_1.default.createElement(DemoLogo, { placeholder: d.logoPlaceholder, size: 36 }),
            react_1.default.createElement(react_native_1.View, { style: { marginLeft: 10, flex: 1 } },
                react_1.default.createElement(react_native_1.Text, { style: {
                        fontSize: 16,
                        fontWeight: "900",
                        color: "#fff",
                        letterSpacing: 1,
                    } }, d.shopName.toUpperCase()),
                d.supplierGstin && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#94a3b8" } },
                    "GSTIN ",
                    d.supplierGstin))),
            react_1.default.createElement(react_native_1.View, { style: { alignItems: "flex-end" } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 10, fontWeight: "700", color: "#fff" } },
                    "Invoice #: ",
                    d.invoiceNo),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#94a3b8" } },
                    "Invoice Date: ",
                    d.date),
                d.dueDate && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#94a3b8" } },
                    "Due Date: ",
                    d.dueDate)),
                d.placeOfSupply && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#94a3b8" } },
                    "Place of Supply: ",
                    d.placeOfSupply)))),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                padding: 10,
                borderBottomWidth: 1,
                borderBottomColor: "#e5e7eb",
            } },
            react_1.default.createElement(react_native_1.View, { style: { flex: 1 } },
                react_1.default.createElement(react_native_1.Text, { style: [styles.metaBold, { fontSize: 9 }] }, "BILL TO"),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 12 } }, d.customerName),
                d.recipientAddress && (react_1.default.createElement(react_native_1.Text, { style: styles.metaSmall }, d.recipientAddress))),
            d.shipToAddress && (react_1.default.createElement(react_native_1.View, { style: {
                    flex: 1,
                    borderLeftWidth: 1,
                    borderLeftColor: "#e5e7eb",
                    paddingLeft: 8,
                } },
                react_1.default.createElement(react_native_1.Text, { style: [styles.metaBold, { fontSize: 9 }] }, "SHIP TO"),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 12 } }, d.customerName),
                react_1.default.createElement(react_native_1.Text, { style: styles.metaSmall }, d.shipToAddress)))),
        react_1.default.createElement(ItemsTable, { items: d.items, thermal: false }),
        react_1.default.createElement(TotalsBlock, { d: d, accentColor: "#111", showTotalItems: true }),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                padding: 8,
                borderTopWidth: 1,
                borderTopColor: "#e2e8f0",
                alignItems: "center",
                gap: 8,
            } },
            react_1.default.createElement(react_native_1.View, { style: { flex: 1 } }),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#64748b" } },
                "For ",
                d.shopName),
            react_1.default.createElement(react_native_1.View, { style: {
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "#cbd5e1",
                    alignItems: "center",
                    justifyContent: "center",
                } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 8, color: "#94a3b8" } }, "\u2713"))),
        react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: 10, paddingBottom: 4 } },
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 7, color: "#94a3b8" } }, "Authorised Signatory")),
        react_1.default.createElement(PaymentSection, { d: d })));
}
// ── Instagram template (landscape / wider) ────────────────────────────────────
function InstagramPreview({ d }) {
    return (react_1.default.createElement(react_native_1.View, { style: [
            styles.card,
            {
                minWidth: 420,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                overflow: "hidden",
                borderRadius: 12,
            },
        ] },
        d.themeLabel ? (react_1.default.createElement(react_native_1.View, { style: {
                backgroundColor: "#e4405f",
                paddingVertical: 6,
                marginBottom: 0,
            } },
            react_1.default.createElement(react_native_1.Text, { style: {
                    textAlign: "center",
                    fontSize: 10,
                    fontWeight: "800",
                    color: "#fff",
                    letterSpacing: 1,
                } }, d.themeLabel))) : null,
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                justifyContent: "space-between",
                paddingHorizontal: 10,
                paddingTop: 4,
            } },
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#64748b" } }, "TAX INVOICE"),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 8, color: "#94a3b8" } }, "ORIGINAL FOR RECIPIENT")),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
                backgroundColor: "#e4405f",
            } },
            react_1.default.createElement(DemoLogo, { placeholder: d.logoPlaceholder, size: 40 }),
            react_1.default.createElement(react_native_1.View, { style: { marginLeft: 12, flex: 1 } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 18, fontWeight: "800", color: "#fff" } }, d.shopName),
                d.supplierGstin && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: 10, color: "rgba(255,255,255,0.9)" } },
                    "GSTIN ",
                    d.supplierGstin))),
            react_1.default.createElement(react_native_1.View, { style: { alignItems: "flex-end" } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 10, fontWeight: "700", color: "#fff" } },
                    "Invoice #: ",
                    d.invoiceNo),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "rgba(255,255,255,0.9)" } },
                    "Invoice Date: ",
                    d.date),
                d.dueDate && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "rgba(255,255,255,0.9)" } },
                    "Due Date: ",
                    d.dueDate)),
                d.placeOfSupply && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "rgba(255,255,255,0.9)" } },
                    "Place of Supply: ",
                    d.placeOfSupply)))),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                padding: 10,
                backgroundColor: "#f8fafc",
            } },
            react_1.default.createElement(react_native_1.View, { style: { flex: 1 } },
                react_1.default.createElement(react_native_1.Text, { style: [styles.metaBold, { fontSize: 9 }] }, "BILL TO"),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 11 } }, d.customerName),
                d.gstin && react_1.default.createElement(react_native_1.Text, { style: styles.metaSmall },
                    "GSTIN: ",
                    d.gstin),
                d.recipientAddress && (react_1.default.createElement(react_native_1.Text, { style: styles.metaSmall }, d.recipientAddress))),
            d.shipToAddress && (react_1.default.createElement(react_native_1.View, { style: {
                    flex: 1,
                    borderLeftWidth: 1,
                    borderLeftColor: "#e2e8f0",
                    paddingLeft: 8,
                } },
                react_1.default.createElement(react_native_1.Text, { style: [styles.metaBold, { fontSize: 9 }] }, "SHIP TO"),
                react_1.default.createElement(react_native_1.Text, { style: [styles.metaSmall, { fontSize: 10 }] }, d.shipToAddress)))),
        react_1.default.createElement(ItemsTable, { items: d.items, thermal: false, serviceStyle: true }),
        react_1.default.createElement(TotalsBlock, { d: d, accentColor: "#e4405f", showTotalItems: true }),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                padding: 8,
                borderTopWidth: 1,
                borderTopColor: "#e2e8f0",
                alignItems: "center",
                gap: 8,
            } },
            react_1.default.createElement(react_native_1.View, { style: { flex: 1 } }),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#64748b" } },
                "For ",
                d.shopName),
            react_1.default.createElement(react_native_1.View, { style: {
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "#cbd5e1",
                    alignItems: "center",
                    justifyContent: "center",
                } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 8, color: "#94a3b8" } }, "\u2713"))),
        react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: 10, paddingBottom: 4 } },
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 7, color: "#94a3b8" } }, "Authorised Signatory")),
        react_1.default.createElement(PaymentSection, { d: d })));
}
// ── Unilever template ────────────────────────────────────────────────────────
function UnileverPreview({ d }) {
    const blue = "#0066b3";
    return (react_1.default.createElement(react_native_1.View, { style: [
            styles.card,
            { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8 },
        ] },
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                backgroundColor: blue,
            } },
            react_1.default.createElement(DemoLogo, { placeholder: d.logoPlaceholder, size: 38 }),
            react_1.default.createElement(react_native_1.View, { style: { marginLeft: 10, flex: 1 } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 15, fontWeight: "800", color: "#fff" } }, d.shopName),
                d.supplierAddress && (react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "rgba(255,255,255,0.9)" } }, d.supplierAddress))),
            react_1.default.createElement(react_native_1.View, { style: { alignItems: "flex-end" } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 10, fontWeight: "700", color: "#fff" } }, "TAX INVOICE"),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 10, color: "rgba(255,255,255,0.9)" } },
                    d.invoiceNo,
                    " \u2022 ",
                    d.date))),
        react_1.default.createElement(react_native_1.View, { style: styles.modernBillTo },
            react_1.default.createElement(react_native_1.Text, null,
                react_1.default.createElement(react_native_1.Text, { style: styles.metaBold }, "Bill To:"),
                " ",
                d.customerName),
            d.recipientAddress && (react_1.default.createElement(react_native_1.Text, { style: styles.metaSmall }, d.recipientAddress)),
            d.gstin && react_1.default.createElement(react_native_1.Text, { style: styles.metaSmall },
                "GSTIN: ",
                d.gstin)),
        react_1.default.createElement(ItemsTable, { items: d.items, thermal: false }),
        react_1.default.createElement(TotalsBlock, { d: d, accentColor: blue, showTotalItems: true }),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                padding: 8,
                borderTopWidth: 1,
                borderTopColor: "#e2e8f0",
                alignItems: "center",
                gap: 8,
            } },
            react_1.default.createElement(react_native_1.View, { style: { flex: 1 } }),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#64748b" } },
                "For ",
                d.shopName),
            react_1.default.createElement(react_native_1.View, { style: {
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "#cbd5e1",
                    alignItems: "center",
                    justifyContent: "center",
                } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 8, color: "#94a3b8" } }, "\u2713"))),
        react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: 10, paddingBottom: 4 } },
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 7, color: "#94a3b8" } }, "Authorised Signatory")),
        react_1.default.createElement(PaymentSection, { d: d })));
}
// ── Service template (compact Bill To / Ship To) ──────────────────────────────
function ServicePreview({ d }) {
    const green = "#059669";
    return (react_1.default.createElement(react_native_1.View, { style: [
            styles.card,
            { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8 },
        ] },
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                alignItems: "center",
                padding: 10,
                backgroundColor: green,
            } },
            react_1.default.createElement(DemoLogo, { placeholder: d.logoPlaceholder, size: 36 }),
            react_1.default.createElement(react_native_1.View, { style: { marginLeft: 8, flex: 1 } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 16, fontWeight: "800", color: "#fff" } }, d.shopName),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "rgba(255,255,255,0.9)" } }, "SERVICE INVOICE")),
            react_1.default.createElement(react_native_1.View, { style: { alignItems: "flex-end" } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 11, fontWeight: "700", color: "#fff" } }, d.invoiceNo),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "rgba(255,255,255,0.9)" } }, d.date))),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                padding: 8,
                backgroundColor: "#f0fdf4",
                borderBottomWidth: 1,
                borderBottomColor: "#bbf7d0",
            } },
            react_1.default.createElement(react_native_1.View, { style: { flex: 1, paddingRight: 8 } },
                react_1.default.createElement(react_native_1.Text, { style: [styles.metaBold, { fontSize: 8, color: green }] }, "BILL TO"),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 10 } }, d.customerName),
                d.recipientAddress && (react_1.default.createElement(react_native_1.Text, { style: [styles.metaSmall, { fontSize: 9 }] }, d.recipientAddress))),
            d.shipToAddress && (react_1.default.createElement(react_native_1.View, { style: {
                    flex: 1,
                    borderLeftWidth: 1,
                    borderLeftColor: "#bbf7d0",
                    paddingLeft: 8,
                } },
                react_1.default.createElement(react_native_1.Text, { style: [styles.metaBold, { fontSize: 8, color: green }] }, "SHIP TO"),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 10 } }, d.customerName),
                react_1.default.createElement(react_native_1.Text, { style: [styles.metaSmall, { fontSize: 9 }] }, d.shipToAddress)))),
        react_1.default.createElement(ItemsTable, { items: d.items, thermal: false }),
        react_1.default.createElement(TotalsBlock, { d: d, accentColor: green, showTotalItems: true }),
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                padding: 8,
                borderTopWidth: 1,
                borderTopColor: "#e2e8f0",
                alignItems: "center",
                gap: 8,
            } },
            react_1.default.createElement(react_native_1.View, { style: { flex: 1 } }),
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 9, color: "#64748b" } },
                "For ",
                d.shopName),
            react_1.default.createElement(react_native_1.View, { style: {
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "#cbd5e1",
                    alignItems: "center",
                    justifyContent: "center",
                } },
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: 8, color: "#94a3b8" } }, "\u2713"))),
        react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: 10, paddingBottom: 4 } },
            react_1.default.createElement(react_native_1.Text, { style: { fontSize: 7, color: "#94a3b8" } }, "Authorised Signatory")),
        react_1.default.createElement(PaymentSection, { d: d })));
}
// ── Items table (shared) ──────────────────────────────────────────────────────
function ItemsTable({ items, thermal, showHsn = false, showMrp = false, serviceStyle = false, }) {
    const fmt = useFormatInr();
    if (thermal)
        return null; // Thermal uses custom item layout
    const headers = serviceStyle
        ? ["#", "Description", "HSN/SAC", "Amount"]
        : showMrp
            ? ["#", "Item", "HSN", "MRP", "Selling Price", "Qty", "Amount"]
            : showHsn
                ? ["Sl", "Item", "HSN", "Qty", "Rate", "Disc", "Total"]
                : ["#", "Item", "Qty", "Rate", "Disc%", "Amount"];
    const colFlex = serviceStyle
        ? [0.5, 2, 0.8, 0.9]
        : showMrp
            ? [0.5, 1.2, 0.6, 0.7, 0.8, 0.5, 0.8]
            : showHsn
                ? [0.6, 1.5, 0.6, 0.7, 0.7, 0.5, 0.9]
                : [0.6, 1.8, 0.8, 0.8, 0.6, 0.9];
    return (react_1.default.createElement(react_native_1.View, { style: styles.itemsTable },
        react_1.default.createElement(react_native_1.View, { style: [
                styles.itemsHeader,
                serviceStyle && { backgroundColor: "#e4405f" },
            ] }, headers.map((h, idx) => (react_1.default.createElement(react_native_1.Text, { key: h, style: [
                styles.itemsHeaderCell,
                { flex: colFlex[idx] ?? 1 },
                serviceStyle && { color: "#fff", fontWeight: "700" },
            ] }, h)))),
        items.map((it, i) => (react_1.default.createElement(react_native_1.View, { key: i, style: [styles.itemsRow, i % 2 === 1 && styles.itemsRowAlt] },
            react_1.default.createElement(react_native_1.Text, { style: [styles.itemsCell, { flex: colFlex[0] }] }, i + 1),
            react_1.default.createElement(react_native_1.Text, { style: [styles.itemsCell, styles.itemsName, { flex: colFlex[1] }], numberOfLines: serviceStyle ? 4 : 1 }, it.name),
            serviceStyle ? (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement(react_native_1.Text, { style: [styles.itemsCell, { flex: colFlex[2] }] }, it.hsnCode || "-"),
                react_1.default.createElement(react_native_1.Text, { style: [
                        styles.itemsCell,
                        styles.itemsRight,
                        styles.itemsAmount,
                        { flex: colFlex[3] },
                    ] }, fmt(it.amount)))) : showMrp ? (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement(react_native_1.Text, { style: [styles.itemsCell, { flex: colFlex[2] }] }, it.hsnCode || "-"),
                react_1.default.createElement(react_native_1.Text, { style: [
                        styles.itemsCell,
                        styles.itemsRight,
                        { flex: colFlex[3] },
                    ] }, it.mrp != null ? fmt(it.mrp) : "-"),
                react_1.default.createElement(react_native_1.Text, { style: [
                        styles.itemsCell,
                        styles.itemsRight,
                        { flex: colFlex[4] },
                    ] }, fmt(it.rate)),
                react_1.default.createElement(react_native_1.Text, { style: [
                        styles.itemsCell,
                        styles.itemsRight,
                        { flex: colFlex[5] },
                    ] },
                    it.qty,
                    " ",
                    it.unit),
                react_1.default.createElement(react_native_1.Text, { style: [
                        styles.itemsCell,
                        styles.itemsRight,
                        styles.itemsAmount,
                        { flex: colFlex[6] },
                    ] }, fmt(it.amount)))) : (react_1.default.createElement(react_1.default.Fragment, null,
                showHsn && (react_1.default.createElement(react_native_1.Text, { style: [styles.itemsCell, { flex: colFlex[2] }] }, it.hsnCode || "-")),
                react_1.default.createElement(react_native_1.Text, { style: [
                        styles.itemsCell,
                        styles.itemsRight,
                        { flex: showHsn ? colFlex[3] : colFlex[2] },
                    ] },
                    it.qty,
                    " ",
                    it.unit),
                react_1.default.createElement(react_native_1.Text, { style: [
                        styles.itemsCell,
                        styles.itemsRight,
                        { flex: showHsn ? colFlex[4] : colFlex[3] },
                    ] }, fmt(it.rate)),
                react_1.default.createElement(react_native_1.Text, { style: [
                        styles.itemsCell,
                        styles.itemsRight,
                        { flex: showHsn ? colFlex[5] : colFlex[4] },
                    ] }, it.discount > 0 ? `${it.discount}%` : "-"),
                react_1.default.createElement(react_native_1.Text, { style: [
                        styles.itemsCell,
                        styles.itemsRight,
                        styles.itemsAmount,
                        { flex: showHsn ? colFlex[6] : colFlex[5] },
                    ] }, fmt(it.amount)))))))));
}
// ── Main export ───────────────────────────────────────────────────────────────
function InvoiceTemplatePreview({ template, data, settings, }) {
    const content = (react_1.default.createElement(PreviewSettingsContext.Provider, { value: settings ?? {} },
        template === "classic" && react_1.default.createElement(ClassicPreview, { d: data }),
        template === "modern" && react_1.default.createElement(ModernPreview, { d: data }),
        template === "vyapari" && react_1.default.createElement(VyapariPreview, { d: data }),
        template === "thermal" && react_1.default.createElement(ThermalPreview, { d: data }),
        template === "ecom" && react_1.default.createElement(EcomPreview, { d: data }),
        template === "flipkart" && react_1.default.createElement(FlipkartPreview, { d: data }),
        template === "minimal" && react_1.default.createElement(MinimalPreview, { d: data }),
        template === "amazon" && react_1.default.createElement(AmazonPreview, { d: data }),
        template === "tata" && react_1.default.createElement(TataPreview, { d: data }),
        template === "dmart" && react_1.default.createElement(DmartPreview, { d: data }),
        template === "nike" && react_1.default.createElement(NikePreview, { d: data }),
        template === "instagram" && react_1.default.createElement(InstagramPreview, { d: data }),
        template === "unilever" && react_1.default.createElement(UnileverPreview, { d: data }),
        template === "service" && react_1.default.createElement(ServicePreview, { d: data })));
    return (react_1.default.createElement(react_native_1.ScrollView, { horizontal: true, showsHorizontalScrollIndicator: true, contentContainerStyle: styles.scrollContent }, content));
}
/** Compact invoice preview thumbnail for settings/cards — full invoice scaled to fit */
function InvoicePreviewThumbnail({ template, data, width = 72, height = 96, }) {
    const origW = 320;
    const origH = 420; // approx full invoice height (header + items + totals)
    const scale = Math.min(width / origW, height / origH);
    const translateX = -(origW * (1 - scale)) / 2;
    const translateY = -(origH * (1 - scale)) / 2;
    return (react_1.default.createElement(react_native_1.View, { style: {
            width,
            height,
            borderRadius: 8,
            overflow: "hidden",
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#e2e8f0",
        } },
        react_1.default.createElement(react_native_1.View, { style: {
                position: "absolute",
                left: 0,
                top: 0,
                transform: [{ translateX }, { translateY }, { scale }],
            } },
            react_1.default.createElement(PreviewSettingsContext.Provider, { value: {} },
                template === "classic" && react_1.default.createElement(ClassicPreview, { d: data }),
                template === "modern" && react_1.default.createElement(ModernPreview, { d: data }),
                template === "vyapari" && react_1.default.createElement(VyapariPreview, { d: data }),
                template === "thermal" && react_1.default.createElement(ThermalPreview, { d: data }),
                template === "ecom" && react_1.default.createElement(EcomPreview, { d: data }),
                template === "flipkart" && react_1.default.createElement(FlipkartPreview, { d: data }),
                template === "minimal" && react_1.default.createElement(MinimalPreview, { d: data }),
                template === "amazon" && react_1.default.createElement(AmazonPreview, { d: data }),
                template === "tata" && react_1.default.createElement(TataPreview, { d: data }),
                template === "dmart" && react_1.default.createElement(DmartPreview, { d: data }),
                template === "nike" && react_1.default.createElement(NikePreview, { d: data }),
                template === "instagram" && react_1.default.createElement(InstagramPreview, { d: data }),
                template === "unilever" && react_1.default.createElement(UnileverPreview, { d: data }),
                template === "service" && react_1.default.createElement(ServicePreview, { d: data })))));
}
/** Template thumbnail for picker */
function TemplateThumbnail({ template, selected, onPress, }) {
    return (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onPress, activeOpacity: 0.7, style: [styles.thumbnail, selected && styles.thumbnailSelected] },
        react_1.default.createElement(react_native_1.View, { style: [
                styles.thumbnailStrip,
                { backgroundColor: selected ? template.color + "20" : "#f8f9fa" },
            ] },
            react_1.default.createElement(react_native_1.View, { style: [styles.thumbnailBar, { backgroundColor: template.color }] }),
            react_1.default.createElement(react_native_1.View, { style: styles.thumbnailLines }, [1, 2, 3].map((i) => (react_1.default.createElement(react_native_1.View, { key: i, style: [
                    styles.thumbnailLine,
                    {
                        backgroundColor: template.color + "66",
                        flex: i === 2 ? 2 : 1,
                    },
                ] }))))),
        react_1.default.createElement(react_native_1.Text, { style: [
                styles.thumbnailLabel,
                selected && styles.thumbnailLabelSelected,
            ] }, template.label),
        react_1.default.createElement(react_native_1.Text, { style: styles.thumbnailDesc }, template.desc)));
}
const styles = react_native_1.StyleSheet.create({
    scrollContent: { padding: 12 },
    card: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 8,
        minWidth: 320,
        maxWidth: 400,
    },
    classicCard: { borderWidth: 1, borderColor: "#ccc" },
    classicHeader: {
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: "#111",
        paddingBottom: 10,
        marginBottom: 10,
    },
    classicShopName: { fontSize: 16, fontWeight: "700" },
    classicSub: { fontSize: 10, color: "#555", marginTop: 2 },
    compositionText: {
        fontSize: 9,
        fontWeight: "600",
        color: "#b91c1c",
        marginTop: 2,
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    metaBold: { fontWeight: "700" },
    metaSmall: { fontSize: 10 },
    modernCard: {
        overflow: "hidden",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    modernHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 14,
    },
    modernShopName: { fontSize: 16, fontWeight: "700", color: "#fff" },
    modernInvNo: { fontSize: 13, fontWeight: "700", color: "#fff" },
    modernHeaderSub: { fontSize: 9, color: "rgba(255,255,255,0.9)" },
    modernBillTo: {
        backgroundColor: "#eff6ff",
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#dbeafe",
    },
    vyapariCard: { borderWidth: 2, backgroundColor: "#fffbf7" },
    vyapariHeader: { padding: 12, alignItems: "center" },
    vyapariShopName: {
        fontSize: 16,
        fontWeight: "900",
        color: "#fff",
        letterSpacing: 1,
    },
    vyapariSub: { fontSize: 10, color: "rgba(255,255,255,0.9)", marginTop: 2 },
    vyapariMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 6,
        backgroundColor: "#fff7ed",
        borderBottomWidth: 1,
        borderBottomColor: "#c2410c",
    },
    thermalCard: {
        fontFamily: "monospace",
        padding: 12,
        minWidth: 260,
        borderWidth: 1,
        borderColor: "#ccc",
    },
    thermalHeader: {
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        borderStyle: "dashed",
        paddingBottom: 8,
        marginBottom: 8,
    },
    thermalShopName: { fontSize: 14, fontWeight: "700" },
    thermalSub: { fontSize: 10, marginTop: 2 },
    thermalItem: { marginBottom: 4 },
    thermalItemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingLeft: 12,
    },
    thermalText: { fontSize: 10 },
    ecomCard: {
        overflow: "hidden",
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#d5d9d9",
    },
    ecomHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#232f3e",
        padding: 10,
    },
    ecomShopName: { fontSize: 18, fontWeight: "900", color: "#ff9900" },
    ecomInvLabel: { fontSize: 10, fontWeight: "600", color: "#fff" },
    ecomInvNo: { fontSize: 10, color: "#ccc" },
    ecomStripe: { height: 3, backgroundColor: "#ff9900" },
    ecomBillTo: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#e3e6e6",
    },
    ecomLabel: {
        fontSize: 9,
        fontWeight: "700",
        color: "#565959",
        marginBottom: 3,
    },
    ecomValue: { fontWeight: "600" },
    ecomSub: { fontSize: 10, color: "#565959" },
    flipkartCard: {
        overflow: "hidden",
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#dbdfe4",
    },
    flipkartHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 10,
    },
    flipkartShopName: { fontSize: 20, fontWeight: "900", color: "#ffe500" },
    flipkartInvBox: {
        backgroundColor: "#ffe500",
        padding: 8,
        borderRadius: 4,
        alignItems: "flex-end",
    },
    flipkartInvNo: { fontSize: 12, fontWeight: "800", color: "#2874f0" },
    flipkartDate: { fontSize: 10, color: "#333" },
    flipkartCustomer: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 7,
        backgroundColor: "#f5f7ff",
        borderBottomWidth: 1,
        borderBottomColor: "#dce6ff",
    },
    minimalCard: { padding: 20 },
    minimalShopName: {
        fontSize: 22,
        fontWeight: "700",
        borderBottomWidth: 3,
        paddingBottom: 10,
        marginBottom: 16,
    },
    minimalMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    minimalLabel: { fontSize: 9, color: "#888", letterSpacing: 1 },
    minimalValue: { fontWeight: "600", marginTop: 2 },
    minimalSub: { fontSize: 10, color: "#666" },
    itemsTable: { marginBottom: 10 },
    itemsHeader: {
        flexDirection: "row",
        backgroundColor: "#f3f4f6",
        borderBottomWidth: 1,
        borderBottomColor: "#111",
        padding: 4,
    },
    itemsHeaderCell: { flex: 1, fontSize: 10, fontWeight: "600" },
    itemsRow: {
        flexDirection: "row",
        padding: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    itemsRowAlt: { backgroundColor: "#f8fafc" },
    itemsCell: { flex: 1, fontSize: 10 },
    itemsName: { flex: 2 },
    itemsRight: { textAlign: "right" },
    itemsAmount: { fontWeight: "600" },
    totalsBlock: { marginLeft: "auto", width: 200 },
    totalsBlockThermal: { width: "100%", marginLeft: 0 },
    totalsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 2,
    },
    totalsLabel: { fontSize: 11 },
    totalsValue: { fontSize: 11 },
    totalsTotal: {
        flexDirection: "row",
        justifyContent: "space-between",
        fontWeight: "700",
        fontSize: 13,
        borderTopWidth: 2,
        paddingTop: 4,
        marginTop: 4,
    },
    totalsTotalLabel: {},
    totalsTotalValue: {},
    amountWords: {
        fontSize: 9,
        color: "#666",
        fontStyle: "italic",
        marginTop: 4,
    },
    reverseCharge: {
        fontSize: 9,
        fontWeight: "600",
        color: "#b91c1c",
        marginTop: 6,
    },
    thumbnail: {
        alignItems: "center",
        padding: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#e2e8f0",
        minWidth: 72,
    },
    thumbnailSelected: {
        borderColor: "#e67e22",
        backgroundColor: "rgba(230,126,34,0.05)",
    },
    thumbnailStrip: {
        width: "100%",
        height: 36,
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 6,
    },
    thumbnailBar: { height: 10, width: "100%" },
    thumbnailLines: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
    },
    thumbnailLine: { height: 2, borderRadius: 1 },
    thumbnailLabel: { fontSize: 11, fontWeight: "600" },
    thumbnailLabelSelected: { color: "#e67e22" },
    thumbnailDesc: { fontSize: 9, color: "#64748b" },
});
//# sourceMappingURL=InvoiceTemplatePreview.js.map