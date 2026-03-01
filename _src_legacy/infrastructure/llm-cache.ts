import { Redis } from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

const isTest = process.env.NODE_TEST === '1' || process.env.NODE_TEST === 'true';

type CacheEntry = {
    value: string;
    expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();
let redisClient: Redis | null = null;

const getRedisClient = (): Redis | null => {
    if (isTest) {
        return null;
    }

    if (!redisClient) {
        redisClient = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            maxRetriesPerRequest: 2,
            lazyConnect: true,
        });

        redisClient.on('error', (error) => {
            logger.warn({ error: error.message }, 'Redis cache error');
        });
    }

    return redisClient;
};

const getMemoryValue = (key: string): string | null => {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        memoryCache.delete(key);
        return null;
    }
    return entry.value;
};

const setMemoryValue = (key: string, value: string, ttlSeconds: number) => {
    memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });
};

export const llmCache = {
    async get(key: string): Promise<string | null> {
        if (isTest) {
            return getMemoryValue(key);
        }

        try {
            const client = getRedisClient();
            if (!client) return null;
            const value = await client.get(key);
            return value ?? null;
        } catch (error: any) {
            logger.warn({ error: error.message }, 'LLM cache get failed');
            return null;
        }
    },

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        if (ttlSeconds <= 0) return;

        if (isTest) {
            setMemoryValue(key, value, ttlSeconds);
            return;
        }

        try {
            const client = getRedisClient();
            if (!client) return;
            await client.set(key, value, 'EX', ttlSeconds);
        } catch (error: any) {
            logger.warn({ error: error.message }, 'LLM cache set failed');
        }
    },

    async close(): Promise<void> {
        if (redisClient) {
            try {
                await redisClient.quit();
            } catch (error: any) {
                logger.warn({ error: error.message }, 'LLM cache close failed');
            } finally {
                redisClient = null;
            }
        }
    },
};
