import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
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
