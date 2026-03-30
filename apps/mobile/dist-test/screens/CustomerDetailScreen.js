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
exports.CustomerDetailScreen = CustomerDetailScreen;
/**
 * CustomerDetailScreen — full customer profile with tabs translated from web CustomerDetail.tsx
 * Tabs: Overview (balance, stats, contact, notifications) | Invoices | Ledger | Reminders
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const useDataQueries_1 = require("../hooks/useDataQueries");
const utils_1 = require("../lib/utils");
const alerts_1 = require("../lib/alerts");
const constants_1 = require("../lib/constants");
const queryKeys_1 = require("../lib/queryKeys");
// ── Constants ─────────────────────────────────────────────────────────────────
const TABS = ["Overview", "Invoices", "Ledger", "Reminders"];
const STATUS_STYLES = {
    paid: { bg: "bg-green-100", text: "text-green-700" },
    pending: { bg: "bg-blue-100", text: "text-blue-700" },
    partial: { bg: "bg-yellow-100", text: "text-yellow-700" },
    draft: { bg: "bg-slate-100", text: "text-slate-500" },
    proforma: { bg: "bg-slate-100", text: "text-slate-500" },
    cancelled: { bg: "bg-red-100", text: "text-red-500" },
};
// ── Component ─────────────────────────────────────────────────────────────────
function CustomerDetailScreen({ navigation, route }) {
    const { id } = route.params;
    const qc = (0, react_query_1.useQueryClient)();
    const navigateBilling = () => {
        navigation.getParent()?.navigate("MoreTab", {
            screen: "Billing",
        });
    };
    const navigateInvoiceDetail = (invoiceId) => {
        navigation.getParent()?.navigate("InvoicesTab", {
            screen: "InvoiceDetail",
            params: { id: invoiceId },
        });
    };
    const [tab, setTab] = (0, react_1.useState)("Overview");
    // Edit modal state
    const [editOpen, setEditOpen] = (0, react_1.useState)(false);
    const [editName, setEditName] = (0, react_1.useState)("");
    const [editPhone, setEditPhone] = (0, react_1.useState)("");
    const [editEmail, setEditEmail] = (0, react_1.useState)("");
    const [editNickname, setEditNickname] = (0, react_1.useState)("");
    const [editLandmark, setEditLandmark] = (0, react_1.useState)("");
    const [editCreditLimit, setEditCreditLimit] = (0, react_1.useState)("");
    const [editTags, setEditTags] = (0, react_1.useState)([]);
    const [editNotes, setEditNotes] = (0, react_1.useState)("");
    const [deleteConfirm, setDeleteConfirm] = (0, react_1.useState)(false);
    // Reminder dialog state
    const [reminderOpen, setReminderOpen] = (0, react_1.useState)(false);
    const [remAmount, setRemAmount] = (0, react_1.useState)("");
    const [remDate, setRemDate] = (0, react_1.useState)("");
    const [remMessage, setRemMessage] = (0, react_1.useState)("");
    // Notification prefs modal
    const [prefsOpen, setPrefsOpen] = (0, react_1.useState)(false);
    const [pWaEnabled, setPWaEnabled] = (0, react_1.useState)(true);
    const [pWaNumber, setPWaNumber] = (0, react_1.useState)("");
    const [pEmailEnabled, setPEmailEnabled] = (0, react_1.useState)(false);
    const [pEmailAddress, setPEmailAddress] = (0, react_1.useState)("");
    const [pSmsEnabled, setPSmsEnabled] = (0, react_1.useState)(false);
    const [pLang, setPLang] = (0, react_1.useState)("hi");
    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: custData, isLoading, refetch, isFetching, } = (0, useDataQueries_1.useCustomerDetail)(id);
    const { data: invoiceData } = (0, useDataQueries_1.useCustomerInvoices)(id);
    const { data: ledgerData } = (0, useDataQueries_1.useCustomerLedger)(id);
    // ── Mutations ─────────────────────────────────────────────────────────────
    const updateMutation = (0, react_query_1.useMutation)({
        mutationFn: (data) => api_1.customerApi.update(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys_1.QUERY_KEYS.customerDetail.base(id) });
            qc.invalidateQueries({ queryKey: queryKeys_1.QUERY_KEYS.customers.all() });
            setEditOpen(false);
            (0, alerts_1.showSuccess)("Customer updated ✅");
        },
        onError: () => (0, alerts_1.showError)("Update failed"),
    });
    const deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: () => api_1.customerExtApi.delete(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys_1.QUERY_KEYS.customers.all() });
            navigation.goBack();
        },
        onError: () => (0, alerts_1.showError)("Delete failed"),
    });
    const createReminderMutation = (0, react_query_1.useMutation)({
        mutationFn: (data) => api_1.reminderApi.create(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys_1.QUERY_KEYS.reminders.all() });
            setReminderOpen(false);
            (0, alerts_1.showSuccess)("Reminder set ✅");
        },
        onError: () => (0, alerts_1.showError)("Failed to set reminder"),
    });
    const updatePrefsMutation = (0, react_query_1.useMutation)({
        mutationFn: (data) => api_1.customerExtApi.updateCommPrefs(id, data),
        onSuccess: () => {
            // TODO: Add comm prefs to QUERY_KEYS when implementing notification preferences
            setPrefsOpen(false);
            (0, alerts_1.showSuccess)("Preferences saved ✅");
        },
        onError: () => (0, alerts_1.showError)("Save failed"),
    });
    // ── Derived ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white items-center justify-center" },
            react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#e67e22", size: "large" })));
    }
    const customer = custData?.customer;
    if (!customer) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white items-center justify-center" },
            react_1.default.createElement(react_native_1.Text, { className: "text-slate-400" }, "Customer not found"),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "mt-4 bg-indigo-600 px-5 py-2 rounded-xl" },
                react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, "Go Back"))));
    }
    const invoices = invoiceData?.invoices ?? [];
    const ledger = ledgerData?.entries ?? [];
    // TODO: Implement useReminders hook - fetch reminders for this customer
    const reminders = [];
    const balance = (0, utils_1.toFloat)(customer.balance);
    const totalBilled = invoices.reduce((s, inv) => s + (0, utils_1.toFloat)(inv.total), 0);
    const paidInvoices = invoices.filter((i) => i.status === "paid").length;
    function openEdit() {
        setEditName(customer.name ?? "");
        setEditPhone(customer.phone ?? "");
        setEditEmail(customer.email ?? "");
        setEditNickname(Array.isArray(customer.nickname)
            ? (customer.nickname[0] ?? "")
            : (customer.nickname ?? ""));
        setEditLandmark(customer.landmark ?? "");
        setEditCreditLimit(String(customer.creditLimit ?? ""));
        setEditTags(customer.tags ?? []);
        setEditNotes(customer.notes ?? "");
        setDeleteConfirm(false);
        setEditOpen(true);
    }
    function openPrefs() {
        // Initialize with defaults from customer data
        // TODO: Load actual prefs from API when implemented
        setPWaEnabled(true);
        setPWaNumber(customer?.phone ?? "");
        setPEmailEnabled(false);
        setPEmailAddress(customer?.email ?? "");
        setPSmsEnabled(false);
        setPLang("hi");
        setPrefsOpen(true);
    }
    // ── Render ────────────────────────────────────────────────────────────────
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "bg-white border-b border-slate-100" },
            react_1.default.createElement(react_native_1.View, { className: "px-4 pt-3 pb-0 flex-row items-center" },
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "mr-2 p-1" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-2xl text-slate-600" }, "\u2190")),
                react_1.default.createElement(react_native_1.View, { className: `w-10 h-10 rounded-full items-center justify-center mr-3 ${balance > 0 ? "bg-red-100" : "bg-green-100"}` },
                    react_1.default.createElement(react_native_1.Text, { className: `font-bold text-sm ${balance > 0 ? "text-red-600" : "text-green-600"}` }, customer.name?.charAt(0)?.toUpperCase() ?? "?")),
                react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-base font-bold text-slate-800", numberOfLines: 1 }, customer.name),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, customer.phone ?? "No phone")),
                react_1.default.createElement(react_native_1.View, { className: "flex-row gap-1" },
                    customer.phone && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => react_native_1.Linking.openURL(`https://wa.me/91${customer.phone.replace(/\D/g, "")}`), className: "p-2" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-lg" }, "\uD83D\uDCAC"))),
                    customer.phone && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => react_native_1.Linking.openURL(`tel:${customer.phone}`), className: "p-2" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-lg" }, "\uD83D\uDCDE"))),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: navigateBilling, className: "p-2" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-lg" }, "\uD83E\uDDFE")),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: openEdit, className: "p-2" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-lg" }, "\u270F\uFE0F")))),
            react_1.default.createElement(react_native_1.View, { className: "flex-row border-t border-slate-100 mt-2" }, TABS.map((t) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: t, onPress: () => setTab(t), className: `flex-1 py-3 border-b-2 ${tab === t ? "border-primary" : "border-transparent"}` },
                react_1.default.createElement(react_native_1.Text, { className: `text-center text-xs font-medium ${tab === t ? "text-primary" : "text-slate-400"}` }, t)))))),
        react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1", contentContainerStyle: { padding: 16, gap: 12 }, refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching, onRefresh: refetch }) },
            tab === "Overview" && (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement(react_native_1.View, { className: `rounded-2xl p-5 items-center ${balance > 0 ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}` },
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium uppercase tracking-wide text-slate-500" }, "Outstanding Balance"),
                    react_1.default.createElement(react_native_1.Text, { className: `text-3xl font-black mt-1 ${balance > 0 ? "text-red-600" : "text-green-700"}` }, (0, utils_1.formatCurrency)(balance)),
                    balance > 0 && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.navigate("Payment", { customerId: id }), className: "mt-3 bg-indigo-600 px-5 py-2 rounded-xl" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, "\uD83D\uDCB0 Record Payment")))),
                react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3" }, [
                    { label: "Total Billed", value: (0, utils_1.formatCurrency)(totalBilled) },
                    { label: "Invoices", value: String(invoices.length) },
                    { label: "Paid", value: String(paidInvoices) },
                ].map((stat) => (react_1.default.createElement(react_native_1.View, { key: stat.label, className: "flex-1 bg-white rounded-2xl p-3 items-center shadow-sm" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800" }, stat.value),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 mt-0.5" }, stat.label))))),
                (Number(customer.creditLimit) > 0 ||
                    (customer.tags ?? []).length > 0) && (react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl p-4 shadow-sm gap-2" },
                    Number(customer.creditLimit) > 0 && (react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between items-center" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400" }, "Credit Limit"),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-800" }, (0, utils_1.formatCurrency)(customer.creditLimit)),
                            balance >= Number(customer.creditLimit) && (react_1.default.createElement(react_native_1.View, { className: "bg-red-100 px-2 py-0.5 rounded-full" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-medium text-red-600" }, "\u26A0\uFE0F Limit reached")))))),
                    (customer.tags ?? []).length > 0 && (react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-1.5" }, (customer.tags ?? []).map((tag) => (react_1.default.createElement(react_native_1.View, { key: tag, className: `px-2 py-0.5 rounded-full border ${tag === "Blacklist"
                            ? "border-red-300 bg-red-50"
                            : tag === "VIP"
                                ? "border-yellow-300 bg-yellow-50"
                                : "border-slate-200 bg-slate-50"}` },
                        react_1.default.createElement(react_native_1.Text, { className: `text-[10px] font-medium ${tag === "Blacklist"
                                ? "text-red-600"
                                : tag === "VIP"
                                    ? "text-yellow-700"
                                    : "text-slate-500"}` }, tag)))))))),
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl p-4 shadow-sm gap-1.5" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold uppercase text-slate-400 mb-1" }, "Contact Info"),
                    customer.phone && (react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-700" },
                        "\uD83D\uDCDE ",
                        customer.phone)),
                    customer.email && (react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-700" },
                        "\u2709\uFE0F ",
                        customer.email)),
                    customer.landmark && (react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-700" },
                        "\uD83D\uDCCD ",
                        customer.landmark)),
                    customer.gstin && (react_1.default.createElement(react_native_1.Text, { className: "text-xs font-mono text-slate-600" },
                        "GST: ",
                        customer.gstin)),
                    customer.notes && (react_1.default.createElement(react_native_1.View, { className: "mt-1 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-semibold uppercase text-slate-400 mb-0.5" }, "Notes"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-[13px] text-slate-700" }, customer.notes)))),
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl p-4 shadow-sm" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-3" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold uppercase text-slate-400" }, "Notification Channels"),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: openPrefs },
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-primary" }, "Edit"))),
                    [
                        {
                            label: "WhatsApp",
                            on: true, // Default: enabled
                            detail: customer?.phone,
                        },
                        {
                            label: "Email",
                            on: false, // Default: disabled
                            detail: customer?.email,
                        },
                        {
                            label: "SMS",
                            on: false, // Default: disabled
                            detail: undefined,
                        },
                    ].map((ch) => (react_1.default.createElement(react_native_1.View, { key: ch.label, className: "flex-row justify-between items-center py-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-700" }, ch.label),
                        react_1.default.createElement(react_native_1.Text, { className: `text-xs font-medium ${ch.on ? "text-green-600" : "text-slate-400"}` }, ch.on
                            ? `✓ On${ch.detail ? ` · ${ch.detail}` : ""}`
                            : "Off"))))))),
            tab === "Invoices" && (react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl overflow-hidden shadow-sm" }, invoices.length === 0 ? (react_1.default.createElement(react_native_1.View, { className: "py-10 items-center" },
                react_1.default.createElement(react_native_1.Text, { className: "text-slate-400 text-sm" }, "No invoices yet"))) : (invoices.map((inv, i) => {
                const sc = STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft;
                return (react_1.default.createElement(react_native_1.TouchableOpacity, { key: inv.id, onPress: () => navigateInvoiceDetail(inv.id), className: `flex-row items-center px-4 py-3 ${i > 0 ? "border-t border-slate-50" : ""}` },
                    react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-800" }, inv.invoiceNo),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 mt-0.5" }, (0, utils_1.formatDate)(inv.createdAt))),
                    react_1.default.createElement(react_native_1.View, { className: `px-2 py-0.5 rounded-full mr-2 ${sc.bg}` },
                        react_1.default.createElement(react_native_1.Text, { className: `text-[10px] font-semibold capitalize ${sc.text}` }, inv.status)),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-primary" }, (0, utils_1.formatCurrency)((0, utils_1.toFloat)(inv.total)))));
            })))),
            tab === "Ledger" && (react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl overflow-hidden shadow-sm" }, ledger.length === 0 ? (react_1.default.createElement(react_native_1.View, { className: "py-10 items-center" },
                react_1.default.createElement(react_native_1.Text, { className: "text-slate-400 text-sm" }, "No ledger entries"))) : (ledger.map((entry, i) => {
                const isCharge = entry.type === "invoice";
                return (react_1.default.createElement(react_native_1.View, { key: entry.id ?? i, className: `flex-row items-center px-4 py-2.5 ${i > 0 ? "border-t border-slate-50" : ""}` },
                    react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-800 capitalize" }, entry.description ?? entry.type ?? "Transaction"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 mt-0.5" }, (0, utils_1.formatDate)(entry.createdAt))),
                    react_1.default.createElement(react_native_1.Text, { className: `text-sm font-semibold ${isCharge ? "text-red-600" : "text-green-600"}` },
                        isCharge ? "+" : "-",
                        (0, utils_1.formatCurrency)((0, utils_1.toFloat)(entry.amount)))));
            })))),
            tab === "Reminders" && (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold uppercase text-slate-400" },
                        reminders.length,
                        " reminder",
                        reminders.length !== 1 ? "s" : ""),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                            setRemAmount(balance > 0 ? String(balance) : "");
                            setRemDate("");
                            setRemMessage("");
                            setReminderOpen(true);
                        }, className: "bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center gap-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold text-sm" }, "+ Set Reminder"))),
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl overflow-hidden shadow-sm" }, reminders.length === 0 ? (react_1.default.createElement(react_native_1.View, { className: "py-10 items-center" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-slate-400 text-sm" }, "No reminders yet"))) : (reminders.map((r, i) => (react_1.default.createElement(react_native_1.View, { key: r.id, className: `flex-row items-center px-4 py-2.5 ${i > 0 ? "border-t border-slate-50" : ""}` },
                    react_1.default.createElement(react_native_1.Text, { className: "mr-2" }, "\uD83D\uDD14"),
                    react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-800 truncate" }, r.message ?? "Reminder"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 mt-0.5" }, (0, utils_1.formatDateTime)(r.scheduledTime))),
                    react_1.default.createElement(react_native_1.View, { className: `px-2 py-0.5 rounded-full ${r.status === "sent" ? "bg-green-100" : "bg-slate-100"}` },
                        react_1.default.createElement(react_native_1.Text, { className: `text-[10px] font-medium capitalize ${r.status === "sent" ? "text-green-700" : "text-slate-500"}` }, r.status))))))))),
            react_1.default.createElement(react_native_1.View, { className: "h-6" })),
        react_1.default.createElement(react_native_1.Modal, { visible: editOpen, transparent: true, animationType: "slide" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 bg-black/50 justify-end" },
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-t-3xl px-5 pt-5 pb-10", style: { maxHeight: "90%" } },
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800 mb-4" }, "Edit Customer"),
                    react_1.default.createElement(react_native_1.ScrollView, { showsVerticalScrollIndicator: false },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600 mb-1" }, "Name *"),
                        react_1.default.createElement(react_native_1.TextInput, { value: editName, onChangeText: setEditName, placeholder: "Customer name", placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3" }),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600 mb-1" }, "Phone"),
                        react_1.default.createElement(react_native_1.TextInput, { value: editPhone, onChangeText: setEditPhone, placeholder: "10-digit mobile", keyboardType: "phone-pad", placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3" }),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600 mb-1" }, "Email"),
                        react_1.default.createElement(react_native_1.TextInput, { value: editEmail, onChangeText: setEditEmail, placeholder: "email@example.com", keyboardType: "email-address", autoCapitalize: "none", placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3" }),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600 mb-1" }, "Nickname"),
                        react_1.default.createElement(react_native_1.TextInput, { value: editNickname, onChangeText: setEditNickname, placeholder: "e.g. Ramesh bhai", placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3" }),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600 mb-1" }, "Landmark / Area"),
                        react_1.default.createElement(react_native_1.TextInput, { value: editLandmark, onChangeText: setEditLandmark, placeholder: "e.g. near Rajiv Chowk", placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3" }),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600 mb-1" }, "Credit Limit (0 = no limit)"),
                        react_1.default.createElement(react_native_1.TextInput, { value: editCreditLimit, onChangeText: setEditCreditLimit, keyboardType: "numeric", placeholder: "0", placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3" }),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600 mb-2" }, "Tags"),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-2 mb-3" }, constants_1.CUSTOMER_TAGS.map((tag) => {
                            const active = editTags.includes(tag);
                            return (react_1.default.createElement(react_native_1.TouchableOpacity, { key: tag, onPress: () => setEditTags((prev) => active
                                    ? prev.filter((t) => t !== tag)
                                    : [...prev, tag]), className: `px-3 py-1 rounded-full border ${active
                                    ? tag === "Blacklist"
                                        ? "border-red-400 bg-red-50"
                                        : "border-primary/40 bg-primary/10"
                                    : "border-slate-200 bg-slate-50"}` },
                                react_1.default.createElement(react_native_1.Text, { className: `text-xs font-medium ${active
                                        ? tag === "Blacklist"
                                            ? "text-red-600"
                                            : "text-primary"
                                        : "text-slate-500"}` }, tag)));
                        })),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600 mb-1" }, "Notes"),
                        react_1.default.createElement(react_native_1.TextInput, { value: editNotes, onChangeText: setEditNotes, placeholder: "Any notes about this customer\u2026", placeholderTextColor: "#94a3b8", multiline: true, numberOfLines: 2, className: "border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-4" }),
                        react_1.default.createElement(react_native_1.View, { className: "border-t border-slate-100 pt-3" }, !deleteConfirm ? (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setDeleteConfirm(true), className: "flex-row items-center gap-1.5" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-red-500" }, "\uD83D\uDDD1 Delete this customer"))) : (react_1.default.createElement(react_native_1.View, { className: "bg-red-50 border border-red-200 rounded-xl p-3 gap-2" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-red-600" },
                                "\u26A0\uFE0F Deleting",
                                " ",
                                react_1.default.createElement(react_native_1.Text, { className: "font-bold" }, customer?.name),
                                " will remove all their invoices, ledger entries and reminders. This cannot be undone."),
                            react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2" },
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => deleteMutation.mutate(), disabled: deleteMutation.isPending, className: "bg-red-600 rounded-lg px-4 py-2 flex-row items-center gap-1" }, deleteMutation.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff", size: "small" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-white text-xs font-bold" }, "Yes, Delete"))),
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setDeleteConfirm(false), className: "border border-slate-200 rounded-lg px-4 py-2" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600" }, "Cancel"))))))),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3 mt-4" },
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setEditOpen(false), className: "flex-1 border border-slate-200 rounded-xl py-3 items-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-slate-700" }, "Cancel")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => updateMutation.mutate({
                                name: editName,
                                phone: editPhone || undefined,
                                email: editEmail || undefined,
                                nickname: editNickname || undefined,
                                landmark: editLandmark || undefined,
                                creditLimit: editCreditLimit
                                    ? Number(editCreditLimit)
                                    : undefined,
                                tags: editTags.length ? editTags : undefined,
                                notes: editNotes || undefined,
                            }), disabled: !editName.trim() || updateMutation.isPending, className: `flex-1 rounded-xl py-3 items-center ${editName.trim() ? "bg-indigo-600" : "bg-slate-200"}` }, updateMutation.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff" })) : (react_1.default.createElement(react_native_1.Text, { className: "font-bold text-white" }, "Save Changes"))))))),
        react_1.default.createElement(react_native_1.Modal, { visible: reminderOpen, transparent: true, animationType: "slide" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 bg-black/50 justify-end" },
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-t-3xl px-5 pt-5 pb-10" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800 mb-4" }, "Set Reminder"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600 mb-1" }, "Amount Outstanding (\u20B9)"),
                    react_1.default.createElement(react_native_1.TextInput, { value: remAmount, onChangeText: setRemAmount, keyboardType: "numeric", placeholder: String(balance > 0 ? balance : 0), placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3" }),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600 mb-1" }, "Date (YYYY-MM-DD HH:MM)"),
                    react_1.default.createElement(react_native_1.TextInput, { value: remDate, onChangeText: setRemDate, placeholder: "2026-04-01 10:00", placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3" }),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600 mb-1" }, "Message (optional)"),
                    react_1.default.createElement(react_native_1.TextInput, { value: remMessage, onChangeText: setRemMessage, placeholder: `Reminder for ${customer?.name ?? "customer"}`, placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-4" }),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3" },
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setReminderOpen(false), className: "flex-1 border border-slate-200 rounded-xl py-3 items-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-slate-700" }, "Cancel")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { disabled: !remDate || createReminderMutation.isPending, onPress: () => createReminderMutation.mutate({
                                customerId: id,
                                amount: remAmount ? parseFloat(remAmount) : balance,
                                datetime: remDate,
                                message: remMessage || undefined,
                            }), className: `flex-1 rounded-xl py-3 items-center ${remDate ? "bg-indigo-600" : "bg-slate-200"}` }, createReminderMutation.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff" })) : (react_1.default.createElement(react_native_1.Text, { className: "font-bold text-white" }, "Set Reminder"))))))),
        react_1.default.createElement(react_native_1.Modal, { visible: prefsOpen, transparent: true, animationType: "slide" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 bg-black/50 justify-end" },
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-t-3xl px-5 pt-5 pb-10" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800 mb-4" }, "Notification Preferences"),
                    react_1.default.createElement(react_native_1.View, { className: "border border-slate-200 rounded-xl p-3 mb-3 gap-2" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-700" }, "WhatsApp"),
                            react_1.default.createElement(react_native_1.Switch, { value: pWaEnabled, onValueChange: setPWaEnabled, trackColor: { true: "#e67e22" } })),
                        pWaEnabled && (react_1.default.createElement(react_native_1.TextInput, { value: pWaNumber, onChangeText: setPWaNumber, keyboardType: "phone-pad", placeholder: "10-digit number", placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 mt-1" }))),
                    react_1.default.createElement(react_native_1.View, { className: "border border-slate-200 rounded-xl p-3 mb-3 gap-2" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-700" }, "Email Reminders"),
                            react_1.default.createElement(react_native_1.Switch, { value: pEmailEnabled, onValueChange: setPEmailEnabled, trackColor: { true: "#e67e22" } })),
                        pEmailEnabled && (react_1.default.createElement(react_native_1.TextInput, { value: pEmailAddress, onChangeText: setPEmailAddress, keyboardType: "email-address", autoCapitalize: "none", placeholder: "customer@email.com", placeholderTextColor: "#94a3b8", className: "border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 mt-1" }))),
                    react_1.default.createElement(react_native_1.View, { className: "border border-slate-200 rounded-xl p-3 mb-3 flex-row items-center justify-between" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-700" }, "SMS Reminders"),
                        react_1.default.createElement(react_native_1.Switch, { value: pSmsEnabled, onValueChange: setPSmsEnabled, trackColor: { true: "#e67e22" } })),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600 mb-2" }, "Preferred Language"),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-2 mb-4" }, constants_1.LANGUAGES.map((lang) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: lang, onPress: () => setPLang(lang), className: `px-3 py-1.5 rounded-full border ${pLang === lang ? "bg-indigo-600 border-primary" : "border-slate-200 bg-slate-50"}` },
                        react_1.default.createElement(react_native_1.Text, { className: `text-xs font-medium ${pLang === lang ? "text-white" : "text-slate-600"}` }, constants_1.LANGUAGE_LABELS[lang]))))),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3" },
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setPrefsOpen(false), className: "flex-1 border border-slate-200 rounded-xl py-3 items-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-slate-700" }, "Cancel")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => updatePrefsMutation.mutate({
                                whatsappEnabled: pWaEnabled,
                                whatsappNumber: pWaNumber || undefined,
                                emailEnabled: pEmailEnabled,
                                emailAddress: pEmailAddress || undefined,
                                smsEnabled: pSmsEnabled,
                                preferredLanguage: pLang,
                            }), disabled: updatePrefsMutation.isPending, className: "flex-1 bg-indigo-600 rounded-xl py-3 items-center" }, updatePrefsMutation.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff" })) : (react_1.default.createElement(react_native_1.Text, { className: "font-bold text-white" }, "Save")))))))));
}
//# sourceMappingURL=CustomerDetailScreen.js.map