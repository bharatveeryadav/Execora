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
exports.InvoiceDetailScreen = InvoiceDetailScreen;
/**
 * InvoiceDetailScreen — full invoice view translated from web InvoiceDetail.tsx
 * Shows: amount hero, progress bar, invoice info, items, tax breakdown,
 * action buttons (WhatsApp, share, email), edit modal, cancel confirm.
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const utils_1 = require("../lib/utils");
const constants_1 = require("../lib/constants");
const useWsInvalidation_1 = require("../hooks/useWsInvalidation");
const useResponsive_1 = require("../hooks/useResponsive");
const useDataQueries_1 = require("../hooks/useDataQueries");
const alerts_1 = require("../lib/alerts");
// ── Component ─────────────────────────────────────────────────────────────────
function InvoiceDetailScreen({ navigation, route }) {
    const { id } = route.params;
    const { contentPad, contentWidth } = (0, useResponsive_1.useResponsive)();
    (0, useWsInvalidation_1.useWsInvalidation)(["invoices"]);
    // ── State ─────────────────────────────────────────────────────────────────
    const [editOpen, setEditOpen] = (0, react_1.useState)(false);
    const [editItems, setEditItems] = (0, react_1.useState)([]);
    const [editNotes, setEditNotes] = (0, react_1.useState)("");
    const [convertOpen, setConvertOpen] = (0, react_1.useState)(false);
    const [convertAmount, setConvertAmount] = (0, react_1.useState)("");
    const [convertMethod, setConvertMethod] = (0, react_1.useState)("cash");
    const [confirmCancel, setConfirmCancel] = (0, react_1.useState)(false);
    // ── Queries & Mutations ───────────────────────────────────────────────────
    const { data: invoice, isLoading, refetch, isFetching } = (0, useDataQueries_1.useInvoiceById)(id);
    const cancelMutation = (0, useDataQueries_1.useCancelInvoice)(id, () => {
        navigation.goBack();
    });
    const updateMutation = (0, useDataQueries_1.useUpdateInvoice)(id, () => {
        setEditOpen(false);
        (0, alerts_1.showSuccess)("Invoice updated ✅");
    });
    // ── Derived values ────────────────────────────────────────────────────────
    if (isLoading) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white items-center justify-center" },
            react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#e67e22", size: "large" })));
    }
    if (!invoice) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white items-center justify-center gap-4" },
            react_1.default.createElement(react_native_1.Text, { className: "text-slate-400" }, "Invoice not found"),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "bg-primary px-5 py-2 rounded-xl" },
                react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, "Go Back"))));
    }
    const statusCfg = constants_1.STATUS_STYLES[invoice.status] ??
        constants_1.STATUS_STYLES.pending;
    const total = (0, utils_1.toFloat)(invoice.total);
    const paidAmount = (0, utils_1.toFloat)(invoice.paidAmount);
    const pending = Math.max(0, total - paidAmount);
    const subtotal = (0, utils_1.toFloat)(invoice.subtotal);
    const discount = (0, utils_1.toFloat)(invoice.discount);
    const cgst = (0, utils_1.toFloat)(invoice.cgst);
    const sgst = (0, utils_1.toFloat)(invoice.sgst);
    const igst = (0, utils_1.toFloat)(invoice.igst);
    const hasTax = cgst > 0 || sgst > 0 || igst > 0;
    const customerName = invoice.customer?.name ?? "Walk-in";
    const customerPhone = invoice.customer?.phone;
    const canEdit = ["draft", "pending", "partial"].includes(invoice.status);
    const canCancel = !["cancelled", "paid"].includes(invoice.status);
    // WhatsApp deep link
    const waText = `Hi ${customerName},\n\nInvoice ${invoice.invoiceNo} for ${(0, utils_1.formatCurrency)(total)} is ${invoice.status}.\n\nBalance due: ${(0, utils_1.formatCurrency)(pending)}\n\nThank you!`;
    const waLink = customerPhone
        ? `https://wa.me/91${customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(waText)}`
        : null;
    // ── Edit modal helpers ────────────────────────────────────────────────────
    function openEdit() {
        setEditItems((invoice.items ?? []).map((it) => ({
            id: it.id,
            name: it.product?.name ?? it.productName ?? "Product",
            qty: it.quantity,
            price: (0, utils_1.toFloat)(it.unitPrice),
            discount: 0,
        })));
        setEditNotes(invoice.notes ?? "");
        setEditOpen(true);
    }
    function changeQty(idx, delta) {
        setEditItems((prev) => prev.map((it, i) => i === idx ? { ...it, qty: Math.max(1, it.qty + delta) } : it));
    }
    function saveEdit() {
        updateMutation.mutate({
            items: editItems.map((it) => ({
                productName: it.name,
                quantity: it.qty,
            })),
            notes: editNotes || undefined,
        });
    }
    // ── Render ────────────────────────────────────────────────────────────────
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { style: { flex: 1, width: "100%", alignItems: "center" } },
            react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth, flex: 1 } },
                react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: contentPad, paddingVertical: 12 }, className: "bg-white border-b border-slate-100 flex-row items-center justify-between" },
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "mr-3 p-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-2xl text-slate-600" }, "\u2190")),
                    react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-base font-bold text-slate-800" }, invoice.invoiceNo),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, customerName)),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                        react_1.default.createElement(react_native_1.View, { className: `px-2 py-1 rounded-full ${statusCfg.bg}` },
                            react_1.default.createElement(react_native_1.Text, { className: `text-[11px] font-semibold ${statusCfg.text}` }, statusCfg.label)),
                        canEdit && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: openEdit, className: "ml-1 p-1" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-lg" }, "\u270F\uFE0F"))))),
                react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1", contentContainerStyle: { padding: contentPad, gap: 12 }, refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching, onRefresh: refetch }) },
                    react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl p-5 shadow-sm" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-row items-start justify-between" },
                            react_1.default.createElement(react_native_1.View, null,
                                react_1.default.createElement(react_native_1.Text, { className: "text-[11px] uppercase tracking-wide text-slate-400" }, "Total Amount"),
                                react_1.default.createElement(react_native_1.Text, { className: "text-3xl font-black text-slate-800 mt-0.5" }, (0, utils_1.formatCurrency)(total)),
                                invoice.dueDate && (react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 mt-1" },
                                    "Due: ",
                                    (0, utils_1.formatDate)(invoice.dueDate)))),
                            react_1.default.createElement(react_native_1.View, { className: "items-end" },
                                paidAmount > 0 && (react_1.default.createElement(react_native_1.Text, { className: "text-sm text-green-600 font-medium" },
                                    "Paid: ",
                                    (0, utils_1.formatCurrency)(paidAmount))),
                                pending > 0 && (react_1.default.createElement(react_native_1.Text, { className: "text-sm text-red-600 font-bold" },
                                    "Due: ",
                                    (0, utils_1.formatCurrency)(pending))))),
                        total > 0 && paidAmount > 0 && paidAmount < total && (react_1.default.createElement(react_native_1.View, { className: "mt-4" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between mb-1" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400" }, "Collected"),
                                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400" },
                                    Math.round((paidAmount / total) * 100),
                                    "%")),
                            react_1.default.createElement(react_native_1.View, { className: "h-2 bg-slate-100 rounded-full overflow-hidden" },
                                react_1.default.createElement(react_native_1.View, { className: "h-full bg-green-500 rounded-full", style: {
                                        width: `${Math.min(100, (paidAmount / total) * 100)}%`,
                                    } }))))),
                    react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl overflow-hidden shadow-sm" }, [
                        { label: "Invoice No.", value: invoice.invoiceNo },
                        { label: "Customer", value: customerName },
                        { label: "Date", value: (0, utils_1.formatDate)(invoice.createdAt) },
                        invoice.dueDate && {
                            label: "Due Date",
                            value: (0, utils_1.formatDate)(invoice.dueDate),
                        },
                        invoice.buyerGstin && {
                            label: "Buyer GSTIN",
                            value: invoice.buyerGstin,
                        },
                        invoice.placeOfSupply && {
                            label: "Place of Supply",
                            value: invoice.placeOfSupply,
                        },
                    ]
                        .filter(Boolean)
                        .map((row, i, arr) => (react_1.default.createElement(react_native_1.View, { key: row.label, className: `flex-row items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b border-slate-50" : ""}` },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400" }, row.label),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800" }, row.value))))),
                    invoice.items && invoice.items.length > 0 && (react_1.default.createElement(react_native_1.View, null,
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2" },
                            "Items (",
                            invoice.items.length,
                            ")"),
                        react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl overflow-hidden shadow-sm" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-row bg-slate-50 px-4 py-2" },
                                react_1.default.createElement(react_native_1.Text, { className: "flex-1 text-[11px] font-semibold uppercase text-slate-400" }, "Item"),
                                react_1.default.createElement(react_native_1.Text, { className: "w-10 text-[11px] font-semibold uppercase text-slate-400 text-right" }, "Qty"),
                                react_1.default.createElement(react_native_1.Text, { className: "w-20 text-[11px] font-semibold uppercase text-slate-400 text-right" }, "Rate"),
                                react_1.default.createElement(react_native_1.Text, { className: "w-20 text-[11px] font-semibold uppercase text-slate-400 text-right" }, "Amount")),
                            invoice.items.map((item, i) => (react_1.default.createElement(react_native_1.View, { key: item.id ?? i, className: `flex-row px-4 py-3 ${i > 0 ? "border-t border-slate-50" : ""}` },
                                react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800", numberOfLines: 2 }, item.product?.name ?? item.productName ?? "Product"),
                                    item.product?.unit && (react_1.default.createElement(react_native_1.Text, { className: "text-[11px] text-slate-400" }, item.product.unit))),
                                react_1.default.createElement(react_native_1.Text, { className: "w-10 text-sm text-slate-600 text-right" }, item.quantity),
                                react_1.default.createElement(react_native_1.Text, { className: "w-20 text-sm text-slate-600 text-right" }, (0, utils_1.formatCurrency)((0, utils_1.toFloat)(item.unitPrice))),
                                react_1.default.createElement(react_native_1.Text, { className: "w-20 text-sm font-semibold text-slate-800 text-right" }, (0, utils_1.formatCurrency)((0, utils_1.toFloat)(item.itemTotal))))))))),
                    react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl p-4 shadow-sm gap-2" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-400" }, "Subtotal"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-800" }, (0, utils_1.formatCurrency)(subtotal))),
                        discount > 0 && (react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-400" }, "Discount"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-green-600" },
                                "-",
                                (0, utils_1.formatCurrency)(discount)))),
                        hasTax && (react_1.default.createElement(react_1.default.Fragment, null,
                            cgst > 0 && (react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-400" }, "CGST"),
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-800" }, (0, utils_1.formatCurrency)(cgst)))),
                            sgst > 0 && (react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-400" }, "SGST"),
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-800" }, (0, utils_1.formatCurrency)(sgst)))),
                            igst > 0 && (react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-400" }, "IGST"),
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-800" }, (0, utils_1.formatCurrency)(igst)))))),
                        react_1.default.createElement(react_native_1.View, { className: "border-t border-slate-100 pt-2 flex-row justify-between" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-slate-800" }, "Total"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-slate-800" }, (0, utils_1.formatCurrency)(total))),
                        paidAmount > 0 && (react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-green-600" }, "Paid"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-green-600" }, (0, utils_1.formatCurrency)(paidAmount)))),
                        pending > 0 && (react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-red-600" }, "Balance Due"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-red-600" }, (0, utils_1.formatCurrency)(pending))))),
                    invoice.notes && (react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl p-4 shadow-sm" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold uppercase text-slate-400 mb-1" }, "Notes"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-700" }, invoice.notes))),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-3" },
                        waLink && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => react_native_1.Linking.openURL(waLink), className: "flex-1 min-w-[45%] flex-row items-center justify-center gap-2 border border-green-300 rounded-2xl py-3" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-base" }, "\uD83D\uDCAC"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-green-700" }, "WhatsApp"))),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => react_native_1.Share.share({
                                title: invoice.invoiceNo,
                                message: `Invoice ${invoice.invoiceNo} — ${(0, utils_1.formatCurrency)(total)}\nCustomer: ${customerName}\nStatus: ${invoice.status}\nBalance due: ${(0, utils_1.formatCurrency)(pending)}`,
                            }), className: "flex-1 min-w-[45%] flex-row items-center justify-center gap-2 border border-slate-200 rounded-2xl py-3" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-base" }, "\u2197\uFE0F"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-700" }, "Share"))),
                    invoice.status === "proforma" && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                            setConvertAmount(String(total));
                            setConvertOpen(true);
                        }, className: "bg-blue-600 rounded-2xl py-4 items-center" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-white font-bold" }, "\uD83D\uDCC4 Convert to Tax Invoice"))),
                    canCancel && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setConfirmCancel(true), className: "rounded-2xl py-4 items-center border border-red-200" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-red-600 font-semibold" }, "\u2715 Cancel Invoice"))),
                    react_1.default.createElement(react_native_1.View, { className: "h-6" })))),
        react_1.default.createElement(react_native_1.Modal, { visible: confirmCancel, transparent: true, animationType: "fade" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 bg-black/50 items-center justify-center px-6" },
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-3xl p-6 w-full" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800 mb-2" },
                        "Cancel ",
                        invoice.invoiceNo,
                        "?"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 mb-6" },
                        "This will cancel the invoice for ",
                        (0, utils_1.formatCurrency)(total),
                        ". This action cannot be undone."),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3" },
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setConfirmCancel(false), className: "flex-1 border border-slate-200 rounded-xl py-3 items-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-slate-700" }, "Keep Invoice")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                                setConfirmCancel(false);
                                cancelMutation.mutate();
                            }, disabled: cancelMutation.isPending, className: "flex-1 bg-red-600 rounded-xl py-3 items-center" }, cancelMutation.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff" })) : (react_1.default.createElement(react_native_1.Text, { className: "font-bold text-white" }, "Yes, Cancel"))))))),
        react_1.default.createElement(react_native_1.Modal, { visible: editOpen, transparent: true, animationType: "slide" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 bg-black/50 justify-end" },
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-t-3xl px-5 pt-5 pb-8", style: { maxHeight: "80%" } },
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800 mb-4" },
                        "Edit ",
                        invoice.invoiceNo),
                    react_1.default.createElement(react_native_1.ScrollView, null,
                        editItems.map((item, idx) => {
                            const lineTotal = Math.round(item.price *
                                item.qty *
                                (1 - (item.discount || 0) / 100) *
                                100) / 100;
                            return (react_1.default.createElement(react_native_1.View, { key: item.id, className: "flex-row items-center py-2 border-b border-slate-50 gap-2" },
                                react_1.default.createElement(react_native_1.Text, { className: "flex-1 text-sm text-slate-800", numberOfLines: 1 }, item.name),
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => changeQty(idx, -1), className: "w-7 h-7 rounded-full bg-slate-100 items-center justify-center" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-slate-600 font-bold" }, "\u2212")),
                                react_1.default.createElement(react_native_1.Text, { className: "w-8 text-center font-semibold text-slate-800" }, item.qty),
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => changeQty(idx, 1), className: "w-7 h-7 rounded-full bg-slate-100 items-center justify-center" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-slate-600 font-bold" }, "+")),
                                react_1.default.createElement(react_native_1.Text, { className: "w-20 text-right text-sm font-semibold text-slate-800" }, (0, utils_1.formatCurrency)(lineTotal)),
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setEditItems((prev) => prev.filter((_, i) => i !== idx)) },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-red-400 text-lg" }, "\u2715"))));
                        }),
                        react_1.default.createElement(react_native_1.TextInput, { value: editNotes, onChangeText: setEditNotes, placeholder: "Notes (optional)", placeholderTextColor: "#94a3b8", multiline: true, numberOfLines: 2, className: "mt-4 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" })),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3 mt-4" },
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setEditOpen(false), className: "flex-1 border border-slate-200 rounded-xl py-3 items-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-slate-700" }, "Cancel")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: saveEdit, disabled: updateMutation.isPending, className: "flex-1 bg-primary rounded-xl py-3 items-center" }, updateMutation.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff" })) : (react_1.default.createElement(react_native_1.Text, { className: "font-bold text-white" }, "Save Changes"))))))),
        react_1.default.createElement(react_native_1.Modal, { visible: convertOpen, transparent: true, animationType: "slide" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 bg-black/50 justify-end" },
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-t-3xl px-5 pt-5 pb-8" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800 mb-1" }, "Convert to Tax Invoice"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 mb-4" }, "Optionally record an initial payment below."),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600 mb-1" }, "Payment Amount (optional)"),
                    react_1.default.createElement(react_native_1.TextInput, { value: convertAmount, onChangeText: setConvertAmount, keyboardType: "numeric", placeholder: `Max ${(0, utils_1.formatCurrency)(total)}`, placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3" }),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600 mb-1" }, "Payment Method"),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-2 mb-4" }, constants_1.PAYMENT_METHODS.map((m) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: m.value, onPress: () => setConvertMethod(m.value), className: `px-4 py-2 rounded-full border ${convertMethod === m.value ? "bg-primary border-primary" : "border-slate-200"}` },
                        react_1.default.createElement(react_native_1.Text, { className: `text-sm font-medium ${convertMethod === m.value ? "text-white" : "text-slate-600"}` }, m.label))))),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3" },
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setConvertOpen(false), className: "flex-1 border border-slate-200 rounded-xl py-3 items-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-slate-700" }, "Cancel")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                                // Conversion logic can be wired when backend endpoint is confirmed
                                (0, alerts_1.showInfo)("Proforma conversion submitted", "Convert");
                                setConvertOpen(false);
                            }, className: "flex-1 bg-blue-600 rounded-xl py-3 items-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "font-bold text-white" }, "Convert to Invoice"))))))));
}
//# sourceMappingURL=InvoiceDetailScreen.js.map