/**
 * PartiesScreen — Customers + Suppliers tabs (matches web Parties.tsx).
 * Modern UI/UX: TYPO scale, 44pt touch targets (iOS HIG), 8px spacing grid.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { showAlert } from "../../../lib/alerts";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerApi, customerExtApi } from ".."; // Customer APIs from feature;
import { purchaseApi, invoiceApi, supplierApi } from "../../../lib/api"; // Cross-feature APIs from compatibility shell
import { useWsInvalidation } from "../../../hooks/useWsInvalidation";
import { useResponsive } from "../../../hooks/useResponsive";
import { inr, type Customer } from "@execora/shared";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorCard } from "../../../components/ui/ErrorCard";
import { Skeleton } from "../../../components/ui/Skeleton";
import { ScreenInner } from "../../../components/ui/ScreenLayout";
import { FilterBar } from "../../../components/composites/FilterBar";
import { TabBar, type TabItem } from "../../../components/composites/TabBar";
import { TYPO } from "../../../lib/typography";
import type { PartiesStackParams } from "../../../navigation";

const MIN_TOUCH = 44;

type Tab = "customers" | "suppliers";
type FilterTab = "all" | "outstanding" | "clear" | "aging";

const CUSTOMER_TAGS = ["VIP", "Wholesale", "Blacklist", "Regular"] as const;
const PARTY_TABS: TabItem[] = [
  { id: "customers", label: "Customers", icon: "people" },
  { id: "suppliers", label: "Suppliers", icon: "cube" },
];

type Props = NativeStackScreenProps<PartiesStackParams, "Parties">;

export function PartiesScreen({ navigation, route }: Props) {
  const qc = useQueryClient();
  const { width, contentPad, contentWidth } = useResponsive();
  const insets = useSafeAreaInsets();
  const fabBottom = Math.max(insets.bottom + 16, 20);
  const fabRight = Math.max(
    contentPad,
    (width - contentWidth) / 2 + contentPad,
  );
  useWsInvalidation(["customers", "summary"]);

  const toWhatsAppNumber = useCallback((phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return digits;
    return digits;
  }, []);

  const initialTab: Tab =
    route.params?.initialTab === "suppliers" ? "suppliers" : "customers";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const customerSearchInputRef = useRef<TextInput>(null);
  const supplierSearchInputRef = useRef<TextInput>(null);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);

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

  // Add Supplier form
  const [supplierName, setSupplierName] = useState("");
  const [supplierCompany, setSupplierCompany] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const openSearch = useCallback(() => {
    setShowSearch(true);
    setTimeout(() => {
      if (tab === "suppliers") {
        supplierSearchInputRef.current?.focus();
      } else {
        customerSearchInputRef.current?.focus();
      }
    }, 80);
  }, [tab]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    if (tab === "suppliers") {
      setSupplierSearch("");
    } else {
      setSearch("");
    }
  }, [tab]);

  // ── Queries ─────────────────────────────────────────────────────────────

  const {
    data: custData,
    isFetching,
    isError,
    refetch,
  } = useQuery({
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

  const {
    data: supplierData,
    isFetching: isSuppliersFetching,
    isError: isSuppliersError,
    refetch: refetchSuppliers,
  } = useQuery({
    queryKey: ["suppliers", supplierSearch],
    queryFn: () =>
      supplierApi.list({ q: supplierSearch || undefined, limit: 200 }),
    staleTime: 30_000,
    enabled: tab === "suppliers",
  });

  const customers: Customer[] = custData?.customers ?? [];
  const suppliers = supplierData?.suppliers ?? [];
  const purchases = purchaseData?.purchases ?? [];
  const invoices = invoiceData?.invoices ?? [];

  const supplierPurchaseTotal = purchases.reduce(
    (sum, p) => sum + (parseFloat(String(p.amount)) || 0),
    0,
  );
  const supplierPurchaseCount = purchases.length;

  // ── Aging (from web) ───────────────────────────────────────────────────

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const agingMap = new Map<string, number>();
  for (const inv of invoices) {
    if ((inv as any).status === "paid" || (inv as any).status === "cancelled")
      continue;
    const remaining =
      parseFloat(String((inv as any).total)) -
      parseFloat(String((inv as any).paidAmount ?? 0));
    if (remaining <= 0) continue;
    const invDate = new Date(
      (inv as any).invoiceDate ?? (inv as any).createdAt,
    );
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
    {
      label: "60+ Days",
      sublabel: "Very Overdue",
      color: "text-red-600",
      bg: "bg-red-100",
      items: agingCustomers.filter((c) => (c as any).ageDays >= 60),
    },
    {
      label: "31–60 Days",
      sublabel: "Overdue",
      color: "text-orange-600",
      bg: "bg-orange-100",
      items: agingCustomers.filter(
        (c) => (c as any).ageDays >= 31 && (c as any).ageDays < 60,
      ),
    },
    {
      label: "0–30 Days",
      sublabel: "Fresh",
      color: "text-green-600",
      bg: "bg-green-100",
      items: agingCustomers.filter((c) => (c as any).ageDays < 31),
    },
  ];

  const outstanding = customers.reduce(
    (s, c) => s + Math.max(0, parseFloat(String(c.balance))),
    0,
  );
  const customerToPay = customers.reduce((sum, c) => {
    const balance = parseFloat(String(c.balance));
    return sum + Math.max(0, -balance);
  }, 0);
  const customerToCollect = outstanding;
  const outCount = customers.filter(
    (c) => parseFloat(String(c.balance)) > 0,
  ).length;
  const toPayCount = customers.filter(
    (c) => parseFloat(String(c.balance)) < 0,
  ).length;

  const filtered = [...customers]
    .filter((c) => {
      const bal = parseFloat(String(c.balance));
      if (filter === "outstanding") return bal > 0;
      if (filter === "clear") return bal < 0;
      return true;
    })
    .sort(
      (a, b) => parseFloat(String(b.balance)) - parseFloat(String(a.balance)),
    );

  const customerFilterOptions = useMemo(
    () => [
      { id: "all", label: `All (${customers.length})` },
      { id: "clear", label: `To Pay (${toPayCount})` },
      { id: "outstanding", label: `To Collect (${outCount})` },
      { id: "aging", label: `Aging (${agingCustomers.length})` },
    ],
    [agingCustomers.length, customers.length, outCount, toPayCount],
  );

  const activeCustomerFilters = useMemo(
    () =>
      customerFilterOptions
        .filter((option) => option.id === filter)
        .map((option) => ({ id: option.id, label: option.label })),
    [customerFilterOptions, filter],
  );

  const customerListData = useMemo(
    () => (filter === "aging" ? agingCustomers : filtered),
    [agingCustomers, filter, filtered],
  );

  const isCustomersInitialLoading = isFetching && !custData;
  const isSuppliersInitialLoading =
    tab === "suppliers" && isSuppliersFetching && !supplierData;

  // ── Mutations ──────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: any) => customerExtApi.create(data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setAddOpen(false);
      const customer = res?.customer;
      if (customer?.id) navigation.navigate("PartyDetail", { id: customer.id });
      showAlert("", `${newName} added`);
    },
    onError: () => showAlert("Error", "Failed to add customer"),
  });

  const openAdd = useCallback(() => {
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
  }, []);

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
    setNewTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  // ── Export & Import helpers ─────────────────────────────────────────────

  function getTabNav() {
    try {
      return navigation.getParent() as any;
    } catch {
      return undefined;
    }
  }

  const openAddSupplier = useCallback(() => {
    setAddSupplierOpen(true);
  }, []);

  function navigateToImport(type: "customers" | "suppliers") {
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
    const rows = customers.map((c: any) => [
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
          `<tr><td>${i + 1}</td><td>${escapeHtml(c.name ?? "")}</td><td>${escapeHtml(c.phone ?? "")}</td><td>₹${inr(parseFloat(String(c.balance ?? 0)))}</td></tr>`,
      )
      .join("");
    const html = `<html><head><meta charset="utf-8"/><style>body{font-family:system-ui,sans-serif;padding:24px;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body><h1>Customers (${customers.length})</h1><table><tr><th>#</th><th>Name</th><th>Phone</th><th>Balance</th></tr>${rows}</table></body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Share customers.pdf",
    });
    setMenuOpen(false);
  }

  const createSupplierMutation = useMutation({
    mutationFn: (data: any) => supplierApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setAddSupplierOpen(false);
      setSupplierName("");
      setSupplierCompany("");
      setSupplierPhone("");
      setSupplierEmail("");
      setSupplierAddress("");
      showAlert("", "Supplier added");
    },
    onError: () => showAlert("Error", "Failed to add supplier"),
  });

  function handleAddSupplier() {
    if (!supplierName.trim()) return;
    createSupplierMutation.mutate({
      name: supplierName.trim(),
      companyName: supplierCompany || undefined,
      phone: supplierPhone || undefined,
      email: supplierEmail || undefined,
      address: supplierAddress || undefined,
    });
  }

  function openBulkReminder() {
    setMenuOpen(false);
    navigation.navigate("BulkReminder");
  }

  // ── Render customer row ─────────────────────────────────────────────────

  const renderCustomerRow = useCallback(
    (c: Customer & { ageDays?: number }) => {
      const balance = parseFloat(String(c.balance));
      const hasOutstanding = balance > 0;
      const ageDays = (c as any).ageDays ?? 0;
      const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };
      return (
        <Pressable
          key={c.id}
          className="min-h-[74] flex-row items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white"
          accessibilityRole="button"
          accessibilityLabel={`Open ${c.name} details`}
          onPress={() => navigation.navigate("PartyDetail", { id: c.id })}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#f8fafc" : "#fff",
          })}
        >
          <View
            className={`w-12 h-12 rounded-full items-center justify-center ${hasOutstanding ? "bg-red-50" : "bg-green-50"}`}
          >
            <Text
              className={`font-bold text-base ${hasOutstanding ? "text-red-600" : "text-green-600"}`}
            >
              {c.name?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View className="flex-1 min-w-0 justify-center pr-2">
            <View className="flex-row items-center gap-2 min-w-0">
              <Text
                className={`${TYPO.labelBold} flex-1 min-w-0`}
                numberOfLines={1}
              >
                {c.name}
              </Text>
              {((c as any).tags ?? []).includes("VIP") && (
                <View className="bg-amber-100 px-1.5 py-0.5 rounded-full">
                  <Text className="text-[10px] font-semibold text-amber-700">
                    VIP
                  </Text>
                </View>
              )}
              {((c as any).tags ?? []).includes("Blacklist") && (
                <Text className="text-xs">⛔</Text>
              )}
            </View>
            <Text className={`${TYPO.caption} min-w-0`} numberOfLines={1}>
              {filter === "aging"
                ? ageDays === 0
                  ? "Today"
                  : `${ageDays}d overdue`
                : (c.phone ?? "No phone")}
              {filter === "aging" && c.phone ? ` · ${c.phone}` : ""}
            </Text>
          </View>
          <View className="w-[88px] items-end justify-center">
            {hasOutstanding ? (
              <Text className="text-sm font-bold tabular-nums text-red-600">
                ₹{inr(balance)}
              </Text>
            ) : (
              <View className="flex-row items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
                <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                <Text className="text-[11px] font-medium text-green-700">
                  Clear
                </Text>
              </View>
            )}
          </View>
          <View className="w-[44px] items-end justify-center">
            {c.phone ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  Linking.openURL(
                    `https://wa.me/${toWhatsAppNumber(c.phone!)}`,
                  );
                }}
                accessibilityRole="button"
                accessibilityLabel={`Send WhatsApp message to ${c.name}`}
                hitSlop={hitSlop}
                className="w-10 h-10 rounded-full bg-green-50 items-center justify-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#16a34a" />
              </Pressable>
            ) : (
              <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </View>
            )}
          </View>
        </Pressable>
      );
    },
    [filter, navigation, toWhatsAppNumber],
  );

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      {/* Header — TYPO scale, 8px grid */}
      <View
        className="pt-3 pb-2 border-b border-slate-200/80 bg-white"
        style={{ paddingHorizontal: contentPad }}
      >
        <ScreenInner>
          {showSearch ? (
            <View className="flex-row items-center gap-2 mb-3">
              <View className="flex-1 flex-row items-center bg-slate-100 rounded-xl px-3 min-h-[44]">
                <Ionicons
                  name="search"
                  size={17}
                  color="#64748b"
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  ref={
                    tab === "suppliers"
                      ? supplierSearchInputRef
                      : customerSearchInputRef
                  }
                  value={tab === "suppliers" ? supplierSearch : search}
                  onChangeText={
                    tab === "suppliers" ? setSupplierSearch : setSearch
                  }
                  placeholder={
                    tab === "suppliers"
                      ? "Search suppliers…"
                      : "Search by name or phone…"
                  }
                  accessibilityLabel={
                    tab === "suppliers"
                      ? "Search suppliers"
                      : "Search customers"
                  }
                  placeholderTextColor="#94a3b8"
                  className="flex-1 text-sm text-slate-800 py-2"
                  autoCorrect={false}
                  autoCapitalize="none"
                  spellCheck={false}
                  returnKeyType="search"
                />
                {(tab === "suppliers" ? isSuppliersFetching : isFetching) && (
                  <ActivityIndicator size="small" color="#e67e22" />
                )}
              </View>
              <Pressable
                onPress={closeSearch}
                accessibilityRole="button"
                accessibilityLabel="Close search"
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#e2e8f0" : "#f1f5f9",
                })}
              >
                <Ionicons name="close" size={18} color="#475569" />
              </Pressable>
            </View>
          ) : (
            <View className="flex-row items-center justify-between mb-3">
              <Text className={TYPO.pageTitle}>Parties</Text>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={openSearch}
                  className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Search parties"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="search" size={18} color="#475569" />
                </Pressable>
                <Pressable
                  onPress={() => setMenuOpen(true)}
                  className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Open parties menu"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color="#475569"
                  />
                </Pressable>
              </View>
            </View>
          )}

          <TabBar
            tabs={PARTY_TABS}
            activeTab={tab}
            onChange={(nextTab) => setTab(nextTab as Tab)}
            variant="pills"
            equalWidth
            className="w-full rounded-xl bg-slate-100 p-0.5"
          />
        </ScreenInner>
      </View>

      {tab === "customers" && (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              padding: contentPad,
              paddingBottom: 100,
              alignItems: "center",
            }}
            refreshControl={
              <RefreshControl
                refreshing={isFetching}
                onRefresh={refetch}
                tintColor="#e67e22"
              />
            }
          >
            <ScreenInner>
              {/* Summary cards — visual hierarchy */}
              <View className="rounded-xl border border-slate-200/80 bg-white p-2 mb-2.5 shadow-sm">
                <View className="flex-row gap-1.5">
                  <View className="flex-1 rounded-lg border border-red-100 bg-red-50 px-2 py-1.5 flex-row items-center gap-1.5">
                    <View className="w-5 h-5 rounded-full bg-red-100 items-center justify-center">
                      <Ionicons name="arrow-up" size={11} color="#dc2626" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-[10px] font-medium text-red-600">
                        To Pay
                      </Text>
                      <Text
                        className="text-[11px] font-bold text-red-700"
                        numberOfLines={1}
                      >
                        ₹{inr(customerToPay)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-1 rounded-lg border border-green-100 bg-green-50 px-2 py-1.5 flex-row items-center gap-1.5">
                    <View className="w-5 h-5 rounded-full bg-green-100 items-center justify-center">
                      <Ionicons name="arrow-down" size={11} color="#16a34a" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-[10px] font-medium text-green-600">
                        To Collect
                      </Text>
                      <Text
                        className="text-[11px] font-bold text-green-700"
                        numberOfLines={1}
                      >
                        ₹{inr(customerToCollect)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <FilterBar
                options={customerFilterOptions}
                activeFilters={activeCustomerFilters}
                onFilterChange={(nextFilter, toRemove) => {
                  requestAnimationFrame(() => {
                    setFilter(toRemove ? "all" : (nextFilter as FilterTab));
                  });
                }}
                onClearAll={() => setFilter("all")}
                variant="chips"
                maxVisible={4}
                className="mb-4"
              />

              {isCustomersInitialLoading ? (
                <View className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm px-4 py-4 gap-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </View>
              ) : isError ? (
                <View className="py-8 px-4">
                  <ErrorCard
                    message="Failed to load customers"
                    onRetry={() => refetch()}
                  />
                </View>
              ) : customerListData.length === 0 ? (
                <View className="py-14 items-center rounded-2xl bg-white border border-slate-200/80">
                  <EmptyState
                    iconName={search ? "search-outline" : "people-outline"}
                    title={search ? "No customers found" : "No customers yet"}
                    description={
                      search
                        ? "Try a different search"
                        : filter === "aging"
                          ? "No dues found"
                          : "Add your first customer"
                    }
                    actionLabel={
                      !search && filter !== "aging" ? "Add Customer" : undefined
                    }
                    onAction={
                      !search && filter !== "aging" ? openAdd : undefined
                    }
                  />
                </View>
              ) : filter === "aging" ? (
                <View className="gap-0">
                  {agingBuckets.map(
                    (bucket) =>
                      bucket.items.length > 0 && (
                        <View key={bucket.label} className="mb-3">
                          <View
                            className={`flex-row items-center justify-between px-4 py-2.5 rounded-xl mb-2 ${bucket.bg}`}
                          >
                            <Text
                              className={`text-xs font-semibold ${bucket.color}`}
                            >
                              {bucket.label}
                            </Text>
                            <Text
                              className={`text-xs font-bold ${bucket.color}`}
                            >
                              {bucket.items.length}
                            </Text>
                          </View>
                          <View className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
                            {bucket.items.map((customer) =>
                              renderCustomerRow(customer),
                            )}
                          </View>
                        </View>
                      ),
                  )}
                </View>
              ) : (
                <View className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
                  {customerListData.map((customer) =>
                    renderCustomerRow(customer),
                  )}
                </View>
              )}
            </ScreenInner>
          </ScrollView>

          {/* FAB — 56pt for prominence (Material Design) */}
          <Pressable
            onPress={openAdd}
            className="w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
            accessibilityRole="button"
            accessibilityLabel="Add customer"
            style={{
              position: "absolute",
              bottom: fabBottom,
              right: fabRight,
            }}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </>
      )}

      {tab === "suppliers" && (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              padding: contentPad,
              paddingBottom: 100,
              alignItems: "center",
            }}
            refreshControl={
              <RefreshControl
                refreshing={isSuppliersFetching}
                onRefresh={refetchSuppliers}
                tintColor="#e67e22"
              />
            }
          >
            <ScreenInner>
              {/* Collect & Pay */}
              <View className="rounded-xl border border-slate-200/80 bg-white p-2 mb-2.5 shadow-sm">
                <View className="flex-row gap-1.5">
                  <View className="flex-1 rounded-lg border border-red-100 bg-red-50 px-2 py-1.5 flex-row items-center gap-1.5">
                    <View className="w-5 h-5 rounded-full bg-red-100 items-center justify-center">
                      <Ionicons name="arrow-up" size={11} color="#dc2626" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-[10px] font-medium text-red-600">
                        Purchases
                      </Text>
                      <Text
                        className="text-[11px] font-bold text-red-700"
                        numberOfLines={1}
                      >
                        ₹{inr(supplierPurchaseTotal)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-1 rounded-lg border border-green-100 bg-green-50 px-2 py-1.5 flex-row items-center gap-1.5">
                    <View className="w-5 h-5 rounded-full bg-green-100 items-center justify-center">
                      <Ionicons name="arrow-down" size={11} color="#16a34a" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-[10px] font-medium text-green-600">
                        Entries
                      </Text>
                      <Text
                        className="text-[11px] font-bold text-green-700"
                        numberOfLines={1}
                      >
                        {supplierPurchaseCount}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Supplier list */}
              <View className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
                {isSuppliersInitialLoading ? (
                  <View className="px-4 py-4 gap-3">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </View>
                ) : isSuppliersError ? (
                  <View className="py-8 px-4">
                    <ErrorCard
                      message="Failed to load suppliers"
                      onRetry={() => refetchSuppliers()}
                    />
                  </View>
                ) : suppliers.length === 0 ? (
                  <View className="py-14 items-center">
                    <EmptyState
                      iconName={
                        supplierSearch ? "search-outline" : "cube-outline"
                      }
                      title={
                        supplierSearch
                          ? "No suppliers found"
                          : "No suppliers yet"
                      }
                      description={
                        supplierSearch
                          ? "Try a different search"
                          : "Add your first supplier"
                      }
                      actionLabel="Add Supplier"
                      onAction={openAddSupplier}
                    />
                  </View>
                ) : (
                  suppliers.map((s) => (
                    <Pressable
                      key={s.id}
                      className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100 min-h-[56]"
                      onPress={() =>
                        navigation.navigate("SupplierDetail", {
                          supplierId: s.id,
                          supplierName: s.name,
                        })
                      }
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? "#f8fafc" : "#fff",
                      })}
                    >
                      <View className="flex-1 min-w-0">
                        <Text className={TYPO.labelBold} numberOfLines={1}>
                          {s.name}
                        </Text>
                        {(s.companyName || s.phone) && (
                          <Text className={TYPO.caption} numberOfLines={1}>
                            {[s.companyName, s.phone]
                              .filter(Boolean)
                              .join(" · ")}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#94a3b8"
                      />
                    </Pressable>
                  ))
                )}
              </View>
            </ScreenInner>
          </ScrollView>

          {/* Add Supplier FAB */}
          <Pressable
            onPress={openAddSupplier}
            className="w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
            accessibilityRole="button"
            accessibilityLabel="Add supplier"
            style={{
              position: "absolute",
              bottom: fabBottom,
              right: fabRight,
            }}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>

          {/* Add Supplier Modal */}
          <Modal
            visible={addSupplierOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setAddSupplierOpen(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              className="flex-1 justify-end"
            >
              <Pressable
                className="absolute inset-0 bg-black/50"
                onPress={() => setAddSupplierOpen(false)}
              />
              <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[90%]">
                <View className="w-10 h-1 rounded-full bg-slate-200 self-center mb-4" />
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text className={TYPO.pageTitle + " mb-4"}>Add Supplier</Text>
                  <Text className={TYPO.label + " mb-1"}>Name *</Text>
                  <TextInput
                    value={supplierName}
                    onChangeText={setSupplierName}
                    placeholder="e.g. Ramesh Traders"
                    className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3"
                    placeholderTextColor="#94a3b8"
                  />
                  <Text className={TYPO.label + " mb-1"}>Company Name</Text>
                  <TextInput
                    value={supplierCompany}
                    onChangeText={setSupplierCompany}
                    placeholder="e.g. Ramesh Pvt Ltd"
                    className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3"
                    placeholderTextColor="#94a3b8"
                  />
                  <Text className={TYPO.label + " mb-1"}>Phone</Text>
                  <TextInput
                    value={supplierPhone}
                    onChangeText={setSupplierPhone}
                    placeholder="10-digit mobile"
                    keyboardType="phone-pad"
                    className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3"
                    placeholderTextColor="#94a3b8"
                  />
                  <Text className={TYPO.label + " mb-1"}>Email</Text>
                  <TextInput
                    value={supplierEmail}
                    onChangeText={setSupplierEmail}
                    placeholder="email@example.com"
                    keyboardType="email-address"
                    className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3"
                    placeholderTextColor="#94a3b8"
                  />
                  <Text className={TYPO.label + " mb-1"}>Address</Text>
                  <TextInput
                    value={supplierAddress}
                    onChangeText={setSupplierAddress}
                    placeholder="Full address"
                    className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-4"
                    placeholderTextColor="#94a3b8"
                  />
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => setAddSupplierOpen(false)}
                      className="flex-1 border border-slate-200 rounded-xl py-3 items-center"
                    >
                      <Text className="text-sm font-semibold text-slate-600">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleAddSupplier}
                      disabled={
                        !supplierName.trim() || createSupplierMutation.isPending
                      }
                      className={`flex-1 rounded-xl py-3 items-center ${supplierName.trim() && !createSupplierMutation.isPending ? "bg-primary" : "bg-slate-300"}`}
                    >
                      {createSupplierMutation.isPending ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text className="text-sm font-semibold text-white">
                          Add Supplier
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </>
      )}

      {/* Menu Modal — bottom sheet */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View className="flex-1 justify-end">
          <Pressable
            className="absolute inset-0 bg-black/50"
            onPress={() => setMenuOpen(false)}
          />
          <View className="bg-white rounded-t-3xl px-4 pt-4 pb-8 max-h-[78%]">
            <View className="w-10 h-1 rounded-full bg-slate-200 self-center mb-3" />
            <View className="mb-3 px-1">
              <Text className={TYPO.pageTitle}>
                {tab === "customers" ? "Customer Actions" : "Supplier Actions"}
              </Text>
              <Text className="text-xs text-slate-500 mt-1">
                Quick actions and tools
              </Text>
            </View>

            <View className="rounded-2xl border border-slate-200 bg-slate-50 p-2 gap-2">
              {tab === "customers" ? (
                <>
                  <Pressable
                    onPress={() => {
                      setMenuOpen(false);
                      navigation.navigate("Overdue");
                    }}
                    className="min-h-[48] rounded-xl border border-red-100 bg-red-50 px-3 py-3 flex-row items-center gap-3"
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                  >
                    <View className="w-8 h-8 rounded-lg bg-red-100 items-center justify-center">
                      <Ionicons name="alert-circle" size={18} color="#dc2626" />
                    </View>
                    <Text className={`${TYPO.body} flex-1`}>Udhaar List</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#94a3b8"
                    />
                  </Pressable>

                  <Pressable
                    onPress={openBulkReminder}
                    className="min-h-[48] rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 flex-row items-center gap-3"
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                  >
                    <View className="w-8 h-8 rounded-lg bg-amber-100 items-center justify-center">
                      <Ionicons
                        name="notifications"
                        size={18}
                        color="#d97706"
                      />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className={TYPO.body}>Bulk Remind Overdue</Text>
                      <Text
                        className="text-[11px] text-amber-700 mt-0.5"
                        numberOfLines={1}
                      >
                        Schedule reminders in one dedicated flow
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#94a3b8"
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => navigateToImport("customers")}
                    className="min-h-[48] rounded-xl border border-slate-200 bg-white px-3 py-3 flex-row items-center gap-3"
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                  >
                    <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                      <Ionicons name="cloud-upload" size={18} color="#64748b" />
                    </View>
                    <Text className={`${TYPO.body} flex-1`}>
                      Import Customers
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#94a3b8"
                    />
                  </Pressable>

                  <Pressable
                    disabled
                    className="min-h-[48] rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 flex-row items-center gap-3 opacity-70"
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                  >
                    <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                      <Ionicons name="git-merge" size={18} color="#64748b" />
                    </View>
                    <Text className={`${TYPO.body} flex-1`}>
                      Merge Customers (Soon)
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#94a3b8"
                    />
                  </Pressable>

                  <Pressable
                    onPress={exportCustomersCsv}
                    className="min-h-[48] rounded-xl border border-slate-200 bg-white px-3 py-3 flex-row items-center gap-3"
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                  >
                    <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                      <Ionicons
                        name="document-text"
                        size={18}
                        color="#64748b"
                      />
                    </View>
                    <Text className={`${TYPO.body} flex-1`}>
                      Download Excel (CSV)
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#94a3b8"
                    />
                  </Pressable>

                  <Pressable
                    onPress={exportCustomersPdf}
                    className="min-h-[48] rounded-xl border border-slate-200 bg-white px-3 py-3 flex-row items-center gap-3"
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                  >
                    <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                      <Ionicons name="document" size={18} color="#64748b" />
                    </View>
                    <Text className={`${TYPO.body} flex-1`}>Download PDF</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#94a3b8"
                    />
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() => {
                      setMenuOpen(false);
                      getTabNav()?.navigate("MoreTab", { screen: "Purchases" });
                    }}
                    className="min-h-[48] rounded-xl border border-slate-200 bg-white px-3 py-3 flex-row items-center gap-3"
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                  >
                    <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                      <Ionicons name="cube" size={18} color="#64748b" />
                    </View>
                    <Text className={`${TYPO.body} flex-1`}>
                      View Purchases
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#94a3b8"
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setMenuOpen(false);
                      getTabNav()?.navigate("MoreTab", { screen: "Expenses" });
                    }}
                    className="min-h-[48] rounded-xl border border-slate-200 bg-white px-3 py-3 flex-row items-center gap-3"
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                  >
                    <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                      <Ionicons name="receipt" size={18} color="#64748b" />
                    </View>
                    <Text className={`${TYPO.body} flex-1`}>View Expenses</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#94a3b8"
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => navigateToImport("suppliers")}
                    className="min-h-[48] rounded-xl border border-slate-200 bg-white px-3 py-3 flex-row items-center gap-3"
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                  >
                    <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
                      <Ionicons name="cloud-upload" size={18} color="#64748b" />
                    </View>
                    <Text className={`${TYPO.body} flex-1`}>
                      Import Suppliers
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#94a3b8"
                    />
                  </Pressable>
                </>
              )}
            </View>

            <Pressable
              onPress={() => setMenuOpen(false)}
              className="mt-4 py-3 rounded-xl border border-slate-200 items-center min-h-[44] bg-white"
              style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
            >
              <Text className={TYPO.body}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add Customer Modal — KeyboardAvoidingView per React Native docs */}
      <Modal
        visible={addOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end"
        >
          <Pressable
            className="absolute inset-0 bg-black/50"
            onPress={() => setAddOpen(false)}
          />
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[90%]">
            <View className="w-10 h-1 rounded-full bg-slate-200 self-center mb-4" />
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text className={TYPO.pageTitle + " mb-4"}>Add Customer</Text>

              <Text className={TYPO.label + " mb-1"}>Name *</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Ramesh Kumar"
                className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3"
                placeholderTextColor="#94a3b8"
              />

              <Text className={TYPO.label + " mb-1"}>Phone</Text>
              <TextInput
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="10-digit mobile"
                keyboardType="phone-pad"
                className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3"
                placeholderTextColor="#94a3b8"
              />

              <Text className={TYPO.label + " mb-1"}>Email</Text>
              <TextInput
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="email@example.com"
                keyboardType="email-address"
                className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3"
                placeholderTextColor="#94a3b8"
              />

              <Text className={TYPO.label + " mb-1"}>Nickname</Text>
              <TextInput
                value={newNickname}
                onChangeText={setNewNickname}
                placeholder="e.g. Ramesh bhai"
                className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3"
                placeholderTextColor="#94a3b8"
              />

              <Text className={TYPO.label + " mb-1"}>Landmark / Area</Text>
              <TextInput
                value={newLandmark}
                onChangeText={setNewLandmark}
                placeholder="e.g. near Rajiv Chowk"
                className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3"
                placeholderTextColor="#94a3b8"
              />

              <Text className={TYPO.label + " mb-1"}>Opening Balance ₹</Text>
              <TextInput
                value={newOpeningBal}
                onChangeText={setNewOpeningBal}
                placeholder="0.00"
                keyboardType="decimal-pad"
                className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3"
                placeholderTextColor="#94a3b8"
              />

              <Text className={TYPO.label + " mb-1"}>Credit Limit ₹</Text>
              <TextInput
                value={newCreditLimit}
                onChangeText={setNewCreditLimit}
                placeholder="No limit"
                keyboardType="decimal-pad"
                className="border border-slate-200 rounded-xl px-4 h-12 text-base text-slate-800 mb-3"
                placeholderTextColor="#94a3b8"
              />

              <Text className={TYPO.label + " mb-1"}>Notes</Text>
              <TextInput
                value={newNotes}
                onChangeText={setNewNotes}
                placeholder="Any notes…"
                multiline
                className="border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800 min-h-[60px] mb-3"
                placeholderTextColor="#94a3b8"
              />

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
                      <Text
                        className={`text-xs font-semibold ${active ? "text-primary" : "text-slate-500"}`}
                      >
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setAddOpen(false)}
                  className="flex-1 border border-slate-200 rounded-xl py-3 items-center"
                >
                  <Text className="text-sm font-semibold text-slate-600">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAdd}
                  disabled={!newName.trim() || createMutation.isPending}
                  className={`flex-1 rounded-xl py-3 items-center ${newName.trim() && !createMutation.isPending ? "bg-primary" : "bg-slate-300"}`}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-sm font-semibold text-white">
                      Add Customer
                    </Text>
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
