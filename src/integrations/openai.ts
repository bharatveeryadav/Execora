import OpenAI from 'openai';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../infrastructure/logger';
import { llmCache } from '../infrastructure/llm-cache';
import { llmRequestsTotal, llmTokensTotal, llmCostUsdTotal } from '../infrastructure/metrics';
import { getRuntimeConfig } from '../infrastructure/runtime-config';
import { IntentType, IntentExtraction, ExecutionResult } from '../types';
import { conversationMemory } from '../modules/voice/conversation';

type CachePolicy = {
  ttlSeconds: number;
  scope: 'conversation' | 'global';
};

const stableStringify = (value: any): string => {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${key}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const hashString = (value: string): string => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  private recordUsage(
    operation: string,
    intent: string,
    response: any,
    cache: 'hit' | 'miss'
  ) {
    const usage = response?.usage;
    const model = response?.model || config.openai.model;

    llmRequestsTotal.inc({ model, operation, intent, cache });

    if (!usage) return;

    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;

    llmTokensTotal.inc({ model, operation, intent, type: 'prompt' }, promptTokens);
    llmTokensTotal.inc({ model, operation, intent, type: 'completion' }, completionTokens);
    llmTokensTotal.inc({ model, operation, intent, type: 'total' }, totalTokens);

    const runtimeConfig = getRuntimeConfig();
    const costInputPer1k = runtimeConfig.llm.cost.inputPer1k;
    const costOutputPer1k = runtimeConfig.llm.cost.outputPer1k;

    if (costInputPer1k > 0 || costOutputPer1k > 0) {
      const cost = (promptTokens / 1000) * costInputPer1k + (completionTokens / 1000) * costOutputPer1k;
      if (cost > 0) {
        llmCostUsdTotal.inc({ model, operation, intent }, cost);
      }
    }
  }

  private getResponseTokenLimit(intent: IntentType): number {
    const runtimeConfig = getRuntimeConfig();
    return runtimeConfig.llm.responseTokenLimits[intent] ?? 150;
  }

  private buildResponseCacheKey(
    intent: IntentType,
    executionResult: ExecutionResult,
    conversationContext?: string,
    scope: CachePolicy['scope'] = 'conversation'
  ): string {
    const basePayload = {
      intent,
      success: executionResult.success,
      message: executionResult.message,
      data: executionResult.data ?? null,
    };
    const base = stableStringify(basePayload);
    const contextHash = scope === 'global'
      ? 'global'
      : (conversationContext ? hashString(conversationContext) : 'noctx');
    return `llm:response:${intent}:${contextHash}:${hashString(base)}`;
  }

  /**
   * Convert phone number to individual digit words for Hinglish speaking
   * Example: "9674380399" → "nau chhah saat char teen das sau nau nau"
   */
  phoneToWords(phone: string): string {
    if (!phone) return '';

    const digitWords: Record<string, string> = {
      '0': 'das',
      '1': 'ek',
      '2': 'do',
      '3': 'teen',
      '4': 'char',
      '5': 'paanch',
      '6': 'chhah',
      '7': 'saat',
      '8': 'aath',
      '9': 'nau',
    };

    const converted = phone
      .toString()
      .trim()
      .split('')
      .map((digit) => {
        const word = digitWords[digit];
        if (!word) {
          logger.warn({ digit }, 'Unknown digit in phone conversion');
          return digit;
        }
        return word;
      })
      .join(' ');

    logger.debug({ phone, converted }, 'Phone to words conversion');
    return converted;
  }

  /**
   * Extract intent and entities from voice transcript
   */
  async extractIntent(
    transcript: string,
    rawText?: string,
    conversationId?: string
  ): Promise<IntentExtraction> {
    try {
      // Inject conversation history for multi-turn context
      let conversationContext = '';
      if (conversationId) {
        conversationContext = conversationMemory.getFormattedContext(conversationId, 6);
      }

      const systemPrompt = `You are an intent extraction system for an Indian SME business assistant.
Extract the intent and entities from the Hindi/English mixed voice command.

${conversationContext}
When extracting intent, consider the conversation history above to resolve ambiguous references:
- "usko", "isko", "same customer" → Use most recently mentioned customer (marked as [CURRENT])
- "pehle wale" (first one), "pichla" (previous) → Use second-most recent customer
- "dono" (both), "sabhi" (all) → Multiple customers mentioned in recent context
- "doosra" (other one) → Switch to other customer in recent context
- References to amounts or balance without customer name → Apply to current active customer

MULTI-CUSTOMER CONTEXT SWITCHING:
- When user says "aur [NAME]", "ab [NAME]", "[NAME] ka bhi" → Switching to different customer
- When user says "pehle wale ko" (to the previous one) → Switch to previous customer in history
- When multiple customers are in context, infer from recent mentions which one user is referring to

Extract the intent and entities from the Hindi/English mixed voice command.

Available intents:
- CREATE_INVOICE: Creating bill/invoice for customer
- CREATE_REMINDER: Schedule payment reminder
- RECORD_PAYMENT: Customer made a payment
- ADD_CREDIT: Add credit/debt to customer account
- CHECK_BALANCE: Check customer balance
- CHECK_STOCK: Check product stock
- CANCEL_INVOICE: Cancel last invoice
- CANCEL_REMINDER: Cancel a reminder
- LIST_REMINDERS: List pending reminders
- CREATE_CUSTOMER: Add new customer
- MODIFY_REMINDER: Change reminder time
- DAILY_SUMMARY: Get daily sales summary
- START_RECORDING: Start voice recording
- STOP_RECORDING: Stop voice recording
- UPDATE_CUSTOMER_PHONE: Update customer phone number (WhatsApp, mobile)
- GET_CUSTOMER_INFO: Get all customer information (name, phone, balance, status)
- DELETE_CUSTOMER_DATA: Delete all customer data permanently with confirmation and OTP
- UNKNOWN: Cannot determine intent

Critical extraction rules for Indian voice patterns:
1) Recognize Indian Hinglish patterns for ADD_CREDIT:
   - "CUSTOMER_NAME ka AMOUNT add karo" → ADD_CREDIT
   - "CUSTOMER_NAME ko AMOUNT add kar do" → ADD_CREDIT
   - Example: "Bharat ka 500 add karo" → {"intent":"ADD_CREDIT","entities":{"customer":"Bharat","amount":500}}

2) Recognize Indian Hinglish patterns for RECORD_PAYMENT (payment received):
   - "CUSTOMER_NAME ka AMOUNT aa gaya" (amount arrived) → RECORD_PAYMENT
   - "CUSTOMER_NAME ka AMOUNT mil gaya" (got amount) → RECORD_PAYMENT
   - "CUSTOMER_NAME ka AMOUNT clear karo" (clear amount) → RECORD_PAYMENT
   - "CUSTOMER_NAME ne AMOUNT de diya" (gave amount) → RECORD_PAYMENT
   - Example: "Bharat ka 300 aa gaya" → {"intent":"RECORD_PAYMENT","entities":{"customer":"Bharat","amount":300}}

3) Recognize Indian Hinglish patterns for GET_CUSTOMER_INFO (get all customer details):
   - "CUSTOMER_NAME ki sari jankari bata" (tell all info about customer) → GET_CUSTOMER_INFO
   - "CUSTOMER_NAME ka details" (customer details) → GET_CUSTOMER_INFO
   - "CUSTOMER_NAME ki information" (customer information) → GET_CUSTOMER_INFO
   - "CUSTOMER_NAME ki details bata" (tell customer details) → GET_CUSTOMER_INFO
   - "CUSTOMER_NAME ka pura record" (complete record of customer) → GET_CUSTOMER_INFO
   - "CUSTOMER_NAME ke baare mein batao" (tell about customer) → GET_CUSTOMER_INFO
   - "Bharat ki details" → GET_CUSTOMER_INFO
   - "Bharat ke baare mein" → GET_CUSTOMER_INFO
   - Example: "Bharat ki sari jankari bata" → {"intent":"GET_CUSTOMER_INFO","entities":{"customer":"Bharat"}}
   - Example: "भारत की डिटेल्स बताओ" (Hindi) → {"intent":"GET_CUSTOMER_INFO","entities":{"customer":"Bharat"}}

5) Recognize Indian Hinglish patterns for DELETE_CUSTOMER_DATA (permanent deletion):
   - "CUSTOMER_NAME ka data delete karo" (delete customer data) → DELETE_CUSTOMER_DATA
   - "CUSTOMER_NAME ke sare records delete kar do" (delete all records) → DELETE_CUSTOMER_DATA
   - "CUSTOMER_NAME ko completely remove karo" (remove customer completely) → DELETE_CUSTOMER_DATA
   - "CUSTOMER_NAME ka account delete karo" (delete account) → DELETE_CUSTOMER_DATA
   - Note: User will be asked for confirmation and OTP validation before deletion
   - Example: "Bharat ka data delete karo" → {"intent":"DELETE_CUSTOMER_DATA","entities":{"customer":"Bharat"}}

6) If user speaks references like "uska", "iska", "pichla customer", "same customer", set entities.customerRef = "active".
7) If user says landmark style like "Bharat ATM wala" or "Bharat Agra wala", keep full phrase in entities.customer.
8) For CREATE_CUSTOMER, map name to entities.name and optional amount to entities.amount.
9) For UPDATE_CUSTOMER_PHONE, extract customer name to entities.customer and phone digits to entities.phone (e.g., "9568926253").
10) If user speaks phone as digits like "नाइन फाइव सिक्स एट नाइन टू सिक्स टू फाइव थ्री", convert to "9568926253" in entities.phone.
11) Keep customer text concise and exact; do not translate names.
12) If customer is clearly present, always return entities.customer (except CREATE_CUSTOMER where entities.name is primary).
13) Always extract numeric amounts for ADD_CREDIT and RECORD_PAYMENT.

Respond ONLY with valid JSON. No other text.

Example responses:
{"intent":"ADD_CREDIT","entities":{"customer":"Bharat","amount":500},"confidence":0.95}
{"intent":"RECORD_PAYMENT","entities":{"customer":"Bharat","amount":300},"confidence":0.94}
{"intent":"RECORD_PAYMENT","entities":{"customer":"Rahul","amount":200},"confidence":0.92}
{"intent":"CREATE_INVOICE","entities":{"customer":"Rahul","items":[{"product":"milk","quantity":2},{"product":"bread","quantity":1}]},"confidence":0.95}
{"intent":"UPDATE_CUSTOMER_PHONE","entities":{"customer":"Bharat","phone":"9568926253"},"confidence":0.92}
{"intent":"GET_CUSTOMER_INFO","entities":{"customer":"Bharat"},"confidence":0.93}
{"intent":"DELETE_CUSTOMER_DATA","entities":{"customer":"Bharat","confirmation":"delete"},"confidence":0.92}`;

      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 300,
      });

      this.recordUsage('extract_intent', 'UNKNOWN', response, 'miss');

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content);
      const entities = await this.normalizeEntities(parsed.entities || {}, transcript);

      return {
        intent: parsed.intent as IntentType,
        entities,
        confidence: parsed.confidence || 0.5,
        originalText: rawText || transcript,
        normalizedText: rawText ? transcript : undefined,
      };
    } catch (error) {
      logger.error({ error }, 'OpenAI intent extraction failed');
      return {
        intent: IntentType.UNKNOWN,
        entities: {},
        confidence: 0,
        originalText: rawText || transcript,
        normalizedText: rawText ? transcript : undefined,
      };
    }
  }

  /**
   * Transliterate Hindi/Devanagari text to English using LLM
   */
  private async transliterateHindiToEnglish(text: string): Promise<string> {
    if (!text || typeof text !== 'string') return text;

    // Check if text contains Devanagari characters (Unicode range: U+0900 to U+097F)
    const devanagariRegex = /[\u0900-\u097F]/;
    if (!devanagariRegex.test(text)) {
      return text; // No Devanagari, return as-is
    }

    try {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a name transliteration expert. Convert Hindi/Devanagari names and words to English phonetic equivalents. Respond with ONLY the transliterated name, nothing else.',
          },
          {
            role: 'user',
            content: `Transliterate this Hindi name to English: ${text}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 50,
      });

      this.recordUsage('transliterate_name', 'UNKNOWN', response, 'miss');

      return response.choices[0].message.content?.trim() || text;
    } catch (error) {
      logger.error({ error }, 'Hindi to English transliteration failed, using original text');
      return text;
    }
  }

  /**
   * Parse spoken phone number words (nine, five, six, eight...) to digits
   */
  private parseSpokenPhoneNumber(text: string): string | null {
    if (!text) return null;

    // English spoken numbers
    const englishNumbers: Record<string, string> = {
      zero: '0',
      one: '1',
      two: '2',
      three: '3',
      four: '4',
      five: '5',
      six: '6',
      seven: '7',
      eight: '8',
      nine: '9',
    };

    // Hindi spoken numbers (Devanagari)
    const hindiNumbers: Record<string, string> = {
      शून्य: '0',
      'ज़ीरो': '0',
      एक: '1',
      'वन': '1',
      दो: '2',
      'टु': '2',
      तीन: '3',
      'थ्री': '3',
      चार: '4',
      'फोर': '4',
      पाँच: '5',
      'फाइव': '5',
      छः: '6',
      'सिक्स': '6',
      सात: '7',
      'सेवन': '7',
      आठ: '8',
      'एट': '8',
      नौ: '9',
      'नाइन': '9',
    };

    let result = '';
    let words = text
      .toLowerCase()
      .split(/[\s\-\.]+/)
      .filter((w) => w.length > 0);

    for (const word of words) {
      if (englishNumbers[word]) {
        result += englishNumbers[word];
      } else if (hindiNumbers[word]) {
        result += hindiNumbers[word];
      } else if (/^\d$/.test(word)) {
        result += word;
      }
    }

    // Validate result looks like a phone number (10-15 digits)
    if (result.length >= 10 && result.length <= 15 && /^\d+$/.test(result)) {
      return result;
    }

    return null;
  }

  private async normalizeEntities(entities: Record<string, any>, transcript: string): Promise<Record<string, any>> {
    const normalized = { ...entities };
    const text = transcript.toLowerCase();

    if (!normalized.customer && normalized.name) {
      normalized.customer = normalized.name;
    }

    // Transliterate Hindi names to English
    if (normalized.customer && typeof normalized.customer === 'string') {
      normalized.customer = await this.transliterateHindiToEnglish(normalized.customer);
    }
    if (normalized.name && typeof normalized.name === 'string') {
      normalized.name = await this.transliterateHindiToEnglish(normalized.name);
    }

    const activeRefPatterns = [
      /\buska\b/u,
      /\biska\b/u,
      /\bpichla\s+customer\b/u,
      /\bsame\s+customer\b/u,
      /\blast\s+customer\b/u,
      /\busi\b/u,
      /\busi\s+ko\b/u,
    ];

    if (activeRefPatterns.some((pattern) => pattern.test(text))) {
      normalized.customerRef = 'active';
    }

    if (normalized.amount !== undefined && typeof normalized.amount === 'string') {
      const numericAmount = parseFloat(normalized.amount.replace(/[^0-9.]/g, ''));
      if (!Number.isNaN(numericAmount)) {
        normalized.amount = numericAmount;
      }
    }

    // Parse spoken phone numbers (e.g., "नाइन फाइव सिक्स एट..." → "9568...")
    if (normalized.phone && typeof normalized.phone === 'string') {
      const parsedPhone = this.parseSpokenPhoneNumber(normalized.phone);
      if (parsedPhone) {
        normalized.phone = parsedPhone;
      }
    }

    return normalized;
  }

  /**
   * Normalize a raw transcript into clean, context-aware text
   */
  async normalizeTranscript(rawText: string): Promise<string> {
    try {
      const systemPrompt = `You are a transcription normalization assistant for Hindi/English mixed speech.
Clean up filler words, fix obvious ASR errors, and normalize numbers and product names when possible.
Keep the meaning identical and keep the text concise.
Respond with plain text only (no JSON, no quotes).`;

      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawText },
        ],
        temperature: 0.2,
        max_tokens: 200,
      });

      this.recordUsage('normalize_transcript', 'UNKNOWN', response, 'miss');

      return response.choices[0].message.content?.trim() || rawText;
    } catch (error) {
      logger.error({ error }, 'OpenAI transcript normalization failed');
      return rawText;
    }
  }

  /**
   * Generate natural language response from execution result
   */
  async generateResponse(
    executionResult: ExecutionResult,
    originalIntent: string,
    conversationId?: string
  ): Promise<string> {
    try {
      // Inject conversation history for coherent multi-turn responses
      let conversationContext = '';
      if (conversationId) {
        conversationContext = conversationMemory.getFormattedContext(conversationId, 6);
      }

      const runtimeConfig = getRuntimeConfig();
      const intentKey = originalIntent as IntentType;
      const cachePolicy = runtimeConfig.llm.responseCachePolicy[intentKey];
      const cacheKey = cachePolicy
        ? this.buildResponseCacheKey(intentKey, executionResult, conversationContext, cachePolicy.scope)
        : null;

      if (cacheKey) {
        const cached = await llmCache.get(cacheKey);
        if (cached) {
          llmRequestsTotal.inc({ model: config.openai.model, operation: 'generate_response', intent: intentKey, cache: 'hit' });
          return cached;
        }
      }

      const systemPrompt = `You are a friendly Indian business assistant speaking in Hinglish (English names/numbers mixed with Hindi).

${conversationContext}
Use the conversation history above to generate coherent responses that reference earlier context when relevant.

CRITICAL RULES FOR RESPONSE:
1) ALWAYS use English for customer names, product names, and numbers (NOT Hindi numerals).
2) Use Hindi verbs and structure: "Bharat ko 500 add karo", "Rahul ka balance 300 hai", "milk ka stock 120 hai"
3) Keep mixing natural: avoid full sentences in pure Hindi or pure English.
4) If customer not found, respond: "Bharat ka record nahi mil raha. Name confirm karo ya naya customer add kar du?"
5) For errors, use friendly Hinglish: "Lag raha hai phone number nahi hai. Add kar du first?"
6) For ambiguity, ask: "Bharat ATM wala ya Agra wala? Batao na?"

