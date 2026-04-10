"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmCache = void 0;
const ioredis_1 = require("ioredis");
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
const isTest = process.env.NODE_TEST === '1' || process.env.NODE_TEST === 'true';
const memoryCache = new Map();
let redisClient = null;
const getRedisClient = () => {
    if (isTest) {
        return null;
    }
    if (!redisClient) {
        redisClient = new ioredis_1.Redis({
            host: core_1.config.redis.host,
            port: core_1.config.redis.port,
            password: core_1.config.redis.password,
            maxRetriesPerRequest: 2,
            lazyConnect: true,
        });
        redisClient.on('error', (error) => {
            core_2.logger.warn({ error: error.message }, 'Redis cache error');
        });
    }
    return redisClient;
};
const getMemoryValue = (key) => {
    const entry = memoryCache.get(key);
    if (!entry)
        return null;
    if (Date.now() > entry.expiresAt) {
        memoryCache.delete(key);
        return null;
    }
    return entry.value;
};
const setMemoryValue = (key, value, ttlSeconds) => {
    memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });
};
exports.llmCache = {
    async get(key) {
        if (isTest) {
            return getMemoryValue(key);
        }
        try {
            const client = getRedisClient();
            if (!client)
                return null;
            const value = await client.get(key);
            return value ?? null;
        }
        catch (error) {
            core_2.logger.warn({ error: error.message }, 'LLM cache get failed');
            return null;
        }
    },
    async set(key, value, ttlSeconds) {
        if (ttlSeconds <= 0)
            return;
        if (isTest) {
            setMemoryValue(key, value, ttlSeconds);
            return;
        }
        try {
            const client = getRedisClient();
            if (!client)
                return;
            await client.set(key, value, 'EX', ttlSeconds);
        }
        catch (error) {
            core_2.logger.warn({ error: error.message }, 'LLM cache set failed');
        }
    },
    async close() {
        if (redisClient) {
            try {
                await redisClient.quit();
            }
            catch (error) {
                core_2.logger.warn({ error: error.message }, 'LLM cache close failed');
            }
            finally {
                redisClient = null;
            }
        }
    },
};
//# sourceMappingURL=llm-cache.js.map