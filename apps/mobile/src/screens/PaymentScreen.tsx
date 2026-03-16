/**
 * PaymentScreen — Record a payment for a customer.
 * Translated from web Payment.tsx.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { customerApi, paymentApi } from '../lib/api';
import { formatCurrency, toFloat } from '../lib/utils';
import { hapticSuccess, hapticError } from '../lib/haptics';
import type { CustomersStackParams } from '../navigation';

type RouteProps = RouteProp<CustomersStackParams, 'Payment'>;

const PAYMENT_METHODS = [
  { value: 'cash',          label: '💵 Cash' },
  { value: 'upi',           label: '📱 UPI' },
  { value: 'card',          label: '💳 Card' },
  { value: 'bank_transfer', label: '🏦 Bank Transfer' },
  { value: 'cheque',        label: '📝 Cheque' },
] as const;

export function PaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProps>();
  const { customerId } = route.params ?? {};
  const qc = useQueryClient();

  // Search state (if no customerId pre-filled)
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(customerId);

  // Form state
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: custData } = useQuery({
    queryKey: ['customer', selectedCustomerId],
    queryFn: () => customerApi.get(selectedCustomerId!),
    enabled: !!selectedCustomerId,
    staleTime: 30_000,
  });

  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ['customer-search-pay', search],
    queryFn: () => customerApi.search(search, 6),
    enabled: search.length >= 1 && !selectedCustomerId,
    staleTime: 10_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const recordMutation = useMutation({
    mutationFn: () =>
      paymentApi.record({
        customerId: selectedCustomerId,
        amount: parseFloat(amount),
        method,
        reference: reference || undefined,
      }),
    onSuccess: () => {
      hapticSuccess();
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', selectedCustomerId] });
      qc.invalidateQueries({ queryKey: ['customer-invoices', selectedCustomerId] });
      qc.invalidateQueries({ queryKey: ['customer-ledger', selectedCustomerId] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      Alert.alert('', '💰 Payment recorded!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    },
    onError: (err: any) => {
      hapticError();
      Alert.alert('Error', err?.message ?? 'Failed to record payment');
    },
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const customer = (custData as any)?.customer;
  const balance = toFloat(customer?.balance);
  const searchResults = (searchData as any)?.customers ?? [];
  const canSubmit = selectedCustomerId && parseFloat(amount) > 0 && !recordMutation.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom']}>
      {/* Header */}
      <View className="bg-white border-b border-slate-100 px-4 py-3 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1">
          <Text className="text-2xl text-slate-600">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800">Record Payment</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">

        {/* Customer selector */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-xs font-semibold uppercase text-slate-400 mb-3">Customer</Text>

          {selectedCustomerId && customer ? (
            /* Selected customer card */
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${balance > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                <Text className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {customer.name?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-800">{customer.name}</Text>
                <Text className="text-xs text-slate-500">{customer.phone ?? ''}</Text>
                {balance !== 0 && (
                  <Text className={`text-xs font-medium mt-0.5 ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {balance > 0 ? `${formatCurrency(balance)} outstanding` : `${formatCurrency(Math.abs(balance))} credit`}
                  </Text>
                )}
              </View>
              {!customerId && (
                <TouchableOpacity
                  onPress={() => { setSelectedCustomerId(undefined); setSearch(''); setAmount(''); }}
                  className="p-2"
                >
                  <Text className="text-slate-400 text-lg">✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* Search box */
            <>
              <View className="flex-row items-center border border-slate-200 rounded-xl bg-slate-50 px-3 mb-2">
                <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search customer…"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 h-11 text-sm text-slate-800"
                />
                {searching && <ActivityIndicator size="small" color="#e67e22" />}
              </View>
              {searchResults.length > 0 && (
                <View className="rounded-xl border border-slate-200 overflow-hidden">
                  {searchResults.map((c: any, i: number) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => { setSelectedCustomerId(c.id); setSearch(''); if (c.balance > 0) setAmount(String(c.balance)); }}
                      className={`px-4 py-3 flex-row items-center justify-between ${i > 0 ? 'border-t border-slate-50' : ''}`}
                    >
                      <View>
                        <Text className="text-sm font-medium text-slate-800">{c.name}</Text>
                        {c.phone && <Text className="text-xs text-slate-400">{c.phone}</Text>}
                      </View>
                      {c.balance > 0 && (
                        <Text className="text-xs text-red-500 font-semibold">{formatCurrency(toFloat(c.balance))} due</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Amount */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-xs font-semibold uppercase text-slate-400 mb-2">Amount</Text>
          <View className="flex-row items-center border border-slate-200 rounded-xl bg-slate-50 px-3">
            <Text className="text-slate-600 text-lg font-semibold mr-2">₹</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              className="flex-1 h-12 text-xl font-bold text-slate-800"
            />
          </View>
          {balance > 0 && (
            <TouchableOpacity
              onPress={() => setAmount(String(balance))}
              className="mt-2 self-start"
            >
              <Text className="text-xs text-primary-600 font-medium">Fill full balance: {formatCurrency(balance)}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment method */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-xs font-semibold uppercase text-slate-400 mb-3">Payment Method</Text>
          <View className="flex-row flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.value}
                onPress={() => setMethod(m.value)}
                className={`px-4 py-2.5 rounded-xl border ${method === m.value ? 'bg-primary border-primary' : 'border-slate-200 bg-slate-50'}`}
              >
                <Text className={`text-sm font-medium ${method === m.value ? 'text-white' : 'text-slate-600'}`}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reference / UTR */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-xs font-semibold uppercase text-slate-400 mb-2">
            Reference / UTR <Text className="normal-case font-normal">(optional)</Text>
          </Text>
          <TextInput
            value={reference}
            onChangeText={setReference}
            placeholder="e.g. UPI ref, cheque no…"
            placeholderTextColor="#94a3b8"
            className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800"
          />
        </View>

        {/* Summary */}
        {selectedCustomerId && parseFloat(amount) > 0 && (
          <View className="bg-primary/10 border border-primary/30 rounded-2xl p-4">
            <Text className="text-xs font-semibold uppercase text-primary-400 mb-2">Summary</Text>
            <View className="gap-1">
              <View className="flex-row justify-between">
                <Text className="text-sm text-primary-700">Customer</Text>
                <Text className="text-sm font-semibold text-primary-800">{customer?.name ?? '…'}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-primary-700">Amount</Text>
                <Text className="text-sm font-bold text-primary-800">{formatCurrency(parseFloat(amount))}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-primary-700">Method</Text>
                <Text className="text-sm font-semibold text-primary-800 capitalize">{method.replace('_', ' ')}</Text>
              </View>
              {balance > 0 && parseFloat(amount) >= balance && (
                <View className="mt-2 bg-green-100 rounded-xl px-3 py-2">
                  <Text className="text-xs text-green-700 font-medium text-center">✅ Full balance cleared</Text>
                </View>
              )}
              {balance > 0 && parseFloat(amount) > 0 && parseFloat(amount) < balance && (
                <View className="mt-2 bg-yellow-50 rounded-xl px-3 py-2">
                  <Text className="text-xs text-yellow-700 text-center">
                    Remaining: {formatCurrency(balance - parseFloat(amount))}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View className="h-6" />
      </ScrollView>

      {/* Submit button */}
      <View className="bg-white border-t border-slate-100 px-4 py-4">
        <TouchableOpacity
          onPress={() => recordMutation.mutate()}
          disabled={!canSubmit}
          className={`rounded-2xl py-4 items-center ${canSubmit ? 'bg-primary' : 'bg-slate-200'}`}
        >
          {recordMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={`font-bold text-base ${canSubmit ? 'text-white' : 'text-slate-400'}`}>
              💰 Record Payment
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
