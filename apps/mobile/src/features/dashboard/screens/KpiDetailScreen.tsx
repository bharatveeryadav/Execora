/**
 * KpiDetailScreen — Drill-down view for each KPI card on the Dashboard.
 * Types: sales | pending | collected | rate
 */
import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { inr, type Customer, type Invoice } from "@execora/shared";
import { invoiceApi } from "../../billing/api/invoiceApi";
import { customerApi } from "../../parties/api/customerApi";
import { summaryApi } from "../../accounting/api/accountingApi";
import { Skeleton } from "../../../components/ui/Skeleton";
import { COLORS } from "../../../lib/constants";
import type { MoreStackParams } from "../../../navigation";

type Props = NativeStackScreenProps<MoreStackParams, "KpiDetail">;

const today = new Date().toISOString().slice(0, 10);

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const map: Record<
    Invoice["status"],
    { bg: string; text: string; label: string }
  > = {
    draft: { bg: "bg-slate-100", text: "text-slate-500", label: "Draft" },
    confirmed: { bg: "bg-blue-100", text: "text-blue-600", label: "Pending" },
    paid: { bg: "bg-green-100", text: "text-green-700", label: "Paid" },
    partial: { bg: "bg-amber-100", text: "text-amber-700", label: "Partial" },
    overdue: { bg: "bg-red-100", text: "text-red-600", label: "Overdue" },
  };
  const s = map[status] ?? map.draft;
  return (
    <View className={`px-1.5 py-0.5 rounded ${s.bg}`}>
      <Text className={`text-[10px] font-semibold ${s.text}`}>{s.label}</Text>
    </View>
  );
}

// ─── Invoice row ──────────────────────────────────────────────────────────────

