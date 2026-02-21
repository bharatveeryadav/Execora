import { Redis } from 'ioredis';
import { config } from '../config';
import { logger } from './logger';
import { IntentType } from '../types';

type CachePolicy = {
    ttlSeconds: number;
    scope: 'conversation' | 'global';
};

type RuntimeConfig = {
    llm: {
        responseTokenLimits: Record<string, number>;
        responseCachePolicy: Record<string, CachePolicy>;
        cost: {
            inputPer1k: number;
            outputPer1k: number;
        };
    };
    features: {
        disabledIntents: string[];
    };
    ops: {
        rateLimit: {
            max: number;
            timeWindow: string;
        };
        allowedOrigins: string[];
    };
    meta: {
        source: 'default' | 'redis';
        loadedAt: string;
    };
};

const isTest = process.env.NODE_TEST === '1' || process.env.NODE_TEST === 'true';
const configKey = process.env.RUNTIME_CONFIG_KEY || 'execora:runtime-config';
const pollSeconds = parseInt(process.env.RUNTIME_CONFIG_POLL_SECONDS || '60', 10);

const defaultAllowedOrigins = config.allowedOrigins
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const defaultConfig: RuntimeConfig = {
    llm: {
        responseTokenLimits: {
            [IntentType.CHECK_BALANCE]: 80,
            [IntentType.CHECK_STOCK]: 90,
            [IntentType.DAILY_SUMMARY]: 220,
            [IntentType.LIST_REMINDERS]: 120,
            [IntentType.GET_CUSTOMER_INFO]: 180,
        },
        responseCachePolicy: {
            [IntentType.CHECK_BALANCE]: { ttlSeconds: 120, scope: 'conversation' },
            [IntentType.CHECK_STOCK]: { ttlSeconds: 120, scope: 'global' },
            [IntentType.DAILY_SUMMARY]: { ttlSeconds: 300, scope: 'global' },
            [IntentType.LIST_REMINDERS]: { ttlSeconds: 60, scope: 'conversation' },
            [IntentType.GET_CUSTOMER_INFO]: { ttlSeconds: 60, scope: 'conversation' },
        },
        cost: {
            inputPer1k: parseFloat(process.env.OPENAI_COST_INPUT_PER_1K || '0'),
            outputPer1k: parseFloat(process.env.OPENAI_COST_OUTPUT_PER_1K || '0'),
        },
    },
    features: {
        disabledIntents: [],
    },
    ops: {
        rateLimit: {
            max: 200,
            timeWindow: '1 minute',
        },
        allowedOrigins: defaultAllowedOrigins,
    },
    meta: {
        source: 'default',
        loadedAt: new Date().toISOString(),
    },
};

let currentConfig: RuntimeConfig = { ...defaultConfig };
let redisClient: Redis | null = null;
let poller: NodeJS.Timeout | null = null;

const getRedisClient = (): Redis | null => {
    if (isTest) return null;
    if (!redisClient) {
        redisClient = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            maxRetriesPerRequest: 2,
            lazyConnect: true,
        });
        redisClient.on('error', (error) => {
            logger.warn({ error: error.message }, 'Runtime config Redis error');
        });
    }
    return redisClient;
};

const mergeConfig = (base: RuntimeConfig, override: Partial<RuntimeConfig>): RuntimeConfig => {
    const merged: RuntimeConfig = {
        ...base,
        llm: {
            ...base.llm,
            responseTokenLimits: {
                ...base.llm.responseTokenLimits,
                ...(override.llm?.responseTokenLimits || {}),
            },
            responseCachePolicy: {
                ...base.llm.responseCachePolicy,
                ...(override.llm?.responseCachePolicy || {}),
            },
            cost: {
                ...base.llm.cost,
                ...(override.llm?.cost || {}),
            },
        },
        features: {
            ...base.features,
            ...(override.features || {}),
            disabledIntents: override.features?.disabledIntents || base.features.disabledIntents,
        },
        ops: {
            ...base.ops,
            rateLimit: {
                ...base.ops.rateLimit,
                ...(override.ops?.rateLimit || {}),
            },
            allowedOrigins: override.ops?.allowedOrigins || base.ops.allowedOrigins,
        },
        meta: {
            ...base.meta,
            ...(override.meta || {}),
        },
    };

    return merged;
};

const loadFromRedis = async (): Promise<RuntimeConfig | null> => {
    try {
        const client = getRedisClient();
        if (!client) return null;
        const raw = await client.get(configKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<RuntimeConfig>;
        return mergeConfig(defaultConfig, {
            ...parsed,
            meta: {
                source: 'redis',
                loadedAt: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        logger.warn({ error: error.message }, 'Failed to load runtime config from Redis');
        return null;
    }
};

export const initRuntimeConfig = async (): Promise<void> => {
    const loaded = await loadFromRedis();
    if (loaded) {
        currentConfig = loaded;
        logger.info({ source: 'redis' }, 'Runtime config loaded');
    } else {
        currentConfig = { ...defaultConfig };
        logger.info({ source: 'default' }, 'Runtime config using defaults');
    }
};

export const startRuntimeConfigPolling = () => {
    if (poller || pollSeconds <= 0) return;
    poller = setInterval(async () => {
        const loaded = await loadFromRedis();
        if (loaded) {
            currentConfig = loaded;
        }
    }, pollSeconds * 1000);
};

export const stopRuntimeConfigPolling = async () => {
    if (poller) {
        clearInterval(poller);
        poller = null;
    }

    if (redisClient) {
        try {
            await redisClient.quit();
        } catch (error: any) {
            logger.warn({ error: error.message }, 'Runtime config Redis close failed');
        } finally {
            redisClient = null;
        }
    }
};

export const getRuntimeConfig = (): RuntimeConfig => currentConfig;
