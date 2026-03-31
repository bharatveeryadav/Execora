/**
 * useInvoiceBar — manages the Indian standard invoice configuration bar.
 *
 * Extracted from BillingScreen to keep the screen focused on rendering.
 * Persists state to MMKV via INVOICE_BAR_KEY using the existing readInvoiceBar
 * / persistInvoiceBar helpers.
 *
 * Provides:
 *   - invoicePrefix, documentDate, dueDateDays, documentTitle, discountOnType
 *   - priceTierIdx + getEffectivePrice()
 *   - computedDueDate (derived)
 *   - saveInvoiceBar()
 */

import { useState, useMemo, useCallback } from 'react';
import type { Product } from '@execora/shared';
import { storage } from '../../../lib/storage';
import { INVOICE_BAR_KEY, PRICE_TIER_KEY } from '../lib/storageKeys';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DocumentTitle = 'invoice' | 'billOfSupply';

export type DiscountOnType =
  | 'unit_price'
  | 'price_with_tax'
  | 'net_amount'
  | 'total_amount';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function readInvoiceBar(): Record<string, unknown> {
  try {
    const raw = storage.getString(INVOICE_BAR_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function persistInvoiceBar(data: Record<string, unknown>): void {
  storage.set(INVOICE_BAR_KEY, JSON.stringify(data));
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useInvoiceBar() {
  const [invoicePrefix, setInvoicePrefix] = useState(
    () => (readInvoiceBar().invoicePrefix as string) ?? 'INV-',
  );

  const [documentDate, setDocumentDate] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (readInvoiceBar().documentDate as string) ?? today;
  });

  const [dueDateDays, setDueDateDays] = useState<number | 'custom'>(() => {
    const v = readInvoiceBar().dueDateDays;
    return v === 'custom' || (typeof v === 'number' && [15, 30, 60].includes(v))
      ? (v as number | 'custom')
      : 15;
  });

  const [customDueDays, setCustomDueDays] = useState(
    () => String((readInvoiceBar().customDueDays as number) ?? 45),
  );

  const [documentTitle, setDocumentTitle] = useState<DocumentTitle>(() => {
    const v = readInvoiceBar().documentTitle as string;
    return v === 'billOfSupply' ? 'billOfSupply' : 'invoice';
  });

  const [discountOnType, setDiscountOnType] = useState<DiscountOnType>(() => {
    const v = readInvoiceBar().discountOnType as string;
    return (['unit_price', 'price_with_tax', 'net_amount', 'total_amount'] as const).includes(
      v as DiscountOnType,
    )
      ? (v as DiscountOnType)
      : 'net_amount';
  });

  // ── Price tier (Retail / Wholesale / Dealer) ──────────────────────────────
  const [priceTierIdx, setPriceTierIdx] = useState<number | null>(() => {
    const v = parseInt(storage.getString(PRICE_TIER_KEY) ?? '-1', 10);
    return v >= 0 ? v : null;
  });

  const PRICE_TIERS = [
    { name: 'Retail', key: 0 },
    { name: 'Wholesale', key: 1 },
    { name: 'Dealer', key: 2 },
  ] as const;

  const getEffectivePrice = useCallback(
    (
      p: Product & {
        wholesalePrice?: number | string | null;
        priceTier2?: number | string | null;
        priceTier3?: number | string | null;
      },
    ): number => {
      const base = parseFloat(String(p.price ?? 0));
      if (priceTierIdx === 1 && p.wholesalePrice != null)
        return parseFloat(String(p.wholesalePrice));
      if (priceTierIdx === 2 && p.priceTier2 != null)
        return parseFloat(String(p.priceTier2));
      if (priceTierIdx === 3 && p.priceTier3 != null)
        return parseFloat(String(p.priceTier3));
      return base;
    },
    [priceTierIdx],
  );

  // ── Derived computed due date ─────────────────────────────────────────────
  const computedDueDate = useMemo(() => {
    const base = new Date(documentDate);
    const days =
      dueDateDays === 'custom' ? parseInt(customDueDays, 10) || 0 : dueDateDays;
    if (days <= 0) return '';
    base.setDate(base.getDate() + days);
    return base.toISOString().slice(0, 10);
  }, [documentDate, dueDateDays, customDueDays]);

  // ── Persist to MMKV ───────────────────────────────────────────────────────
  const saveInvoiceBar = useCallback(() => {
    persistInvoiceBar({
      invoicePrefix,
      documentDate,
      dueDateDays,
      customDueDays: parseInt(customDueDays, 10) || 15,
      documentTitle,
      discountOnType,
    });
  }, [invoicePrefix, documentDate, dueDateDays, customDueDays, documentTitle, discountOnType]);

  return {
    // State
    invoicePrefix,
    documentDate,
    dueDateDays,
    customDueDays,
    documentTitle,
    discountOnType,
    priceTierIdx,
    computedDueDate,
    PRICE_TIERS,
    // Setters
    setInvoicePrefix,
    setDocumentDate,
    setDueDateDays,
    setCustomDueDays,
    setDocumentTitle,
    setDiscountOnType,
    setPriceTierIdx,
    // Actions
    getEffectivePrice,
    saveInvoiceBar,
  };
}
