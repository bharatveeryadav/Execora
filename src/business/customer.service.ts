import { prisma } from '../lib/database';
import { logger } from '../lib/logger';
import { CustomerSearchResult } from '../types';
import { Decimal } from '@prisma/client/runtime/library';

interface ConversationContext {
  recentCustomers: CustomerSearchResult[];
  lastSearch: string;
  timestamp: number;
  streamSubscriptions: Map<string, NodeJS.Timeout>;
  activeCustomerId?: string;
}

interface CustomerUpdateData {
  name?: string;
  phone?: string;
  nickname?: string;
  landmark?: string;
  notes?: string;
  balance?: number;
}

interface SimilarCustomer {
  customer: CustomerSearchResult;
  similarity: number; // 0-1 score
}

interface CreateCustomerFastResult {
  success: boolean;
  duplicateFound?: boolean;
  customer?: {
    id: string;
    name: string;
    balance: number;
  };
  message: string;
  suggestions?: Array<{
    id: string;
    name: string;
    phone?: string | null;
    landmark?: string | null;
    similarity: number;
  }>;
}

class CustomerService {
  private conversationCache: Map<string, ConversationContext> = new Map();
  private balanceCache: Map<string, { balance: number; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private balanceCacheTimeout = 30 * 1000; // 30 seconds for balance
  private cleanupInterval: NodeJS.Timeout;

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
  private cleanupExpiredCache() {
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
      logger.info({ cleaned }, 'Cleaned expired conversation cache entries');
    }
  }

  /**
   * Get or create conversation context
   */
  private getContext(conversationId: string): ConversationContext {
    if (!this.conversationCache.has(conversationId)) {
      this.conversationCache.set(conversationId, {
        recentCustomers: [],
        lastSearch: '',
        timestamp: Date.now(),
        streamSubscriptions: new Map(),
        activeCustomerId: undefined,
      });
    }
    return this.conversationCache.get(conversationId)!;
  }

  /**
   * Set active customer for a conversation (focus memory)
   */
  setActiveCustomer(conversationId: string, customerId: string) {
    const context = this.getContext(conversationId);
    context.activeCustomerId = customerId;
    context.timestamp = Date.now();
  }

