"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenStorage = exports.DOC_SETTINGS_KEY = exports.BIZ_STORAGE_KEY = exports.INV_TEMPLATE_KEY = exports.PRICE_TIER_KEY = exports.INVOICE_BAR_KEY = exports.DRAFT_KEY = exports.USER_KEY = exports.REFRESH_KEY = exports.TOKEN_KEY = exports.storage = void 0;
/**
 * Storage adapter using MMKV (react-native-mmkv).
 * MMKV is ~30x faster than AsyncStorage and synchronous — no await chains.
 * Falls back to in-memory storage when MMKV is unavailable (Expo Go).
 */
const react_native_mmkv_1 = require("react-native-mmkv");
function createStorage() {
    try {
        return new react_native_mmkv_1.MMKV({ id: "execora-storage" });
    }
    catch {
        const mem = {};
        return {
            getString: (k) => mem[k],
            set: (k, v) => { mem[k] = v; },
            delete: (k) => { delete mem[k]; },
        };
    }
}
exports.storage = createStorage();
exports.TOKEN_KEY = "execora_token";
exports.REFRESH_KEY = "execora_refresh";
exports.USER_KEY = "execora_user";
exports.DRAFT_KEY = "execora_draft_v1";
exports.INVOICE_BAR_KEY = "execora_invoice_bar_v1";
exports.PRICE_TIER_KEY = "execora_price_tier_idx";
exports.INV_TEMPLATE_KEY = "execora_inv_template";
exports.BIZ_STORAGE_KEY = "execora_bizprofile";
exports.DOC_SETTINGS_KEY = "execora_doc_settings_v1";
exports.tokenStorage = {
    getToken: () => exports.storage.getString(exports.TOKEN_KEY) ?? null,
    getRefreshToken: () => exports.storage.getString(exports.REFRESH_KEY) ?? null,
    setTokens: (access, refresh) => {
        exports.storage.set(exports.TOKEN_KEY, access);
        exports.storage.set(exports.REFRESH_KEY, refresh);
    },
    clearTokens: () => {
        exports.storage.delete(exports.TOKEN_KEY);
        exports.storage.delete(exports.REFRESH_KEY);
        exports.storage.delete(exports.USER_KEY);
    },
};
//# sourceMappingURL=storage.js.map