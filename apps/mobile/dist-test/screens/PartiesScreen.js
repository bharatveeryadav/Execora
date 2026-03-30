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
exports.PartiesScreen = PartiesScreen;
/**
 * PartiesScreen — Customers + Vendors tabs (matches web Parties.tsx).
 * Modern UI/UX: TYPO scale, 44pt touch targets (iOS HIG), 8px spacing grid.
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const FileSystem = __importStar(require("expo-file-system"));
const Sharing = __importStar(require("expo-sharing"));
const Print = __importStar(require("expo-print"));
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const useWsInvalidation_1 = require("../hooks/useWsInvalidation");
const useResponsive_1 = require("../hooks/useResponsive");
const shared_1 = require("@execora/shared");
const EmptyState_1 = require("../components/ui/EmptyState");
const ErrorCard_1 = require("../components/ui/ErrorCard");
const FilterBar_1 = require("../components/composites/FilterBar");
const TabBar_1 = require("../components/composites/TabBar");
const typography_1 = require("../lib/typography");
const MIN_TOUCH = 44;
const CUSTOMER_TAGS = ["VIP", "Wholesale", "Blacklist", "Regular"];
const PARTY_TABS = [
    { id: "customers", label: "Customers", icon: "people" },
    { id: "vendors", label: "Vendors", icon: "cube" },
];
function PartiesScreen({ navigation }) {
    const qc = (0, react_query_1.useQueryClient)();
    const { contentPad, contentWidth } = (0, useResponsive_1.useResponsive)();
    (0, useWsInvalidation_1.useWsInvalidation)(["customers", "summary"]);
    const [tab, setTab] = (0, react_1.useState)("customers");
    const [search, setSearch] = (0, react_1.useState)("");
    const [filter, setFilter] = (0, react_1.useState)("all");
    const [addOpen, setAddOpen] = (0, react_1.useState)(false);
    const [menuOpen, setMenuOpen] = (0, react_1.useState)(false);
    const [vendorSearch, setVendorSearch] = (0, react_1.useState)("");
    const [addVendorOpen, setAddVendorOpen] = (0, react_1.useState)(false);
    // Add Customer form
    const [newName, setNewName] = (0, react_1.useState)("");
    const [newPhone, setNewPhone] = (0, react_1.useState)("");
    const [newEmail, setNewEmail] = (0, react_1.useState)("");
    const [newNickname, setNewNickname] = (0, react_1.useState)("");
    const [newLandmark, setNewLandmark] = (0, react_1.useState)("");
    const [newNotes, setNewNotes] = (0, react_1.useState)("");
    const [newOpeningBal, setNewOpeningBal] = (0, react_1.useState)("");
    const [newCreditLimit, setNewCreditLimit] = (0, react_1.useState)("");
    const [newTags, setNewTags] = (0, react_1.useState)([]);
    // Add Vendor form
    const [vendorName, setVendorName] = (0, react_1.useState)("");
    const [vendorCompany, setVendorCompany] = (0, react_1.useState)("");
    const [vendorPhone, setVendorPhone] = (0, react_1.useState)("");
    const [vendorEmail, setVendorEmail] = (0, react_1.useState)("");
    const [vendorAddress, setVendorAddress] = (0, react_1.useState)("");
    // ── Queries ─────────────────────────────────────────────────────────────
    const { data: custData, isFetching, isError, refetch, } = (0, react_query_1.useQuery)({
        queryKey: ["customers", search],
        queryFn: () => search.length >= 1
            ? api_1.customerApi.search(search, 500)
            : api_1.customerApi.list(1, 500),
        staleTime: 10_000,
    });
    const { data: purchaseData } = (0, react_query_1.useQuery)({
        queryKey: ["purchases"],
        queryFn: () => api_1.purchaseApi.list({}),
        staleTime: 30_000,
    });
    const { data: invoiceData } = (0, react_query_1.useQuery)({
        queryKey: ["invoices"],
        queryFn: () => api_1.invoiceApi.list(1, 1000),
        staleTime: 30_000,
    });
    const { data: supplierData } = (0, react_query_1.useQuery)({
        queryKey: ["suppliers", vendorSearch],
        queryFn: () => api_1.supplierApi.list({ q: vendorSearch || undefined, limit: 200 }),
        staleTime: 30_000,
        enabled: tab === "vendors",
    });
    const customers = custData?.customers ?? [];
    const suppliers = supplierData?.suppliers ?? [];
    const purchases = purchaseData?.purchases ?? [];
    const invoices = invoiceData?.invoices ?? [];
    const toPay = purchases.reduce((s, p) => s + (parseFloat(String(p.amount)) || 0), 0);
    const toCollect = 0;
    // ── Aging (from web) ───────────────────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const agingMap = new Map();
    for (const inv of invoices) {
        if (inv.status === "paid" || inv.status === "cancelled")
            continue;
        const remaining = parseFloat(String(inv.total)) -
            parseFloat(String(inv.paidAmount ?? 0));
        if (remaining <= 0)
            continue;
        const invDate = new Date(inv.invoiceDate ?? inv.createdAt);
        invDate.setHours(0, 0, 0, 0);
        const days = Math.floor((today.getTime() - invDate.getTime()) / 86_400_000);
        const custId = inv.customerId;
        const existing = agingMap.get(custId);
        if (existing === undefined || days > existing)
            agingMap.set(custId, days);
    }
    const agingCustomers = customers
        .filter((c) => parseFloat(String(c.balance)) > 0)
        .map((c) => ({ ...c, ageDays: agingMap.get(c.id) ?? 0 }))
        .sort((a, b) => b.ageDays - a.ageDays);
    const agingBuckets = [
        {
            label: "60+ Days",
            sublabel: "Very Overdue",
            color: "text-red-600",
            bg: "bg-red-100",
            items: agingCustomers.filter((c) => c.ageDays >= 60),
        },
        {
            label: "31–60 Days",
            sublabel: "Overdue",
            color: "text-orange-600",
            bg: "bg-orange-100",
            items: agingCustomers.filter((c) => c.ageDays >= 31 && c.ageDays < 60),
        },
        {
            label: "0–30 Days",
            sublabel: "Fresh",
            color: "text-green-600",
            bg: "bg-green-100",
            items: agingCustomers.filter((c) => c.ageDays < 31),
        },
    ];
    const outstanding = customers.reduce((s, c) => s + Math.max(0, parseFloat(String(c.balance))), 0);
    const outCount = customers.filter((c) => parseFloat(String(c.balance)) > 0).length;
    const clearCount = customers.filter((c) => parseFloat(String(c.balance)) <= 0).length;
    const filtered = [...customers]
        .filter((c) => {
        const bal = parseFloat(String(c.balance));
        if (filter === "outstanding")
            return bal > 0;
        if (filter === "clear")
            return bal <= 0;
        return true;
    })
        .sort((a, b) => parseFloat(String(b.balance)) - parseFloat(String(a.balance)));
    const customerFilterOptions = (0, react_1.useMemo)(() => [
        { id: "all", label: `All (${customers.length})` },
        { id: "outstanding", label: `Has Due (${outCount})` },
        { id: "clear", label: `Clear (${clearCount})` },
        { id: "aging", label: `Aging (${agingCustomers.length})` },
    ], [agingCustomers.length, clearCount, customers.length, outCount]);
    const activeCustomerFilters = (0, react_1.useMemo)(() => customerFilterOptions
        .filter((option) => option.id === filter)
        .map((option) => ({ id: option.id, label: option.label })), [customerFilterOptions, filter]);
    // ── Mutations ──────────────────────────────────────────────────────────
    const createMutation = (0, react_query_1.useMutation)({
        mutationFn: (data) => api_1.customerExtApi.create(data),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ["customers"] });
            setAddOpen(false);
            const customer = res?.customer;
            if (customer?.id)
                navigation.navigate("CustomerDetail", { id: customer.id });
            (0, alerts_1.showAlert)("", `${newName} added`);
        },
        onError: () => (0, alerts_1.showAlert)("Error", "Failed to add customer"),
    });
    function openAdd() {
        setNewName("");
        setNewPhone("");
        setNewEmail("");
        setNewNickname("");
        setNewLandmark("");
        setNewNotes("");
        setNewOpeningBal("");
        setNewCreditLimit("");
        setNewTags([]);
        setAddOpen(true);
    }
    function handleAdd() {
        if (!newName.trim())
            return;
        createMutation.mutate({
            name: newName.trim(),
            phone: newPhone || undefined,
            email: newEmail || undefined,
            nickname: newNickname || undefined,
            landmark: newLandmark || undefined,
            notes: newNotes || undefined,
            openingBalance: newOpeningBal ? parseFloat(newOpeningBal) : undefined,
            creditLimit: newCreditLimit ? parseFloat(newCreditLimit) : undefined,
            tags: newTags.length ? newTags : undefined,
        });
    }
    function toggleTag(tag) {
        setNewTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
    }
    // ── Export & Import helpers ─────────────────────────────────────────────
    function getTabNav() {
        try {
            return navigation.getParent?.();
        }
        catch {
            return undefined;
        }
    }
    function navigateToImport(type) {
        setMenuOpen(false);
        getTabNav()?.navigate("MoreTab", { screen: "Import", params: { type } });
    }
    function exportCustomersCsv() {
        const header = [
            "Name",
            "Phone",
            "Email",
            "Address",
            "GSTIN",
            "Balance",
            "Credit Limit",
            "Tags",
        ];
        const rows = customers.map((c) => [
            c.name ?? "",
            c.phone ?? "",
            c.email ?? "",
            [c.addressLine1, c.addressLine2, c.city, c.state, c.pincode]
                .filter(Boolean)
                .join(", "),
            c.gstin ?? "",
            String(parseFloat(String(c.balance ?? 0))),
            String(c.creditLimit ?? ""),
            (c.tags ?? []).join("; "),
        ]);
        const csv = [header, ...rows]
            .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const content = "\uFEFF" + csv;
        const filePath = `${FileSystem.cacheDirectory}customers.csv`;
        FileSystem.writeAsStringAsync(filePath, content, {
            encoding: FileSystem.EncodingType.UTF8,
        }).then(() => {
            Sharing.shareAsync(filePath, {
                mimeType: "text/csv",
                dialogTitle: "Share customers.csv",
            });
        });
        setMenuOpen(false);
    }
    async function exportCustomersPdf() {
        const escapeHtml = (s) => String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        const rows = customers
            .slice(0, 100)
            .map((c, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(c.name ?? "")}</td><td>${escapeHtml(c.phone ?? "")}</td><td>₹${(0, shared_1.inr)(parseFloat(String(c.balance ?? 0)))}</td></tr>`)
            .join("");
        const html = `<html><head><meta charset="utf-8"/><style>body{font-family:system-ui,sans-serif;padding:24px;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body><h1>Customers (${customers.length})</h1><table><tr><th>#</th><th>Name</th><th>Phone</th><th>Balance</th></tr>${rows}</table></body></html>`;
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: "Share customers.pdf",
        });
        setMenuOpen(false);
    }
    const createVendorMutation = (0, react_query_1.useMutation)({
        mutationFn: (data) => api_1.supplierApi.create(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["suppliers"] });
            setAddVendorOpen(false);
            setVendorName("");
            setVendorCompany("");
            setVendorPhone("");
            setVendorEmail("");
            setVendorAddress("");
            (0, alerts_1.showAlert)("", "Vendor added");
        },
        onError: () => (0, alerts_1.showAlert)("Error", "Failed to add vendor"),
    });
    function handleAddVendor() {
        if (!vendorName.trim())
            return;
        createVendorMutation.mutate({
            name: vendorName.trim(),
            companyName: vendorCompany || undefined,
            phone: vendorPhone || undefined,
            email: vendorEmail || undefined,
            address: vendorAddress || undefined,
        });
    }
    // ── Render customer row ─────────────────────────────────────────────────
    const renderCustomerRow = (c) => {
        const balance = parseFloat(String(c.balance));
        const hasOutstanding = balance > 0;
        const ageDays = c.ageDays ?? 0;
        const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };
        return (react_1.default.createElement(react_native_1.Pressable, { key: c.id, className: "flex-row items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white", onPress: () => navigation.navigate("CustomerDetail", { id: c.id }), style: ({ pressed }) => ({
                backgroundColor: pressed ? "#f8fafc" : "#fff",
            }) },
            react_1.default.createElement(react_native_1.View, { className: `w-12 h-12 rounded-full items-center justify-center ${hasOutstanding ? "bg-red-50" : "bg-green-50"}` },
                react_1.default.createElement(react_native_1.Text, { className: `font-bold text-base ${hasOutstanding ? "text-red-600" : "text-green-600"}` }, c.name?.charAt(0)?.toUpperCase() ?? "?")),
            react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2 min-w-0" },
                    react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.labelBold} flex-1 min-w-0`, numberOfLines: 1 }, c.name),
                    (c.tags ?? []).includes("VIP") && (react_1.default.createElement(react_native_1.View, { className: "bg-amber-100 px-2 py-0.5 rounded-full" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-semibold text-amber-700" }, "VIP"))),
                    (c.tags ?? []).includes("Blacklist") && (react_1.default.createElement(react_native_1.Text, { className: "text-xs" }, "\u26D4"))),
                react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.caption} min-w-0`, numberOfLines: 1 },
                    filter === "aging"
                        ? ageDays === 0
                            ? "Today"
                            : `${ageDays}d overdue`
                        : (c.phone ?? "No phone"),
                    filter === "aging" && c.phone ? ` · ${c.phone}` : "")),
            react_1.default.createElement(react_native_1.View, { className: "items-end min-w-[4rem]" }, hasOutstanding ? (react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold tabular-nums text-red-600" },
                "\u20B9",
                (0, shared_1.inr)(balance))) : (react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1 bg-green-50 px-2.5 py-1 rounded-full" },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "checkmark-circle", size: 12, color: "#16a34a" }),
                react_1.default.createElement(react_native_1.Text, { className: "text-[11px] font-medium text-green-700" }, "Clear")))),
            react_1.default.createElement(react_native_1.View, { className: "flex-row gap-1" },
                c.phone && (react_1.default.createElement(react_native_1.Pressable, { onPress: (e) => {
                        e.stopPropagation();
                        react_native_1.Linking.openURL(`https://wa.me/91${c.phone.replace(/\D/g, "")}`);
                    }, hitSlop: hitSlop, className: "w-10 h-10 rounded-full bg-green-50 items-center justify-center", style: ({ pressed }) => ({ opacity: pressed ? 0.7 : 1 }) },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "logo-whatsapp", size: 18, color: "#16a34a" }))),
                c.phone && (react_1.default.createElement(react_native_1.Pressable, { onPress: (e) => {
                        e.stopPropagation();
                        react_native_1.Linking.openURL(`tel:${c.phone}`);
                    }, hitSlop: hitSlop, className: "w-10 h-10 rounded-full bg-slate-100 items-center justify-center", style: ({ pressed }) => ({ opacity: pressed ? 0.7 : 1 }) },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "call", size: 16, color: "#475569" }))))));
    };
    // ── Main render ─────────────────────────────────────────────────────────
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "pt-4 pb-3 border-b border-slate-200/80 bg-white", style: { paddingHorizontal: contentPad } },
            react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth, alignSelf: "center" } },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-4" },
                    react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.pageTitle }, "Parties"),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                        tab === "customers" && (react_1.default.createElement(react_native_1.Pressable, { onPress: () => navigation.navigate("Overdue"), className: "flex-row items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 min-h-[44]", style: ({ pressed }) => ({ opacity: pressed ? 0.8 : 1 }) },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "alert-circle", size: 16, color: "#dc2626" }),
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs font-bold text-red-600" }, "Udhaar"))),
                        react_1.default.createElement(react_native_1.Pressable, { onPress: () => setMenuOpen(true), className: "w-11 h-11 rounded-full bg-slate-100 items-center justify-center", style: ({ pressed }) => ({ opacity: pressed ? 0.7 : 1 }), hitSlop: { top: 8, bottom: 8, left: 8, right: 8 } },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "ellipsis-horizontal", size: 22, color: "#475569" })))),
                react_1.default.createElement(TabBar_1.TabBar, { tabs: PARTY_TABS, activeTab: tab, onChange: (nextTab) => setTab(nextTab), variant: "pills", className: "rounded-2xl bg-slate-100 p-1" }))),
        tab === "customers" && (react_1.default.createElement(react_1.default.Fragment, null,
            react_1.default.createElement(react_native_1.View, { className: "py-3 bg-white border-b border-slate-100", style: { paddingHorizontal: contentPad } },
                react_1.default.createElement(react_native_1.View, { style: {
                        width: "100%",
                        maxWidth: contentWidth,
                        alignSelf: "center",
                    } },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center rounded-2xl bg-slate-100 px-4 min-h-[48]" },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "search", size: 20, color: "#94a3b8", style: { marginRight: 12 } }),
                        react_1.default.createElement(react_native_1.TextInput, { value: search, onChangeText: setSearch, placeholder: "Search by name or phone\u2026", placeholderTextColor: "#94a3b8", className: "flex-1 text-base text-slate-800 py-0" }),
                        isFetching && (react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: "#e67e22" }))))),
            react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1", contentContainerStyle: {
                    padding: contentPad,
                    paddingBottom: 100,
                    alignItems: "center",
                }, refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: isFetching, onRefresh: refetch, tintColor: "#e67e22" }) },
                react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth } },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3 mb-4" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 rounded-2xl bg-white border border-slate-200/80 p-4 items-center shadow-sm" },
                            react_1.default.createElement(react_native_1.View, { className: "w-10 h-10 rounded-full bg-slate-100 items-center justify-center mb-2" },
                                react_1.default.createElement(vector_icons_1.Ionicons, { name: "people", size: 20, color: "#64748b" })),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.value }, customers.length),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption }, "Total")),
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 rounded-2xl bg-white border border-red-100 p-4 items-center shadow-sm" },
                            react_1.default.createElement(react_native_1.View, { className: "w-10 h-10 rounded-full bg-red-50 items-center justify-center mb-2" },
                                react_1.default.createElement(vector_icons_1.Ionicons, { name: "alert-circle", size: 20, color: "#dc2626" })),
                            react_1.default.createElement(react_native_1.Text, { className: "text-base font-bold text-red-600" }, outCount),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption }, "Has Due")),
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 rounded-2xl bg-white border border-red-100 p-4 items-center shadow-sm" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-base font-bold text-red-600 mb-0.5" },
                                "\u20B9",
                                (0, shared_1.inr)(outstanding)),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption }, "Outstanding"))),
                    react_1.default.createElement(FilterBar_1.FilterBar, { options: customerFilterOptions, activeFilters: activeCustomerFilters, onFilterChange: (nextFilter, toRemove) => {
                            requestAnimationFrame(() => {
                                setFilter(toRemove ? "all" : nextFilter);
                            });
                        }, onClearAll: () => setFilter("all"), variant: "chips", maxVisible: 4, className: "mb-4" }),
                    filter === "aging" && (react_1.default.createElement(react_native_1.View, { className: "gap-4 mb-4" }, agingCustomers.length === 0 ? (react_1.default.createElement(react_native_1.View, { className: "rounded-2xl border border-slate-200/80 bg-white py-16 items-center shadow-sm" },
                        react_1.default.createElement(react_native_1.View, { className: "w-16 h-16 rounded-full bg-green-50 items-center justify-center mb-3" },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "checkmark-circle", size: 40, color: "#22c55e" })),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.bodyMuted }, "No outstanding balances"))) : (agingBuckets.map((bucket) => bucket.items.length > 0 && (react_1.default.createElement(react_native_1.View, { key: bucket.label, className: "rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm mb-4" },
                        react_1.default.createElement(react_native_1.View, { className: `flex-row items-center justify-between px-4 py-3 ${bucket.bg}` },
                            react_1.default.createElement(react_native_1.Text, { className: `text-sm font-semibold ${bucket.color}` }, bucket.label),
                            react_1.default.createElement(react_native_1.View, { className: `rounded-full px-2 py-0.5 ${bucket.bg}` },
                                react_1.default.createElement(react_native_1.Text, { className: `text-[10px] font-bold ${bucket.color}` }, bucket.items.length))),
                        react_1.default.createElement(react_native_1.View, { className: "bg-white" }, bucket.items.map((c) => renderCustomerRow(c))))))))),
                    filter !== "aging" && (react_1.default.createElement(react_native_1.View, { className: "rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm" }, isError ? (react_1.default.createElement(react_native_1.View, { className: "py-8 px-4" },
                        react_1.default.createElement(ErrorCard_1.ErrorCard, { message: "Failed to load customers", onRetry: () => refetch() }))) : filtered.length === 0 ? (react_1.default.createElement(react_native_1.View, { className: "py-14 items-center rounded-2xl bg-white border border-slate-200/80" },
                        react_1.default.createElement(EmptyState_1.EmptyState, { iconName: search ? "search-outline" : "people-outline", title: search ? "No customers found" : "No customers yet", description: search
                                ? "Try a different search"
                                : "Add your first customer", actionLabel: !search ? "Add Customer" : undefined, onAction: !search ? openAdd : undefined }))) : (filtered.map((c) => renderCustomerRow(c))))))),
            react_1.default.createElement(react_native_1.Pressable, { onPress: openAdd, className: "absolute bottom-6 right-4 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg", style: ({ pressed }) => ({ opacity: pressed ? 0.9 : 1 }) },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "add", size: 28, color: "#fff" })))),
        tab === "vendors" && (react_1.default.createElement(react_1.default.Fragment, null,
            react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1", contentContainerStyle: {
                    padding: contentPad,
                    paddingBottom: 100,
                    alignItems: "center",
                } },
                react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth } },
                    react_1.default.createElement(react_native_1.View, { className: "rounded-2xl border border-slate-200/80 bg-white p-4 mb-4 shadow-sm" },
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle }, "Collect & Pay"),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3 mt-3" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-1 rounded-xl border border-red-100 bg-red-50 p-4 flex-row items-center gap-3" },
                                react_1.default.createElement(react_native_1.View, { className: "w-10 h-10 rounded-full bg-red-100 items-center justify-center" },
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "arrow-up", size: 20, color: "#dc2626" })),
                                react_1.default.createElement(react_native_1.View, null,
                                    react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption }, "To Pay"),
                                    react_1.default.createElement(react_native_1.Text, { className: "text-base font-bold text-red-600" },
                                        "\u20B9",
                                        (0, shared_1.inr)(toPay)))),
                            react_1.default.createElement(react_native_1.View, { className: "flex-1 rounded-xl border border-green-100 bg-green-50 p-4 flex-row items-center gap-3" },
                                react_1.default.createElement(react_native_1.View, { className: "w-10 h-10 rounded-full bg-green-100 items-center justify-center" },
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "arrow-down", size: 20, color: "#16a34a" })),
                                react_1.default.createElement(react_native_1.View, null,
                                    react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption }, "To Collect"),
                                    react_1.default.createElement(react_native_1.Text, { className: "text-base font-bold text-green-600" },
                                        "\u20B9",
                                        (0, shared_1.inr)(toCollect)))))),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-3 mb-4" },
                        react_1.default.createElement(react_native_1.Pressable, { onPress: () => getTabNav()?.navigate("MoreTab", { screen: "Purchases" }), className: "flex-row items-center gap-2 border border-slate-200 rounded-xl px-4 py-3 min-h-[44] bg-white", style: ({ pressed }) => ({ opacity: pressed ? 0.7 : 1 }) },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "cube", size: 20, color: "#64748b" }),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.body }, "View Purchases")),
                        react_1.default.createElement(react_native_1.Pressable, { onPress: () => getTabNav()?.navigate("MoreTab", { screen: "Expenses" }), className: "flex-row items-center gap-2 border border-slate-200 rounded-xl px-4 py-3 min-h-[44] bg-white", style: ({ pressed }) => ({ opacity: pressed ? 0.7 : 1 }) },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "receipt", size: 20, color: "#64748b" }),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.body }, "View Expenses"))),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center rounded-2xl bg-slate-100 px-4 min-h-[48] mb-4" },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "search", size: 20, color: "#94a3b8", style: { marginRight: 12 } }),
                        react_1.default.createElement(react_native_1.TextInput, { value: vendorSearch, onChangeText: setVendorSearch, placeholder: "Search vendors\u2026", placeholderTextColor: "#94a3b8", className: "flex-1 text-base text-slate-800 py-0" })),
                    react_1.default.createElement(react_native_1.View, { className: "rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm" }, suppliers.length === 0 ? (react_1.default.createElement(react_native_1.View, { className: "py-14 items-center" },
                        react_1.default.createElement(EmptyState_1.EmptyState, { iconName: vendorSearch ? "search-outline" : "cube-outline", title: vendorSearch ? "No vendors found" : "No vendors yet", description: vendorSearch
                                ? "Try a different search"
                                : "Add your first vendor", actionLabel: "Add Vendor", onAction: () => setAddVendorOpen(true) }))) : (suppliers.map((s) => (react_1.default.createElement(react_native_1.Pressable, { key: s.id, className: "flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100 min-h-[56]", onPress: () => getTabNav()?.navigate("MoreTab", {
                            screen: "Purchases",
                        }), style: ({ pressed }) => ({
                            backgroundColor: pressed ? "#f8fafc" : "#fff",
                        }) },
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.labelBold, numberOfLines: 1 }, s.name),
                            (s.companyName || s.phone) && (react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption, numberOfLines: 1 }, [s.companyName, s.phone]
                                .filter(Boolean)
                                .join(" · ")))),
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 20, color: "#94a3b8" }))))))),
                react_1.default.createElement(react_native_1.Pressable, { onPress: () => setAddVendorOpen(true), className: "absolute bottom-6 right-4 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg", style: ({ pressed }) => ({ opacity: pressed ? 0.9 : 1 }) },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "add", size: 28, color: "#fff" }))),
            react_1.default.createElement(react_native_1.Modal, { visible: addVendorOpen, transparent: true, animationType: "slide" },
                react_1.default.createElement(react_native_1.KeyboardAvoidingView, { behavior: react_native_1.Platform.OS === "ios" ? "padding" : "height", className: "flex-1 justify-end" },
                    react_1.default.createElement(react_native_1.Pressable, { className: "absolute inset-0 bg-black/50", onPress: () => setAddVendorOpen(false) }),
                    react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[90%]" },
                        react_1.default.createElement(react_native_1.View, { className: "w-10 h-1 rounded-full bg-slate-200 self-center mb-4" }),
                        react_1.default.createElement(react_native_1.ScrollView, { showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: "handled" },
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.pageTitle + " mb-4" }, "Add Vendor"),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label + " mb-1" }, "Name *"),
                            react_1.default.createElement(react_native_1.TextInput, { value: vendorName, onChangeText: setVendorName, placeholder: "e.g. Ramesh Traders", className: "border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3", placeholderTextColor: "#94a3b8" }),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label + " mb-1" }, "Company Name"),
                            react_1.default.createElement(react_native_1.TextInput, { value: vendorCompany, onChangeText: setVendorCompany, placeholder: "e.g. Ramesh Pvt Ltd", className: "border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3", placeholderTextColor: "#94a3b8" }),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label + " mb-1" }, "Phone"),
                            react_1.default.createElement(react_native_1.TextInput, { value: vendorPhone, onChangeText: setVendorPhone, placeholder: "10-digit mobile", keyboardType: "phone-pad", className: "border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3", placeholderTextColor: "#94a3b8" }),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label + " mb-1" }, "Email"),
                            react_1.default.createElement(react_native_1.TextInput, { value: vendorEmail, onChangeText: setVendorEmail, placeholder: "email@example.com", keyboardType: "email-address", className: "border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3", placeholderTextColor: "#94a3b8" }),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label + " mb-1" }, "Address"),
                            react_1.default.createElement(react_native_1.TextInput, { value: vendorAddress, onChangeText: setVendorAddress, placeholder: "Full address", className: "border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-4", placeholderTextColor: "#94a3b8" }),
                            react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2" },
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setAddVendorOpen(false), className: "flex-1 border border-slate-200 rounded-xl py-3 items-center" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-600" }, "Cancel")),
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleAddVendor, disabled: !vendorName.trim() || createVendorMutation.isPending, className: `flex-1 rounded-xl py-3 items-center ${vendorName.trim() && !createVendorMutation.isPending ? "bg-primary" : "bg-slate-300"}` }, createVendorMutation.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff", size: "small" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-white" }, "Add Vendor")))))))))),
        react_1.default.createElement(react_native_1.Modal, { visible: menuOpen, transparent: true, animationType: "fade" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 justify-end" },
                react_1.default.createElement(react_native_1.Pressable, { className: "absolute inset-0 bg-black/50", onPress: () => setMenuOpen(false) }),
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[70%]" },
                    react_1.default.createElement(react_native_1.View, { className: "w-10 h-1 rounded-full bg-slate-200 self-center mb-4" }),
                    react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.pageTitle + " mb-4" }, tab === "customers" ? "Customers" : "Vendors"),
                    tab === "customers" ? (react_1.default.createElement(react_1.default.Fragment, null,
                        react_1.default.createElement(react_native_1.Pressable, { onPress: () => navigateToImport("customers"), className: "flex-row items-center gap-3 py-3.5 min-h-[48] border-b border-slate-100", style: ({ pressed }) => ({ opacity: pressed ? 0.7 : 1 }) },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "cloud-upload", size: 22, color: "#64748b" }),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.body }, "Import Customers")),
                        react_1.default.createElement(react_native_1.Pressable, { onPress: () => {
                                setMenuOpen(false);
                                (0, alerts_1.showAlert)("Coming soon", "Merge customers feature is coming soon.");
                            }, className: "flex-row items-center gap-3 py-3.5 min-h-[48] border-b border-slate-100", style: ({ pressed }) => ({ opacity: pressed ? 0.7 : 1 }) },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "git-merge", size: 22, color: "#64748b" }),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.body }, "Merge Customers")),
                        react_1.default.createElement(react_native_1.Pressable, { onPress: exportCustomersCsv, className: "flex-row items-center gap-3 py-3.5 min-h-[48] border-b border-slate-100", style: ({ pressed }) => ({ opacity: pressed ? 0.7 : 1 }) },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "document-text", size: 22, color: "#64748b" }),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.body }, "Download Excel (CSV)")),
                        react_1.default.createElement(react_native_1.Pressable, { onPress: exportCustomersPdf, className: "flex-row items-center gap-3 py-3.5 min-h-[48] border-b border-slate-100", style: ({ pressed }) => ({ opacity: pressed ? 0.7 : 1 }) },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "document", size: 22, color: "#64748b" }),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.body }, "Download PDF")))) : (react_1.default.createElement(react_native_1.Pressable, { onPress: () => navigateToImport("vendors"), className: "flex-row items-center gap-3 py-3.5 min-h-[48] border-b border-slate-100", style: ({ pressed }) => ({ opacity: pressed ? 0.7 : 1 }) },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "cloud-upload", size: 22, color: "#64748b" }),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.body }, "Import Vendors"))),
                    react_1.default.createElement(react_native_1.Pressable, { onPress: () => setMenuOpen(false), className: "mt-5 py-3.5 rounded-xl border border-slate-200 items-center min-h-[44]", style: ({ pressed }) => ({ opacity: pressed ? 0.7 : 1 }) },
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.body }, "Cancel"))))),
        react_1.default.createElement(react_native_1.Modal, { visible: addOpen, transparent: true, animationType: "slide" },
            react_1.default.createElement(react_native_1.KeyboardAvoidingView, { behavior: react_native_1.Platform.OS === "ios" ? "padding" : "height", className: "flex-1 justify-end" },
                react_1.default.createElement(react_native_1.Pressable, { className: "absolute inset-0 bg-black/50", onPress: () => setAddOpen(false) }),
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[90%]" },
                    react_1.default.createElement(react_native_1.View, { className: "w-10 h-1 rounded-full bg-slate-200 self-center mb-4" }),
                    react_1.default.createElement(react_native_1.ScrollView, { showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: "handled" },
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.pageTitle + " mb-4" }, "Add Customer"),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label + " mb-1" }, "Name *"),
                        react_1.default.createElement(react_native_1.TextInput, { value: newName, onChangeText: setNewName, placeholder: "e.g. Ramesh Kumar", className: "border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3", placeholderTextColor: "#94a3b8" }),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label + " mb-1" }, "Phone"),
                        react_1.default.createElement(react_native_1.TextInput, { value: newPhone, onChangeText: setNewPhone, placeholder: "10-digit mobile", keyboardType: "phone-pad", className: "border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3", placeholderTextColor: "#94a3b8" }),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label + " mb-1" }, "Email"),
                        react_1.default.createElement(react_native_1.TextInput, { value: newEmail, onChangeText: setNewEmail, placeholder: "email@example.com", keyboardType: "email-address", className: "border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3", placeholderTextColor: "#94a3b8" }),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label + " mb-1" }, "Nickname"),
                        react_1.default.createElement(react_native_1.TextInput, { value: newNickname, onChangeText: setNewNickname, placeholder: "e.g. Ramesh bhai", className: "border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3", placeholderTextColor: "#94a3b8" }),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label + " mb-1" }, "Landmark / Area"),
                        react_1.default.createElement(react_native_1.TextInput, { value: newLandmark, onChangeText: setNewLandmark, placeholder: "e.g. near Rajiv Chowk", className: "border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3", placeholderTextColor: "#94a3b8" }),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label + " mb-1" }, "Opening Balance \u20B9"),
                        react_1.default.createElement(react_native_1.TextInput, { value: newOpeningBal, onChangeText: setNewOpeningBal, placeholder: "0.00", keyboardType: "decimal-pad", className: "border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3", placeholderTextColor: "#94a3b8" }),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label + " mb-1" }, "Credit Limit \u20B9"),
                        react_1.default.createElement(react_native_1.TextInput, { value: newCreditLimit, onChangeText: setNewCreditLimit, placeholder: "No limit", keyboardType: "decimal-pad", className: "border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3", placeholderTextColor: "#94a3b8" }),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label + " mb-1" }, "Notes"),
                        react_1.default.createElement(react_native_1.TextInput, { value: newNotes, onChangeText: setNewNotes, placeholder: "Any notes\u2026", multiline: true, className: "border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800 min-h-[60px] mb-3", placeholderTextColor: "#94a3b8" }),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label + " mb-2" }, "Tags"),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-2 mb-4" }, CUSTOMER_TAGS.map((tag) => {
                            const active = newTags.includes(tag);
                            return (react_1.default.createElement(react_native_1.Pressable, { key: tag, onPress: () => toggleTag(tag), className: `rounded-full border px-4 py-2 min-h-[36] items-center justify-center ${active ? "border-primary bg-primary/10" : "border-slate-200 bg-slate-50"}`, style: ({ pressed }) => ({ opacity: pressed ? 0.8 : 1 }) },
                                react_1.default.createElement(react_native_1.Text, { className: `text-xs font-semibold ${active ? "text-primary" : "text-slate-500"}` }, tag)));
                        })),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2" },
                            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setAddOpen(false), className: "flex-1 border border-slate-200 rounded-xl py-3 items-center" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-600" }, "Cancel")),
                            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleAdd, disabled: !newName.trim() || createMutation.isPending, className: `flex-1 rounded-xl py-3 items-center ${newName.trim() && !createMutation.isPending ? "bg-primary" : "bg-slate-300"}` }, createMutation.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff", size: "small" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-white" }, "Add Customer"))))))))));
}
//# sourceMappingURL=PartiesScreen.js.map