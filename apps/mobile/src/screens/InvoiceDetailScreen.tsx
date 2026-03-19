/**
 * InvoiceDetailScreen — full invoice view translated from web InvoiceDetail.tsx
 * Shows: amount hero, progress bar, invoice info, items, tax breakdown,
 * action buttons (WhatsApp, share, email), edit modal, cancel confirm.
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
  Share,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceApi, invoiceExtApi } from '../lib/api';
import { formatCurrency, formatDate, toFloat } from '../lib/utils';
import { useWsInvalidation } from '../hooks/useWsInvalidation';
import { useResponsive } from '../hooks/useResponsive';
import type { InvoicesStackParams } from '../navigation';

type Props = NativeStackScreenProps<InvoicesStackParams, 'InvoiceDetail'>;

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  draft:     { label: 'Draft',     bg: 'bg-slate-100',  text: 'text-slate-500' },
  proforma:  { label: 'Proforma',  bg: 'bg-blue-100',   text: 'text-blue-700' },
  pending:   { label: 'Pending',   bg: 'bg-yellow-100', text: 'text-yellow-700' },
  partial:   { label: 'Partial',   bg: 'bg-orange-100', text: 'text-orange-700' },
  paid:      { label: 'Paid ✅',   bg: 'bg-green-100',  text: 'text-green-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100',    text: 'text-red-600' },
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function InvoiceDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const qc = useQueryClient();
  const { contentPad, contentWidth } = useResponsive();
  useWsInvalidation(['invoices']);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editItems, setEditItems] = useState<
    Array<{ id: string; name: string; qty: number; price: number; discount: number }>
  >([]);
  const [editNotes, setEditNotes] = useState('');

  // Convert proforma modal state
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertAmount, setConvertAmount] = useState('');
  const [convertMethod, setConvertMethod] = useState('cash');

  // Cancel confirm state
  const [confirmCancel, setConfirmCancel] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceApi.get(id),
    staleTime: 30_000,
  });

  const invoice = (data as any)?.invoice;

  // ── Mutations ─────────────────────────────────────────────────────────────

  const cancelMutation = useMutation({
    mutationFn: () => invoiceExtApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      navigation.goBack();
    },
    onError: () => Alert.alert('Error', 'Failed to cancel invoice'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { items: Array<{ productName: string; quantity: number }>; notes?: string }) =>
      invoiceExtApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setEditOpen(false);
      Alert.alert('', 'Invoice updated ✅');
    },
    onError: () => Alert.alert('Error', 'Failed to update invoice'),
  });

  // ── Derived values ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#e67e22" size="large" />
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center gap-4">
        <Text className="text-slate-400">Invoice not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="bg-primary px-5 py-2 rounded-xl">
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusCfg = STATUS_CFG[invoice.status] ?? STATUS_CFG.pending;
  const total = toFloat(invoice.total);
  const paidAmount = toFloat(invoice.paidAmount);
  const pending = Math.max(0, total - paidAmount);
  const subtotal = toFloat(invoice.subtotal);
  const discount = toFloat(invoice.discount);
  const cgst = toFloat(invoice.cgst);
  const sgst = toFloat(invoice.sgst);
  const igst = toFloat(invoice.igst);
  const hasTax = cgst > 0 || sgst > 0 || igst > 0;
  const customerName = invoice.customer?.name ?? 'Walk-in';
  const customerPhone = invoice.customer?.phone;
  const canEdit = ['draft', 'pending', 'partial'].includes(invoice.status);
  const canCancel = !['cancelled', 'paid'].includes(invoice.status);

  // WhatsApp deep link
  const waText = `Hi ${customerName},\n\nInvoice ${invoice.invoiceNo} for ${formatCurrency(total)} is ${invoice.status}.\n\nBalance due: ${formatCurrency(pending)}\n\nThank you!`;
  const waLink = customerPhone
    ? `https://wa.me/91${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(waText)}`
    : null;

  // ── Edit modal helpers ────────────────────────────────────────────────────

  function openEdit() {
    setEditItems(
      (invoice.items ?? []).map((it: any) => ({
        id: it.id,
        name: it.product?.name ?? it.productName ?? 'Product',
        qty: it.quantity,
        price: toFloat(it.unitPrice),
        discount: 0,
      }))
    );
    setEditNotes(invoice.notes ?? '');
    setEditOpen(true);
  }

  function changeQty(idx: number, delta: number) {
    setEditItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, qty: Math.max(1, it.qty + delta) } : it))
    );
  }

  function saveEdit() {
    updateMutation.mutate({
      items: editItems.map((it) => ({ productName: it.name, quantity: it.qty })),
      notes: editNotes || undefined,
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <View style={{ flex: 1, width: '100%', alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: contentWidth, flex: 1 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: contentPad, paddingVertical: 12 }} className="bg-white border-b border-slate-100 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1">
          <Text className="text-2xl text-slate-600">←</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-800">{invoice.invoiceNo}</Text>
          <Text className="text-xs text-slate-500">{customerName}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className={`px-2 py-1 rounded-full ${statusCfg.bg}`}>
            <Text className={`text-[11px] font-semibold ${statusCfg.text}`}>{statusCfg.label}</Text>
          </View>
          {canEdit && (
            <TouchableOpacity onPress={openEdit} className="ml-1 p-1">
              <Text className="text-lg">✏️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: contentPad, gap: 12 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
      >
        {/* Amount hero */}
        <View className="bg-white rounded-2xl p-5 shadow-sm">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-[11px] uppercase tracking-wide text-slate-400">Total Amount</Text>
              <Text className="text-3xl font-black text-slate-800 mt-0.5">{formatCurrency(total)}</Text>
              {invoice.dueDate && (
                <Text className="text-xs text-slate-400 mt-1">Due: {formatDate(invoice.dueDate)}</Text>
              )}
            </View>
            <View className="items-end">
              {paidAmount > 0 && (
                <Text className="text-sm text-green-600 font-medium">Paid: {formatCurrency(paidAmount)}</Text>
              )}
              {pending > 0 && (
                <Text className="text-sm text-red-600 font-bold">Due: {formatCurrency(pending)}</Text>
              )}
            </View>
          </View>

          {/* Progress bar for partial payments */}
          {total > 0 && paidAmount > 0 && paidAmount < total && (
            <View className="mt-4">
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs text-slate-400">Collected</Text>
                <Text className="text-xs text-slate-400">{Math.round((paidAmount / total) * 100)}%</Text>
              </View>
              <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <View
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${Math.min(100, (paidAmount / total) * 100)}%` }}
                />
              </View>
            </View>
          )}
        </View>

        {/* Invoice info rows */}
        <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {[
            { label: 'Invoice No.', value: invoice.invoiceNo },
            { label: 'Customer', value: customerName },
            { label: 'Date', value: formatDate(invoice.createdAt) },
            invoice.dueDate && { label: 'Due Date', value: formatDate(invoice.dueDate) },
            invoice.buyerGstin && { label: 'Buyer GSTIN', value: invoice.buyerGstin },
            invoice.placeOfSupply && { label: 'Place of Supply', value: invoice.placeOfSupply },
          ]
            .filter(Boolean)
            .map((row: any, i: number, arr: any[]) => (
              <View
                key={row.label}
                className={`flex-row items-center justify-between px-4 py-3 ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}
              >
                <Text className="text-xs text-slate-400">{row.label}</Text>
                <Text className="text-sm font-medium text-slate-800">{row.value}</Text>
              </View>
            ))}
        </View>

        {/* Items table */}
        {invoice.items && invoice.items.length > 0 && (
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Items ({invoice.items.length})
            </Text>
            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {/* Header */}
              <View className="flex-row bg-slate-50 px-4 py-2">
                <Text className="flex-1 text-[11px] font-semibold uppercase text-slate-400">Item</Text>
                <Text className="w-10 text-[11px] font-semibold uppercase text-slate-400 text-right">Qty</Text>
                <Text className="w-20 text-[11px] font-semibold uppercase text-slate-400 text-right">Rate</Text>
                <Text className="w-20 text-[11px] font-semibold uppercase text-slate-400 text-right">Amount</Text>
              </View>
              {/* Rows */}
              {invoice.items.map((item: any, i: number) => (
                <View
                  key={item.id ?? i}
                  className={`flex-row px-4 py-3 ${i > 0 ? 'border-t border-slate-50' : ''}`}
                >
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-slate-800" numberOfLines={2}>
                      {item.product?.name ?? item.productName ?? 'Product'}
                    </Text>
                    {item.product?.unit && (
                      <Text className="text-[11px] text-slate-400">{item.product.unit}</Text>
                    )}
                  </View>
                  <Text className="w-10 text-sm text-slate-600 text-right">{item.quantity}</Text>
                  <Text className="w-20 text-sm text-slate-600 text-right">{formatCurrency(toFloat(item.unitPrice))}</Text>
                  <Text className="w-20 text-sm font-semibold text-slate-800 text-right">
                    {formatCurrency(toFloat(item.itemTotal))}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tax & totals breakdown */}
        <View className="bg-white rounded-2xl p-4 shadow-sm gap-2">
          <View className="flex-row justify-between">
            <Text className="text-sm text-slate-400">Subtotal</Text>
            <Text className="text-sm text-slate-800">{formatCurrency(subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-400">Discount</Text>
              <Text className="text-sm text-green-600">-{formatCurrency(discount)}</Text>
            </View>
          )}
          {hasTax && (
            <>
              {cgst > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-400">CGST</Text>
                  <Text className="text-sm text-slate-800">{formatCurrency(cgst)}</Text>
                </View>
              )}
              {sgst > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-400">SGST</Text>
                  <Text className="text-sm text-slate-800">{formatCurrency(sgst)}</Text>
                </View>
              )}
              {igst > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-400">IGST</Text>
                  <Text className="text-sm text-slate-800">{formatCurrency(igst)}</Text>
                </View>
              )}
            </>
          )}
          <View className="border-t border-slate-100 pt-2 flex-row justify-between">
            <Text className="text-sm font-bold text-slate-800">Total</Text>
            <Text className="text-sm font-bold text-slate-800">{formatCurrency(total)}</Text>
          </View>
          {paidAmount > 0 && (
            <View className="flex-row justify-between">
              <Text className="text-sm text-green-600">Paid</Text>
              <Text className="text-sm text-green-600">{formatCurrency(paidAmount)}</Text>
            </View>
          )}
          {pending > 0 && (
            <View className="flex-row justify-between">
              <Text className="text-sm font-bold text-red-600">Balance Due</Text>
              <Text className="text-sm font-bold text-red-600">{formatCurrency(pending)}</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-xs font-semibold uppercase text-slate-400 mb-1">Notes</Text>
            <Text className="text-sm text-slate-700">{invoice.notes}</Text>
          </View>
        )}

        {/* Action buttons */}
        <View className="flex-row flex-wrap gap-3">
          {waLink && (
            <TouchableOpacity
              onPress={() => Linking.openURL(waLink)}
              className="flex-1 min-w-[45%] flex-row items-center justify-center gap-2 border border-green-300 rounded-2xl py-3"
            >
              <Text className="text-base">💬</Text>
              <Text className="text-sm font-semibold text-green-700">WhatsApp</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() =>
              Share.share({
                title: invoice.invoiceNo,
                message: `Invoice ${invoice.invoiceNo} — ${formatCurrency(total)}\nCustomer: ${customerName}\nStatus: ${invoice.status}\nBalance due: ${formatCurrency(pending)}`,
              })
            }
            className="flex-1 min-w-[45%] flex-row items-center justify-center gap-2 border border-slate-200 rounded-2xl py-3"
          >
            <Text className="text-base">↗️</Text>
            <Text className="text-sm font-semibold text-slate-700">Share</Text>
          </TouchableOpacity>
        </View>

        {/* Convert Proforma → Invoice */}
        {invoice.status === 'proforma' && (
          <TouchableOpacity
            onPress={() => { setConvertAmount(String(total)); setConvertOpen(true); }}
            className="bg-blue-600 rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-bold">📄 Convert to Tax Invoice</Text>
          </TouchableOpacity>
        )}

        {/* Cancel button */}
        {canCancel && (
          <TouchableOpacity
            onPress={() => setConfirmCancel(true)}
            className="rounded-2xl py-4 items-center border border-red-200"
          >
            <Text className="text-red-600 font-semibold">✕ Cancel Invoice</Text>
          </TouchableOpacity>
        )}

        <View className="h-6" />
      </ScrollView>
        </View>
      </View>

      {/* ── Cancel confirmation modal ── */}
      <Modal visible={confirmCancel} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full">
            <Text className="text-lg font-bold text-slate-800 mb-2">Cancel {invoice.invoiceNo}?</Text>
            <Text className="text-sm text-slate-500 mb-6">
              This will cancel the invoice for {formatCurrency(total)}. This action cannot be undone.
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setConfirmCancel(false)}
                className="flex-1 border border-slate-200 rounded-xl py-3 items-center"
              >
                <Text className="font-semibold text-slate-700">Keep Invoice</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setConfirmCancel(false); cancelMutation.mutate(); }}
                disabled={cancelMutation.isPending}
                className="flex-1 bg-red-600 rounded-xl py-3 items-center"
              >
                {cancelMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-bold text-white">Yes, Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit invoice modal ── */}
      <Modal visible={editOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8" style={{ maxHeight: '80%' }}>
            <Text className="text-lg font-bold text-slate-800 mb-4">Edit {invoice.invoiceNo}</Text>
            <ScrollView>
              {editItems.map((item, idx) => {
                const lineTotal = Math.round(item.price * item.qty * (1 - (item.discount || 0) / 100) * 100) / 100;
                return (
                  <View key={item.id} className="flex-row items-center py-2 border-b border-slate-50 gap-2">
                    <Text className="flex-1 text-sm text-slate-800" numberOfLines={1}>{item.name}</Text>
                    {/* Qty stepper */}
                    <TouchableOpacity onPress={() => changeQty(idx, -1)} className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center">
                      <Text className="text-slate-600 font-bold">−</Text>
                    </TouchableOpacity>
                    <Text className="w-8 text-center font-semibold text-slate-800">{item.qty}</Text>
                    <TouchableOpacity onPress={() => changeQty(idx, 1)} className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center">
                      <Text className="text-slate-600 font-bold">+</Text>
                    </TouchableOpacity>
                    <Text className="w-20 text-right text-sm font-semibold text-slate-800">{formatCurrency(lineTotal)}</Text>
                    <TouchableOpacity onPress={() => setEditItems((prev) => prev.filter((_, i) => i !== idx))}>
                      <Text className="text-red-400 text-lg">✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Notes (optional)"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={2}
                className="mt-4 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
              />
            </ScrollView>
            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity onPress={() => setEditOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-3 items-center">
                <Text className="font-semibold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} disabled={updateMutation.isPending} className="flex-1 bg-primary rounded-xl py-3 items-center">
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

      {/* ── Convert proforma modal ── */}
      <Modal visible={convertOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
            <Text className="text-lg font-bold text-slate-800 mb-1">Convert to Tax Invoice</Text>
            <Text className="text-sm text-slate-500 mb-4">Optionally record an initial payment below.</Text>
            <Text className="text-xs font-medium text-slate-600 mb-1">Payment Amount (optional)</Text>
            <TextInput
              value={convertAmount}
              onChangeText={setConvertAmount}
              keyboardType="numeric"
              placeholder={`Max ${formatCurrency(total)}`}
              placeholderTextColor="#94a3b8"
              className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 mb-3"
            />
            <Text className="text-xs font-medium text-slate-600 mb-1">Payment Method</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => setConvertMethod(m.value)}
                  className={`px-4 py-2 rounded-full border ${convertMethod === m.value ? 'bg-primary border-primary' : 'border-slate-200'}`}
                >
                  <Text className={`text-sm font-medium ${convertMethod === m.value ? 'text-white' : 'text-slate-600'}`}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setConvertOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-3 items-center">
                <Text className="font-semibold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  // Conversion logic can be wired when backend endpoint is confirmed
                  Alert.alert('Convert', 'Proforma conversion submitted');
                  setConvertOpen(false);
                }}
                className="flex-1 bg-blue-600 rounded-xl py-3 items-center"
              >
                <Text className="font-bold text-white">Convert to Invoice</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
