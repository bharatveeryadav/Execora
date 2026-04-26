import { prisma } from './database';
import { logger } from './logger';

// These are overwritten at runtime after bootstrap completes.
// Use these constants everywhere instead of hardcoding IDs.
export let SYSTEM_TENANT_ID = process.env.SYSTEM_TENANT_ID || 'system-tenant-001';
export let SYSTEM_USER_ID   = process.env.SYSTEM_USER_ID   || 'system-user-001';

/**
 * Ensures a default Tenant and User exist in the database.
 * Called once at server startup before accepting requests.
 */
export async function bootstrapSystem(): Promise<void> {
  try {
    // ── 1. Tenant ────────────────────────────────────────────────────────────
    let tenant = await prisma.tenant.findUnique({ where: { id: SYSTEM_TENANT_ID } });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          id:           SYSTEM_TENANT_ID,
          name:         process.env.BUSINESS_NAME || 'My Store',
          businessType: (process.env.BUSINESS_TYPE || 'retail') as any,
          plan:         'free',
          status:       'active',
        },
      });
      logger.info({ tenantId: tenant.id }, 'Default tenant created');
    }

    // ── 2. User ──────────────────────────────────────────────────────────────
    if (!process.env.ADMIN_PASSWORD_HASH) {
      logger.warn(
        'ADMIN_PASSWORD_HASH is not set. ' +
        'The default system user will be created with a locked placeholder hash. ' +
        'Set ADMIN_PASSWORD_HASH to a scrypt hash before going to production.'
      );
    }

    // Upsert so that changes to ADMIN_EMAIL / ADMIN_PASSWORD_HASH in .env are
    // applied on the next API restart without a manual DB fix.
    const user = await prisma.user.upsert({
      where:  { id: SYSTEM_USER_ID },
      update: {
        email:        process.env.ADMIN_EMAIL || 'owner@store.local',
        passwordHash: process.env.ADMIN_PASSWORD_HASH || '$LOCKED_PLACEHOLDER$',
        name:         process.env.ADMIN_NAME  || 'Owner',
      },
      create: {
        id:           SYSTEM_USER_ID,
        tenantId:     tenant.id,
        email:        process.env.ADMIN_EMAIL || 'owner@store.local',
        // Locked placeholder — not a valid scrypt hash, so login will always fail
        // until ADMIN_PASSWORD_HASH is set to a real scrypt hash.
        passwordHash: process.env.ADMIN_PASSWORD_HASH || '$LOCKED_PLACEHOLDER$',
        name:         process.env.ADMIN_NAME  || 'Owner',
        role:         'owner',
        permissions:  [],
        isActive:     true,
      },
    });
    logger.info({ userId: user.id, email: user.email }, 'Default user upserted');

    SYSTEM_TENANT_ID = tenant.id;
    SYSTEM_USER_ID   = user.id;

    logger.info({ tenantId: SYSTEM_TENANT_ID, userId: SYSTEM_USER_ID }, 'System bootstrap complete');
    logger.error({ error }, 'System bootstrap failed');
    throw error;
  }
}
