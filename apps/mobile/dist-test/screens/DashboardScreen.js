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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardScreen = DashboardScreen;
/**
 * DashboardScreen — Full parity with web Index.tsx.
 * Order: Greeting → BusinessHealthScore → AiAgentFeed → QuickActions → KPICards → RecentActivity → LowStock → ExpiryAlert
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const datetimepicker_1 = __importDefault(require("@react-native-community/datetimepicker"));
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const vector_icons_1 = require("@expo/vector-icons");
const api_1 = require("../lib/api");
const useWsInvalidation_1 = require("../hooks/useWsInvalidation");
const useResponsive_1 = require("../hooks/useResponsive");
const AuthContext_1 = require("../contexts/AuthContext");
const useWS_1 = require("../hooks/useWS");
const ws_1 = require("../lib/ws");
const Card_1 = require("../components/ui/Card");
const Skeleton_1 = require("../components/ui/Skeleton");
const TabBar_1 = require("../components/composites/TabBar");
const QuickActionsSection_1 = require("../components/dashboard/QuickActionsSection");
const RecentActivitySection_1 = require("../components/dashboard/RecentActivitySection");
const alerts_1 = require("../lib/alerts");
const constants_1 = require("../lib/constants");
const utils_1 = require("../lib/utils");
const typography_1 = require("../lib/typography");
const ACTION_COLORS = {
    primary: "#e67e22",
    secondary: "#3d7a9e",
    success: "#1a9248",
    warning: "#e6a319",
};
const QUICK_ACTIONS = [
    {
        label: "Quick Sale",
        icon: "flash-outline",
        primary: true,
        route: "BillingForm",
        color: "#ffffff",
        params: { startAsWalkIn: true },
    },
    {
        label: "Invoices",
        icon: "document-text-outline",
        primary: false,
        route: "InvoicesTab",
        color: ACTION_COLORS.primary,
    },
    {
        label: "New Invoice",
        icon: "add-circle-outline",
        primary: false,
        route: "BillingForm",
        color: ACTION_COLORS.primary,
        params: { startAsWalkIn: false },
    },
    {
        label: "Insights",
        icon: "stats-chart-outline",
        primary: false,
        route: "Reports",
        color: ACTION_COLORS.secondary,
    },
    {
        label: "Invoice Templates",
        icon: "layers-outline",
        primary: false,
        route: "DocumentTemplates",
        color: ACTION_COLORS.secondary,
    },
    {
        label: "Pro forma",
        icon: "document-outline",
        primary: false,
        route: "InvoicesTab",
        color: ACTION_COLORS.primary,
    },
    {
        label: "Purchase Order",
        icon: "bag-handle-outline",
        primary: false,
        route: "PurchaseOrders",
        color: ACTION_COLORS.secondary,
    },
    {
        label: "Credit Note",
        icon: "receipt-outline",
        primary: false,
        route: "CreditNotes",
        color: ACTION_COLORS.primary,
    },
    {
        label: "Quotation",
        icon: "clipboard-outline",
        primary: false,
        route: "InvoicesTab",
        color: ACTION_COLORS.primary,
    },
    {
        label: "Delivery Challan",
        icon: "car-outline",
        primary: false,
        route: "DeliveryChallans",
        color: ACTION_COLORS.secondary,
    },
    {
        label: "Payment",
        icon: "card-outline",
        primary: false,
        route: "Payment",
        color: ACTION_COLORS.success,
    },
    {
        label: "Stock",
        icon: "cube-outline",
        primary: false,
        route: "Items",
        color: ACTION_COLORS.secondary,
    },
    {
        label: "Parties",
        icon: "people-outline",
        primary: false,
        route: "CustomersTab",
        color: ACTION_COLORS.secondary,
    },
    {
        label: "Expenses",
        icon: "cart-outline",
        primary: false,
        route: "Expenses",
        color: ACTION_COLORS.warning,
    },
    {
        label: "Reports",
        icon: "bar-chart-outline",
        primary: false,
        route: "Reports",
        color: ACTION_COLORS.secondary,
    },
];
const ADD_TRANSACTION_GROUPS = [
    {
        label: "Sales",
        color: ACTION_COLORS.primary,
        icon: "receipt-outline",
        actions: [
            { label: "Sales Payment", icon: "card-outline", route: "Payment" },
            {
                label: "Sales Return",
                icon: "return-up-back-outline",
                route: "CreditNotes",
            },
            {
                label: "Delivery Challan",
                icon: "car-outline",
                route: "DeliveryChallans",
            },
            {
                label: "Estimate / Quotation",
                icon: "clipboard-outline",
                route: "InvoicesTab",
            },
            {
                label: "Proforma Invoice",
                icon: "document-outline",
                route: "InvoicesTab",
            },
            { label: "Sales Order", icon: "reader-outline", route: "SalesOrders" },
        ],
    },
    {
        label: "Purchase",
        color: ACTION_COLORS.secondary,
        icon: "bag-handle-outline",
        actions: [
            { label: "Purchase", icon: "cube-outline", route: "Purchases" },
            {
                label: "Purchase Payment Out",
                icon: "wallet-outline",
                route: "PurchasePaymentOut",
            },
            {
                label: "Purchase Return",
                icon: "return-down-back-outline",
                route: "PurchaseReturn",
            },
            {
                label: "Purchase Order",
                icon: "bag-handle-outline",
                route: "PurchaseOrders",
            },
        ],
    },
    {
        label: "Other Transactions",
        color: ACTION_COLORS.warning,
        icon: "cart-outline",
        actions: [{ label: "Expense", icon: "cart-outline", route: "Expenses" }],
    },
];
const ADD_TRANSACTION_ROUTES = new Set(ADD_TRANSACTION_GROUPS.flatMap((group) => group.actions.map((action) => action.route)));
const ADD_TRANSACTION_LABEL_ALIASES = new Set([
    "pro forma",
    "quotation",
    "credit note",
    "payment",
    "delivery challan",
    "purchase order",
    "expenses",
]);
const QUICK_ACTIONS_FOR_GRID = QUICK_ACTIONS.filter((action) => {
    const label = action.label.trim().toLowerCase();
    if (ADD_TRANSACTION_LABEL_ALIASES.has(label))
        return false;
    if (ADD_TRANSACTION_ROUTES.has(action.route) &&
        action.route !== "InvoicesTab" &&
        action.route !== "BillingForm") {
        return false;
    }
    return true;
});
// Command sets by category (matches web AiAgentFeed)
const COMMAND_SETS = [
    {
        category: "Sales",
        icon: "receipt-outline",
        items: [
            "Ramesh ka invoice banao 3 rice 50kg",
            "Suresh ko 3 bag diya 1200 ka",
            "Invoice print karo",
        ],
    },
    {
        category: "Payment",
        icon: "wallet-outline",
        items: [
            "Ramesh ne 500 diya",
            "Sita ka payment 2000 record karo",
            "Aaj kitna collection hua?",
        ],
    },
    {
        category: "Stock",
        icon: "cube-outline",
        items: [
            "Rice kitna bacha?",
            "Atta ka stock low hai",
            "Sugar 100kg add karo",
        ],
    },
    {
        category: "Customers",
        icon: "people-outline",
        items: [
            "Ramesh ka balance batao",
            "Suresh ka udhar kitna hai?",
            "Naya customer Mohan add karo",
        ],
    },
    {
        category: "Reports",
        icon: "bar-chart-outline",
        items: [
            "Aaj ki sale kitni hui?",
            "Is hafte ka report dikhao",
            "GSTR-1 download karo",
        ],
    },
    {
        category: "Misc",
        icon: "ellipsis-horizontal",
        items: [
            "Kaunse customers ka pesa aana baaki hai?",
            "Low stock alert dikhao",
            "Business health kaisi hai?",
        ],
    },
];
function useSecondsAgo(ts) {
    const [secs, setSecs] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        const t = setInterval(() => setSecs(Math.round((Date.now() - ts) / 1000)), 1000);
        return () => clearInterval(t);
    }, [ts]);
    return secs;
}
function daysUntil(dateStr) {
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}
function daysLabel(days) {
    if (days <= 0)
        return "EXPIRED";
    if (days === 1)
        return "1d left";
    return `${days}d left`;
}
function reminderPillStyle(days) {
    if (days <= 3)
        return { borderColor: "#fecaca", backgroundColor: "#fef2f2" };
    if (days <= 5)
        return { borderColor: "#fde68a", backgroundColor: "#fffbeb" };
    return { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" };
}
const SECTION_GAP = 16;
function getActionColumns(width) {
    if (width < 340)
        return 2;
    if (width < 420)
        return 3;
    return 4;
}
function getActionTileWidth(width, columns, gap = 8) {
    return Math.floor((width - gap * (columns - 1)) / columns);
}
function chunkItems(items, perRow) {
    const rows = [];
    for (let i = 0; i < items.length; i += perRow) {
        rows.push(items.slice(i, i + perRow));
    }
    return rows;
}
const PERIOD_LABELS = {
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This Week",
    lastWeek: "Last Week",
    thisMonth: "This Month",
    lastMonth: "Last Month",
    halfYearly: "Half Yearly",
    thisYear: "This Year",
    lastYear: "Last Year",
    year: "Year",
    pastYears: "Past Years",
    custom: "Custom",
};
const PERIOD_MODAL_OPTIONS = [
    "today",
    "yesterday",
    "thisWeek",
    "lastWeek",
    "thisMonth",
    "lastMonth",
    "halfYearly",
    "thisYear",
    "lastYear",
];
const SELECTABLE_YEAR_COUNT = 5;
function getPeriodRange(key, customFrom, customTo, year) {
    const now = new Date();
    const pad = (d) => d.toISOString().slice(0, 10);
    if (key === "today") {
        return { from: pad(now), to: pad(now), useDaily: true };
    }
    if (key === "yesterday") {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return { from: pad(y), to: pad(y), useDaily: true, date: pad(y) };
    }
    if (key === "custom" && customFrom && customTo) {
        return { from: pad(customFrom), to: pad(customTo), useDaily: false };
    }
    if (key === "year" && year) {
        const from = new Date(year, 0, 1);
        const to = new Date(year, 11, 31);
        return { from: pad(from), to: pad(to), useDaily: false };
    }
    let from;
    let to;
    if (key === "thisWeek") {
        const day = now.getDay();
        const mon = new Date(now);
        mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        from = new Date(mon);
        from.setHours(0, 0, 0, 0);
        to = new Date(now);
    }
    else if (key === "lastWeek") {
        const day = now.getDay();
        const mon = new Date(now);
        mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1) - 7);
        from = new Date(mon);
        from.setHours(0, 0, 0, 0);
        to = new Date(mon);
        to.setDate(to.getDate() + 6);
    }
    else if (key === "thisMonth") {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now);
    }
    else if (key === "lastMonth") {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
    }
    else if (key === "halfYearly") {
        to = new Date(now);
        from = new Date(now);
        from.setMonth(from.getMonth() - 6);
    }
    else if (key === "thisYear") {
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now);
    }
    else if (key === "lastYear") {
        from = new Date(now.getFullYear() - 1, 0, 1);
        to = new Date(now.getFullYear() - 1, 11, 31);
    }
    else if (key === "pastYears") {
        from = new Date(now.getFullYear() - 3, 0, 1);
        to = new Date(now.getFullYear() - 1, 11, 31);
    }
    else {
        from = to = new Date(now);
    }
    return { from: pad(from), to: pad(to), useDaily: false };
}
function DashboardScreen({ navigation }) {
    const { contentWidth, contentPad: padding } = (0, useResponsive_1.useResponsive)();
    const quickActionColumns = getActionColumns(contentWidth);
    const quickActionTileWidth = getActionTileWidth(contentWidth, quickActionColumns);
    const compactQuickActionsHeader = contentWidth < 380;
    const compactAddPopup = contentWidth < 360;
    const popupHorizontalPad = compactAddPopup ? 10 : 14;
    const popupGroupPad = compactAddPopup ? 8 : 10;
    const popupGridGap = compactAddPopup ? 6 : 10;
    const popupColumns = 3;
    const popupInnerWidth = Math.max(220, contentWidth - popupHorizontalPad * 2);
    const popupGridWidth = Math.max(180, popupInnerWidth - popupGroupPad * 2);
    const popupTileWidth = getActionTileWidth(popupGridWidth, popupColumns, popupGridGap);
    const popupMaxHeight = contentWidth < 360 ? 440 : 520;
    const [businessHealthExpanded, setBusinessHealthExpanded] = (0, react_1.useState)(true);
    const [numbersPeriod, setNumbersPeriod] = (0, react_1.useState)("today");
    const [customFrom, setCustomFrom] = (0, react_1.useState)(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d;
    });
    const [customTo, setCustomTo] = (0, react_1.useState)(new Date());
    const [selectedYear, setSelectedYear] = (0, react_1.useState)(new Date().getFullYear());
    const [periodModalOpen, setPeriodModalOpen] = (0, react_1.useState)(false);
    const [customDatePicker, setCustomDatePicker] = (0, react_1.useState)(null);
    const qc = (0, react_query_1.useQueryClient)();
    const { user } = (0, AuthContext_1.useAuth)();
    const { isConnected } = (0, useWS_1.useWS)();
    (0, useWsInvalidation_1.useWsInvalidation)([
        "invoices",
        "customers",
        "summary",
        "products",
        "lowStock",
        "reminders",
        "expiringBatches",
    ]);
    const { data: meData } = (0, react_query_1.useQuery)({
        queryKey: ["auth", "me"],
        queryFn: () => api_1.authApi.me(),
        staleTime: 5 * 60_000,
    });
    const meUser = meData?.user;
    const tenant = meUser?.tenant;
    const settings = (tenant?.settings ?? {});
    const businessName = tenant?.legalName ?? tenant?.tradeName ?? tenant?.name ?? "My Business";
    const gstin = tenant?.gstin ?? "";
    const bankName = settings.bankName ?? "";
    const bankAccountNo = settings.bankAccountNo ?? "";
    const bankIfsc = settings.bankIfsc ?? "";
    const bankAccountHolder = settings.bankAccountHolder ?? "";
    const numbersRange = getPeriodRange(numbersPeriod, customFrom, customTo, selectedYear);
    const numbersPeriodLabel = (0, react_1.useMemo)(() => {
        if (numbersPeriod === "custom") {
            return `${numbersRange.from}-${numbersRange.to}`;
        }
        if (numbersPeriod === "year") {
            return String(selectedYear);
        }
        return PERIOD_LABELS[numbersPeriod];
    }, [numbersPeriod, numbersRange.from, numbersRange.to, selectedYear]);
    const selectableYears = (0, react_1.useMemo)(() => Array.from({ length: SELECTABLE_YEAR_COUNT }, (_, i) => new Date().getFullYear() - i), []);
    const closePeriodModal = (0, react_1.useCallback)(() => setPeriodModalOpen(false), []);
    const selectNumbersPeriod = (0, react_1.useCallback)((period) => {
        setNumbersPeriod(period);
        setPeriodModalOpen(false);
    }, []);
    const selectYearPeriod = (0, react_1.useCallback)((year) => {
        setSelectedYear(year);
        setNumbersPeriod("year");
        setPeriodModalOpen(false);
    }, []);
    const { data: summaryDaily, isLoading: isLoadingDaily, dataUpdatedAt: sumDailyAt, } = (0, react_query_1.useQuery)({
        queryKey: ["summary", "daily"],
        queryFn: () => api_1.summaryApi.daily(),
        staleTime: 60_000,
        enabled: numbersRange.useDaily && !numbersRange.date,
    });
    const { data: summaryDailyDate, dataUpdatedAt: sumDailyDateAt } = (0, react_query_1.useQuery)({
        queryKey: ["summary", "daily", numbersRange.date ?? ""],
        queryFn: () => api_1.summaryApi.daily(numbersRange.date),
        staleTime: 60_000,
        enabled: numbersRange.useDaily && !!numbersRange.date,
    });
    const { data: summaryRange, isLoading: isLoadingRange, dataUpdatedAt: sumRangeAt, } = (0, react_query_1.useQuery)({
        queryKey: ["summary", "range", numbersRange.from, numbersRange.to],
        queryFn: () => api_1.summaryApi.range(numbersRange.from, numbersRange.to),
        staleTime: 60_000,
        enabled: !numbersRange.useDaily,
    });
    const summary = numbersRange.useDaily
        ? numbersRange.date
            ? summaryDailyDate
            : summaryDaily
        : summaryRange;
    const isLoadingSummary = numbersRange.useDaily
        ? isLoadingDaily
        : isLoadingRange;
    const sumFetching = isLoadingSummary;
    const sumAt = numbersRange.useDaily
        ? numbersRange.date
            ? sumDailyDateAt
            : sumDailyAt
        : sumRangeAt;
    const { data: invoices, refetch: refetchInvoices, isFetching: loadingInvoices, dataUpdatedAt: invAt, } = (0, react_query_1.useQuery)({
        queryKey: ["invoices", "dashboard"],
        queryFn: () => api_1.invoiceApi.list(1, 20),
        staleTime: 60_000,
    });
    const { data: customersData, isFetching: custFetching, dataUpdatedAt: custAt, } = (0, react_query_1.useQuery)({
        queryKey: ["customers", "health"],
        queryFn: () => api_1.customerApi.list(1, 200),
        staleTime: 60_000,
    });
    const { data: lowStockData, isLoading: loadingLowStock, isFetching: stockFetching, dataUpdatedAt: stockAt, } = (0, react_query_1.useQuery)({
        queryKey: ["products", "low-stock"],
        queryFn: () => api_1.productExtApi.lowStock(),
        staleTime: 60_000,
    });
    const { data: remindersData } = (0, react_query_1.useQuery)({
        queryKey: ["reminders"],
        queryFn: () => api_1.reminderApi.list(),
        staleTime: 60_000,
    });
    const { data: expiringData } = (0, react_query_1.useQuery)({
        queryKey: ["expiringBatches", 30],
        queryFn: () => api_1.productExtApi.expiringBatches(30),
        staleTime: 300_000,
    });
    const refreshing = loadingInvoices;
    const healthRefreshing = sumFetching || custFetching || stockFetching;
    const todayInvoices = invoices?.invoices ?? [];
    const totalToday = summary?.summary?.totalSales ??
        todayInvoices.reduce((s, i) => s + (i.total ?? 0), 0);
    const dailySummary = summary?.summary;
    const lowStock = lowStockData?.products ?? [];
    const batches = expiringData?.batches ?? [];
    const customers = customersData?.customers ?? [];
    const reminders = (remindersData?.reminders ?? []);
    const collectionRate = dailySummary && dailySummary.totalSales > 0
        ? Math.min(100, Math.round((dailySummary.totalPayments / dailySummary.totalSales) * 100))
        : 0;
    const overdueCount = customers.filter((c) => parseFloat(String(c.balance ?? 0)) > 0).length;
    const stockScore = Math.max(0, 100 - lowStock.length * 15);
    const overdueScore = Math.max(0, 100 - overdueCount * 10);
    const overall = Math.round((collectionRate + stockScore + overdueScore) / 3);
    const overallColor = overall >= 70 ? "#1a9248" : overall >= 50 ? "#e6a319" : "#dc2626";
    const overallLabel = overall >= 70 ? "Good" : overall >= 50 ? "Under Target" : "Critical";
    const upcomingReminders = reminders
        .filter((r) => r.status === "pending")
        .sort((a, b) => new Date(a.scheduledTime).getTime() -
        new Date(b.scheduledTime).getTime())
        .slice(0, 6);
    const overdueList = customers
        .filter((c) => parseFloat(String(c.balance ?? 0)) > 0)
        .sort((a, b) => parseFloat(String(b.balance)) - parseFloat(String(a.balance)));
    const lastUpdated = Math.max(sumAt ?? 0, invAt ?? 0, custAt ?? 0, stockAt ?? 0) || Date.now();
    const secsAgo = useSecondsAgo(lastUpdated);
    const [flashCollection, setFlashCollection] = (0, react_1.useState)(false);
    const [flashStock, setFlashStock] = (0, react_1.useState)(false);
    const [flashReceivables, setFlashReceivables] = (0, react_1.useState)(false);
    const flashTimers = (0, react_1.useRef)({});
    const [cmdSetIdx, setCmdSetIdx] = (0, react_1.useState)(0);
    const [cmdItemIdx, setCmdItemIdx] = (0, react_1.useState)(0);
    const [businessMenuOpen, setBusinessMenuOpen] = (0, react_1.useState)(false);
    const [quickActionsExpanded, setQuickActionsExpanded] = (0, react_1.useState)(false);
    const [recentActivityHidden, setRecentActivityHidden] = (0, react_1.useState)(false);
    const [quickActionPopupOpen, setQuickActionPopupOpen] = (0, react_1.useState)(false);
    const [expirySelected, setExpirySelected] = (0, react_1.useState)(null);
    const [feed, setFeed] = (0, react_1.useState)([]);
    const feedId = (0, react_1.useRef)(1);
    const addCtaPulse = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const collapsedQuickActionCount = quickActionColumns * 2;
    const canToggleQuickActions = QUICK_ACTIONS_FOR_GRID.length > collapsedQuickActionCount;
    const visibleQuickActions = quickActionsExpanded
        ? QUICK_ACTIONS_FOR_GRID
        : QUICK_ACTIONS_FOR_GRID.slice(0, collapsedQuickActionCount);
    (0, react_1.useEffect)(() => {
        const pulse = react_native_1.Animated.loop(react_native_1.Animated.sequence([
            react_native_1.Animated.timing(addCtaPulse, {
                toValue: 1,
                duration: 900,
                useNativeDriver: true,
            }),
            react_native_1.Animated.timing(addCtaPulse, {
                toValue: 0,
                duration: 900,
                useNativeDriver: true,
            }),
        ]));
        pulse.start();
        return () => pulse.stop();
    }, [addCtaPulse]);
    const addCtaScale = addCtaPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.06],
    });
    const addCtaGlow = addCtaPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.18, 0.35],
    });
    const commandCategoryTabs = (0, react_1.useMemo)(() => COMMAND_SETS.map((set) => ({
        id: set.category,
        label: set.category,
        icon: set.icon,
    })), []);
    (0, react_1.useEffect)(() => {
        const tick = () => {
            setCmdItemIdx((i) => {
                const maxItems = COMMAND_SETS[cmdSetIdx].items.length;
                if (i + 1 >= maxItems) {
                    setCmdSetIdx((s) => (s + 1) % COMMAND_SETS.length);
                    return 0;
                }
                return i + 1;
            });
        };
        const t = setInterval(tick, 4000);
        return () => clearInterval(t);
    }, [cmdSetIdx]);
    (0, react_1.useEffect)(() => {
        const push = (icon, text, subtext) => setFeed((prev) => [
            { id: feedId.current++, icon, text, subtext, at: Date.now() },
            ...prev,
        ].slice(0, 15));
        const offs = [
            ws_1.wsClient.on("invoice:confirmed", (p) => {
                const d = p;
                push("receipt-outline", `Invoice — ${d.customerName ?? "Customer"}`, d.invoiceNo);
                const msg = d.total
                    ? `Invoice confirmed — ₹${parseFloat(String(d.total)).toLocaleString("en-IN")}`
                    : "Invoice confirmed";
                (0, alerts_1.showInfo)(msg);
            }),
            ws_1.wsClient.on("payment:recorded", (p) => {
                const d = p;
                push("wallet-outline", `Payment from ${d.customerName ?? "Customer"}`, d.amount ? (0, utils_1.formatCurrency)(d.amount) : undefined);
                const msg = d.amount
                    ? `Payment recorded — ₹${parseFloat(String(d.amount)).toLocaleString("en-IN")}`
                    : "Payment recorded";
                (0, alerts_1.showInfo)(msg);
            }),
            ws_1.wsClient.on("customer:updated", (p) => {
                const d = p;
                push("person-outline", `Customer updated — ${d.name ?? ""}`);
            }),
            ws_1.wsClient.on("product:updated", (p) => {
                const d = p;
                push("cube-outline", `Stock updated — ${d.name ?? "Product"}`);
            }),
        ];
        return () => offs.forEach((o) => o());
    }, []);
    // Flash pillars on WS events
    const flash = (setter, key) => {
        setter(true);
        if (flashTimers.current[key])
            clearTimeout(flashTimers.current[key]);
        flashTimers.current[key] = setTimeout(() => setter(false), 2000);
    };
    (0, react_1.useEffect)(() => {
        const offs = [
            ws_1.wsClient.on("payment:recorded", () => {
                void qc.invalidateQueries({ queryKey: ["summary"] });
                void qc.invalidateQueries({ queryKey: ["customers"] });
                flash(setFlashCollection, "col");
                flash(setFlashReceivables, "rec");
            }),
            ws_1.wsClient.on("invoice:confirmed", () => {
                void qc.invalidateQueries({ queryKey: ["summary"] });
                void qc.invalidateQueries({ queryKey: ["customers"] });
                flash(setFlashCollection, "col");
            }),
            ws_1.wsClient.on("invoice:draft", () => {
                void qc.invalidateQueries({ queryKey: ["summary"] });
                flash(setFlashCollection, "col");
            }),
            ws_1.wsClient.on("customer:updated", () => {
                void qc.invalidateQueries({ queryKey: ["customers"] });
                flash(setFlashReceivables, "rec");
            }),
            ws_1.wsClient.on("product:updated", () => {
                void qc.invalidateQueries({ queryKey: ["products"] });
                void qc.invalidateQueries({ queryKey: ["products", "low-stock"] });
                flash(setFlashStock, "stk");
            }),
        ];
        return () => offs.forEach((o) => o());
    }, [qc]);
    const navigateInvoicesTab = (0, react_1.useCallback)(() => {
        navigation.navigate("InvoicesTab");
    }, [navigation]);
    const navigateMoreStack = (0, react_1.useCallback)((screen) => {
        navigation.navigate("MoreTab", { screen });
    }, [navigation]);
    const navigateCustomerStack = (0, react_1.useCallback)((screen) => {
        navigation.getParent()?.navigate("CustomersTab", { screen });
    }, [navigation]);
    const navigateInvoiceStack = (0, react_1.useCallback)((screen, params) => {
        navigation.navigate("InvoicesTab", params ? { screen, params } : { screen });
    }, [navigation]);
    const handleQuickAction = (route, params) => {
        if (route === "BillingForm")
            return navigateMoreStack("Billing");
        if (route === "InvoicesTab")
            return navigateInvoicesTab();
        if (route === "Reports")
            return navigateMoreStack("Reports");
        if (route === "DocumentTemplates")
            return navigateMoreStack("DocumentTemplates");
        if (route === "PurchaseOrders")
            return navigateMoreStack("PurchaseOrders");
        if (route === "SalesOrders")
            return navigateMoreStack("SalesOrders");
        if (route === "Purchases")
            return navigateMoreStack("Purchases");
        if (route === "PurchasePaymentOut")
            return navigateMoreStack("PurchasePaymentOut");
        if (route === "PurchaseReturn")
            return navigateMoreStack("PurchaseReturn");
        if (route === "CreditNotes")
            return navigateInvoiceStack("CreditNotes");
        if (route === "DeliveryChallans")
            return navigateMoreStack("DeliveryChallans");
        if (route === "Payment")
            return navigateCustomerStack("Payment");
        if (route === "Items")
            return navigateMoreStack("Items");
        if (route === "CustomersTab")
            return navigation.navigate("CustomersTab");
        if (route === "Expenses")
            return navigateMoreStack("Expenses");
    };
    const currentSet = COMMAND_SETS[cmdSetIdx];
    const currentCmd = currentSet.items[cmdItemIdx];
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-background" },
        react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1", contentContainerStyle: {
                paddingHorizontal: padding,
                paddingBottom: 32,
                paddingTop: SECTION_GAP,
                alignItems: "center",
            }, refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: refreshing, onRefresh: refetchInvoices }) },
            react_1.default.createElement(react_native_1.View, { style: { width: "100%", maxWidth: contentWidth } },
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setBusinessMenuOpen(true), activeOpacity: 0.8, className: "flex-row items-center gap-2 mb-4 py-2" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0 flex-row items-center gap-2" },
                        react_1.default.createElement(react_native_1.View, { className: `h-2 w-2 rounded-full shrink-0 ${isConnected ? "bg-green-500" : "bg-amber-500"}`, style: { opacity: isConnected ? 1 : 0.8 } }),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle, numberOfLines: 1 }, businessName)),
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-down", size: 18, color: "#94a3b8" })),
                react_1.default.createElement(react_native_1.Modal, { visible: businessMenuOpen, transparent: true, animationType: "fade" },
                    react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/50 justify-end", onPress: () => setBusinessMenuOpen(false) },
                        react_1.default.createElement(react_native_1.Pressable, { onPress: (e) => e.stopPropagation(), className: "bg-white rounded-t-2xl p-3 pb-6" },
                            react_1.default.createElement(react_native_1.View, { className: "w-8 h-0.5 rounded-full bg-slate-200 self-center mb-2" }),
                            react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.sectionTitle} mb-2` }, "Select Business"),
                            react_1.default.createElement(react_native_1.View, { className: "rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 mb-4", style: { position: "relative" } },
                                react_1.default.createElement(react_native_1.View, { style: {
                                        position: "absolute",
                                        right: 10,
                                        top: "50%",
                                        marginTop: -9,
                                    } },
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "radio-button-on", size: 18, color: "#e67e22" })),
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center pr-8" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-800 flex-1", numberOfLines: 1 }, businessName)),
                                react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3 mt-1.5" },
                                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                                            setBusinessMenuOpen(false);
                                            navigateMoreStack("CompanyProfile");
                                        }, activeOpacity: 0.7 },
                                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-primary" }, "Edit Company")),
                                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                                            setBusinessMenuOpen(false);
                                            const parts = [businessName];
                                            if (gstin)
                                                parts.push(`GSTIN: ${gstin}`);
                                            if (bankAccountHolder ||
                                                bankName ||
                                                bankAccountNo ||
                                                bankIfsc) {
                                                const bankLines = [];
                                                if (bankAccountHolder)
                                                    bankLines.push(`A/c Holder: ${bankAccountHolder}`);
                                                if (bankName)
                                                    bankLines.push(`Bank: ${bankName}`);
                                                if (bankAccountNo)
                                                    bankLines.push(`A/c No: ${bankAccountNo}`);
                                                if (bankIfsc)
                                                    bankLines.push(`IFSC: ${bankIfsc}`);
                                                if (bankLines.length)
                                                    parts.push("Bank Details:\n" + bankLines.join("\n"));
                                            }
                                            react_native_1.Share.share({
                                                message: parts.join("\n\n"),
                                                title: "Business Details",
                                            });
                                        }, activeOpacity: 0.7 },
                                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-primary" }, "Share")))),
                            react_1.default.createElement(react_native_1.View, { className: "items-center" },
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                                        setBusinessMenuOpen(false);
                                        navigateMoreStack("CompanyProfile");
                                    }, className: "flex-row items-center gap-1.5 py-2.5 px-4 rounded-lg bg-primary/10" },
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "add", size: 18, color: "#e67e22" }),
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-700" }, "Add New Business")))))),
                react_1.default.createElement(react_native_1.TouchableOpacity, { activeOpacity: businessHealthExpanded ? 1 : 0.7, onPress: () => !businessHealthExpanded && setBusinessHealthExpanded(true), style: {
                        borderRadius: 12,
                        borderWidth: flashCollection || flashStock || flashReceivables ? 2 : 1,
                        borderColor: flashCollection || flashStock || flashReceivables
                            ? "#e67e22"
                            : "#e2e8f0",
                        backgroundColor: "#fff",
                        padding: businessHealthExpanded ? 12 : 10,
                        marginBottom: 16,
                    } },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between", style: { gap: 12 } },
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0 flex-row items-center gap-3" },
                            react_1.default.createElement(react_native_1.View, { className: "w-12 h-12 rounded-full items-center justify-center shrink-0", style: {
                                    borderWidth: 3,
                                    borderColor: overallColor,
                                    backgroundColor: "#f8fafc",
                                } },
                                react_1.default.createElement(react_native_1.Text, { className: "text-xs font-bold tabular-nums", style: { color: overallColor } }, overall)),
                            react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1.5" },
                                    react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle }, "Business Health"),
                                    react_1.default.createElement(react_native_1.View, { className: `h-1.5 w-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-slate-400"}` }),
                                    healthRefreshing && (react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: "#e67e22", style: { marginLeft: 4 } }))),
                                react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.label} mt-0.5`, style: { color: overallColor } },
                                    overall,
                                    "/100 \u00B7 ",
                                    overallLabel))),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setBusinessHealthExpanded((e) => !e), hitSlop: { top: 12, bottom: 12, left: 12, right: 12 }, className: "flex-row items-center gap-1 shrink-0" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-primary" },
                                businessHealthExpanded ? "Hide" : "Show",
                                " "),
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: businessHealthExpanded ? "chevron-up" : "chevron-down", size: 16, color: "#e67e22" }))),
                    businessHealthExpanded && (react_1.default.createElement(react_1.default.Fragment, null,
                        react_1.default.createElement(react_native_1.View, { style: {
                                flexDirection: "row",
                                backgroundColor: "#f8fafc",
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: "#e2e8f0",
                                padding: 10,
                                marginTop: 10,
                                marginBottom: 10,
                            } },
                            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: navigateInvoicesTab, style: {
                                    flex: 1,
                                    alignItems: "center",
                                    borderRightWidth: 1,
                                    borderRightColor: "#e2e8f0",
                                }, activeOpacity: 0.7 },
                                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.micro + " text-slate-500", numberOfLines: 1 }, "Bills"),
                                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.labelBold + " text-slate-800" }, dailySummary?.invoiceCount ?? 0)),
                            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: navigateInvoicesTab, style: {
                                    flex: 1,
                                    alignItems: "center",
                                    borderRightWidth: 1,
                                    borderRightColor: "#e2e8f0",
                                }, activeOpacity: 0.7 },
                                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.micro + " text-slate-500", numberOfLines: 1 }, "Sales"),
                                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.microBold + " text-slate-800", numberOfLines: 1 }, (0, utils_1.formatCurrency)(dailySummary?.totalSales ?? 0))),
                            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigateCustomerStack("Payment"), style: {
                                    flex: 1,
                                    alignItems: "center",
                                    borderRightWidth: 1,
                                    borderRightColor: "#e2e8f0",
                                }, activeOpacity: 0.7 },
                                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.micro + " text-slate-500", numberOfLines: 1 }, "Collected"),
                                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.microBold, style: {
                                        color: collectionRate >= 80
                                            ? "#1a9248"
                                            : collectionRate >= 50
                                                ? "#e6a319"
                                                : "#dc2626",
                                    } },
                                    collectionRate,
                                    "%")),
                            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigateCustomerStack("Overdue"), style: { flex: 1, alignItems: "center" }, activeOpacity: 0.7 },
                                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.micro + " text-slate-500", numberOfLines: 1 }, "Pending"),
                                react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.microBold} ${(dailySummary?.pendingAmount ?? 0) > 0 ? "text-amber-600" : "text-green-600"}`, numberOfLines: 1 }, (0, utils_1.formatCurrency)(dailySummary?.pendingAmount ?? 0)))),
                        react_1.default.createElement(react_native_1.View, { className: "h-1 w-full rounded-full bg-slate-200 mb-3" },
                            react_1.default.createElement(react_native_1.View, { className: "h-full rounded-full", style: {
                                    width: `${overall}%`,
                                    backgroundColor: overallColor,
                                } })),
                        react_1.default.createElement(react_native_1.View, { style: {
                                flexDirection: "row",
                                gap: 8,
                                marginBottom: overdueList.length > 0 || upcomingReminders.length > 0
                                    ? 10
                                    : 0,
                            } }, (() => {
                            const scoreColor = (n) => n >= 80 ? "#1a9248" : n >= 50 ? "#e6a319" : "#dc2626";
                            const cardStyle = (flash) => ({
                                flex: 1,
                                minWidth: 0,
                                borderRadius: 10,
                                borderWidth: flash ? 2 : 1,
                                borderColor: flash ? "#e67e22" : "#e2e8f0",
                                backgroundColor: "#f8fafc",
                                padding: 10,
                                minHeight: 58,
                            });
                            return (react_1.default.createElement(react_1.default.Fragment, null,
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigateMoreStack("Items"), activeOpacity: 0.8, style: cardStyle(flashStock) },
                                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-0.5" },
                                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.micro, numberOfLines: 1 }, "Stock"),
                                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.microBold, style: { color: scoreColor(stockScore) } },
                                            stockScore,
                                            "%")),
                                    react_1.default.createElement(react_native_1.View, { className: "h-1 w-full rounded-full bg-slate-200" },
                                        react_1.default.createElement(react_native_1.View, { className: "h-full rounded-full", style: {
                                                width: `${stockScore}%`,
                                                backgroundColor: scoreColor(stockScore),
                                            } })),
                                    react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.micro} text-slate-500 mt-0.5`, numberOfLines: 1 }, lowStock.length === 0
                                        ? "All stocked"
                                        : `${lowStock.length} low`)),
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigateCustomerStack("Overdue"), activeOpacity: 0.8, style: cardStyle(flashReceivables) },
                                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-0.5" },
                                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.micro, numberOfLines: 1 }, "Receivables"),
                                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.microBold, style: { color: scoreColor(overdueScore) } },
                                            overdueScore,
                                            "%")),
                                    react_1.default.createElement(react_native_1.View, { className: "h-1 w-full rounded-full bg-slate-200" },
                                        react_1.default.createElement(react_native_1.View, { className: "h-full rounded-full", style: {
                                                width: `${overdueScore}%`,
                                                backgroundColor: scoreColor(overdueScore),
                                            } })),
                                    react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.micro} text-slate-500 mt-0.5`, numberOfLines: 1 }, overdueCount === 0
                                        ? "All clear"
                                        : `${overdueCount} overdue`))));
                        })()),
                        overdueList.length > 0 && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigateCustomerStack("Overdue"), activeOpacity: 0.9, className: "flex-row flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 mb-2" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1 shrink-0" },
                                react_1.default.createElement(vector_icons_1.Ionicons, { name: "alert-circle", size: 14, color: "#dc2626" }),
                                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.labelBold + " text-red-700" },
                                    "Overdue (",
                                    overdueList.length,
                                    ")")),
                            react_1.default.createElement(react_native_1.View, { className: "rounded-full border border-red-200 bg-red-100 px-2 py-0.5" },
                                react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.label} text-red-700` },
                                    (overdueList[0].name ?? "—").slice(0, 12),
                                    (overdueList[0].name ?? "").length > 12
                                        ? "…"
                                        : "",
                                    " ",
                                    (0, utils_1.formatCurrency)(overdueList[0].balance))),
                            react_1.default.createElement(react_native_1.View, { className: "rounded-full border border-red-300 bg-red-200/50 px-2 py-0.5" },
                                react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.micro} font-semibold text-red-700` },
                                    (0, utils_1.formatCurrency)(overdueList.reduce((s, c) => s + parseFloat(String(c.balance ?? 0)), 0)),
                                    " ",
                                    "total")),
                            react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.caption} ml-auto shrink-0` }, "View All \u2192"))),
                        upcomingReminders.length > 0 && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigateCustomerStack("Overdue"), activeOpacity: 0.9, className: "flex-row flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1" },
                                react_1.default.createElement(vector_icons_1.Ionicons, { name: "time-outline", size: 14, color: "#e67e22" }),
                                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.labelBold + " text-primary" },
                                    "Upcoming (",
                                    upcomingReminders.length,
                                    ")")),
                            upcomingReminders.slice(0, 3).map((r) => {
                                const days = Math.max(0, Math.ceil((new Date(r.scheduledTime).getTime() - Date.now()) /
                                    86400000));
                                const pillStyle = reminderPillStyle(days);
                                const textColor = days <= 3
                                    ? "text-red-700"
                                    : days <= 5
                                        ? "text-amber-700"
                                        : "text-green-700";
                                return (react_1.default.createElement(react_native_1.View, { key: r.id, className: "rounded-full border px-2 py-0.5", style: pillStyle },
                                    react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.label} ${textColor}` },
                                        (r.customer?.name ?? "—").slice(0, 10),
                                        " ",
                                        (0, utils_1.formatCurrency)(r.amount ?? r.notes ?? 0),
                                        " \u00B7",
                                        " ",
                                        days === 0 ? "Today" : `${days}d`)));
                            }),
                            upcomingReminders.length > 3 && (react_1.default.createElement(react_native_1.View, { className: "rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5" },
                                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption },
                                    "+",
                                    upcomingReminders.length - 3,
                                    " more"))),
                            react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.caption} ml-auto` }, "View All \u2192")))))),
                react_1.default.createElement(react_native_1.View, { className: "mb-1.5" },
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setPeriodModalOpen(true), activeOpacity: 0.7, className: "self-start flex-row items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-[11px] font-semibold text-slate-600" }, numbersPeriodLabel),
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-down", size: 12, color: "#64748b" }))),
                react_1.default.createElement(react_native_1.View, { style: {
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 6,
                        marginBottom: 16,
                    } },
                    react_1.default.createElement(Card_1.PressableCard, { onPress: navigateInvoicesTab, style: { width: (contentWidth - 6) / 2 - 3, minWidth: 0 }, className: "shadow-sm py-2 px-2" },
                        react_1.default.createElement(react_native_1.View, { className: "items-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-medium text-slate-500", numberOfLines: 1 }, "Sales"),
                            isLoadingSummary ? (react_1.default.createElement(Skeleton_1.Skeleton, { className: "mt-0.5 h-5 w-16 rounded" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-xs font-bold text-slate-800 mt-0.5", numberOfLines: 1 }, (0, utils_1.formatCurrency)(totalToday))),
                            react_1.default.createElement(react_native_1.Text, { className: "text-[10px] text-slate-500 mt-0.5" },
                                dailySummary?.invoiceCount ?? 0,
                                " bills"))),
                    react_1.default.createElement(Card_1.PressableCard, { onPress: () => navigateCustomerStack("Overdue"), style: { width: (contentWidth - 6) / 2 - 3, minWidth: 0 }, className: "shadow-sm py-2 px-2" },
                        react_1.default.createElement(react_native_1.View, { className: "items-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-medium text-slate-500", numberOfLines: 1 }, "Pending"),
                            isLoadingSummary ? (react_1.default.createElement(Skeleton_1.Skeleton, { className: "mt-0.5 h-5 w-16 rounded" })) : (react_1.default.createElement(react_native_1.Text, { className: `text-xs font-bold mt-0.5 ${(dailySummary?.pendingAmount ?? 0) > 0 ? "text-amber-600" : "text-green-600"}`, numberOfLines: 1 }, (0, utils_1.formatCurrency)(dailySummary?.pendingAmount ?? 0))))),
                    react_1.default.createElement(Card_1.PressableCard, { onPress: () => navigateCustomerStack("Payment"), style: { width: (contentWidth - 6) / 2 - 3, minWidth: 0 }, className: "shadow-sm py-2 px-2" },
                        react_1.default.createElement(react_native_1.View, { className: "items-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-medium text-slate-500", numberOfLines: 1 }, "Collected"),
                            isLoadingSummary ? (react_1.default.createElement(Skeleton_1.Skeleton, { className: "mt-0.5 h-5 w-16 rounded" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-xs font-bold text-green-600 mt-0.5", numberOfLines: 1 }, (0, utils_1.formatCurrency)(dailySummary?.totalPayments ?? 0))))),
                    react_1.default.createElement(Card_1.PressableCard, { onPress: () => navigateMoreStack("Reports"), style: { width: (contentWidth - 6) / 2 - 3, minWidth: 0 }, className: "shadow-sm py-2 px-2" },
                        react_1.default.createElement(react_native_1.View, { className: "items-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-medium text-slate-500", numberOfLines: 1 }, "Rate"),
                            isLoadingSummary ? (react_1.default.createElement(Skeleton_1.Skeleton, { className: "mt-0.5 h-5 w-16 rounded" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-xs font-bold mt-0.5", style: {
                                    color: collectionRate >= 80
                                        ? "#1a9248"
                                        : collectionRate >= 50
                                            ? "#e6a319"
                                            : "#dc2626",
                                } },
                                collectionRate,
                                "%"))))),
                react_1.default.createElement(react_native_1.Modal, { visible: periodModalOpen, transparent: true, animationType: "fade" },
                    react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/50 justify-end", onPress: closePeriodModal },
                        react_1.default.createElement(react_native_1.Pressable, { onPress: (e) => e.stopPropagation(), className: "bg-white rounded-t-2xl p-4 pb-8 max-h-[90%]" },
                            react_1.default.createElement(react_native_1.View, { className: "w-8 h-0.5 rounded-full bg-slate-200 self-center mb-4" }),
                            react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.sectionTitle} mb-3` }, "Select Period"),
                            react_1.default.createElement(react_native_1.ScrollView, { showsVerticalScrollIndicator: false, style: { maxHeight: 400 } },
                                PERIOD_MODAL_OPTIONS.map((k) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: k, onPress: () => selectNumbersPeriod(k), className: `py-2.5 px-3 rounded-lg mb-1 ${numbersPeriod === k ? "bg-primary/10" : ""}` },
                                    react_1.default.createElement(react_native_1.Text, { className: `text-sm font-medium ${numbersPeriod === k ? "text-primary" : "text-slate-700"}` }, PERIOD_LABELS[k])))),
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => selectNumbersPeriod("year"), className: `py-2.5 px-3 rounded-lg mb-1 ${numbersPeriod === "year" ? "bg-primary/10" : ""}` },
                                    react_1.default.createElement(react_native_1.Text, { className: `text-sm font-medium ${numbersPeriod === "year" ? "text-primary" : "text-slate-700"}` },
                                        "Year ",
                                        selectedYear)),
                                react_1.default.createElement(react_native_1.ScrollView, { horizontal: true, showsHorizontalScrollIndicator: false, style: { marginVertical: 8 } }, selectableYears.map((y) => {
                                    return (react_1.default.createElement(react_native_1.TouchableOpacity, { key: y, onPress: () => selectYearPeriod(y), className: `py-2 px-3 rounded-lg mr-2 ${selectedYear === y ? "bg-primary" : "bg-slate-100"}` },
                                        react_1.default.createElement(react_native_1.Text, { className: `text-xs font-semibold ${selectedYear === y ? "text-white" : "text-slate-600"}` }, y)));
                                })),
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => selectNumbersPeriod("pastYears"), className: `py-2.5 px-3 rounded-lg mb-1 ${numbersPeriod === "pastYears" ? "bg-primary/10" : ""}` },
                                    react_1.default.createElement(react_native_1.Text, { className: `text-sm font-medium ${numbersPeriod === "pastYears" ? "text-primary" : "text-slate-700"}` }, PERIOD_LABELS.pastYears)),
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setNumbersPeriod("custom"), className: `py-2.5 px-3 rounded-lg mb-1 ${numbersPeriod === "custom" ? "bg-primary/10" : ""}` },
                                    react_1.default.createElement(react_native_1.Text, { className: `text-sm font-medium ${numbersPeriod === "custom" ? "text-primary" : "text-slate-700"}` }, PERIOD_LABELS.custom)),
                                numbersPeriod === "custom" && (react_1.default.createElement(react_native_1.View, { className: "mt-2 rounded-lg border border-slate-200 p-3" },
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-600 mb-2" }, "From"),
                                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setCustomDatePicker("from"), className: "py-2 border-b border-slate-100" },
                                        react_1.default.createElement(react_native_1.Text, { className: "text-sm" }, customFrom.toLocaleDateString("en-IN", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        }))),
                                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-600 mt-2 mb-2" }, "To"),
                                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setCustomDatePicker("to"), className: "py-2" },
                                        react_1.default.createElement(react_native_1.Text, { className: "text-sm" }, customTo.toLocaleDateString("en-IN", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        }))),
                                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: closePeriodModal, className: "mt-3 bg-primary rounded-lg py-2.5 items-center" },
                                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-white" }, "Apply")))))))),
                customDatePicker && (react_1.default.createElement(datetimepicker_1.default, { value: customDatePicker === "from" ? customFrom : customTo, mode: "date", display: react_native_1.Platform.OS === "ios" ? "spinner" : "default", onChange: (_, d) => {
                        if (d) {
                            if (customDatePicker === "from") {
                                setCustomFrom(d);
                                if (d > customTo)
                                    setCustomTo(d);
                            }
                            else {
                                setCustomTo(d);
                                if (d < customFrom)
                                    setCustomFrom(d);
                            }
                        }
                        setCustomDatePicker(null);
                    } })),
                react_1.default.createElement(react_native_1.View, { className: "rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 mb-4" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-3" },
                        react_1.default.createElement(react_native_1.View, { className: "rounded-full bg-primary/10 p-2" },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "mic", size: 18, color: "#e67e22" })),
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-0" },
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle + " text-primary/80" },
                                currentSet.category,
                                " \u00B7 Say it naturally"),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.body, key: cmdItemIdx },
                                "\u201C",
                                currentCmd,
                                "\u201D")))),
                react_1.default.createElement(TabBar_1.TabBar, { tabs: commandCategoryTabs, activeTab: COMMAND_SETS[cmdSetIdx]?.category ?? "", onChange: (tab) => {
                        const nextIdx = COMMAND_SETS.findIndex((set) => set.category === tab);
                        if (nextIdx >= 0) {
                            setCmdSetIdx(nextIdx);
                            setCmdItemIdx(0);
                        }
                    }, variant: "pills", scrollable: true, className: "mb-3" }),
                feed.length > 0 && (react_1.default.createElement(react_native_1.View, { className: "rounded-xl border border-slate-200 bg-card px-4 py-2 mb-4" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2 border-b border-slate-100 pb-2 mb-2" },
                        react_1.default.createElement(react_native_1.View, { className: `h-1.5 w-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-slate-400"}` }),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle }, "AI Activity Feed")),
                    feed.slice(0, 5).map((item) => (react_1.default.createElement(react_native_1.View, { key: item.id, className: "flex-row items-start gap-2 py-1.5" },
                        item.icon.includes("-") ? (react_1.default.createElement(vector_icons_1.Ionicons, { name: item.icon, size: 20, color: "#64748b" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-base" }, item.icon)),
                        react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.body, numberOfLines: 1 }, item.text),
                            item.subtext && (react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption, numberOfLines: 1 }, item.subtext)))))))),
                react_1.default.createElement(QuickActionsSection_1.QuickActionsSection, { canToggleQuickActions: canToggleQuickActions, quickActionsExpanded: quickActionsExpanded, compactQuickActionsHeader: compactQuickActionsHeader, addCtaScale: addCtaScale, addCtaGlow: addCtaGlow, quickActionTileWidth: quickActionTileWidth, contentWidth: contentWidth, visibleQuickActions: visibleQuickActions, actionPrimaryColor: ACTION_COLORS.primary, onToggleExpand: () => setQuickActionsExpanded((v) => !v), onOpenAddTransaction: () => setQuickActionPopupOpen(true), onQuickAction: handleQuickAction }),
                react_1.default.createElement(RecentActivitySection_1.RecentActivitySection, { recentActivityHidden: recentActivityHidden, compactQuickActionsHeader: compactQuickActionsHeader, secsAgo: secsAgo, todayInvoices: todayInvoices, onToggleHidden: () => setRecentActivityHidden((v) => !v), onRefresh: () => {
                        void refetchInvoices();
                    }, onInvoicePress: (invoiceId) => navigateInvoiceStack("InvoiceDetail", { id: invoiceId }) }),
                !loadingLowStock && lowStock.length > 0 && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigateMoreStack("Items"), activeOpacity: 0.9, className: "flex-row flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 mb-5" },
                    react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.labelBold + " text-amber-700" },
                        lowStock.filter((p) => p.stock === 0).length > 0 ? "🔴" : "⚠️",
                        " ",
                        "Stock Alert (",
                        lowStock.length,
                        "):"),
                    lowStock.slice(0, 5).map((p) => (react_1.default.createElement(react_native_1.View, { key: p.id, className: `rounded-full border px-2 py-0.5 ${p.stock === 0 ? "border-red-300 bg-red-100" : "border-amber-300 bg-amber-100"}` },
                        react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.label} ${p.stock === 0 ? "text-red-700" : "text-amber-700"}` },
                            p.name,
                            " ",
                            p.stock,
                            p.unit ?? "")))),
                    lowStock.length > 5 && (react_1.default.createElement(react_native_1.View, { className: "rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5" },
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption },
                            "+",
                            lowStock.length - 5,
                            " more"))),
                    react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.caption} ml-auto` }, "Manage Inventory \u2192"))),
                batches.length > 0 && (react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5" },
                    react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.labelBold + " text-amber-700" },
                        batches.filter((b) => daysUntil(b.expiryDate) <= 0).length > 0
                            ? "🔴"
                            : "⚠️",
                        " ",
                        "Expiry Alert (",
                        batches.length,
                        "):"),
                    batches.slice(0, 6).map((batch) => {
                        const days = daysUntil(batch.expiryDate);
                        const pillClass = days <= 0
                            ? "border-red-300 bg-red-100"
                            : days <= 7
                                ? "border-red-200 bg-red-50"
                                : "border-amber-300 bg-amber-100";
                        return (react_1.default.createElement(react_native_1.TouchableOpacity, { key: batch.id, onPress: () => setExpirySelected(batch), className: `rounded-full border px-2 py-0.5 ${pillClass}` },
                            react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.label} ${days <= 7 ? "text-red-700" : "text-amber-700"}` },
                                batch.product.name.length > 14
                                    ? batch.product.name.slice(0, 13) + "…"
                                    : batch.product.name,
                                " ",
                                react_1.default.createElement(react_native_1.Text, { className: "opacity-70" }, daysLabel(days)))));
                    }),
                    batches.length > 6 && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigateMoreStack("Expiry"), className: "rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5" },
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption },
                            "+",
                            batches.length - 6,
                            " more"))),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigateMoreStack("Expiry"), className: "ml-auto" },
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption }, "View All \u2192")))))),
        react_1.default.createElement(react_native_1.Modal, { visible: quickActionPopupOpen, transparent: true, animationType: "fade" },
            react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/50 justify-end", onPress: () => setQuickActionPopupOpen(false) },
                react_1.default.createElement(react_native_1.Pressable, { onPress: (e) => e.stopPropagation(), className: "bg-white rounded-t-3xl pt-3 pb-6", style: {
                        width: "100%",
                        maxWidth: contentWidth,
                        alignSelf: "center",
                        paddingHorizontal: popupHorizontalPad,
                    } },
                    react_1.default.createElement(react_native_1.View, { className: "w-8 h-0.5 rounded-full bg-slate-200 self-center mb-2" }),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-3" },
                        react_1.default.createElement(react_native_1.View, { className: "min-w-0 flex-1 pr-2" },
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle }, "Add Transaction"),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.caption, numberOfLines: 1 }, "Quick create for sales, purchase, and expenses")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setQuickActionPopupOpen(false) },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "close", size: 20, color: "#64748b" }))),
                    react_1.default.createElement(react_native_1.ScrollView, { style: { maxHeight: popupMaxHeight }, contentContainerStyle: { paddingBottom: 4 }, showsVerticalScrollIndicator: false }, ADD_TRANSACTION_GROUPS.map((group, groupIndex) => (react_1.default.createElement(react_native_1.View, { key: group.label, style: {
                            paddingTop: groupIndex === 0 ? 0 : 8,
                            marginTop: groupIndex === 0 ? 0 : 10,
                            marginBottom: groupIndex === ADD_TRANSACTION_GROUPS.length - 1 ? 0 : 10,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: "#e2e8f0",
                            backgroundColor: "#f8fafc",
                            paddingHorizontal: popupGroupPad,
                            paddingBottom: compactAddPopup ? 8 : 12,
                        } },
                        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2 mb-2" },
                            react_1.default.createElement(react_native_1.View, { className: "h-6 w-6 rounded-full items-center justify-center", style: { backgroundColor: `${group.color}22` } },
                                react_1.default.createElement(vector_icons_1.Ionicons, { name: group.icon, size: 14, color: group.color })),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.labelBold }, group.label),
                            react_1.default.createElement(react_native_1.View, { className: "ml-auto rounded-full bg-white px-2 py-0.5 border border-slate-200" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-semibold text-slate-500" }, group.actions.length))),
                        react_1.default.createElement(react_native_1.View, { style: { gap: popupGridGap } }, chunkItems(group.actions, popupColumns).map((row, rowIdx) => (react_1.default.createElement(react_native_1.View, { key: `${group.label}-row-${rowIdx}`, style: { flexDirection: "row", gap: popupGridGap } }, row.map((item) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: `popup-${group.label}-${item.label}`, onPress: () => {
                                setQuickActionPopupOpen(false);
                                handleQuickAction(item.route, item.params);
                            }, activeOpacity: 0.85, style: {
                                width: popupTileWidth,
                                minHeight: compactAddPopup
                                    ? constants_1.SIZES.TOUCH_MIN + 14
                                    : constants_1.SIZES.TOUCH_MIN + 18,
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 4,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: "#dbe2ea",
                                backgroundColor: "#ffffff",
                                paddingVertical: compactAddPopup ? 6 : 8,
                                paddingHorizontal: contentWidth < 360 ? 2 : 4,
                            } },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: item.icon, size: compactAddPopup ? 16 : 18, color: group.color }),
                            react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.micro} font-semibold text-center text-slate-600`, numberOfLines: 2 }, item.label))))))))))))))),
        react_1.default.createElement(react_native_1.Modal, { visible: !!expirySelected, transparent: true, animationType: "fade" },
            react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/50 justify-center p-4", onPress: () => setExpirySelected(null) },
                react_1.default.createElement(react_native_1.Pressable, { onPress: (e) => e.stopPropagation(), className: "bg-white rounded-2xl p-4" }, expirySelected && (react_1.default.createElement(react_1.default.Fragment, null,
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2 mb-3" },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "warning", size: 20, color: "#dc2626" }),
                        react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.value }, "Expiry Stock Alert")),
                    react_1.default.createElement(react_native_1.View, { className: `rounded-lg p-3 mb-3 ${daysUntil(expirySelected.expiryDate) <= 7 ? "bg-red-50" : "bg-amber-50"}` },
                        react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.body} font-bold text-center ${daysUntil(expirySelected.expiryDate) <= 7 ? "text-red-700" : "text-amber-700"}` }, daysUntil(expirySelected.expiryDate) <= 0
                            ? "❌ This batch has EXPIRED"
                            : `⚠️ Expiring in ${daysUntil(expirySelected.expiryDate)} day${daysUntil(expirySelected.expiryDate) === 1 ? "" : "s"}!`)),
                    react_1.default.createElement(react_native_1.View, { className: "gap-2 mb-3" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between py-2 border-b border-slate-100" },
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label }, "Product"),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.labelBold }, expirySelected.product.name)),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between py-2 border-b border-slate-100" },
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label }, "Quantity"),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.labelBold },
                                expirySelected.quantity,
                                " ",
                                expirySelected.product.unit)),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row justify-between py-2" },
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.label }, "Expiry Date"),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.labelBold }, new Date(expirySelected.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })))),
                    react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.caption} text-center mb-3` },
                        "Go to ",
                        react_1.default.createElement(react_native_1.Text, { className: "font-semibold" }, "Expiry Tracker"),
                        " to write off or manage this batch."),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => {
                            setExpirySelected(null);
                            navigateMoreStack("Expiry");
                        }, className: "bg-primary rounded-xl py-3 items-center" },
                        react_1.default.createElement(react_native_1.Text, { className: `${typography_1.TYPO.labelBold} text-white` }, "Open Expiry Tracker")))))))));
}
//# sourceMappingURL=DashboardScreen.js.map