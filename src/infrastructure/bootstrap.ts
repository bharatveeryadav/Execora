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
          businessType: 'kirana',
          plan:         'free',
          status:       'active',
        },
      });
      logger.info({ tenantId: tenant.id }, '🏪 Default tenant created');
    }

    // ── 2. User ──────────────────────────────────────────────────────────────
    let user = await prisma.user.findUnique({ where: { id: SYSTEM_USER_ID } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id:           SYSTEM_USER_ID,
          tenantId:     tenant.id,
          email:        process.env.ADMIN_EMAIL || 'admin@store.local',
          passwordHash: process.env.ADMIN_PASSWORD_HASH || 'changeme',
          name:         process.env.ADMIN_NAME  || 'Admin',
          role:         'owner',
          isActive:     true,
        },
      });
      logger.info({ userId: user.id }, '👤 Default user created');
    }

    SYSTEM_TENANT_ID = tenant.id;
    SYSTEM_USER_ID   = user.id;

    logger.info({ tenantId: SYSTEM_TENANT_ID, userId: SYSTEM_USER_ID }, '✅ System bootstrap complete');
  } catch (error) {
    logger.error({ error }, '❌ System bootstrap failed');
    throw error;
  }
}
