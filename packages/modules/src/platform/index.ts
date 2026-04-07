/**
 * platform/index.ts
 *
 * Platform domain — subscription lifecycle, feature toggles, entitlements,
 * usage tracking, tenant configuration, offline sync.
 */
export * from "./subscription/lifecycle";
export * from "./subscription/feature-toggles";
export * from "./subscription/entitlements";
export * from "./subscription/billing-engine";
export * from "./subscription/grace-period";
export * from "./usage";
export * from "./usage/quotas";
export * from "./usage/dashboard";
export * from "./product-config";
export * from "./offline-sync";
export * from "./feature-toggle/manifest-validator";
export * from "./sync/device-registry";
export * from "./pricing/plans";
export * from "./pricing/limits";
export * from "./pricing/industry-packs";
