/**
 * Public invoice portal — no auth required (Sprint 16).
 * URL: execora://pub/invoice/:id/:token
 * Fetches from GET /pub/invoice/:id/:token
 */
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { getApiBaseUrl } from "../../../lib/api";
import { COLORS } from "../../../lib/constants";
const API_BASE = getApiBaseUrl().replace(/\/$/, "");

// ── Types ────────────────────────────────────────────────────────────────────

interface PortalInvoice {
  id: string;
  invoiceNo: string;
  status: string;
  isProforma: boolean;
  createdAt: string;
  dueDate?: string;
  notes?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  upiVpa?: string;
  shopName?: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
  } | null;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    lineDiscountPercent?: number;
    lineTotal: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
  }>;
  hasPdf: boolean;
}

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> =
  {
    paid: { label: "Paid ✅", bg: "bg-green-100", text: "text-green-700" },
    partial: { label: "Partial", bg: "bg-amber-100", text: "text-amber-700" },
    cancelled: { label: "Cancelled", bg: "bg-red-100", text: "text-red-600" },
    proforma: { label: "Proforma", bg: "bg-blue-100", text: "text-blue-700" },
    pending: { label: "Unpaid", bg: "bg-yellow-100", text: "text-yellow-700" },
    draft: { label: "Draft", bg: "bg-slate-100", text: "text-slate-600" },
  };

// ── Screen ───────────────────────────────────────────────────────────────────

export type PubInvoiceParams = { id: string; token: string };

type Props = NativeStackScreenProps<
  import("../../../navigation").RootStackParams,
  "PubInvoice"
>;

