/**
 * Centralized environment config for production-ready behavior.
 * EXPO_PUBLIC_* vars are inlined at build time — never in production bundle if unused.
 */
export const ENV = {
  /** production | staging | development — set in eas.json per build profile */
  env: (process.env.EXPO_PUBLIC_ENV ?? "development") as "production" | "staging" | "development",

  get isProduction() {
    return this.env === "production";
  },

  get isDevelopment() {
    return this.env === "development";
  },

  /** Auto-login only in dev/staging — NEVER in production */
  get allowAutoLogin() {
    return !this.isProduction;
  },
} as const;
