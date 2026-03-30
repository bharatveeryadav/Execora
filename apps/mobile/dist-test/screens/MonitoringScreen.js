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
exports.MonitoringScreen = MonitoringScreen;
/**
 * MonitoringScreen — Store monitoring dashboard (Sprint 14).
 * KPI bar, hourly chart, activity feed, cash reconciliation, employee cards, camera.
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const vector_icons_1 = require("@expo/vector-icons");
const expo_camera_1 = require("expo-camera");
const api_1 = require("../lib/api");
const utils_1 = require("../lib/utils");
const Chip_1 = require("../components/ui/Chip");
const ErrorCard_1 = require("../components/ui/ErrorCard");
const haptics_1 = require("../lib/haptics");
function getTodayRange() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return {
        from: from.toISOString(),
        to: now.toISOString(),
    };
}
function MonitoringScreen() {
    const qc = (0, react_query_1.useQueryClient)();
    const [tab, setTab] = (0, react_1.useState)("dashboard");
    const [showCashModal, setShowCashModal] = (0, react_1.useState)(false);
    const [cashActual, setCashActual] = (0, react_1.useState)("");
    const [cashExpected, setCashExpected] = (0, react_1.useState)("");
    const [cashNote, setCashNote] = (0, react_1.useState)("");
    const [showDrawerLog, setShowDrawerLog] = (0, react_1.useState)(false);
    const { from, to } = getTodayRange();
    const { data: stats, isFetching: statsLoading, isError: statsError, refetch: refetchStats } = (0, react_query_1.useQuery)({
        queryKey: ["monitoring-stats", from, to],
        queryFn: () => api_1.monitoringApi.getStats({ from, to }),
        staleTime: 10_000,
        refetchInterval: 30_000,
    });
    const { data: summary } = (0, react_query_1.useQuery)({
        queryKey: ["summary-daily-monitoring"],
        queryFn: () => api_1.summaryApi.daily(new Date().toISOString().slice(0, 10)),
        staleTime: 30_000,
    });
    const { data: eventsData, isFetching: eventsLoading, refetch: refetchEvents } = (0, react_query_1.useQuery)({
        queryKey: ["monitoring-events", tab],
        queryFn: () => api_1.monitoringApi.getEvents({
            limit: 50,
            unreadOnly: tab === "alerts",
        }),
        staleTime: 5_000,
        refetchInterval: tab === "activity" || tab === "alerts" ? 10_000 : false,
    });
    const { data: unreadData, refetch: refetchUnread } = (0, react_query_1.useQuery)({
        queryKey: ["monitoring-unread"],
        queryFn: () => api_1.monitoringApi.getUnreadCount(),
        staleTime: 5_000,
        refetchInterval: 15_000,
    });
    const markAllRead = (0, react_query_1.useMutation)({
        mutationFn: () => api_1.monitoringApi.markAllRead(),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["monitoring-unread", "monitoring-events"] });
        },
    });
    const markRead = (0, react_query_1.useMutation)({
        mutationFn: (id) => api_1.monitoringApi.markRead(id),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["monitoring-unread", "monitoring-events"] });
        },
    });
    const logEvent = (0, react_query_1.useMutation)({
        mutationFn: (desc) => api_1.monitoringApi.logEvent({
            eventType: "drawer.opened",
            entityType: "manual",
            entityId: "mobile",
            description: desc,
        }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["monitoring-events"] });
            setShowDrawerLog(false);
        },
    });
    const submitCash = (0, react_query_1.useMutation)({
        mutationFn: () => {
            const date = new Date().toISOString().slice(0, 10);
            const actual = parseFloat(cashActual) || 0;
            const expected = parseFloat(cashExpected) || 0;
            return api_1.monitoringApi.submitCashReconciliation({ date, actual, expected, note: cashNote });
        },
        onSuccess: () => {
            (0, haptics_1.hapticLight)();
            setShowCashModal(false);
            setCashActual("");
            setCashExpected("");
            setCashNote("");
            void qc.invalidateQueries({ queryKey: ["monitoring-stats", "monitoring-events"] });
        },
        onError: (err) => (0, alerts_1.showAlert)("Error", err.message),
    });
    const refetch = () => {
        refetchStats();
        refetchEvents();
        refetchUnread();
    };
    const events = eventsData?.events ?? [];
    const unreadCount = unreadData?.count ?? 0;
    const billCount = stats?.billCount ?? 0;
    const totalSales = summary?.summary?.totalSales ?? stats?.totalBillAmount ?? 0;
    const footfall = stats?.footfall ?? 0;
    const conversionRate = stats?.conversionRate ?? 0;
    const hourlyBills = stats?.hourlyBills ?? {};
    const peakHour = stats?.peakHour ?? null;
    const byEmployee = stats?.byEmployee ?? {};
    const maxHourly = Math.max(1, ...Object.values(hourlyBills).map(Number));
    if (statsError) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-background" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 justify-center px-4" },
                react_1.default.createElement(ErrorCard_1.ErrorCard, { message: "Store monitoring requires owner or admin role", onRetry: () => refetch() }))));
    }
    const isCameraTab = tab === "camera";
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: `flex-1 ${isCameraTab ? "bg-black" : "bg-background"}`, edges: ["top", "bottom"] },
        isCameraTab ? (react_1.default.createElement(react_1.default.Fragment, null,
            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between px-4 py-3 bg-black/80" },
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setTab("dashboard") },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "arrow-back", size: 24, color: "#fff" })),
                react_1.default.createElement(react_native_1.Text, { className: "text-white font-bold" }, "Camera"),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowDrawerLog(true), className: "bg-primary px-4 py-2 rounded-lg" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold text-sm" }, "Log Drawer"))),
            react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                react_1.default.createElement(expo_camera_1.CameraView, { style: { flex: 1 }, facing: "back" })),
            react_1.default.createElement(react_native_1.Modal, { visible: showDrawerLog, transparent: true, animationType: "fade" },
                react_1.default.createElement(react_native_1.View, { className: "flex-1 bg-black/50 justify-center px-4" },
                    react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl p-4" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold mb-2" }, "Log Drawer Opened"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-slate-600 text-sm mb-4" }, "Record that the cash drawer was opened (e.g. for no-ring sale check)."),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => logEvent.mutate("Cash drawer opened — manual log from mobile"), disabled: logEvent.isPending, className: "bg-primary py-3 rounded-xl items-center" }, logEvent.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, "Log Event"))),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowDrawerLog(false), className: "mt-2 py-2 items-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-slate-500" }, "Cancel"))))))) : (react_1.default.createElement(react_1.default.Fragment, null,
            react_1.default.createElement(react_native_1.View, { className: "px-4 pt-4 pb-3 border-b border-slate-200 bg-card" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-3" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-xl font-bold tracking-tight text-slate-800" }, "Store Monitor"),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => refetch(), disabled: statsLoading },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "refresh", size: 22, color: statsLoading ? "#94a3b8" : "#64748b" }))),
                react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2" },
                    react_1.default.createElement(Chip_1.Chip, { label: "Dashboard", selected: tab === "dashboard", onPress: () => setTab("dashboard") }),
                    react_1.default.createElement(Chip_1.Chip, { label: "Activity", selected: tab === "activity", onPress: () => setTab("activity") }),
                    react_1.default.createElement(Chip_1.Chip, { label: `Alerts ${unreadCount > 0 ? `(${unreadCount})` : ""}`, selected: tab === "alerts", onPress: () => setTab("alerts") }),
                    react_1.default.createElement(Chip_1.Chip, { label: "Camera", selected: isCameraTab, onPress: () => setTab("camera") }))),
            react_1.default.createElement(react_native_1.ScrollView, { refreshControl: react_1.default.createElement(react_native_1.RefreshControl, { refreshing: statsLoading || eventsLoading, onRefresh: refetch }), contentContainerStyle: { padding: 16, paddingBottom: 32 } },
                tab === "dashboard" && (react_1.default.createElement(react_1.default.Fragment, null,
                    react_1.default.createElement(react_native_1.View, { className: "flex-row flex-wrap gap-2 mb-4" },
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-[140px] bg-primary/10 p-3 rounded-xl border border-primary/20" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-600" }, "Bills"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-primary" }, billCount)),
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-[140px] bg-emerald-50 p-3 rounded-xl border border-emerald-100" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-600" }, "Sales"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-emerald-700" }, (0, utils_1.formatCurrency)(totalSales))),
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-[140px] bg-amber-50 p-3 rounded-xl border border-amber-100" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-600" }, "Footfall"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-amber-700" }, footfall)),
                        react_1.default.createElement(react_native_1.View, { className: "flex-1 min-w-[140px] bg-blue-50 p-3 rounded-xl border border-blue-100" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-600" }, "Conversion"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-blue-700" },
                                conversionRate,
                                "%")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setTab("alerts"), className: "flex-1 min-w-[140px] bg-red-50 p-3 rounded-xl border border-red-100" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-600" }, "Alerts"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-red-700" }, unreadCount))),
                    react_1.default.createElement(react_native_1.View, { className: "mb-4" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-700 mb-2" }, "Bills by hour"),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row items-end h-24 gap-0.5" }, Array.from({ length: 24 }, (_, h) => {
                            const count = hourlyBills[String(h)] ?? 0;
                            const height = maxHourly > 0 ? (count / maxHourly) * 80 : 0;
                            const isPeak = peakHour === h && count > 0;
                            return (react_1.default.createElement(react_native_1.View, { key: h, className: "flex-1 items-center" },
                                react_1.default.createElement(react_native_1.View, { className: `w-full rounded-t ${isPeak ? "bg-primary" : "bg-slate-300"}`, style: { height: Math.max(height, 2) } }),
                                react_1.default.createElement(react_native_1.Text, { className: "text-[8px] text-slate-400 mt-0.5" }, h)));
                        }))),
                    Object.keys(byEmployee).length > 0 && (react_1.default.createElement(react_native_1.View, { className: "mb-4" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-700 mb-2" }, "Employees"),
                        react_1.default.createElement(react_native_1.View, { className: "gap-2" }, Object.entries(byEmployee).map(([userId, emp]) => {
                            const cancelRate = emp.bills > 0 ? (emp.cancellations / emp.bills) * 100 : 0;
                            const badge = cancelRate > 10 ? "Alert" : cancelRate > 5 ? "Watch" : "OK";
                            const badgeColor = badge === "Alert" ? "bg-red-100" : badge === "Watch" ? "bg-amber-100" : "bg-green-100";
                            const textColor = badge === "Alert" ? "text-red-700" : badge === "Watch" ? "text-amber-700" : "text-green-700";
                            return (react_1.default.createElement(react_native_1.View, { key: userId, className: "rounded-xl border border-slate-200 bg-card p-3" },
                                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-1" },
                                    react_1.default.createElement(react_native_1.Text, { className: "font-medium text-slate-800" },
                                        "User ",
                                        userId.slice(0, 8)),
                                    react_1.default.createElement(react_native_1.View, { className: `px-2 py-0.5 rounded-full ${badgeColor}` },
                                        react_1.default.createElement(react_native_1.Text, { className: `text-[10px] font-semibold ${textColor}` }, badge))),
                                react_1.default.createElement(react_native_1.View, { className: "h-2 bg-slate-100 rounded-full overflow-hidden mb-1" },
                                    react_1.default.createElement(react_native_1.View, { className: `h-full ${cancelRate > 10 ? "bg-red-500" : cancelRate > 5 ? "bg-amber-500" : "bg-green-500"}`, style: { width: `${Math.min(cancelRate, 100)}%` } })),
                                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" },
                                    "Bills: ",
                                    emp.bills,
                                    " \u00B7 Cancels: ",
                                    emp.cancellations,
                                    " \u00B7 Cancel rate: ",
                                    cancelRate.toFixed(1),
                                    "%")));
                        })))),
                    react_1.default.createElement(react_native_1.View, { className: "rounded-xl border border-slate-200 bg-card p-4" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-700 mb-2" }, "EOD Cash Reconciliation"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mb-3" }, "Record actual cash count vs expected at end of day."),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowCashModal(true), className: "bg-primary py-3 rounded-xl items-center" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, "Submit Cash Count"))))),
                (tab === "activity" || tab === "alerts") && (react_1.default.createElement(react_native_1.View, { className: "mb-4" },
                    tab === "alerts" && unreadCount > 0 && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => markAllRead.mutate(), className: "mb-3 bg-slate-100 py-2 px-4 rounded-lg self-start" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-700" }, "Mark all read"))),
                    events.length === 0 ? (react_1.default.createElement(react_native_1.Text, { className: "text-slate-500 text-center py-8" }, "No events")) : (react_1.default.createElement(react_native_1.View, { className: "gap-2" }, events.map((e) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: e.id, onPress: () => e.severity !== "info" && markRead.mutate(e.id), className: `rounded-xl border p-3 ${e.severity === "alert" ? "border-red-200 bg-red-50" : e.severity === "warning" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-card"} ${!e.isRead ? "border-l-4 border-l-primary" : ""}` },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800" }, e.description),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mt-1" },
                            e.eventType,
                            " \u00B7 ",
                            new Date(e.createdAt).toLocaleString("en-IN"),
                            e.user?.name ? ` · ${e.user.name}` : ""))))))))))),
        react_1.default.createElement(react_native_1.Modal, { visible: showCashModal, transparent: true, animationType: "fade" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 bg-black/50 justify-center px-4" },
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-2xl p-4" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold mb-3" }, "EOD Cash Count"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600 mb-2" }, "Expected (\u20B9)"),
                    react_1.default.createElement(react_native_1.TextInput, { value: cashExpected, onChangeText: setCashExpected, placeholder: "0", keyboardType: "numeric", className: "border border-slate-200 rounded-lg px-3 py-2 mb-3" }),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600 mb-2" }, "Actual count (\u20B9)"),
                    react_1.default.createElement(react_native_1.TextInput, { value: cashActual, onChangeText: setCashActual, placeholder: "0", keyboardType: "numeric", className: "border border-slate-200 rounded-lg px-3 py-2 mb-3" }),
                    react_1.default.createElement(react_native_1.TextInput, { value: cashNote, onChangeText: setCashNote, placeholder: "Note (optional)", className: "border border-slate-200 rounded-lg px-3 py-2 mb-4" }),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => submitCash.mutate(), disabled: submitCash.isPending || !cashActual || !cashExpected, className: "bg-primary py-3 rounded-xl items-center mb-2" }, submitCash.isPending ? react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff" }) : react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, "Submit")),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowCashModal(false), className: "py-2 items-center" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-slate-500" }, "Cancel")))))));
}
//# sourceMappingURL=MonitoringScreen.js.map