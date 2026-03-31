/**
 * DashboardScreen — Full parity with web Index.tsx.
 * Order: Greeting → BusinessHealthScore → AiAgentFeed → QuickActions → KPICards → RecentActivity → LowStock → ExpiryAlert
 */
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
  Animated,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  invoiceApi,
  customerApi,
  summaryApi,
  productExtApi,
  reminderApi,
  authApi,
} from "../../../lib/api";
import { inr } from "@execora/shared";
import { useWsInvalidation } from "../../../hooks/useWsInvalidation";
import { useResponsive } from "../../../hooks/useResponsive";
import { useAuth } from "../../../contexts/AuthContext";
import { useWS } from "../../../hooks/useWS";
import { wsClient } from "../../../lib/ws";
import { PressableCard } from "../../../components/ui/Card";
import { Skeleton } from "../../../components/ui/Skeleton";
import { TabBar, type TabItem } from "../../../components/composites/TabBar";
import {
  QuickActionsSection,
  type QuickActionItem,
} from "../../../components/dashboard/QuickActionsSection";
import { RecentActivitySection } from "../../../components/dashboard/RecentActivitySection";
import { showInfo } from "../../../lib/alerts";
import { SIZES } from "../../../lib/constants";
import { formatCurrency } from "../../../lib/utils";
import { TYPO } from "../../../lib/typography";

const ACTION_COLORS: Record<string, string> = {
  primary: "#e67e22",
  secondary: "#3d7a9e",
  success: "#1a9248",
  warning: "#e6a319",
};

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    label: "Quick Sale",
    icon: "flash-outline",
    primary: true,
    route: "InvoiceForm",
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
    route: "InvoiceForm",
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
    route: "PartiesTab",
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

const ADD_TRANSACTION_GROUPS: Array<{
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  actions: Array<{
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: string;
    params?: Record<string, unknown>;
  }>;
}> = [
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

const ADD_TRANSACTION_ROUTES = new Set(
  ADD_TRANSACTION_GROUPS.flatMap((group) =>
    group.actions.map((action) => action.route),
  ),
);

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
  if (ADD_TRANSACTION_LABEL_ALIASES.has(label)) return false;
  if (
    ADD_TRANSACTION_ROUTES.has(action.route) &&
    action.route !== "InvoicesTab" &&
    action.route !== "InvoiceForm"
  ) {
    return false;
  }
  return true;
});

// Command sets by category (matches web AiAgentFeed)
const COMMAND_SETS: Array<{
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: string[];
}> = [
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

function useSecondsAgo(ts: number) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setSecs(Math.round((Date.now() - ts) / 1000)),
      1000,
    );
    return () => clearInterval(t);
  }, [ts]);
  return secs;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function daysLabel(days: number) {
  if (days <= 0) return "EXPIRED";
  if (days === 1) return "1d left";
  return `${days}d left`;
}

function reminderPillStyle(days: number) {
  if (days <= 3) return { borderColor: "#fecaca", backgroundColor: "#fef2f2" };
  if (days <= 5) return { borderColor: "#fde68a", backgroundColor: "#fffbeb" };
  return { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" };
}

const SECTION_GAP = 16;

function getActionColumns(width: number): number {
  if (width < 340) return 2;
  if (width < 420) return 3;
  return 4;
}

function getActionTileWidth(width: number, columns: number, gap = 8): number {
  return Math.floor((width - gap * (columns - 1)) / columns);
}

function chunkItems<T>(items: T[], perRow: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += perRow) {
    rows.push(items.slice(i, i + perRow));
  }
  return rows;
}

type PeriodKey =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "halfYearly"
  | "thisYear"
  | "lastYear"
  | "year"
  | "pastYears"
  | "custom";

const PERIOD_LABELS: Record<PeriodKey, string> = {
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

const PERIOD_MODAL_OPTIONS: readonly PeriodKey[] = [
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

function getPeriodRange(
  key: PeriodKey,
  customFrom?: Date,
  customTo?: Date,
  year?: number,
): { from: string; to: string; useDaily: boolean; date?: string } {
  const now = new Date();
  const pad = (d: Date) => d.toISOString().slice(0, 10);

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

  let from: Date;
  let to: Date;

  if (key === "thisWeek") {
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    from = new Date(mon);
    from.setHours(0, 0, 0, 0);
    to = new Date(now);
  } else if (key === "lastWeek") {
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1) - 7);
    from = new Date(mon);
    from.setHours(0, 0, 0, 0);
    to = new Date(mon);
    to.setDate(to.getDate() + 6);
  } else if (key === "thisMonth") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now);
  } else if (key === "lastMonth") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (key === "halfYearly") {
    to = new Date(now);
    from = new Date(now);
    from.setMonth(from.getMonth() - 6);
  } else if (key === "thisYear") {
    from = new Date(now.getFullYear(), 0, 1);
    to = new Date(now);
  } else if (key === "lastYear") {
    from = new Date(now.getFullYear() - 1, 0, 1);
    to = new Date(now.getFullYear() - 1, 11, 31);
  } else if (key === "pastYears") {
    from = new Date(now.getFullYear() - 3, 0, 1);
    to = new Date(now.getFullYear() - 1, 11, 31);
  } else {
    from = to = new Date(now);
  }

  return { from: pad(from), to: pad(to), useDaily: false };
}

type Props = BottomTabScreenProps<
  import("../../../navigation").MainTabParams,
  "Dashboard"
>;

type MoreRoute = keyof import("../../../navigation").MoreStackParams;
type PartyRoute = keyof import("../../../navigation").PartiesStackParams;
type InvoiceRoute = keyof import("../../../navigation").InvoicesStackParams;

