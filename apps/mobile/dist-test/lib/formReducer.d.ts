/**
 * Form state reducer for BillingScreen
 * Consolidates 80+ useState calls into a single useReducer
 * Enables predictable state transitions and easier testing
 */
import type { BillingItem, Customer, PaymentMode, PaymentSplit } from "@execora/shared";
export type FormState = {
    items: BillingItem[];
    selectedCustomer: Customer | null;
    customerQuery: string;
    showCustSuggest: boolean;
    withGst: boolean;
    discountPct: string;
    discountFlat: string;
    roundOffEnabled: boolean;
    paymentMode: PaymentMode;
    paymentAmount: string;
    splitEnabled: boolean;
    splits: PaymentSplit[];
    notes: string;
    dueDate: string;
    activeRow: number | null;
    showNewCust: boolean;
    productPickerOpen: boolean;
    newCustName: string;
    newCustPhone: string;
    draftBanner: boolean;
    billingSetupExpanded: boolean;
    invoiceStyleExpanded: boolean;
    showInvoiceBarEdit: boolean;
    showPreview: boolean;
};
export type FormAction = {
    type: "ADD_ITEM";
} | {
    type: "UPDATE_ITEM";
    id: number;
    patch: Partial<BillingItem>;
} | {
    type: "REMOVE_ITEM";
    id: number;
} | {
    type: "CLEAR_ITEMS";
} | {
    type: "SET_CUSTOMER";
    customer: Customer | null;
} | {
    type: "SET_CUSTOMER_QUERY";
    query: string;
} | {
    type: "TOGGLE_CUSTOMER_SUGGEST";
} | {
    type: "SET_CUSTOMER_SUGGEST";
    value: boolean;
} | {
    type: "SET_WITH_GST";
    value: boolean;
} | {
    type: "SET_DISCOUNT_PCT";
    value: string;
} | {
    type: "SET_DISCOUNT_FLAT";
    value: string;
} | {
    type: "SET_ROUND_OFF";
    value: boolean;
} | {
    type: "SET_PAYMENT_MODE";
    mode: PaymentMode;
} | {
    type: "SET_PAYMENT_AMOUNT";
    amount: string;
} | {
    type: "TOGGLE_SPLIT";
    value: boolean;
} | {
    type: "ADD_SPLIT";
} | {
    type: "UPDATE_SPLIT";
    id: number;
    patch: Partial<PaymentSplit>;
} | {
    type: "REMOVE_SPLIT";
    id: number;
} | {
    type: "SET_NOTES";
    notes: string;
} | {
    type: "SET_DUE_DATE";
    date: string;
} | {
    type: "SET_ACTIVE_ROW";
    id: number | null;
} | {
    type: "TOGGLE_NEW_CUST_MODAL";
    value: boolean;
} | {
    type: "SET_NEW_CUST_NAME";
    name: string;
} | {
    type: "SET_NEW_CUST_PHONE";
    phone: string;
} | {
    type: "TOGGLE_PRODUCT_PICKER";
    value: boolean;
} | {
    type: "TOGGLE_DRAFT_BANNER";
    value: boolean;
} | {
    type: "TOGGLE_BILLING_SETUP";
    expand: boolean;
} | {
    type: "TOGGLE_INVOICE_STYLE";
    expand: boolean;
} | {
    type: "TOGGLE_INVOICE_BAR_EDIT";
    value: boolean;
} | {
    type: "TOGGLE_PREVIEW";
    value: boolean;
} | {
    type: "RESET_FORM";
} | {
    type: "LOAD_DRAFT";
    draft: Partial<FormState>;
};
export declare function formReducer(state: FormState, action: FormAction): FormState;
export declare function getInitialFormState(): FormState;
//# sourceMappingURL=formReducer.d.ts.map