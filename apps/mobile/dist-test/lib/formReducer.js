"use strict";
/**
 * Form state reducer for BillingScreen
 * Consolidates 80+ useState calls into a single useReducer
 * Enables predictable state transitions and easier testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formReducer = formReducer;
exports.getInitialFormState = getInitialFormState;
function formReducer(state, action) {
    switch (action.type) {
        // Items ────────────────────────────────────────────────────────────────
        case "ADD_ITEM": {
            // Dynamically generate IDs
            const nextId = Math.max(0, ...state.items.map((i) => i.id ?? 0)) + 1;
            return {
                ...state,
                items: [
                    ...state.items,
                    {
                        id: nextId,
                        name: "",
                        qty: "1",
                        rate: "",
                        unit: "pcs",
                        discount: "",
                        amount: 0,
                    },
                ],
            };
        }
        case "UPDATE_ITEM": {
            return {
                ...state,
                items: state.items.map((it) => it.id === action.id
                    ? {
                        ...it,
                        ...action.patch,
                        // Compute amount whenever rate/qty/discount change
                        amount: action.patch.amount ??
                            (action.patch.rate ||
                                action.patch.qty ||
                                action.patch.discount
                                ? computeAmount(action.patch.rate ?? it.rate, action.patch.qty ?? it.qty, action.patch.discount ?? it.discount)
                                : it.amount),
                    }
                    : it),
            };
        }
        case "REMOVE_ITEM":
            return {
                ...state,
                items: state.items.length > 1
                    ? state.items.filter((it) => it.id !== action.id)
                    : state.items,
            };
        case "CLEAR_ITEMS":
            return {
                ...state,
                items: [
                    {
                        id: 1,
                        name: "",
                        qty: "1",
                        rate: "",
                        unit: "pcs",
                        discount: "",
                        amount: 0,
                    },
                ],
            };
        // Customer ──────────────────────────────────────────────────────────────
        case "SET_CUSTOMER":
            return {
                ...state,
                selectedCustomer: action.customer,
                showCustSuggest: false,
            };
        case "SET_CUSTOMER_QUERY":
            return {
                ...state,
                customerQuery: action.query,
            };
        case "TOGGLE_CUSTOMER_SUGGEST":
            return {
                ...state,
                showCustSuggest: !state.showCustSuggest,
            };
        case "SET_CUSTOMER_SUGGEST":
            return {
                ...state,
                showCustSuggest: action.value,
            };
        // Pricing ───────────────────────────────────────────────────────────────
        case "SET_WITH_GST":
            return {
                ...state,
                withGst: action.value,
            };
        case "SET_DISCOUNT_PCT":
            return {
                ...state,
                discountPct: action.value,
                discountFlat: action.value ? "" : state.discountFlat, // Clear flat when % set
            };
        case "SET_DISCOUNT_FLAT":
            return {
                ...state,
                discountFlat: action.value,
                discountPct: action.value ? "" : state.discountPct, // Clear % when flat set
            };
        case "SET_ROUND_OFF":
            return {
                ...state,
                roundOffEnabled: action.value,
            };
        // Payment ───────────────────────────────────────────────────────────────
        case "SET_PAYMENT_MODE":
            return {
                ...state,
                paymentMode: action.mode,
            };
        case "SET_PAYMENT_AMOUNT":
            return {
                ...state,
                paymentAmount: action.amount,
            };
        case "TOGGLE_SPLIT":
            return {
                ...state,
                splitEnabled: action.value,
                splits: action.value
                    ? state.splits.length > 0
                        ? state.splits
                        : [{ id: 1, mode: "cash", amount: "" }]
                    : [{ id: 1, mode: "cash", amount: "" }],
            };
        case "ADD_SPLIT": {
            const nextId = Math.max(0, ...state.splits.map((s) => s.id ?? 0)) + 1;
            return {
                ...state,
                splits: [...state.splits, { id: nextId, mode: "cash", amount: "" }],
            };
        }
        case "UPDATE_SPLIT":
            return {
                ...state,
                splits: state.splits.map((s) => s.id === action.id ? { ...s, ...action.patch } : s),
            };
        case "REMOVE_SPLIT":
            return {
                ...state,
                splits: state.splits.length > 1
                    ? state.splits.filter((s) => s.id !== action.id)
                    : state.splits,
            };
        // Metadata ──────────────────────────────────────────────────────────────
        case "SET_NOTES":
            return {
                ...state,
                notes: action.notes,
            };
        case "SET_DUE_DATE":
            return {
                ...state,
                dueDate: action.date,
            };
        // UI State ──────────────────────────────────────────────────────────────
        case "SET_ACTIVE_ROW":
            return {
                ...state,
                activeRow: action.id,
            };
        case "TOGGLE_NEW_CUST_MODAL":
            return {
                ...state,
                showNewCust: action.value,
            };
        case "SET_NEW_CUST_NAME":
            return {
                ...state,
                newCustName: action.name,
            };
        case "SET_NEW_CUST_PHONE":
            return {
                ...state,
                newCustPhone: action.phone,
            };
        case "TOGGLE_PRODUCT_PICKER":
            return {
                ...state,
                productPickerOpen: action.value,
            };
        case "TOGGLE_DRAFT_BANNER":
            return {
                ...state,
                draftBanner: action.value,
            };
        case "TOGGLE_BILLING_SETUP":
            return {
                ...state,
                billingSetupExpanded: action.expand,
            };
        case "TOGGLE_INVOICE_STYLE":
            return {
                ...state,
                invoiceStyleExpanded: action.expand,
            };
        case "TOGGLE_INVOICE_BAR_EDIT":
            return {
                ...state,
                showInvoiceBarEdit: action.value,
            };
        case "TOGGLE_PREVIEW":
            return {
                ...state,
                showPreview: action.value,
            };
        // Batch operations ──────────────────────────────────────────────────────
        case "RESET_FORM":
            return getInitialFormState();
        case "LOAD_DRAFT":
            return {
                ...state,
                ...action.draft,
            };
        default:
            return state;
    }
}
function getInitialFormState() {
    return {
        items: [
            {
                id: 1,
                name: "",
                qty: "1",
                rate: "",
                unit: "pcs",
                discount: "",
                amount: 0,
            },
        ],
        selectedCustomer: null,
        customerQuery: "",
        showCustSuggest: false,
        withGst: false,
        discountPct: "",
        discountFlat: "",
        roundOffEnabled: false,
        paymentMode: "cash",
        paymentAmount: "",
        splitEnabled: false,
        splits: [{ id: 1, mode: "cash", amount: "" }],
        notes: "",
        dueDate: "",
        activeRow: null,
        showNewCust: false,
        productPickerOpen: false,
        newCustName: "",
        newCustPhone: "",
        draftBanner: false,
        billingSetupExpanded: false,
        invoiceStyleExpanded: false,
        showInvoiceBarEdit: false,
        showPreview: false,
    };
}
// Helper function for item amount calculation
function computeAmount(rate, qty, discount) {
    const r = parseFloat(String(rate)) || 0;
    const q = parseFloat(String(qty)) || 0;
    const d = parseFloat(String(discount)) || 0;
    return Math.max(0, r * q * (1 - d / 100));
}
//# sourceMappingURL=formReducer.js.map