/**
 * CustomerDetailScreen — full customer profile with tabs translated from web CustomerDetail.tsx
 * Tabs: Overview (balance, stats, contact, notifications) | Invoices | Ledger | Reminders
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
  FlatList,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi, invoiceApi, reminderApi, customerExtApi } from '../lib/api';
import { formatCurrency, formatDate, formatDateTime, toFloat } from '../lib/utils';
import type { CustomersStackParams } from '../navigation';

type RouteProps = RouteProp<CustomersStackParams, 'CustomerDetail'>;

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Invoices', 'Ledger', 'Reminders'] as const;
type Tab = (typeof TABS)[number];

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  paid:      { bg: 'bg-green-100',  text: 'text-green-700' },
  pending:   { bg: 'bg-blue-100',   text: 'text-blue-700' },
  partial:   { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  draft:     { bg: 'bg-slate-100',  text: 'text-slate-500' },
  proforma:  { bg: 'bg-slate-100',  text: 'text-slate-500' },
  cancelled: { bg: 'bg-red-100',    text: 'text-red-500' },
};

const CUSTOMER_TAGS = ['VIP', 'Wholesale', 'Blacklist', 'Regular'] as const;
const LANGUAGES = ['hi', 'en', 'mr', 'gu'] as const;
const LANG_LABELS: Record<string, string> = { hi: 'Hindi', en: 'English', mr: 'Marathi', gu: 'Gujarati' };

// ── Component ─────────────────────────────────────────────────────────────────

export function CustomerDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProps>();
  const { id } = route.params;
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>('Overview');

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editLandmark, setEditLandmark] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Reminder dialog state
  const [reminderOpen, setReminderOpen] = useState(false);
  const [remAmount, setRemAmount] = useState('');
  const [remDate, setRemDate] = useState('');
  const [remMessage, setRemMessage] = useState('');

  // Notification prefs modal
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [pWaEnabled, setPWaEnabled] = useState(true);
  const [pWaNumber, setPWaNumber] = useState('');
  const [pEmailEnabled, setPEmailEnabled] = useState(false);
  const [pEmailAddress, setPEmailAddress] = useState('');
  const [pSmsEnabled, setPSmsEnabled] = useState(false);
  const [pLang, setPLang] = useState('hi');

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: custData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerApi.get(id),
    staleTime: 30_000,
  });

  const { data: invoiceData } = useQuery({
    queryKey: ['customer-invoices', id],
    queryFn: () => invoiceApi.list(1, 50, id),
    staleTime: 30_000,
  });

  const { data: ledgerData } = useQuery({
    queryKey: ['customer-ledger', id],
    queryFn: () => customerExtApi.getLedger(id),
    staleTime: 30_000,
  });

  const { data: remindersData } = useQuery({
    queryKey: ['reminders', id],
    queryFn: () => reminderApi.list(id),
    staleTime: 60_000,
  });

  const { data: commPrefsData } = useQuery({
    queryKey: ['comm-prefs', id],
    queryFn: () => customerExtApi.getCommPrefs(id),
    staleTime: 60_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: (data: any) => customerApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      setEditOpen(false);
      Alert.alert('', 'Customer updated ✅');
    },
    onError: () => Alert.alert('Error', 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => customerExtApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigation.goBack();
    },
    onError: () => Alert.alert('Error', 'Delete failed'),
  });

  const createReminderMutation = useMutation({
    mutationFn: (data: any) => reminderApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders', id] });
      setReminderOpen(false);
      Alert.alert('', 'Reminder set ✅');
    },
    onError: () => Alert.alert('Error', 'Failed to set reminder'),
  });

  const updatePrefsMutation = useMutation({
    mutationFn: (data: any) => customerExtApi.updateCommPrefs(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comm-prefs', id] });
      setPrefsOpen(false);
      Alert.alert('', 'Preferences saved ✅');
    },
    onError: () => Alert.alert('Error', 'Save failed'),
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#e67e22" size="large" />
      </SafeAreaView>
    );
  }

  const customer = (custData as any)?.customer;

  if (!customer) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-slate-400">Customer not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 bg-indigo-600 px-5 py-2 rounded-xl">
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const invoices = (invoiceData as any)?.invoices ?? [];
  const ledger = (ledgerData as any)?.entries ?? [];
  const reminders = (remindersData as any)?.reminders ?? [];
  const commPrefs = (commPrefsData as any)?.prefs ?? null;

  const balance = toFloat(customer.balance);
  const totalBilled = invoices.reduce((s: number, inv: any) => s + toFloat(inv.total), 0);
  const paidInvoices = invoices.filter((i: any) => i.status === 'paid').length;

  function openEdit() {
    setEditName(customer.name ?? '');
    setEditPhone(customer.phone ?? '');
    setEditEmail(customer.email ?? '');
    setEditNickname(Array.isArray(customer.nickname) ? (customer.nickname[0] ?? '') : (customer.nickname ?? ''));
    setEditLandmark(customer.landmark ?? '');
    setEditCreditLimit(String(customer.creditLimit ?? ''));
    setEditTags(customer.tags ?? []);
    setEditNotes(customer.notes ?? '');
    setDeleteConfirm(false);
    setEditOpen(true);
  }

  function openPrefs() {
    setPWaEnabled(commPrefs?.whatsappEnabled ?? true);
    setPWaNumber(commPrefs?.whatsappNumber ?? customer?.phone ?? '');
    setPEmailEnabled(commPrefs?.emailEnabled ?? false);
    setPEmailAddress(commPrefs?.emailAddress ?? customer?.email ?? '');
    setPSmsEnabled(commPrefs?.smsEnabled ?? false);
    setPLang(commPrefs?.preferredLanguage ?? 'hi');
    setPrefsOpen(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="bg-white border-b border-slate-100">
        <View className="px-4 pt-3 pb-0 flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-2 p-1">
            <Text className="text-2xl text-slate-600">←</Text>
          </TouchableOpacity>
          {/* Avatar */}
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${balance > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
            <Text className={`font-bold text-sm ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {customer.name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-800" numberOfLines={1}>{customer.name}</Text>
            <Text className="text-xs text-slate-500">{customer.phone ?? 'No phone'}</Text>
          </View>
          {/* Quick actions */}
          <View className="flex-row gap-1">
            {customer.phone && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://wa.me/91${customer.phone.replace(/\D/g, '')}`)}
                className="p-2"
              >
                <Text className="text-lg">💬</Text>
              </TouchableOpacity>
            )}
            {customer.phone && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${customer.phone}`)} className="p-2">
                <Text className="text-lg">📞</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('Billing')}
              className="p-2"
            >
              <Text className="text-lg">🧾</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openEdit} className="p-2">
              <Text className="text-lg">✏️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row border-t border-slate-100 mt-2">
          {TABS.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 py-3 border-b-2 ${tab === t ? 'border-primary' : 'border-transparent'}`}
            >
              <Text className={`text-center text-xs font-medium ${tab === t ? 'text-primary' : 'text-slate-400'}`}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
      >
        {/* ── OVERVIEW ── */}
        {tab === 'Overview' && (
          <>
            {/* Balance hero */}
            <View className={`rounded-2xl p-5 items-center ${balance > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <Text className="text-xs font-medium uppercase tracking-wide text-slate-500">Outstanding Balance</Text>
              <Text className={`text-3xl font-black mt-1 ${balance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                {formatCurrency(balance)}
              </Text>
              {balance > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Payment', { customerId: id })}
                  className="mt-3 bg-indigo-600 px-5 py-2 rounded-xl"
                >
                  <Text className="text-white font-semibold">💰 Record Payment</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Stats row */}
            <View className="flex-row gap-3">
              {[
                { label: 'Total Billed', value: formatCurrency(totalBilled) },
                { label: 'Invoices', value: String(invoices.length) },
                { label: 'Paid', value: String(paidInvoices) },
              ].map((stat) => (
                <View key={stat.label} className="flex-1 bg-white rounded-2xl p-3 items-center shadow-sm">
                  <Text className="text-lg font-bold text-slate-800">{stat.value}</Text>
                  <Text className="text-xs text-slate-400 mt-0.5">{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Credit limit + tags */}
            {(Number(customer.creditLimit) > 0 || (customer.tags ?? []).length > 0) && (
              <View className="bg-white rounded-2xl p-4 shadow-sm gap-2">
                {Number(customer.creditLimit) > 0 && (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs text-slate-400">Credit Limit</Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-semibold text-slate-800">{formatCurrency(customer.creditLimit)}</Text>
                      {balance >= Number(customer.creditLimit) && (
                        <View className="bg-red-100 px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] font-medium text-red-600">⚠️ Limit reached</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                {(customer.tags ?? []).length > 0 && (
                  <View className="flex-row flex-wrap gap-1.5">
                    {(customer.tags ?? []).map((tag: string) => (
                      <View
                        key={tag}
                        className={`px-2 py-0.5 rounded-full border ${
                          tag === 'Blacklist' ? 'border-red-300 bg-red-50' :
                          tag === 'VIP' ? 'border-yellow-300 bg-yellow-50' :
                          'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <Text className={`text-[10px] font-medium ${
                          tag === 'Blacklist' ? 'text-red-600' :
                          tag === 'VIP' ? 'text-yellow-700' :
                          'text-slate-500'
                        }`}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Contact info */}
            <View className="bg-white rounded-2xl p-4 shadow-sm gap-1.5">
              <Text className="text-xs font-semibold uppercase text-slate-400 mb-1">Contact Info</Text>
              {customer.phone && <Text className="text-sm text-slate-700">📞 {customer.phone}</Text>}
              {customer.email && <Text className="text-sm text-slate-700">✉️ {customer.email}</Text>}
              {customer.landmark && <Text className="text-sm text-slate-700">📍 {customer.landmark}</Text>}
              {customer.gstin && <Text className="text-xs font-mono text-slate-600">GST: {customer.gstin}</Text>}
              {customer.notes && (
                <View className="mt-1 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                  <Text className="text-[10px] font-semibold uppercase text-slate-400 mb-0.5">Notes</Text>
                  <Text className="text-[13px] text-slate-700">{customer.notes}</Text>
                </View>
              )}
            </View>

            {/* Notification channels */}
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs font-semibold uppercase text-slate-400">Notification Channels</Text>
                <TouchableOpacity onPress={openPrefs}>
                  <Text className="text-xs font-medium text-primary">Edit</Text>
                </TouchableOpacity>
              </View>
              {[
                {
                  label: 'WhatsApp',
                  on: commPrefs?.whatsappEnabled ?? true,
                  detail: commPrefs?.whatsappNumber,
                },
                {
                  label: 'Email',
                  on: commPrefs?.emailEnabled ?? false,
                  detail: commPrefs?.emailAddress,
                },
                {
                  label: 'SMS',
                  on: commPrefs?.smsEnabled ?? false,
                  detail: undefined,
                },
              ].map((ch) => (
                <View key={ch.label} className="flex-row justify-between items-center py-1">
                  <Text className="text-sm text-slate-700">{ch.label}</Text>
                  <Text className={`text-xs font-medium ${ch.on ? 'text-green-600' : 'text-slate-400'}`}>
                    {ch.on ? `✓ On${ch.detail ? ` · ${ch.detail}` : ''}` : 'Off'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── INVOICES ── */}
        {tab === 'Invoices' && (
          <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {invoices.length === 0 ? (
              <View className="py-10 items-center">
                <Text className="text-slate-400 text-sm">No invoices yet</Text>
              </View>
            ) : (
              invoices.map((inv: any, i: number) => {
                const sc = STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft;
                return (
                  <TouchableOpacity
                    key={inv.id}
                    onPress={() => navigation.navigate('InvoicesTab', {
                      screen: 'InvoiceDetail',
                      params: { id: inv.id },
                    })}
                    className={`flex-row items-center px-4 py-3 ${i > 0 ? 'border-t border-slate-50' : ''}`}
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-800">{inv.invoiceNo}</Text>
                      <Text className="text-xs text-slate-400 mt-0.5">{formatDate(inv.createdAt)}</Text>
                    </View>
                    <View className={`px-2 py-0.5 rounded-full mr-2 ${sc.bg}`}>
                      <Text className={`text-[10px] font-semibold capitalize ${sc.text}`}>{inv.status}</Text>
                    </View>
                    <Text className="text-sm font-bold text-primary">{formatCurrency(toFloat(inv.total))}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ── LEDGER ── */}
        {tab === 'Ledger' && (
          <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {ledger.length === 0 ? (
              <View className="py-10 items-center">
                <Text className="text-slate-400 text-sm">No ledger entries</Text>
              </View>
            ) : (
              ledger.map((entry: any, i: number) => {
                const isCharge = entry.type === 'invoice';
                return (
                  <View key={entry.id ?? i} className={`flex-row items-center px-4 py-2.5 ${i > 0 ? 'border-t border-slate-50' : ''}`}>
                    <View className="flex-1">
                      <Text className="text-sm text-slate-800 capitalize">
                        {entry.description ?? entry.type ?? 'Transaction'}
                      </Text>
                      <Text className="text-xs text-slate-400 mt-0.5">{formatDate(entry.createdAt)}</Text>
                    </View>
                    <Text className={`text-sm font-semibold ${isCharge ? 'text-red-600' : 'text-green-600'}`}>
                      {isCharge ? '+' : '-'}{formatCurrency(toFloat(entry.amount))}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── REMINDERS ── */}
        {tab === 'Reminders' && (
          <>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase text-slate-400">
                {reminders.length} reminder{reminders.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setRemAmount(balance > 0 ? String(balance) : '');
                  setRemDate('');
                  setRemMessage('');
                  setReminderOpen(true);
                }}
                className="bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center gap-1"
              >
                <Text className="text-white font-semibold text-sm">+ Set Reminder</Text>
              </TouchableOpacity>
            </View>
            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {reminders.length === 0 ? (
                <View className="py-10 items-center">
                  <Text className="text-slate-400 text-sm">No reminders yet</Text>
                </View>
              ) : (
                reminders.map((r: any, i: number) => (
                  <View key={r.id} className={`flex-row items-center px-4 py-2.5 ${i > 0 ? 'border-t border-slate-50' : ''}`}>
                    <Text className="mr-2">🔔</Text>
                    <View className="flex-1">
                      <Text className="text-sm text-slate-800 truncate">{r.message ?? 'Reminder'}</Text>
                      <Text className="text-xs text-slate-400 mt-0.5">{formatDateTime(r.scheduledTime)}</Text>
                    </View>
                    <View className={`px-2 py-0.5 rounded-full ${r.status === 'sent' ? 'bg-green-100' : 'bg-slate-100'}`}>
                      <Text className={`text-[10px] font-medium capitalize ${r.status === 'sent' ? 'text-green-700' : 'text-slate-500'}`}>
                        {r.status}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        <View className="h-6" />
      </ScrollView>

      {/* ── Edit Customer Modal ── */}
      <Modal visible={editOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10" style={{ maxHeight: '90%' }}>
            <Text className="text-lg font-bold text-slate-800 mb-4">Edit Customer</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text className="text-xs font-medium text-slate-600 mb-1">Name *</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Customer name"
                placeholderTextColor="#94a3b8"
                className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3"
              />
              {/* Phone */}
              <Text className="text-xs font-medium text-slate-600 mb-1">Phone</Text>
              <TextInput
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="10-digit mobile"
                keyboardType="phone-pad"
                placeholderTextColor="#94a3b8"
                className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3"
              />
              {/* Email */}
              <Text className="text-xs font-medium text-slate-600 mb-1">Email</Text>
              <TextInput
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#94a3b8"
                className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3"
              />
              {/* Nickname */}
              <Text className="text-xs font-medium text-slate-600 mb-1">Nickname</Text>
              <TextInput
                value={editNickname}
                onChangeText={setEditNickname}
                placeholder="e.g. Ramesh bhai"
                placeholderTextColor="#94a3b8"
                className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3"
              />
              {/* Landmark */}
              <Text className="text-xs font-medium text-slate-600 mb-1">Landmark / Area</Text>
              <TextInput
                value={editLandmark}
                onChangeText={setEditLandmark}
                placeholder="e.g. near Rajiv Chowk"
                placeholderTextColor="#94a3b8"
                className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3"
              />
              {/* Credit Limit */}
              <Text className="text-xs font-medium text-slate-600 mb-1">Credit Limit (0 = no limit)</Text>
              <TextInput
                value={editCreditLimit}
                onChangeText={setEditCreditLimit}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94a3b8"
                className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3"
              />
              {/* Tags */}
              <Text className="text-xs font-medium text-slate-600 mb-2">Tags</Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {CUSTOMER_TAGS.map((tag) => {
                  const active = editTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() =>
                        setEditTags((prev) =>
                          active ? prev.filter((t) => t !== tag) : [...prev, tag]
                        )
                      }
                      className={`px-3 py-1 rounded-full border ${
                        active
                          ? tag === 'Blacklist'
                            ? 'border-red-400 bg-red-50'
                            : 'border-primary/40 bg-primary/10'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <Text className={`text-xs font-medium ${
                        active
                          ? tag === 'Blacklist' ? 'text-red-600' : 'text-primary'
                          : 'text-slate-500'
                      }`}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {/* Notes */}
              <Text className="text-xs font-medium text-slate-600 mb-1">Notes</Text>
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Any notes about this customer…"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={2}
                className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-4"
              />

              {/* Delete section */}
              <View className="border-t border-slate-100 pt-3">
                {!deleteConfirm ? (
                  <TouchableOpacity onPress={() => setDeleteConfirm(true)} className="flex-row items-center gap-1.5">
                    <Text className="text-xs text-red-500">🗑 Delete this customer</Text>
                  </TouchableOpacity>
                ) : (
                  <View className="bg-red-50 border border-red-200 rounded-xl p-3 gap-2">
                    <Text className="text-xs text-red-600">
                      ⚠️ Deleting <Text className="font-bold">{customer?.name}</Text> will remove all their invoices, ledger entries and reminders. This cannot be undone.
                    </Text>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => deleteMutation.mutate()}
                        disabled={deleteMutation.isPending}
                        className="bg-red-600 rounded-lg px-4 py-2 flex-row items-center gap-1"
                      >
                        {deleteMutation.isPending ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text className="text-white text-xs font-bold">Yes, Delete</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setDeleteConfirm(false)} className="border border-slate-200 rounded-lg px-4 py-2">
                        <Text className="text-xs font-medium text-slate-600">Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity onPress={() => setEditOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-3 items-center">
                <Text className="font-semibold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  updateMutation.mutate({
                    name: editName,
                    phone: editPhone || undefined,
                    email: editEmail || undefined,
                    nickname: editNickname || undefined,
                    landmark: editLandmark || undefined,
                    creditLimit: editCreditLimit ? Number(editCreditLimit) : undefined,
                    tags: editTags.length ? editTags : undefined,
                    notes: editNotes || undefined,
                  })
                }
                disabled={!editName.trim() || updateMutation.isPending}
                className={`flex-1 rounded-xl py-3 items-center ${editName.trim() ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-bold text-white">Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Set Reminder Modal ── */}
      <Modal visible={reminderOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <Text className="text-lg font-bold text-slate-800 mb-4">Set Reminder</Text>
            <Text className="text-xs font-medium text-slate-600 mb-1">Amount Outstanding (₹)</Text>
            <TextInput
              value={remAmount}
              onChangeText={setRemAmount}
              keyboardType="numeric"
              placeholder={String(balance > 0 ? balance : 0)}
              placeholderTextColor="#94a3b8"
              className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3"
            />
            <Text className="text-xs font-medium text-slate-600 mb-1">Date (YYYY-MM-DD HH:MM)</Text>
            <TextInput
              value={remDate}
              onChangeText={setRemDate}
              placeholder="2026-04-01 10:00"
              placeholderTextColor="#94a3b8"
              className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3"
            />
            <Text className="text-xs font-medium text-slate-600 mb-1">Message (optional)</Text>
            <TextInput
              value={remMessage}
              onChangeText={setRemMessage}
              placeholder={`Reminder for ${customer?.name ?? 'customer'}`}
              placeholderTextColor="#94a3b8"
              className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-4"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setReminderOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-3 items-center">
                <Text className="font-semibold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!remDate || createReminderMutation.isPending}
                onPress={() =>
                  createReminderMutation.mutate({
                    customerId: id,
                    amount: remAmount ? parseFloat(remAmount) : balance,
                    datetime: remDate,
                    message: remMessage || undefined,
                  })
                }
                className={`flex-1 rounded-xl py-3 items-center ${remDate ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                {createReminderMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-bold text-white">Set Reminder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Notification Preferences Modal ── */}
      <Modal visible={prefsOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <Text className="text-lg font-bold text-slate-800 mb-4">Notification Preferences</Text>
            {/* WhatsApp */}
            <View className="border border-slate-200 rounded-xl p-3 mb-3 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-slate-700">WhatsApp</Text>
                <Switch value={pWaEnabled} onValueChange={setPWaEnabled} trackColor={{ true: '#e67e22' }} />
              </View>
              {pWaEnabled && (
                <TextInput
                  value={pWaNumber}
                  onChangeText={setPWaNumber}
                  keyboardType="phone-pad"
                  placeholder="10-digit number"
                  placeholderTextColor="#94a3b8"
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 mt-1"
                />
              )}
            </View>
            {/* Email */}
            <View className="border border-slate-200 rounded-xl p-3 mb-3 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-slate-700">Email Reminders</Text>
                <Switch value={pEmailEnabled} onValueChange={setPEmailEnabled} trackColor={{ true: '#e67e22' }} />
              </View>
              {pEmailEnabled && (
                <TextInput
                  value={pEmailAddress}
                  onChangeText={setPEmailAddress}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="customer@email.com"
                  placeholderTextColor="#94a3b8"
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 mt-1"
                />
              )}
            </View>
            {/* SMS */}
            <View className="border border-slate-200 rounded-xl p-3 mb-3 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-slate-700">SMS Reminders</Text>
              <Switch value={pSmsEnabled} onValueChange={setPSmsEnabled} trackColor={{ true: '#e67e22' }} />
            </View>
            {/* Language */}
            <Text className="text-xs font-medium text-slate-600 mb-2">Preferred Language</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => setPLang(lang)}
                  className={`px-3 py-1.5 rounded-full border ${pLang === lang ? 'bg-indigo-600 border-primary' : 'border-slate-200 bg-slate-50'}`}
                >
                  <Text className={`text-xs font-medium ${pLang === lang ? 'text-white' : 'text-slate-600'}`}>
                    {LANG_LABELS[lang]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setPrefsOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-3 items-center">
                <Text className="font-semibold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  updatePrefsMutation.mutate({
                    whatsappEnabled: pWaEnabled,
                    whatsappNumber: pWaNumber || undefined,
                    emailEnabled: pEmailEnabled,
                    emailAddress: pEmailAddress || undefined,
                    smsEnabled: pSmsEnabled,
                    preferredLanguage: pLang,
                  })
                }
                disabled={updatePrefsMutation.isPending}
                className="flex-1 bg-indigo-600 rounded-xl py-3 items-center"
              >
                {updatePrefsMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-bold text-white">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
