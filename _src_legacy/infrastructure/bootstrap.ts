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
    let user = await prisma.user.findUnique({ where: { id: SYSTEM_USER_ID } });

    if (!user) {
      if (!process.env.ADMIN_PASSWORD_HASH) {
        logger.warn(
          'ADMIN_PASSWORD_HASH is not set. ' +
          'The default system user will be created with a locked placeholder hash. ' +
          'Set ADMIN_PASSWORD_HASH to a bcrypt hash before going to production.'
        );
      }

      user = await prisma.user.create({
        data: {
          id:           SYSTEM_USER_ID,
          tenantId:     tenant.id,
          email:        process.env.ADMIN_EMAIL || 'admin@store.local',
          // Locked placeholder — not a valid bcrypt hash, so login will always fail
          // until ADMIN_PASSWORD_HASH is set to a real bcrypt hash.
          passwordHash: process.env.ADMIN_PASSWORD_HASH || '$2b$10$LOCKED_PLACEHOLDER_SET_ADMIN_PASSWORD_HASH',
          name:         process.env.ADMIN_NAME  || 'Admin',
          role:         'owner',
          permissions:  [],
          isActive:     true,
        },
      });
      logger.info({ userId: user.id }, 'Default user created');
    }

    SYSTEM_TENANT_ID = tenant.id;
    SYSTEM_USER_ID   = user.id;

    logger.info({ tenantId: SYSTEM_TENANT_ID, userId: SYSTEM_USER_ID }, '✅ System bootstrap complete');
  } catch (error) {
    logger.error({ error }, '❌ System bootstrap failed');
    throw error;
  }
}
