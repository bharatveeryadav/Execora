/**
 * PartiesScreen — Customers + Vendors tabs (matches web Parties.tsx).
 * Customers: filters (All, Has Due, Clear, Aging), summary, Add Customer, list.
 * Vendors: Collect & Pay, View Purchases, View Expenses.
 */
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerApi, customerExtApi, purchaseApi, invoiceApi, supplierApi } from "../lib/api";
import { useWsInvalidation } from "../hooks/useWsInvalidation";
import { inr, type Customer } from "@execora/shared";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorCard } from "../components/ui/ErrorCard";
import type { CustomersStackParams } from "../navigation";

type Tab = "customers" | "vendors";
type FilterTab = "all" | "outstanding" | "clear" | "aging";

const CUSTOMER_TAGS = ["VIP", "Wholesale", "Blacklist", "Regular"] as const;

type Props = NativeStackScreenProps<CustomersStackParams, "CustomerList">;

export function PartiesScreen({ navigation }: Props) {
  const qc = useQueryClient();
  useWsInvalidation(["customers", "summary"]);

  const [tab, setTab] = useState<Tab>("customers");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [addVendorOpen, setAddVendorOpen] = useState(false);

  // Add Customer form
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newLandmark, setNewLandmark] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newOpeningBal, setNewOpeningBal] = useState("");
  const [newCreditLimit, setNewCreditLimit] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);

  // Add Vendor form
  const [vendorName, setVendorName] = useState("");
  const [vendorCompany, setVendorCompany] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");

  // ── Queries ─────────────────────────────────────────────────────────────

  const { data: custData, isFetching, isError, refetch } = useQuery({
    queryKey: ["customers", search],
    queryFn: () =>
      search.length >= 1
        ? customerApi.search(search, 500)
        : customerApi.list(1, 500),
    staleTime: 10_000,
  });

  const { data: purchaseData } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => purchaseApi.list({}),
    staleTime: 30_000,
  });

  const { data: invoiceData } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => invoiceApi.list(1, 1000),
    staleTime: 30_000,
  });

  const { data: supplierData } = useQuery({
    queryKey: ["suppliers", vendorSearch],
    queryFn: () => supplierApi.list({ q: vendorSearch || undefined, limit: 200 }),
    staleTime: 30_000,
    enabled: tab === "vendors",
  });

  const customers: Customer[] = custData?.customers ?? [];
  const suppliers = supplierData?.suppliers ?? [];
  const purchases = purchaseData?.purchases ?? [];
  const invoices = invoiceData?.invoices ?? [];

  const toPay = purchases.reduce((s, p) => s + (parseFloat(String(p.amount)) || 0), 0);
  const toCollect = 0;

  // ── Aging (from web) ───────────────────────────────────────────────────

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const agingMap = new Map<string, number>();
  for (const inv of invoices) {
    if ((inv as any).status === "paid" || (inv as any).status === "cancelled") continue;
    const remaining =
      parseFloat(String((inv as any).total)) - parseFloat(String((inv as any).paidAmount ?? 0));
    if (remaining <= 0) continue;
    const invDate = new Date((inv as any).invoiceDate ?? (inv as any).createdAt);
    invDate.setHours(0, 0, 0, 0);
    const days = Math.floor((today.getTime() - invDate.getTime()) / 86_400_000);
    const custId = (inv as any).customerId;
    const existing = agingMap.get(custId);
    if (existing === undefined || days > existing) agingMap.set(custId, days);
  }

  const agingCustomers = customers
    .filter((c) => parseFloat(String(c.balance)) > 0)
    .map((c) => ({ ...c, ageDays: agingMap.get(c.id) ?? 0 }))
    .sort((a, b) => (b as any).ageDays - (a as any).ageDays);

  const agingBuckets = [
    { label: "60+ Days", sublabel: "Very Overdue", color: "text-red-600", bg: "bg-red-100", items: agingCustomers.filter((c) => (c as any).ageDays >= 60) },
    { label: "31–60 Days", sublabel: "Overdue", color: "text-orange-600", bg: "bg-orange-100", items: agingCustomers.filter((c) => (c as any).ageDays >= 31 && (c as any).ageDays < 60) },
    { label: "0–30 Days", sublabel: "Fresh", color: "text-green-600", bg: "bg-green-100", items: agingCustomers.filter((c) => (c as any).ageDays < 31) },
  ];

  const outstanding = customers.reduce((s, c) => s + Math.max(0, parseFloat(String(c.balance))), 0);
  const outCount = customers.filter((c) => parseFloat(String(c.balance)) > 0).length;
  const clearCount = customers.filter((c) => parseFloat(String(c.balance)) <= 0).length;

  const filtered = [...customers]
    .filter((c) => {
      const bal = parseFloat(String(c.balance));
      if (filter === "outstanding") return bal > 0;
      if (filter === "clear") return bal <= 0;
      return true;
    })
    .sort((a, b) => parseFloat(String(b.balance)) - parseFloat(String(a.balance)));

  // ── Mutations ──────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: any) => customerExtApi.create(data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setAddOpen(false);
      const customer = res?.customer;
      if (customer?.id) navigation.navigate("CustomerDetail", { id: customer.id });
      Alert.alert("", `${newName} added`);
    },
    onError: () => Alert.alert("Error", "Failed to add customer"),
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
    if (!newName.trim()) return;
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

  function toggleTag(tag: string) {
    setNewTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  // ── Export & Import helpers ─────────────────────────────────────────────

  const tabNav = (navigation.getParent as any)?.();

  function navigateToImport(type: "customers" | "vendors") {
    setMenuOpen(false);
    tabNav?.navigate("MoreTab", { screen: "Import", params: { type } });
  }

  function exportCustomersCsv() {
    const header = ["Name", "Phone", "Email", "Address", "GSTIN", "Balance", "Credit Limit", "Tags"];
    const rows = customers.map((c: any) => [
      c.name ?? "",
      c.phone ?? "",
      c.email ?? "",
      [c.addressLine1, c.addressLine2, c.city, c.state, c.pincode].filter(Boolean).join(", "),
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
    FileSystem.writeAsStringAsync(filePath, content, { encoding: FileSystem.EncodingType.UTF8 }).then(() => {
      Sharing.shareAsync(filePath, { mimeType: "text/csv", dialogTitle: "Share customers.csv" });
    });
    setMenuOpen(false);
  }

  async function exportCustomersPdf() {
    const escapeHtml = (s: string) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const rows = customers
      .slice(0, 100)
      .map(
        (c, i) =>
          `<tr><td>${i + 1}</td><td>${escapeHtml(c.name ?? "")}</td><td>${escapeHtml(c.phone ?? "")}</td><td>₹${inr(parseFloat(String(c.balance ?? 0)))}</td></tr>`
      )
      .join("");
    const html = `<html><head><meta charset="utf-8"/><style>body{font-family:system-ui,sans-serif;padding:24px;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body><h1>Customers (${customers.length})</h1><table><tr><th>#</th><th>Name</th><th>Phone</th><th>Balance</th></tr>${rows}</table></body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Share customers.pdf" });
    setMenuOpen(false);
  }

  const createVendorMutation = useMutation({
    mutationFn: (data: any) => supplierApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setAddVendorOpen(false);
      setVendorName("");
      setVendorCompany("");
      setVendorPhone("");
      setVendorEmail("");
      setVendorAddress("");
      Alert.alert("", "Vendor added");
    },
    onError: () => Alert.alert("Error", "Failed to add vendor"),
  });

  function handleAddVendor() {
    if (!vendorName.trim()) return;
    createVendorMutation.mutate({
      name: vendorName.trim(),
      companyName: vendorCompany || undefined,
      phone: vendorPhone || undefined,
      email: vendorEmail || undefined,
      address: vendorAddress || undefined,
    });
  }

  // ── Render customer row ─────────────────────────────────────────────────

  const renderCustomerRow = (c: Customer & { ageDays?: number }) => {
    const balance = parseFloat(String(c.balance));
    const hasOutstanding = balance > 0;
    const ageDays = (c as any).ageDays ?? 0;
    return (
      <TouchableOpacity
        key={c.id}
        className="flex-row items-center gap-2 p-3 border-b border-slate-100"
        activeOpacity={0.7}
        onPress={() => navigation.navigate("CustomerDetail", { id: c.id })}
      >
        <View className={`w-10 h-10 rounded-full items-center justify-center ${hasOutstanding ? "bg-red-100" : "bg-green-100"}`}>
          <Text className={`font-bold text-sm ${hasOutstanding ? "text-red-600" : "text-green-600"}`}>
            {c.name?.charAt(0)?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm font-semibold text-slate-800 truncate">{c.name}</Text>
            {((c as any).tags ?? []).includes("VIP") && (
              <View className="bg-amber-100 px-1.5 py-0.5 rounded">
                <Text className="text-[9px] font-semibold text-amber-700">VIP</Text>
              </View>
            )}
            {((c as any).tags ?? []).includes("Blacklist") && (
              <Text className="text-[9px]">⛔</Text>
            )}
          </View>
          <Text className="text-xs text-slate-500">
            {filter === "aging"
              ? ageDays === 0
                ? "Today"
                : `${ageDays}d overdue`
              : c.phone ?? "No phone"}
            {filter === "aging" && c.phone ? ` · ${c.phone}` : ""}
          </Text>
        </View>
        <View className="items-end min-w-[4rem]">
          {hasOutstanding ? (
            <Text className={`text-sm font-bold tabular-nums ${filter === "aging" ? "text-red-600" : "text-red-600"}`}>
              ₹{inr(balance)}
            </Text>
          ) : (
            <View className="flex-row items-center gap-0.5 bg-green-100 px-2 py-0.5 rounded-full">
              <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
              <Text className="text-[10px] font-medium text-green-700">Clear</Text>
            </View>
          )}
        </View>
        <View className="flex-row gap-1">
          {c.phone && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                Linking.openURL(`https://wa.me/91${c.phone!.replace(/\D/g, "")}`);
              }}
              className="w-7 h-7 rounded-full bg-green-100 items-center justify-center"
            >
              <Ionicons name="logo-whatsapp" size={14} color="#16a34a" />
            </TouchableOpacity>
          )}
          {c.phone && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                Linking.openURL(`tel:${c.phone}`);
              }}
              className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
            >
              <Ionicons name="call" size={12} color="#475569" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="px-4 pt-4 pb-2 border-b border-slate-200 bg-card">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xl font-bold tracking-tight text-slate-800">👥 Parties</Text>
          <View className="flex-row items-center gap-2">
            {tab === "customers" && (
              <TouchableOpacity
                onPress={() => navigation.navigate("Overdue")}
                activeOpacity={0.7}
                className="flex-row items-center gap-1.5 bg-red-50 border border-red-100 rounded-xl px-3 py-2"
              >
                <Text className="text-xs font-bold text-red-600">Udhaar List</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setMenuOpen(true)}
              className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row rounded-xl border bg-slate-100 p-1 gap-1">
          <TouchableOpacity
            onPress={() => setTab("customers")}
            className={`flex-1 flex-row items-center justify-center gap-2 py-2 rounded-lg ${tab === "customers" ? "bg-white shadow-sm" : ""}`}
          >
            <Ionicons name="people" size={18} color={tab === "customers" ? "#0f172a" : "#64748b"} />
            <Text className={`text-sm font-medium ${tab === "customers" ? "text-slate-800" : "text-slate-500"}`}>Customers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab("vendors")}
            className={`flex-1 flex-row items-center justify-center gap-2 py-2 rounded-lg ${tab === "vendors" ? "bg-white shadow-sm" : ""}`}
          >
            <Ionicons name="cube" size={18} color={tab === "vendors" ? "#0f172a" : "#64748b"} />
            <Text className={`text-sm font-medium ${tab === "vendors" ? "text-slate-800" : "text-slate-500"}`}>Vendors</Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === "customers" && (
        <>
          {/* Search */}
          <View className="px-4 py-2 border-b border-slate-100 bg-card">
            <View className="flex-row items-center border border-slate-200 rounded-xl bg-slate-50 px-3">
              <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name or phone…"
                placeholderTextColor="#94a3b8"
                className="flex-1 h-11 text-sm text-slate-800"
              />
              {isFetching && <ActivityIndicator size="small" color="#e67e22" />}
            </View>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
          >
            {/* Summary strip */}
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1 rounded-xl border bg-card p-3 items-center">
                <Ionicons name="people" size={20} color="#64748b" />
                <Text className="text-sm font-semibold text-slate-800 mt-0.5">{customers.length}</Text>
                <Text className="text-[10px] text-slate-500">Total</Text>
              </View>
              <View className="flex-1 rounded-xl border bg-card p-3 items-center">
                <Ionicons name="alert-circle" size={20} color="#dc2626" />
                <Text className="text-sm font-semibold text-red-600 mt-0.5">{outCount}</Text>
                <Text className="text-[10px] text-slate-500">Has Due</Text>
              </View>
              <View className="flex-1 rounded-xl border bg-card p-3 items-center">
                <Text className="text-sm font-bold text-red-600 mt-0.5">₹{inr(outstanding)}</Text>
                <Text className="text-[10px] text-slate-500">Outstanding</Text>
              </View>
            </View>

            {/* Filter tabs */}
            <View className="flex-row rounded-xl border bg-slate-100 p-1 gap-1 mb-3">
              {[
                { key: "all" as FilterTab, label: "All", count: customers.length },
                { key: "outstanding" as FilterTab, label: "Has Due", count: outCount },
                { key: "clear" as FilterTab, label: "Clear", count: clearCount },
                { key: "aging" as FilterTab, label: "Aging", count: agingCustomers.length },
              ].map(({ key, label, count }) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setFilter(key)}
                  className={`flex-1 items-center justify-center py-1.5 rounded-lg ${filter === key ? "bg-white shadow-sm" : ""}`}
                >
                  <Text className={`text-xs font-medium ${filter === key ? "text-slate-800" : "text-slate-500"}`}>{label}</Text>
                  <View className={`rounded-full px-1.5 py-0.5 mt-0.5 ${filter === key ? "bg-primary/10" : "bg-slate-200"}`}>
                    <Text className={`text-[10px] font-semibold ${filter === key ? "text-primary" : "text-slate-500"}`}>{count}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Aging buckets */}
            {filter === "aging" && (
              <View className="gap-3 mb-3">
                {agingCustomers.length === 0 ? (
                  <View className="rounded-xl border bg-card py-14 items-center">
                    <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
                    <Text className="text-sm text-slate-500 mt-2">No outstanding balances</Text>
                  </View>
                ) : (
                  agingBuckets.map(
                    (bucket) =>
                      bucket.items.length > 0 && (
                        <View key={bucket.label} className={`rounded-xl border overflow-hidden`}>
                          <View className={`flex-row items-center justify-between px-4 py-2 ${bucket.bg}`}>
                            <Text className={`text-sm font-semibold ${bucket.color}`}>{bucket.label}</Text>
                            <View className={`rounded-full px-2 py-0.5 ${bucket.bg}`}>
                              <Text className={`text-[10px] font-bold ${bucket.color}`}>{bucket.items.length}</Text>
                            </View>
                          </View>
                          <View className="bg-white">
                            {bucket.items.map((c) => renderCustomerRow(c))}
                          </View>
                        </View>
                      )
                  )
                )}
              </View>
            )}

            {/* Customer list */}
            {filter !== "aging" && (
              <View className="rounded-xl border bg-card overflow-hidden">
                {isError ? (
                  <View className="py-8 px-4">
                    <ErrorCard message="Failed to load customers" onRetry={() => refetch()} />
                  </View>
                ) : filtered.length === 0 ? (
                  <View className="py-14 items-center">
                    <EmptyState
                      icon={search ? "🔍" : "👥"}
                      title={search ? "No customers found" : "No customers yet"}
                      description={search ? "Try a different search" : "Add your first customer"}
                    />
                  </View>
                ) : (
                  filtered.map((c) => renderCustomerRow(c))
                )}
              </View>
            )}
          </ScrollView>

          {/* FAB */}
          <TouchableOpacity
            onPress={openAdd}
            className="absolute bottom-6 right-4 w-12 h-12 rounded-full bg-primary items-center justify-center shadow-lg"
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {tab === "vendors" && (
        <>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {/* Collect & Pay */}
          <View className="rounded-xl border bg-card p-3 mb-4">
            <Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Collect & Pay</Text>
            <View className="flex-row gap-2">
              <View className="flex-1 rounded-lg border border-red-200 bg-red-50 p-3 flex-row items-center gap-2">
                <Ionicons name="arrow-up" size={20} color="#dc2626" />
                <View>
                  <Text className="text-[10px] text-slate-500">To Pay</Text>
                  <Text className="text-sm font-bold text-red-600">₹{inr(toPay)}</Text>
                </View>
              </View>
              <View className="flex-1 rounded-lg border border-green-200 bg-green-50 p-3 flex-row items-center gap-2">
                <Ionicons name="arrow-down" size={20} color="#16a34a" />
                <View>
                  <Text className="text-[10px] text-slate-500">To Collect</Text>
                  <Text className="text-sm font-bold text-green-600">₹{inr(toCollect)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick links */}
          <View className="flex-row flex-wrap gap-2 mb-4">
            <TouchableOpacity
              onPress={() => tabNav?.navigate("MoreTab", { screen: "Purchases" })}
              className="flex-row items-center gap-1.5 border border-slate-200 rounded-xl px-4 py-2.5 bg-white"
            >
              <Ionicons name="cube" size={18} color="#64748b" />
              <Text className="text-sm font-medium text-slate-700">View Purchases</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => tabNav?.navigate("MoreTab", { screen: "Expenses" })}
              className="flex-row items-center gap-1.5 border border-slate-200 rounded-xl px-4 py-2.5 bg-white"
            >
              <Ionicons name="receipt" size={18} color="#64748b" />
              <Text className="text-sm font-medium text-slate-700">View Expenses</Text>
            </TouchableOpacity>
          </View>

          {/* Vendor search */}
          <View className="flex-row items-center border border-slate-200 rounded-xl bg-slate-50 px-3 mb-4">
            <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              value={vendorSearch}
              onChangeText={setVendorSearch}
              placeholder="Search vendors…"
              placeholderTextColor="#94a3b8"
              className="flex-1 h-11 text-sm text-slate-800"
            />
          </View>

          {/* Vendor list */}
          <View className="rounded-xl border bg-card overflow-hidden">
            {suppliers.length === 0 ? (
              <View className="py-14 items-center">
                <EmptyState
                  icon={vendorSearch ? "🔍" : "📦"}
                  title={vendorSearch ? "No vendors found" : "No vendors yet"}
                  description={vendorSearch ? "Try a different search" : "Add your first vendor"}
                  actionLabel="Add Vendor"
                  onAction={() => setAddVendorOpen(true)}
                />
              </View>
            ) : (
              suppliers.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  className="flex-row items-center justify-between p-4 border-b border-slate-100"
                  onPress={() => tabNav?.navigate("MoreTab", { screen: "Purchases" })}
                >
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-slate-800">{s.name}</Text>
                    {(s.companyName || s.phone) && (
                      <Text className="text-xs text-slate-500 mt-0.5">
                        {[s.companyName, s.phone].filter(Boolean).join(" · ")}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Add Vendor FAB */}
          <TouchableOpacity
            onPress={() => setAddVendorOpen(true)}
            className="absolute bottom-6 right-4 w-12 h-12 rounded-full bg-primary items-center justify-center shadow-lg"
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </ScrollView>

        {/* Add Vendor Modal */}
        <Modal visible={addVendorOpen} transparent animationType="slide">
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/40" onPress={() => setAddVendorOpen(false)} />
            <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8 max-h-[90%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-base font-bold text-slate-800 mb-4">Add Vendor</Text>
              <Text className="text-xs font-semibold text-slate-500 mb-1">Name *</Text>
              <TextInput value={vendorName} onChangeText={setVendorName} placeholder="e.g. Ramesh Traders" className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />
              <Text className="text-xs font-semibold text-slate-500 mb-1">Company Name</Text>
              <TextInput value={vendorCompany} onChangeText={setVendorCompany} placeholder="e.g. Ramesh Pvt Ltd" className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />
              <Text className="text-xs font-semibold text-slate-500 mb-1">Phone</Text>
              <TextInput value={vendorPhone} onChangeText={setVendorPhone} placeholder="10-digit mobile" keyboardType="phone-pad" className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />
              <Text className="text-xs font-semibold text-slate-500 mb-1">Email</Text>
              <TextInput value={vendorEmail} onChangeText={setVendorEmail} placeholder="email@example.com" keyboardType="email-address" className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />
              <Text className="text-xs font-semibold text-slate-500 mb-1">Address</Text>
              <TextInput value={vendorAddress} onChangeText={setVendorAddress} placeholder="Full address" className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-4" placeholderTextColor="#94a3b8" />
              <View className="flex-row gap-2">
                <TouchableOpacity onPress={() => setAddVendorOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-3 items-center">
                  <Text className="text-sm font-semibold text-slate-600">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddVendor}
                  disabled={!vendorName.trim() || createVendorMutation.isPending}
                  className={`flex-1 rounded-xl py-3 items-center ${vendorName.trim() && !createVendorMutation.isPending ? "bg-primary" : "bg-slate-300"}`}
                >
                  {createVendorMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-sm font-semibold text-white">Add Vendor</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
            </View>
          </View>
        </Modal>
        </>
      )}

      {/* Menu Modal */}
      <Modal visible={menuOpen} transparent animationType="fade">
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => setMenuOpen(false)} />
          <View className="bg-white rounded-t-2xl px-4 pt-4 pb-8 max-h-[70%]">
          <Text className="text-base font-bold text-slate-800 mb-4">
            {tab === "customers" ? "Customers" : "Vendors"}
          </Text>
          {tab === "customers" ? (
            <>
              <TouchableOpacity
                onPress={() => navigateToImport("customers")}
                className="flex-row items-center gap-3 py-3 border-b border-slate-100"
              >
                <Ionicons name="cloud-upload" size={22} color="#64748b" />
                <Text className="text-base text-slate-800">Import Customers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMenuOpen(false);
                  Alert.alert("Coming soon", "Merge customers feature is coming soon. You'll be able to combine duplicate customer records.");
                }}
                className="flex-row items-center gap-3 py-3 border-b border-slate-100"
              >
                <Ionicons name="git-merge" size={22} color="#64748b" />
                <Text className="text-base text-slate-800">Merge Customers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={exportCustomersCsv}
                className="flex-row items-center gap-3 py-3 border-b border-slate-100"
              >
                <Ionicons name="document-text" size={22} color="#64748b" />
                <Text className="text-base text-slate-800">Download Excel (CSV)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={exportCustomersPdf}
                className="flex-row items-center gap-3 py-3 border-b border-slate-100"
              >
                <Ionicons name="document" size={22} color="#64748b" />
                <Text className="text-base text-slate-800">Download PDF</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => navigateToImport("vendors")}
              className="flex-row items-center gap-3 py-3 border-b border-slate-100"
            >
              <Ionicons name="cloud-upload" size={22} color="#64748b" />
              <Text className="text-base text-slate-800">Import Vendors</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setMenuOpen(false)}
            className="mt-4 py-3 rounded-xl border border-slate-200 items-center"
          >
            <Text className="text-slate-600 font-medium">Cancel</Text>
          </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Customer Modal */}
      <Modal visible={addOpen} transparent animationType="slide">
        <Pressable className="flex-1 bg-black/40" onPress={() => setAddOpen(false)} />
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8 max-h-[90%]">
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-base font-bold text-slate-800 mb-4">Add Customer</Text>

            <Text className="text-xs font-semibold text-slate-500 mb-1">Name *</Text>
            <TextInput value={newName} onChangeText={setNewName} placeholder="e.g. Ramesh Kumar" className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />

            <Text className="text-xs font-semibold text-slate-500 mb-1">Phone</Text>
            <TextInput value={newPhone} onChangeText={setNewPhone} placeholder="10-digit mobile" keyboardType="phone-pad" className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />

            <Text className="text-xs font-semibold text-slate-500 mb-1">Email</Text>
            <TextInput value={newEmail} onChangeText={setNewEmail} placeholder="email@example.com" keyboardType="email-address" className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />

            <Text className="text-xs font-semibold text-slate-500 mb-1">Nickname</Text>
            <TextInput value={newNickname} onChangeText={setNewNickname} placeholder="e.g. Ramesh bhai" className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />

            <Text className="text-xs font-semibold text-slate-500 mb-1">Landmark / Area</Text>
            <TextInput value={newLandmark} onChangeText={setNewLandmark} placeholder="e.g. near Rajiv Chowk" className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />

            <Text className="text-xs font-semibold text-slate-500 mb-1">Opening Balance ₹</Text>
            <TextInput value={newOpeningBal} onChangeText={setNewOpeningBal} placeholder="0.00" keyboardType="decimal-pad" className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />

            <Text className="text-xs font-semibold text-slate-500 mb-1">Credit Limit ₹</Text>
            <TextInput value={newCreditLimit} onChangeText={setNewCreditLimit} placeholder="No limit" keyboardType="decimal-pad" className="border border-slate-200 rounded-xl px-3 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />

            <Text className="text-xs font-semibold text-slate-500 mb-1">Notes</Text>
            <TextInput value={newNotes} onChangeText={setNewNotes} placeholder="Any notes…" multiline className="border border-slate-200 rounded-xl px-3 py-3 text-base text-slate-800 min-h-[60px] mb-3" placeholderTextColor="#94a3b8" />

            <Text className="text-xs font-semibold text-slate-500 mb-1.5">Tags</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {CUSTOMER_TAGS.map((tag) => {
                const active = newTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    className={`rounded-full border px-3 py-1.5 ${active ? "border-primary bg-primary/10" : "border-slate-200 bg-slate-50"}`}
                  >
                    <Text className={`text-xs font-medium ${active ? "text-primary" : "text-slate-500"}`}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => setAddOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-3 items-center">
                <Text className="text-sm font-semibold text-slate-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdd}
                disabled={!newName.trim() || createMutation.isPending}
                className={`flex-1 rounded-xl py-3 items-center ${newName.trim() && !createMutation.isPending ? "bg-primary" : "bg-slate-300"}`}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-sm font-semibold text-white">Add Customer</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
