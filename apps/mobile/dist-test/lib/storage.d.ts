export declare const storage: {
    getString: (key: string) => string | undefined;
    set: (key: string, value: string) => void;
    delete: (key: string) => void;
};
export declare const TOKEN_KEY = "execora_token";
export declare const REFRESH_KEY = "execora_refresh";
export declare const USER_KEY = "execora_user";
export declare const DRAFT_KEY = "execora_draft_v1";
export declare const INVOICE_BAR_KEY = "execora_invoice_bar_v1";
export declare const PRICE_TIER_KEY = "execora_price_tier_idx";
export declare const INV_TEMPLATE_KEY = "execora_inv_template";
export declare const BIZ_STORAGE_KEY = "execora_bizprofile";
export declare const DOC_SETTINGS_KEY = "execora_doc_settings_v1";
export declare const tokenStorage: {
    getToken: () => string | null;
    getRefreshToken: () => string | null;
    setTokens: (access: string, refresh: string) => void;
    clearTokens: () => void;
};
//# sourceMappingURL=storage.d.ts.map