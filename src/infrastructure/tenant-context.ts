import { AsyncLocalStorage } from 'async_hooks';

export interface TenantCtx {
  tenantId: string;
  userId: string;
}

const storage = new AsyncLocalStorage<TenantCtx>();

/**
 * Request-scoped tenant context using Node.js AsyncLocalStorage.
 *
 * Usage in HTTP routes (Fastify hook pattern):
 *   fastify.addHook('onRequest', function(req, reply, done) {
 *     tenantContext.run({ tenantId, userId }, done);
 *   });
 *
 * Usage in services:
 *   const { tenantId } = tenantContext.get();
 *
 * Falls back to SYSTEM_TENANT_ID when called outside a request
 * (workers, tests, bootstrap) so no code breaks during migration.
 */
export const tenantContext = {
  /**
   * Establish a tenant context for fn and all async work it initiates.
   * Pass `done` as fn to integrate cleanly with Fastify callback-style hooks.
   */
  run<T>(ctx: TenantCtx, fn: (() => T) | (() => Promise<T>)): T | Promise<T> {
    return storage.run(ctx, fn as () => T);
  },

  /**
   * Read the active tenant context.
   * Accepts an optional fallback for use in workers and background jobs.
   */
  get(fallback?: TenantCtx): TenantCtx {
    return storage.getStore() ?? fallback ?? { tenantId: 'system-tenant-001', userId: 'system-user-001' };
  },

  /** True when called within an active request context. */
  isActive(): boolean {
    return storage.getStore() !== undefined;
  },
};
