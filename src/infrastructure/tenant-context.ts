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

  /**
   * Update the current async context in-place (Node 20 `enterWith`).
   * Used by the JWT auth preHandler to replace the default system context
   * with the authenticated user's tenantId/userId after token verification.
   * All subsequent async work (handlers, services, DB audit) inherits the update.
   */
  update(partial: Partial<TenantCtx>): void {
    const current = storage.getStore() ?? { tenantId: 'system-tenant-001', userId: 'system-user-001' };
    storage.enterWith({ ...current, ...partial });
  },

  /** True when called within an active request context. */
  isActive(): boolean {
    return storage.getStore() !== undefined;
  },
};
