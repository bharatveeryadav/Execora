"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecentActivitySection = RecentActivitySection;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const shared_1 = require("@execora/shared");
const typography_1 = require("../../lib/typography");
function RecentActivitySection({ recentActivityHidden, compactQuickActionsHeader, secsAgo, todayInvoices, onToggleHidden, onRefresh, onInvoicePress, }) {
    return (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-2" },
            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1.5" },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "document-text-outline", size: 18, color: "#0f172a" }),
                    react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle }, "Recent Activity")),
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1 rounded-full bg-green-100 px-2 py-0.5" },
                    react_1.default.createElement(react_native_1.View, { className: "h-1.5 w-1.5 rounded-full bg-green-500" }),
                    react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.micro} font-semibold text-green-700` }, "LIVE"))),
            react_1.default.createElement(react_native_1.View, { style: { flexDirection: "row", alignItems: "center", gap: 8 } },
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onToggleHidden, activeOpacity: 0.8, className: "flex-row items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-600" }, recentActivityHidden
                        ? compactQuickActionsHeader
                            ? "Show"
                            : "Show"
                        : compactQuickActionsHeader
                            ? "Hide"
                            : "Hide"),
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: recentActivityHidden ? "chevron-down" : "chevron-up", size: 14, color: "#64748b" })),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onRefresh, className: "flex-row items-center gap-1" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1" },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "refresh-outline", size: 14, color: "#64748b" }),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption }, secsAgo < 5 ? "just now" : `${secsAgo}s ago`))))),
        !recentActivityHidden && (react_1.default.createElement(react_native_1.View, { className: "rounded-xl border border-slate-200 bg-card overflow-hidden shadow-sm mb-5" },
            todayInvoices.length === 0 && (react_1.default.createElement(react_native_1.View, { className: "py-8 items-center" },
                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.bodyMuted }, "No invoices yet today"))),
            todayInvoices.slice(0, 5).map((inv, idx) => {
                const timeStr = inv.createdAt
                    ? new Date(inv.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                    })
                    : "";
                return (react_1.default.createElement(react_native_1.TouchableOpacity, { key: inv.id, onPress: () => onInvoicePress(inv.id), className: `flex-row items-center px-4 py-3 ${idx > 0 ? "border-t border-slate-100" : ""}` },
                    react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.labelBold }, inv.invoiceNo ?? inv.id.slice(-6)),
                        react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.caption} mt-0.5` }, inv.customer?.name ?? "Walk-in")),
                    react_1.default.createElement(react_native_1.View, { className: "items-end shrink-0", style: { marginLeft: 8 } },
                        react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.value} text-primary` },
                            "\u20B9",
                            (0, shared_1.inr)(inv.total)),
                        timeStr ? (react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.micro} text-slate-500 mt-0.5` }, timeStr)) : null,
                        react_1.default.createElement(react_native_1.View, { className: `mt-1 px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-green-100" : "bg-amber-100"}` },
                            react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.micro} font-semibold text-center ${inv.status === "paid" ? "text-green-700" : "text-amber-700"}` }, inv.status === "paid"
                                ? "✅ Paid"
                                : inv.status === "cancelled"
                                    ? "❌ Void"
                                    : "⏳ Due")))));
            })))));
}
//# sourceMappingURL=RecentActivitySection.js.map