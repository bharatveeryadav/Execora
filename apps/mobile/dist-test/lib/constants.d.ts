/**
 * Shared constants for Mobile App
 * Centralizes magic strings, colors, sizes used across screens
 * Ensures consistency and enables theming
 */
export declare const SIZES: {
    TOUCH_MIN: number;
    BUTTON: {
        sm: {
            minHeight: number;
            paddingX: number;
            paddingY: number;
            fontSize: number;
        };
        md: {
            minHeight: number;
            paddingX: number;
            paddingY: number;
            fontSize: number;
        };
        lg: {
            minHeight: number;
            paddingX: number;
            paddingY: number;
            fontSize: number;
        };
    };
    SPACING: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        xxl: number;
    };
    RADIUS: {
        sm: number;
        md: number;
        lg: number;
        xl: number;
        full: number;
    };
    FONT: {
        xs: number;
        sm: number;
        base: number;
        lg: number;
        xl: number;
        "2xl": number;
        "3xl": number;
        "4xl": number;
    };
    LIST_ROW: number;
    LIST_ROW_COMPACT: number;
    LIST_ROW_LARGE: number;
};
export declare const COLORS: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    danger: string;
    slate: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
    };
    bg: {
        primary: string;
        secondary: string;
        success: string;
        warning: string;
        error: string;
    };
    text: {
        primary: string;
        secondary: string;
        tertiary: string;
        inverted: string;
    };
    border: {
        light: string;
        medium: string;
        dark: string;
    };
};
export declare const STATUS_COLORS: {
    readonly paid: {
        readonly bg: "#dcfce7";
        readonly border: "#86efac";
        readonly text: "#16a34a";
        readonly icon: "#15803d";
    };
    readonly partial: {
        readonly bg: "#dbeafe";
        readonly border: "#bfdbfe";
        readonly text: "#0284c7";
        readonly icon: "#0369a1";
    };
    readonly pending: {
        readonly bg: "#fef3c7";
        readonly border: "#fde047";
        readonly text: "#d97706";
        readonly icon: "#b45309";
    };
    readonly draft: {
        readonly bg: "#f3f4f6";
        readonly border: "#e5e7eb";
        readonly text: "#6b7280";
        readonly icon: "#4b5563";
    };
    readonly cancelled: {
        readonly bg: "#fee2e2";
        readonly border: "#fecaca";
        readonly text: "#dc2626";
        readonly icon: "#b91c1c";
    };
    readonly overdue: {
        readonly bg: "#fee2e2";
        readonly border: "#fecaca";
        readonly text: "#dc2626";
        readonly icon: "#b91c1c";
    };
};
export declare const STATUS_STYLES: {
    readonly draft: {
        readonly label: "Draft";
        readonly bg: "bg-slate-100";
        readonly text: "text-slate-500";
    };
    readonly proforma: {
        readonly label: "Proforma";
        readonly bg: "bg-blue-100";
        readonly text: "text-blue-700";
    };
    readonly pending: {
        readonly label: "Pending";
        readonly bg: "bg-yellow-100";
        readonly text: "text-yellow-700";
    };
    readonly partial: {
        readonly label: "Partial";
        readonly bg: "bg-orange-100";
        readonly text: "text-orange-700";
    };
    readonly paid: {
        readonly label: "Paid ✅";
        readonly bg: "bg-green-100";
        readonly text: "text-green-700";
    };
    readonly cancelled: {
        readonly label: "Cancelled";
        readonly bg: "bg-red-100";
        readonly text: "text-red-600";
    };
};
export declare const DOCUMENT_TYPES: {
    readonly invoice: "Invoice";
    readonly billOfSupply: "Bill of Supply";
};
export declare const PAYMENT_METHOD_ICONS: {
    readonly cash: "cash-outline";
    readonly upi: "phone-portrait-outline";
    readonly card: "card-outline";
    readonly credit: "wallet-outline";
    readonly check: "checkmark-done-outline";
    readonly transfer: "swap-horizontal-outline";
    readonly other: "ellipsis-horizontal";
};
export declare const PAYMENT_METHODS: readonly [{
    readonly value: "cash";
    readonly label: "Cash";
}, {
    readonly value: "upi";
    readonly label: "UPI";
}, {
    readonly value: "card";
    readonly label: "Card";
}, {
    readonly value: "bank_transfer";
    readonly label: "Bank Transfer";
}];
export declare const CUSTOMER_TAGS: readonly ["VIP", "Wholesale", "Blacklist", "Regular"];
export declare const LANGUAGES: readonly ["hi", "en", "mr", "gu"];
export type Language = (typeof LANGUAGES)[number];
export declare const LANGUAGE_LABELS: Record<Language, string>;
export declare const ANIMATIONS: {
    fast: number;
    normal: number;
    slow: number;
    slower: number;
};
export declare const INTERVALS: {
    SEARCH_DEBOUNCE: number;
    DRAFT_AUTO_SAVE: number;
    REFRESH_TIMEOUT: number;
    SYNC_CHECK: number;
    WS_RECONNECT: number;
    TOOLTIP_SHOW: number;
    TOAST_DURATION: number;
};
export declare const DATE_FORMATS: {
    readonly short: "dd-MMM";
    readonly full: "dd-MMM-yyyy";
    readonly time: "HH:mm";
    readonly dateTime: "dd-MMM HH:mm";
    readonly iso: "yyyy-MM-dd";
};
export declare const ERROR_MESSAGES: {
    readonly NO_ITEMS: "Add at least one item to create an invoice";
    readonly NO_CUSTOMER: "Select or add a customer";
    readonly NO_AMOUNT: "Enter a valid amount";
    readonly INVALID_EMAIL: "Enter a valid email address";
    readonly INVALID_PHONE: "Enter a valid phone number";
    readonly INVALID_GST: "Enter a valid GST number";
    readonly NETWORK_ERROR: "No internet connection. Changes will sync when online.";
    readonly FETCH_ERROR: "Failed to load data. Pull to refresh.";
    readonly SUBMIT_ERROR: "Failed to save. Please try again.";
    readonly VALIDATION_ERROR: "Please check your input and try again.";
};
export declare const SUCCESS_MESSAGES: {
    readonly INVOICE_CREATED: "Invoice created successfully";
    readonly INVOICE_UPDATED: "Invoice updated";
    readonly INVOICE_DELETED: "Invoice deleted";
    readonly CUSTOMER_ADDED: "Customer added";
    readonly PRODUCT_ADDED: "Product added";
    readonly SETTINGS_SAVED: "Settings saved";
    readonly SYNC_COMPLETE: "All changes synced";
};
export declare const STORAGE_KEYS: {
    readonly TOKEN: "execora_token";
    readonly REFRESH: "execora_refresh";
    readonly USER: "execora_user";
    readonly DRAFT: "execora_draft_v1";
    readonly DRAFT_TIMESTAMP: "execora_draft_ts";
    readonly INVOICE_BAR: "execora_invoice_bar";
    readonly INVOICE_PREFIX: "execora_invoice_prefix";
    readonly INVOICE_TEMPLATE: "execora_invoice_template";
    readonly BIZ_PROFILE: "execora_biz_profile";
    readonly PRICE_TIER: "execora_price_tier";
    readonly DOC_SETTINGS: "execora_doc_settings";
    readonly QUEUE: "execora:queue";
    readonly PRODUCTS_CACHE: "execora:products_cache";
    readonly LAST_INVOICE_DATE: "execora_last_inv_date";
    readonly ONBOARDING_COMPLETE: "execora_onboarding";
    readonly LAST_SYNC: "execora:last_sync";
    readonly SYNC_ERROR: "execora:sync_error";
};
export declare const API_ENDPOINTS: {
    readonly LOGIN: "/api/v1/auth/login";
    readonly REFRESH: "/api/v1/auth/refresh";
    readonly ME: "/api/v1/auth/me";
    readonly LOGOUT: "/api/v1/auth/logout";
    readonly INVOICES: "/api/v1/invoices";
    readonly INVOICE_DETAIL: (id: string) => string;
    readonly INVOICE_CANCEL: (id: string) => string;
    readonly INVOICE_PDF: (id: string) => string;
    readonly CUSTOMERS: "/api/v1/customers";
    readonly CUSTOMER_DETAIL: (id: string) => string;
    readonly CUSTOMERS_SEARCH: "/api/v1/customers/search";
    readonly PRODUCTS: "/api/v1/products";
    readonly PRODUCT_CATALOG: "/api/v1/products/catalog";
    readonly SUMMARY: "/api/v1/dashboard/summary";
    readonly TREND: "/api/v1/dashboard/trend";
    readonly SETTINGS: "/api/v1/settings";
    readonly BILLING_SETTINGS: "/api/v1/settings/billing";
};
export declare const FEATURES: {
    readonly THERMAL_PRINTER: boolean;
    readonly ADVANCED_REPORTS: boolean;
    readonly PAYMENTS: boolean;
    readonly ANALYTICS: boolean;
};
export declare const PAGINATION: {
    readonly INVOICE_LIST_SIZE: 50;
    readonly CUSTOMER_LIST_SIZE: 30;
    readonly PRODUCT_SEARCH_SIZE: 200;
    readonly HISTORY_SIZE: 100;
};
export declare const DEFAULTS: {
    readonly GST_RATE: 18;
    readonly DUE_DATE_DAYS: 30;
    readonly PRODUCT_UNIT: "pcs";
    readonly PRICE_DECIMAL_PLACES: 2;
    readonly QTY_DECIMAL_PLACES: 3;
    readonly TAX_DECIMAL_PLACES: 2;
};
//# sourceMappingURL=constants.d.ts.map