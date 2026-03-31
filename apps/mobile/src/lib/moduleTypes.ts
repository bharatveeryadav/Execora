/**
 * Module manifest type definitions.
 * Each feature module declares a manifest describing capabilities,
 * tier requirements, navigation config, and dependencies.
 */

export type ModuleTier = "free" | "starter" | "business" | "enterprise";

export type ModuleName =
  | "auth"
  | "dashboard"
  | "billing"
  | "parties"
  | "products"
  | "accounting"
  | "expenses"
  | "settings"
  | "sync"
  | "customers"
  | "pos"
  | "inventory"
  | "e-invoice"
  | "ocr";

export interface TabConfig {
  icon: string; // Ionicons name
  label: string;
  order: number; // lower = left-most tab
  badgeKey?: string; // key to read badge count from store
}

export interface ModuleManifest {
  /** Unique module identifier */
  name: ModuleName;
  /** Display version */
  version: string;
  /** Minimum tier to unlock this module */
  tier: ModuleTier;
  /** Feature flag key (matches backend /tenant/features response) */
  featureFlag: string;
  /** Other modules this depends on */
  dependencies: ModuleName[];
  /** If present, module gets a bottom tab */
  tabConfig?: TabConfig;
}
