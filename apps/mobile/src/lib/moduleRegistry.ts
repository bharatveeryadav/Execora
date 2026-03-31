/**
 * Module Registry — central lookup for all feature manifests.
 *
 * Usage:
 *   import { isModuleEnabled, getTabModules } from '@/lib/moduleRegistry';
 *
 * Modules register themselves by importing their manifest here.
 * The store hydrates from MMKV on boot; registry reads from store.
 */

import { storage } from "./storage";
import type { ModuleManifest, ModuleName, ModuleTier } from "./moduleTypes";

// ── Manifest imports ──────────────────────────────────────────────────────────
import { authManifest } from "../features/auth/manifest";
import { dashboardManifest } from "../features/dashboard/manifest";
import { billingManifest } from "../features/billing/manifest";
import { partiesManifest } from "../features/parties/manifest";
import { productsManifest } from "../features/products/manifest";
import { accountingManifest } from "../features/accounting/manifest";
import { expensesManifest } from "../features/expenses/manifest";
import { settingsManifest } from "../features/settings/manifest";
import { syncManifest } from "../features/sync/manifest";
import { customersManifest } from "../features/customers/manifest";

// ── Registry ──────────────────────────────────────────────────────────────────

const ALL_MANIFESTS: ModuleManifest[] = [
  authManifest,
  dashboardManifest,
  billingManifest,
  partiesManifest,
  productsManifest,
  accountingManifest,
  expensesManifest,
  settingsManifest,
  syncManifest,
  customersManifest,
];

// ── Tier hierarchy ────────────────────────────────────────────────────────────

const TIER_RANK: Record<ModuleTier, number> = {
  free: 0,
  starter: 1,
  business: 2,
  enterprise: 3,
};

export const TENANT_TIER_KEY = "tenant_tier";

function getTenantTier(): ModuleTier {
  return (
    (storage.getString(TENANT_TIER_KEY) as ModuleTier | undefined) ?? "free"
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns all modules accessible for the current tenant tier.
 * Modules flagged as disabled in MMKV are excluded.
 */
export function getActiveModules(): ModuleManifest[] {
  const tier = getTenantTier();
  const tierRank = TIER_RANK[tier];
  return ALL_MANIFESTS.filter((m) => {
    if (TIER_RANK[m.tier] > tierRank) return false;
    // Check optional per-feature kill switch (stored as '1' = disabled)
    const disabled = storage.getString(`module_disabled_${m.featureFlag}`);
    return disabled !== "1";
  });
}

/**
 * Check if a specific module is enabled for the current tenant.
 */
export function isModuleEnabled(name: ModuleName): boolean {
  return getActiveModules().some((m) => m.name === name);
}

/**
 * Returns tab modules sorted by order, for building the bottom tab bar.
 */
export function getTabModules(): ModuleManifest[] {
  return getActiveModules()
    .filter((m) => m.tabConfig !== undefined)
    .sort((a, b) => a.tabConfig!.order - b.tabConfig!.order);
}

/**
 * Full manifest for a given module name, or undefined if not found.
 */
export function getManifest(name: ModuleName): ModuleManifest | undefined {
  return ALL_MANIFESTS.find((m) => m.name === name);
}

export type { ModuleManifest, ModuleName, ModuleTier };
