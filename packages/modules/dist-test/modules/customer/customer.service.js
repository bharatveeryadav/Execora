"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerService = void 0;
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
const core_3 = require("@execora/core");
const library_1 = require("@prisma/client/runtime/library");
const client_1 = require("@prisma/client");
class CustomerService {
    /**
     * Get total pending amount (sum of all customer balances > 0)
     */
    async getTotalPendingAmount() {
        const { tenantId } = core_3.tenantContext.get();
        const result = await core_1.prisma.customer.aggregate({
            _sum: { balance: true },
            where: { tenantId, balance: { gt: 0 } },
        });
        return parseFloat(result._sum.balance?.toString() || '0');
    }
    /**
     * Get all customers with non-zero (pending) balance
     */
    async getAllCustomersWithPendingBalance() {
        const { tenantId } = core_3.tenantContext.get();
        const customers = await core_1.prisma.customer.findMany({
            where: {
                tenantId,
                balance: {
                    gt: 0,
                },
            },
            select: {
                id: true,
                name: true,
                balance: true,
                landmark: true,
                phone: true,
            },
            orderBy: { balance: 'desc' },
        });
        return customers.map((c) => ({
            id: c.id,
            name: c.name,
            balance: parseFloat(c.balance.toString()),
            landmark: c.landmark === null ? undefined : c.landmark,
            phone: c.phone === null ? undefined : c.phone,
        }));
    }
    /**
     * List all customers sorted by balance descending (used for the customers page browse/list view).
     * Unlike searchCustomer, this never filters by score — it just pages through all records.
     */
    async listAllCustomers(limit = 200) {
        const { tenantId } = core_3.tenantContext.get();
        const customers = await core_1.prisma.customer.findMany({
            where: { tenantId },
            orderBy: { balance: 'desc' },
            take: limit,
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                nickname: true,
                landmark: true,
                balance: true,
                tags: true,
                notes: true,
                gstin: true,
                creditLimit: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                pincode: true,
            },
        });
        return customers.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            nickname: Array.isArray(c.nickname) ? (c.nickname[0] ?? null) : c.nickname,
            landmark: c.landmark,
            balance: parseFloat(c.balance.toString()),
            matchScore: 1.0,
            tags: c.tags,
            notes: c.notes,
            gstin: c.gstin,
            creditLimit: c.creditLimit ? parseFloat(c.creditLimit.toString()) : null,
            addressLine1: c.addressLine1 ?? undefined,
            addressLine2: c.addressLine2 ?? undefined,
            city: c.city ?? undefined,
            state: c.state ?? undefined,
            pincode: c.pincode ?? undefined,
        }));
    }
    conversationCache = new Map();
    balanceCache = new Map();
    cacheTimeout = 5 * 60 * 1000; // 5 minutes
    balanceCacheTimeout = 30 * 1000; // 30 seconds for balance
    cleanupInterval;
    /**
     * Constructor - Initialize cleanup interval
     */
    constructor() {
        // Cleanup expired cache entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredCache();
        }, 5 * 60 * 1000);
    }
    /**
     * Clean cache entries that have expired
     */
    cleanupExpiredCache() {
        const now = Date.now();
        let cleaned = 0;
        for (const [conversationId, context] of this.conversationCache.entries()) {
            if (now - context.timestamp > this.cacheTimeout) {
                // Clear all stream subscriptions before deleting
                for (const interval of context.streamSubscriptions.values()) {
                    clearInterval(interval);
                }
                this.conversationCache.delete(conversationId);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            core_2.logger.info({ cleaned }, 'Cleaned expired conversation cache entries');
        }
    }
    /**
     * Get or create conversation context
     */
    getContext(conversationId) {
        if (!this.conversationCache.has(conversationId)) {
            this.conversationCache.set(conversationId, {
                recentCustomers: [],
                lastSearch: '',
                timestamp: Date.now(),
                streamSubscriptions: new Map(),
                activeCustomerId: undefined,
            });
        }
        return this.conversationCache.get(conversationId);
    }
    /**
     * Set active customer for a conversation (focus memory)
     */
    setActiveCustomer(conversationId, customerId) {
        const context = this.getContext(conversationId);
        context.activeCustomerId = customerId;
        context.timestamp = Date.now();
    }
    /**
     * Get active customer for a conversation
     */
    async getActiveCustomer(conversationId) {
        const context = this.conversationCache.get(conversationId);
        if (!context?.activeCustomerId) {
            return null;
        }
        const cached = context.recentCustomers.find((c) => c.id === context.activeCustomerId);
        if (cached) {
            return cached;
        }
        const { tenantId } = core_3.tenantContext.get();
        const customer = await core_1.prisma.customer.findFirst({
            where: { id: context.activeCustomerId, tenantId },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                nickname: true,
                landmark: true,
                balance: true,
            },
        });
        if (!customer) {
            context.activeCustomerId = undefined;
            return null;
        }
        const result = {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            nickname: customer.nickname[0] ?? null,
            landmark: customer.landmark,
            balance: parseFloat(customer.balance.toString()),
            matchScore: 1.0,
        };
        context.recentCustomers = [result, ...context.recentCustomers.filter((c) => c.id !== result.id)].slice(0, 10);
        context.timestamp = Date.now();
        return result;
    }
    /**
     * Load a customer by ID and register them as active in the conversation cache.
     * Used by resolveCustomer to restore active customer from Redis after a restart.
     */
    async getActiveCustomerById(customerId, conversationId) {
        const customer = await core_1.prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, name: true, phone: true, email: true, nickname: true, landmark: true, balance: true },
        });
        if (!customer)
            return null;
        const result = {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            nickname: Array.isArray(customer.nickname) ? (customer.nickname[0] ?? null) : null,
            landmark: customer.landmark,
            balance: parseFloat(customer.balance.toString()),
            matchScore: 1.0,
        };
        // Populate in-memory cache so subsequent calls in this process are fast
        const context = this.getContext(conversationId);
        context.activeCustomerId = customerId;
        context.recentCustomers = [result, ...context.recentCustomers.filter((c) => c.id !== customerId)].slice(0, 10);
        context.timestamp = Date.now();
        return result;
    }
    /**
     * Invalidate (clear) conversation cache to force fresh data fetch on next search
     */
    invalidateConversationCache(conversationId) {
        if (this.conversationCache.has(conversationId)) {
            const context = this.conversationCache.get(conversationId);
            context.recentCustomers = [];
            context.lastSearch = '';
            context.timestamp = Date.now();
            core_2.logger.info({ conversationId }, '🔄 Conversation cache invalidated');
        }
    }
    /**
     * Check if cache is still valid
     */
    isCacheValid(timestamp) {
        return Date.now() - timestamp < this.cacheTimeout;
    }
    /**
     * Normalize query and extract meaningful tokens for multi-word search
     */
    parseQuery(query) {
        const normalized = query
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const stopWords = new Set([
            'ka',
            'ki',
            'ke',
            'ko',
            'se',
            'me',
            'main',
            'hai',
            'ho',
            'wala',
            'wali',
            'waale',
            'customer',
            'cust',
            'bhai',
            'ji',
            'mr',
            'mrs',
            'ms',
            'the',
            'a',
            'an',
        ]);
        const tokens = normalized
            .split(' ')
            .map((t) => t.trim())
            .filter((t) => t.length >= 2 && !stopWords.has(t));
        return { normalized, tokens };
    }
    /**
     * Search customer with conversation context (Fast!)
     */
    async searchCustomerWithContext(query, conversationId) {
        const context = this.getContext(conversationId);
        const parsed = this.parseQuery(query);
        // Try to find in cache first
        if (this.isCacheValid(context.timestamp) && context.recentCustomers.length > 0) {
            const cachedResults = context.recentCustomers
                .map((c) => ({
                ...c,
                matchScore: this.calculateMatchScore(parsed.normalized, c),
            }))
                .filter((c) => c.matchScore >= 0.35)
                .sort((a, b) => b.matchScore - a.matchScore);
            if (cachedResults.length > 0) {
                core_2.logger.info({ conversationId, cacheHits: cachedResults.length }, '⚡ Customer search from cache');
                return cachedResults;
            }
        }
        // Cache miss - search database
        core_2.logger.info({ conversationId, query }, '🔍 Customer search from database');
        const results = await this.searchCustomer(query);
        // Update context
        context.recentCustomers = results;
        context.lastSearch = query;
        context.timestamp = Date.now();
        return results;
    }
    /**
     * Get multiple customers in batch (Real-time optimized)
     */
    async getMultipleCustomersWithContext(customerIds, conversationId) {
        const context = this.getContext(conversationId);
        core_2.logger.info({ conversationId, count: customerIds.length }, '📦 Batch customer fetch');
        // Fetch all in parallel
        const customers = await Promise.all(customerIds.map((id) => this.getCustomerById(id)));
        // Update cache with results
        const searchResults = customers.filter(Boolean).map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            nickname: Array.isArray(c.nickname) ? (c.nickname[0] ?? null) : c.nickname,
            landmark: c.landmark,
            balance: parseFloat(c.balance.toString()),
            matchScore: 1.0,
        }));
        context.recentCustomers = searchResults;
        context.timestamp = Date.now();
        return customers;
    }
    /**
     * Stream real-time balance updates (WebSocket)
     */
    async streamCustomerBalance(customerId, conversationId, onUpdate) {
        const context = this.getContext(conversationId);
        // Get initial balance
        const initialBalance = await this.getBalance(customerId);
        onUpdate({ balance: initialBalance, updatedAt: new Date().toISOString() });
        core_2.logger.info({ customerId, conversationId }, '🔄 Starting real-time balance stream');
        // Poll for balance changes every 1 second
        const streamId = `balance_${customerId}`;
        const interval = setInterval(async () => {
            try {
                const latestBalance = await this.getBalance(customerId);
                onUpdate({
                    balance: latestBalance,
                    updatedAt: new Date().toISOString(),
                });
            }
            catch (error) {
                core_2.logger.error({ error, customerId }, 'Balance stream error');
            }
        }, 1000);
        // Store subscription for cleanup
        context.streamSubscriptions.set(streamId, interval);
        // Return unsubscribe function
        return () => {
            clearInterval(interval);
            context.streamSubscriptions.delete(streamId);
            core_2.logger.info({ customerId, conversationId }, '🛑 Balance stream stopped');
        };
    }
    /**
     * Prefetch customer data and related records
     */
    async prefetchConversationContext(conversationId, latestCustomerId) {
        const context = this.getContext(conversationId);
        if (!latestCustomerId)
            return;
        core_2.logger.info({ conversationId, customerId: latestCustomerId }, '📥 Prefetching conversation context');
        try {
            // Fetch main customer
            const customer = await this.getCustomerById(latestCustomerId);
            // Fetch related customers (same landmark or recent invoices)
            const relatedCustomers = await core_1.prisma.customer.findMany({
                where: {
                    OR: [{ landmark: { equals: customer?.landmark || '' } }, { phone: { not: null } }],
                },
                take: 10,
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                    nickname: true,
                    landmark: true,
                    balance: true,
                },
            });
            // Convert to search results
            const searchResults = relatedCustomers.map((c) => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                email: c.email,
                nickname: Array.isArray(c.nickname) ? (c.nickname[0] ?? null) : c.nickname,
                landmark: c.landmark,
                balance: parseFloat(c.balance.toString()),
                matchScore: 0.7,
            }));
            context.recentCustomers = searchResults;
            context.timestamp = Date.now();
            core_2.logger.info({ conversationId, prefetched: searchResults.length }, '✅ Context prefetched');
        }
        catch (error) {
            core_2.logger.error({ error, conversationId }, 'Prefetch failed');
        }
    }
    /**
     * Calculate similarity between two strings (Levenshtein distance)
     */
    calculateSimilarity(str1, str2) {
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        if (s1 === s2)
            return 1.0;
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        if (longer.length === 0)
            return 1.0;
        const editDistance = this.getLevenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    /**
     * Calculate Levenshtein distance between two strings
     */
    getLevenshteinDistance(s1, s2) {
        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                }
                else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0)
                costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }
    /**
     * Find similar customers (for duplicate detection and suggestions)
     */
    async findSimilarCustomers(name, conversationId, threshold = 0.7) {
        const context = this.getContext(conversationId);
        core_2.logger.info({ conversationId, name, threshold }, '🔎 Searching for similar customers');
        // Search in cache first
        const cachedSimilar = context.recentCustomers
            .map((c) => ({
            customer: c,
            similarity: this.calculateSimilarity(name, c.name),
        }))
            .filter((result) => result.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity);
        if (cachedSimilar.length > 0) {
            core_2.logger.info({ conversationId, found: cachedSimilar.length, from: 'cache' }, '⚡ Similar customers found in cache');
            return cachedSimilar;
        }
        // Search in database
        const allCustomers = await core_1.prisma.customer.findMany({
            select: {
                id: true,
                name: true,
                phone: true,
                nickname: true,
                landmark: true,
                balance: true,
            },
            take: 100,
        });
        const similar = allCustomers
            .map((c) => ({
            customer: {
                id: c.id,
                name: c.name,
                phone: c.phone,
                nickname: Array.isArray(c.nickname) ? (c.nickname[0] ?? null) : c.nickname,
                landmark: c.landmark,
                balance: parseFloat(c.balance.toString()),
                matchScore: this.calculateSimilarity(name, c.name),
            },
            similarity: this.calculateSimilarity(name, c.name),
        }))
            .filter((result) => result.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5);
        core_2.logger.info({ conversationId, found: similar.length, from: 'database' }, '🔍 Similar customers found in database');
        // Update cache with new findings
        context.recentCustomers = similar.map((s) => s.customer);
        context.timestamp = Date.now();
        return similar;
    }
    /**
     * Create customer with minimal info (name only, everything else optional for instant feedback)
     */
    async createCustomerFast(name, conversationId) {
        try {
            if (!name || typeof name !== 'string' || !name.trim()) {
                throw new Error('Customer name is required and must be a non-empty string');
            }
            core_2.logger.info({ conversationId, name }, '⚡ Creating customer with name only');
            // Check for exact/near-exact name match (0.95+ similarity threshold prevents same names)
            const duplicates = await this.findSimilarCustomers(name, conversationId, 0.95);
            if (duplicates.length > 0) {
                core_2.logger.warn({ conversationId, name, found: duplicates[0].customer.name }, '🚫 Exact or near-exact duplicate customer name detected - Creation blocked');
                return {
                    success: false,
                    duplicateFound: true,
                    suggestions: duplicates.map((s) => ({
                        id: s.customer.id,
                        name: s.customer.name,
                        phone: s.customer.phone,
                        landmark: s.customer.landmark,
                        similarity: s.similarity,
                    })),
                    message: `Customer "${duplicates[0].customer.name}" already exists! Cannot create duplicate.`,
                };
            }
            // Create customer with only name
            const customer = await core_1.prisma.customer.create({
                data: {
                    tenantId: core_3.tenantContext.get().tenantId,
                    name: name.trim(),
                    balance: 0,
                    alternatePhone: [],
                    nickname: [],
                    preferredPaymentMethod: [],
                    preferredDays: [],
                    tags: [],
                    commonPhrases: [],
                },
            });
            core_2.logger.info({ customerId: customer.id, name: customer.name }, '✅ Customer created instantly');
            // Add to cache for instant access
            const context = this.getContext(conversationId);
            context.recentCustomers = [
                {
                    id: customer.id,
                    name: customer.name,
                    phone: null,
                    nickname: null,
                    landmark: null,
                    balance: 0,
                    matchScore: 1.0,
                },
            ];
            context.activeCustomerId = customer.id;
            return {
                success: true,
                customer: {
                    id: customer.id,
                    name: customer.name,
                    balance: 0,
                },
                message: `✅ ${name} added! You can update details later.`,
            };
        }
        catch (error) {
            core_2.logger.error({ error, name, conversationId }, 'Fast customer creation failed');
            throw error;
        }
    }
    /**
     * Instant update customer fields (one or multiple)
     */
    async updateCustomerInstant(customerId, updates, conversationId) {
        try {
            if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
                throw new Error('Customer ID is required');
            }
            if (!updates || Object.keys(updates).length === 0) {
                throw new Error('At least one field must be provided for update');
            }
            core_2.logger.info({ customerId, updates, conversationId }, '⚡ Instant customer update');
            const updateData = {};
            // Add only provided fields
            if (updates.name !== undefined)
                updateData.name = updates.name.trim();
            if (updates.phone !== undefined)
                updateData.phone = updates.phone;
            if (updates.email !== undefined)
                updateData.email = updates.email;
            if (updates.nickname !== undefined)
                updateData.nickname = updates.nickname ? [updates.nickname] : [];
            if (updates.landmark !== undefined)
                updateData.landmark = updates.landmark;
            if (updates.notes !== undefined)
                updateData.notes = updates.notes;
            if (updates.balance !== undefined) {
                updateData.balance = new library_1.Decimal(updates.balance);
            }
            const updated = await core_1.prisma.customer.update({
                where: { id: customerId },
                data: updateData,
            });
            core_2.logger.info({ customerId, fields: Object.keys(updates) }, '✅ Customer updated');
            // Clear cache for this customer
            const context = this.getContext(conversationId);
            context.recentCustomers = context.recentCustomers.map((c) => c.id === customerId ? { ...c, ...updates } : c);
            // Clear balance cache
            this.balanceCache.delete(customerId);
            return {
                success: true,
                customer: updated,
                message: `✅ Updated: ${Object.keys(updates).join(', ')}`,
            };
        }
        catch (error) {
            core_2.logger.error({ error, customerId }, 'Instant update failed');
            throw error;
        }
    }
    /**
     * Update customer fields (simple API for business logic)
     */
    async updateCustomer(customerId, updates) {
        try {
            if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
                throw new Error('Customer ID is required');
            }
            if (!updates || Object.keys(updates).length === 0) {
                throw new Error('At least one field must be provided for update');
            }
            const updateData = {};
            if (updates.name !== undefined)
                updateData.name = updates.name.trim();
            if (updates.phone !== undefined)
                updateData.phone = updates.phone;
            if (updates.email !== undefined)
                updateData.email = updates.email;
            if (updates.nickname !== undefined)
                updateData.nickname = updates.nickname ? [updates.nickname] : [];
            if (updates.landmark !== undefined)
                updateData.landmark = updates.landmark;
            if (updates.notes !== undefined)
                updateData.notes = updates.notes;
            if (updates.balance !== undefined) {
                updateData.balance = new library_1.Decimal(updates.balance);
            }
            await core_1.prisma.customer.update({
                where: { id: customerId },
                data: updateData,
            });
            // Clear balance cache for this customer
            this.balanceCache.delete(customerId);
            core_2.logger.info({ customerId, fields: Object.keys(updates) }, '✅ Customer updated');
            return true;
        }
        catch (error) {
            core_2.logger.error({ error, customerId }, 'Update customer failed');
            return false;
        }
    }
    /**
     * Invalidate the balance cache for a customer.
     * Call this immediately after any operation that mutates the customer's balance
     * (addCredit, recordPayment) so the next getBalanceFast reads fresh from DB.
     */
    invalidateBalanceCache(customerId) {
        this.balanceCache.delete(customerId);
    }
    /**
     * Get balance with fast cache (30-second TTL for real-time)
     */
    async getBalanceFast(customerId, conversationId) {
        // Check fast cache first
        const cached = this.balanceCache.get(customerId);
        if (cached && Date.now() - cached.timestamp < this.balanceCacheTimeout) {
            core_2.logger.debug({ customerId }, '⚡ Balance from fast cache');
            return cached.balance;
        }
        // Get from DB
        const balance = await this.getBalance(customerId);
        // Store in fast cache
        this.balanceCache.set(customerId, {
            balance,
            timestamp: Date.now(),
        });
        if (conversationId) {
            core_2.logger.info({ customerId, conversationId, balance }, '💰 Balance retrieved and cached');
        }
        return balance;
    }
    /**
     * Search with rank-based scoring system
     */
    async searchCustomerRanked(query, conversationId) {
        core_2.logger.info({ conversationId, query }, '🔍 Ranked customer search');
        // Try cache first
        const context = this.getContext(conversationId);
        if (this.isCacheValid(context.timestamp) && context.recentCustomers.length > 0) {
            const cached = context.recentCustomers
                .map((c) => ({
                ...c,
                matchScore: this.calculateMatchScore(query, c),
            }))
                .filter((c) => c.matchScore > 0.3)
                .sort((a, b) => b.matchScore - a.matchScore);
            if (cached.length > 0) {
                core_2.logger.info({ conversationId, found: cached.length, from: 'cache' }, '⚡ Ranked search from cache');
                return cached;
            }
        }
        // Search database
        const results = await this.searchCustomer(query);
        // Re-rank with advanced scoring
        const ranked = results
            .map((c) => ({
            ...c,
            matchScore: this.calculateMatchScore(query, c),
        }))
            .sort((a, b) => b.matchScore - a.matchScore);
        // Update cache
        context.recentCustomers = ranked;
        if (ranked.length > 0 && ranked[0].matchScore >= 0.85) {
            context.activeCustomerId = ranked[0].id;
        }
        context.timestamp = Date.now();
        core_2.logger.info({ conversationId, found: ranked.length }, '🎯 Ranked search results');
        return ranked;
    }
    /**
     * Advanced match score calculation (0-1)
     */
    calculateMatchScore(query, customer) {
        const { normalized: q, tokens } = this.parseQuery(query);
        let score = 0;
        const name = customer.name.toLowerCase();
        const nickname = customer.nickname?.toLowerCase() || '';
        const landmark = customer.landmark?.toLowerCase() || '';
        const phone = customer.phone || '';
        const notesText = `${name} ${nickname} ${landmark}`.trim();
        // Exact name match: 1.0
        if (name === q)
            return 1.0;
        // Name contains query: 0.8 + similarity bonus
        if (name.includes(q) && q.length > 0) {
            score = Math.max(score, 0.8 + this.calculateSimilarity(q, customer.name) * 0.1);
        }
        // Exact nickname match: 0.9
        if (nickname === q && q.length > 0)
            return 0.9;
        // Nickname contains query: 0.7
        if (nickname.includes(q) && q.length > 0) {
            score = Math.max(score, 0.7 + this.calculateSimilarity(q, nickname) * 0.1);
        }
        // Landmark match: 0.6
        if (landmark.includes(q) && q.length > 0) {
            score = Math.max(score, 0.6);
        }
        // Phone match: 0.95
        if (q.length > 0 && phone.includes(q)) {
            score = Math.max(score, 0.95);
        }
        // Token-based matching for multi-word disambiguation
        if (tokens.length > 0) {
            let matchedTokens = 0;
            let landmarkTokenHits = 0;
            for (const token of tokens) {
                if (name.includes(token) ||
                    nickname.includes(token) ||
                    landmark.includes(token) ||
                    phone.includes(token)) {
                    matchedTokens += 1;
                    if (landmark.includes(token)) {
                        landmarkTokenHits += 1;
                    }
                }
            }
            const tokenRatio = matchedTokens / tokens.length;
            if (tokenRatio > 0) {
                score = Math.max(score, 0.45 + tokenRatio * 0.4);
            }
            if (landmarkTokenHits > 0) {
                score = Math.max(score, Math.min(1.0, score + 0.1 * landmarkTokenHits));
            }
        }
        // Fuzzy match on name: up to 0.75
        const nameSimilarity = this.calculateSimilarity(q, customer.name);
        if (nameSimilarity > 0.6) {
            score = Math.max(score, nameSimilarity * 0.75);
        }
        // Fuzzy match on combined text for phrases like "bharat atm"
        if (q.length > 0) {
            const combinedSimilarity = this.calculateSimilarity(q, notesText);
            if (combinedSimilarity > 0.55) {
                score = Math.max(score, combinedSimilarity * 0.7);
            }
        }
        return Math.min(score, 1.0);
    }
    /**
     * Multi-customer resolution (handle multiple customers with similar names)
     */
    async resolveCustomerAmbiguity(query, conversationId) {
        core_2.logger.info({ conversationId, query }, '🤝 Resolving customer ambiguity');
        // Search for exact match
        const results = await this.searchCustomerRanked(query, conversationId);
        if (results.length === 0) {
            return {
                candidates: [],
                needsConfirmation: false,
            };
        }
        // If top result has high confidence, return it
        if (results[0].matchScore > 0.9) {
            core_2.logger.info({ conversationId, customerId: results[0].id }, '✅ Exact match found');
            return {
                exact: results[0],
                candidates: [],
                needsConfirmation: false,
            };
        }
        // Multiple candidates - find similar
        const similar = await this.findSimilarCustomers(query, conversationId, 0.65);
        core_2.logger.info({ conversationId, candidates: similar.length }, '🤔 Multiple candidates found');
        return {
            candidates: similar,
            needsConfirmation: similar.length > 1 || (similar.length === 1 && similar[0].similarity < 0.85),
        };
    }
    /**
     * Confirm customer selection and update context
     */
    async confirmCustomerSelection(customerId, conversationId, updateFields) {
        core_2.logger.info({ customerId, conversationId }, '✅ Customer confirmed');
        // Get customer
        const customer = await this.getCustomerById(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }
        // Apply updates if provided
        if (updateFields && Object.keys(updateFields).length > 0) {
            await this.updateCustomerInstant(customerId, updateFields, conversationId);
        }
        // Update context
        const context = this.getContext(conversationId);
        context.recentCustomers = [
            {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                nickname: Array.isArray(customer.nickname) ? (customer.nickname[0] ?? null) : customer.nickname,
                landmark: customer.landmark,
                balance: parseFloat(customer.balance.toString()),
                matchScore: 1.0,
            },
        ];
        context.activeCustomerId = customer.id;
        context.timestamp = Date.now();
        core_2.logger.info({ customerId, conversationId }, '🎯 Customer context set');
        return customer;
    }
    /**
     * Clear conversation cache and streams
     */
    clearConversationCache(conversationId) {
        const context = this.conversationCache.get(conversationId);
        if (context) {
            // Clear all stream subscriptions
            for (const interval of context.streamSubscriptions.values()) {
                clearInterval(interval);
            }
            this.conversationCache.delete(conversationId);
            core_2.logger.info({ conversationId }, '🧹 Conversation cache cleared');
        }
    }
    /**
     * Search customer by name, nickname, landmark, or phone
     */
    async searchCustomer(query) {
        try {
            const { normalized: searchLower, tokens } = this.parseQuery(query);
            // Search by exact phone match first
            if (/^\+?\d{10,15}$/.test(query.replace(/[\s-]/g, ''))) {
                const byPhone = await core_1.prisma.customer.findMany({
                    where: {
                        phone: {
                            contains: query.replace(/[\s-]/g, ''),
                        },
                    },
                    take: 5,
                });
                if (byPhone.length > 0) {
                    return byPhone.map((c) => ({
                        id: c.id,
                        name: c.name,
                        phone: c.phone,
                        email: c.email,
                        nickname: Array.isArray(c.nickname) ? (c.nickname[0] ?? null) : c.nickname,
                        landmark: c.landmark,
                        balance: parseFloat(c.balance.toString()),
                        matchScore: 1.0,
                    }));
                }
            }
            // Search by name, landmark, notes (nickname is String[] — use has for exact match)
            const customers = await core_1.prisma.customer.findMany({
                where: {
                    OR: [
                        { name: { contains: searchLower, mode: 'insensitive' } },
                        { nickname: { has: searchLower } },
                        { landmark: { contains: searchLower, mode: 'insensitive' } },
                        { notes: { contains: searchLower, mode: 'insensitive' } },
                        ...(tokens.length > 0
                            ? [
                                {
                                    AND: tokens.map((token) => ({
                                        OR: [
                                            { name: { contains: token, mode: 'insensitive' } },
                                            { nickname: { has: token } },
                                            { landmark: { contains: token, mode: 'insensitive' } },
                                            { notes: { contains: token, mode: 'insensitive' } },
                                        ],
                                    })),
                                },
                            ]
                            : []),
                    ],
                },
                take: 20,
            });
            // Calculate match scores
            const results = customers.map((c) => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                email: c.email,
                nickname: Array.isArray(c.nickname) ? (c.nickname[0] ?? null) : c.nickname,
                landmark: c.landmark,
                balance: parseFloat(c.balance.toString()),
                tags: c.tags,
                notes: c.notes,
                gstin: c.gstin,
                creditLimit: c.creditLimit ? parseFloat(c.creditLimit.toString()) : null,
                addressLine1: c.addressLine1 ?? undefined,
                addressLine2: c.addressLine2 ?? undefined,
                city: c.city ?? undefined,
                state: c.state ?? undefined,
                pincode: c.pincode ?? undefined,
                matchScore: this.calculateMatchScore(searchLower, {
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    nickname: Array.isArray(c.nickname) ? (c.nickname[0] ?? null) : c.nickname,
                    landmark: c.landmark,
                    balance: parseFloat(c.balance.toString()),
                    matchScore: 0,
                }),
            }));
            // Sort by match score
            return results
                .filter((r) => r.matchScore >= 0.3)
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, 10);
        }
        catch (error) {
            core_2.logger.error({ error, query }, 'Customer search failed');
            return [];
        }
    }
    /**
     * Get customer by ID
     */
    async getCustomerById(id) {
        const { tenantId } = core_3.tenantContext.get();
        return await core_1.prisma.customer.findFirst({
            where: { id, tenantId },
            include: {
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
                reminders: {
                    where: { status: client_1.ReminderStatus.pending },
                    orderBy: { scheduledTime: 'asc' },
                },
            },
        });
    }
    /**
     * Create new customer
     */
    async createCustomer(data) {
        try {
            // Validate required field
            if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
                throw new Error('Customer name is required and must be a non-empty string');
            }
            // Check for exact same-name customer (prevent duplicates)
            const existing = await core_1.prisma.customer.findMany({
                where: {
                    name: {
                        equals: data.name.trim(),
                        mode: 'insensitive',
                    },
                },
                select: { id: true, name: true },
                take: 1,
            });
            if (existing.length > 0) {
                core_2.logger.warn({ name: data.name, existingId: existing[0].id }, '🚫 Duplicate customer name - creation blocked');
                throw new Error(`Customer "${data.name}" already exists. Cannot create duplicate.`);
            }
            const customer = await core_1.prisma.customer.create({
                data: {
                    tenantId: core_3.tenantContext.get().tenantId,
                    name: data.name,
                    phone: data.phone,
                    nickname: data.nickname ? [data.nickname] : [],
                    landmark: data.landmark,
                    notes: data.notes,
                    balance: 0,
                    alternatePhone: [],
                    preferredPaymentMethod: [],
                    preferredDays: [],
                    tags: [],
                    commonPhrases: [],
                },
            });
            core_2.logger.info({ customerId: customer.id, name: customer.name }, 'Customer created');
            return customer;
        }
        catch (error) {
            core_2.logger.error({ error, data }, 'Customer creation failed');
            throw error;
        }
    }
    /**
     * Update customer balance
     */
    async updateBalance(customerId, amount) {
        try {
            if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
                throw new Error('Customer ID is required');
            }
            if (typeof amount !== 'number' || !isFinite(amount)) {
                throw new Error('Balance adjustment amount must be a finite number');
            }
            const customer = await core_1.prisma.customer.update({
                where: { id: customerId },
                data: {
                    balance: {
                        increment: amount,
                    },
                },
            });
            this.balanceCache.set(customerId, {
                balance: parseFloat(customer.balance.toString()),
                timestamp: Date.now(),
            });
            return customer;
        }
        catch (error) {
            core_2.logger.error({ error, customerId, amount }, 'Balance update failed');
            throw error;
        }
    }
    /**
     * Get customer balance
     */
    async getBalance(customerId) {
        const customer = await core_1.prisma.customer.findUnique({
            where: { id: customerId },
            select: { balance: true },
        });
        return customer ? parseFloat(customer.balance.toString()) : 0;
    }
    /**
     * Calculate balance from invoices minus payments (replaces old ledgerEntry approach)
     */
    async calculateBalanceFromLedger(customerId) {
        const [invoiceAgg, paymentAgg] = await Promise.all([
            core_1.prisma.invoice.aggregate({
                where: { customerId, status: { not: 'cancelled' } },
                _sum: { total: true },
            }),
            core_1.prisma.payment.aggregate({
                where: { customerId, status: 'completed' },
                _sum: { amount: true },
            }),
        ]);
        const totalInvoiced = parseFloat(invoiceAgg._sum.total?.toString() || '0');
        const totalPaid = parseFloat(paymentAgg._sum.amount?.toString() || '0');
        return totalInvoiced - totalPaid;
    }
    /**
     * Sync balance with calculated value from invoices/payments
     */
    async syncBalance(customerId) {
        const calculatedBalance = await this.calculateBalanceFromLedger(customerId);
        await core_1.prisma.customer.update({
            where: { id: customerId },
            data: { balance: new library_1.Decimal(calculatedBalance) },
        });
        return calculatedBalance;
    }
    /**
     * Delete customer and all related data atomically
     * Cascades: WhatsApp messages → Conversation recordings → Reminders → Invoices → Ledger entries → Customer
     */
    /**
     * Delete customer and all related data atomically
     * Cascades: Conversation recordings → Reminders → Invoices → Ledger entries → Customer
     */
    async deleteCustomerAndAllData(customerId) {
        try {
            const result = await core_1.prisma.$transaction(async (tx) => {
                // Step 1: Delete message logs linked to customer's reminders
                const reminders = await tx.reminder.findMany({
                    where: { customerId },
                    select: { id: true },
                });
                let messageLogsDeleted = 0;
                if (reminders.length > 0) {
                    const reminderIds = reminders.map((r) => r.id);
                    const msgDelete = await tx.messageLog.deleteMany({
                        where: { reminderId: { in: reminderIds } },
                    });
                    messageLogsDeleted = msgDelete.count;
                }
                // Also delete message logs directly linked to customer
                const directMsgDelete = await tx.messageLog.deleteMany({
                    where: { customerId },
                });
                messageLogsDeleted += directMsgDelete.count;
                // Step 2: Delete reminders
                const remindersDeleted = await tx.reminder.deleteMany({
                    where: { customerId },
                });
                // Step 3: Delete invoice items then invoices
                const invoices = await tx.invoice.findMany({
                    where: { customerId },
                    select: { id: true },
                });
                let invoiceItemsDeleted = 0;
                if (invoices.length > 0) {
                    const invoiceIds = invoices.map((i) => i.id);
                    const itemsDelete = await tx.invoiceItem.deleteMany({
                        where: { invoiceId: { in: invoiceIds } },
                    });
                    invoiceItemsDeleted = itemsDelete.count;
                }
                const invoicesDeleted = await tx.invoice.deleteMany({
                    where: { customerId },
                });
                // Step 4: Delete payments
                const paymentsDeleted = await tx.payment.deleteMany({
                    where: { customerId },
                });
                // Step 5: Delete customer
                const customerDeleted = await tx.customer.deleteMany({
                    where: { id: customerId },
                });
                return {
                    invoices: invoicesDeleted.count,
                    payments: paymentsDeleted.count,
                    reminders: remindersDeleted.count,
                    messageLogs: messageLogsDeleted,
                    invoiceItems: invoiceItemsDeleted,
                    customer: customerDeleted.count,
                };
            });
            return {
                success: true,
                deletedRecords: result,
            };
        }
        catch (error) {
            core_2.logger.error({ customerId, error: error.message }, 'Failed to delete customer and all related data');
            return {
                success: false,
                error: error.message,
                deletedRecords: {
                    invoices: 0,
                    payments: 0,
                    reminders: 0,
                    messageLogs: 0,
                    invoiceItems: 0,
                    customer: 0,
                },
            };
        }
    }
    // ---------------------------------------------------------------------------
    // Profile update (REST PATCH endpoint)
    // ---------------------------------------------------------------------------
    /**
     * Full profile update — name, phone, email, nickname, landmark, creditLimit, tags.
     * Called from PATCH /api/v1/customers/:id
     */
    async updateProfile(id, data) {
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name.trim();
        if (data.phone !== undefined)
            updateData.phone = data.phone || null;
        if (data.email !== undefined)
            updateData.email = data.email || null;
        if (data.nickname !== undefined)
            updateData.nickname = data.nickname ? [data.nickname] : [];
        if (data.landmark !== undefined)
            updateData.landmark = data.landmark || null;
        if (data.tags !== undefined)
            updateData.tags = data.tags;
        if (data.creditLimit !== undefined)
            updateData.creditLimit = new library_1.Decimal(data.creditLimit);
        if (data.notes !== undefined)
            updateData.notes = data.notes || null;
        if (Object.keys(updateData).length === 0)
            throw new Error('No fields to update');
        const updated = await core_1.prisma.customer.update({
            where: { id },
            data: updateData,
        });
        this.balanceCache.delete(id);
        core_2.logger.info({ customerId: id, fields: Object.keys(updateData) }, 'Customer profile updated');
        return updated;
    }
    // ---------------------------------------------------------------------------
    // Communication preferences
    // ---------------------------------------------------------------------------
    async getCommPrefs(customerId) {
        return core_1.prisma.customerCommunicationPrefs.findUnique({
            where: { customerId },
        });
    }
    async upsertCommPrefs(customerId, data) {
        const customer = await core_1.prisma.customer.findUnique({
            where: { id: customerId },
            select: { tenantId: true },
        });
        if (!customer)
            throw new Error('Customer not found');
        const upserted = await core_1.prisma.customerCommunicationPrefs.upsert({
            where: { customerId },
            create: {
                tenantId: customer.tenantId,
                customerId,
                ...data,
            },
            update: data,
        });
        core_2.logger.info({ customerId, fields: Object.keys(data) }, 'CommPrefs upserted');
        return upserted;
    }
}
exports.customerService = new CustomerService();
//# sourceMappingURL=customer.service.js.map