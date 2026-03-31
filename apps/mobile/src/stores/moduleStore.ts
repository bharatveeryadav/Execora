/**
 * Module Store — Zustand store for tenant tier and module feature flags.
 *
 * Cold start:
 *   1. Reads tenant_tier from MMKV (set during login)
 *   2. getActiveModules() in moduleRegistry checks tier + per-flag kill switches
 *
 * Online refresh:
 *   Call refreshFromApi() after /tenant/features API response.
 *
 * Usage:
 *   import { useModuleStore } from '@/stores/moduleStore';
 *   const isActive = useModuleStore(s => s.isModuleActive('billing'));
 */

import { create } from "zustand";
import { storage } from "../lib/storage";
import {
  getActiveModules,
  getTabModules,
  TENANT_TIER_KEY,
} from "../lib/moduleRegistry";
import type {
  ModuleName,
  ModuleTier,
  ModuleManifest,
} from "../lib/moduleTypes";

interface ModuleStoreState {
  /** Current tenant tier — drives which modules are unlocked */
  tenantTier: ModuleTier;
  /** Names of all currently active modules */
  activeModuleNames: ModuleName[];

  /** Check if a module is currently active */
  isModuleActive: (name: ModuleName) => boolean;
  /** Ordered list of modules with tab config */
  getTabModules: () => ModuleManifest[];

  /** Called after login or /tenant/features API response */
  setTenantTier: (tier: ModuleTier) => void;
  /** Re-hydrate from MMKV (called on cold start) */
  hydrate: () => void;
}

export const useModuleStore = create<ModuleStoreState>((set, get) => ({
  tenantTier: "free",
  activeModuleNames: getActiveModules().map((m) => m.name),

  isModuleActive: (name: ModuleName) => get().activeModuleNames.includes(name),

  getTabModules: (): ModuleManifest[] => getTabModules(),

  setTenantTier: (tier) => {
    storage.set(TENANT_TIER_KEY, tier);
    set({
      tenantTier: tier,
      activeModuleNames: getActiveModules().map((m) => m.name),
    });
  },

  hydrate: () => {
    const tier =
      (storage.getString(TENANT_TIER_KEY) as ModuleTier | undefined) ?? "free";
    set({
      tenantTier: tier,
      activeModuleNames: getActiveModules().map((m) => m.name),
    });
  },
}));

/** Convenience selector — true if module is active */
export function useIsModuleActive(name: ModuleName): boolean {
  return useModuleStore((s) => s.isModuleActive(name));
}
