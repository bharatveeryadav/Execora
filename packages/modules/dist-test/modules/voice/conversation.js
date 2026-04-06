"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationMemory = void 0;
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
const core_3 = require("@execora/core");
const SHOP_TENANT = process.env.SYSTEM_TENANT_ID || 'system-tenant-001';
// Shop-level (session-independent) keys — survive WebSocket reconnects within 4-hour TTL.
const SHOP_PENDING_INVOICES_KEY = `shop:${SHOP_TENANT}:pending_invoices`; // JSON array of PendingInvoiceDraft[]
const SHOP_PENDING_EMAIL_KEY = `shop:${SHOP_TENANT}:pending_email`; // awaiting send contact
const SHOP_PENDING_SEND_CONF_KEY = `shop:${SHOP_TENANT}:pending_send_conf`; // awaiting confirm on new contact
// ─── Redis helpers ────────────────────────────────────────────────────────────
function memKey(conversationId) {
    return `conv:${conversationId}:mem`;
}
function freshMemory(conversationId) {
    return {
        conversationId,
        messages: [],
        context: {},
        lastActivity: new Date().toISOString(),
        customerHistory: [],
        recentCustomers: {},
        turnCount: 0,
    };
}
// ─── Service ─────────────────────────────────────────────────────────────────
class ConversationMemoryService {
    // ── Private Redis I/O ──────────────────────────────────────────────────────
    async load(conversationId) {
        try {
            const raw = await core_2.redisClient.get(memKey(conversationId));
            if (raw)
                return JSON.parse(raw);
        }
        catch (err) {
            core_1.logger.warn({ err, conversationId }, 'Redis read failed — starting fresh memory');
        }
        return freshMemory(conversationId);
    }
    async save(conversationId, data) {
        data.lastActivity = new Date().toISOString();
        try {
            await core_2.redisClient.setex(memKey(conversationId), core_2.CONV_TTL_SECONDS, JSON.stringify(data));
        }
        catch (err) {
            core_1.logger.warn({ err, conversationId }, 'Redis write failed — memory not persisted');
        }
    }
    // ── Customer tracking helpers ──────────────────────────────────────────────
    findExistingCustomer(data, customerName) {
        const exact = data.recentCustomers[customerName.toLowerCase()];
        if (exact)
            return exact;
        for (const candidate of Object.values(data.recentCustomers)) {
            if ((0, core_3.isSamePerson)(customerName, candidate.name))
                return candidate;
        }
        return null;
    }
    trackCustomerMention(data, customerId, customerName) {
        const existing = this.findExistingCustomer(data, customerName);
        if (existing) {
            existing.lastMentioned = new Date().toISOString();
            existing.mentionCount += 1;
            // Move to end (most recent)
            data.customerHistory = [
                ...data.customerHistory.filter((c) => c.name !== existing.name),
                existing,
            ];
        }
        else {
            const customer = {
                id: customerId,
                name: customerName,
                lastMentioned: new Date().toISOString(),
                mentionCount: 1,
            };
            data.recentCustomers[customerName.toLowerCase()] = customer;
            data.customerHistory.push(customer);
        }
        // Cap history at 10
        if (data.customerHistory.length > 10) {
            const removed = data.customerHistory.shift();
            delete data.recentCustomers[removed.name.toLowerCase()];
        }
    }
    // ── Public API ─────────────────────────────────────────────────────────────
    /**
     * Add user message and auto-track any customer entities.
     */
    async addUserMessage(conversationId, message, intent, entities) {
        const data = await this.load(conversationId);
        data.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
            intent,
            entities,
        });
        // Track customer by name — LLM uses `entities.customer` for most intents
        // but `entities.name` for CREATE_CUSTOMER
        const mentionedName = entities?.customer || entities?.name;
        if (mentionedName && typeof mentionedName === 'string') {
            const id = entities.customerId || `temp_${mentionedName}`;
            this.trackCustomerMention(data, id, mentionedName);
        }
        const mentionedNameForAmount = entities?.customer || entities?.name;
        if (mentionedNameForAmount && entities?.amount) {
            this.updateCustomerContextInData(data, mentionedNameForAmount, {
                amount: entities.amount,
                intent,
            });
        }
        // Keep last 20 messages
        if (data.messages.length > 20)
            data.messages = data.messages.slice(-20);
        data.turnCount += 1;
        await this.save(conversationId, data);
        core_1.logger.debug({ conversationId, messageCount: data.messages.length }, 'User message persisted to Redis');
    }
    /**
     * Add assistant response to conversation history.
     */
    async addAssistantMessage(conversationId, message) {
        const data = await this.load(conversationId);
        data.messages.push({
            role: 'assistant',
            content: message,
            timestamp: new Date().toISOString(),
        });
        if (data.messages.length > 20)
            data.messages = data.messages.slice(-20);
        await this.save(conversationId, data);
        core_1.logger.debug({ conversationId }, 'Assistant message persisted to Redis');
    }
    /**
     * Return last N messages for display/inspection.
     */
    async getConversationHistory(conversationId, limit = 10) {
        const data = await this.load(conversationId);
        return data.messages.slice(-limit);
    }
    /**
     * Return formatted conversation context string to inject into LLM prompt.
     */
    async getFormattedContext(conversationId, limit = 6) {
        const history = await this.getConversationHistory(conversationId, limit);
        // Always fetch shop-level context summary — shop keys (pending invoice, pending email,
        // pending send-confirm) survive WebSocket reconnects and must be injected even when
        // the new session has zero conversation history.
        const contextSummary = await this.getContextSummary(conversationId);
        if (history.length === 0) {
            // Fresh/reconnected session: no history, but pending states may exist at shop level.
            return contextSummary || '';
        }
        const formatted = history
            .map((msg) => msg.role === 'user'
            ? `User: ${msg.content}${msg.intent ? ` [Intent: ${msg.intent}]` : ''}`
            : `Assistant: ${msg.content}`)
            .join('\n');
        return `\n\nPrevious conversation:\n${formatted}${contextSummary}\n`;
    }
    /**
     * Set active customer (selected for this conversation turn).
     */
    async setActiveCustomer(conversationId, customerId, customerName) {
        const data = await this.load(conversationId);
        data.activeCustomer = { id: customerId, name: customerName };
        data.context.activeCustomerId = customerId;
        data.context.activeCustomerName = customerName;
        this.trackCustomerMention(data, customerId, customerName);
        await this.save(conversationId, data);
        core_1.logger.info({ conversationId, customerId, customerName }, 'Active customer set in Redis');
    }
    /**
     * Get currently active customer in conversation.
     */
    async getActiveCustomer(conversationId) {
        const data = await this.load(conversationId);
        return data.activeCustomer;
    }
    /**
     * Switch to the second-most-recently discussed customer.
     */
    async switchToPreviousCustomer(conversationId) {
        const data = await this.load(conversationId);
        if (data.customerHistory.length < 2)
            return null;
        const prev = data.customerHistory[data.customerHistory.length - 2];
        data.activeCustomer = { id: prev.id, name: prev.name };
        data.context.activeCustomerId = prev.id;
        data.context.activeCustomerName = prev.name;
        await this.save(conversationId, data);
        core_1.logger.info({ conversationId, customerName: prev.name }, 'Switched to previous customer');
        return prev;
    }
    /**
     * Get all customers discussed, most-recent first.
     */
    async getAllCustomersInContext(conversationId) {
        const data = await this.load(conversationId);
        return [...data.customerHistory].reverse();
    }
    /**
     * Switch to a specific customer by name (fuzzy matched).
     */
    async switchToCustomerByName(conversationId, customerName) {
        const data = await this.load(conversationId);
        const lowerName = customerName.toLowerCase();
        let customer = data.recentCustomers[lowerName];
        if (!customer) {
            const candidates = Object.values(data.recentCustomers);
            const candidateNames = candidates.map((c) => c.name);
            const bestMatch = (0, core_3.findBestMatch)(customerName, candidateNames, 0.7);
            if (bestMatch) {
                customer = candidates.find((c) => c.name === bestMatch.matched);
                if (customer) {
                    core_1.logger.info({ conversationId, query: customerName, matched: bestMatch.matched, score: bestMatch.score }, 'Fuzzy matched customer name');
                }
            }
        }
        if (!customer)
            return null;
        data.activeCustomer = { id: customer.id, name: customer.name };
        data.context.activeCustomerId = customer.id;
        data.context.activeCustomerName = customer.name;
        // Move to end of history
        data.customerHistory = [
            ...data.customerHistory.filter((c) => c.name !== customer.name),
            customer,
        ];
        await this.save(conversationId, data);
        core_1.logger.info({ conversationId, customerName: customer.name }, 'Switched to customer by name');
        return customer;
    }
    /**
     * Find all conversation customers matching a name with scores.
     */
    async findMatchingCustomers(conversationId, customerName, threshold = 0.7) {
        const data = await this.load(conversationId);
        const candidates = Object.values(data.recentCustomers);
        const names = candidates.map((c) => c.name);
        return names
            .map((name) => {
            const match = (0, core_3.matchIndianName)(customerName, name, threshold);
            return match
                ? { ...match, customer: candidates.find((c) => c.name === name) }
                : null;
        })
            .filter((m) => m !== null)
            .sort((a, b) => b.score - a.score);
    }
    /**
     * Update customer context with latest balance/amount.
     */
    async updateCustomerContext(conversationId, customerName, updates) {
        const data = await this.load(conversationId);
        this.updateCustomerContextInData(data, customerName, updates);
        await this.save(conversationId, data);
    }
    updateCustomerContextInData(data, customerName, updates) {
        const customer = data.recentCustomers[customerName.toLowerCase()];
        if (!customer)
            return;
        if (updates.balance !== undefined)
            customer.latestBalance = updates.balance;
        if (updates.amount !== undefined)
            customer.latestAmount = updates.amount;
        if (updates.intent !== undefined)
            customer.latestIntent = updates.intent;
        customer.lastMentioned = new Date().toISOString();
    }
    /**
     * Returns a summary string of recent customers + any pending invoice for LLM injection.
     * Injecting a pending invoice here ensures that "haan / confirm" on the NEXT turn
     * is classified as CONFIRM_INVOICE even after a WebSocket reconnect.
     */
    async getContextSummary(conversationId) {
        const data = await this.load(conversationId);
        let summary = '';
        if (data.customerHistory.length > 0) {
            const recent = data.customerHistory.slice(-3).reverse();
            summary += '\n\nRecent customers in this conversation:\n';
            for (const customer of recent) {
                summary += `- ${customer.name}`;
                if (customer.latestBalance !== undefined)
                    summary += ` (balance: ${customer.latestBalance})`;
                if (customer.latestAmount !== undefined)
                    summary += ` (amount: ${customer.latestAmount})`;
                if (data.activeCustomer?.name === customer.name)
                    summary += ' [CURRENT]';
                summary += '\n';
            }
        }
        // Inject all pending invoice drafts so LLM knows to classify "haan/confirm" as CONFIRM_INVOICE.
        // Session-level draft (current turn) takes priority; shop-level list covers cross-session recovery.
        const sessionDraft = data.context.pendingInvoice ?? null;
        const allShopDrafts = await this.getShopPendingInvoices();
        // Merge: put session-level draft first (most relevant), then any shop-level drafts
        // that belong to a different customer (avoid double-entry for the same draft).
        const mergedDrafts = sessionDraft ? [sessionDraft] : [];
        for (const d of allShopDrafts) {
            if (!mergedDrafts.some((m) => m.customerId === d.customerId)) {
                mergedDrafts.push(d);
            }
        }
        if (mergedDrafts.length === 1) {
            const pendingInvoice = mergedDrafts[0];
            const itemSummary = (pendingInvoice.resolvedItems || [])
                .map((i) => `${i.productName} ×${i.quantity}`)
                .join(', ');
            summary +=
                `\n⚠️  PENDING INVOICE (awaiting confirmation) for ${pendingInvoice.customerName}:\n` +
                    `   Items: ${itemSummary}\n` +
                    `   Total: ₹${pendingInvoice.grandTotal ?? pendingInvoice.subtotal}\n` +
                    `   → If the user says "haan / confirm / ok / theek hai / bhej do", use intent CONFIRM_INVOICE.\n` +
                    `   → If the user says "nahi / cancel / mat banao", use intent CANCEL_INVOICE.\n`;
        }
        else if (mergedDrafts.length > 1) {
            summary += `\n⚠️  ${mergedDrafts.length} PENDING INVOICES (awaiting confirmation):\n`;
            for (const d of mergedDrafts) {
                const items = (d.resolvedItems || []).map((i) => `${i.productName} ×${i.quantity}`).join(', ');
                summary += `   - ${d.customerName}: ₹${d.grandTotal ?? d.subtotal}  [${items}]${d.draftId ? `  (draftId: ${d.draftId})` : ''}\n`;
            }
            summary +=
                `   → "haan / confirm" WITHOUT customer name → respond "Kaunsa bill confirm karein? [list names]"\n` +
                    `   → "Rahul ka confirm karo" → use intent CONFIRM_INVOICE with entities.customer = "Rahul"\n` +
                    `   → "sab cancel" → use intent CANCEL_INVOICE with entities.cancelAll = true\n` +
                    `   → "nahi / cancel" WITHOUT customer → respond "Kaunsa bill cancel karein? [list names]"\n`;
        }
        // Inject pending send-confirmation so LLM routes "haan" to CONFIRM_INVOICE (which then
        // routes to executeConfirmSend) — works even after a WebSocket reconnect.
        const pendingSendConf = data.context.pendingSendConfirm ?? await this.getShopPendingSendConfirm();
        if (pendingSendConf) {
            const channelLabel = pendingSendConf.channel === 'email'
                ? `email ${pendingSendConf.contact}`
                : `WhatsApp ${pendingSendConf.contact}`;
            summary +=
                `\n📧 PENDING SEND CONFIRMATION — waiting for user to confirm sending invoice via ${channelLabel}:\n` +
                    `   → "haan / ok / theek hai / haan bhej do" → use intent CONFIRM_INVOICE\n` +
                    `   → "nahi / mat bhejo / cancel" → use intent CANCEL_INVOICE\n`;
        }
        // Inject pending email state so LLM knows we're waiting for an email/phone.
        const pendingEmail = data.context.pendingInvoiceEmail ?? await this.getShopPendingEmail();
        if (pendingEmail && !pendingSendConf) {
            summary +=
                `\n📬 AWAITING SEND CONTACT — invoice for ${pendingEmail.customerName} confirmed but not yet sent.\n` +
                    `   User needs to provide email address or WhatsApp number.\n` +
                    `   → Email address → use intent SEND_INVOICE with entities.channel="email"\n` +
                    `   → Phone number  → use intent SEND_INVOICE with entities.channel="whatsapp"\n`;
        }
        return summary;
    }
    /** Set a custom context key-value pair. */
    async setContext(conversationId, key, value) {
        const data = await this.load(conversationId);
        data.context[key] = value;
        await this.save(conversationId, data);
    }
    /** Get a custom context value by key. */
    async getContext(conversationId, key) {
        const data = await this.load(conversationId);
        return data.context[key];
    }
    /** Get full context object. */
    async getFullContext(conversationId) {
        const data = await this.load(conversationId);
        return data.context;
    }
    /** Get total turn count for this conversation. */
    async getTurnCount(conversationId) {
        const data = await this.load(conversationId);
        return data.turnCount;
    }
    /** Delete all Redis state for this conversation. */
    async clearMemory(conversationId) {
        try {
            await core_2.redisClient.del(memKey(conversationId));
            core_1.logger.info({ conversationId }, 'Conversation memory cleared from Redis');
        }
        catch (err) {
            core_1.logger.warn({ err, conversationId }, 'Failed to clear conversation memory from Redis');
        }
    }
    /** Stats — how many live conversation keys exist in Redis. */
    async getStats() {
        try {
            const keys = await core_2.redisClient.keys('conv:*:mem');
            return { activeConversations: keys.length };
        }
        catch {
            return { activeConversations: 0 };
        }
    }
    // ── Shop-level (session-independent) draft persistence ────────────────────
    // All pending invoice drafts are stored as a JSON array so multiple
    // customers' drafts survive WebSocket reconnects simultaneously.
    /** Load the full draft list from Redis (internal helper). */
    async _loadDrafts() {
        try {
            const raw = await core_2.redisClient.get(SHOP_PENDING_INVOICES_KEY);
            return raw ? JSON.parse(raw) : [];
        }
        catch (err) {
            core_1.logger.warn({ err }, 'Redis read failed — pending invoices not loaded');
            return [];
        }
    }
    /** Save the full draft list to Redis (internal helper). */
    async _saveDrafts(drafts) {
        try {
            await core_2.redisClient.setex(SHOP_PENDING_INVOICES_KEY, core_2.CONV_TTL_SECONDS, JSON.stringify(drafts));
        }
        catch (err) {
            core_1.logger.warn({ err }, 'Redis write failed — pending invoices not persisted');
        }
    }
    /**
     * Add a new pending invoice draft to the shop-level list.
     * Returns the generated draftId so the engine can attach it to session context.
     */
    async addShopPendingInvoice(draft) {
        const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const entry = { ...draft, draftId, createdAt: new Date().toISOString() };
        const drafts = await this._loadDrafts();
        // Replace existing draft for same customer (prevent duplicates when re-drafting)
        const filtered = drafts.filter((d) => d.customerId !== draft.customerId);
        await this._saveDrafts([...filtered, entry]);
        core_1.logger.info({ draftId, customerName: draft.customerName }, 'Pending invoice draft added');
        return draftId;
    }
    /**
     * Update an existing draft in the list (e.g. after GST toggle).
     * If draftId is not found, the draft is appended.
     */
    async updateShopPendingInvoice(draftId, updated) {
        const drafts = await this._loadDrafts();
        const idx = drafts.findIndex((d) => d.draftId === draftId);
        if (idx >= 0) {
            drafts[idx] = { ...updated, draftId, updatedAt: new Date().toISOString() };
        }
        else {
            drafts.push({ ...updated, draftId, createdAt: new Date().toISOString() });
        }
        await this._saveDrafts(drafts);
    }
    /**
     * Remove a specific draft from the list by draftId.
     */
    async removeShopPendingInvoice(draftId) {
        const drafts = await this._loadDrafts();
        const updated = drafts.filter((d) => d.draftId !== draftId);
        await this._saveDrafts(updated);
        core_1.logger.info({ draftId }, 'Pending invoice draft removed');
    }
    /**
     * Return all pending invoice drafts (most recently created last).
     */
    async getShopPendingInvoices() {
        return this._loadDrafts();
    }
    /**
     * Return the first (oldest) pending invoice draft, or null.
     * Kept for backward-compat with engine code that expects a single draft.
     */
    async getShopPendingInvoice() {
        const drafts = await this._loadDrafts();
        return drafts.length > 0 ? drafts[0] : null;
    }
    /**
     * Clear ALL pending invoice drafts (pass null to match old API).
     */
    async setShopPendingInvoice(_draft) {
        try {
            await core_2.redisClient.del(SHOP_PENDING_INVOICES_KEY);
        }
        catch (err) {
            core_1.logger.warn({ err }, 'Redis delete failed — pending invoices not cleared');
        }
    }
    // ── Shop-level pending email / send-confirmation ───────────────────────────
    // These survive WebSocket reconnects so the "awaiting email" state is not
    // lost when a client disconnects mid-conversation.
    async setShopPendingEmail(data) {
        try {
            if (data === null)
                await core_2.redisClient.del(SHOP_PENDING_EMAIL_KEY);
            else
                await core_2.redisClient.setex(SHOP_PENDING_EMAIL_KEY, core_2.CONV_TTL_SECONDS, JSON.stringify(data));
        }
        catch (err) {
            core_1.logger.warn({ err }, 'Redis write failed — shop pending email not persisted');
        }
    }
    async getShopPendingEmail() {
        try {
            const raw = await core_2.redisClient.get(SHOP_PENDING_EMAIL_KEY);
            return raw ? JSON.parse(raw) : null;
        }
        catch (err) {
            core_1.logger.warn({ err }, 'Redis read failed — shop pending email not loaded');
            return null;
        }
    }
    async setShopPendingSendConfirm(data) {
        try {
            if (data === null)
                await core_2.redisClient.del(SHOP_PENDING_SEND_CONF_KEY);
            else
                await core_2.redisClient.setex(SHOP_PENDING_SEND_CONF_KEY, core_2.CONV_TTL_SECONDS, JSON.stringify(data));
        }
        catch (err) {
            core_1.logger.warn({ err }, 'Redis write failed — shop pending send-confirm not persisted');
        }
    }
    async getShopPendingSendConfirm() {
        try {
            const raw = await core_2.redisClient.get(SHOP_PENDING_SEND_CONF_KEY);
            return raw ? JSON.parse(raw) : null;
        }
        catch (err) {
            core_1.logger.warn({ err }, 'Redis read failed — shop pending send-confirm not loaded');
            return null;
        }
    }
}
exports.conversationMemory = new ConversationMemoryService();
//# sourceMappingURL=conversation.js.map