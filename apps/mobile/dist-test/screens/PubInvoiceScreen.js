"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PubInvoiceScreen = PubInvoiceScreen;
/**
 * Public invoice portal — no auth required (Sprint 16).
 * URL: execora://pub/invoice/:id/:token
 * Fetches from GET /pub/invoice/:id/:token
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const vector_icons_1 = require("@expo/vector-icons");
const api_1 = require("../lib/api");
const API_BASE = (0, api_1.getApiBaseUrl)().replace(/\/$/, "");
function inr(n) {
    return new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}
// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
    paid: { label: "Paid ✅", bg: "bg-green-100", text: "text-green-700" },
    partial: { label: "Partial", bg: "bg-amber-100", text: "text-amber-700" },
    cancelled: { label: "Cancelled", bg: "bg-red-100", text: "text-red-600" },
    proforma: { label: "Proforma", bg: "bg-blue-100", text: "text-blue-700" },
    pending: { label: "Unpaid", bg: "bg-yellow-100", text: "text-yellow-700" },
    draft: { label: "Draft", bg: "bg-slate-100", text: "text-slate-600" },
};
function PubInvoiceScreen({ navigation, route }) {
    const { id, token } = route.params;
    const { data, isLoading, isError, refetch, isFetching } = (0, react_query_1.useQuery)({
        queryKey: ["portal-invoice", id, token],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/pub/invoice/${id}/${token}`);
            if (!res.ok)
                throw new Error("not-found");
            const json = (await res.json());
            return json.invoice;
        },
        retry: false,
        staleTime: 60_000,
    });
    const handleDownloadPdf = () => {
        react_native_1.Linking.openURL(`${API_BASE}/pub/invoice/${id}/${token}/pdf`);
    };
    if (isLoading) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50 items-center justify-center" },
            react_1.default.createElement(react_native_1.ActivityIndicator, { size: "large", color: "#e67e22" }),
            react_1.default.createElement(react_native_1.Text, { className: "text-slate-500 mt-3" }, "Loading invoice\u2026")));
    }
    if (isError || !data) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50 items-center justify-center px-6" },
            react_1.default.createElement(vector_icons_1.Ionicons, { name: "alert-circle-outline", size: 48, color: "#94a3b8" }),
            react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold text-slate-700 mt-4 text-center" }, "Invoice not found"),
            react_1.default.createElement(react_native_1.Text, { className: "text-slate-500 text-center mt-2" }, "This link may have expired or is invalid. Please contact the sender for a new link."),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "mt-6 bg-primary px-6 py-3 rounded-xl" },
                react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, "Go back"))));
    }
    const invoice = data;
    const pending = Math.max(0, invoice.totalAmount - invoice.paidAmount);
    const hasTax = invoice.taxAmount > 0;
    const hasDiscount = invoice.discountAmount > 0;
    const statusKey = invoice.isProforma ? "proforma" : invoice.status;
    const status = STATUS_CFG[statusKey] ?? STATUS_CFG.pending;
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50" },
        react_1.default.createElement(react_native_1.View, { className: "bg-white border-b border-slate-200 px-4 py-3 flex-row items-center justify-between" },
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "p-2 -ml-2" },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "arrow-back", size: 24, color: "#0f172a" })),
            react_1.default.createElement(react_native_1.Text, { className: "text-base font-semibold text-slate-800" }, invoice.shopName ?? "Invoice"),
            react_1.default.createElement(react_native_1.View, { className: "w-10" })),
        react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1 px-4 py-4", refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching, onRefresh: () => refetch() }) },
            react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl border border-slate-200 p-5 mb-4" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between items-start mb-4" },
                    react_1.default.createElement(react_native_1.View, null,
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 uppercase tracking-wide font-medium" }, "Invoice"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-2xl font-black text-slate-800" }, invoice.invoiceNo),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500 mt-0.5" }, new Date(invoice.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        }))),
                    react_1.default.createElement(react_native_1.View, { className: `px-3 py-1.5 rounded-full ${status.bg}` },
                        react_1.default.createElement(react_native_1.Text, { className: `text-xs font-semibold ${status.text}` }, status.label))),
                invoice.customer && (react_1.default.createElement(react_native_1.View, { className: "border-t border-slate-100 pt-4" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 uppercase tracking-wide font-medium mb-1" }, "Bill To"),
                    react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-slate-800" }, invoice.customer.name),
                    invoice.customer.phone && (react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, invoice.customer.phone)),
                    invoice.customer.address && (react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, invoice.customer.address)),
                    invoice.customer.gstin && (react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 mt-0.5" },
                        "GSTIN: ",
                        invoice.customer.gstin))))),
            react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl border border-slate-200 p-5 mb-4" },
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 uppercase tracking-wide font-medium mb-3" }, "Items"),
                invoice.items.map((item, idx) => (react_1.default.createElement(react_native_1.View, { key: idx, className: "flex-row justify-between py-2 border-b border-slate-50 last:border-0" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-1 mr-3" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-800", numberOfLines: 2 }, item.productName),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" },
                            item.quantity,
                            " \u00D7 \u20B9",
                            inr(item.unitPrice),
                            item.lineDiscountPercent ? (react_1.default.createElement(react_native_1.Text, { className: "text-green-600" },
                                " (-",
                                item.lineDiscountPercent,
                                "%)")) : null)),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-800" },
                        "\u20B9",
                        inr(item.lineTotal))))),
                react_1.default.createElement(react_native_1.View, { className: "border-t border-slate-100 mt-4 pt-4" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between py-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "Subtotal"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" },
                            "\u20B9",
                            inr(invoice.subtotal))),
                    hasDiscount && (react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between py-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-green-600" }, "Discount"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-green-600" },
                            "-\u20B9",
                            inr(invoice.discountAmount)))),
                    hasTax && (react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between py-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "GST"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" },
                            "\u20B9",
                            inr(invoice.taxAmount)))),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between py-2 mt-1 border-t border-slate-100" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-base font-black text-slate-800" }, "Total"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-base font-black text-slate-800" },
                            "\u20B9",
                            inr(invoice.totalAmount))),
                    invoice.paidAmount > 0 && (react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between py-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-green-600" }, "Paid"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-green-600" },
                            "\u20B9",
                            inr(invoice.paidAmount)))),
                    pending > 0 && invoice.status !== "cancelled" && (react_1.default.createElement(react_native_1.View, { className: "mt-4 gap-2" },
                        react_1.default.createElement(react_native_1.View, { className: "rounded-xl bg-amber-50 border border-amber-200 p-3 flex-row justify-between items-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-amber-700" }, "Amount Due"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-lg font-black text-amber-700" },
                                "\u20B9",
                                inr(pending))),
                        invoice.upiVpa && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => react_native_1.Linking.openURL(`upi://pay?pa=${encodeURIComponent(invoice.upiVpa)}&pn=${encodeURIComponent(invoice.shopName ?? "Execora")}&am=${pending.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoice.invoiceNo}`)}`), className: "rounded-xl bg-green-600 py-3.5 flex-row items-center justify-center gap-2" },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "phone-portrait-outline", size: 20, color: "#fff" }),
                            react_1.default.createElement(react_native_1.Text, { className: "text-white font-bold" }, "Pay Now (UPI)"))))),
                    pending === 0 && invoice.status === "paid" && (react_1.default.createElement(react_native_1.View, { className: "mt-4 rounded-xl bg-green-50 border border-green-200 p-3 flex-row items-center justify-center gap-2" },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "checkmark-circle", size: 20, color: "#22c55e" }),
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-green-700" }, "Fully Paid \u2014 Thank you!"))))),
            invoice.notes && (react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl border border-slate-200 p-5 mb-4" },
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 uppercase tracking-wide font-medium mb-1" }, "Notes"),
                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, invoice.notes))),
            invoice.hasPdf && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleDownloadPdf, className: "rounded-2xl bg-primary py-3.5 flex-row items-center justify-center gap-2 mb-4" },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "download-outline", size: 22, color: "#fff" }),
                react_1.default.createElement(react_native_1.Text, { className: "text-white font-bold" }, "Download PDF Invoice"))),
            react_1.default.createElement(react_native_1.Text, { className: "text-center text-xs text-slate-400 mb-6" }, "Powered by Execora \u00B7 Secure invoice portal"))));
}
//# sourceMappingURL=PubInvoiceScreen.js.map