Examples:
- "Theek hai. Rahul ke liye 500 ka reminder kal 7 PM bhej denge. Phone confirm hai?"
- "Bill ban gaya. Total 120 hai. Bharat se payment le liya?"
- "Bharat ka balance 300 remaining hai. Usko 200 add karu?"
- "Milk ka stock 10 packets hai abhi. Order karna hai?"
- "Naya customer Rajesh add kar diya. Phone number update kar du isme baad me?"
- "Bharat ATM wala ya Agra wala? Batao na."
- "Bharat ka record nahi mil raha. Name confirm karo?"`;

      const userPrompt = `Original intent: ${originalIntent}
Result: ${JSON.stringify(executionResult)}

Generate Hinglish response (English names/numbers + Hindi grammar/verbs):`;

      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: this.getResponseTokenLimit(intentKey),
      });

      this.recordUsage('generate_response', intentKey, response, 'miss');

      const finalText = response.choices[0].message.content?.trim() || 'Theek hai.';

      if (cacheKey && cachePolicy) {
        await llmCache.set(cacheKey, finalText, cachePolicy.ttlSeconds);
      }

      return finalText;
    } catch (error) {
      logger.error({ error }, 'OpenAI response generation failed');
      return 'Theek hai.';
    }
  }

  /**
   * Generate confirmation question
   */
  async generateConfirmation(action: string, details: any): Promise<string> {
    try {
      const prompt = `Generate a Hindi/English confirmation question for: ${action}
Details: ${JSON.stringify(details)}
Keep it very short and natural.`;

      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 100,
      });

      this.recordUsage('generate_confirmation', 'UNKNOWN', response, 'miss');

      return response.choices[0].message.content?.trim() || 'Confirm karein?';
    } catch (error) {
      logger.error({ error }, 'OpenAI confirmation generation failed');
      return 'Confirm karein?';
    }
  }
}

export const openaiService = new OpenAIService();
