import { logger } from '../lib/logger';
import { matchIndianName, findBestMatch, isSamePerson } from '../lib/indian-fuzzy-match';

interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    intent?: string;
    entities?: Record<string, any>;
}

interface CustomerContext {
    id: string;
    name: string;
    lastMentioned: Date;
    mentionCount: number;
    latestBalance?: number;
    latestAmount?: number;
    latestIntent?: string;
}

interface ConversationMemory {
    conversationId: string;
    messages: ConversationMessage[];
    context: Record<string, any>;
    lastActivity: Date;
    activeCustomer?: {
        id: string;
        name: string;
    };
    // Multi-customer context tracking
    customerHistory: CustomerContext[]; // Stack of customers discussed
    recentCustomers: Map<string, CustomerContext>; // Quick lookup by name
}

class ConversationMemoryService {
    private memory: Map<string, ConversationMemory> = new Map();
    private memoryTimeout = 30 * 60 * 1000; // 30 minutes
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        // Cleanup expired conversations every 10 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredMemory();
        }, 10 * 60 * 1000);
    }

    /**
     * Get or create conversation memory
     */
    private getMemory(conversationId: string): ConversationMemory {
        if (!this.memory.has(conversationId)) {
            this.memory.set(conversationId, {
                conversationId,
                messages: [],
                context: {},
                lastActivity: new Date(),
                customerHistory: [],
                recentCustomers: new Map(),
            });
        }

        const mem = this.memory.get(conversationId)!;
        mem.lastActivity = new Date();
        return mem;
    }

    /**
     * Add user message to conversation history
     */
    addUserMessage(
        conversationId: string,
        message: string,
        intent?: string,
        entities?: Record<string, any>
    ) {
        const memory = this.getMemory(conversationId);
        memory.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date(),
            intent,
            entities,
        });

        // Auto-track customer if mentioned in entities
        if (entities?.customer && typeof entities.customer === 'string') {
            const customerId = entities.customerId || `temp_${entities.customer}`;
            this.trackCustomerMention(conversationId, customerId, entities.customer);
        }

        // Auto-update customer context with amounts/balance
        if (entities?.customer && entities?.amount) {
            this.updateCustomerContext(conversationId, entities.customer, {
                amount: entities.amount,
                intent: intent,
            });
        }

        // Keep last 20 messages only
        if (memory.messages.length > 20) {
            memory.messages = memory.messages.slice(-20);
        }

        logger.debug({ conversationId, messageCount: memory.messages.length }, 'User message added to memory');
    }

    /**
     * Add assistant response to conversation history
     */
    addAssistantMessage(conversationId: string, message: string) {
        const memory = this.getMemory(conversationId);
        memory.messages.push({
            role: 'assistant',
            content: message,
            timestamp: new Date(),
        });

        // Keep last 20 messages only
        if (memory.messages.length > 20) {
            memory.messages = memory.messages.slice(-20);
        }

        logger.debug({ conversationId, messageCount: memory.messages.length }, 'Assistant message added to memory');
    }

    /**
     * Get conversation history (last N messages)
     */
    getConversationHistory(conversationId: string, limit: number = 10): ConversationMessage[] {
        const memory = this.memory.get(conversationId);
        if (!memory) return [];

        return memory.messages.slice(-limit);
    }

    /**
     * Get formatted conversation context for OpenAI
     */
    getFormattedContext(conversationId: string, limit: number = 6): string {
        const history = this.getConversationHistory(conversationId, limit);
        if (history.length === 0) return '';

        const formatted = history
            .map((msg) => {
                if (msg.role === 'user') {
                    return `User: ${msg.content}${msg.intent ? ` [Intent: ${msg.intent}]` : ''}`;
                } else {
                    return `Assistant: ${msg.content}`;
                }
            })
            .join('\n');

        // Add context summary for multi-customer awareness
        const contextSummary = this.getContextSummary(conversationId);

        return `\n\nPrevious conversation:\n${formatted}${contextSummary}\n`;
    }

    /**
     * Set active customer in conversation context
     */
    setActiveCustomer(conversationId: string, customerId: string, customerName: string) {
        const memory = this.getMemory(conversationId);
        memory.activeCustomer = { id: customerId, name: customerName };
        memory.context.activeCustomerId = customerId;
        memory.context.activeCustomerName = customerName;

        // Track in customer history
        this.trackCustomerMention(conversationId, customerId, customerName);

        logger.info({ conversationId, customerId, customerName }, 'Active customer set in conversation memory');
    }

    /**
     * Track customer mention in history (with fuzzy duplicate detection)
     */
    private trackCustomerMention(conversationId: string, customerId: string, customerName: string) {
        const memory = this.getMemory(conversationId);

        // Check if this customer already exists (exact or fuzzy match)
        const existingCustomer = this.findExistingCustomer(memory, customerName);

        if (existingCustomer) {
            // Update existing customer record
            existingCustomer.lastMentioned = new Date();
            existingCustomer.mentionCount++;
            
            // Move to top of history
            memory.customerHistory = memory.customerHistory.filter(c => c.name !== existingCustomer.name);
            memory.customerHistory.push(existingCustomer);
            
            logger.debug({ conversationId, customerName, existingName: existingCustomer.name }, 'Updated existing customer record');
        } else {
            // Create new customer record
            const customer: CustomerContext = {
                id: customerId,
                name: customerName,
                lastMentioned: new Date(),
                mentionCount: 1,
            };
            memory.recentCustomers.set(customerName.toLowerCase(), customer);
            memory.customerHistory.push(customer);
            
            logger.debug({ conversationId, customerName }, 'Created new customer record');
        }

        // Keep only last 10 customers in history
        if (memory.customerHistory.length > 10) {
            const removed = memory.customerHistory.shift();
            if (removed) {
                memory.recentCustomers.delete(removed.name.toLowerCase());
            }
        }

        logger.debug({ conversationId, customerName, historyLength: memory.customerHistory.length }, 'Customer tracked in history');
    }

    /**
     * Find existing customer using fuzzy matching
     */
    private findExistingCustomer(memory: ConversationMemory, customerName: string): CustomerContext | null {
        // Try exact match first
        const exactMatch = memory.recentCustomers.get(customerName.toLowerCase());
        if (exactMatch) return exactMatch;

        // Try fuzzy matching against all existing customers
        const candidates = Array.from(memory.recentCustomers.values());
        for (const candidate of candidates) {
            if (isSamePerson(customerName, candidate.name)) {
                logger.debug({ query: customerName, matched: candidate.name }, 'Found existing customer via fuzzy match');
                return candidate;
            }
        }

        return null;
    }

    /**
     * Switch to previous customer in conversation
     */
    switchToPreviousCustomer(conversationId: string): { id: string; name: string } | null {
        const memory = this.memory.get(conversationId);
        if (!memory || memory.customerHistory.length < 2) {
            return null;
        }

        // Get second-to-last customer (last is current)
        const previousCustomer = memory.customerHistory[memory.customerHistory.length - 2];

        // Set as active
        memory.activeCustomer = { id: previousCustomer.id, name: previousCustomer.name };
        memory.context.activeCustomerId = previousCustomer.id;
        memory.context.activeCustomerName = previousCustomer.name;

        logger.info({ conversationId, customerName: previousCustomer.name }, 'Switched to previous customer');
        return previousCustomer;
    }

    /**
     * Get all customers mentioned in conversation
     */
    getAllCustomersInContext(conversationId: string): CustomerContext[] {
        const memory = this.memory.get(conversationId);
        if (!memory) return [];

        // Return customers sorted by last mentioned (most recent first)
        return [...memory.customerHistory].reverse();
    }

    /**
     * Switch to specific customer by name (advanced fuzzy match)
     */
    switchToCustomerByName(conversationId: string, customerName: string): { id: string; name: string } | null {
        const memory = this.memory.get(conversationId);
        if (!memory) return null;

        const lowerName = customerName.toLowerCase();

        // Try exact match first
        let customer = memory.recentCustomers.get(lowerName);

        // If not found, try advanced Indian name fuzzy matching
        if (!customer) {
            const candidates = Array.from(memory.recentCustomers.values());
            const candidateNames = candidates.map(c => c.name);
            
            // Use advanced fuzzy matching with 0.7 threshold
            const bestMatch = findBestMatch(customerName, candidateNames, 0.7);
            
            if (bestMatch) {
                customer = candidates.find(c => c.name === bestMatch.matched);
                logger.info(
                    { conversationId, query: customerName, matched: bestMatch.matched, score: bestMatch.score, type: bestMatch.matchType },
                    'Fuzzy matched customer name'
                );
            }
        }

        if (customer) {
            memory.activeCustomer = { id: customer.id, name: customer.name };
            memory.context.activeCustomerId = customer.id;
            memory.context.activeCustomerName = customer.name;

            // Move to top of history
            memory.customerHistory = memory.customerHistory.filter(c => c.name !== customer!.name);
            memory.customerHistory.push(customer);

            logger.info({ conversationId, customerName: customer.name }, 'Switched to customer by name');
            return customer;
        }

        return null;
    }

    /**
     * Find all matching customers with scores (for "did you mean" suggestions)
     */
    findMatchingCustomers(conversationId: string, customerName: string, threshold: number = 0.7) {
        const memory = this.memory.get(conversationId);
        if (!memory) return [];

        const candidates = Array.from(memory.recentCustomers.values());
        const candidateNames = candidates.map(c => c.name);
        
        const matches = candidateNames
            .map(name => {
                const match = matchIndianName(customerName, name, threshold);
                return match ? { ...match, customer: candidates.find(c => c.name === name)! } : null;
            })
            .filter((m): m is NonNullable<typeof m> => m !== null)
            .sort((a, b) => b.score - a.score);

        return matches;
    }

    /**
     * Update customer context with additional data
     */
    updateCustomerContext(
        conversationId: string,
        customerName: string,
        updates: { balance?: number; amount?: number; intent?: string }
    ) {
        const memory = this.getMemory(conversationId);
        const customer = memory.recentCustomers.get(customerName.toLowerCase());

        if (customer) {
            if (updates.balance !== undefined) customer.latestBalance = updates.balance;
            if (updates.amount !== undefined) customer.latestAmount = updates.amount;
            if (updates.intent !== undefined) customer.latestIntent = updates.intent;

            customer.lastMentioned = new Date();
        }
    }

    /**
     * Get context summary for multi-customer awareness
     */
    getContextSummary(conversationId: string): string {
        const memory = this.memory.get(conversationId);
        if (!memory || memory.customerHistory.length === 0) return '';

        const recentCustomers = memory.customerHistory.slice(-3).reverse();

        let summary = '\n\nRecent customers in this conversation:\n';
        for (const customer of recentCustomers) {
            summary += `- ${customer.name}`;
            if (customer.latestBalance !== undefined) {
                summary += ` (balance: ${customer.latestBalance})`;
            }
            if (customer.latestAmount !== undefined) {
                summary += ` (amount: ${customer.latestAmount})`;
            }
            if (memory.activeCustomer?.name === customer.name) {
                summary += ' [CURRENT]';
            }
            summary += '\n';
        }

        return summary;
    }

    /**
     * Get active customer from conversation context
     */
    getActiveCustomer(conversationId: string): { id: string; name: string } | undefined {
        const memory = this.memory.get(conversationId);
        return memory?.activeCustomer;
    }

    /**
     * Set custom context value
     */
    setContext(conversationId: string, key: string, value: any) {
        const memory = this.getMemory(conversationId);
        memory.context[key] = value;
    }

    /**
     * Get custom context value
     */
    getContext(conversationId: string, key: string): any {
        const memory = this.memory.get(conversationId);
        return memory?.context[key];
    }

    /**
     * Get full context object
     */
    getFullContext(conversationId: string): Record<string, any> {
        const memory = this.memory.get(conversationId);
        return memory?.context || {};
    }

    /**
     * Clear conversation memory
     */
    clearMemory(conversationId: string) {
        this.memory.delete(conversationId);
        logger.info({ conversationId }, 'Conversation memory cleared');
    }

    /**
     * Cleanup expired conversation memory
     */
    private cleanupExpiredMemory() {
        const now = Date.now();
        let cleaned = 0;

        for (const [conversationId, memory] of this.memory.entries()) {
            if (now - memory.lastActivity.getTime() > this.memoryTimeout) {
                this.memory.delete(conversationId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.info({ cleaned }, 'Cleaned expired conversation memory');
        }
    }

    /**
     * Get memory stats
     */
    getStats() {
        return {
            activeConversations: this.memory.size,
            totalMessages: Array.from(this.memory.values()).reduce((sum, mem) => sum + mem.messages.length, 0),
        };
    }
}

export const conversationMemory = new ConversationMemoryService();
