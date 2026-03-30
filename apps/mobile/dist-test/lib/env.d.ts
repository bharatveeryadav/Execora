/**
 * Centralized environment config for production-ready behavior.
 * EXPO_PUBLIC_* vars are inlined at build time — never in production bundle if unused.
 */
export declare const ENV: {
    /** production | staging | development — set in eas.json per build profile */
    readonly env: "production" | "staging" | "development";
    readonly isProduction: boolean;
    readonly isDevelopment: boolean;
    /** Auto-login only in dev/staging — NEVER in production */
    readonly allowAutoLogin: boolean;
};
//# sourceMappingURL=env.d.ts.map