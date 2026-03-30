/**
 * useBillingForm — Consolidates BillingScreen's 36+ useState calls into a single useReducer.
 * Provides dispatch and helper methods for state management.
 */

import { useReducer, useCallback } from "react";
import {
  getInitialFormState,
  formReducer,
  type FormState,
  type FormAction,
} from "../lib/formReducer";
import type {
  BillingItem,
  Customer,
  PaymentMode,
  PaymentSplit,
} from "@execora/shared";

export function useBillingForm(initialDraft?: Partial<FormState>) {
  const [state, dispatch] = useReducer(
    formReducer,
    initialDraft
      ? { ...getInitialFormState(), ...initialDraft }
      : getInitialFormState(),
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Item management helpers
  // ──────────────────────────────────────────────────────────────────────────

  const addItem = useCallback(() => {
    dispatch({ type: "ADD_ITEM" });
  }, []);

  const updateItem = useCallback((id: number, patch: Partial<BillingItem>) => {
    dispatch({ type: "UPDATE_ITEM", id, patch });
  }, []);

  const removeItem = useCallback((id: number) => {
    dispatch({ type: "REMOVE_ITEM", id });
  }, []);

  const clearItems = useCallback(() => {
    dispatch({ type: "CLEAR_ITEMS" });
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Customer helpers
  // ──────────────────────────────────────────────────────────────────────────

  const setCustomer = useCallback((customer: Customer | null) => {
    dispatch({ type: "SET_CUSTOMER", customer });
  }, []);

  const setCustomerQuery = useCallback((query: string) => {
    dispatch({ type: "SET_CUSTOMER_QUERY", query });
  }, []);

  const toggleCustomerSuggest = useCallback((value: boolean) => {
    dispatch({ type: "TOGGLE_CUSTOMER_SUGGEST" });
  }, []);

  const setCustSuggest = useCallback((value: boolean) => {
    dispatch({ type: "SET_CUSTOMER_SUGGEST", value });
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Pricing helpers
  // ──────────────────────────────────────────────────────────────────────────

  const setWithGst = useCallback((value: boolean) => {
    dispatch({ type: "SET_WITH_GST", value });
  }, []);

  const setDiscountPct = useCallback((value: string) => {
    dispatch({ type: "SET_DISCOUNT_PCT", value });
  }, []);

  const setDiscountFlat = useCallback((value: string) => {
    dispatch({ type: "SET_DISCOUNT_FLAT", value });
  }, []);

  const setRoundOff = useCallback((value: boolean) => {
    dispatch({ type: "SET_ROUND_OFF", value });
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Payment helpers
  // ──────────────────────────────────────────────────────────────────────────

  const setPaymentMode = useCallback((mode: PaymentMode) => {
    dispatch({ type: "SET_PAYMENT_MODE", mode });
  }, []);

  const setPaymentAmount = useCallback((amount: string) => {
    dispatch({ type: "SET_PAYMENT_AMOUNT", amount });
  }, []);

  const toggleSplit = useCallback((value: boolean) => {
    dispatch({ type: "TOGGLE_SPLIT", value });
  }, []);

  const addSplit = useCallback(() => {
    dispatch({ type: "ADD_SPLIT" });
  }, []);

  const updateSplit = useCallback(
    (id: number, patch: Partial<PaymentSplit>) => {
      dispatch({ type: "UPDATE_SPLIT", id, patch });
    },
    [],
  );

  const removeSplit = useCallback((id: number) => {
    dispatch({ type: "REMOVE_SPLIT", id });
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Metadata helpers
  // ──────────────────────────────────────────────────────────────────────────

  const setNotes = useCallback((notes: string) => {
    dispatch({ type: "SET_NOTES", notes });
  }, []);

  const setDueDate = useCallback((date: string) => {
    dispatch({ type: "SET_DUE_DATE", date });
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // UI State helpers
  // ──────────────────────────────────────────────────────────────────────────

  const setActiveRow = useCallback((id: number | null) => {
    dispatch({ type: "SET_ACTIVE_ROW", id });
  }, []);

  const toggleNewCustModal = useCallback((value: boolean) => {
    dispatch({ type: "TOGGLE_NEW_CUST_MODAL", value });
  }, []);

  const setNewCustName = useCallback((name: string) => {
    dispatch({ type: "SET_NEW_CUST_NAME", name });
  }, []);

  const setNewCustPhone = useCallback((phone: string) => {
    dispatch({ type: "SET_NEW_CUST_PHONE", phone });
  }, []);

  const toggleProductPicker = useCallback((value: boolean) => {
    dispatch({ type: "TOGGLE_PRODUCT_PICKER", value });
  }, []);

  const toggleDraftBanner = useCallback((value: boolean) => {
    dispatch({ type: "TOGGLE_DRAFT_BANNER", value });
  }, []);

  const toggleBillingSetup = useCallback((expand: boolean) => {
    dispatch({ type: "TOGGLE_BILLING_SETUP", expand });
  }, []);

  const toggleInvoiceStyle = useCallback((expand: boolean) => {
    dispatch({ type: "TOGGLE_INVOICE_STYLE", expand });
  }, []);

  const toggleInvoiceBarEdit = useCallback((value: boolean) => {
    dispatch({ type: "TOGGLE_INVOICE_BAR_EDIT", value });
  }, []);

  const togglePreview = useCallback((value: boolean) => {
    dispatch({ type: "TOGGLE_PREVIEW", value });
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Batch operations
  // ──────────────────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    dispatch({ type: "RESET_FORM" });
  }, []);

  const loadDraft = useCallback((draft: Partial<FormState>) => {
    dispatch({ type: "LOAD_DRAFT", draft });
  }, []);

  return {
    // Raw state
    state,

    // Raw dispatch (for advanced uses)
    dispatch,

    // Item management
    addItem,
    updateItem,
    removeItem,
    clearItems,

    // Customer
    setCustomer,
    setCustomerQuery,
    toggleCustomerSuggest,
    setCustSuggest,

    // Pricing
    setWithGst,
    setDiscountPct,
    setDiscountFlat,
    setRoundOff,

    // Payment
    setPaymentMode,
    setPaymentAmount,
    toggleSplit,
    addSplit,
    updateSplit,
    removeSplit,

    // Metadata
    setNotes,
    setDueDate,

    // UI
    setActiveRow,
    toggleNewCustModal,
    setNewCustName,
    setNewCustPhone,
    toggleProductPicker,
    toggleDraftBanner,
    toggleBillingSetup,
    toggleInvoiceStyle,
    toggleInvoiceBarEdit,
    togglePreview,

    // Batch
    resetForm,
    loadDraft,
  };
}
