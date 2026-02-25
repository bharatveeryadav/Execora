import { logger } from '../../infrastructure/logger';
import { redisClient, CONV_TTL_SECONDS } from '../../infrastructure/redis-client';
import { matchIndianName, findBestMatch, isSamePerson } from '../../infrastructure/fuzzy-match';

const SHOP_TENANT = process.env.SYSTEM_TENANT_ID || 'system-tenant-001';

// Shop-level (session-independent) keys — survive WebSocket reconnects within 4-hour TTL.
const SHOP_PENDING_INVOICES_KEY   = `shop:${SHOP_TENANT}:pending_invoices`;    // JSON array of PendingInvoiceDraft[]
const SHOP_PENDING_EMAIL_KEY      = `shop:${SHOP_TENANT}:pending_email`;       // awaiting send contact
const SHOP_PENDING_SEND_CONF_KEY  = `shop:${SHOP_TENANT}:pending_send_conf`;   // awaiting confirm on new contact

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;   // ISO string (Date is not JSON-safe as a class instance)
  intent?: string;
  entities?: Record<string, any>;
}

interface CustomerContext {
  id: string;
  name: string;
  lastMentioned: string;  // ISO string
  mentionCount: number;
  latestBalance?: number;
  latestAmount?: number;
  latestIntent?: string;
}

/**
 * Serialisable form of ConversationMemory.
 * `recentCustomers` is a plain object (not Map) so JSON.stringify works.
 * `customerHistory` is an ordered array (oldest → newest).
 */
interface ConversationMemoryData {
  conversationId:  string;
  messages:        ConversationMessage[];          // last 20
  context:         Record<string, any>;            // arbitrary key-value bag
  lastActivity:    string;                         // ISO string
  activeCustomer?: { id: string; name: string };
  customerHistory: CustomerContext[];              // ordered: oldest → newest (last = current)
  recentCustomers: Record<string, CustomerContext>;// keyed by name.toLowerCase()
  turnCount:       number;
}

// ─── Redis helpers ────────────────────────────────────────────────────────────

function memKey(conversationId: string) {
  return `conv:${conversationId}:mem`;
}