  /**
   * Get active customer for a conversation
   */
  async getActiveCustomer(conversationId: string): Promise<CustomerSearchResult | null> {
    const context = this.conversationCache.get(conversationId);

    if (!context?.activeCustomerId) {
      return null;
    }

    const cached = context.recentCustomers.find((c) => c.id === context.activeCustomerId);
    if (cached) {
      return cached;
    }

    const customer = await prisma.customer.findUnique({
      where: { id: context.activeCustomerId },
      select: {
        id: true,
        name: true,
        phone: true,
        nickname: true,
        landmark: true,
        balance: true,
      },
    });

    if (!customer) {
      context.activeCustomerId = undefined;
      return null;
    }

    const result: CustomerSearchResult = {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      nickname: customer.nickname,
      landmark: customer.landmark,
      balance: parseFloat(customer.balance.toString()),
      matchScore: 1.0,
    };

    context.recentCustomers = [result, ...context.recentCustomers.filter((c) => c.id !== result.id)].slice(0, 10);
    context.timestamp = Date.now();

    return result;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  /**
   * Search customer with conversation context (Fast!)
   */
  async searchCustomerWithContext(
    query: string,
    conversationId: string
  ): Promise<CustomerSearchResult[]> {
    const context = this.getContext(conversationId);

    // Try to find in cache first
    if (this.isCacheValid(context.timestamp) && context.recentCustomers.length > 0) {
      const cachedResults = context.recentCustomers.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.nickname?.toLowerCase().includes(query.toLowerCase()) ||
        c.phone?.includes(query)
      );

      if (cachedResults.length > 0) {
        logger.info(
          { conversationId, cacheHits: cachedResults.length },
          '⚡ Customer search from cache'
        );
        return cachedResults;
      }
    }

    // Cache miss - search database
    logger.info({ conversationId, query }, '🔍 Customer search from database');
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
  async getMultipleCustomersWithContext(
    customerIds: string[],
    conversationId: string
  ) {
    const context = this.getContext(conversationId);

    logger.info({ conversationId, count: customerIds.length }, '📦 Batch customer fetch');

    // Fetch all in parallel
    const customers = await Promise.all(
      customerIds.map((id) => this.getCustomerById(id))
    );

    // Update cache with results
    const searchResults: CustomerSearchResult[] = customers
      .filter(Boolean)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        nickname: c.nickname,
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
  async streamCustomerBalance(
    customerId: string,
    conversationId: string,
    onUpdate: (data: { balance: number; updatedAt: string }) => void
  ): Promise<() => void> {
    const context = this.getContext(conversationId);

    // Get initial balance
    const initialBalance = await this.getBalance(customerId);
    onUpdate({ balance: initialBalance, updatedAt: new Date().toISOString() });

    logger.info({ customerId, conversationId }, '🔄 Starting real-time balance stream');

    // Poll for balance changes every 1 second
    const streamId = `balance_${customerId}`;
    const interval = setInterval(async () => {
      try {
        const latestBalance = await this.getBalance(customerId);
        onUpdate({
          balance: latestBalance,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        logger.error({ error, customerId }, 'Balance stream error');
      }
    }, 1000);

    // Store subscription for cleanup
    context.streamSubscriptions.set(streamId, interval);

    // Return unsubscribe function
    return () => {
      clearInterval(interval);
      context.streamSubscriptions.delete(streamId);
      logger.info({ customerId, conversationId }, '🛑 Balance stream stopped');
    };
  }

  /**
   * Prefetch customer data and related records
   */
  async prefetchConversationContext(
    conversationId: string,
    latestCustomerId?: string
  ) {
    const context = this.getContext(conversationId);

    if (!latestCustomerId) return;

    logger.info({ conversationId, customerId: latestCustomerId }, '📥 Prefetching conversation context');

    try {
      // Fetch main customer
      const customer = await this.getCustomerById(latestCustomerId);

      // Fetch related customers (same landmark or recent invoices)
      const relatedCustomers = await prisma.customer.findMany({
        where: {
          OR: [
            { landmark: { equals: customer?.landmark || '' } },
            { phone: { not: null } },
          ],
        },
        take: 10,
        select: {
          id: true,
          name: true,
          phone: true,
          nickname: true,
          landmark: true,
          balance: true,
        },
      });

      // Convert to search results
      const searchResults: CustomerSearchResult[] = relatedCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        nickname: c.nickname,
        landmark: c.landmark,
        balance: parseFloat(c.balance.toString()),
        matchScore: 0.7,
      }));

      context.recentCustomers = searchResults;
      context.timestamp = Date.now();

      logger.info({ conversationId, prefetched: searchResults.length }, '✅ Context prefetched');
    } catch (error) {
      logger.error({ error, conversationId }, 'Prefetch failed');
    }
  }

  /**
   * Calculate similarity between two strings (Levenshtein distance)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.getLevenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private getLevenshteinDistance(s1: string, s2: string): number {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  /**
   * Find similar customers (for duplicate detection and suggestions)
   */
  async findSimilarCustomers(
    name: string,
    conversationId: string,
    threshold: number = 0.7
  ): Promise<SimilarCustomer[]> {
    const context = this.getContext(conversationId);

    logger.info({ conversationId, name, threshold }, '🔎 Searching for similar customers');

    // Search in cache first
    const cachedSimilar = context.recentCustomers
      .map((c) => ({
        customer: c,
        similarity: this.calculateSimilarity(name, c.name),
      }))
      .filter((result) => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);

    if (cachedSimilar.length > 0) {
      logger.info(
        { conversationId, found: cachedSimilar.length, from: 'cache' },
        '⚡ Similar customers found in cache'
      );
      return cachedSimilar;
    }

    // Search in database
    const allCustomers = await prisma.customer.findMany({
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

    const similar: SimilarCustomer[] = allCustomers
      .map((c) => ({
        customer: {
          id: c.id,
          name: c.name,
          phone: c.phone,
          nickname: c.nickname,
          landmark: c.landmark,
          balance: parseFloat(c.balance.toString()),
          matchScore: this.calculateSimilarity(name, c.name),
        },
        similarity: this.calculateSimilarity(name, c.name),
      }))
      .filter((result) => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    logger.info(
      { conversationId, found: similar.length, from: 'database' },
      '🔍 Similar customers found in database'
    );

    // Update cache with new findings
    context.recentCustomers = similar.map((s) => s.customer);
    context.timestamp = Date.now();

    return similar;
  }

  /**
   * Create customer with minimal info (name only, everything else optional for instant feedback)
   */
  async createCustomerFast(name: string, conversationId: string): Promise<CreateCustomerFastResult> {
    try {
      logger.info({ conversationId, name }, '⚡ Creating customer with name only');

      // Check for similar customers first
      const similar = await this.findSimilarCustomers(name, conversationId, 0.85);

      if (similar.length > 0) {
        logger.info(
          { conversationId, duplicates: similar.length },
          '⚠️ Similar customers found - user should confirm'
        );
        return {
          success: false,
          duplicateFound: true,
          suggestions: similar.map((s) => ({
            id: s.customer.id,
            name: s.customer.name,
            phone: s.customer.phone,
            landmark: s.customer.landmark,
            similarity: s.similarity,
          })),
          message: `Found ${similar.length} similar customer(s). Please confirm if any match?`,
        };
      }

      // Create customer with only name
      const customer = await prisma.customer.create({
        data: {
          name: name.trim(),
          balance: 0,
        },
      });

      logger.info({ customerId: customer.id, name: customer.name }, '✅ Customer created instantly');

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
    } catch (error) {
      logger.error({ error, name, conversationId }, 'Fast customer creation failed');
      throw error;
    }
  }

  /**
   * Instant update customer fields (one or multiple)
   */
  async updateCustomerInstant(
    customerId: string,
    updates: CustomerUpdateData,
    conversationId: string
  ) {
    try {
      logger.info({ customerId, updates, conversationId }, '⚡ Instant customer update');

      const updateData: any = {};

      // Add only provided fields
      if (updates.name !== undefined) updateData.name = updates.name.trim();
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.nickname !== undefined) updateData.nickname = updates.nickname;
      if (updates.landmark !== undefined) updateData.landmark = updates.landmark;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.balance !== undefined) {
        updateData.balance = new Decimal(updates.balance);
      }

      const updated = await prisma.customer.update({
        where: { id: customerId },
        data: updateData,
      });

      logger.info({ customerId, fields: Object.keys(updates) }, '✅ Customer updated');

      // Clear cache for this customer
      const context = this.getContext(conversationId);
      context.recentCustomers = context.recentCustomers.map((c) =>
        c.id === customerId ? { ...c, ...updates } : c
      );

      // Clear balance cache
      this.balanceCache.delete(customerId);

      return {
        success: true,
        customer: updated,
        message: `✅ Updated: ${Object.keys(updates).join(', ')}`,
      };
    } catch (error) {
      logger.error({ error, customerId }, 'Instant update failed');
      throw error;
    }
  }

  /**
   * Get balance with fast cache (30-second TTL for real-time)
   */
  async getBalanceFast(customerId: string, conversationId?: string): Promise<number> {
    // Check fast cache first
    const cached = this.balanceCache.get(customerId);
    if (cached && Date.now() - cached.timestamp < this.balanceCacheTimeout) {
      logger.debug({ customerId }, '⚡ Balance from fast cache');
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
      logger.info({ customerId, conversationId, balance }, '💰 Balance retrieved and cached');
    }

    return balance;
  }

  /**
   * Search with rank-based scoring system
   */
  async searchCustomerRanked(
    query: string,
    conversationId: string
  ): Promise<CustomerSearchResult[]> {
    logger.info({ conversationId, query }, '🔍 Ranked customer search');

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
        logger.info({ conversationId, found: cached.length, from: 'cache' }, '⚡ Ranked search from cache');
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

    logger.info({ conversationId, found: ranked.length }, '🎯 Ranked search results');
    return ranked;
  }

  /**
   * Advanced match score calculation (0-1)
   */
  private calculateMatchScore(query: string, customer: CustomerSearchResult): number {
    const q = query.toLowerCase().trim();
    let score = 0;

    // Exact name match: 1.0
    if (customer.name.toLowerCase() === q) return 1.0;

    // Name contains query: 0.8 + similarity bonus
    if (customer.name.toLowerCase().includes(q)) {
      score = Math.max(score, 0.8 + this.calculateSimilarity(q, customer.name) * 0.1);
    }

    // Exact nickname match: 0.9
    if (customer.nickname?.toLowerCase() === q) return 0.9;

    // Nickname contains query: 0.7
    if (customer.nickname?.toLowerCase().includes(q)) {
      score = Math.max(score, 0.7 + this.calculateSimilarity(q, customer.nickname) * 0.1);
    }

    // Landmark match: 0.6
    if (customer.landmark?.toLowerCase().includes(q)) {
      score = Math.max(score, 0.6);
    }

    // Phone match: 0.95
    if (customer.phone?.includes(q)) {
      score = Math.max(score, 0.95);
    }

    // Fuzzy match on name: up to 0.75
    const nameSimilarity = this.calculateSimilarity(q, customer.name);
    if (nameSimilarity > 0.6) {
      score = Math.max(score, nameSimilarity * 0.75);
    }

    return Math.min(score, 1.0);
  }

  /**
   * Multi-customer resolution (handle multiple customers with similar names)
   */
  async resolveCustomerAmbiguity(
    query: string,
    conversationId: string
  ): Promise<{
    exact?: CustomerSearchResult;
    candidates: SimilarCustomer[];
    needsConfirmation: boolean;
  }> {
    logger.info({ conversationId, query }, '🤝 Resolving customer ambiguity');

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
      logger.info({ conversationId, customerId: results[0].id }, '✅ Exact match found');
      return {
        exact: results[0],
        candidates: [],
        needsConfirmation: false,
      };
    }

    // Multiple candidates - find similar
    const similar = await this.findSimilarCustomers(query, conversationId, 0.65);

    logger.info(
      { conversationId, candidates: similar.length },
      '🤔 Multiple candidates found'
    );

    return {
      candidates: similar,
      needsConfirmation: similar.length > 1 || (similar.length === 1 && similar[0].similarity < 0.85),
    };
  }

  /**
   * Confirm customer selection and update context
   */
  async confirmCustomerSelection(
    customerId: string,
    conversationId: string,
    updateFields?: CustomerUpdateData
  ) {
    logger.info({ customerId, conversationId }, '✅ Customer confirmed');

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
        nickname: customer.nickname,
        landmark: customer.landmark,
        balance: parseFloat(customer.balance.toString()),
        matchScore: 1.0,
      },
    ];
    context.activeCustomerId = customer.id;
    context.timestamp = Date.now();

