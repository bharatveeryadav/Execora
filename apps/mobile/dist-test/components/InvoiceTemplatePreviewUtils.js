"use strict";
/**
 * InvoiceTemplatePreviewUtils — Shared utilities, helpers, and sub-components
 * Extracted from InvoiceTemplatePreview to reduce main file size ~600 LOC
 * Includes: TotalsBlock, ItemsTable, PaymentSection, DemoLogo, useFormatInr, styles
 */
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
exports.styles = exports.LOGO_STYLES = exports.PreviewSettingsContext = exports.formatInr = void 0;
exports.useFormatInr = useFormatInr;
exports.TotalsBlock = TotalsBlock;
exports.PaymentSection = PaymentSection;
exports.DemoLogo = DemoLogo;
exports.ItemsTable = ItemsTable;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const formatInr = (n, decimals = 2) => {
    if (n === undefined || n === null)
        return "₹0.00";
    const val = parseFloat(n.toString());
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(val);
};
exports.formatInr = formatInr;
exports.PreviewSettingsContext = (0, react_1.createContext)({});
function useFormatInr() {
    const { priceDecimals = 2 } = (0, react_1.useContext)(exports.PreviewSettingsContext);
    return (n) => (0, exports.formatInr)(n, priceDecimals);
}
// ── Shared Sub-Components ──────────────────────────────────────────────────
function TotalsBlock({ d, accentColor = "#374151", thermal = false, showTotalItems = false, }) {
    const fmt = useFormatInr();
    const totalQty = d.items.reduce((s, i) => s + i.qty, 0);
    return (react_1.default.createElement(react_native_1.View, { style: [exports.styles.totalsBlock, thermal && exports.styles.totalsBlockThermal] },
        showTotalItems && !thermal && (react_1.default.createElement(react_native_1.View, { style: exports.styles.totalsRow },
            react_1.default.createElement(react_native_1.Text, { style: exports.styles.totalsLabel },
                "Total Items / Qty: ",
                d.items.length,
                " / ",
                totalQty.toFixed(3)))),
        react_1.default.createElement(react_native_1.View, { style: exports.styles.totalsRow },
            react_1.default.createElement(react_native_1.Text, { style: thermal ? exports.styles.thermalText : exports.styles.totalsLabel }, "Subtotal"),
            react_1.default.createElement(react_native_1.Text, { style: thermal ? exports.styles.thermalText : exports.styles.totalsValue }, fmt(d.subtotal))),
        d.discountAmt > 0 && (react_1.default.createElement(react_native_1.View, { style: exports.styles.totalsRow },
            react_1.default.createElement(react_native_1.Text, { style: [exports.styles.totalsLabel, { color: "#16a34a" }] }, "Discount"),
            react_1.default.createElement(react_native_1.Text, { style: [exports.styles.totalsValue, { color: "#16a34a" }] },
                "-",
                fmt(d.discountAmt)))),
        (d.igst ?? 0) > 0 && (react_1.default.createElement(react_native_1.View, { style: exports.styles.totalsRow },
            react_1.default.createElement(react_native_1.Text, { style: thermal ? exports.styles.thermalText : exports.styles.totalsLabel }, "IGST"),
            react_1.default.createElement(react_native_1.Text, { style: thermal ? exports.styles.thermalText : exports.styles.totalsValue }, fmt(d.igst)))),
        d.cgst > 0 && (react_1.default.createElement(react_native_1.View, { style: exports.styles.totalsRow },
            react_1.default.createElement(react_native_1.Text, { style: thermal ? exports.styles.thermalText : exports.styles.totalsLabel }, "CGST"),
            react_1.default.createElement(react_native_1.Text, { style: thermal ? exports.styles.thermalText : exports.styles.totalsValue }, fmt(d.cgst)))),
        d.sgst > 0 && (react_1.default.createElement(react_native_1.View, { style: exports.styles.totalsRow },
            react_1.default.createElement(react_native_1.Text, { style: thermal ? exports.styles.thermalText : exports.styles.totalsLabel }, "SGST"),
            react_1.default.createElement(react_native_1.Text, { style: thermal ? exports.styles.thermalText : exports.styles.totalsValue }, fmt(d.sgst)))),
        react_1.default.createElement(react_native_1.View, { style: [exports.styles.totalsTotal, { borderTopColor: accentColor }] },
            react_1.default.createElement(react_native_1.Text, { style: [exports.styles.totalsTotalLabel, { color: accentColor }] }, "Total"),
            react_1.default.createElement(react_native_1.Text, { style: [exports.styles.totalsTotalValue, { color: accentColor }] }, fmt(d.total))),
        d.amountInWords ? (react_1.default.createElement(react_native_1.Text, { style: [exports.styles.amountWords, thermal && exports.styles.thermalText] }, d.amountInWords)) : null,
        d.reverseCharge && (react_1.default.createElement(react_native_1.Text, { style: exports.styles.reverseCharge }, "Tax is payable on Reverse Charge"))));
}
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
            react_1.default.createElement(react_native_1.Text, { style: [exports.styles.metaBold, { fontSize: 8, marginBottom: 4 }] }, "Pay using UPI"),
            react_1.default.createElement(react_native_1.Image, { source: { uri: qrUri }, style: {
                    width: 64,
                    height: 64,
                    backgroundColor: "#fff",
                    borderRadius: 4,
                } }))),
        hasBank && (react_1.default.createElement(react_native_1.View, { style: { flex: 1 } },
            react_1.default.createElement(react_native_1.Text, { style: [exports.styles.metaBold, { fontSize: 8, marginBottom: 4 }] }, "Bank Details"),
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
exports.LOGO_STYLES = {
    amazon: { bg: "#ff9900", text: "#fff", label: "AMZ" },
    flipkart: { bg: "#2874f0", text: "#fff", label: "FK" },
    instagram: { bg: "#e4405f", text: "#fff", label: "IG" },
    nike: { bg: "#000", text: "#fff", label: "NK" },
    tata: { bg: "#004687", text: "#fff", label: "TTA" },
    dmart: { bg: "#ffc220", text: "#000", label: "DM" },
    unilever: { bg: "#0066b3", text: "#fff", label: "UL" },
};
function DemoLogo({ placeholder, size = 36, }) {
    if (!placeholder)
        return null;
    const s = exports.LOGO_STYLES[placeholder] ?? exports.LOGO_STYLES.amazon;
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
// ── ItemsTable component ───────────────────────────────────────────────────
function ItemsTable({ items, thermal = false, showHsn = false, serviceStyle = false, }) {
    const fmt = useFormatInr();
    if (thermal) {
        return (react_1.default.createElement(react_native_1.View, null, items.map((it, i) => (react_1.default.createElement(react_native_1.View, { key: i, style: exports.styles.thermalItem },
            react_1.default.createElement(react_native_1.Text, { style: exports.styles.thermalText },
                i + 1,
                ". ",
                it.name),
            react_1.default.createElement(react_native_1.View, { style: exports.styles.thermalItemRow },
                react_1.default.createElement(react_native_1.Text, { style: exports.styles.thermalText },
                    it.qty,
                    " ",
                    it.unit,
                    " \u00D7 ",
                    fmt(it.rate),
                    it.discount ? ` -${it.discount}%` : ""),
                react_1.default.createElement(react_native_1.Text, { style: exports.styles.thermalText }, fmt(it.amount))))))));
    }
    return (react_1.default.createElement(react_native_1.View, { style: exports.styles.itemsTableContainer },
        react_1.default.createElement(react_native_1.View, { style: [
                exports.styles.itemsHeader,
                serviceStyle && { backgroundColor: "#f0fdf4" },
            ] },
            react_1.default.createElement(react_native_1.Text, { style: [exports.styles.itemsHeaderCell, { flex: 3 }] }, "Item / Description"),
            react_1.default.createElement(react_native_1.Text, { style: [exports.styles.itemsHeaderCell, { flex: 1, textAlign: "center" }] }, "Qty / Unit"),
            react_1.default.createElement(react_native_1.Text, { style: [exports.styles.itemsHeaderCell, { flex: 1, textAlign: "right" }] }, "Rate"),
            showHsn && (react_1.default.createElement(react_native_1.Text, { style: [exports.styles.itemsHeaderCell, { flex: 1, textAlign: "center" }] }, "HSN")),
            react_1.default.createElement(react_native_1.Text, { style: [exports.styles.itemsHeaderCell, { flex: 1, textAlign: "right" }] }, "Amount")),
        items.map((it, i) => (react_1.default.createElement(react_native_1.View, { key: i, style: exports.styles.itemsRow },
            react_1.default.createElement(react_native_1.View, { style: { flex: 3 } },
                react_1.default.createElement(react_native_1.Text, { style: exports.styles.itemName }, it.name),
                (it.discount ?? 0) > 0 && (react_1.default.createElement(react_native_1.Text, { style: [exports.styles.itemSub, { color: "#16a34a" }] },
                    "Discount: ",
                    it.discount ?? 0,
                    "%"))),
            react_1.default.createElement(react_native_1.Text, { style: [exports.styles.itemCell, { flex: 1, textAlign: "center" }] },
                it.qty.toFixed(3),
                " ",
                it.unit),
            react_1.default.createElement(react_native_1.Text, { style: [exports.styles.itemCell, { flex: 1, textAlign: "right" }] }, fmt(it.rate)),
            showHsn && (react_1.default.createElement(react_native_1.Text, { style: [exports.styles.itemCell, { flex: 1, textAlign: "center" }] }, it.hsn ?? "-")),
            react_1.default.createElement(react_native_1.Text, { style: [exports.styles.itemCell, { flex: 1, textAlign: "right" }] }, fmt(it.amount)))))));
}
// ── Shared Styles ──────────────────────────────────────────────────────────
exports.styles = react_native_1.StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 4,
    },
    // ── Totals block
    totalsBlock: {
        backgroundColor: "#f8fafc",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        gap: 4,
    },
    totalsBlockThermal: {
        borderTopColor: "#333",
        paddingVertical: 4,
    },
    totalsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalsLabel: {
        fontSize: 10,
        color: "#64748b",
    },
    totalsValue: {
        fontSize: 10,
        fontWeight: "600",
        color: "#1e293b",
    },
    totalsTotal: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
        marginVertical: 4,
        borderTopWidth: 2,
        borderTopColor: "#e2e8f0",
    },
    totalsTotalLabel: {
        fontSize: 12,
        fontWeight: "700",
    },
    totalsTotalValue: {
        fontSize: 12,
        fontWeight: "700",
    },
    amountWords: {
        fontSize: 9,
        color: "#64748b",
        fontStyle: "italic",
        marginTop: 4,
    },
    reverseCharge: {
        fontSize: 8,
        color: "#dc2626",
        fontWeight: "600",
        marginTop: 4,
        textAlign: "center",
    },
    // ── Items table
    itemsTableContainer: {
        borderWidth: 1,
        borderColor: "#e2e8f0",
        marginHorizontal: 10,
        marginVertical: 6,
        borderRadius: 4,
        overflow: "hidden",
    },
    itemsHeader: {
        flexDirection: "row",
        backgroundColor: "#f1f5f9",
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    itemsHeaderCell: {
        fontSize: 9,
        fontWeight: "700",
        color: "#64748b",
        textTransform: "uppercase",
    },
    itemsRow: {
        flexDirection: "row",
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        alignItems: "center",
    },
    itemName: {
        fontSize: 11,
        fontWeight: "500",
        color: "#1e293b",
    },
    itemSub: {
        fontSize: 8,
        color: "#64748b",
        marginTop: 2,
    },
    itemCell: {
        fontSize: 10,
        color: "#475569",
    },
    // ── Thermal
    thermalCard: {
        borderWidth: 1,
        borderColor: "#333",
        paddingVertical: 4,
    },
    thermalHeader: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#333",
    },
    thermalShopName: {
        fontSize: 12,
        fontWeight: "700",
        color: "#000",
        textAlign: "center",
    },
    thermalSub: {
        fontSize: 9,
        color: "#000",
        textAlign: "center",
    },
    thermalText: {
        fontSize: 9,
        color: "#000",
    },
    thermalItem: {
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    thermalItemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 2,
    },
    // ── Classic
    classicCard: {
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    classicHeader: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#f8fafc",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    classicShopName: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1e293b",
    },
    classicSub: {
        fontSize: 10,
        color: "#64748b",
    },
    // ── Modern
    modernCard: {
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 12,
    },
    modernHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    modernShopName: {
        fontSize: 18,
        fontWeight: "800",
        color: "#fff",
    },
    modernHeaderSub: {
        fontSize: 10,
        color: "rgba(255,255,255,0.9)",
        marginTop: 2,
    },
    modernInvNo: {
        fontSize: 12,
        fontWeight: "700",
        color: "#fff",
    },
    modernBillTo: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#f8fafc",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    // ── Vyapari
    vyapariCard: {
        borderWidth: 2,
        borderRadius: 0,
    },
    vyapariHeader: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    vyapariShopName: {
        fontSize: 16,
        fontWeight: "900",
        color: "#fff",
        textAlign: "center",
    },
    vyapariSub: {
        fontSize: 9,
        color: "#fff",
        textAlign: "center",
    },
    vyapariMeta: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    // ── E-Com / Flipkart / Amazon
    ecomCard: {
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 8,
    },
    ecomHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    ecomShopName: {
        fontSize: 14,
        fontWeight: "800",
        color: "#1e293b",
    },
    ecomInvLabel: {
        fontSize: 8,
        color: "#94a3b8",
        textTransform: "uppercase",
        fontWeight: "600",
    },
    ecomInvNo: {
        fontSize: 10,
        fontWeight: "700",
        color: "#1e293b",
    },
    ecomStripe: {
        height: 2,
        backgroundColor: "#ff9900",
        marginVertical: 6,
    },
    ecomBillTo: {
        flexDirection: "row",
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#f8fafc",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        gap: 12,
    },
    ecomLabel: {
        fontSize: 8,
        color: "#94a3b8",
        fontWeight: "700",
        textTransform: "uppercase",
        marginBottom: 2,
    },
    ecomValue: {
        fontSize: 11,
        fontWeight: "600",
        color: "#1e293b",
    },
    ecomSub: {
        fontSize: 9,
        color: "#64748b",
    },
    // ── Flipkart
    flipkartCard: {
        borderWidth: 1,
        borderColor: "#2874f0",
        borderRadius: 0,
    },
    flipkartHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    flipkartShopName: {
        fontSize: 16,
        fontWeight: "800",
        color: "#fff",
    },
    flipkartInvBox: {
        alignItems: "flex-end",
    },
    flipkartInvNo: {
        fontSize: 12,
        fontWeight: "700",
        color: "#fff",
    },
    flipkartDate: {
        fontSize: 9,
        color: "rgba(255,255,255,0.9)",
        marginTop: 2,
    },
    flipkartCustomer: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    // ── Minimal
    minimalCard: {
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 8,
    },
    minimalShopName: {
        fontSize: 16,
        fontWeight: "800",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 2,
        textAlign: "center",
    },
    minimalMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#f8fafc",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    minimalLabel: {
        fontSize: 8,
        color: "#94a3b8",
        textTransform: "uppercase",
        fontWeight: "600",
        marginBottom: 2,
    },
    minimalValue: {
        fontSize: 12,
        fontWeight: "700",
        color: "#1e293b",
    },
    minimalSub: {
        fontSize: 9,
        color: "#64748b",
        marginTop: 2,
    },
    // ── Meta (shared)
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    metaBold: {
        fontWeight: "700",
        color: "#1e293b",
        fontSize: 11,
    },
    metaSmall: {
        fontSize: 9,
        color: "#64748b",
        marginTop: 2,
    },
    compositionText: {
        fontSize: 9,
        color: "#dc2626",
        fontWeight: "600",
    },
});
//# sourceMappingURL=InvoiceTemplatePreviewUtils.js.map