function InvoiceRow({ inv }: { inv: Invoice }) {
  const customerName = inv.customer?.name ?? "Walk-in";
  const date = inv.createdAt
    ? new Date(inv.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "";
  return (
    <View className="flex-row items-center px-4 py-3 border-b border-slate-100">
      <View className="flex-1 mr-3">
        <Text
          className="text-sm font-semibold text-slate-800"
          numberOfLines={1}
        >
          {customerName}
        </Text>
        <Text className="text-xs text-slate-400 mt-0.5">
          {inv.invoiceNo ?? "—"} · {date}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text className="text-sm font-bold text-slate-800">
          ₹{inr(inv.total)}
        </Text>
        <StatusBadge status={inv.status} />
      </View>
    </View>
  );
}

// ─── Customer balance row ─────────────────────────────────────────────────────

function CustomerRow({ customer }: { customer: Customer }) {
  const collectionRate =
    customer.totalPurchases > 0
      ? Math.min(100, (customer.totalPayments / customer.totalPurchases) * 100)
      : 0;
  return (
    <View className="flex-row items-center px-4 py-3 border-b border-slate-100">
      <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mr-3">
        <Text className="text-xs font-bold text-orange-600">
          {(customer.name ?? "?")[0].toUpperCase()}
        </Text>
      </View>
      <View className="flex-1 mr-3">
        <Text
          className="text-sm font-semibold text-slate-800"
          numberOfLines={1}
        >
          {customer.name}
        </Text>
        {customer.phone ? (
          <Text className="text-xs text-slate-400 mt-0.5">
            {customer.phone}
          </Text>
        ) : null}
      </View>
      <View className="items-end">
        <Text
          className={`text-sm font-bold ${customer.balance > 0 ? "text-amber-600" : "text-green-600"}`}
        >
          ₹{inr(Math.abs(customer.balance))}
        </Text>
        <Text className="text-[10px] text-slate-400 mt-0.5">
          {customer.balance > 0 ? "owes" : "advance"}
        </Text>
      </View>
    </View>
  );
}

// ─── Rate row (collection % per customer) ────────────────────────────────────

function RateRow({ customer }: { customer: Customer }) {
  const rate =
    customer.totalPurchases > 0
      ? Math.min(
          100,
          Math.round((customer.totalPayments / customer.totalPurchases) * 100),
        )
      : 0;
  const barWidth = `${rate}%` as `${number}%`;
  return (
    <View className="px-4 py-3 border-b border-slate-100">
      <View className="flex-row items-center justify-between mb-1.5">
        <Text
          className="text-sm font-semibold text-slate-800 flex-1 mr-2"
          numberOfLines={1}
        >
          {customer.name}
        </Text>
        <Text
          className={`text-sm font-bold ${rate >= 70 ? "text-green-600" : rate >= 40 ? "text-amber-600" : "text-red-500"}`}
        >
          {rate}%
        </Text>
      </View>
      <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <View
          className={`h-full rounded-full ${rate >= 70 ? "bg-green-400" : rate >= 40 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ width: barWidth }}
        />
      </View>
      <View className="flex-row justify-between mt-1">
        <Text className="text-[10px] text-slate-400">
          Billed ₹{inr(customer.totalPurchases)}
        </Text>
        <Text className="text-[10px] text-slate-400">
          Collected ₹{inr(customer.totalPayments)}
        </Text>
      </View>
    </View>
  );
}

// ─── Payment mode summary card ────────────────────────────────────────────────

function PaymentModeCard({
  label,
  amount,
  icon,
  color,
}: {
  label: string;
  amount: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View className="flex-1 bg-white rounded-xl border border-slate-200 p-3 items-center">
      <View
        className="w-9 h-9 rounded-full items-center justify-center mb-1.5"
        style={{ backgroundColor: `${color}20` }}
      >
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text className="text-xs text-slate-500 mb-0.5">{label}</Text>
      <Text className="text-sm font-bold text-slate-800">₹{inr(amount)}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function KpiDetailScreen({ route, navigation }: Props) {
  const { type } = route.params;

  // ── Data queries ─────────────────────────────────────────────────────────────

  const {
    data: invoicesData,
    isLoading: loadingInvoices,
    refetch: refetchInvoices,
    isRefetching: refreshingInvoices,
  } = useQuery({
    queryKey: ["kpi-detail-invoices", type],
    queryFn: () => invoiceApi.list(1, 50),
    enabled: type === "sales",
  });

  const {
    data: customersData,
    isLoading: loadingCustomers,
    refetch: refetchCustomers,
    isRefetching: refreshingCustomers,
  } = useQuery({
    queryKey: ["kpi-detail-customers", type],
    queryFn: () => customerApi.list(1, 200),
    enabled: type === "pending" || type === "rate" || type === "collected",
  });

  const {
    data: summaryData,
    isLoading: loadingSummary,
    refetch: refetchSummary,
    isRefetching: refreshingSummary,
  } = useQuery({
    queryKey: ["kpi-detail-summary", today],
    queryFn: () => summaryApi.daily(today),
    enabled: type === "collected",
  });

  // ── Derived data ──────────────────────────────────────────────────────────────

  const todayInvoices = useMemo(() => {
    const all: Invoice[] = (invoicesData as any)?.invoices ?? [];
    return all.filter((inv) => inv.createdAt?.slice(0, 10) === today);
  }, [invoicesData]);

  const overdueCustomers = useMemo(() => {
    const all: Customer[] = (customersData as any)?.customers ?? [];
    return all
      .filter((c) => c.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [customersData]);

  const topCollectors = useMemo(() => {
    const all: Customer[] = (customersData as any)?.customers ?? [];
    return all
      .filter((c) => c.totalPurchases > 0)
      .sort((a, b) => {
        const rateA =
          a.totalPurchases > 0 ? a.totalPayments / a.totalPurchases : 0;
        const rateB =
          b.totalPurchases > 0 ? b.totalPayments / b.totalPurchases : 0;
        return rateB - rateA;
      })
      .slice(0, 30);
  }, [customersData]);

  const summary = summaryData?.summary;

  // ── Metadata ──────────────────────────────────────────────────────────────────

  const meta: Record<
    "sales" | "pending" | "collected" | "rate",
    {
      title: string;
      subtitle: string;
      icon: keyof typeof Ionicons.glyphMap;
      iconColor: string;
    }
  > = {
    sales: {
      title: "Today's Sales",
      subtitle: "Invoices created today",
      icon: "receipt-outline",
      iconColor: COLORS.secondary,
    },
    pending: {
      title: "Pending Dues",
      subtitle: "Customers with outstanding balance",
      icon: "time-outline",
      iconColor: COLORS.warning,
    },
    collected: {
      title: "Collected",
      subtitle: "Payments received today by mode",
      icon: "checkmark-circle-outline",
      iconColor: COLORS.success,
    },
    rate: {
      title: "Collection Rate",
      subtitle: "Collection % per customer (top 30)",
      icon: "bar-chart-outline",
      iconColor: COLORS.secondary,
    },
  };

  const m = meta[type];
  const isLoading =
    (type === "sales" && loadingInvoices) ||
    (type === "pending" && loadingCustomers) ||
    (type === "collected" && (loadingCustomers || loadingSummary)) ||
    (type === "rate" && loadingCustomers);
  const isRefreshing =
    refreshingInvoices || refreshingCustomers || refreshingSummary;

  const handleRefresh = () => {
    if (type === "sales") refetchInvoices();
    else if (type === "pending" || type === "rate") refetchCustomers();
    else {
      refetchCustomers();
      refetchSummary();
    }
  };

  // ── Totals header ─────────────────────────────────────────────────────────────

  const renderSummaryHeader = () => {
    if (type === "sales") {
      const totalSales = todayInvoices.reduce((s, i) => s + i.total, 0);
      return (
        <View className="mx-4 mt-4 mb-2 bg-blue-50 rounded-xl p-4 flex-row items-center">
          <View className="flex-1">
            <Text className="text-xs text-blue-500 font-medium">
              Total Today
            </Text>
            <Text className="text-xl font-bold text-blue-700 mt-0.5">
              ₹{inr(totalSales)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-blue-500 font-medium">Invoices</Text>
            <Text className="text-xl font-bold text-blue-700 mt-0.5">
              {todayInvoices.length}
            </Text>
          </View>
        </View>
      );
    }
    if (type === "pending") {
      const totalPending = overdueCustomers.reduce((s, c) => s + c.balance, 0);
      return (
        <View className="mx-4 mt-4 mb-2 bg-amber-50 rounded-xl p-4 flex-row items-center">
          <View className="flex-1">
            <Text className="text-xs text-amber-500 font-medium">
              Total Pending
            </Text>
            <Text className="text-xl font-bold text-amber-700 mt-0.5">
              ₹{inr(totalPending)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-amber-500 font-medium">
              Customers
            </Text>
            <Text className="text-xl font-bold text-amber-700 mt-0.5">
              {overdueCustomers.length}
            </Text>
          </View>
        </View>
      );
    }
    if (type === "collected") {
      const cash = summary?.cashPayments ?? 0;
      const upi = summary?.upiPayments ?? 0;
      const other = Math.max(0, (summary?.totalPayments ?? 0) - cash - upi);
      return (
        <View className="mx-4 mt-4 mb-2">
          <View className="bg-green-50 rounded-xl p-4 mb-3 flex-row items-center">
            <View className="flex-1">
              <Text className="text-xs text-green-500 font-medium">
                Total Collected
              </Text>
              <Text className="text-xl font-bold text-green-700 mt-0.5">
                ₹{inr(summary?.totalPayments ?? 0)}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <PaymentModeCard
              label="Cash"
              amount={cash}
              icon="cash-outline"
              color={COLORS.success}
            />
            <PaymentModeCard
              label="UPI"
              amount={upi}
              icon="phone-portrait-outline"
              color={COLORS.secondary}
            />
            <PaymentModeCard
              label="Other"
              amount={other}
              icon="card-outline"
              color={COLORS.warning}
            />
          </View>
        </View>
      );
    }
    if (type === "rate") {
      const allCustomers: Customer[] = (customersData as any)?.customers ?? [];
      const withPurchases = allCustomers.filter((c) => c.totalPurchases > 0);
      const avgRate =
        withPurchases.length > 0
          ? Math.round(
              (withPurchases.reduce(
                (s, c) => s + (c.totalPayments / c.totalPurchases) * 100,
                0,
              ) /
                withPurchases.length) *
                10,
            ) / 10
          : 0;
      return (
        <View className="mx-4 mt-4 mb-2 bg-purple-50 rounded-xl p-4 flex-row items-center">
          <View className="flex-1">
            <Text className="text-xs text-purple-500 font-medium">
              Avg Collection Rate
            </Text>
            <Text className="text-xl font-bold text-purple-700 mt-0.5">
              {avgRate}%
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-purple-500 font-medium">
              Customers
            </Text>
            <Text className="text-xl font-bold text-purple-700 mt-0.5">
              {withPurchases.length}
            </Text>
          </View>
        </View>
      );
    }
    return null;
  };

  // ── List content ──────────────────────────────────────────────────────────────

  const renderList = () => {
    if (isLoading) {
      return (
        <View className="mt-4 gap-2 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </View>
      );
    }

    if (type === "sales") {
      if (todayInvoices.length === 0) {
        return (
          <View className="items-center mt-16">
            <Ionicons
              name="receipt-outline"
              size={44}
              color={COLORS.slate[300]}
            />
            <Text className="text-slate-400 mt-3 text-sm">
              No invoices created today
            </Text>
          </View>
        );
      }
      return (
        <View className="bg-white rounded-xl border border-slate-200 mx-4 mt-2 overflow-hidden">
          {todayInvoices.map((inv) => (
            <InvoiceRow key={inv.id} inv={inv} />
          ))}
        </View>
      );
    }

    if (type === "pending") {
      if (overdueCustomers.length === 0) {
        return (
          <View className="items-center mt-16">
            <Ionicons
              name="checkmark-circle-outline"
              size={44}
              color={COLORS.bg.success}
            />
            <Text className="text-slate-400 mt-3 text-sm">
              No pending dues — all clear!
            </Text>
          </View>
        );
      }
      return (
        <View className="bg-white rounded-xl border border-slate-200 mx-4 mt-2 overflow-hidden">
          {overdueCustomers.map((c) => (
            <CustomerRow key={c.id} customer={c} />
          ))}
        </View>
      );
    }

    if (type === "collected") {
      const all: Customer[] = (customersData as any)?.customers ?? [];
      const payers = all
        .filter((c) => c.totalPayments > 0)
        .sort((a, b) => b.totalPayments - a.totalPayments)
        .slice(0, 30);
      if (payers.length === 0) {
        return (
          <View className="items-center mt-16">
            <Ionicons
              name="wallet-outline"
              size={44}
              color={COLORS.slate[300]}
            />
            <Text className="text-slate-400 mt-3 text-sm">
              No payments recorded yet
            </Text>
          </View>
        );
      }
      return (
        <>
          <Text className="mx-4 mt-4 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Top payers
          </Text>
          <View className="bg-white rounded-xl border border-slate-200 mx-4 overflow-hidden">
            {payers.map((c) => (
              <View
                key={c.id}
                className="flex-row items-center px-4 py-3 border-b border-slate-100"
              >
                <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center mr-3">
                  <Text className="text-xs font-bold text-green-600">
                    {(c.name ?? "?")[0].toUpperCase()}
                  </Text>
                </View>
                <Text
                  className="flex-1 text-sm font-semibold text-slate-800"
                  numberOfLines={1}
                >
                  {c.name}
                </Text>
                <Text className="text-sm font-bold text-green-600">
                  ₹{inr(c.totalPayments)}
                </Text>
              </View>
            ))}
          </View>
        </>
      );
    }

    if (type === "rate") {
      if (topCollectors.length === 0) {
        return (
          <View className="items-center mt-16">
            <Ionicons
              name="bar-chart-outline"
              size={44}
              color={COLORS.slate[300]}
            />
            <Text className="text-slate-400 mt-3 text-sm">
              No customer purchase data yet
            </Text>
          </View>
        );
      }
      return (
        <View className="bg-white rounded-xl border border-slate-200 mx-4 mt-2 overflow-hidden">
          {topCollectors.map((c) => (
            <RateRow key={c.id} customer={c} />
          ))}
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["bottom"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4 pb-3 gap-3">
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          className="w-8 h-8 rounded-full bg-white border border-slate-200 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={18} color={COLORS.text.primary} />
        </Pressable>
        <View
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: `${m.iconColor}20` }}
        >
          <Ionicons name={m.icon} size={20} color={m.iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900">{m.title}</Text>
          <Text className="text-xs text-slate-400">{m.subtitle}</Text>
        </View>
        <Pressable
          onPress={handleRefresh}
          hitSlop={8}
          className="w-8 h-8 rounded-full bg-white border border-slate-200 items-center justify-center"
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={COLORS.slate[500]} />
          ) : (
            <Ionicons
              name="refresh-outline"
              size={16}
              color={COLORS.slate[500]}
            />
          )}
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {renderSummaryHeader()}
        {renderList()}
      </ScrollView>
    </SafeAreaView>
  );
}
