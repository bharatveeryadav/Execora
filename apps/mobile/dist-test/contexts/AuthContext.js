"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = AuthProvider;
exports.useAuth = useAuth;
/**
 * AuthContext — provides isLoggedIn, user, login, logout for the app.
 * Enables Settings screen to trigger logout and re-render.
 */
const react_1 = __importStar(require("react"));
const storage_1 = require("../lib/storage");
const api_1 = require("../lib/api");
const AuthContext = (0, react_1.createContext)(null);
function loadStoredUser() {
    try {
        const raw = storage_1.storage.getString(storage_1.USER_KEY);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function saveUser(user) {
    if (user)
        storage_1.storage.set(storage_1.USER_KEY, JSON.stringify(user));
    else
        storage_1.storage.delete(storage_1.USER_KEY);
}
function AuthProvider({ children }) {
    const [isLoggedIn, setIsLoggedIn] = (0, react_1.useState)(() => !!storage_1.tokenStorage.getToken());
    const [user, setUser] = (0, react_1.useState)(loadStoredUser);
    (0, react_1.useEffect)(() => {
        if (isLoggedIn && storage_1.tokenStorage.getToken() && !user) {
            api_1.authApi.me().then((d) => {
                const u = d.user ?? null;
                if (u) {
                    setUser(u);
                    saveUser(u);
                }
            }).catch(() => { });
        }
    }, [isLoggedIn, user]);
    const login = (0, react_1.useCallback)(() => setIsLoggedIn(true), []);
    const loginWithUser = (0, react_1.useCallback)((u) => {
        setUser(u);
        saveUser(u);
        setIsLoggedIn(true);
    }, []);
    const logout = (0, react_1.useCallback)(() => {
        storage_1.tokenStorage.clearTokens();
        setUser(null);
        saveUser(null);
        setIsLoggedIn(false);
    }, []);
    return (react_1.default.createElement(AuthContext.Provider, { value: { isLoggedIn, user, login, loginWithUser, logout } }, children));
}
function useAuth() {
    const ctx = (0, react_1.useContext)(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
//# sourceMappingURL=AuthContext.js.map