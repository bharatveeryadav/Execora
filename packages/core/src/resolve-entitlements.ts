/**
 * packages/infrastructure — Backend entitlement resolver
 *
 * Resolves TenantEntitlements from the DB subscription record + legacy feature flags.
 * Results are cached in Redis for CACHE_TTL seconds.
 * Cache is invalidated on SubscriptionChanged domain event.
 *
 * Only import this in backend code (apps/api, apps/worker).
 * For client-side checks, use the pure helpers in @execora/shared.
 *
 * Usage:
 *   // In a Fastify preHandler:
 *   const entitlements = await resolveEntitlements(req.tenantId);
 *   if (!entitlements.products.pos) {
 *     return reply.code(402).send({ error: 'POS not included in your plan.' });
 *   }
 *
 *   // On SubscriptionChanged event:
 *   await invalidateEntitlements(tenantId);
 */

import type { TenantEntitlements, PlanId } from "@execora/types";
import { PLAN_DEFINITIONS, LEGACY_PLAN_MAP } from "@execora/types";
import { prisma } from "./database";
import { redisClient } from "./redis-client";
import { logger } from "./logger";

const CACHE_TTL_SECONDS = 300; // 5 minutes
const cacheKey = (tenantId: string): string => `ent:v1:${tenantId}`;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Resolves TenantEntitlements for the given tenant.
 * Reads from Redis cache first; falls back to Prisma on miss.
 * Throws if the tenant does not exist.
 */
export async function resolveEntitlements(
  tenantId: string,
): Promise<TenantEntitlements> {
  // 1. Cache read
  try {
    const cached = await redisClient.get(cacheKey(tenantId));
    if (cached) {
      return JSON.parse(cached) as TenantEntitlements;
    }
  } catch (err) {
    // Redis unavailable — fall through to DB, do not fail the request
    logger.warn(
      { tenantId, err },
      "resolve-entitlements: Redis read failed, using DB",
    );
  }

  // 2. DB read
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { plan: true, features: true },
  });

  const dbPlan = String(tenant.plan);
  const planId: PlanId = LEGACY_PLAN_MAP[dbPlan] ?? "free";
  const planDef = PLAN_DEFINITIONS[planId];
  const legacyFlags = (tenant.features ?? {}) as Record<string, unknown>;

  // 3. Build entitlements — plan baseline + legacy flag overrides
  const entitlements: TenantEntitlements = {
    planId,
    businesses: planDef.entitlements.businesses,
    users: planDef.entitlements.users,
    caUsers: planDef.entitlements.caUsers,
    counters: planDef.entitlements.counters,

    products: { ...planDef.entitlements.products },

    // Industry packs stored as '<pack>_pack' boolean flags in features JSON
    industryPacks: {
      pharmacy: legacyFlags["pharmacy_pack"] === true,
      grocery: legacyFlags["grocery_pack"] === true,
      restaurant: legacyFlags["restaurant_pack"] === true,
      jewellery: legacyFlags["jewellery_pack"] === true,
      apparel: legacyFlags["apparel_pack"] === true,
    },

    limits: { ...planDef.entitlements.limits },

    // Merge plan baseline with any explicit per-tenant flag overrides
    // (legacy flags can only elevate, not demote, entitlements)
    features: {
      ...planDef.entitlements.features,
      eInvoice:
        planDef.entitlements.features.eInvoice ||
        legacyFlags["e_invoicing"] === true,
      eWayBill:
        planDef.entitlements.features.eWayBill ||
        legacyFlags["e_way_bill"] === true,
      multiGodown:
        planDef.entitlements.features.multiGodown ||
        legacyFlags["multi_branch"] === true,
      batchExpiry:
        planDef.entitlements.features.batchExpiry ||
        legacyFlags["batch_tracking"] === true,
      barcodeScan:
        planDef.entitlements.features.barcodeScan ||
        legacyFlags["barcode_scan"] === true,
      creditLimits:
        planDef.entitlements.features.creditLimits ||
        legacyFlags["customer_credit"] === true,
      gstr1Export:
        planDef.entitlements.features.gstr1Export ||
        legacyFlags["gst_filing"] === true,
      ocrPurchaseBill:
        planDef.entitlements.features.ocrPurchaseBill ||
        legacyFlags["ocr_purchase_bill"] === true,
      emailDelivery:
        planDef.entitlements.features.emailDelivery ||
        legacyFlags["email"] === true,
      aiAssistant:
        planDef.entitlements.features.aiAssistant ||
        legacyFlags["ai_assistant"] === true,
      voiceAssistant:
        planDef.entitlements.features.voiceAssistant ||
        legacyFlags["voice_recording"] === true ||
        legacyFlags["unlimited_voice"] === true,
      aiDocumentExtraction:
        planDef.entitlements.features.aiDocumentExtraction ||
        legacyFlags["ocr_purchase_bill"] === true ||
        legacyFlags["ai_document_extraction"] === true,
      aiAutofill:
        planDef.entitlements.features.aiAutofill ||
        legacyFlags["ai_autofill"] === true,
      aiInsights:
        planDef.entitlements.features.aiInsights ||
        legacyFlags["ai_insights"] === true,
    },

    support: { ...planDef.entitlements.support },
    addOns: [],
  };

  // 4. Cache write
  try {
    await redisClient.set(
      cacheKey(tenantId),
      JSON.stringify(entitlements),
      "EX",
      CACHE_TTL_SECONDS,
    );
  } catch (err) {
    logger.warn({ tenantId, err }, "resolve-entitlements: Redis write failed");
  }

  return entitlements;
}

/**
 * Invalidates the cached entitlements for a tenant.
 * Call this after any subscription change, add-on activation, or plan upgrade/downgrade.
 * The SubscriptionChanged domain event handler should call this automatically.
 */
export async function invalidateEntitlements(tenantId: string): Promise<void> {
  try {
    await redisClient.del(cacheKey(tenantId));
    logger.info({ tenantId }, "resolve-entitlements: cache invalidated");
  } catch (err) {
    logger.warn(
      { tenantId, err },
      "resolve-entitlements: cache invalidation failed",
    );
  }
}