export function PubInvoiceScreen({ navigation, route }: Props) {
  const { id, token } = route.params;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["portal-invoice", id, token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/pub/invoice/${id}/${token}`);
      if (!res.ok) throw new Error("not-found");
      const json = (await res.json()) as { invoice: PortalInvoice };
      return json.invoice;
    },
    retry: false,
    staleTime: 60_000,
  });

  const handleDownloadPdf = () => {
    Linking.openURL(`${API_BASE}/pub/invoice/${id}/${token}/pdf`);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-slate-500 mt-3">Loading invoice…</Text>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={COLORS.slate[400]}
        />
        <Text className="text-xl font-bold text-slate-700 mt-4 text-center">
          Invoice not found
        </Text>
        <Text className="text-slate-500 text-center mt-2">
          This link may have expired or is invalid. Please contact the sender
          for a new link.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-6 bg-primary px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const invoice = data;
  const pending = Math.max(0, invoice.totalAmount - invoice.paidAmount);
  const hasTax = invoice.taxAmount > 0;
  const hasDiscount = invoice.discountAmount > 0;
  const statusKey = invoice.isProforma ? "proforma" : invoice.status;
  const status = STATUS_CFG[statusKey] ?? STATUS_CFG.pending;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-slate-200 px-4 py-3 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 -ml-2"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text className="text-base font-semibold text-slate-800">
          {invoice.shopName ?? "Invoice"}
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1 px-4 py-4"
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={() => refetch()} />
        }
      >
        {/* Invoice card */}
        <View className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                Invoice
              </Text>
              <Text className="text-2xl font-black text-slate-800">
                {invoice.invoiceNo}
              </Text>
              <Text className="text-sm text-slate-500 mt-0.5">
                {new Date(invoice.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
            <View className={`px-3 py-1.5 rounded-full ${status.bg}`}>
              <Text className={`text-xs font-semibold ${status.text}`}>
                {status.label}
              </Text>
            </View>
          </View>

          {invoice.customer && (
            <View className="border-t border-slate-100 pt-4">
              <Text className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                Bill To
              </Text>
              <Text className="font-semibold text-slate-800">
                {invoice.customer.name}
              </Text>
              {invoice.customer.phone && (
                <Text className="text-sm text-slate-500">
                  {invoice.customer.phone}
                </Text>
              )}
              {invoice.customer.address && (
                <Text className="text-sm text-slate-500">
                  {invoice.customer.address}
                </Text>
              )}
              {invoice.customer.gstin && (
                <Text className="text-xs text-slate-400 mt-0.5">
                  GSTIN: {invoice.customer.gstin}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Items */}
        <View className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <Text className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">
            Items
          </Text>
          {invoice.items.map((item, idx) => (
            <View
              key={idx}
              className="flex-row justify-between py-2 border-b border-slate-50 last:border-0"
            >
              <View className="flex-1 mr-3">
                <Text
                  className="text-sm font-semibold text-slate-800"
                  numberOfLines={2}
                >
                  {item.productName}
                </Text>
                <Text className="text-xs text-slate-500">
                  {item.quantity} × ₹{inr(item.unitPrice)}
                  {item.lineDiscountPercent ? (
                    <Text className="text-green-600">
                      {" "}
                      (-{item.lineDiscountPercent}%)
                    </Text>
                  ) : null}
                </Text>
              </View>
              <Text className="text-sm font-semibold text-slate-800">
                ₹{inr(item.lineTotal)}
              </Text>
            </View>
          ))}

          {/* Totals */}
          <View className="border-t border-slate-100 mt-4 pt-4">
            <View className="flex-row justify-between py-1">
              <Text className="text-sm text-slate-600">Subtotal</Text>
              <Text className="text-sm text-slate-600">
                ₹{inr(invoice.subtotal)}
              </Text>
            </View>
            {hasDiscount && (
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-green-600">Discount</Text>
                <Text className="text-sm text-green-600">
                  -₹{inr(invoice.discountAmount)}
                </Text>
              </View>
            )}
            {hasTax && (
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-slate-600">GST</Text>
                <Text className="text-sm text-slate-600">
                  ₹{inr(invoice.taxAmount)}
                </Text>
              </View>
            )}
            <View className="flex-row justify-between py-2 mt-1 border-t border-slate-100">
              <Text className="text-base font-black text-slate-800">Total</Text>
              <Text className="text-base font-black text-slate-800">
                ₹{inr(invoice.totalAmount)}
              </Text>
            </View>
            {invoice.paidAmount > 0 && (
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-green-600">Paid</Text>
                <Text className="text-sm text-green-600">
                  ₹{inr(invoice.paidAmount)}
                </Text>
              </View>
            )}

            {/* Amount due + UPI Pay Now */}
            {pending > 0 && invoice.status !== "cancelled" && (
              <View className="mt-4 gap-2">
                <View className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex-row justify-between items-center">
                  <Text className="text-sm font-semibold text-amber-700">
                    Amount Due
                  </Text>
                  <Text className="text-lg font-black text-amber-700">
                    ₹{inr(pending)}
                  </Text>
                </View>
                {invoice.upiVpa && (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        `upi://pay?pa=${encodeURIComponent(invoice.upiVpa!)}&pn=${encodeURIComponent(invoice.shopName ?? "Execora")}&am=${pending.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoice.invoiceNo}`)}`,
                      )
                    }
                    className="rounded-xl bg-green-600 py-3.5 flex-row items-center justify-center gap-2"
                  >
                    <Ionicons
                      name="phone-portrait-outline"
                      size={20}
                      color={COLORS.text.inverted}
                    />
                    <Text className="text-white font-bold">Pay Now (UPI)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {pending === 0 && invoice.status === "paid" && (
              <View className="mt-4 rounded-xl bg-green-50 border border-green-200 p-3 flex-row items-center justify-center gap-2">
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={COLORS.success}
                />
                <Text className="text-sm font-semibold text-green-700">
                  Fully Paid — Thank you!
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
            <Text className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
              Notes
            </Text>
            <Text className="text-sm text-slate-600">{invoice.notes}</Text>
          </View>
        )}

        {/* Download PDF */}
        {invoice.hasPdf && (
          <TouchableOpacity
            onPress={handleDownloadPdf}
            className="rounded-2xl bg-primary py-3.5 flex-row items-center justify-center gap-2 mb-4"
          >
            <Ionicons
              name="download-outline"
              size={22}
              color={COLORS.text.inverted}
            />
            <Text className="text-white font-bold">Download PDF Invoice</Text>
          </TouchableOpacity>
        )}

        <Text className="text-center text-xs text-slate-400 mb-6">
          Powered by Execora · Secure invoice portal
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
