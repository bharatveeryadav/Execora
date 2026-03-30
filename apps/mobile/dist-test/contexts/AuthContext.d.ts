/**
 * AuthContext — provides isLoggedIn, user, login, logout for the app.
 * Enables Settings screen to trigger logout and re-render.
 */
import React from "react";
export interface AuthUser {
    id: string;
    name?: string;
    email?: string;
    role?: string;
}
type AuthContextValue = {
    isLoggedIn: boolean;
    user: AuthUser | null;
    login: () => void;
    loginWithUser: (user: AuthUser) => void;
    logout: () => void;
};
export declare function AuthProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useAuth(): AuthContextValue;
export {};
//# sourceMappingURL=AuthContext.d.ts.map