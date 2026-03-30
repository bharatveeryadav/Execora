/**
 * useBillingForm — Consolidates BillingScreen's 36+ useState calls into a single useReducer.
 * Provides dispatch and helper methods for state management.
 */
import { type FormState, type FormAction } from "../lib/formReducer";
import type { BillingItem, Customer, PaymentMode, PaymentSplit } from "@execora/shared";
export declare function useBillingForm(initialDraft?: Partial<FormState>): {
    state: FormState;
    dispatch: import("react").Dispatch<FormAction>;
    addItem: () => void;
    updateItem: (id: number, patch: Partial<BillingItem>) => void;
    removeItem: (id: number) => void;
    clearItems: () => void;
    setCustomer: (customer: Customer | null) => void;
    setCustomerQuery: (query: string) => void;
    toggleCustomerSuggest: (value: boolean) => void;
    setCustSuggest: (value: boolean) => void;
    setWithGst: (value: boolean) => void;
    setDiscountPct: (value: string) => void;
    setDiscountFlat: (value: string) => void;
    setRoundOff: (value: boolean) => void;
    setPaymentMode: (mode: PaymentMode) => void;
    setPaymentAmount: (amount: string) => void;
    toggleSplit: (value: boolean) => void;
    addSplit: () => void;
    updateSplit: (id: number, patch: Partial<PaymentSplit>) => void;
    removeSplit: (id: number) => void;
    setNotes: (notes: string) => void;
    setDueDate: (date: string) => void;
    setActiveRow: (id: number | null) => void;
    toggleNewCustModal: (value: boolean) => void;
    setNewCustName: (name: string) => void;
    setNewCustPhone: (phone: string) => void;
    toggleProductPicker: (value: boolean) => void;
    toggleDraftBanner: (value: boolean) => void;
    toggleBillingSetup: (expand: boolean) => void;
    toggleInvoiceStyle: (expand: boolean) => void;
    toggleInvoiceBarEdit: (value: boolean) => void;
    togglePreview: (value: boolean) => void;
    resetForm: () => void;
    loadDraft: (draft: Partial<FormState>) => void;
};
//# sourceMappingURL=useBillingForm.d.ts.map