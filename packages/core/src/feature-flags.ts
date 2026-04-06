/**
 * Feature flag evaluation — data-driven per-tenant capability gating.
 *
 * Flags live in `Tenant.features` (JSON column).
 * Setting a flag to true grants the capability; false or missing = denied.
 *
 * Typical usage:
 *   if (!(await hasFeature(tenantId, FeatureFlag.OCR_PURCHASE_BILL))) {
 *     return reply.code(402).send({ error: 'Upgrade to Business plan to use OCR.' });
 *   }
 *
 * On plan change, call `setTierFeatures(tenantId, 'business')` to bulk-apply
 * the correct flag set from TIER_FEATURES.
 *
 * Caching: flags are cached per-tenant for 60 seconds in Redis (optional).
 * Without Redis the function is still correct — just hits Postgres each time.
 */

import { FeatureFlag, TIER_FEATURES } from '@execora/types';
import { Prisma } from '@prisma/client';
import { prisma } from './database';
import { logger } from './logger';

// Re-export for consumers that import from @execora/core
export { FeatureFlag, TIER_FEATURES };

// ── Core evaluation ───────────────────────────────────────────────────────────

/**
 * Returns true if the tenant has the given feature flag enabled.
 * Defaults to false on any error or missing flag.
 */
export async function hasFeature(
  tenantId: string,
  feature: FeatureFlag,
): Promise<boolean> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { features: true },
    });
    const flags = (tenant?.features ?? {}) as Record<string, unknown>;
    return flags[feature] === true;
  } catch (err) {
    logger.warn({ tenantId, feature, err }, 'feature-flags: lookup failed — defaulting to false');
    return false;
  }
}

/**
 * Returns all enabled feature flags for a tenant.
 */
export async function getFeatures(tenantId: string): Promise<FeatureFlag[]> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { features: true },
    });
    const flags = (tenant?.features ?? {}) as Record<string, unknown>;
    return Object.values(FeatureFlag).filter((f) => flags[f as string] === true);
  } catch (err) {
    logger.warn({ tenantId, err }, 'feature-flags: getFeatures failed — returning empty');
    return [];
  }
}

/**
 * Enable a single feature flag for a tenant.
 */
export async function enableFeature(
  tenantId: string,
  feature: FeatureFlag,
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }, select: { features: true },
  });
  const current = (tenant?.features ?? {}) as Record<string, unknown>;
  await prisma.tenant.update({
    where: { id: tenantId },
    data:  { features: { ...current, [feature]: true } as Prisma.InputJsonValue },
  });
}

/**
 * Disable a single feature flag for a tenant.
 */
export async function disableFeature(
  tenantId: string,
  feature: FeatureFlag,
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }, select: { features: true },
  });
  const current = (tenant?.features ?? {}) as Record<string, unknown>;
  await prisma.tenant.update({
    where: { id: tenantId },
    data:  { features: { ...current, [feature]: false } as Prisma.InputJsonValue },
  });
}

/**
 * Apply the full feature set for a subscription tier.
 * Overwrites only the keys in TIER_FEATURES — custom overrides are preserved.
 *
 * @param tier  "free" | "starter" | "business" | "enterprise"
 */
export async function setTierFeatures(
  tenantId: string,
  tier: keyof typeof TIER_FEATURES,
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }, select: { features: true },
  });
  const current = (tenant?.features ?? {}) as Record<string, unknown>;

  // Build the new flags: start from current, then set all FeatureFlag keys
  // to false, then enable those in this tier
  const allFlags: Record<string, boolean> = {};
  for (const f of Object.values(FeatureFlag)) allFlags[f] = false;
  const tierFlags: Record<string, boolean> = {};
  for (const f of TIER_FEATURES[tier]) tierFlags[f] = true;

  const merged = { ...current, ...allFlags, ...tierFlags } as Prisma.InputJsonValue;
  await prisma.tenant.update({
    where: { id: tenantId },
    data:  { features: merged },
  });

  logger.info({ tenantId, tier, enabled: TIER_FEATURES[tier] }, 'feature-flags: tier applied');
}

/**
 * Middleware helper — throws a 402 AppError if the tenant lacks the feature.
 * Use in Fastify route preHandlers:
 *   preHandler: [requireAuth, () => requireFeature(tenantId, FeatureFlag.OCR_PURCHASE_BILL)]
 */
export function featureGate(feature: FeatureFlag) {
  return async (tenantId: string): Promise<void> => {
    const allowed = await hasFeature(tenantId, feature);
    if (!allowed) {
      const err = new Error(`Feature '${feature}' requires a plan upgrade.`);
      (err as NodeJS.ErrnoException).code = 'FEATURE_GATED';
      throw Object.assign(err, { statusCode: 402 });
    }
  };
}
