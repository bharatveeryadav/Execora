"use strict";
/**
 * useBillingForm — Consolidates BillingScreen's 36+ useState calls into a single useReducer.
 * Provides dispatch and helper methods for state management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBillingForm = useBillingForm;
const react_1 = require("react");
const formReducer_1 = require("../lib/formReducer");
function useBillingForm(initialDraft) {
    const [state, dispatch] = (0, react_1.useReducer)(formReducer_1.formReducer, initialDraft
        ? { ...(0, formReducer_1.getInitialFormState)(), ...initialDraft }
        : (0, formReducer_1.getInitialFormState)());
    // ──────────────────────────────────────────────────────────────────────────
    // Item management helpers
    // ──────────────────────────────────────────────────────────────────────────
    const addItem = (0, react_1.useCallback)(() => {
        dispatch({ type: "ADD_ITEM" });
    }, []);
    const updateItem = (0, react_1.useCallback)((id, patch) => {
        dispatch({ type: "UPDATE_ITEM", id, patch });
    }, []);
    const removeItem = (0, react_1.useCallback)((id) => {
        dispatch({ type: "REMOVE_ITEM", id });
    }, []);
    const clearItems = (0, react_1.useCallback)(() => {
        dispatch({ type: "CLEAR_ITEMS" });
    }, []);
    // ──────────────────────────────────────────────────────────────────────────
    // Customer helpers
    // ──────────────────────────────────────────────────────────────────────────
    const setCustomer = (0, react_1.useCallback)((customer) => {
        dispatch({ type: "SET_CUSTOMER", customer });
    }, []);
    const setCustomerQuery = (0, react_1.useCallback)((query) => {
        dispatch({ type: "SET_CUSTOMER_QUERY", query });
    }, []);
    const toggleCustomerSuggest = (0, react_1.useCallback)((value) => {
        dispatch({ type: "TOGGLE_CUSTOMER_SUGGEST" });
    }, []);
    const setCustSuggest = (0, react_1.useCallback)((value) => {
        dispatch({ type: "SET_CUSTOMER_SUGGEST", value });
    }, []);
    // ──────────────────────────────────────────────────────────────────────────
    // Pricing helpers
    // ──────────────────────────────────────────────────────────────────────────
    const setWithGst = (0, react_1.useCallback)((value) => {
        dispatch({ type: "SET_WITH_GST", value });
    }, []);
    const setDiscountPct = (0, react_1.useCallback)((value) => {
        dispatch({ type: "SET_DISCOUNT_PCT", value });
    }, []);
    const setDiscountFlat = (0, react_1.useCallback)((value) => {
        dispatch({ type: "SET_DISCOUNT_FLAT", value });
    }, []);
    const setRoundOff = (0, react_1.useCallback)((value) => {
        dispatch({ type: "SET_ROUND_OFF", value });
    }, []);
    // ──────────────────────────────────────────────────────────────────────────
    // Payment helpers
    // ──────────────────────────────────────────────────────────────────────────
    const setPaymentMode = (0, react_1.useCallback)((mode) => {
        dispatch({ type: "SET_PAYMENT_MODE", mode });
    }, []);
    const setPaymentAmount = (0, react_1.useCallback)((amount) => {
        dispatch({ type: "SET_PAYMENT_AMOUNT", amount });
    }, []);
    const toggleSplit = (0, react_1.useCallback)((value) => {
        dispatch({ type: "TOGGLE_SPLIT", value });
    }, []);
    const addSplit = (0, react_1.useCallback)(() => {
        dispatch({ type: "ADD_SPLIT" });
    }, []);
    const updateSplit = (0, react_1.useCallback)((id, patch) => {
        dispatch({ type: "UPDATE_SPLIT", id, patch });
    }, []);
    const removeSplit = (0, react_1.useCallback)((id) => {
        dispatch({ type: "REMOVE_SPLIT", id });
    }, []);
    // ──────────────────────────────────────────────────────────────────────────
    // Metadata helpers
    // ──────────────────────────────────────────────────────────────────────────
    const setNotes = (0, react_1.useCallback)((notes) => {
        dispatch({ type: "SET_NOTES", notes });
    }, []);
    const setDueDate = (0, react_1.useCallback)((date) => {
        dispatch({ type: "SET_DUE_DATE", date });
    }, []);
    // ──────────────────────────────────────────────────────────────────────────
    // UI State helpers
    // ──────────────────────────────────────────────────────────────────────────
    const setActiveRow = (0, react_1.useCallback)((id) => {
        dispatch({ type: "SET_ACTIVE_ROW", id });
    }, []);
    const toggleNewCustModal = (0, react_1.useCallback)((value) => {
        dispatch({ type: "TOGGLE_NEW_CUST_MODAL", value });
    }, []);
    const setNewCustName = (0, react_1.useCallback)((name) => {
        dispatch({ type: "SET_NEW_CUST_NAME", name });
    }, []);
    const setNewCustPhone = (0, react_1.useCallback)((phone) => {
        dispatch({ type: "SET_NEW_CUST_PHONE", phone });
    }, []);
    const toggleProductPicker = (0, react_1.useCallback)((value) => {
        dispatch({ type: "TOGGLE_PRODUCT_PICKER", value });
    }, []);
    const toggleDraftBanner = (0, react_1.useCallback)((value) => {
        dispatch({ type: "TOGGLE_DRAFT_BANNER", value });
    }, []);
    const toggleBillingSetup = (0, react_1.useCallback)((expand) => {
        dispatch({ type: "TOGGLE_BILLING_SETUP", expand });
    }, []);
    const toggleInvoiceStyle = (0, react_1.useCallback)((expand) => {
        dispatch({ type: "TOGGLE_INVOICE_STYLE", expand });
    }, []);
    const toggleInvoiceBarEdit = (0, react_1.useCallback)((value) => {
        dispatch({ type: "TOGGLE_INVOICE_BAR_EDIT", value });
    }, []);
    const togglePreview = (0, react_1.useCallback)((value) => {
        dispatch({ type: "TOGGLE_PREVIEW", value });
    }, []);
    // ──────────────────────────────────────────────────────────────────────────
    // Batch operations
    // ──────────────────────────────────────────────────────────────────────────
    const resetForm = (0, react_1.useCallback)(() => {
        dispatch({ type: "RESET_FORM" });
    }, []);
    const loadDraft = (0, react_1.useCallback)((draft) => {
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
//# sourceMappingURL=useBillingForm.js.map