    logger.info({ customerId, conversationId }, '🎯 Customer context set');

    return customer;
  }

  /**
   * Clear conversation cache and streams
   */
  clearConversationCache(conversationId: string) {
    const context = this.conversationCache.get(conversationId);

    if (context) {
      // Clear all stream subscriptions
      for (const interval of context.streamSubscriptions.values()) {
        clearInterval(interval);
      }
      this.conversationCache.delete(conversationId);
      logger.info({ conversationId }, '🧹 Conversation cache cleared');
    }
  }

  /**
   * Search customer by name, nickname, landmark, or phone
   */
  async searchCustomer(query: string): Promise<CustomerSearchResult[]> {
    try {
      // Search by exact phone match first
      if (/^\+?\d{10,15}$/.test(query.replace(/[\s-]/g, ''))) {
        const byPhone = await prisma.customer.findMany({
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
            nickname: c.nickname,
            landmark: c.landmark,
            balance: parseFloat(c.balance.toString()),
            matchScore: 1.0,
          }));
        }
      }

      // Search by name, nickname, landmark using ILIKE
      const searchLower = query.toLowerCase();
      const customers = await prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: searchLower, mode: 'insensitive' } },
            { nickname: { contains: searchLower, mode: 'insensitive' } },
            { landmark: { contains: searchLower, mode: 'insensitive' } },
            { notes: { contains: searchLower, mode: 'insensitive' } },
          ],
        },
        take: 10,
      });

      // Calculate match scores
      const results: CustomerSearchResult[] = customers.map((c) => {
        let score = 0;

        // Exact name match
        if (c.name.toLowerCase() === searchLower) score += 1.0;
        else if (c.name.toLowerCase().includes(searchLower)) score += 0.7;

        // Nickname match
        if (c.nickname?.toLowerCase() === searchLower) score += 0.9;
        else if (c.nickname?.toLowerCase().includes(searchLower)) score += 0.6;

        // Landmark match
        if (c.landmark?.toLowerCase().includes(searchLower)) score += 0.5;

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          nickname: c.nickname,
          landmark: c.landmark,
          balance: parseFloat(c.balance.toString()),
          matchScore: Math.min(score, 1.0),
        };
      });

      // Sort by match score
      return results.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      logger.error({ error, query }, 'Customer search failed');
      return [];
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(id: string) {
    return await prisma.customer.findUnique({
      where: { id },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        reminders: {
          where: { status: 'SCHEDULED' },
          orderBy: { sendAt: 'asc' },
        },
      },
    });
  }

  /**
   * Create new customer
   */
  async createCustomer(data: {
    name: string;
    phone?: string;
    nickname?: string;
    landmark?: string;
    notes?: string;
  }) {
    try {
      const customer = await prisma.customer.create({
        data: {
          name: data.name,
          phone: data.phone,
          nickname: data.nickname,
          landmark: data.landmark,
          notes: data.notes,
          balance: 0,
        },
      });

      logger.info({ customerId: customer.id, name: customer.name }, 'Customer created');
      return customer;
    } catch (error) {
      logger.error({ error, data }, 'Customer creation failed');
      throw error;
    }
  }

  /**
   * Update customer balance
   */
  async updateBalance(customerId: string, amount: number) {
    try {
      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      return customer;
    } catch (error) {
      logger.error({ error, customerId, amount }, 'Balance update failed');
      throw error;
    }
  }

  /**
   * Get customer balance
   */
  async getBalance(customerId: string): Promise<number> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { balance: true },
    });

    return customer ? parseFloat(customer.balance.toString()) : 0;
  }

  /**
   * Calculate balance from ledger entries
   */
  async calculateBalanceFromLedger(customerId: string): Promise<number> {
    const entries = await prisma.ledgerEntry.findMany({
      where: { customerId },
      select: { type: true, amount: true },
    });

    let balance = 0;
    for (const entry of entries) {
      const amount = parseFloat(entry.amount.toString());
      if (entry.type === 'DEBIT' || entry.type === 'OPENING_BALANCE') {
        balance += amount;
      } else if (entry.type === 'CREDIT') {
        balance -= amount;
      }
    }

    return balance;
  }

  /**
   * Sync balance with ledger
   */
  async syncBalance(customerId: string) {
    const calculatedBalance = await this.calculateBalanceFromLedger(customerId);

    await prisma.customer.update({
      where: { id: customerId },
      data: { balance: new Decimal(calculatedBalance) },
    });

    return calculatedBalance;
  }
}

export const customerService = new CustomerService();

export { CreateCustomerFastResult };
