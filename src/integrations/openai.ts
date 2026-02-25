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
  private groqClient: OpenAI | null = null;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    // Groq: OpenAI-compatible API with LPU hardware — ~150ms vs ~1400ms from India
    if (config.groq.apiKey) {
      this.groqClient = new OpenAI({
        apiKey: config.groq.apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      logger.info('Groq client initialized — fast response generation enabled');
    } else {
      logger.warn('GROQ_API_KEY not set — falling back to OpenAI for response generation (~1400ms)');
    }
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
        conversationContext = await conversationMemory.getFormattedContext(conversationId, 6);
      }

      const systemPrompt = `You are an intent extraction system for an Indian SME business assistant.
15) Recognize Hindi/English patterns for total pending payment queries:
  - "total pending payment kitna hai", "टोटल पेंडिंग पेमेंट कितना है", "pending amount batao", "pending balance kitna hai", "kitna paisa baki hai", "sab ka total baki kitna hai", "total kitna baki hai", "total pending kitna hai", "pending kitna hai", "pending payment kitna hai", "pending balance kitna hai", "pending amount kitna hai", "total baki kitna hai", "total amount pending hai", "total payment pending hai", "total balance pending hai" → TOTAL_PENDING_AMOUNT
  - Example: "टोटल पेंडिंग पेमेंट कितना है" → {"intent":"TOTAL_PENDING_AMOUNT","entities":{},"confidence":0.98}
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
- CREATE_INVOICE: Creating bill/invoice for customer (shows draft first, waits for CONFIRM_INVOICE)
- CONFIRM_INVOICE: User confirms pending invoice draft ("haan", "confirm", "theek hai", "ok", "bhej do", "bana do")
- SHOW_PENDING_INVOICE: Show current pending/draft invoice details ("bill dikhao", "draft dikhao", "kitna hua")
- TOGGLE_GST: Toggle GST on/off for pending invoice draft ("GST add karo", "GST hata do", "with GST", "without GST")
- CREATE_REMINDER: Schedule payment reminder
- RECORD_PAYMENT: Customer made a payment
- ADD_CREDIT: Add credit/debt to customer account
- CHECK_BALANCE: Check customer balance
- CHECK_STOCK: Check product stock
- CANCEL_INVOICE: Cancel a confirmed invoice OR a pending draft.
  "sab bills cancel karo" / "sabhi drafts cancel" / "sab cancel kar do" → CANCEL_INVOICE with entities.cancelAll=true
  "Rahul ka bill cancel karo" → CANCEL_INVOICE with entities.customer="Rahul"
- CANCEL_REMINDER: Cancel a reminder
- LIST_REMINDERS: List pending reminders
- CREATE_CUSTOMER: Add new customer
- MODIFY_REMINDER: Change reminder time
- DAILY_SUMMARY: Get daily sales summary
- START_RECORDING: Start voice recording
- STOP_RECORDING: Stop voice recording
- UPDATE_CUSTOMER: Update any customer field (phone, email, name, address, GSTIN, PAN, notes, etc.)
- UPDATE_CUSTOMER_PHONE: Update customer phone number (WhatsApp, mobile) — alias for UPDATE_CUSTOMER
- GET_CUSTOMER_INFO: Get all customer information (name, phone, balance, status)
- DELETE_CUSTOMER_DATA: Delete all customer data permanently with confirmation and OTP
- SWITCH_LANGUAGE: Change the TTS/response language (entities.language = BCP-47 code)
- LIST_CUSTOMER_BALANCES: List all customers who have pending balance
- TOTAL_PENDING_AMOUNT: Get total outstanding amount owed by all customers
- PROVIDE_EMAIL: User is providing an email address (after being asked, or to save/update on customer record)
- SEND_INVOICE: User explicitly says where to send (email X / WhatsApp Y) — entities.email or entities.phone + entities.channel
- UNKNOWN: Cannot determine intent

Critical extraction rules for Indian voice patterns:
1) Recognize Indian Hinglish patterns for ADD_CREDIT:
   - "CUSTOMER_NAME ka AMOUNT add karo" → ADD_CREDIT
   - "CUSTOMER_NAME ko AMOUNT add kar do" → ADD_CREDIT
   - "CUSTOMER_NAME ke mein AMOUNT likh do" (write in ledger) → ADD_CREDIT
   - "CUSTOMER_NAME ka AMOUNT likh do" (note/record in ledger) → ADD_CREDIT
   - "CUSTOMER_NAME ko AMOUNT likh do" → ADD_CREDIT
   - "CUSTOMER_NAME ka AMOUNT note karo" → ADD_CREDIT
   - "CUSTOMER_NAME ko AMOUNT udhaar do" (give credit) → ADD_CREDIT
   - CRITICAL: "likh do/likh dena/note karo" with a customer name + amount = ADD_CREDIT (ledger entry), NOT CREATE_INVOICE
   - Example: "Bharat ka 500 add karo" → {"intent":"ADD_CREDIT","entities":{"customer":"Bharat","amount":500}}
   - Example: "Bharat ke mein 400 likh do" → {"intent":"ADD_CREDIT","entities":{"customer":"Bharat","amount":400}}
   - Example: "Bharat ka 400 likh do" → {"intent":"ADD_CREDIT","entities":{"customer":"Bharat","amount":400}}

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
11) ALL text values in the JSON response must be in Roman/English characters — never Devanagari/Hindi script. Transliterate to English phonetics:
   - entities.customer, entities.name → "राहुल"→"Rahul", "भारत"→"Bharat"
   - entities.items[].product → "चीनी"→"cheeni", "आटा/आटे"→"aata", "दूध/दूध"→"doodh", "चावल"→"chawal", "तेल"→"tel", "नमक"→"namak", "दाल"→"dal", "बिस्किट"→"biscuit", "साबुन"→"sabun", "शक्कर"→"shakkar"
   - For unknown product names in Devanagari, transliterate phonetically (match how the shopkeeper would likely write it in Roman script)
   - NEVER output Devanagari characters anywhere in the JSON
12) If customer is clearly present, always return entities.customer (except CREATE_CUSTOMER where entities.name is primary).
13) Always extract numeric amounts for ADD_CREDIT and RECORD_PAYMENT.
14) Recognize DAILY_SUMMARY patterns in Hindi and English:
   - "aaj ka summary", "daily summary", "aaj ki report", "aaj ka hisaab", "aaj kitna hua"
   - "आज का समरी", "आज का समरी बताओ", "डेली समरी", "आज की रिपोर्ट", "आज का हिसाब बताओ"
   - "aaj ka business summary", "daily report batao", "aaj ka sales batao", "sales report"
   - "aaj kitna bikaa", "aaj kitna mila", "aaj ka total", "din ka summary"
   - Example: "आज का समरी बताओ" → {"intent":"DAILY_SUMMARY","entities":{}}
   - Example: "daily report batao" → {"intent":"DAILY_SUMMARY","entities":{}}

15) Recognize SWITCH_LANGUAGE in ANY language — user wants to change response language:
   - Language code mapping: hi=Hindi/Hinglish, hi-en=Hinglish (explicit), en=English, bn=Bengali/Bangla, ta=Tamil,
     te=Telugu, mr=Marathi, gu=Gujarati, kn=Kannada, pa=Punjabi, ml=Malayalam,
     ur=Urdu, ar=Arabic, es=Spanish, fr=French, de=German, ja=Japanese, zh=Chinese
   - "Switch to Tamil" → {"intent":"SWITCH_LANGUAGE","entities":{"language":"ta"}}
   - "Bengali mein bolo" (Hindi: speak in Bengali) → {"intent":"SWITCH_LANGUAGE","entities":{"language":"bn"}}
   - "English mode" → {"intent":"SWITCH_LANGUAGE","entities":{"language":"en"}}
   - "தமிழில் பேசு" (Tamil: speak in Tamil) → {"intent":"SWITCH_LANGUAGE","entities":{"language":"ta"}}
   - "اردو میں بولو" (Urdu: speak in Urdu) → {"intent":"SWITCH_LANGUAGE","entities":{"language":"ur"}}
   - "hinglish mein bolo" / "change language to hinglish" / "hinglish mode" → {"intent":"SWITCH_LANGUAGE","entities":{"language":"hi-en"}}
   - Any phrase meaning "change language to X" in any language → SWITCH_LANGUAGE

16) Recognize complex CREATE_INVOICE with multiple items, Hindi numbers and units:
   - Hindi number words → digits: "ek"=1, "do"=2, "teen"=3, "char"=4, "paanch"=5, "chhe"=6, "saat"=7, "aath"=8, "nau"=9, "das"=10
   - Items may be separated by comma or "aur" (and)
   - Units like "kilo/kg", "liter/litre/litr", "packet/pack/pkt", "piece/pcs/pice" can appear with item names — keep unit in productName
   - "Rahul ke liye do kilo chawal aur teen packet biscuit ka bill banao" → CREATE_INVOICE, items: [{product:"chawal",quantity:2},{product:"biscuit",quantity:3}]
   - "Sunny ka bill: 1 bread, 2 milk, 3 egg" → CREATE_INVOICE, items: [{product:"bread",quantity:1},{product:"milk",quantity:2},{product:"egg",quantity:3}]
   - "Ek liter doodh, do kilo aata, paanch anda Priya ke liye bill" → CREATE_INVOICE, entities.customer="Priya", 3 items
   - For items without quantity, default quantity = 1
   - Always output entities.items as array of {product, quantity} objects; quantities must be numbers
   - SINGLE-COMMAND SEND: if user says "banao aur bhej do" / "seedha bhej do" / "direct send" / "confirm karke bhej do" in the SAME utterance as the items list → add entities.autoSend=true. This skips the draft confirmation step and sends immediately.
   - "Rahul ka 4 kg chawal ka bill banao aur bhej do" → CREATE_INVOICE, autoSend=true
   - "Priya ke liye doodh 2 aur aata 5 ka bill seedha bhej do" → CREATE_INVOICE, autoSend=true
   - autoSend=true ONLY when items are present in the SAME command — never set it from a standalone "bhej do" (that is CONFIRM_INVOICE)

17) Recognize PROVIDE_EMAIL — user is giving an email address:
   - Spoken email: "rahul at gmail dot com" → "rahul@gmail.com", "info at shop dot in" → "info@shop.in"
   - Convert "dot" → ".", "at" → "@", "underscore" → "_", "dash/hyphen" → "-"
   - Also recognise direct typed email (already contains @)
   - "mera email rahul@gmail.com hai" → PROVIDE_EMAIL, entities.email="rahul@gmail.com"
   - "rahul at gmail dot com" → PROVIDE_EMAIL, entities.email="rahul@gmail.com"
   - "iska email bhej do info at myshop dot in" → PROVIDE_EMAIL, entities.email="info@myshop.in"
   - ONLY use this intent when the user is explicitly providing/sharing an email address; do NOT use if they are asking to check a balance or add credit that coincidentally contains digits resembling an address

18) Recognize CONFIRM_INVOICE — user confirms a pending invoice draft:
   - CRITICAL: Use this intent when context shows ⚠️ PENDING INVOICE or 📧 PENDING SEND CONFIRMATION
   - "haan", "haan banao", "confirm karo", "theek hai", "ok", "kar do", "bhej do", "bana do" → CONFIRM_INVOICE
   - "haan bhej do", "same hi raho", "bilkul", "sahi hai" → CONFIRM_INVOICE
   - MULTI-DRAFT: Context may show multiple ⚠️ PENDING INVOICES — in that case:
     * "haan" / "confirm" without a customer name → CONFIRM_INVOICE with NO entities (engine will ask which one)
     * "Rahul ka confirm karo" / "Rahul wala confirm" → CONFIRM_INVOICE with entities.customer="Rahul"
     * "pehla confirm karo" / "pehle wala" → CONFIRM_INVOICE with entities.customer = name of FIRST listed draft
   - Do NOT use CONFIRM_INVOICE if no pending invoice is in context — treat as UNKNOWN or the most likely intent
   - Example: (single draft) "haan" → {"intent":"CONFIRM_INVOICE","entities":{},"confidence":0.97}
   - Example: "confirm karo" → {"intent":"CONFIRM_INVOICE","entities":{},"confidence":0.97}
   - Example: (multiple drafts) "Rahul ka confirm karo" → {"intent":"CONFIRM_INVOICE","entities":{"customer":"Rahul"},"confidence":0.97}
   - Example: (multiple drafts) "pehla wala" → {"intent":"CONFIRM_INVOICE","entities":{"customer":"<first listed customer name>"},"confidence":0.93}

19) Recognize SHOW_PENDING_INVOICE — user wants to see current draft/pending bill:
   - "bill dikhao", "draft dikhao", "pending bill kya hai", "kitna hua", "kya likha hai", "summary dikhao" → SHOW_PENDING_INVOICE
   - "abhi ka bill batao", "draft batao", "kya banaya hai", "bill mein kya hai" → SHOW_PENDING_INVOICE
   - Example: "draft dikhao" → {"intent":"SHOW_PENDING_INVOICE","entities":{},"confidence":0.95}

20) Recognize TOGGLE_GST — user wants to add or remove GST from pending invoice draft:
   - "GST add karo", "GST lagao", "GST ke saath banao", "with GST" → TOGGLE_GST, entities.withGst=true
   - "GST hata do", "bina GST ke", "without GST", "GST mat lagao" → TOGGLE_GST, entities.withGst=false
   - If context already has GST on and user says "GST hata do", set entities.withGst=false
   - If context already has GST off and user says "GST lagao", set entities.withGst=true
   - Example: "GST add karo" → {"intent":"TOGGLE_GST","entities":{"withGst":true},"confidence":0.95}
   - Example: "bina GST ke" → {"intent":"TOGGLE_GST","entities":{"withGst":false},"confidence":0.95}

21) Recognize UPDATE_CUSTOMER — user wants to update any customer detail:
   - Phone: "CUSTOMER ka phone XXXXXXXXXX karo", "CUSTOMER ka number change karo" → UPDATE_CUSTOMER, entities.phone
   - Email: "CUSTOMER ka email X@Y.com save karo" → UPDATE_CUSTOMER, entities.email
   - Name: "CUSTOMER ka naam change karo to NEWNAME" → UPDATE_CUSTOMER, entities.name=NEWNAME
   - Nickname: "CUSTOMER ka nickname set karo NICK" → UPDATE_CUSTOMER, entities.nickname
   - Address: "CUSTOMER ka address update karo ADDR" → UPDATE_CUSTOMER, entities.landmark/area/city/pincode
   - GSTIN: "CUSTOMER ka GSTIN XXXXXXXX hai" → UPDATE_CUSTOMER, entities.gstin
   - PAN: "CUSTOMER ka PAN XXXXXXXXXX hai" → UPDATE_CUSTOMER, entities.pan
   - Notes: "CUSTOMER ke baare mein note karo TEXT" → UPDATE_CUSTOMER, entities.notes
   - Example: "Rahul ka phone 9876543210 update karo" → {"intent":"UPDATE_CUSTOMER","entities":{"customer":"Rahul","phone":"9876543210"},"confidence":0.94}
   - Example: "Priya ka email priya@gmail.com save karo" → {"intent":"UPDATE_CUSTOMER","entities":{"customer":"Priya","email":"priya@gmail.com"},"confidence":0.94}
   - Example: "Suresh ka GSTIN 07AABCU9603R1ZP hai" → {"intent":"UPDATE_CUSTOMER","entities":{"customer":"Suresh","gstin":"07AABCU9603R1ZP"},"confidence":0.93}

Also include a "normalized" field: a cleaned version of the input transcript — remove filler words (um, uh, acha suno, haan ji), fix obvious ASR errors, convert spoken numbers to digits. Keep meaning identical.

Respond ONLY with valid JSON. No other text.

Example responses:
{"normalized":"Bharat ka 500 add karo","intent":"ADD_CREDIT","entities":{"customer":"Bharat","amount":500},"confidence":0.95}
{"normalized":"Bharat ka 300 aa gaya","intent":"RECORD_PAYMENT","entities":{"customer":"Bharat","amount":300},"confidence":0.94}
{"normalized":"Rahul ka 200 mil gaya","intent":"RECORD_PAYMENT","entities":{"customer":"Rahul","amount":200},"confidence":0.92}
{"normalized":"Rahul ke liye 2 milk 1 bread ka bill banao","intent":"CREATE_INVOICE","entities":{"customer":"Rahul","items":[{"product":"milk","quantity":2},{"product":"bread","quantity":1}]},"confidence":0.95}
{"normalized":"Bharat ka phone 9568926253 update karo","intent":"UPDATE_CUSTOMER_PHONE","entities":{"customer":"Bharat","phone":"9568926253"},"confidence":0.92}
{"normalized":"Bharat ki details batao","intent":"GET_CUSTOMER_INFO","entities":{"customer":"Bharat"},"confidence":0.93}
{"normalized":"Bharat ka data delete karo","intent":"DELETE_CUSTOMER_DATA","entities":{"customer":"Bharat","confirmation":"delete"},"confidence":0.92}
{"normalized":"switch to Tamil","intent":"SWITCH_LANGUAGE","entities":{"language":"ta"},"confidence":0.98}
{"normalized":"Bengali mein bolo","intent":"SWITCH_LANGUAGE","entities":{"language":"bn"},"confidence":0.97}
{"normalized":"English mode","intent":"SWITCH_LANGUAGE","entities":{"language":"en"},"confidence":0.98}
{"normalized":"aaj ka summary batao","intent":"DAILY_SUMMARY","entities":{},"confidence":0.97}
{"normalized":"daily report batao","intent":"DAILY_SUMMARY","entities":{},"confidence":0.97}
{"normalized":"Rahul ke liye 2 kilo chawal aur 3 packet biscuit ka bill banao","intent":"CREATE_INVOICE","entities":{"customer":"Rahul","items":[{"product":"chawal","quantity":2},{"product":"biscuit","quantity":3}]},"confidence":0.96}
{"normalized":"Priya ka bill: 1 liter doodh, 2 kilo aata, 5 anda","intent":"CREATE_INVOICE","entities":{"customer":"Priya","items":[{"product":"doodh","quantity":1},{"product":"aata","quantity":2},{"product":"anda","quantity":5}]},"confidence":0.95}
{"normalized":"Rahul ka 4 kg chawal aur 6 kg aata ka bill banao aur bhej do","intent":"CREATE_INVOICE","entities":{"customer":"Rahul","items":[{"product":"chawal","quantity":4},{"product":"aata","quantity":6}],"autoSend":true},"confidence":0.96}
{"normalized":"Priya ke liye 2 doodh 3 biscuit seedha bhej do","intent":"CREATE_INVOICE","entities":{"customer":"Priya","items":[{"product":"doodh","quantity":2},{"product":"biscuit","quantity":3}],"autoSend":true},"confidence":0.95}
{"normalized":"mera email rahul@gmail.com hai","intent":"PROVIDE_EMAIL","entities":{"email":"rahul@gmail.com"},"confidence":0.97}
{"normalized":"rahul at gmail dot com","intent":"PROVIDE_EMAIL","entities":{"email":"rahul@gmail.com"},"confidence":0.96}
{"normalized":"haan confirm karo","intent":"CONFIRM_INVOICE","entities":{},"confidence":0.97}
{"normalized":"theek hai bana do","intent":"CONFIRM_INVOICE","entities":{},"confidence":0.97}
{"normalized":"haan bhej do","intent":"CONFIRM_INVOICE","entities":{},"confidence":0.96}
{"normalized":"draft dikhao","intent":"SHOW_PENDING_INVOICE","entities":{},"confidence":0.95}
{"normalized":"pending bill kya hai","intent":"SHOW_PENDING_INVOICE","entities":{},"confidence":0.95}
{"normalized":"GST add karo","intent":"TOGGLE_GST","entities":{"withGst":true},"confidence":0.95}
{"normalized":"bina GST ke banao","intent":"TOGGLE_GST","entities":{"withGst":false},"confidence":0.95}
{"normalized":"Rahul ka phone 9876543210 update karo","intent":"UPDATE_CUSTOMER","entities":{"customer":"Rahul","phone":"9876543210"},"confidence":0.94}
{"normalized":"Priya ka email priya@gmail.com save karo","intent":"UPDATE_CUSTOMER","entities":{"customer":"Priya","email":"priya@gmail.com"},"confidence":0.94}
{"normalized":"Suresh ka GSTIN 07AABCU9603R1ZP hai","intent":"UPDATE_CUSTOMER","entities":{"customer":"Suresh","gstin":"07AABCU9603R1ZP"},"confidence":0.93}
{"normalized":"Rahul ka bill confirm karo","intent":"CONFIRM_INVOICE","entities":{"customer":"Rahul"},"confidence":0.97}
{"normalized":"Mohan wala confirm","intent":"CONFIRM_INVOICE","entities":{"customer":"Mohan"},"confidence":0.96}
{"normalized":"Mohan ka bill dikhao","intent":"SHOW_PENDING_INVOICE","entities":{"customer":"Mohan"},"confidence":0.95}
{"normalized":"sab bills cancel kar do","intent":"CANCEL_INVOICE","entities":{"cancelAll":true},"confidence":0.95}
{"normalized":"Rahul ka bill cancel karo","intent":"CANCEL_INVOICE","entities":{"customer":"Rahul"},"confidence":0.96}`;

      // gpt-4o-mini for intent: strict JSON format requires a model that reliably follows it.
      // Groq/llama is fast but cannot follow the complex 13-rule intent prompt accurately.
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 200,
      });

      this.recordUsage('extract_intent', 'UNKNOWN', response, 'miss');

      const content = response.choices[0].message.content || '{}';

      // Llama/Groq sometimes wraps JSON in markdown or adds a preamble — extract the object
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn({ content, provider: this.groqClient ? 'groq' : 'openai' }, 'Intent response contained no JSON object — raw content logged');
        throw new Error('No JSON object found in intent response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Normalize intent to UPPERCASE to handle models returning mixed-case values
      const rawIntent = (parsed.intent || 'UNKNOWN').toString().toUpperCase().replace(/ /g, '_');
      const intent = Object.values(IntentType).includes(rawIntent as IntentType)
        ? (rawIntent as IntentType)
        : IntentType.UNKNOWN;

      logger.debug({ rawIntent, intent }, 'Intent parsed');

      const entities = await this.normalizeEntities(parsed.entities || {}, transcript);

      return {
        intent,
        entities,
        confidence: parsed.confidence || 0.5,
        originalText: rawText || transcript,
        normalizedText: parsed.normalized || transcript,
      };
    } catch (error) {
      logger.error({ error }, 'Intent extraction failed');
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
        model: 'gpt-4o-mini',
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
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawText },
        ],
        temperature: 0.2,
        max_tokens: 100,
      });

      this.recordUsage('normalize_transcript', 'UNKNOWN', response, 'miss');

      return response.choices[0].message.content?.trim() || rawText;
    } catch (error) {
      logger.error({ error }, 'OpenAI transcript normalization failed');
      return rawText;
    }
  }

  /**
   * Map a BCP-47 language code to a response style description for the LLM prompt.
   */
  private getLangStyle(code: string): string {
    const styles: Record<string, string> = {
      hi: 'Hinglish (Hindi verbs + English names/numbers)',
      'hi-en': 'Hinglish (Hindi verbs + English names/numbers)',
      en: 'English',
      bn: 'Bengali',
      ta: 'Tamil',
      te: 'Telugu',
      mr: 'Marathi',
      gu: 'Gujarati',
      kn: 'Kannada',
      pa: 'Punjabi',
      ml: 'Malayalam',
      ur: 'Urdu',
      ar: 'Arabic',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      ja: 'Japanese',
      zh: 'Chinese',
      pt: 'Portuguese',
    };
    return styles[code] ?? 'Hinglish (Hindi verbs + English names/numbers)';
  }

  /**
   * Generate natural language response from execution result
   */
  async generateResponse(
    executionResult: ExecutionResult,
    originalIntent: string,
    conversationId?: string,
    onChunk?: (chunk: string) => void,
    options?: { userLanguage?: string }
  ): Promise<string> {
    try {
      const runtimeConfig = getRuntimeConfig();
      const intentKey = originalIntent as IntentType;
      const cachePolicy = runtimeConfig.llm.responseCachePolicy[intentKey];
      const cacheKey = cachePolicy
        ? this.buildResponseCacheKey(intentKey, executionResult, undefined, cachePolicy.scope)
        : null;

      // Groq for response generation: free-form text where llama-3.3-70b excels,
      // and Groq LPU hardware gives ~200ms vs ~1400ms from India to OpenAI.
      const responseClient = this.groqClient ?? this.client;
      const responseModel = this.groqClient ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

      if (cacheKey) {
        const cached = await llmCache.get(cacheKey);
        if (cached) {
          llmRequestsTotal.inc({ model: responseModel, operation: 'generate_response', intent: intentKey, cache: 'hit' });
          if (onChunk) onChunk(cached);
          return cached;
        }
      }

      const langStyle = this.getLangStyle(options?.userLanguage ?? 'hi');

      const systemPrompt = `You are a voice assistant for an Indian shop. Respond in ${langStyle}.

BREVITY — MOST IMPORTANT RULE:
- MAX 1 sentence for simple results (balance, payment, credit, stock).
- MAX 2 sentences only if you need to ask a follow-up.
- NEVER say the same information twice.
- NO filler endings: no "theek hai?", no "aur kuch?", no "check ho gaya".

FORMAT RULES:
- Always use English for customer names and numbers (regardless of response language).
- CRITICAL: Always use ₹ (Indian Rupee symbol) for ALL monetary amounts. NEVER use $ or USD.
- Customer not found: tell the user the name was not found and ask to confirm.
- Multiple matches: list the options briefly.
- INVOICE ITEMS (TTS rule): Say items as "quantity unit productName ₹total" using the unit from the product record — e.g. "4 kg Cheeni ₹180", "2 piece Arhar Dal ₹260". NEVER use ×, @, = symbols — TTS reads them as "cross", "at the rate of", "equals" which sounds robotic. Flag auto-created (₹0) products with "⚠️ naya".

Examples (1–2 sentences, no filler):
- CHECK_BALANCE → "Nitin ka balance ₹1000 hai." (Hinglish) / "Nitin's balance is ₹1000." (English)
- RECORD_PAYMENT → "Rahul se ₹500 mila. Remaining ₹300 hai."
- ADD_CREDIT → "Bharat ko ₹400 add kar diya. Total ₹900 hai."
- CREATE_INVOICE (single draft) → "Rahul ka draft bill: 4 kg Cheeni ₹180, 6 kg Aata ₹240. Total ₹420. Confirm karna hai?"
- CREATE_INVOICE (added to queue, other drafts exist) → "Suresh ka draft bill: 2 piece Arhar Dal ₹260. Total ₹260. Confirm karna hai? (2 aur bills bhi pending hain: Rahul, Mohan)"
- CONFIRM_INVOICE (single / targeted) → "Rahul ka bill confirm ho gaya. Invoice #0042. Total ₹420."
- CONFIRM_INVOICE (after confirming one from multiple, others still pending) → "Rahul ka bill confirm ho gaya. Invoice #0042. Total ₹420. Mohan aur Suresh ke bills abhi bhi pending hain."
- MULTIPLE_PENDING_INVOICES error (engine couldn't pick one) → "Aapke 3 pending bills hain: Rahul ₹500, Mohan ₹300, Suresh ₹200. Kaunsa confirm karein? Customer ka naam batao."
- SHOW_PENDING_INVOICE (single) → "Rahul ka pending bill: 4 kg Cheeni ₹180, 6 kg Aata ₹240. Total ₹420. Confirm karna hai?"
- SHOW_PENDING_INVOICE (multiple) → "2 pending bills hain:\n1. Rahul: 4 kg Cheeni ₹180, 6 kg Aata ₹240 — Total ₹420\n2. Mohan: 6 kg Aata ₹240 — Total ₹240\nKaunsa confirm karna hai?"
- CHECK_STOCK → "Milk ka stock 10 packets hai."
- CREATE_CUSTOMER → "Rajesh add ho gaya."
- NOT_FOUND → "Nitin ka record nahi mila. Naam confirm karo."
- PROVIDE_EMAIL → "Invoice ₹420 ka email bhej diya gaya."

MULTI-DRAFT RULES:
- When result.data.pendingInvoices has >1 items AND result.data.awaitingSelection=true → list all drafts and ask which to confirm.
- When result.data.pendingInvoices has >0 items remaining after a confirmation → mention how many still pending.
- When result.data.pendingInvoices is empty after confirmation → no mention needed (all done).`;

      const userPrompt = `Original intent: ${originalIntent}
Result: ${JSON.stringify(executionResult)}

Generate response in ${langStyle} (always use English for names and numbers):`;

      let finalText = '';
      let lastUsage: any = null;

      if (this.groqClient) {
        // Groq: non-streaming — avoids OpenAI-specific stream_options and iterator casting.
        // Still fast (~200ms) since Groq LPU processes tokens in parallel.
        const groqResponse = await responseClient.chat.completions.create({
          model: responseModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: this.getResponseTokenLimit(intentKey),
        });
        finalText = groqResponse.choices[0]?.message?.content?.trim() || '';
        lastUsage = groqResponse.usage;
        if (finalText && onChunk) onChunk(finalText); // deliver whole response at once
      } else {
        // OpenAI: stream tokens so client hears first words sooner
        const stream = await this.client.chat.completions.create({
          model: responseModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: this.getResponseTokenLimit(intentKey),
          stream: true,
          stream_options: { include_usage: true },
        });
        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content || '';
          if (token) {
            finalText += token;
            if (onChunk) onChunk(token);
          }
          if (chunk.usage) lastUsage = chunk.usage;
        }
        finalText = finalText.trim();
      }

      if (!finalText) {
        logger.warn({ responseModel, originalIntent }, 'generateResponse: got empty content from LLM');
        finalText = 'Theek hai.';
      }

      this.recordUsage('generate_response', intentKey, { usage: lastUsage, model: responseModel }, 'miss');

      // Never cache the fallback — it would poison all future requests for this intent
      if (cacheKey && cachePolicy && finalText !== 'Theek hai.') {
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
        model: 'gpt-4o-mini',
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