export function DashboardScreen({ navigation }: Props) {
  const { contentWidth, contentPad: padding } = useResponsive();
  const quickActionColumns = getActionColumns(contentWidth);
  const quickActionTileWidth = getActionTileWidth(
    contentWidth,
    quickActionColumns,
  );
  const compactQuickActionsHeader = contentWidth < 380;
  const compactAddPopup = contentWidth < 360;
  const popupHorizontalPad = compactAddPopup ? 10 : 14;
  const popupGroupPad = compactAddPopup ? 8 : 10;
  const popupGridGap = compactAddPopup ? 6 : 10;
  const popupColumns = 3;
  const popupInnerWidth = Math.max(220, contentWidth - popupHorizontalPad * 2);
  const popupGridWidth = Math.max(180, popupInnerWidth - popupGroupPad * 2);
  const popupTileWidth = getActionTileWidth(
    popupGridWidth,
    popupColumns,
    popupGridGap,
  );
  const popupMaxHeight = contentWidth < 360 ? 440 : 520;
  const [businessHealthExpanded, setBusinessHealthExpanded] = useState(true);
  const [numbersPeriod, setNumbersPeriod] = useState<PeriodKey>("today");
  const [customFrom, setCustomFrom] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const [customTo, setCustomTo] = useState<Date>(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [customDatePicker, setCustomDatePicker] = useState<
    "from" | "to" | null
  >(null);
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isConnected } = useWS();
  useWsInvalidation([
    "invoices",
    "customers",
    "summary",
    "products",
    "lowStock",
    "reminders",
    "expiringBatches",
  ]);

  const { data: meData } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    staleTime: 5 * 60_000,
  });
  const meUser = meData?.user as
    | {
        tenant?: {
          name?: string;
          legalName?: string;
          tradeName?: string;
          gstin?: string;
          settings?: Record<string, string | boolean>;
        };
      }
    | undefined;
  const tenant = meUser?.tenant;
  const settings = (tenant?.settings ?? {}) as Record<string, string>;
  const businessName =
    tenant?.legalName ?? tenant?.tradeName ?? tenant?.name ?? "My Business";
  const gstin = tenant?.gstin ?? "";
  const bankName = settings.bankName ?? "";
  const bankAccountNo = settings.bankAccountNo ?? "";
  const bankIfsc = settings.bankIfsc ?? "";
  const bankAccountHolder = settings.bankAccountHolder ?? "";

  const numbersRange = getPeriodRange(
    numbersPeriod,
    customFrom,
    customTo,
    selectedYear,
  );

  const numbersPeriodLabel = useMemo(() => {
    if (numbersPeriod === "custom") {
      return `${numbersRange.from}-${numbersRange.to}`;
    }
    if (numbersPeriod === "year") {
      return String(selectedYear);
    }
    return PERIOD_LABELS[numbersPeriod];
  }, [numbersPeriod, numbersRange.from, numbersRange.to, selectedYear]);

  const selectableYears = useMemo(
    () =>
      Array.from(
        { length: SELECTABLE_YEAR_COUNT },
        (_, i) => new Date().getFullYear() - i,
      ),
    [],
  );

  const closePeriodModal = useCallback(() => setPeriodModalOpen(false), []);

  const selectNumbersPeriod = useCallback((period: PeriodKey) => {
    setNumbersPeriod(period);
    setPeriodModalOpen(false);
  }, []);

  const selectYearPeriod = useCallback((year: number) => {
    setSelectedYear(year);
    setNumbersPeriod("year");
    setPeriodModalOpen(false);
  }, []);

  const {
    data: summaryDaily,
    isLoading: isLoadingDaily,
    dataUpdatedAt: sumDailyAt,
  } = useQuery({
    queryKey: ["summary", "daily"],
    queryFn: () => summaryApi.daily(),
    staleTime: 60_000,
    enabled: numbersRange.useDaily && !numbersRange.date,
  });

  const { data: summaryDailyDate, dataUpdatedAt: sumDailyDateAt } = useQuery({
    queryKey: ["summary", "daily", numbersRange.date ?? ""],
    queryFn: () => summaryApi.daily(numbersRange.date!),
    staleTime: 60_000,
    enabled: numbersRange.useDaily && !!numbersRange.date,
  });

  const {
    data: summaryRange,
    isLoading: isLoadingRange,
    dataUpdatedAt: sumRangeAt,
  } = useQuery({
    queryKey: ["summary", "range", numbersRange.from, numbersRange.to],
    queryFn: () => summaryApi.range(numbersRange.from, numbersRange.to),
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

  const {
    data: invoices,
    refetch: refetchInvoices,
    isFetching: loadingInvoices,
    dataUpdatedAt: invAt,
  } = useQuery({
    queryKey: ["invoices", "dashboard"],
    queryFn: () => invoiceApi.list(1, 20),
    staleTime: 60_000,
  });

  const {
    data: customersData,
    isFetching: custFetching,
    dataUpdatedAt: custAt,
  } = useQuery({
    queryKey: ["customers", "health"],
    queryFn: () => customerApi.list(1, 200),
    staleTime: 60_000,
  });

  const {
    data: lowStockData,
    isLoading: loadingLowStock,
    isFetching: stockFetching,
    dataUpdatedAt: stockAt,
  } = useQuery({
    queryKey: ["products", "low-stock"],
    queryFn: () => productExtApi.lowStock(),
    staleTime: 60_000,
  });

  const { data: remindersData } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => reminderApi.list(),
    staleTime: 60_000,
  });

  const { data: expiringData } = useQuery({
    queryKey: ["expiringBatches", 30],
    queryFn: () => productExtApi.expiringBatches(30),
    staleTime: 300_000,
  });

  const refreshing = loadingInvoices;
  const healthRefreshing = sumFetching || custFetching || stockFetching;
  const todayInvoices = invoices?.invoices ?? [];
  const totalToday =
    summary?.summary?.totalSales ??
    todayInvoices.reduce((s, i) => s + (i.total ?? 0), 0);
  const dailySummary = summary?.summary;
  const lowStock = lowStockData?.products ?? [];
  const batches = expiringData?.batches ?? [];
  const customers = customersData?.customers ?? [];
  const reminders = (remindersData?.reminders ?? []) as Array<{
    id: string;
    status: string;
    scheduledTime: string;
    customer?: { name?: string };
    amount?: number | string;
    notes?: string;
  }>;

  const collectionRate =
    dailySummary && dailySummary.totalSales > 0
      ? Math.min(
          100,
          Math.round(
            (dailySummary.totalPayments / dailySummary.totalSales) * 100,
          ),
        )
      : 0;
  const overdueCount = customers.filter(
    (c) => parseFloat(String(c.balance ?? 0)) > 0,
  ).length;
  const stockScore = Math.max(0, 100 - lowStock.length * 15);
  const overdueScore = Math.max(0, 100 - overdueCount * 10);
  const overall = Math.round((collectionRate + stockScore + overdueScore) / 3);
  const overallColor =
    overall >= 70 ? "#1a9248" : overall >= 50 ? "#e6a319" : "#dc2626";
  const overallLabel =
    overall >= 70 ? "Good" : overall >= 50 ? "Under Target" : "Critical";

  const upcomingReminders = reminders
    .filter((r) => r.status === "pending")
    .sort(
      (a, b) =>
        new Date(a.scheduledTime).getTime() -
        new Date(b.scheduledTime).getTime(),
    )
    .slice(0, 6);

  const overdueList = customers
    .filter((c) => parseFloat(String(c.balance ?? 0)) > 0)
    .sort(
      (a, b) => parseFloat(String(b.balance)) - parseFloat(String(a.balance)),
    );

  const lastUpdated =
    Math.max(sumAt ?? 0, invAt ?? 0, custAt ?? 0, stockAt ?? 0) || Date.now();
  const secsAgo = useSecondsAgo(lastUpdated);

  const [flashCollection, setFlashCollection] = useState(false);
  const [flashStock, setFlashStock] = useState(false);
  const [flashReceivables, setFlashReceivables] = useState(false);
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [cmdSetIdx, setCmdSetIdx] = useState(0);
  const [cmdItemIdx, setCmdItemIdx] = useState(0);
  const [businessMenuOpen, setBusinessMenuOpen] = useState(false);
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(false);
  const [recentActivityHidden, setRecentActivityHidden] = useState(false);
  const [quickActionPopupOpen, setQuickActionPopupOpen] = useState(false);
  const [expirySelected, setExpirySelected] = useState<{
    id: string;
    batchNo: string;
    expiryDate: string;
    quantity: number;
    product: { name: string; unit: string };
  } | null>(null);
  const [feed, setFeed] = useState<
    Array<{
      id: number;
      icon: string;
      text: string;
      subtext?: string;
      at: number;
    }>
  >([]);
  const feedId = useRef(1);
  const addCtaPulse = useRef(new Animated.Value(0)).current;
  const collapsedQuickActionCount = quickActionColumns * 2;
  const canToggleQuickActions =
    QUICK_ACTIONS_FOR_GRID.length > collapsedQuickActionCount;
  const visibleQuickActions = quickActionsExpanded
    ? QUICK_ACTIONS_FOR_GRID
    : QUICK_ACTIONS_FOR_GRID.slice(0, collapsedQuickActionCount);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(addCtaPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(addCtaPulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
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

  const commandCategoryTabs = useMemo(
    (): TabItem[] =>
      COMMAND_SETS.map((set) => ({
        id: set.category,
        label: set.category,
        icon: set.icon,
      })),
    [],
  );

  useEffect(() => {
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

  useEffect(() => {
    const push = (icon: string, text: string, subtext?: string) =>
      setFeed((prev) =>
        [
          { id: feedId.current++, icon, text, subtext, at: Date.now() },
          ...prev,
        ].slice(0, 15),
      );

    const offs = [
      wsClient.on("invoice:confirmed", (p: unknown) => {
        const d = p as {
          customerName?: string;
          invoiceNo?: string;
          total?: number;
        };
        push(
          "receipt-outline",
          `Invoice — ${d.customerName ?? "Customer"}`,
          d.invoiceNo,
        );
        const msg = d.total
          ? `Invoice confirmed — ₹${parseFloat(String(d.total)).toLocaleString("en-IN")}`
          : "Invoice confirmed";
        showInfo(msg);
      }),
      wsClient.on("payment:recorded", (p: unknown) => {
        const d = p as { customerName?: string; amount?: number };
        push(
          "wallet-outline",
          `Payment from ${d.customerName ?? "Customer"}`,
          d.amount ? formatCurrency(d.amount) : undefined,
        );
        const msg = d.amount
          ? `Payment recorded — ₹${parseFloat(String(d.amount)).toLocaleString("en-IN")}`
          : "Payment recorded";
        showInfo(msg);
      }),
      wsClient.on("customer:updated", (p: unknown) => {
        const d = p as { name?: string };
        push("person-outline", `Customer updated — ${d.name ?? ""}`);
      }),
      wsClient.on("product:updated", (p: unknown) => {
        const d = p as { name?: string };
        push("cube-outline", `Stock updated — ${d.name ?? "Product"}`);
      }),
    ];
    return () => offs.forEach((o) => o());
  }, []);

  // Flash pillars on WS events
  const flash = (setter: (v: boolean) => void, key: string) => {
    setter(true);
    if (flashTimers.current[key]) clearTimeout(flashTimers.current[key]);
    flashTimers.current[key] = setTimeout(() => setter(false), 2000);
  };
  useEffect(() => {
    const offs = [
      wsClient.on("payment:recorded", () => {
        void qc.invalidateQueries({ queryKey: ["summary"] });
        void qc.invalidateQueries({ queryKey: ["customers"] });
        flash(setFlashCollection, "col");
        flash(setFlashReceivables, "rec");
      }),
      wsClient.on("invoice:confirmed", () => {
        void qc.invalidateQueries({ queryKey: ["summary"] });
        void qc.invalidateQueries({ queryKey: ["customers"] });
        flash(setFlashCollection, "col");
      }),
      wsClient.on("invoice:draft", () => {
        void qc.invalidateQueries({ queryKey: ["summary"] });
        flash(setFlashCollection, "col");
      }),
      wsClient.on("customer:updated", () => {
        void qc.invalidateQueries({ queryKey: ["customers"] });
        flash(setFlashReceivables, "rec");
      }),
      wsClient.on("product:updated", () => {
        void qc.invalidateQueries({ queryKey: ["products"] });
        void qc.invalidateQueries({ queryKey: ["products", "low-stock"] });
        flash(setFlashStock, "stk");
      }),
    ];
    return () => offs.forEach((o) => o());
  }, [qc]);

  const navigateInvoicesTab = useCallback(() => {
    (navigation as any).navigate("InvoicesTab");
  }, [navigation]);

  const navigateTodayInvoices = useCallback(() => {
    (navigation as any).navigate("InvoicesTab", {
      screen: "InvoiceList",
      params: { initialDateFilter: "today" },
    });
  }, [navigation]);

  const navigateMoreStack = useCallback(
    (screen: MoreRoute) => {
      (navigation as any).navigate("MoreTab", { screen });
    },
    [navigation],
  );

  const navigatePartiesStack = useCallback(
    (screen: PartyRoute) => {
      (navigation as any).navigate("PartiesTab", { screen });
    },
    [navigation],
  );

  const navigateInvoiceStack = useCallback(
    (screen: InvoiceRoute, params?: Record<string, unknown>) => {
      (navigation as any).navigate(
        "InvoicesTab",
        params ? { screen, params } : { screen },
      );
    },
    [navigation],
  );

  const handleQuickAction = (
    route: string,
    params?: Record<string, unknown>,
  ) => {
    if (route === "InvoiceForm") return navigateMoreStack("Invoice");
    if (route === "InvoicesTab") return navigateInvoicesTab();
    if (route === "Reports") return navigateMoreStack("Reports");
    if (route === "DocumentTemplates")
      return navigateMoreStack("DocumentTemplates");
    if (route === "PurchaseOrders") return navigateMoreStack("PurchaseOrders");
    if (route === "SalesOrders") return navigateMoreStack("SalesOrders");
    if (route === "Purchases") return navigateMoreStack("Purchases");
    if (route === "PurchasePaymentOut")
      return navigateMoreStack("PurchasePaymentOut");
    if (route === "PurchaseReturn") return navigateMoreStack("PurchaseReturn");
    if (route === "CreditNotes") return navigateInvoiceStack("CreditNotes");
    if (route === "DeliveryChallans")
      return navigateMoreStack("DeliveryChallans");
    if (route === "Payment") return navigatePartiesStack("Payment");
    if (route === "Items") return navigateMoreStack("Items");
    if (route === "PartiesTab") return navigation.navigate("PartiesTab");
    if (route === "Expenses") return navigateMoreStack("Expenses");
  };

  const currentSet = COMMAND_SETS[cmdSetIdx];
  const currentCmd = currentSet.items[cmdItemIdx];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: padding,
          paddingBottom: 32,
          paddingTop: SECTION_GAP,
          alignItems: "center",
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetchInvoices} />
        }
      >
        <View style={{ width: "100%", maxWidth: contentWidth }}>
          {/* 1 — Header bar: Business name, tap for options */}
          <TouchableOpacity
            onPress={() => setBusinessMenuOpen(true)}
            activeOpacity={0.8}
            className="flex-row items-center gap-2 mb-4 py-2"
          >
            <View className="flex-1 min-w-0 flex-row items-center gap-2">
              <View
                className={`h-2 w-2 rounded-full shrink-0 ${isConnected ? "bg-green-500" : "bg-amber-500"}`}
                style={{ opacity: isConnected ? 1 : 0.8 }}
              />
              <Text className={TYPO.sectionTitle} numberOfLines={1}>
                {businessName}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Business menu modal */}
          <Modal
            visible={businessMenuOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setBusinessMenuOpen(false)}
          >
            <Pressable
              className="flex-1 bg-black/50 justify-end"
              onPress={() => setBusinessMenuOpen(false)}
            >
              <Pressable
                onPress={(e) => e.stopPropagation()}
                className="bg-white rounded-t-2xl p-3 pb-6"
              >
                <View className="w-8 h-0.5 rounded-full bg-slate-200 self-center mb-2" />
                <Text className={`${TYPO.sectionTitle} mb-2`}>
                  Select Business
                </Text>
                <View
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 mb-4"
                  style={{ position: "relative" }}
                >
                  <View
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      marginTop: -9,
                    }}
                  >
                    <Ionicons
                      name="radio-button-on"
                      size={18}
                      color="#e67e22"
                    />
                  </View>
                  <View className="flex-row items-center pr-8">
                    <Text
                      className="text-xs font-semibold text-slate-800 flex-1"
                      numberOfLines={1}
                    >
                      {businessName}
                    </Text>
                  </View>
                  <View className="flex-row gap-3 mt-1.5">
                    <TouchableOpacity
                      onPress={() => {
                        setBusinessMenuOpen(false);
                        navigateMoreStack("CompanyProfile");
                      }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-xs font-semibold text-primary">
                        Edit Company
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setBusinessMenuOpen(false);
                        const parts: string[] = [businessName];
                        if (gstin) parts.push(`GSTIN: ${gstin}`);
                        if (
                          bankAccountHolder ||
                          bankName ||
                          bankAccountNo ||
                          bankIfsc
                        ) {
                          const bankLines: string[] = [];
                          if (bankAccountHolder)
                            bankLines.push(`A/c Holder: ${bankAccountHolder}`);
                          if (bankName) bankLines.push(`Bank: ${bankName}`);
                          if (bankAccountNo)
                            bankLines.push(`A/c No: ${bankAccountNo}`);
                          if (bankIfsc) bankLines.push(`IFSC: ${bankIfsc}`);
                          if (bankLines.length)
                            parts.push(
                              "Bank Details:\n" + bankLines.join("\n"),
                            );
                        }
                        Share.share({
                          message: parts.join("\n\n"),
                          title: "Business Details",
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-xs font-semibold text-primary">
                        Share
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View className="items-center">
                  <TouchableOpacity
                    onPress={() => {
                      setBusinessMenuOpen(false);
                      navigateMoreStack("CompanyProfile");
                    }}
                    className="flex-row items-center gap-1.5 py-2.5 px-4 rounded-lg bg-primary/10"
                  >
                    <Ionicons name="add" size={18} color="#e67e22" />
                    <Text className="text-xs font-medium text-slate-700">
                      Add New Business
                    </Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>

          {/* 2 — Business Health Score (collapsible) */}
          <TouchableOpacity
            activeOpacity={businessHealthExpanded ? 1 : 0.7}
            onPress={() =>
              !businessHealthExpanded && setBusinessHealthExpanded(true)
            }
            style={{
              borderRadius: 12,
              borderWidth:
                flashCollection || flashStock || flashReceivables ? 2 : 1,
              borderColor:
                flashCollection || flashStock || flashReceivables
                  ? "#e67e22"
                  : "#e2e8f0",
              backgroundColor: "#fff",
              padding: businessHealthExpanded ? 12 : 10,
              marginBottom: 16,
            }}
          >
            <View
              className="flex-row items-center justify-between"
              style={{ gap: 12 }}
            >
              <View className="flex-1 min-w-0 flex-row items-center gap-3">
                <View
                  className="w-12 h-12 rounded-full items-center justify-center shrink-0"
                  style={{
                    borderWidth: 3,
                    borderColor: overallColor,
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <Text
                    className="text-xs font-bold tabular-nums"
                    style={{ color: overallColor }}
                  >
                    {overall}
                  </Text>
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-1.5">
                    <Text className={TYPO.sectionTitle}>Business Health</Text>
                    <View
                      className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-slate-400"}`}
                    />
                    {healthRefreshing && (
                      <ActivityIndicator
                        size="small"
                        color="#e67e22"
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </View>
                  <Text
                    className={`${TYPO.label} mt-0.5`}
                    style={{ color: overallColor }}
                  >
                    {overall}/100 · {overallLabel}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setBusinessHealthExpanded((e) => !e)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                className="flex-row items-center gap-1 shrink-0"
              >
                <Text className="text-xs font-semibold text-primary">
                  {businessHealthExpanded ? "Hide" : "Show"}{" "}
                </Text>
                <Ionicons
                  name={businessHealthExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#e67e22"
                />
              </TouchableOpacity>
            </View>

            {businessHealthExpanded && (
              <>
                {/* Today snapshot first — Bills | Sales | Collected | Pending */}
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: "#f8fafc",
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    padding: 10,
                    marginTop: 10,
                    marginBottom: 10,
                  }}
                >
                  <TouchableOpacity
                    onPress={navigateInvoicesTab}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      borderRightWidth: 1,
                      borderRightColor: "#e2e8f0",
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={TYPO.micro + " text-slate-500"}
                      numberOfLines={1}
                    >
                      Bills
                    </Text>
                    <Text className={TYPO.labelBold + " text-slate-800"}>
                      {dailySummary?.invoiceCount ?? 0}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={navigateInvoicesTab}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      borderRightWidth: 1,
                      borderRightColor: "#e2e8f0",
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={TYPO.micro + " text-slate-500"}
                      numberOfLines={1}
                    >
                      Sales
                    </Text>
                    <Text
                      className={TYPO.microBold + " text-slate-800"}
                      numberOfLines={1}
                    >
                      {formatCurrency(dailySummary?.totalSales ?? 0)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigatePartiesStack("Payment")}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      borderRightWidth: 1,
                      borderRightColor: "#e2e8f0",
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={TYPO.micro + " text-slate-500"}
                      numberOfLines={1}
                    >
                      Collected
                    </Text>
                    <Text
                      className={TYPO.microBold}
                      style={{
                        color:
                          collectionRate >= 80
                            ? "#1a9248"
                            : collectionRate >= 50
                              ? "#e6a319"
                              : "#dc2626",
                      }}
                    >
                      {collectionRate}%
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigatePartiesStack("Overdue")}
                    style={{ flex: 1, alignItems: "center" }}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={TYPO.micro + " text-slate-500"}
                      numberOfLines={1}
                    >
                      Pending
                    </Text>
                    <Text
                      className={`${TYPO.microBold} ${(dailySummary?.pendingAmount ?? 0) > 0 ? "text-amber-600" : "text-green-600"}`}
                      numberOfLines={1}
                    >
                      {formatCurrency(dailySummary?.pendingAmount ?? 0)}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Business Health score */}
                <View className="h-1 w-full rounded-full bg-slate-200 mb-3">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${overall}%`,
                      backgroundColor: overallColor,
                    }}
                  />
                </View>

                {/* Health pillars: Stock | Receivables */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    marginBottom:
                      overdueList.length > 0 || upcomingReminders.length > 0
                        ? 10
                        : 0,
                  }}
                >
                  {(() => {
                    const scoreColor = (n: number) =>
                      n >= 80 ? "#1a9248" : n >= 50 ? "#e6a319" : "#dc2626";
                    const cardStyle = (flash: boolean) => ({
                      flex: 1,
                      minWidth: 0,
                      borderRadius: 10,
                      borderWidth: flash ? 2 : 1,
                      borderColor: flash ? "#e67e22" : "#e2e8f0",
                      backgroundColor: "#f8fafc",
                      padding: 10,
                      minHeight: 58,
                    });
                    return (
                      <>
                        <TouchableOpacity
                          onPress={() => navigateMoreStack("Items")}
                          activeOpacity={0.8}
                          style={cardStyle(flashStock)}
                        >
                          <View className="flex-row items-center justify-between mb-0.5">
                            <Text className={TYPO.micro} numberOfLines={1}>
                              Stock
                            </Text>
                            <Text
                              className={TYPO.microBold}
                              style={{ color: scoreColor(stockScore) }}
                            >
                              {stockScore}%
                            </Text>
                          </View>
                          <View className="h-1 w-full rounded-full bg-slate-200">
                            <View
                              className="h-full rounded-full"
                              style={{
                                width: `${stockScore}%`,
                                backgroundColor: scoreColor(stockScore),
                              }}
                            />
                          </View>
                          <Text
                            className={`${TYPO.micro} text-slate-500 mt-0.5`}
                            numberOfLines={1}
                          >
                            {lowStock.length === 0
                              ? "All stocked"
                              : `${lowStock.length} low`}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => navigatePartiesStack("Overdue")}
                          activeOpacity={0.8}
                          style={cardStyle(flashReceivables)}
                        >
                          <View className="flex-row items-center justify-between mb-0.5">
                            <Text className={TYPO.micro} numberOfLines={1}>
                              Receivables
                            </Text>
                            <Text
                              className={TYPO.microBold}
                              style={{ color: scoreColor(overdueScore) }}
                            >
                              {overdueScore}%
                            </Text>
                          </View>
                          <View className="h-1 w-full rounded-full bg-slate-200">
                            <View
                              className="h-full rounded-full"
                              style={{
                                width: `${overdueScore}%`,
                                backgroundColor: scoreColor(overdueScore),
                              }}
                            />
                          </View>
                          <Text
                            className={`${TYPO.micro} text-slate-500 mt-0.5`}
                            numberOfLines={1}
                          >
                            {overdueCount === 0
                              ? "All clear"
                              : `${overdueCount} overdue`}
                          </Text>
                        </TouchableOpacity>
                      </>
                    );
                  })()}
                </View>
                {overdueList.length > 0 && (
                  <TouchableOpacity
                    onPress={() => navigatePartiesStack("Overdue")}
                    activeOpacity={0.9}
                    className="flex-row flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 mb-2"
                  >
                    <View className="flex-row items-center gap-1 shrink-0">
                      <Ionicons name="alert-circle" size={14} color="#dc2626" />
                      <Text className={TYPO.labelBold + " text-red-700"}>
                        Overdue ({overdueList.length})
                      </Text>
                    </View>
                    <View className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5">
                      <Text className={`${TYPO.label} text-red-700`}>
                        {(overdueList[0].name ?? "—").slice(0, 12)}
                        {(overdueList[0].name ?? "").length > 12
                          ? "…"
                          : ""}{" "}
                        {formatCurrency(overdueList[0].balance)}
                      </Text>
                    </View>
                    <View className="rounded-full border border-red-300 bg-red-200/50 px-2 py-0.5">
                      <Text
                        className={`${TYPO.micro} font-semibold text-red-700`}
                      >
                        {formatCurrency(
                          overdueList.reduce(
                            (s, c) => s + parseFloat(String(c.balance ?? 0)),
                            0,
                          ),
                        )}{" "}
                        total
                      </Text>
                    </View>
                    <Text className={`${TYPO.caption} ml-auto shrink-0`}>
                      View All →
                    </Text>
                  </TouchableOpacity>
                )}
                {upcomingReminders.length > 0 && (
                  <TouchableOpacity
                    onPress={() => navigatePartiesStack("Overdue")}
                    activeOpacity={0.9}
                    className="flex-row flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5"
                  >
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="time-outline" size={14} color="#e67e22" />
                      <Text className={TYPO.labelBold + " text-primary"}>
                        Upcoming ({upcomingReminders.length})
                      </Text>
                    </View>
                    {upcomingReminders.slice(0, 3).map((r) => {
                      const days = Math.max(
                        0,
                        Math.ceil(
                          (new Date(r.scheduledTime).getTime() - Date.now()) /
                            86400000,
                        ),
                      );
                      const pillStyle = reminderPillStyle(days);
                      const textColor =
                        days <= 3
                          ? "text-red-700"
                          : days <= 5
                            ? "text-amber-700"
                            : "text-green-700";
                      return (
                        <View
                          key={r.id}
                          className="rounded-full border px-2 py-0.5"
                          style={pillStyle}
                        >
                          <Text className={`${TYPO.label} ${textColor}`}>
                            {(r.customer?.name ?? "—").slice(0, 10)}{" "}
                            {formatCurrency(r.amount ?? r.notes ?? 0)} ·{" "}
                            {days === 0 ? "Today" : `${days}d`}
                          </Text>
                        </View>
                      );
                    })}
                    {upcomingReminders.length > 3 && (
                      <View className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5">
                        <Text className={TYPO.caption}>
                          +{upcomingReminders.length - 3} more
                        </Text>
                      </View>
                    )}
                    <Text className={`${TYPO.caption} ml-auto`}>
                      View All →
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </TouchableOpacity>

          {/* Numbers filter — left aligned */}
          <View className="mb-1.5">
            <TouchableOpacity
              onPress={() => setPeriodModalOpen(true)}
              activeOpacity={0.7}
              className="self-start flex-row items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5"
            >
              <Text className="text-[11px] font-semibold text-slate-600">
                {numbersPeriodLabel}
              </Text>
              <Ionicons name="chevron-down" size={12} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 16,
            }}
          >
            <PressableCard
              onPress={navigateTodayInvoices}
              style={{ width: (contentWidth - 6) / 2 - 3, minWidth: 0 }}
              className="shadow-sm py-2 px-2"
            >
              <View className="items-center">
                <Text
                  className="text-[10px] font-medium text-slate-500"
                  numberOfLines={1}
                >
                  Sales
                </Text>
                {isLoadingSummary ? (
                  <Skeleton className="mt-0.5 h-5 w-16 rounded" />
                ) : (
                  <Text
                    className="text-xs font-bold text-slate-800 mt-0.5"
                    numberOfLines={1}
                  >
                    {formatCurrency(totalToday)}
                  </Text>
                )}
                <Text className="text-[10px] text-slate-500 mt-0.5">
                  {dailySummary?.invoiceCount ?? 0} bills
                </Text>
              </View>
            </PressableCard>
            <PressableCard
              onPress={() => navigatePartiesStack("Overdue")}
              style={{ width: (contentWidth - 6) / 2 - 3, minWidth: 0 }}
              className="shadow-sm py-2 px-2"
            >
              <View className="items-center">
                <Text
                  className="text-[10px] font-medium text-slate-500"
                  numberOfLines={1}
                >
                  Pending
                </Text>
                {isLoadingSummary ? (
                  <Skeleton className="mt-0.5 h-5 w-16 rounded" />
                ) : (
                  <Text
                    className={`text-xs font-bold mt-0.5 ${(dailySummary?.pendingAmount ?? 0) > 0 ? "text-amber-600" : "text-green-600"}`}
                    numberOfLines={1}
                  >
                    {formatCurrency(dailySummary?.pendingAmount ?? 0)}
                  </Text>
                )}
              </View>
            </PressableCard>
            <PressableCard
              onPress={() => navigatePartiesStack("Payment")}
              style={{ width: (contentWidth - 6) / 2 - 3, minWidth: 0 }}
              className="shadow-sm py-2 px-2"
            >
              <View className="items-center">
                <Text
                  className="text-[10px] font-medium text-slate-500"
                  numberOfLines={1}
                >
                  Collected
                </Text>
                {isLoadingSummary ? (
                  <Skeleton className="mt-0.5 h-5 w-16 rounded" />
                ) : (
                  <Text
                    className="text-xs font-bold text-green-600 mt-0.5"
                    numberOfLines={1}
                  >
                    {formatCurrency(dailySummary?.totalPayments ?? 0)}
                  </Text>
                )}
              </View>
            </PressableCard>
            <PressableCard
              onPress={() => navigateMoreStack("Reports")}
              style={{ width: (contentWidth - 6) / 2 - 3, minWidth: 0 }}
              className="shadow-sm py-2 px-2"
            >
              <View className="items-center">
                <Text
                  className="text-[10px] font-medium text-slate-500"
                  numberOfLines={1}
                >
                  Rate
                </Text>
                {isLoadingSummary ? (
                  <Skeleton className="mt-0.5 h-5 w-16 rounded" />
                ) : (
                  <Text
                    className="text-xs font-bold mt-0.5"
                    style={{
                      color:
                        collectionRate >= 80
                          ? "#1a9248"
                          : collectionRate >= 50
                            ? "#e6a319"
                            : "#dc2626",
                    }}
                  >
                    {collectionRate}%
                  </Text>
                )}
              </View>
            </PressableCard>
          </View>

          {/* ── Daily P&L Strip ───────────────────────────────────────────── */}
          {!isLoadingSummary && (dailySummary?.totalSales ?? 0) > 0 && (
            <Pressable
              onPress={() => navigateMoreStack("Reports")}
              accessibilityRole="button"
              accessibilityLabel="View today's P&L in Reports"
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              className="rounded-xl border border-slate-200 bg-white p-3 mb-4"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="trending-up-outline" size={13} color="#64748b" />
                  <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Today's P&L
                  </Text>
                </View>
                <Text
                  className="text-[11px] font-bold"
                  style={{
                    color:
                      collectionRate >= 80
                        ? "#1a9248"
                        : collectionRate >= 50
                        ? "#e6a319"
                        : "#dc2626",
                  }}
                >
                  {collectionRate}% collected
                </Text>
              </View>

              {/* Stacked bar: collected (green) + pending (amber) */}
              <View
                className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mb-2"
              >
                {(() => {
                  const total = dailySummary?.totalSales ?? 1;
                  const paid = Math.min(dailySummary?.totalPayments ?? 0, total);
                  const pending = Math.min(dailySummary?.pendingAmount ?? 0, total - paid);
                  const collectedPct = Math.round((paid / total) * 100);
                  const pendingPct = Math.round((pending / total) * 100);
                  return (
                    <View className="flex-row h-full w-full">
                      <View style={{ width: `${collectedPct}%`, backgroundColor: "#22c55e" }} />
                      <View style={{ width: `${pendingPct}%`, backgroundColor: "#f59e0b" }} />
                    </View>
                  );
                })()}
              </View>

              <View className="flex-row justify-between">
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2 h-2 rounded-full bg-green-500" />
                  <Text className="text-[11px] text-slate-500">
                    Collected{" "}
                    <Text className="font-bold text-green-600">
                      {formatCurrency(dailySummary?.totalPayments ?? 0)}
                    </Text>
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2 h-2 rounded-full bg-amber-400" />
                  <Text className="text-[11px] text-slate-500">
                    Pending{" "}
                    <Text className="font-bold text-amber-600">
                      {formatCurrency(dailySummary?.pendingAmount ?? 0)}
                    </Text>
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="receipt-outline" size={11} color="#94a3b8" />
                  <Text className="text-[11px] text-slate-500">
                    {dailySummary?.invoiceCount ?? 0} bills
                  </Text>
                </View>
              </View>
            </Pressable>
          )}

          {/* Period filter modal */}
          <Modal
            visible={periodModalOpen}
            transparent
            animationType="fade"
            onRequestClose={closePeriodModal}
          >
            <Pressable
              className="flex-1 bg-black/50 justify-end"
              onPress={closePeriodModal}
            >
              <Pressable
                onPress={(e) => e.stopPropagation()}
                className="bg-white rounded-t-2xl p-4 pb-8 max-h-[90%]"
              >
                <View className="w-8 h-0.5 rounded-full bg-slate-200 self-center mb-4" />
                <Text className={`${TYPO.sectionTitle} mb-3`}>
                  Select Period
                </Text>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 400 }}
                >
                  {PERIOD_MODAL_OPTIONS.map((k) => (
                    <TouchableOpacity
                      key={k}
                      onPress={() => selectNumbersPeriod(k)}
                      className={`py-2.5 px-3 rounded-lg mb-1 ${numbersPeriod === k ? "bg-primary/10" : ""}`}
                    >
                      <Text
                        className={`text-sm font-medium ${numbersPeriod === k ? "text-primary" : "text-slate-700"}`}
                      >
                        {PERIOD_LABELS[k]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => selectNumbersPeriod("year")}
                    className={`py-2.5 px-3 rounded-lg mb-1 ${numbersPeriod === "year" ? "bg-primary/10" : ""}`}
                  >
                    <Text
                      className={`text-sm font-medium ${numbersPeriod === "year" ? "text-primary" : "text-slate-700"}`}
                    >
                      Year {selectedYear}
                    </Text>
                  </TouchableOpacity>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginVertical: 8 }}
                  >
                    {selectableYears.map((y) => {
                      return (
                        <TouchableOpacity
                          key={y}
                          onPress={() => selectYearPeriod(y)}
                          className={`py-2 px-3 rounded-lg mr-2 ${selectedYear === y ? "bg-primary" : "bg-slate-100"}`}
                        >
                          <Text
                            className={`text-xs font-semibold ${selectedYear === y ? "text-white" : "text-slate-600"}`}
                          >
                            {y}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <TouchableOpacity
                    onPress={() => selectNumbersPeriod("pastYears")}
                    className={`py-2.5 px-3 rounded-lg mb-1 ${numbersPeriod === "pastYears" ? "bg-primary/10" : ""}`}
                  >
                    <Text
                      className={`text-sm font-medium ${numbersPeriod === "pastYears" ? "text-primary" : "text-slate-700"}`}
                    >
                      {PERIOD_LABELS.pastYears}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setNumbersPeriod("custom")}
                    className={`py-2.5 px-3 rounded-lg mb-1 ${numbersPeriod === "custom" ? "bg-primary/10" : ""}`}
                  >
                    <Text
                      className={`text-sm font-medium ${numbersPeriod === "custom" ? "text-primary" : "text-slate-700"}`}
                    >
                      {PERIOD_LABELS.custom}
                    </Text>
                  </TouchableOpacity>
                  {numbersPeriod === "custom" && (
                    <View className="mt-2 rounded-lg border border-slate-200 p-3">
                      <Text className="text-xs font-semibold text-slate-600 mb-2">
                        From
                      </Text>
                      <TouchableOpacity
                        onPress={() => setCustomDatePicker("from")}
                        className="py-2 border-b border-slate-100"
                      >
                        <Text className="text-sm">
                          {customFrom.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                      </TouchableOpacity>
                      <Text className="text-xs font-semibold text-slate-600 mt-2 mb-2">
                        To
                      </Text>
                      <TouchableOpacity
                        onPress={() => setCustomDatePicker("to")}
                        className="py-2"
                      >
                        <Text className="text-sm">
                          {customTo.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={closePeriodModal}
                        className="mt-3 bg-primary rounded-lg py-2.5 items-center"
                      >
                        <Text className="text-sm font-semibold text-white">
                          Apply
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>

          {customDatePicker && (
            <DateTimePicker
              value={customDatePicker === "from" ? customFrom : customTo}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, d) => {
                if (d) {
                  if (customDatePicker === "from") {
                    setCustomFrom(d);
                    if (d > customTo) setCustomTo(d);
                  } else {
                    setCustomTo(d);
                    if (d < customFrom) setCustomFrom(d);
                  }
                }
                setCustomDatePicker(null);
              }}
            />
          )}

          {/* AI Agent Feed (command hints + live feed) */}
          <View className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 mb-4">
            <View className="flex-row items-center gap-3">
              <View className="rounded-full bg-primary/10 p-2">
                <Ionicons name="mic" size={18} color="#e67e22" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className={TYPO.sectionTitle + " text-primary/80"}>
                  {currentSet.category} · Say it naturally
                </Text>
                <Text className={TYPO.body} key={cmdItemIdx}>
                  &ldquo;{currentCmd}&rdquo;
                </Text>
              </View>
            </View>
          </View>
          {/* Category tabs */}
          <TabBar
            tabs={commandCategoryTabs}
            activeTab={COMMAND_SETS[cmdSetIdx]?.category ?? ""}
            onChange={(tab) => {
              const nextIdx = COMMAND_SETS.findIndex(
                (set) => set.category === tab,
              );
              if (nextIdx >= 0) {
                setCmdSetIdx(nextIdx);
                setCmdItemIdx(0);
              }
            }}
            variant="pills"
            scrollable
            className="mb-3"
          />
          {feed.length > 0 && (
            <View className="rounded-xl border border-slate-200 bg-card px-4 py-2 mb-4">
              <View className="flex-row items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                <View
                  className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-slate-400"}`}
                />
                <Text className={TYPO.sectionTitle}>AI Activity Feed</Text>
              </View>
              {feed.slice(0, 5).map((item) => (
                <View
                  key={item.id}
                  className="flex-row items-start gap-2 py-1.5"
                >
                  {item.icon.includes("-") ? (
                    <Ionicons
                      name={item.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color="#64748b"
                    />
                  ) : (
                    <Text className="text-base">{item.icon}</Text>
                  )}
                  <View className="flex-1">
                    <Text className={TYPO.body} numberOfLines={1}>
                      {item.text}
                    </Text>
                    {item.subtext && (
                      <Text className={TYPO.caption} numberOfLines={1}>
                        {item.subtext}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 4 — Quick Actions */}
          <QuickActionsSection
            canToggleQuickActions={canToggleQuickActions}
            quickActionsExpanded={quickActionsExpanded}
            compactQuickActionsHeader={compactQuickActionsHeader}
            addCtaScale={addCtaScale}
            addCtaGlow={addCtaGlow}
            quickActionTileWidth={quickActionTileWidth}
            contentWidth={contentWidth}
            visibleQuickActions={visibleQuickActions}
            actionPrimaryColor={ACTION_COLORS.primary}
            onToggleExpand={() => setQuickActionsExpanded((v) => !v)}
            onOpenAddTransaction={() => setQuickActionPopupOpen(true)}
            onQuickAction={handleQuickAction}
          />

          <RecentActivitySection
            recentActivityHidden={recentActivityHidden}
            compactQuickActionsHeader={compactQuickActionsHeader}
            secsAgo={secsAgo}
            todayInvoices={todayInvoices}
            onToggleHidden={() => setRecentActivityHidden((v) => !v)}
            onRefresh={() => {
              void refetchInvoices();
            }}
            onInvoicePress={(invoiceId) =>
              navigateInvoiceStack("InvoiceDetail", { id: invoiceId })
            }
          />

          {/* 7 — Low Stock */}
          {!loadingLowStock && lowStock.length > 0 && (
            <TouchableOpacity
              onPress={() => navigateMoreStack("Items")}
              activeOpacity={0.9}
              className="flex-row flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 mb-5"
            >
              <Text className={TYPO.labelBold + " text-amber-700"}>
                {lowStock.filter((p) => p.stock === 0).length > 0 ? "🔴" : "⚠️"}{" "}
                Stock Alert ({lowStock.length}):
              </Text>
              {lowStock.slice(0, 5).map((p) => (
                <View
                  key={p.id}
                  className={`rounded-full border px-2 py-0.5 ${p.stock === 0 ? "border-red-300 bg-red-100" : "border-amber-300 bg-amber-100"}`}
                >
                  <Text
                    className={`${TYPO.label} ${p.stock === 0 ? "text-red-700" : "text-amber-700"}`}
                  >
                    {p.name} {p.stock}
                    {p.unit ?? ""}
                  </Text>
                </View>
              ))}
              {lowStock.length > 5 && (
                <View className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5">
                  <Text className={TYPO.caption}>
                    +{lowStock.length - 5} more
                  </Text>
                </View>
              )}
              <Text className={`${TYPO.caption} ml-auto`}>
                Manage Inventory →
              </Text>
            </TouchableOpacity>
          )}

          {/* 8 — Expiry Alert */}
          {batches.length > 0 && (
            <View className="flex-row flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5">
              <Text className={TYPO.labelBold + " text-amber-700"}>
                {batches.filter((b) => daysUntil(b.expiryDate) <= 0).length > 0
                  ? "🔴"
                  : "⚠️"}{" "}
                Expiry Alert ({batches.length}):
              </Text>
              {batches.slice(0, 6).map((batch) => {
                const days = daysUntil(batch.expiryDate);
                const pillClass =
                  days <= 0
                    ? "border-red-300 bg-red-100"
                    : days <= 7
                      ? "border-red-200 bg-red-50"
                      : "border-amber-300 bg-amber-100";
                return (
                  <TouchableOpacity
                    key={batch.id}
                    onPress={() => setExpirySelected(batch)}
                    className={`rounded-full border px-2 py-0.5 ${pillClass}`}
                  >
                    <Text
                      className={`${TYPO.label} ${days <= 7 ? "text-red-700" : "text-amber-700"}`}
                    >
                      {batch.product.name.length > 14
                        ? batch.product.name.slice(0, 13) + "…"
                        : batch.product.name}{" "}
                      <Text className="opacity-70">{daysLabel(days)}</Text>
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {batches.length > 6 && (
                <TouchableOpacity
                  onPress={() => navigateMoreStack("Expiry")}
                  className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5"
                >
                  <Text className={TYPO.caption}>
                    +{batches.length - 6} more
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => navigateMoreStack("Expiry")}
                className="ml-auto"
              >
                <Text className={TYPO.caption}>View All →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add transaction popup */}
      <Modal
        visible={quickActionPopupOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickActionPopupOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setQuickActionPopupOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl pt-3 pb-6"
            style={{
              width: "100%",
              maxWidth: contentWidth,
              alignSelf: "center",
              paddingHorizontal: popupHorizontalPad,
            }}
          >
            <View className="w-8 h-0.5 rounded-full bg-slate-200 self-center mb-2" />
            <View className="flex-row items-center justify-between mb-3">
              <View className="min-w-0 flex-1 pr-2">
                <Text className={TYPO.sectionTitle}>Add Transaction</Text>
                <Text className={TYPO.caption} numberOfLines={1}>
                  Quick create for sales, purchase, and expenses
                </Text>
              </View>
              <TouchableOpacity onPress={() => setQuickActionPopupOpen(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: popupMaxHeight }}
              contentContainerStyle={{ paddingBottom: 4 }}
              showsVerticalScrollIndicator={false}
            >
              {ADD_TRANSACTION_GROUPS.map((group, groupIndex) => (
                <View
                  key={group.label}
                  style={{
                    paddingTop: groupIndex === 0 ? 0 : 8,
                    marginTop: groupIndex === 0 ? 0 : 10,
                    marginBottom:
                      groupIndex === ADD_TRANSACTION_GROUPS.length - 1 ? 0 : 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    backgroundColor: "#f8fafc",
                    paddingHorizontal: popupGroupPad,
                    paddingBottom: compactAddPopup ? 8 : 12,
                  }}
                >
                  <View className="flex-row items-center gap-2 mb-2">
                    <View
                      className="h-6 w-6 rounded-full items-center justify-center"
                      style={{ backgroundColor: `${group.color}22` }}
                    >
                      <Ionicons
                        name={group.icon}
                        size={14}
                        color={group.color}
                      />
                    </View>
                    <Text className={TYPO.labelBold}>{group.label}</Text>
                    <View className="ml-auto rounded-full bg-white px-2 py-0.5 border border-slate-200">
                      <Text className="text-[10px] font-semibold text-slate-500">
                        {group.actions.length}
                      </Text>
                    </View>
                  </View>

                  <View style={{ gap: popupGridGap }}>
                    {chunkItems(group.actions, popupColumns).map(
                      (row, rowIdx) => (
                        <View
                          key={`${group.label}-row-${rowIdx}`}
                          style={{ flexDirection: "row", gap: popupGridGap }}
                        >
                          {row.map((item) => (
                            <TouchableOpacity
                              key={`popup-${group.label}-${item.label}`}
                              onPress={() => {
                                setQuickActionPopupOpen(false);
                                handleQuickAction(item.route, item.params);
                              }}
                              activeOpacity={0.85}
                              style={{
                                width: popupTileWidth,
                                minHeight: compactAddPopup
                                  ? SIZES.TOUCH_MIN + 14
                                  : SIZES.TOUCH_MIN + 18,
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 4,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: "#dbe2ea",
                                backgroundColor: "#ffffff",
                                paddingVertical: compactAddPopup ? 6 : 8,
                                paddingHorizontal: contentWidth < 360 ? 2 : 4,
                              }}
                            >
                              <Ionicons
                                name={item.icon}
                                size={compactAddPopup ? 16 : 18}
                                color={group.color}
                              />
                              <Text
                                className={`${TYPO.micro} font-semibold text-center text-slate-600`}
                                numberOfLines={2}
                              >
                                {item.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ),
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Expiry detail modal */}
      <Modal
        visible={!!expirySelected}
        transparent
        animationType="fade"
        onRequestClose={() => setExpirySelected(null)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center p-4"
          onPress={() => setExpirySelected(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-4"
          >
            {expirySelected && (
              <>
                <View className="flex-row items-center gap-2 mb-3">
                  <Ionicons name="warning" size={20} color="#dc2626" />
                  <Text className={TYPO.value}>Expiry Stock Alert</Text>
                </View>
                <View
                  className={`rounded-lg p-3 mb-3 ${daysUntil(expirySelected.expiryDate) <= 7 ? "bg-red-50" : "bg-amber-50"}`}
                >
                  <Text
                    className={`${TYPO.body} font-bold text-center ${daysUntil(expirySelected.expiryDate) <= 7 ? "text-red-700" : "text-amber-700"}`}
                  >
                    {daysUntil(expirySelected.expiryDate) <= 0
                      ? "❌ This batch has EXPIRED"
                      : `⚠️ Expiring in ${daysUntil(expirySelected.expiryDate)} day${daysUntil(expirySelected.expiryDate) === 1 ? "" : "s"}!`}
                  </Text>
                </View>
                <View className="gap-2 mb-3">
                  <View className="flex-row justify-between py-2 border-b border-slate-100">
                    <Text className={TYPO.label}>Product</Text>
                    <Text className={TYPO.labelBold}>
                      {expirySelected.product.name}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-b border-slate-100">
                    <Text className={TYPO.label}>Quantity</Text>
                    <Text className={TYPO.labelBold}>
                      {expirySelected.quantity} {expirySelected.product.unit}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className={TYPO.label}>Expiry Date</Text>
                    <Text className={TYPO.labelBold}>
                      {new Date(expirySelected.expiryDate).toLocaleDateString(
                        "en-IN",
                        { day: "2-digit", month: "short", year: "numeric" },
                      )}
                    </Text>
                  </View>
                </View>
                <Text className={`${TYPO.caption} text-center mb-3`}>
                  Go to <Text className="font-semibold">Expiry Tracker</Text> to
                  write off or manage this batch.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setExpirySelected(null);
                    navigateMoreStack("Expiry");
                  }}
                  className="bg-primary rounded-xl py-3 items-center"
                >
                  <Text className={`${TYPO.labelBold} text-white`}>
                    Open Expiry Tracker
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
