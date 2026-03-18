/**
 * PartiesScreen — Customers + Vendors tabs (matches web Parties.tsx).
 * Modern UI/UX: TYPO scale, 44pt touch targets (iOS HIG), 8px spacing grid.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { TYPO } from "../lib/typography";
import type { CustomersStackParams } from "../navigation";

const MIN_TOUCH = 44;
const SPACING = 16;

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

  function getTabNav() {
    try {
      return (navigation.getParent as any)?.();
    } catch {
      return undefined;
    }
  }

  function navigateToImport(type: "customers" | "vendors") {
    setMenuOpen(false);
    getTabNav()?.navigate("MoreTab", { screen: "Import", params: { type } });
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
    const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };
    return (
      <Pressable
        key={c.id}
        className="flex-row items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white"
        onPress={() => navigation.navigate("CustomerDetail", { id: c.id })}
        style={({ pressed }) => ({ backgroundColor: pressed ? "#f8fafc" : "#fff" })}
      >
        <View className={`w-12 h-12 rounded-full items-center justify-center ${hasOutstanding ? "bg-red-50" : "bg-green-50"}`}>
          <Text className={`font-bold text-base ${hasOutstanding ? "text-red-600" : "text-green-600"}`}>
            {c.name?.charAt(0)?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 min-w-0">
            <Text className={`${TYPO.labelBold} flex-1 min-w-0`} numberOfLines={1}>{c.name}</Text>
            {((c as any).tags ?? []).includes("VIP") && (
              <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-semibold text-amber-700">VIP</Text>
              </View>
            )}
            {((c as any).tags ?? []).includes("Blacklist") && (
              <Text className="text-xs">⛔</Text>
            )}
          </View>
          <Text className={`${TYPO.caption} min-w-0`} numberOfLines={1}>
            {filter === "aging"
              ? ageDays === 0 ? "Today" : `${ageDays}d overdue`
              : c.phone ?? "No phone"}
            {filter === "aging" && c.phone ? ` · ${c.phone}` : ""}
          </Text>
        </View>
        <View className="items-end min-w-[4rem]">
          {hasOutstanding ? (
            <Text className="text-sm font-bold tabular-nums text-red-600">₹{inr(balance)}</Text>
          ) : (
            <View className="flex-row items-center gap-1 bg-green-50 px-2.5 py-1 rounded-full">
              <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
              <Text className="text-[11px] font-medium text-green-700">Clear</Text>
            </View>
          )}
        </View>
        <View className="flex-row gap-1">
          {c.phone && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                Linking.openURL(`https://wa.me/91${c.phone!.replace(/\D/g, "")}`);
              }}
              hitSlop={hitSlop}
              className="w-10 h-10 rounded-full bg-green-50 items-center justify-center"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#16a34a" />
            </Pressable>
          )}
          {c.phone && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                Linking.openURL(`tel:${c.phone}`);
              }}
              hitSlop={hitSlop}
              className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Ionicons name="call" size={16} color="#475569" />
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      {/* Header — TYPO scale, 8px grid */}
      <View className="px-4 pt-4 pb-3 border-b border-slate-200/80 bg-white">
        <View className="flex-row items-center justify-between mb-4">
          <Text className={TYPO.pageTitle}>Parties</Text>
          <View className="flex-row items-center gap-2">
            {tab === "customers" && (
              <Pressable
                onPress={() => navigation.navigate("Overdue")}
                className="flex-row items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 min-h-[44]"
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <Ionicons name="alert-circle" size={16} color="#dc2626" />
                <Text className="text-xs font-bold text-red-600">Udhaar</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setMenuOpen(true)}
              className="w-11 h-11 rounded-full bg-slate-100 items-center justify-center"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#475569" />
            </Pressable>
          </View>
        </View>

        {/* Segmented control — 44pt touch targets */}
        <View className="flex-row rounded-2xl bg-slate-100 p-1">
          <Pressable
            onPress={() => setTab("customers")}
            className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl min-h-[44] ${tab === "customers" ? "bg-white shadow-sm" : ""}`}
            style={({ pressed }) => ({ opacity: pressed && tab !== "customers" ? 0.7 : 1 })}
          >
            <Ionicons name="people" size={20} color={tab === "customers" ? "#0f172a" : "#64748b"} />
            <Text className={`text-sm font-semibold ${tab === "customers" ? "text-slate-800" : "text-slate-500"}`}>Customers</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("vendors")}
            className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl min-h-[44] ${tab === "vendors" ? "bg-white shadow-sm" : ""}`}
            style={({ pressed }) => ({ opacity: pressed && tab !== "vendors" ? 0.7 : 1 })}
          >
            <Ionicons name="cube" size={20} color={tab === "vendors" ? "#0f172a" : "#64748b"} />
            <Text className={`text-sm font-semibold ${tab === "vendors" ? "text-slate-800" : "text-slate-500"}`}>Vendors</Text>
          </Pressable>
        </View>
      </View>

      {tab === "customers" && (
        <>
          {/* Search — 48pt min height for touch */}
          <View className="px-4 py-3 bg-white border-b border-slate-100">
            <View className="flex-row items-center rounded-2xl bg-slate-100 px-4 min-h-[48]">
              <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 12 }} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name or phone…"
                placeholderTextColor="#94a3b8"
                className="flex-1 text-base text-slate-800 py-0"
              />
              {isFetching && <ActivityIndicator size="small" color="#e67e22" />}
            </View>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: SPACING, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#e67e22" />}
          >
            {/* Summary cards — visual hierarchy */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 rounded-2xl bg-white border border-slate-200/80 p-4 items-center shadow-sm">
                <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mb-2">
                  <Ionicons name="people" size={20} color="#64748b" />
                </View>
                <Text className={TYPO.value}>{customers.length}</Text>
                <Text className={TYPO.caption}>Total</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-white border border-red-100 p-4 items-center shadow-sm">
                <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mb-2">
                  <Ionicons name="alert-circle" size={20} color="#dc2626" />
                </View>
                <Text className="text-base font-bold text-red-600">{outCount}</Text>
                <Text className={TYPO.caption}>Has Due</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-white border border-red-100 p-4 items-center shadow-sm">
                <Text className="text-base font-bold text-red-600 mb-0.5">₹{inr(outstanding)}</Text>
                <Text className={TYPO.caption}>Outstanding</Text>
              </View>
            </View>

            {/* Filter chips — 44pt touch targets */}
            <View className="flex-row rounded-2xl bg-slate-100 p-1 mb-4">
              {[
                { key: "all" as FilterTab, label: "All", count: customers.length },
                { key: "outstanding" as FilterTab, label: "Has Due", count: outCount },
                { key: "clear" as FilterTab, label: "Clear", count: clearCount },
                { key: "aging" as FilterTab, label: "Aging", count: agingCustomers.length },
              ].map(({ key, label, count }) => (
                <Pressable
                  key={key}
                  onPress={() => setFilter(key)}
                  className={`flex-1 items-center justify-center py-2.5 rounded-xl min-h-[44] ${filter === key ? "bg-white shadow-sm" : ""}`}
                  style={({ pressed }) => ({ opacity: pressed && filter !== key ? 0.7 : 1 })}
                >
                  <Text className={`text-xs font-semibold ${filter === key ? "text-slate-800" : "text-slate-500"}`}>{label}</Text>
                  <View className={`rounded-full px-2 py-0.5 mt-1 ${filter === key ? "bg-primary/15" : "bg-slate-200"}`}>
                    <Text className={`text-[11px] font-bold ${filter === key ? "text-primary" : "text-slate-500"}`}>{count}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Aging buckets */}
            {filter === "aging" && (
              <View className="gap-4 mb-4">
                {agingCustomers.length === 0 ? (
                  <View className="rounded-2xl border border-slate-200/80 bg-white py-16 items-center shadow-sm">
                    <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center mb-3">
                      <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
                    </View>
                    <Text className={TYPO.bodyMuted}>No outstanding balances</Text>
                  </View>
                ) : (
                  agingBuckets.map(
                    (bucket) =>
                      bucket.items.length > 0 && (
                        <View key={bucket.label} className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm mb-4">
                          <View className={`flex-row items-center justify-between px-4 py-3 ${bucket.bg}`}>
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
              <View className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
                {isError ? (
                  <View className="py-8 px-4">
                    <ErrorCard message="Failed to load customers" onRetry={() => refetch()} />
                  </View>
                ) : filtered.length === 0 ? (
                  <View className="py-14 items-center rounded-2xl bg-white border border-slate-200/80">
                    <EmptyState
                      iconName={search ? "search-outline" : "people-outline"}
                      title={search ? "No customers found" : "No customers yet"}
                      description={search ? "Try a different search" : "Add your first customer"}
                      actionLabel={!search ? "Add Customer" : undefined}
                      onAction={!search ? openAdd : undefined}
                    />
                  </View>
                ) : (
                  filtered.map((c) => renderCustomerRow(c))
                )}
              </View>
            )}
          </ScrollView>

          {/* FAB — 56pt for prominence (Material Design) */}
          <Pressable
            onPress={openAdd}
            className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </>
      )}

      {tab === "vendors" && (
        <>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: SPACING, paddingBottom: 100 }}>
          {/* Collect & Pay */}
          <View className="rounded-2xl border border-slate-200/80 bg-white p-4 mb-4 shadow-sm">
            <Text className={TYPO.sectionTitle}>Collect & Pay</Text>
            <View className="flex-row gap-3 mt-3">
              <View className="flex-1 rounded-xl border border-red-100 bg-red-50 p-4 flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center">
                  <Ionicons name="arrow-up" size={20} color="#dc2626" />
                </View>
                <View>
                  <Text className={TYPO.caption}>To Pay</Text>
                  <Text className="text-base font-bold text-red-600">₹{inr(toPay)}</Text>
                </View>
              </View>
              <View className="flex-1 rounded-xl border border-green-100 bg-green-50 p-4 flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center">
                  <Ionicons name="arrow-down" size={20} color="#16a34a" />
                </View>
                <View>
                  <Text className={TYPO.caption}>To Collect</Text>
                  <Text className="text-base font-bold text-green-600">₹{inr(toCollect)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick links — 44pt touch targets */}
          <View className="flex-row flex-wrap gap-3 mb-4">
            <Pressable
              onPress={() => getTabNav()?.navigate("MoreTab", { screen: "Purchases" })}
              className="flex-row items-center gap-2 border border-slate-200 rounded-xl px-4 py-3 min-h-[44] bg-white"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Ionicons name="cube" size={20} color="#64748b" />
              <Text className={TYPO.body}>View Purchases</Text>
            </Pressable>
            <Pressable
              onPress={() => getTabNav()?.navigate("MoreTab", { screen: "Expenses" })}
              className="flex-row items-center gap-2 border border-slate-200 rounded-xl px-4 py-3 min-h-[44] bg-white"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Ionicons name="receipt" size={20} color="#64748b" />
              <Text className={TYPO.body}>View Expenses</Text>
            </Pressable>
          </View>

          {/* Vendor search */}
          <View className="flex-row items-center rounded-2xl bg-slate-100 px-4 min-h-[48] mb-4">
            <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 12 }} />
            <TextInput
              value={vendorSearch}
              onChangeText={setVendorSearch}
              placeholder="Search vendors…"
              placeholderTextColor="#94a3b8"
              className="flex-1 text-base text-slate-800 py-0"
            />
          </View>

          {/* Vendor list */}
          <View className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
            {suppliers.length === 0 ? (
              <View className="py-14 items-center">
                <EmptyState
                  iconName={vendorSearch ? "search-outline" : "cube-outline"}
                  title={vendorSearch ? "No vendors found" : "No vendors yet"}
                  description={vendorSearch ? "Try a different search" : "Add your first vendor"}
                  actionLabel="Add Vendor"
                  onAction={() => setAddVendorOpen(true)}
                />
              </View>
            ) : (
              suppliers.map((s) => (
                <Pressable
                  key={s.id}
                  className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100 min-h-[56]"
                  onPress={() => getTabNav()?.navigate("MoreTab", { screen: "Purchases" })}
                  style={({ pressed }) => ({ backgroundColor: pressed ? "#f8fafc" : "#fff" })}
                >
                  <View className="flex-1 min-w-0">
                    <Text className={TYPO.labelBold} numberOfLines={1}>{s.name}</Text>
                    {(s.companyName || s.phone) && (
                      <Text className={TYPO.caption} numberOfLines={1}>
                        {[s.companyName, s.phone].filter(Boolean).join(" · ")}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </Pressable>
              ))
            )}
          </View>

          {/* Add Vendor FAB */}
          <Pressable
            onPress={() => setAddVendorOpen(true)}
            className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </ScrollView>

        {/* Add Vendor Modal */}
        <Modal visible={addVendorOpen} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/50" onPress={() => setAddVendorOpen(false)} />
            <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[90%]">
            <View className="w-10 h-1 rounded-full bg-slate-200 self-center mb-4" />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text className={TYPO.pageTitle + " mb-4"}>Add Vendor</Text>
              <Text className={TYPO.label + " mb-1"}>Name *</Text>
              <TextInput value={vendorName} onChangeText={setVendorName} placeholder="e.g. Ramesh Traders" className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />
              <Text className={TYPO.label + " mb-1"}>Company Name</Text>
              <TextInput value={vendorCompany} onChangeText={setVendorCompany} placeholder="e.g. Ramesh Pvt Ltd" className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />
              <Text className={TYPO.label + " mb-1"}>Phone</Text>
              <TextInput value={vendorPhone} onChangeText={setVendorPhone} placeholder="10-digit mobile" keyboardType="phone-pad" className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />
              <Text className={TYPO.label + " mb-1"}>Email</Text>
              <TextInput value={vendorEmail} onChangeText={setVendorEmail} placeholder="email@example.com" keyboardType="email-address" className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />
              <Text className={TYPO.label + " mb-1"}>Address</Text>
              <TextInput value={vendorAddress} onChangeText={setVendorAddress} placeholder="Full address" className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-4" placeholderTextColor="#94a3b8" />
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
          </KeyboardAvoidingView>
        </Modal>
        </>
      )}

      {/* Menu Modal — bottom sheet */}
      <Modal visible={menuOpen} transparent animationType="fade">
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/50" onPress={() => setMenuOpen(false)} />
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[70%]">
          <View className="w-10 h-1 rounded-full bg-slate-200 self-center mb-4" />
          <Text className={TYPO.pageTitle + " mb-4"}>
            {tab === "customers" ? "Customers" : "Vendors"}
          </Text>
          {tab === "customers" ? (
            <>
              <Pressable onPress={() => navigateToImport("customers")} className="flex-row items-center gap-3 py-3.5 min-h-[48] border-b border-slate-100" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="cloud-upload" size={22} color="#64748b" />
                <Text className={TYPO.body}>Import Customers</Text>
              </Pressable>
              <Pressable onPress={() => { setMenuOpen(false); Alert.alert("Coming soon", "Merge customers feature is coming soon."); }} className="flex-row items-center gap-3 py-3.5 min-h-[48] border-b border-slate-100" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="git-merge" size={22} color="#64748b" />
                <Text className={TYPO.body}>Merge Customers</Text>
              </Pressable>
              <Pressable onPress={exportCustomersCsv} className="flex-row items-center gap-3 py-3.5 min-h-[48] border-b border-slate-100" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="document-text" size={22} color="#64748b" />
                <Text className={TYPO.body}>Download Excel (CSV)</Text>
              </Pressable>
              <Pressable onPress={exportCustomersPdf} className="flex-row items-center gap-3 py-3.5 min-h-[48] border-b border-slate-100" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="document" size={22} color="#64748b" />
                <Text className={TYPO.body}>Download PDF</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => navigateToImport("vendors")} className="flex-row items-center gap-3 py-3.5 min-h-[48] border-b border-slate-100" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Ionicons name="cloud-upload" size={22} color="#64748b" />
              <Text className={TYPO.body}>Import Vendors</Text>
            </Pressable>
          )}
          <Pressable onPress={() => setMenuOpen(false)} className="mt-5 py-3.5 rounded-xl border border-slate-200 items-center min-h-[44]" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Text className={TYPO.body}>Cancel</Text>
          </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add Customer Modal — KeyboardAvoidingView per React Native docs */}
      <Modal visible={addOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/50" onPress={() => setAddOpen(false)} />
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[90%]">
          <View className="w-10 h-1 rounded-full bg-slate-200 self-center mb-4" />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text className={TYPO.pageTitle + " mb-4"}>Add Customer</Text>

            <Text className={TYPO.label + " mb-1"}>Name *</Text>
            <TextInput value={newName} onChangeText={setNewName} placeholder="e.g. Ramesh Kumar" className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />

            <Text className={TYPO.label + " mb-1"}>Phone</Text>
            <TextInput value={newPhone} onChangeText={setNewPhone} placeholder="10-digit mobile" keyboardType="phone-pad" className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />

            <Text className={TYPO.label + " mb-1"}>Email</Text>
            <TextInput value={newEmail} onChangeText={setNewEmail} placeholder="email@example.com" keyboardType="email-address" className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />

            <Text className={TYPO.label + " mb-1"}>Nickname</Text>
            <TextInput value={newNickname} onChangeText={setNewNickname} placeholder="e.g. Ramesh bhai" className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />

            <Text className={TYPO.label + " mb-1"}>Landmark / Area</Text>
            <TextInput value={newLandmark} onChangeText={setNewLandmark} placeholder="e.g. near Rajiv Chowk" className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />

            <Text className={TYPO.label + " mb-1"}>Opening Balance ₹</Text>
            <TextInput value={newOpeningBal} onChangeText={setNewOpeningBal} placeholder="0.00" keyboardType="decimal-pad" className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />

            <Text className={TYPO.label + " mb-1"}>Credit Limit ₹</Text>
            <TextInput value={newCreditLimit} onChangeText={setNewCreditLimit} placeholder="No limit" keyboardType="decimal-pad" className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3" placeholderTextColor="#94a3b8" />

            <Text className={TYPO.label + " mb-1"}>Notes</Text>
            <TextInput value={newNotes} onChangeText={setNewNotes} placeholder="Any notes…" multiline className="border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800 min-h-[60px] mb-3" placeholderTextColor="#94a3b8" />

            <Text className={TYPO.label + " mb-2"}>Tags</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
                  {CUSTOMER_TAGS.map((tag) => {
                const active = newTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    className={`rounded-full border px-4 py-2 min-h-[36] items-center justify-center ${active ? "border-primary bg-primary/10" : "border-slate-200 bg-slate-50"}`}
                    style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                  >
                    <Text className={`text-xs font-semibold ${active ? "text-primary" : "text-slate-500"}`}>{tag}</Text>
                  </Pressable>
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
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
