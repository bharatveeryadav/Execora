"use strict";
/**
 * Shared constants for Mobile App
 * Centralizes magic strings, colors, sizes used across screens
 * Ensures consistency and enables theming
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULTS = exports.PAGINATION = exports.FEATURES = exports.API_ENDPOINTS = exports.STORAGE_KEYS = exports.SUCCESS_MESSAGES = exports.ERROR_MESSAGES = exports.DATE_FORMATS = exports.INTERVALS = exports.ANIMATIONS = exports.LANGUAGE_LABELS = exports.LANGUAGES = exports.CUSTOMER_TAGS = exports.PAYMENT_METHODS = exports.PAYMENT_METHOD_ICONS = exports.DOCUMENT_TYPES = exports.STATUS_STYLES = exports.STATUS_COLORS = exports.COLORS = exports.SIZES = void 0;
// ── UI Dimensions ──────────────────────────────────────────────────────────
exports.SIZES = {
    // Touch target (Apple: 44×44 minimum)
    TOUCH_MIN: 44,
    // Button sizing scale
    BUTTON: {
        sm: {
            minHeight: 44,
            paddingX: 12,
            paddingY: 8,
            fontSize: 12,
        },
        md: {
            minHeight: 44,
            paddingX: 16,
            paddingY: 10,
            fontSize: 14,
        },
        lg: {
            minHeight: 48,
            paddingX: 20,
            paddingY: 12,
            fontSize: 16,
        },
    },
    // Spacing scale
    SPACING: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        xxl: 32,
    },
    // Border radius scale
    RADIUS: {
        sm: 6,
        md: 8,
        lg: 12,
        xl: 16,
        full: 9999,
    },
    // Font sizes
    FONT: {
        xs: 10,
        sm: 12,
        base: 14,
        lg: 16,
        xl: 18,
        "2xl": 20,
        "3xl": 24,
        "4xl": 32,
    },
    // List row heights
    LIST_ROW: 56,
    LIST_ROW_COMPACT: 44,
    LIST_ROW_LARGE: 80,
};
// ── Colors ────────────────────────────────────────────────────────────────
exports.COLORS = {
    primary: "#e67e22",
    secondary: "#3498db",
    success: "#27ae60",
    warning: "#f39c12",
    error: "#e74c3c",
    danger: "#c0392b",
    // Neutral scale
    slate: {
        50: "#f8fafc",
        100: "#f1f5f9",
        200: "#e2e8f0",
        300: "#cbd5e1",
        400: "#94a3b8",
        500: "#64748b",
        600: "#475569",
        700: "#334155",
        800: "#1e293b",
        900: "#0f172a",
    },
    // Semantic colors
    bg: {
        primary: "#f8fafc",
        secondary: "#f5f3ff",
        success: "#dcfce7",
        warning: "#fef3c7",
        error: "#fee2e2",
    },
    text: {
        primary: "#0f172a",
        secondary: "#475569",
        tertiary: "#94a3b8",
        inverted: "#ffffff",
    },
    border: {
        light: "#e2e8f0",
        medium: "#cbd5e1",
        dark: "#94a3b8",
    },
};
// ── Invoice Status Colors ──────────────────────────────────────────────────
exports.STATUS_COLORS = {
    paid: {
        bg: "#dcfce7",
        border: "#86efac",
        text: "#16a34a",
        icon: "#15803d",
    },
    partial: {
        bg: "#dbeafe",
        border: "#bfdbfe",
        text: "#0284c7",
        icon: "#0369a1",
    },
    pending: {
        bg: "#fef3c7",
        border: "#fde047",
        text: "#d97706",
        icon: "#b45309",
    },
    draft: {
        bg: "#f3f4f6",
        border: "#e5e7eb",
        text: "#6b7280",
        icon: "#4b5563",
    },
    cancelled: {
        bg: "#fee2e2",
        border: "#fecaca",
        text: "#dc2626",
        icon: "#b91c1c",
    },
    overdue: {
        bg: "#fee2e2",
        border: "#fecaca",
        text: "#dc2626",
        icon: "#b91c1c",
    },
};
// ── Invoice Status Styles (with Tailwind classes) ────────────────────────
exports.STATUS_STYLES = {
    draft: {
        label: "Draft",
        bg: "bg-slate-100",
        text: "text-slate-500",
    },
    proforma: {
        label: "Proforma",
        bg: "bg-blue-100",
        text: "text-blue-700",
    },
    pending: {
        label: "Pending",
        bg: "bg-yellow-100",
        text: "text-yellow-700",
    },
    partial: {
        label: "Partial",
        bg: "bg-orange-100",
        text: "text-orange-700",
    },
    paid: {
        label: "Paid ✅",
        bg: "bg-green-100",
        text: "text-green-700",
    },
    cancelled: {
        label: "Cancelled",
        bg: "bg-red-100",
        text: "text-red-600",
    },
};
// ── Invoice Document Types ─────────────────────────────────────────────────
exports.DOCUMENT_TYPES = {
    invoice: "Invoice",
    billOfSupply: "Bill of Supply",
};
// ── Payment Methods ────────────────────────────────────────────────────────
exports.PAYMENT_METHOD_ICONS = {
    cash: "cash-outline",
    upi: "phone-portrait-outline",
    card: "card-outline",
    credit: "wallet-outline",
    check: "checkmark-done-outline",
    transfer: "swap-horizontal-outline",
    other: "ellipsis-horizontal",
};
// ── Payment Methods (for selection UI) ────────────────────────────────────
exports.PAYMENT_METHODS = [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
    { value: "bank_transfer", label: "Bank Transfer" },
];
// ── Customer Tags ──────────────────────────────────────────────────────────
exports.CUSTOMER_TAGS = [
    "VIP",
    "Wholesale",
    "Blacklist",
    "Regular",
];
// ── Languages ──────────────────────────────────────────────────────────────
exports.LANGUAGES = ["hi", "en", "mr", "gu"];
exports.LANGUAGE_LABELS = {
    hi: "Hindi",
    en: "English",
    mr: "Marathi",
    gu: "Gujarati",
};
// ── Animation Timings ──────────────────────────────────────────────────────
exports.ANIMATIONS = {
    fast: 150, // Quick interactions
    normal: 300, // Standard transitions
    slow: 500, // Slow reveals
    slower: 800, // Very slow animations
};
// ── Debounce/Throttle Intervals ────────────────────────────────────────────
exports.INTERVALS = {
    SEARCH_DEBOUNCE: 500, // ms before API call after typing
    DRAFT_AUTO_SAVE: 2000, // ms debounce for auto-save
    REFRESH_TIMEOUT: 5000, // ms before considering refresh failed
    SYNC_CHECK: 10000, // ms between offline sync attempts
    WS_RECONNECT: 3000, // ms between WebSocket reconnect attempts
    TOOLTIP_SHOW: 2000, // ms before showing tooltip
    TOAST_DURATION: 3000, // ms toast stays visible
};
// ── Date/Time Formats ──────────────────────────────────────────────────────
exports.DATE_FORMATS = {
    short: "dd-MMM", // 15-Jan
    full: "dd-MMM-yyyy", // 15-Jan-2024
    time: "HH:mm", // 14:30
    dateTime: "dd-MMM HH:mm", // 15-Jan 14:30
    iso: "yyyy-MM-dd", // 2024-01-15 (API)
};
// ── Error Messages ─────────────────────────────────────────────────────────
exports.ERROR_MESSAGES = {
    NO_ITEMS: "Add at least one item to create an invoice",
    NO_CUSTOMER: "Select or add a customer",
    NO_AMOUNT: "Enter a valid amount",
    INVALID_EMAIL: "Enter a valid email address",
    INVALID_PHONE: "Enter a valid phone number",
    INVALID_GST: "Enter a valid GST number",
    NETWORK_ERROR: "No internet connection. Changes will sync when online.",
    FETCH_ERROR: "Failed to load data. Pull to refresh.",
    SUBMIT_ERROR: "Failed to save. Please try again.",
    VALIDATION_ERROR: "Please check your input and try again.",
};
// ── Success Messages ──────────────────────────────────────────────────────
exports.SUCCESS_MESSAGES = {
    INVOICE_CREATED: "Invoice created successfully",
    INVOICE_UPDATED: "Invoice updated",
    INVOICE_DELETED: "Invoice deleted",
    CUSTOMER_ADDED: "Customer added",
    PRODUCT_ADDED: "Product added",
    SETTINGS_SAVED: "Settings saved",
    SYNC_COMPLETE: "All changes synced",
};
// ── Storage Keys ───────────────────────────────────────────────────────────
exports.STORAGE_KEYS = {
    // Auth
    TOKEN: "execora_token",
    REFRESH: "execora_refresh",
    USER: "execora_user",
    // Drafts
    DRAFT: "execora_draft_v1",
    DRAFT_TIMESTAMP: "execora_draft_ts",
    // Invoice bar
    INVOICE_BAR: "execora_invoice_bar",
    INVOICE_PREFIX: "execora_invoice_prefix",
    INVOICE_TEMPLATE: "execora_invoice_template",
    // Setup
    BIZ_PROFILE: "execora_biz_profile",
    PRICE_TIER: "execora_price_tier",
    DOC_SETTINGS: "execora_doc_settings",
    // Offline
    QUEUE: "execora:queue",
    PRODUCTS_CACHE: "execora:products_cache",
    // Features
    LAST_INVOICE_DATE: "execora_last_inv_date",
    ONBOARDING_COMPLETE: "execora_onboarding",
    // Monitoring
    LAST_SYNC: "execora:last_sync",
    SYNC_ERROR: "execora:sync_error",
};
// ── API Endpoints (relative to base URL) ──────────────────────────────────
exports.API_ENDPOINTS = {
    // Auth
    LOGIN: "/api/v1/auth/login",
    REFRESH: "/api/v1/auth/refresh",
    ME: "/api/v1/auth/me",
    LOGOUT: "/api/v1/auth/logout",
    // Invoices
    INVOICES: "/api/v1/invoices",
    INVOICE_DETAIL: (id) => `/api/v1/invoices/${id}`,
    INVOICE_CANCEL: (id) => `/api/v1/invoices/${id}/cancel`,
    INVOICE_PDF: (id) => `/api/v1/invoices/${id}/pdf`,
    // Customers
    CUSTOMERS: "/api/v1/customers",
    CUSTOMER_DETAIL: (id) => `/api/v1/customers/${id}`,
    CUSTOMERS_SEARCH: "/api/v1/customers/search",
    // Products
    PRODUCTS: "/api/v1/products",
    PRODUCT_CATALOG: "/api/v1/products/catalog",
    // Dashboard
    SUMMARY: "/api/v1/dashboard/summary",
    TREND: "/api/v1/dashboard/trend",
    // Settings
    SETTINGS: "/api/v1/settings",
    BILLING_SETTINGS: "/api/v1/settings/billing",
};
// ──  Feature Flags (for staged rollouts) ───────────────────────────────────
exports.FEATURES = {
    THERMAL_PRINTER: process.env.EXPO_PUBLIC_FEATURE_THERMAL === "true",
    ADVANCED_REPORTS: process.env.EXPO_PUBLIC_FEATURE_REPORTS === "true",
    PAYMENTS: process.env.EXPO_PUBLIC_FEATURE_PAYMENTS === "true",
    ANALYTICS: process.env.EXPO_PUBLIC_FEATURE_ANALYTICS === "true",
};
// ── Pagination ─────────────────────────────────────────────────────────────
exports.PAGINATION = {
    INVOICE_LIST_SIZE: 50,
    CUSTOMER_LIST_SIZE: 30,
    PRODUCT_SEARCH_SIZE: 200,
    HISTORY_SIZE: 100,
};
// ── Defaults ───────────────────────────────────────────────────────────────
exports.DEFAULTS = {
    GST_RATE: 18,
    DUE_DATE_DAYS: 30,
    PRODUCT_UNIT: "pcs",
    PRICE_DECIMAL_PLACES: 2,
    QTY_DECIMAL_PLACES: 3,
    TAX_DECIMAL_PLACES: 2,
};
//# sourceMappingURL=constants.js.map