import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { complianceApi } from "../../../lib/api";
import { showAlert } from "../../../lib/alerts";

export function ComplianceScreen() {
  const [turnover, setTurnover] = useState("5");
  const [fy, setFy] = useState(
    `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, "0")}`,
  );
  const [invoiceId, setInvoiceId] = useState("");

  const turnoverValue = useMemo(() => {
    const n = parseFloat(turnover);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [turnover]);

  const eligibilityQuery = useQuery({
    queryKey: ["compliance", "eligibility", turnoverValue],
    queryFn: () => complianceApi.eligibility(turnoverValue),
    staleTime: 10_000,
  });

  const gstrQuery = useQuery({
    queryKey: ["compliance", "gstr3b", fy],
    queryFn: () => complianceApi.gstr3b({ fy }),
    staleTime: 10_000,
  });

  const checkInvoice = useMutation({
    mutationFn: () => complianceApi.checkInvoice(invoiceId.trim()),
    onError: (e: Error) =>
      showAlert("Error", e.message ?? "Failed to check invoice"),
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={eligibilityQuery.isFetching || gstrQuery.isFetching}
            onRefresh={() => {
              eligibilityQuery.refetch();
              gstrQuery.refetch();
            }}
          />
        }
      >
        <Text className="text-2xl font-bold text-slate-800">Compliance</Text>
        <Text className="text-slate-500 mt-1 mb-4">
          E-invoice and GST checks
        </Text>

        <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
          <Text className="font-semibold text-slate-800 mb-2">
            E-invoice eligibility
          </Text>
          <TextInput
            value={turnover}
            onChangeText={setTurnover}
            keyboardType="decimal-pad"
            placeholder="Turnover in Cr"
            className="border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
          />
          <Text className="mt-2 text-slate-600">
            {eligibilityQuery.data?.message ?? "Calculating..."}
          </Text>
        </View>

        <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
          <Text className="font-semibold text-slate-800 mb-2">
            GSTR-3B summary (FY)
          </Text>
          <TextInput
            value={fy}
            onChangeText={setFy}
            placeholder="2025-26"
            className="border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
          />
          <Text className="mt-2 text-slate-700">
            Invoices: {gstrQuery.data?.invoiceCount ?? 0}
          </Text>
          <Text className="text-slate-700">
            Taxable: {gstrQuery.data?.totalTaxableValue ?? 0}
          </Text>
          <Text className="text-slate-700">
            Tax: {gstrQuery.data?.totalTax ?? 0}
          </Text>
        </View>

        <View className="bg-white rounded-2xl border border-slate-200 p-4">
          <Text className="font-semibold text-slate-800 mb-2">
            Check invoice eligibility
          </Text>
          <TextInput
            value={invoiceId}
            onChangeText={setInvoiceId}
            placeholder="Invoice ID"
            className="border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
          />
          <TouchableOpacity
            onPress={() => {
              if (!invoiceId.trim()) {
                showAlert("Invoice ID required", "Enter an invoice ID");
                return;
              }
              checkInvoice.mutate();
            }}
            className="mt-3 bg-slate-800 rounded-xl py-3 items-center"
            disabled={checkInvoice.isPending}
          >
            <Text className="text-white font-semibold">Check</Text>
          </TouchableOpacity>
          {checkInvoice.data ? (
            <Text className="mt-2 text-slate-700">
              {checkInvoice.data.eligible ? "Eligible" : "Not eligible"}:{" "}
              {checkInvoice.data.reason}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
