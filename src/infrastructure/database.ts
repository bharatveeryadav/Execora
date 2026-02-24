import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { logger } from './logger';
import { dbAuditEventsTotal, dbQueriesTotal, dbQueryDuration } from './metrics';

const DB_SLOW_QUERY_MS = Number(process.env.DB_SLOW_QUERY_MS || 500);

const REDACT_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'refreshToken',
  'accessToken',
  'authorization',
  'otp',
  'secret',
]);

const MUTATION_ACTIONS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

const safeValue = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(safeValue);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      out[key] = REDACT_KEYS.has(key) ? '[REDACTED]' : safeValue(raw);
    }
    return out;
  }
  return value;
};

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
};

const extractTenantId = (args: any): string | undefined => {
  if (!args || typeof args !== 'object') return undefined;
  return firstString(
    args?.where?.tenantId,
    args?.data?.tenantId,
    args?.where?.AND?.tenantId,
    args?.where?.OR?.tenantId
  );
};

const normalizeOperationFromQuery = (query: string): string => {
  const token = query.trim().split(/\s+/)[0]?.toUpperCase();
  if (token === 'SELECT') return 'find';
  if (token === 'INSERT') return 'create';
  if (token === 'UPDATE') return 'update';
  if (token === 'DELETE') return 'delete';
  return token?.toLowerCase() || 'unknown';
};

const prismaClientSingleton = () => {
  const prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ],
  });

  prisma.$on('query', (event: any) => {
    const operation = normalizeOperationFromQuery(event.query);
    const durationMs = Number(event.duration || 0);
    const status = durationMs > DB_SLOW_QUERY_MS ? 'slow' : 'ok';

    dbQueryDuration.observe(
      { operation, table: 'sql' },
      durationMs / 1000
    );
    dbQueriesTotal.inc({ operation, table: 'sql', status });

    const payload = {
      category: 'db_query',
      operation,
      durationMs,
      slow: status === 'slow',
      query: event.query?.slice(0, 300),
      params: event.params?.slice(0, 200),
    };

    if (status === 'slow') {
      logger.warn(payload, 'Slow database query');
      return;
    }

    if (config.nodeEnv === 'development') {
      logger.debug(payload, 'Database query');
    }
  });

  prisma.$on('warn', (event: any) => {
    logger.warn({ category: 'db_client', event }, 'Prisma warning');
  });

  prisma.$on('error', (event: any) => {
    logger.error({ category: 'db_client', event }, 'Prisma client error');
  });

  prisma.$use(async (params, next) => {
    const startedAt = Date.now();
    const action = params.action || 'unknown';
    const model = params.model || 'raw';
    const tenantId = extractTenantId(params.args);

    if (!MUTATION_ACTIONS.has(action)) {
      return next(params);
    }

    const auditBase = {
      category: 'db_audit',
      action,
      model,
      tenantId,
      where: safeValue(params.args?.where),
      dataKeys: params.args?.data && typeof params.args.data === 'object'
        ? Object.keys(params.args.data)
        : undefined,
    };

    try {
      const result = await next(params);
      const durationMs = Date.now() - startedAt;

      dbQueryDuration.observe({ operation: action, table: model }, durationMs / 1000);
      dbQueriesTotal.inc({ operation: action, table: model, status: 'ok' });
      dbAuditEventsTotal.inc({ operation: action, model, status: 'success' });

      logger.info(
        {
          ...auditBase,
          durationMs,
          resultCount: Array.isArray(result) ? result.length : undefined,
          status: 'success',
        },
        'Database mutation audit'
      );
      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      dbQueryDuration.observe({ operation: action, table: model }, durationMs / 1000);
      dbQueriesTotal.inc({ operation: action, table: model, status: 'error' });
      dbAuditEventsTotal.inc({ operation: action, model, status: 'error' });

      logger.error(
        {
          ...auditBase,
          durationMs,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        },
        'Database mutation failed'
      );
      throw error;
    }
  });

  return prisma;
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (config.nodeEnv !== 'production') {
  globalThis.prisma = prisma;
}

// Graceful shutdown
export const disconnectDB = async () => {
  await prisma.$disconnect();
};

/**
 * Verify required tables are present in the target schema.
 */
export const getMissingTables = async (
  requiredTables: string[],
  schema: string = 'public'
): Promise<string[]> => {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = ${schema}
  `;

  const existingTables = new Set(rows.map((row) => row.table_name));
  return requiredTables.filter((tableName) => !existingTables.has(tableName));
};

/**
 * Ensure voice capture tables exist before accepting live voice traffic.
 */
export const ensureVoiceSchemaReady = async () => {
  const requiredVoiceTables = ['conversation_sessions', 'voice_recordings'];
  const missingTables = await getMissingTables(requiredVoiceTables);

  if (missingTables.length > 0) {
    throw new Error(
      `Missing required voice database tables: ${missingTables.join(', ')}. ` +
      'Run `npm run db:push` (or apply Prisma migrations) and restart the server.'
    );
  }
};