function freshMemory(conversationId: string): ConversationMemoryData {
  return {
    conversationId,
    messages:        [],
    context:         {},
    lastActivity:    new Date().toISOString(),
    customerHistory: [],
    recentCustomers: {},
    turnCount:       0,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

class ConversationMemoryService {

  // ── Private Redis I/O ──────────────────────────────────────────────────────

  private async load(conversationId: string): Promise<ConversationMemoryData> {
    try {
      const raw = await redisClient.get(memKey(conversationId));
      if (raw) return JSON.parse(raw) as ConversationMemoryData;
    } catch (err) {
      logger.warn({ err, conversationId }, 'Redis read failed — starting fresh memory');
    }
    return freshMemory(conversationId);
  }

  private async save(conversationId: string, data: ConversationMemoryData): Promise<void> {
    data.lastActivity = new Date().toISOString();
    try {
      await redisClient.setex(memKey(conversationId), CONV_TTL_SECONDS, JSON.stringify(data));
    } catch (err) {
      logger.warn({ err, conversationId }, 'Redis write failed — memory not persisted');
    }
  }

  // ── Customer tracking helpers ──────────────────────────────────────────────

  private findExistingCustomer(
    data: ConversationMemoryData,
    customerName: string
  ): CustomerContext | null {
    const exact = data.recentCustomers[customerName.toLowerCase()];
    if (exact) return exact;

    for (const candidate of Object.values(data.recentCustomers)) {
      if (isSamePerson(customerName, candidate.name)) return candidate;
    }
    return null;
  }

  private trackCustomerMention(
    data: ConversationMemoryData,
    customerId: string,
    customerName: string
  ) {
    const existing = this.findExistingCustomer(data, customerName);

    if (existing) {
      existing.lastMentioned  = new Date().toISOString();
      existing.mentionCount  += 1;
      // Move to end (most recent)
      data.customerHistory = [
        ...data.customerHistory.filter((c) => c.name !== existing.name),
        existing,
      ];
    } else {
      const customer: CustomerContext = {
        id:            customerId,
        name:          customerName,
        lastMentioned: new Date().toISOString(),
        mentionCount:  1,
      };
      data.recentCustomers[customerName.toLowerCase()] = customer;
      data.customerHistory.push(customer);
    }

    // Cap history at 10
    if (data.customerHistory.length > 10) {
      const removed = data.customerHistory.shift()!;
      delete data.recentCustomers[removed.name.toLowerCase()];
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Add user message and auto-track any customer entities.
   */
  async addUserMessage(
    conversationId: string,
    message: string,
    intent?: string,
    entities?: Record<string, any>
  ): Promise<void> {
    const data = await this.load(conversationId);

    data.messages.push({
      role:      'user',
      content:   message,
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
    if (data.messages.length > 20) data.messages = data.messages.slice(-20);

    data.turnCount += 1;
    await this.save(conversationId, data);
    logger.debug({ conversationId, messageCount: data.messages.length }, 'User message persisted to Redis');
  }

  /**
   * Add assistant response to conversation history.
   */
  async addAssistantMessage(conversationId: string, message: string): Promise<void> {
    const data = await this.load(conversationId);

    data.messages.push({
      role:      'assistant',
      content:   message,
      timestamp: new Date().toISOString(),
    });

    if (data.messages.length > 20) data.messages = data.messages.slice(-20);

    await this.save(conversationId, data);
    logger.debug({ conversationId }, 'Assistant message persisted to Redis');
  }

  /**
   * Return last N messages for display/inspection.
   */
  async getConversationHistory(
    conversationId: string,
    limit: number = 10
  ): Promise<ConversationMessage[]> {
    const data = await this.load(conversationId);
    return data.messages.slice(-limit);
  }

  /**
   * Return formatted conversation context string to inject into LLM prompt.
   */
  async getFormattedContext(conversationId: string, limit: number = 6): Promise<string> {
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
      .map((msg) =>
        msg.role === 'user'
          ? `User: ${msg.content}${msg.intent ? ` [Intent: ${msg.intent}]` : ''}`
          : `Assistant: ${msg.content}`
      )
      .join('\n');

    return `\n\nPrevious conversation:\n${formatted}${contextSummary}\n`;
  }

  /**
   * Set active customer (selected for this conversation turn).
   */
  async setActiveCustomer(
    conversationId: string,
    customerId: string,
    customerName: string
  ): Promise<void> {
    const data = await this.load(conversationId);

    data.activeCustomer            = { id: customerId, name: customerName };
    data.context.activeCustomerId  = customerId;
    data.context.activeCustomerName = customerName;

    this.trackCustomerMention(data, customerId, customerName);

    await this.save(conversationId, data);
    logger.info({ conversationId, customerId, customerName }, 'Active customer set in Redis');
  }

  /**
   * Get currently active customer in conversation.
   */
  async getActiveCustomer(
    conversationId: string
  ): Promise<{ id: string; name: string } | undefined> {
    const data = await this.load(conversationId);
    return data.activeCustomer;
  }

  /**
   * Switch to the second-most-recently discussed customer.
   */
  async switchToPreviousCustomer(
    conversationId: string
  ): Promise<{ id: string; name: string } | null> {
    const data = await this.load(conversationId);
    if (data.customerHistory.length < 2) return null;

    const prev = data.customerHistory[data.customerHistory.length - 2];
    data.activeCustomer             = { id: prev.id, name: prev.name };
    data.context.activeCustomerId   = prev.id;
    data.context.activeCustomerName = prev.name;

    await this.save(conversationId, data);
    logger.info({ conversationId, customerName: prev.name }, 'Switched to previous customer');
    return prev;
  }

  /**
   * Get all customers discussed, most-recent first.
   */
  async getAllCustomersInContext(conversationId: string): Promise<CustomerContext[]> {
    const data = await this.load(conversationId);
    return [...data.customerHistory].reverse();
  }

  /**
   * Switch to a specific customer by name (fuzzy matched).
   */
  async switchToCustomerByName(
    conversationId: string,
    customerName: string
  ): Promise<{ id: string; name: string } | null> {
    const data = await this.load(conversationId);
    const lowerName = customerName.toLowerCase();

    let customer: CustomerContext | undefined = data.recentCustomers[lowerName];

    if (!customer) {
      const candidates      = Object.values(data.recentCustomers);
      const candidateNames  = candidates.map((c) => c.name);
      const bestMatch       = findBestMatch(customerName, candidateNames, 0.7);

      if (bestMatch) {
        customer = candidates.find((c) => c.name === bestMatch.matched);
        if (customer) {
          logger.info(
            { conversationId, query: customerName, matched: bestMatch.matched, score: bestMatch.score },
            'Fuzzy matched customer name'
          );
        }
      }
    }

    if (!customer) return null;

    data.activeCustomer             = { id: customer.id, name: customer.name };
    data.context.activeCustomerId   = customer.id;
    data.context.activeCustomerName = customer.name;

    // Move to end of history
    data.customerHistory = [
      ...data.customerHistory.filter((c) => c.name !== customer!.name),
      customer,
    ];

    await this.save(conversationId, data);
    logger.info({ conversationId, customerName: customer.name }, 'Switched to customer by name');
    return customer;
  }

  /**
   * Find all conversation customers matching a name with scores.
   */
  async findMatchingCustomers(
    conversationId: string,
    customerName: string,
    threshold: number = 0.7
  ) {
    const data       = await this.load(conversationId);
    const candidates = Object.values(data.recentCustomers);
    const names      = candidates.map((c) => c.name);

    return names
      .map((name) => {
        const match = matchIndianName(customerName, name, threshold);
        return match
          ? { ...match, customer: candidates.find((c) => c.name === name)! }
          : null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Update customer context with latest balance/amount.
   */
  async updateCustomerContext(
    conversationId: string,
    customerName: string,
    updates: { balance?: number; amount?: number; intent?: string }
  ): Promise<void> {
    const data = await this.load(conversationId);
    this.updateCustomerContextInData(data, customerName, updates);
    await this.save(conversationId, data);
  }

  private updateCustomerContextInData(
    data: ConversationMemoryData,
    customerName: string,
    updates: { balance?: number; amount?: number; intent?: string }
  ) {
    const customer = data.recentCustomers[customerName.toLowerCase()];
    if (!customer) return;
    if (updates.balance !== undefined) customer.latestBalance = updates.balance;
    if (updates.amount  !== undefined) customer.latestAmount  = updates.amount;
    if (updates.intent  !== undefined) customer.latestIntent  = updates.intent;
    customer.lastMentioned = new Date().toISOString();
  }

  /**
   * Returns a summary string of recent customers + any pending invoice for LLM injection.
   * Injecting a pending invoice here ensures that "haan / confirm" on the NEXT turn
   * is classified as CONFIRM_INVOICE even after a WebSocket reconnect.
   */
  async getContextSummary(conversationId: string): Promise<string> {
    const data = await this.load(conversationId);
    let summary = '';

    if (data.customerHistory.length > 0) {
      const recent = data.customerHistory.slice(-3).reverse();
      summary += '\n\nRecent customers in this conversation:\n';

      for (const customer of recent) {
        summary += `- ${customer.name}`;
        if (customer.latestBalance !== undefined) summary += ` (balance: ${customer.latestBalance})`;
        if (customer.latestAmount  !== undefined) summary += ` (amount: ${customer.latestAmount})`;
        if (data.activeCustomer?.name === customer.name) summary += ' [CURRENT]';
        summary += '\n';
      }
    }

    // Inject all pending invoice drafts so LLM knows to classify "haan/confirm" as CONFIRM_INVOICE.
    // Session-level draft (current turn) takes priority; shop-level list covers cross-session recovery.
    const sessionDraft   = data.context.pendingInvoice ?? null;
    const allShopDrafts  = await this.getShopPendingInvoices();

    // Merge: put session-level draft first (most relevant), then any shop-level drafts
    // that belong to a different customer (avoid double-entry for the same draft).
    const mergedDrafts: any[] = sessionDraft ? [sessionDraft] : [];
    for (const d of allShopDrafts) {
      if (!mergedDrafts.some((m) => m.customerId === d.customerId)) {
        mergedDrafts.push(d);
      }
    }

    if (mergedDrafts.length === 1) {
      const pendingInvoice = mergedDrafts[0];
      const itemSummary = (pendingInvoice.resolvedItems as any[] || [])
        .map((i: any) => `${i.productName} ×${i.quantity}`)
        .join(', ');
      summary +=
        `\n⚠️  PENDING INVOICE (awaiting confirmation) for ${pendingInvoice.customerName}:\n` +
        `   Items: ${itemSummary}\n` +
        `   Total: ₹${pendingInvoice.grandTotal ?? pendingInvoice.subtotal}\n` +
        `   → If the user says "haan / confirm / ok / theek hai / bhej do", use intent CONFIRM_INVOICE.\n` +
        `   → If the user says "nahi / cancel / mat banao", use intent CANCEL_INVOICE.\n`;
    } else if (mergedDrafts.length > 1) {
      summary += `\n⚠️  ${mergedDrafts.length} PENDING INVOICES (awaiting confirmation):\n`;
      for (const d of mergedDrafts) {
        const items = (d.resolvedItems as any[] || []).map((i: any) => `${i.productName} ×${i.quantity}`).join(', ');
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
  async setContext(conversationId: string, key: string, value: any): Promise<void> {
    const data = await this.load(conversationId);
    data.context[key] = value;
    await this.save(conversationId, data);
  }

  /** Get a custom context value by key. */
  async getContext(conversationId: string, key: string): Promise<any> {
    const data = await this.load(conversationId);
    return data.context[key];
  }

  /** Get full context object. */
  async getFullContext(conversationId: string): Promise<Record<string, any>> {
    const data = await this.load(conversationId);
    return data.context;
  }

  /** Get total turn count for this conversation. */
  async getTurnCount(conversationId: string): Promise<number> {
    const data = await this.load(conversationId);
    return data.turnCount;
  }

  /** Delete all Redis state for this conversation. */
  async clearMemory(conversationId: string): Promise<void> {
    try {
      await redisClient.del(memKey(conversationId));
      logger.info({ conversationId }, 'Conversation memory cleared from Redis');
    } catch (err) {
      logger.warn({ err, conversationId }, 'Failed to clear conversation memory from Redis');
    }
  }

  /** Stats — how many live conversation keys exist in Redis. */
  async getStats(): Promise<{ activeConversations: number }> {
    try {
      const keys = await redisClient.keys('conv:*:mem');
      return { activeConversations: keys.length };
    } catch {
      return { activeConversations: 0 };
    }
  }

  // ── Shop-level (session-independent) draft persistence ────────────────────
  // All pending invoice drafts are stored as a JSON array so multiple
  // customers' drafts survive WebSocket reconnects simultaneously.

  /** Load the full draft list from Redis (internal helper). */
  private async _loadDrafts(): Promise<any[]> {
    try {
      const raw = await redisClient.get(SHOP_PENDING_INVOICES_KEY);
      return raw ? (JSON.parse(raw) as any[]) : [];
    } catch (err) {
      logger.warn({ err }, 'Redis read failed — pending invoices not loaded');
      return [];
    }
  }

  /** Save the full draft list to Redis (internal helper). */
  private async _saveDrafts(drafts: any[]): Promise<void> {
    try {
      await redisClient.setex(SHOP_PENDING_INVOICES_KEY, CONV_TTL_SECONDS, JSON.stringify(drafts));
    } catch (err) {
      logger.warn({ err }, 'Redis write failed — pending invoices not persisted');
    }
  }

  /**
   * Add a new pending invoice draft to the shop-level list.
   * Returns the generated draftId so the engine can attach it to session context.
   */
  async addShopPendingInvoice(draft: any): Promise<string> {
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const entry   = { ...draft, draftId, createdAt: new Date().toISOString() };
    const drafts  = await this._loadDrafts();
    // Replace existing draft for same customer (prevent duplicates when re-drafting)
    const filtered = drafts.filter((d) => d.customerId !== draft.customerId);
    await this._saveDrafts([...filtered, entry]);
    logger.info({ draftId, customerName: draft.customerName }, 'Pending invoice draft added');
    return draftId;
  }

  /**
   * Update an existing draft in the list (e.g. after GST toggle).
   * If draftId is not found, the draft is appended.
   */
  async updateShopPendingInvoice(draftId: string, updated: any): Promise<void> {
    const drafts  = await this._loadDrafts();
    const idx     = drafts.findIndex((d) => d.draftId === draftId);
    if (idx >= 0) {
      drafts[idx] = { ...updated, draftId, updatedAt: new Date().toISOString() };
    } else {
      drafts.push({ ...updated, draftId, createdAt: new Date().toISOString() });
    }
    await this._saveDrafts(drafts);
  }

  /**
   * Remove a specific draft from the list by draftId.
   */
  async removeShopPendingInvoice(draftId: string): Promise<void> {
    const drafts  = await this._loadDrafts();
    const updated = drafts.filter((d) => d.draftId !== draftId);
    await this._saveDrafts(updated);
    logger.info({ draftId }, 'Pending invoice draft removed');
  }

  /**
   * Return all pending invoice drafts (most recently created last).
   */
  async getShopPendingInvoices(): Promise<any[]> {
    return this._loadDrafts();
  }

  /**
   * Return the first (oldest) pending invoice draft, or null.
   * Kept for backward-compat with engine code that expects a single draft.
   */
  async getShopPendingInvoice(): Promise<any | null> {
    const drafts = await this._loadDrafts();
    return drafts.length > 0 ? drafts[0] : null;
  }

  /**
   * Clear ALL pending invoice drafts (pass null to match old API).
   */
  async setShopPendingInvoice(_draft: null): Promise<void> {
    try {
      await redisClient.del(SHOP_PENDING_INVOICES_KEY);
    } catch (err) {
      logger.warn({ err }, 'Redis delete failed — pending invoices not cleared');
    }
  }

  // ── Shop-level pending email / send-confirmation ───────────────────────────
  // These survive WebSocket reconnects so the "awaiting email" state is not
  // lost when a client disconnects mid-conversation.

  async setShopPendingEmail(data: any | null): Promise<void> {
    try {
      if (data === null) await redisClient.del(SHOP_PENDING_EMAIL_KEY);
      else await redisClient.setex(SHOP_PENDING_EMAIL_KEY, CONV_TTL_SECONDS, JSON.stringify(data));
    } catch (err) {
      logger.warn({ err }, 'Redis write failed — shop pending email not persisted');
    }
  }

  async getShopPendingEmail(): Promise<any | null> {
    try {
      const raw = await redisClient.get(SHOP_PENDING_EMAIL_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      logger.warn({ err }, 'Redis read failed — shop pending email not loaded');
      return null;
    }
  }

  async setShopPendingSendConfirm(data: any | null): Promise<void> {
    try {
      if (data === null) await redisClient.del(SHOP_PENDING_SEND_CONF_KEY);
      else await redisClient.setex(SHOP_PENDING_SEND_CONF_KEY, CONV_TTL_SECONDS, JSON.stringify(data));
    } catch (err) {
      logger.warn({ err }, 'Redis write failed — shop pending send-confirm not persisted');
    }
  }

  async getShopPendingSendConfirm(): Promise<any | null> {
    try {
      const raw = await redisClient.get(SHOP_PENDING_SEND_CONF_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      logger.warn({ err }, 'Redis read failed — shop pending send-confirm not loaded');
      return null;
    }
  }
}

export const conversationMemory = new ConversationMemoryService();
