/**
 * @execora/shared — Client-side entitlement helpers
 *
 * Pure functions — no async, no DB, no platform APIs.
 * Safe to call from web (React/Vite), mobile (Expo/React Native), and backend (Node.js).
 *
 * Usage pattern:
 *   // 1. Fetch TenantEntitlements once at session start
 *   const { data: entitlements } = useQuery(['entitlements'], fetchEntitlements);
 *
 *   // 2. Gate any feature synchronously
 *   if (hasProduct(entitlements, 'pos')) { ... }
 *   if (hasFeature(entitlements, 'eInvoice')) { ... }
 *   if (isAtLeastPlan(entitlements, 'business')) { ... }
 *
 *   // 3. Resolve navigation for the active product + platform
 *   const navItems = resolveNavigation(entitlements, 'invoicing', 'mobile');
 */

import type { TenantEntitlements } from "@execora/types";
import type { ProductId, IndustryPackId, PlanId } from "@execora/types";
import { PLAN_ORDER, PRODUCT_MANIFESTS } from "@execora/types";

// ── Product access ────────────────────────────────────────────────────────────

/** Returns true if the tenant's plan includes the given product */
export function hasProduct(e: TenantEntitlements, product: ProductId): boolean {
  return e.products[product] === true;
}

/** Returns all ProductIds enabled for the tenant */
export function getAccessibleProducts(e: TenantEntitlements): ProductId[] {
  return (Object.keys(e.products) as ProductId[]).filter(
    (p) => e.products[p] === true,
  );
}

// ── Feature gates ─────────────────────────────────────────────────────────────

/** Returns true if the tenant has the given named feature enabled */
export function hasFeature(
  e: TenantEntitlements,
  feature: keyof TenantEntitlements["features"],
): boolean {
  return e.features[feature] === true;
}

// ── Industry packs ────────────────────────────────────────────────────────────

/** Returns true if the tenant has an industry pack active (e.g. 'pharmacy', 'grocery') */
export function hasIndustryPack(
  e: TenantEntitlements,
  pack: IndustryPackId,
): boolean {
  return e.industryPacks[pack] === true;
}

/** Returns all active industry pack IDs */
export function getActiveIndustryPacks(
  e: TenantEntitlements,
): IndustryPackId[] {
  return (Object.keys(e.industryPacks) as IndustryPackId[]).filter(
    (p) => e.industryPacks[p] === true,
  );
}

// ── Plan tier checks ──────────────────────────────────────────────────────────

/** Returns true if the tenant is on at least the given plan tier */
export function isAtLeastPlan(e: TenantEntitlements, minPlan: PlanId): boolean {
  return PLAN_ORDER.indexOf(e.planId) >= PLAN_ORDER.indexOf(minPlan);
}

// ── Usage limits ──────────────────────────────────────────────────────────────

/** Returns true if `current` is within the given limit (unlimited always passes) */
export function isWithinLimit(
  limit: number | "unlimited",
  current: number,
): boolean {
  return limit === "unlimited" || current < limit;
}

/** Converts 'unlimited' to Number.MAX_SAFE_INTEGER for numeric comparisons */
export function limitAsNumber(limit: number | "unlimited"): number {
  return limit === "unlimited" ? Number.MAX_SAFE_INTEGER : limit;
}

// ── Resource headroom checks ──────────────────────────────────────────────────

/** Returns true if the tenant can add another user without exceeding their plan limit */
export function canAddUser(
  e: TenantEntitlements,
  currentUsers: number,
): boolean {
  return currentUsers < e.users;
}

/** Returns true if the tenant can add another business profile */
export function canAddBusiness(
  e: TenantEntitlements,
  currentBusinesses: number,
): boolean {
  return currentBusinesses < e.businesses;
}

/** Returns true if the tenant can add another POS counter */
export function canAddCounter(
  e: TenantEntitlements,
  currentCounters: number,
): boolean {
  return currentCounters < e.counters;
}

// ── Navigation resolution ─────────────────────────────────────────────────────

/**
 * Returns the navigation item identifiers for a given product on a given platform.
 * Returns [] if the product is not enabled for the tenant.
 *
 * Navigation items are opaque string identifiers — each app maps them to routes.
 */
export function resolveNavigation(
  e: TenantEntitlements,
  product: ProductId,
  platform: "web" | "mobile",
): string[] {
  if (!hasProduct(e, product)) return [];
  return PRODUCT_MANIFESTS[product].navigation[platform];
}

/**
 * Returns navigation items for all accessible products on the given platform,
 * keyed by product ID.
 */
export function resolveAllNavigation(
  e: TenantEntitlements,
  platform: "web" | "mobile",
): Partial<Record<ProductId, string[]>> {
  const result: Partial<Record<ProductId, string[]>> = {};
  for (const product of getAccessibleProducts(e)) {
    result[product] = PRODUCT_MANIFESTS[product].navigation[platform];
  }
  return result;
}

// ── Upgrade prompt helpers ────────────────────────────────────────────────────

/**
 * Returns the minimum required plan if the tenant needs to upgrade, or null if already eligible.
 * Use this to show contextual upgrade prompts.
 */
export function getRequiredUpgradePlan(
  e: TenantEntitlements,
  requiredPlan: PlanId,
): PlanId | null {
  return isAtLeastPlan(e, requiredPlan) ? null : requiredPlan;
}

/**
 * Returns true if the tenant needs to upgrade to access a product.
 * Use this to render "Upgrade to Pro" CTAs.
 */
export function requiresUpgradeForProduct(
  e: TenantEntitlements,
  product: ProductId,
): boolean {
  return !hasProduct(e, product);
}
