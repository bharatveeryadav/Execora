import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { inr } from "@execora/shared";
import { TYPO } from "../../lib/typography";

type Props = {
  recentActivityHidden: boolean;
  compactQuickActionsHeader: boolean;
  secsAgo: number;
  todayInvoices: any[];
  onToggleHidden: () => void;
  onRefresh: () => void;
  onInvoicePress: (id: string) => void;
};

export function RecentActivitySection({
  recentActivityHidden,
  compactQuickActionsHeader,
  secsAgo,
  todayInvoices,
  onToggleHidden,
  onRefresh,
  onInvoicePress,
}: Props) {
  return (
    <>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="document-text-outline" size={18} color="#0f172a" />
            <Text className={TYPO.sectionTitle}>Recent Activity</Text>
          </View>
          <View className="flex-row items-center gap-1 rounded-full bg-green-100 px-2 py-0.5">
            <View className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <Text className={`${TYPO.micro} font-semibold text-green-700`}>
              LIVE
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={onToggleHidden}
            activeOpacity={0.8}
            className="flex-row items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1"
          >
            <Text className="text-xs font-semibold text-slate-600">
              {recentActivityHidden
                ? compactQuickActionsHeader
                  ? "Show"
                  : "Show"
                : compactQuickActionsHeader
                  ? "Hide"
                  : "Hide"}
            </Text>
            <Ionicons
              name={recentActivityHidden ? "chevron-down" : "chevron-up"}
              size={14}
              color="#64748b"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRefresh}
            className="flex-row items-center gap-1"
          >
            <View className="flex-row items-center gap-1">
              <Ionicons name="refresh-outline" size={14} color="#64748b" />
              <Text className={TYPO.caption}>
                {secsAgo < 5 ? "just now" : `${secsAgo}s ago`}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {!recentActivityHidden && (
        <View className="rounded-xl border border-slate-200 bg-card overflow-hidden shadow-sm mb-5">
          {todayInvoices.length === 0 && (
            <View className="py-8 items-center">
              <Text className={TYPO.bodyMuted}>No invoices yet today</Text>
            </View>
          )}
          {todayInvoices.slice(0, 5).map((inv: any, idx: number) => {
            const timeStr = inv.createdAt
              ? new Date(inv.createdAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : "";
            return (
              <TouchableOpacity
                key={inv.id}
                onPress={() => onInvoicePress(inv.id)}
                className={`flex-row items-center px-4 py-3 ${idx > 0 ? "border-t border-slate-100" : ""}`}
              >
                <View className="flex-1 min-w-0">
                  <Text className={TYPO.labelBold}>
                    {inv.invoiceNo ?? inv.id.slice(-6)}
                  </Text>
                  <Text className={`${TYPO.caption} mt-0.5`}>
                    {inv.customer?.name ?? "Walk-in"}
                  </Text>
                </View>
                <View className="items-end shrink-0" style={{ marginLeft: 8 }}>
                  <Text className={`${TYPO.value} text-primary`}>
                    ₹{inr(inv.total)}
                  </Text>
                  {timeStr ? (
                    <Text className={`${TYPO.micro} text-slate-500 mt-0.5`}>
                      {timeStr}
                    </Text>
                  ) : null}
                  <View
                    className={`mt-1 px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-green-100" : "bg-amber-100"}`}
                  >
                    <Text
                      className={`${TYPO.micro} font-semibold text-center ${inv.status === "paid" ? "text-green-700" : "text-amber-700"}`}
                    >
                      {inv.status === "paid"
                        ? "✅ Paid"
                        : inv.status === "cancelled"
                          ? "❌ Void"
                          : "⏳ Due"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </>
  );
}
