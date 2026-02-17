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
