/**
 * useDraftManager — handles MMKV draft auto-save and restore for BillingScreen.
 *
 * Extracts the 2s debounce save + mount restore logic from BillingScreen
 * so the main screen component focuses on rendering only.
 *
 * Usage:
 *   const { draftRestoredRef, discardDraft } = useDraftManager({ ... });
 */

import { useEffect, useRef, useCallback } from "react";
import type { PaymentMode, BillingItem } from "@execora/shared";
import { storage } from "../../../lib/storage";
import { INVOICE_DRAFT_KEY } from "../lib/storageKeys";

// Draft expires after 24 hours
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export function isDraftExpired(savedAt: number): boolean {
  return Date.now() - savedAt > DRAFT_TTL_MS;
}

let _draftId = 1;

interface DraftFields {
  items: BillingItem[];
  selectedCustomer: { id: string; name: string; phone?: string } | null;
  withGst: boolean;
  discountPct: string;
  discountFlat: string;
  paymentMode: PaymentMode;
  paymentAmount: string;
  splitEnabled: boolean;
  notes: string;
  dueDate: string;
  validItemCount: number;
}

interface DraftActions {
  loadDraft: (draft: Record<string, unknown>) => void;
  formReset: () => void;
}

interface UseDraftManagerResult {
  /** Whether a draft was restored on this mount */
  draftRestoredRef: React.MutableRefObject<boolean>;
  /** Clear the form + delete MMKV draft */
  discardDraft: () => void;
}

export function useDraftManager(
  fields: DraftFields,
  actions: DraftActions,
): UseDraftManagerResult {
  const draftRestoredRef = useRef(false);
  const { loadDraft, formReset } = actions;

  const {
    items,
    selectedCustomer,
    withGst,
    discountPct,
    discountFlat,
    paymentMode,
    paymentAmount,
    splitEnabled,
    notes,
    dueDate,
    validItemCount,
  } = fields;

  // ── Auto-save (2 s debounce) ──────────────────────────────────────────────
  useEffect(() => {
    if (validItemCount === 0 && !selectedCustomer) return;
    const t = setTimeout(() => {
      storage.set(
        INVOICE_DRAFT_KEY,
        JSON.stringify({
          items: items.filter((it) => it.name.trim()),
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.name,
          customerPhone: selectedCustomer?.phone,
          withGst,
          discountPct,
          discountFlat,
          paymentMode,
          paymentAmount,
          splitEnabled,
          notes,
          dueDate,
          savedAt: Date.now(),
        }),
      );
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    items,
    selectedCustomer,
    withGst,
    discountPct,
    discountFlat,
    paymentMode,
    paymentAmount,
    splitEnabled,
    notes,
    dueDate,
    validItemCount,
  ]);

  // ── Restore on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    const raw = storage.getString(INVOICE_DRAFT_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (!Array.isArray(d.items) || !d.items.length || !d.savedAt) return;
      if (isDraftExpired(Number(d.savedAt))) {
        storage.delete(INVOICE_DRAFT_KEY);
        return;
      }
      draftRestoredRef.current = true;
      const restored = (d.items as BillingItem[]).map((it) => ({
        ...it,
        id: _draftId++,
      }));
      loadDraft({
        items: restored,
        ...(d.withGst !== undefined ? { withGst: Boolean(d.withGst) } : {}),
        ...(d.discountPct ? { discountPct: String(d.discountPct) } : {}),
        ...(d.discountFlat ? { discountFlat: String(d.discountFlat) } : {}),
        ...(d.paymentMode ? { paymentMode: d.paymentMode as PaymentMode } : {}),
        ...(d.paymentAmount ? { paymentAmount: String(d.paymentAmount) } : {}),
        ...(d.splitEnabled ? { splitEnabled: Boolean(d.splitEnabled) } : {}),
        ...(d.notes ? { notes: String(d.notes) } : {}),
        ...(d.dueDate ? { dueDate: String(d.dueDate) } : {}),
        ...(d.customerName
          ? {
              selectedCustomer: {
                id: String(d.customerId ?? ""),
                tenantId: "",
                name: String(d.customerName),
                phone: d.customerPhone ? String(d.customerPhone) : undefined,
                balance: 0,
                totalPurchases: 0,
                totalPayments: 0,
                createdAt: "",
                updatedAt: "",
              },
            }
          : {}),
        draftBanner: true,
      });
    } catch {
      storage.delete(INVOICE_DRAFT_KEY);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const discardDraft = useCallback(() => {
    formReset();
    storage.delete(INVOICE_DRAFT_KEY);
  }, [formReset]);

  return { draftRestoredRef, discardDraft };
}
