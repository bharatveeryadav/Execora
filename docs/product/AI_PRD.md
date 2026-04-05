# Execora — AI and Voice Platform PRD

> **Consolidated reference for all AI, voice, LLM, conversation, and language intelligence in Execora.**
> Sources: `FEATURES.md`, `PRODUCT_REQUIREMENTS.md`, `STRATEGY_2026.md`, `PRODUCT_STRATEGY_2026.md`
> Last updated: 2026-03

---

## Table of Contents

1. [AI/Voice Build Status](#1-aivoice-build-status)
2. [Voice Assistant Pipeline — End-to-End](#2-voice-assistant-pipeline--end-to-end)
3. [Intent Recognition Engine](#3-intent-recognition-engine)
4. [Multi-Turn Invoice Flow](#4-multi-turn-invoice-flow)
5. [Redis Conversation Memory](#5-redis-conversation-memory)
6. [Shop-Level Draft Persistence](#6-shop-level-draft-persistence)
7. [Voice Engine Feature Requirements (F-06)](#7-voice-engine-feature-requirements-f-06)
8. [Three Execution Modes — Architecture Deep Dive](#8-three-execution-modes--architecture-deep-dive)
   - [Mode 1: Intent-Based (Current)](#mode-1-intent-based-mode-current-voice-implementation)
   - [Mode 2: Form/Dashboard (Classic UI)](#mode-2-formdashboard-mode-classic-ui)
   - [Mode 3: True AI Agent (Planned)](#mode-3-true-ai-agent-mode-planned--high-priority)
   - [Two-Agent Pattern](#two-agent-pattern-recommended-architecture-for-agent-mode)
   - [How to Add a New Feature to Agent Mode](#how-to-add-a-new-feature-to-agent-mode)
   - [Mode Comparison Matrix](#mode-comparison--full-matrix)
9. [All 35 Built Voice Intents](#9-all-35-built-voice-intents)
10. [Multi-Language and Hinglish Engine](#10-multi-language-and-hinglish-engine)
11. [Voice Engine Roadmap](#11-voice-engine-roadmap)
12. [Voice Billing on Mobile — UX Considerations](#12-voice-billing-on-mobile--ux-considerations)
13. [Competitive Strategy — Voice-First Moat](#13-competitive-strategy--voice-first-moat)

---

## 1. AI/Voice Build Status

### Voice & AI (7/8 built = 88%)

| Feature                                   | Status     | Notes                             |
| ----------------------------------------- | ---------- | --------------------------------- |
| 35 voice intents (Hindi/Hinglish)         | ✅ Shipped | `engine/index.ts` switch          |
| Voice payment recording                   | ✅ Shipped | RECORD_PAYMENT intent             |
| Voice customer lookup                     | ✅ Shipped | GET_CUSTOMER_INFO + CHECK_BALANCE |
| Voice stock check                         | ✅ Shipped | CHECK_STOCK intent                |
| Voice reminder creation                   | ✅ Shipped | CREATE_REMINDER intent            |
| Multi-turn conversation memory (Redis)    | ✅ Shipped | 4h TTL ConversationSession        |
| Devanagari number support                 | ✅ Shipped | `devanagari.ts` normalizer        |
| Deepgram STT + Browser WebSpeech fallback | ✅ Shipped |                                   |
| TTS (ElevenLabs / OpenAI / Browser)       | ✅ Shipped |                                   |
| True Agent Mode (Mode 3)                  | ❌ P2      | LLM tool-calling; planned Q3 2026 |

---

## 2. Voice Assistant Pipeline — End-to-End

### How It Works

Every voice interaction follows this exact pipeline:

```
1. Client opens WebSocket → server generates sessionId → sends VOICE_START
2. Client streams audio chunks → STT provider (Deepgram / ElevenLabs) transcribes
3. Final transcript sent to server
4. OpenAI normalizes the text (removes filler words, fixes ASR errors, transliterates Hindi)
5. OpenAI extracts intent + entities from the normalized text
   └─ Redis conversation history is injected into the prompt (last N turns)
6. BusinessEngine.execute() runs the intent
7. OpenAI generates a natural language voice response
8. TTS provider streams audio back to client
9. Turn is persisted to Redis (conversation memory) and DB (ConversationTurn)
```

### WebSocket Message Types

| Direction       | Type                | Payload                            |
| --------------- | ------------------- | ---------------------------------- |
| Server → Client | `voice:start`       | `{ sessionId }`                    |
| Client → Server | `voice:transcript`  | `{ text }` (partial)               |
| Server → Client | `voice:transcript`  | `{ text }` (echo)                  |
| Server → Client | `voice:intent`      | `{ intent, entities, confidence }` |
| Server → Client | `voice:response`    | `{ message, data }`                |
| Server → Client | `voice:tts-stream`  | Audio buffer                       |
| Client → Server | `recording:start`   | —                                  |
| Server → Client | `recording:started` | —                                  |

### Key Files

- `src/ws/handler.ts` — main WebSocket handler, session lifecycle
- `src/integrations/openai.ts` — `extractIntent()`, `generateResponse()`, `normalizeTranscript()`
- `src/integrations/stt/` — Deepgram and ElevenLabs STT adapters
- `src/integrations/tts/` — OpenAI and ElevenLabs TTS adapters

---

## 3. Intent Recognition Engine

### LLM-Powered Extraction

Intent extraction uses **GPT-4o-mini** with a structured prompt containing:

- 20+ extraction rules (Indian Hinglish patterns, GST flags, email parsing, etc.)
- Conversation history from Redis (last N turns for context)
- Pending invoice context injection (so "haan" → `CONFIRM_INVOICE` after a bill preview)
- Few-shot JSON examples for every intent

### All Supported Intents

| Intent                   | Trigger Examples                             | Key Entities                     |
| ------------------------ | -------------------------------------------- | -------------------------------- |
| `CREATE_INVOICE`         | "Rahul ka bill banao 2 chawal 1 cheeni"      | `customer`, `items[]`, `withGst` |
| `CONFIRM_INVOICE`        | "haan", "confirm", "theek hai", "bhej do"    | —                                |
| `CANCEL_INVOICE`         | "invoice cancel karo", "bill mat banao"      | —                                |
| `SHOW_PENDING_INVOICE`   | "pending invoice dikhao", "draft bill batao" | —                                |
| `TOGGLE_GST`             | "GST add karo", "GST hatao", "bina GST ke"   | `withGst: boolean`               |
| `RECORD_PAYMENT`         | "Rahul ne 500 diya", "payment liya"          | `customer`, `amount`             |
| `ADD_CREDIT`             | "Rahul ka 200 add karo", "likh do"           | `customer`, `amount`             |
| `CHECK_BALANCE`          | "Rahul ka balance", "kitna baaki hai"        | `customer`                       |
| `CHECK_STOCK`            | "chawal kitna bacha hai", "stock check"      | `product`                        |
| `CREATE_CUSTOMER`        | "naya customer Priya add karo"               | `name`, `phone`, `amount`        |
| `UPDATE_CUSTOMER_PHONE`  | "Rahul ka number change karo"                | `customer`, `phone`              |
| `GET_CUSTOMER_INFO`      | "Rahul ki details batao"                     | `customer`                       |
| `DELETE_CUSTOMER_DATA`   | "Rahul ka data delete karo"                  | `customer`                       |
| `CREATE_REMINDER`        | "kal Rahul ko 500 ka reminder bhejo"         | `customer`, `amount`, `datetime` |
| `MODIFY_REMINDER`        | "reminder change karo 2 bajkar"              | `customer`, `datetime`           |
| `CANCEL_REMINDER`        | "reminder cancel karo"                       | `customer`                       |
| `LIST_REMINDERS`         | "reminders dikhao", "aaj ke reminders"       | —                                |
| `PROVIDE_EMAIL`          | "rahul at gmail dot com"                     | `email`                          |
| `LIST_CUSTOMER_BALANCES` | "sabka balance dikhao"                       | —                                |
| `TOTAL_PENDING_AMOUNT`   | "total pending kitna hai"                    | —                                |
| `DAILY_SUMMARY`          | "aaj ka summary", "daily report"             | —                                |
| `SWITCH_LANGUAGE`        | "Hindi mein bolo", "English mode"            | `language` (BCP-47)              |
| `START_RECORDING`        | "recording start karo"                       | —                                |
| `STOP_RECORDING`         | "recording band karo"                        | —                                |
| `UNKNOWN`                | Fallback when intent is unclear              | —                                |

### Context-Aware Intent Injection

When a pending invoice draft exists in Redis, `getContextSummary()` injects this block into every intent extraction prompt:

```
⚠️  PENDING INVOICE (awaiting confirmation) for Rahul:
   Items: 2 chawal × ₹60 = ₹120, 1 cheeni × ₹50 = ₹50
   Total: ₹170
   → If the user says "haan / confirm / ok / theek hai / bhej do", use intent CONFIRM_INVOICE.
   → If the user says "nahi / cancel / mat banao", use intent CANCEL_INVOICE.
```

This ensures "haan" is classified as `CONFIRM_INVOICE` even if the LLM has no other context.

### Key Files

- `src/integrations/openai.ts` — full prompt, rules 1–20, few-shot examples
- `src/modules/voice/conversation.ts` — `getContextSummary()` injects pending invoice hint

---

## 4. Multi-Turn Invoice Flow

### Full Flow: Create → Confirm

```
Turn 1: "Rahul ka bill banao 2 chawal 1 cheeni"
  │
  ├─ executeCreateInvoice()
  │   ├─ Resolve customer (fuzzy match on "Rahul")
  │   ├─ Read entities.withGst (default: false)
  │   ├─ invoiceService.previewInvoice(customerId, items, withGst)
  │   │   ├─ findOrCreateProduct("chawal") → matches "Chawal" in DB
  │   │   ├─ findOrCreateProduct("cheeni") → matches "Cheeni" in DB
  │   │   └─ Returns resolvedItems[] with prices + GST (if withGst=true)
  │   ├─ Store draftPayload in Redis:
  │   │   ├─ conv:{sessionId}:mem → context.pendingInvoice = draftPayload
  │   │   └─ shop:{TENANT_ID}:pending_invoice = draftPayload (cross-session)
  │   └─ Return: "Rahul ka bill draft taiyar hai: ... Total ₹170. Confirm karo?"
  │
Turn 2: "haan confirm kar do"
  │
  ├─ executeConfirmInvoice()
  │   ├─ Load draft from Redis (session key → shop key fallback)
  │   ├─ invoiceService.confirmInvoice(customerId, resolvedItems)
  │   │   ├─ Create Invoice record in DB
  │   │   ├─ Create InvoiceItem records with GST fields
  │   │   ├─ Deduct stock (StockMovement records)
  │   │   └─ Update customer.balance += grandTotal
  │   ├─ Clear draft from BOTH Redis keys
  │   ├─ [ASYNC] Generate PDF → upload to MinIO → save pdfUrl to DB
  │   ├─ [ASYNC] Send email with PDF attachment (if customer has email)
  │   └─ Return: "Invoice #ABC123 banaya gaya! Total: ₹170"
```

### Draft Payload Shape

```typescript
{
  customerId:    string;
  customerName:  string;
  customerEmail: string | null;
  resolvedItems: ResolvedItem[];   // product + price + GST fields
  subtotal:      number;
  totalCgst:     number;
  totalSgst:     number;
  totalIgst:     number;
  totalCess:     number;
  totalTax:      number;
  grandTotal:    number;
  withGst:       boolean;
  autoCreatedProducts: string[];   // names of ₹0 auto-created products
}
```

### GST Toggle on Existing Draft

```
Draft exists (Rahul ka bill, ₹170 bina GST)
  │
User: "GST add karo"
  │
  ├─ TOGGLE_GST intent detected
  ├─ executeToggleGst({ withGst: true })
  │   ├─ Load pending draft from Redis
  │   ├─ Re-run previewInvoice(customerId, items, withGst=true)
  │   ├─ Update both Redis keys with new draft (with GST totals)
  │   └─ Return: "Bill update ho gaya (GST ke saath): ... GST: ₹15. Total: ₹185"
  │
User: "haan" → CONFIRM_INVOICE → invoice created with GST
```

### Key Files

- `src/modules/voice/engine.ts` — `executeCreateInvoice()`, `executeConfirmInvoice()`, `executeToggleGst()`
- `src/modules/invoice/invoice.service.ts` — `previewInvoice()`, `confirmInvoice()`
- `src/modules/voice/conversation.ts` — `setShopPendingInvoice()`, `getShopPendingInvoice()`

---

## 5. Redis Conversation Memory

### Architecture

All conversation state is stored in Redis so it survives process restarts, WebSocket reconnects, and multi-instance deployments.

### Key Structure

```
conv:{conversationId}:mem   → JSON blob (ConversationMemoryData)
```

### What's Stored Per Session

```typescript
interface ConversationMemoryData {
  conversationId: string;
  messages: ConversationMessage[]; // last 20 turns (user + assistant)
  context: Record<string, any>; // arbitrary key-value (pendingInvoice, etc.)
  lastActivity: string; // ISO timestamp
  activeCustomer?: { id: string; name: string };
  customerHistory: CustomerContext[]; // oldest → newest mentioned customers
  recentCustomers: Record<string, CustomerContext>; // keyed by name.toLowerCase()
  turnCount: number;
}
```

### TTL

Default: **4 hours** (refreshed on every write).
Override via `CONV_TTL_HOURS` env variable.

### Key Operations

| Method                                       | Description                                   |
| -------------------------------------------- | --------------------------------------------- |
| `addUserMessage(id, text, intent, entities)` | Append user turn, trim to 20 messages         |
| `addAssistantMessage(id, text)`              | Append assistant turn                         |
| `setContext(id, key, value)`                 | Store arbitrary context (e.g. pendingInvoice) |
| `getContext(id, key)`                        | Read context value                            |
| `setActiveCustomer(id, customer)`            | Mark customer as active                       |
| `getActiveCustomer(id)`                      | Read active customer                          |
| `getContextSummary(id)`                      | Build LLM prompt string from memory           |
| `clearMemory(id)`                            | Delete key from Redis                         |

### Key Files

- `src/modules/voice/conversation.ts` — `ConversationMemoryService` class
- `src/infrastructure/redis-client.ts` — `redisClient` singleton, `CONV_TTL_SECONDS`

---

## 6. Shop-Level Draft Persistence

### Problem Solved

Without this, a pending invoice draft is lost if the WebSocket connection drops mid-conversation, the server restarts between "bill banao" and "haan", or the user switches devices.

### Solution: Dual-Write Redis Keys

```typescript
// Written on executeCreateInvoice + executeToggleGst:
conv:{sessionId}:mem → context.pendingInvoice = draftPayload   // session-scoped
shop:{TENANT_ID}:pending_invoice = draftPayload                  // shop-scoped (TTL 4h)

// Read order in executeConfirmInvoice + executeShowPendingInvoice:
const sessionDraft = await conversationMemory.getContext(conversationId, 'pendingInvoice');
const pending = sessionDraft ?? await conversationMemory.getShopPendingInvoice();

// Cleared on confirmation or cancellation:
await conversationMemory.setContext(conversationId, 'pendingInvoice', null);
await conversationMemory.setShopPendingInvoice(null);
```

### Key Behaviors

- Session draft takes priority (most recent context)
- Shop-level is fallback (survives reconnect)
- Both are cleared atomically on confirm/cancel
- `getContextSummary()` reads shop-level draft to inject into every LLM prompt — "haan" always works even after reconnect

### Key Files

- `src/modules/voice/conversation.ts` — `setShopPendingInvoice()`, `getShopPendingInvoice()`

---

## 7. Voice Engine Feature Requirements (F-06)

### F-06.1 — Speech-to-Text Pipeline

```
Input: Raw PCM audio (16kHz, mono) streamed via WebSocket
STT providers: Deepgram (primary), ElevenLabs (secondary), Browser WebSpeech (free fallback)
Output: Real-time transcript streaming to browser (< 800ms latency)
Language detection: auto-detect Hindi vs English vs mixed
Hinglish handling: native support for code-switching
```

### F-06.2 — Intent Classification (35 Intents)

```
CREATE_INVOICE       — "Ramesh ka bill banao"
CONFIRM_INVOICE      — "Haan", "Confirm", "Theek hai"
CANCEL_INVOICE       — "Ruko", "Cancel", "Nahi chahiye"
MODIFY_INVOICE_ITEM  — "Ek aur Maggi add karo", "Aata 3 kilo karo"
SHOW_PENDING_INVOICE — "Abhi ka bill dikhao"
TOGGLE_GST           — "GST lagao", "GST hatao"
ADD_DISCOUNT         — "10% discount do", "₹50 kam karo"
RECORD_PAYMENT       — "Ramesh ne ₹500 diye"
ADD_CREDIT           — "Ramesh ko ₹200 credit do"
CHECK_BALANCE        — "Ramesh ka balance kya hai?"
CHECK_STOCK          — "Aata kitna bacha hai?"
UPDATE_STOCK         — "50 kilo aata aaya"
CREATE_CUSTOMER      — "Naya customer add karo"
UPDATE_CUSTOMER      — "Ramesh ka phone number update karo"
GET_CUSTOMER_INFO    — "Ramesh ki history dikhao"
DELETE_CUSTOMER_DATA — "Ramesh ka data delete karo" (admin only)
CREATE_REMINDER      — "Kal Ramesh ko reminder bhejo"
CANCEL_REMINDER      — "Reminder cancel karo"
LIST_REMINDERS       — "Aaj ke reminders dikhao"
LIST_CUSTOMER_BALANCES — "Kiski payment pending hai?"
TOTAL_PENDING_AMOUNT — "Kul kitna baaki hai?"
DAILY_SUMMARY        — "Aaj ka hisaab"
SWITCH_LANGUAGE      — "English mein baat karo"
EXPORT_GSTR1         — "GSTR-1 export karo"
EXPORT_PNL           — "P&L report dikhao"
RECORD_MIXED_PAYMENT — mixed cash + UPI payment
SET_SUPPLY_TYPE      — interstate billing flag
```

### F-06.3 — Conversation Memory (Context)

```
- Redis-backed, 4-hour TTL, per session
- Last 20 turns in context for every LLM call
- Active customer tracking: "Ramesh" in turn 1 stays active for next 10 turns
- Pending draft injection: if invoice draft exists, it's in every LLM prompt
- Recent customer list: last 5 mentioned customers for disambiguation
```

### F-06.4 — Real-Time Multi-Task

```
- Up to 3 parallel tasks per session
- Priority-based: new task = higher priority interrupts
- Each task has: id, intent, status (queued/running/completed/failed)
- Real-time status pushed via WebSocket
- Context preserved: each task remembers its own customer + draft
- Task cancellation: "Ye wala task cancel karo"
```

### F-06.5 — TTS (Text-to-Speech) Response

```
Providers: ElevenLabs (Hindi voice), OpenAI TTS, Browser Speech API
Language: matches detected input language
Voice: configurable per tenant
User setting: stored in localStorage, echoed to backend on session start
Streaming: audio chunks sent via WebSocket as they are generated
```

---

## 8. Three Execution Modes — Architecture Deep Dive

Execora has **three distinct execution modes**. Understanding the difference between them is critical before writing any code or designing any feature.

---

### Mode 1: Intent-Based Mode (Current Voice Implementation)

> ⚠️ This is what Execora currently calls "voice mode". It is **NOT** a true AI Agent. It is a deterministic intent dispatcher where the LLM is only used for structured extraction and response phrasing.

#### How It Works (Current)

```
[Browser Mic] ──PCM audio──► [WebSocket /ws]
                                    │
                          [STT: Deepgram/ElevenLabs/Browser]
                                    │
                          [Raw transcript: "Ramesh ka bill do aata"]
                                    │
                          [LLM Call 1: Intent Extraction]
                          Prompt: "Extract intent + entities as JSON"
                          Context: last 20 turns + active customer + pending draft
                                    │
                          [Structured JSON output]
                          {
                            "intent": "CREATE_INVOICE",
                            "entities": {
                              "customerName": "Ramesh",
                              "items": [{ "name": "aata", "qty": 2 }]
                            }
                          }
                                    │
                          [switch(intent) → fixed handler]
                          executeCreateInvoice(entities, conversationId)
                                    │
                    ┌──────────────┴──────────────────┐
                    │                                  │
          [Business Services]                [BullMQ async jobs]
    (invoice.service, customer.service,     (WhatsApp, PDF,
     ledger.service, product.service)        email delivery)
                    │
                    ▼
          [PostgreSQL + Redis]
                    │
          [WebSocket broadcast → all tenant clients]
                    │
          [LLM Call 2: Response Generation]
          Prompt: "Generate a natural Hindi reply to the user"
                    │
          [TTS: ElevenLabs/OpenAI → Audio → Client]
```

#### Characteristics of Intent-Based Mode

| Property             | Value                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| LLM role             | Extraction only (input) + phrasing only (output). Does NOT decide logic. |
| Execution path       | 100% deterministic — `switch(intent)` in `engine/index.ts`               |
| Tool calling         | None — handler code is pre-written, not dynamically selected             |
| Multi-step reasoning | None — one intent = one handler = one result                             |
| Error recovery       | None — if intent unknown, returns `UNKNOWN_INTENT` error                 |
| Context injection    | Manual — conversation history + draft injected into prompt as text       |
| Reliability          | Very high — no hallucination in execution path                           |
| Speed                | Fast — one extraction call + one response call                           |

#### When It Fails

```
User: "Ramesh ka bill banao... nahi ruko, pehle uska balance check karo,
       phir agar 1000 se zyada hai toh bill mat banao"

Intent-based mode: Extracts only ONE intent (CHECK_BALANCE or CREATE_INVOICE).
Cannot chain: check balance → conditional logic → create/reject invoice.
Cannot reason: "if X then Y else Z" is not in the intent schema.
```

---

### Mode 2: Form/Dashboard Mode (Classic UI)

> This is the traditional web dashboard. No AI in the execution path. Direct REST API calls from React components.

#### How It Works

```
[Browser: React UI forms/buttons]
        │ HTTP REST
        ▼
[Fastify API Routes: /api/v1/...]
        │
[Business Services (same as above)]
        │
[PostgreSQL + Redis]
        │
[WebSocket broadcast `event:name` to all tenant clients]
        │
[React Query cache invalidation → UI re-renders]
```

#### The Killer Feature: Same WebSocket = Real-Time Sync

```
User A speaks in Intent-Based Mode (shop counter, mobile).
User B watches Form/Dashboard Mode (back office, tablet).

When User A creates an invoice via voice:
→ Invoice saved to DB (same service, same transaction)
→ WebSocket broadcasts `invoice:created` to ALL tenant clients
→ User B's dashboard: new invoice row appears, revenue ticks up, stock updates
→ Zero refresh. Real-time. Neither Tally, Vyapar, Zoho, nor Odoo can do this.
```

---

### Mode 3: True AI Agent Mode (Planned — High Priority)

> This is what separates a "voice interface" from an "AI agent". The LLM does not just extract — it **reasons, plans, and selects tools dynamically**.

#### The Core Difference

|                   | Intent-Based Mode                      | True Agent Mode                        |
| ----------------- | -------------------------------------- | -------------------------------------- |
| LLM role          | Extract JSON, then step aside          | Orchestrate the entire execution       |
| Execution control | Pre-written switch/case                | LLM decides which tool(s) to call      |
| Multi-step        | No — one intent per turn               | Yes — LLM chains tools                 |
| Conditional logic | No                                     | Yes — "if balance > X then..."         |
| Error recovery    | No                                     | Yes — LLM retries with different tool  |
| New capabilities  | Requires code change (new intent case) | Describe tool in English → LLM uses it |
| Unpredictability  | Zero (safe)                            | Low but exists                         |
| Power             | Limited to predefined intents          | Anything expressible in language       |

#### True Agent Architecture (OpenAI Tool Calling)

```
[STT → Transcript]
        │
        ▼
[Agent System Prompt]
"You are Execora, a business assistant for Indian shopkeepers.
You have these tools available: [tool definitions...]
Given the user's message and conversation history, decide which
tool(s) to call, in what order, to fulfill the user's request."
        │
        ▼
[LLM: Reason + select tool(s)]
→ May call 0 tools (just respond conversationally)
→ May call 1 tool: create_invoice(customer, items)
→ May call 2 tools: check_balance(customer) → create_invoice(...)
→ May call 3 tools: resolve_customer() → check_stock() → create_invoice()
        │
        ▼
[Tool execution — same business services, same DB]
        │
        ▼
[Tool results fed back to LLM]
"Customer Ramesh has balance ₹850. Stock of Aata: 12 bags."
        │
        ▼
[LLM: Generate final response OR call more tools]
        │
        ▼
[TTS → Audio response to user]
```

#### Tool Definitions (What Agent Mode Exposes)

```typescript
const AGENT_TOOLS = [
  {
    name: "resolve_customer",
    description: "Find a customer by name, phone, or nickname. Returns customer ID and profile.",
    parameters: { name?: string; phone?: string; nickname?: string }
  },
  {
    name: "create_invoice_draft",
    description: "Create a new invoice draft for a customer with items.",
    parameters: { customerId: string; items: Array<{name: string; qty: number; price?: number}> }
  },
  {
    name: "confirm_invoice",
    description: "Confirm and issue a pending invoice draft.",
    parameters: { conversationId: string }
  },
  {
    name: "check_customer_balance",
    description: "Get current outstanding balance for a customer.",
    parameters: { customerId: string }
  },
  {
    name: "record_payment",
    description: "Record a payment from a customer.",
    parameters: { customerId: string; amount: number; method: string }
  },
  {
    name: "check_stock",
    description: "Get current stock level for a product.",
    parameters: { productName: string }
  },
  {
    name: "schedule_reminder",
    description: "Schedule a WhatsApp payment reminder.",
    parameters: { customerId: string; amount: number; when: string; message?: string }
  },
  {
    name: "get_daily_summary",
    description: "Get today's sales summary.",
    parameters: {}
  },
  // ... all 35 intents become tools + new composable ones
];
```

#### What Agent Mode Unlocks — Examples

```
Example 1: Conditional business logic
User: "Ramesh ka balance check karo, agar 500 se zyada hai toh usko
       kal reminder bhejo aur naya bill mat banao"

Intent-based: FAILS — can't express "if condition then X else Y"

Agent mode:
→ Tool: check_customer_balance(customerId: "ramesh-id")
→ Result: balance = ₹1,200 (> ₹500)
→ LLM reasons: condition met → schedule reminder, skip invoice
→ Tool: schedule_reminder(customerId, amount: 1200, when: "tomorrow 10am")
→ Response: "Ramesh ka balance ₹1,200 hai. Kal reminder schedule kar diya.
             Nayi bill nahi banai."

Example 2: Multi-step bulk operations
User: "Sabse zyada udhar wale top 3 customers ko aaj reminder bhejo"

Agent mode:
→ Tool: list_customers_by_balance(limit: 3)
→ Results: [Ramesh ₹2,100, Seema ₹1,800, Gopal ₹1,500]
→ Tool: schedule_reminder(ramesh, 2100, "today 6pm")
→ Tool: schedule_reminder(seema, 1800, "today 6pm")
→ Tool: schedule_reminder(gopal, 1500, "today 6pm")
→ Response: "Top 3 customers ko reminder schedule ho gaya:
             Ramesh ₹2,100, Seema ₹1,800, Gopal ₹1,500 — aaj shaam 6 baje."

Example 3: Error recovery
User: "Raju ka 50 kilo aata ka bill banao"

Agent mode:
→ Tool: check_stock(productName: "aata")
→ Result: stock = 30 (insufficient for 50 kg)
→ LLM reasons: cannot fulfill as-is
→ Response: "Aata ka stock sirf 30 kilo hai. Kya 30 kilo ka bill banau,
             ya baaki 20 kilo ke liye order lagao?"
```

---

### Two-Agent Pattern (Recommended Architecture for Agent Mode)

Rather than a single monolithic agent, use two specialized agents:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONVERSATION AGENT                           │
│  (Guide / Facilitator)                                          │
│                                                                 │
│  Role: Manages dialog. Understands user intent at high level.   │
│  Asks clarifying questions. Explains results. Handles errors.   │
│  Suggests next actions. Never calls business services directly. │
│  Has: conversation history, user context, active customer       │
│  Does NOT have: tools for data mutation                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Decides: "User wants to create invoice"
                           │ Passes: structured task request
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TASK AGENT (EXECUTOR)                      │
│  (Silent Worker)                                                │
│                                                                 │
│  Role: Executes business operations. Has ALL tools.             │
│  Receives structured task from Conversation Agent.             │
│  Calls tools in correct order. Returns structured result.       │
│  Handles retries. Validates data. Checks constraints.           │
│  Has: all business tools (create_invoice, record_payment, etc.) │
│  Does NOT have: conversation history, TTS output               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Returns: {success, data, error?}
                           ▼
                   Conversation Agent formats result
                   into natural language → TTS → User
```

#### Why Two Agents?

| Concern          | Single Agent                                               | Two-Agent                               |
| ---------------- | ---------------------------------------------------------- | --------------------------------------- |
| Tool explosion   | LLM gets confused with 30+ tools + conversation            | Executor has tools, Guide has context   |
| Response quality | Hard to be both "good at tasks" and "good at conversation" | Specialist agents do one thing well     |
| Error messages   | Generic LLM error handling                                 | Guide crafts human-friendly explanation |
| Suggestions      | Baked into task execution (messy)                          | Guide always suggests next step         |
| Cost             | One big prompt                                             | Two smaller focused prompts (cheaper)   |
| Debugging        | Hard to trace: conversation or execution issue?            | Clear separation                        |

#### Conversation Agent — Responsibilities

```
1. Language detection (Hindi/Marathi/Tamil/etc.)
2. Clarify ambiguous input: "Kaun sa Ramesh? Sharma wala ya Gupta wala?"
3. Confirm before destructive actions: "Sach mein delete karna hai?"
4. Format Task Agent results into natural language + Hindi TTS
5. Suggest next action: "Bill confirm ho gaya. Kya reminder bhi schedule karu?"
6. Handle off-topic: "Mausam ka pata nahi, lekin aaj ka hisaab bata sakta hoon"
7. Handle errors gracefully: "Stock nahi mila — naam dobara batao?"
8. Maintain active customer context across turns
9. Maintain conversation tone (formal/informal based on user style)
```

#### Task Agent — Tool Categories

```
Query tools (read-only):
  - resolve_customer(name/phone/nickname) → {id, name, balance, phone}
  - check_stock(productName) → {stock, unit, minStock}
  - check_balance(customerId) → {balance, lastPayment}
  - list_pending_invoices(customerId?) → Invoice[]
  - get_daily_summary() → {revenue, invoiceCount, payments}
  - list_customers_by_balance(limit) → Customer[]

Mutation tools (write operations — require conversation agent confirmation):
  - create_invoice_draft(customerId, items) → {draftId, total}
  - confirm_invoice(conversationId) → Invoice
  - cancel_invoice(invoiceId, reason) → Invoice
  - record_payment(customerId, amount, method) → LedgerEntry
  - adjust_stock(productId, quantity, operation) → Product
  - create_customer(name, phone?, landmark?) → Customer
  - schedule_reminder(customerId, amount, when, message?) → Reminder
  - bulk_remind(customerIds, message?) → Reminder[]
```

---

### How to Add a New Feature to Agent Mode

```typescript
// Step 1: Implement in business service (same as always)
// packages/modules/src/modules/X/x.service.ts
async function newBusinessFunction(params): Promise<Result> { ... }

// Step 2: Add REST route (Form/Dashboard mode works immediately)
// apps/api/src/api/routes/x.routes.ts
fastify.post('/api/v1/x/new-thing', async (req) => {
  const result = await xService.newBusinessFunction(req.body);
  return { result };
});

// Step 3: Add Intent-Based Mode handler (current voice mode works)
// packages/modules/src/modules/voice/engine/x.handler.ts
export async function executeNewThing(entities, conversationId) {
  const result = await xService.newBusinessFunction(entities);
  return { success: true, message: "Hindi response", data: result };
}
// Add case to engine/index.ts switch statement

// Step 4: Add Agent Mode tool (True Agent Mode works)
// packages/modules/src/providers/llm/agent-tools.ts
{
  name: "new_thing",
  description: "What this does in plain English — LLM reads this",
  parameters: { /* typed schema */ }
}
// Task Agent automatically discovers and uses this tool

// Result: All three modes (Intent/Form/Agent) have this feature.
// Zero code duplication. Same business logic layer serves all modes.
```

---

### Mode Comparison — Full Matrix

| Capability             | Intent-Based (Current Voice) | Form/Dashboard (UI)   | True Agent Mode (Planned) |
| ---------------------- | ---------------------------- | --------------------- | ------------------------- |
| Speed for common task  | ⚡ 3s                        | 30-90s                | ⚡ 3-5s                   |
| Learning curve         | Near zero                    | Low                   | Zero                      |
| Multi-step reasoning   | ❌ One intent per turn       | ❌ N/A                | ✅ LLM chains steps       |
| Conditional logic      | ❌                           | ✅ (user does it)     | ✅ Agent reasons          |
| Error recovery         | ❌ Returns error             | ✅ User fixes form    | ✅ Agent retries          |
| Complex edits          | ❌                           | ✅ Visual forms       | ✅ Conversational edits   |
| Hands-free counter use | ✅                           | ❌                    | ✅                        |
| Bulk operations        | ❌                           | ✅ Checkboxes         | ✅ "Top 5 ko remind karo" |
| New capabilities       | New code required            | New route required    | Describe in English       |
| Offline support        | ❌ STT needs internet        | ✅ (with cache)       | ❌ LLM needs internet     |
| Predictability         | ✅ 100% deterministic        | ✅ 100% deterministic | ✅ High (tools are safe)  |
| Multi-language         | ✅ Via LLM prompt            | ❌ Hindi UI only      | ✅ Any language           |
| Suggestions            | ❌                           | ❌                    | ✅ "Aur kuch chahiye?"    |
| Cost per interaction   | Low (2 LLM calls)            | Zero (no LLM)         | Medium (3-5 LLM calls)    |

---

## 9. All 35 Built Voice Intents

All intents route through `packages/modules/src/modules/voice/engine/index.ts`.

| Intent                                  | Handler File        | Status |
| --------------------------------------- | ------------------- | ------ |
| CREATE_INVOICE                          | invoice.handler.ts  | ✅     |
| CONFIRM_INVOICE                         | invoice.handler.ts  | ✅     |
| CANCEL_INVOICE                          | invoice.handler.ts  | ✅     |
| SHOW_PENDING_INVOICE                    | invoice.handler.ts  | ✅     |
| TOGGLE_GST                              | invoice.handler.ts  | ✅     |
| PROVIDE_EMAIL / SEND_INVOICE            | invoice.handler.ts  | ✅     |
| ADD_DISCOUNT                            | invoice.handler.ts  | ✅     |
| SET_SUPPLY_TYPE                         | invoice.handler.ts  | ✅     |
| RECORD_MIXED_PAYMENT                    | invoice.handler.ts  | ✅     |
| TOTAL_PENDING_AMOUNT                    | customer.handler.ts | ✅     |
| LIST_CUSTOMER_BALANCES                  | customer.handler.ts | ✅     |
| CHECK_BALANCE                           | customer.handler.ts | ✅     |
| CREATE_CUSTOMER                         | customer.handler.ts | ✅     |
| UPDATE_CUSTOMER / UPDATE_CUSTOMER_PHONE | customer.handler.ts | ✅     |
| GET_CUSTOMER_INFO                       | customer.handler.ts | ✅     |
| DELETE_CUSTOMER_DATA                    | customer.handler.ts | ✅     |
| RECORD_PAYMENT                          | payment.handler.ts  | ✅     |
| ADD_CREDIT                              | payment.handler.ts  | ✅     |
| CREATE_REMINDER                         | reminder.handler.ts | ✅     |
| CANCEL_REMINDER                         | reminder.handler.ts | ✅     |
| LIST_REMINDERS                          | reminder.handler.ts | ✅     |
| MODIFY_REMINDER                         | reminder.handler.ts | ✅     |
| DAILY_SUMMARY                           | report.handler.ts   | ✅     |
| CHECK_STOCK                             | report.handler.ts   | ✅     |
| EXPORT_GSTR1                            | report.handler.ts   | ✅     |
| EXPORT_PNL                              | report.handler.ts   | ✅     |
| UPDATE_STOCK                            | product.handler.ts  | ✅     |

**Not yet as voice intents (❌ missing):**

- APPLY_ITEM_DISCOUNT (item-level per-line discount via voice)
- CREATE_CREDIT_NOTE (no CN/DN model)

---

## 10. Multi-Language and Hinglish Engine

### Supported Languages (Priority Order)

| Language                     | Script             | Speakers   | Priority |
| ---------------------------- | ------------------ | ---------- | -------- |
| Hindi                        | Devanagari / Roman | 528M       | P0       |
| Hinglish (Hindi+English mix) | Roman              | ~350M      | P0       |
| English                      | Roman              | 125M urban | P0       |
| Marathi                      | Devanagari         | 83M        | P1       |
| Gujarati                     | Gujarati script    | 57M        | P1       |
| Tamil                        | Tamil script       | 69M        | P1       |
| Telugu                       | Telugu script      | 83M        | P1       |
| Bengali                      | Bengali script     | 97M        | P1       |
| Kannada                      | Kannada script     | 44M        | P2       |
| Malayalam                    | Malayalam script   | 38M        | P2       |
| Punjabi                      | Gurmukhi           | 33M        | P2       |
| Odia                         | Odia script        | 38M        | P2       |

### Hinglish Handling — Real Examples

```
"Do kilo aata lao"     → 2 kg wheat flour
"Ek packet Maggi"      → 1 packet Maggi noodles
"Tees rupay wala"      → ₹30 item
"Chhota packet"        → small size variant
"Kal ka bill"          → yesterday's bill
"Uska phone number"    → his/her phone number
"Wahi wala"            → same as before / the usual
"Haan bilkul"          → yes confirm
"Nahi ruko"            → no wait / hold on
"Thoda kam karo"       → give some discount / reduce price
"Baki kal dena"        → pay the rest tomorrow (= create udaar)
"Seedha 500 le lo"     → take ₹500 directly (= payment)
```

### Number Normalization

```
"Ek"     → 1    "Gyarah"   → 11   "Ikkis"  → 21
"Do"     → 2    "Barah"    → 12   "Pachis" → 25
"Teen"   → 3    "Terah"    → 13   "Pachaas"→ 50
"Chaar"  → 4    "Chaudah"  → 14   "Sau"    → 100
"Paanch" → 5    "Pandrah"  → 15   "Haazar" → 1000
"Chhe"   → 6    "Solah"    → 16   "Lakh"   → 100000
"Saat"   → 7    "Satrah"   → 17   "Karod"  → 10000000
"Aath"   → 8    "Atharah"  → 18   "Paav"   → 0.25 (250g)
"Nau"    → 9    "Unnis"    → 19   "Aadha"  → 0.5 (500g)
"Das"    → 10   "Bees"     → 20   "Pona"   → 0.75 (750g)
```

### Devanagari Transliteration

```
रामेश → Ramesh (for entity extraction)
आटा   → Aata / Atta (product matching)
तेल   → Tel (product matching)
पेमेंट → Payment
```

### Multi-Language Intent Examples

| Language | User says                            | Extracted intent |
| -------- | ------------------------------------ | ---------------- |
| Hindi    | "Ramesh ka bill banao — 2 aata"      | CREATE_INVOICE   |
| Marathi  | "Ramesh cha bill kara — 2 kilo pith" | CREATE_INVOICE   |
| Tamil    | "Ramesh bill pottu — 2 kilo maavu"   | CREATE_INVOICE   |
| Telugu   | "Ramesh bill veyyi — 2 kilo pindi"   | CREATE_INVOICE   |
| Gujarati | "Ramesh no bill banavo — 2 kilo lot" | CREATE_INVOICE   |
| Hinglish | "Ramesh ko invoice do 2kg flour"     | CREATE_INVOICE   |

_The LLM handles all of these with the same prompt + conversation context — no separate parsers needed per language._

### TTS Language Switching

```
"Hindi mein bolo"    → SWITCH_LANGUAGE, entities.language = "hi"
"English mode"       → SWITCH_LANGUAGE, entities.language = "en"
"தமிழில் பேசு"      → SWITCH_LANGUAGE, entities.language = "ta"
```

OpenAI handles Hinglish natively. All entity values in the JSON response are always in Roman/English — Hindi Devanagari is transliterated automatically.

### Hinglish NLP — What's Missing (Improvement Backlog)

- **Regional product aliases:** "maida" vs "atta" vs "flour" — same product in different dialects. A product name resolution system for regional synonyms is not built.
- **Contextual pronouns:** "Woh wala", "Pehle wala", "Uska" — referring back to context without explicit naming. Partially handled by conversation memory but not robustly.
- **Implicit quantity units:** "Do packet" without specifying packet size. System currently defaults to 1 unit. Should ask "Kaunsa packet — 500g ya 1kg?"
- **Price negotiation language:** "Thoda kam karo," "Wholesale mein do" — triggering discount/price-list selection via idiomatic phrases.

**Improvement path:** Add each missed extraction case as a few-shot example to the LLM prompt. Target: 5 new examples/week for 8 weeks. Zero code changes required.

### Multi-Language Roadmap

| Language | Priority | Q2 2026    | Q3 2026    | Q4 2026    | Notes                                 |
| -------- | -------- | ---------- | ---------- | ---------- | ------------------------------------- |
| Hindi    | P0       | Production | Production | Production | Core language, fully built            |
| Hinglish | P0       | Production | Production | Production | Fully built, primary in practice      |
| English  | P0       | Production | Production | Production | Works via GPT-4                       |
| Marathi  | P1       | Beta       | Production | Production | 83M speakers, Mumbai suburban market  |
| Gujarati | P1       | —          | Beta       | Production | 57M speakers, key FMCG/textile market |
| Tamil    | P1       | —          | Beta       | Production | 69M speakers, South India push        |
| Telugu   | P1       | —          | Beta       | Production | 83M speakers, Hyderabad/AP            |
| Bengali  | P2       | —          | —          | Beta       | 97M speakers, Kolkata kirana market   |
| Kannada  | P2       | —          | —          | —          | 44M speakers, Bangalore secondary     |

**Technical implementation for new languages:**

1. Update Deepgram STT language parameter (Deepgram supports all major Indian languages)
2. Add language-specific few-shot examples to the LLM extraction prompt (20 examples per language)
3. Update TTS provider for appropriate voice (ElevenLabs has Indian language voices)
4. Localize the UI (already configurable via `Tenant.language`)
5. Add product name aliases for regional product names

---

## 11. Voice Engine Roadmap

### 11.1 Current Mode 1 (Intent-Based) — Limitations

Mode 1 is the current production voice system. It works reliably for the 35 defined intents but has structural limitations:

**What it cannot do:**

- Multi-step conditional logic: "If Ramesh's balance is over ₹1,000, don't create a new bill"
- Chained operations from a single utterance
- Error recovery with intelligence: if a product not found, Mode 1 returns generic error; Mode 3 would ask "Did you mean 'Ariel' instead of 'Aerial'?"
- New operations without code changes: adding a new intent requires a new handler, new LLM prompt example, and new switch case

**What it does well (and should remain):**

- Deterministic: zero hallucination in the execution path
- Fast: 2 LLM calls (extraction + response phrasing), ~800ms total
- Cheap: minimal LLM tokens
- Reliable: if GPT-4 extracts intent correctly, execution never fails due to AI

**The Right Strategy:** Keep Mode 1 for all defined intents. Add Mode 3 alongside it (not replacing it) for complex multi-step operations. Simple "Ramesh ka bill banao — 2 aata" always routes to Mode 1 (fast, cheap). Conditional/multi-step requests route to Mode 3.

---

### 11.2 Mode 3 (True Agent) — When to Build, Prerequisites

**Prerequisites before building:**

1. All Mode 1 intents must be stable and tested (currently: 35 intents, all test suites passing)
2. Tool definitions must be written for all existing business service methods
3. A sandbox environment for testing agent behavior without affecting production DB
4. Cost monitoring: Mode 3 uses 3-5 LLM calls per interaction vs Mode 1's 2 calls

**When to build:** Q3 2026, after kirana launch is stable and at least 200 active users are generating real interaction data.

**Architecture:** Two-agent pattern (See Section 8):

- Conversation Agent: manages dialogue, clarifies ambiguity, formats responses for TTS
- Task Agent (Executor): has all business tools, executes silently, returns structured results

**First use cases for Mode 3 (high value, validates the approach):**

1. "Top 3 udhari wale customers ko aaj reminder bhejo" — list query + 3 parallel reminder schedules
2. "Is hafte kitna credit nahi aaya — unhe ek ek karke remind karo" — weekly filter + bulk reminders
3. "Ramesh ka balance check karo, agar 500 se zyada hai toh bill mat banao" — conditional logic

---

### 11.3 LLM Provider Risk — Mitigation

The intent extraction and response generation both use OpenAI GPT-4. An OpenAI outage or price increase directly impacts product functionality.

**Mitigation:** Abstract the LLM provider behind an interface (already partially done in `packages/modules/src/providers/llm/`). Add Anthropic Claude as a fallback for intent extraction. Browser Web Speech API as a free STT fallback is already built.

---

## 12. Voice Billing on Mobile — UX Considerations

1. **Microphone permission prompt**: Handle gracefully with explanation in Hindi ("Bill banane ke liye mic chahiye"). One permission request, no second ask.

2. **Audio pipeline on mobile**: PCM streaming at 16kHz works on Chrome Android. Safari iOS has Web Audio API restrictions that may require user gesture to start. `audio-pipeline.ts` in `apps/web/src/lib/` must be tested on both platforms.

3. **TTS playback on mobile**: ElevenLabs audio chunks via WebSocket auto-play is blocked by browser without user gesture in iOS Safari. Current workaround: Browser Speech API (built-in) as fallback. Ensure "Browser" is auto-selected on iOS.

4. **Background audio**: When the shopkeeper's phone screen turns off mid-billing, the WebSocket disconnects. The reconnection logic in `apps/web/src/lib/ws.ts` must handle reconnect + re-inject conversation context (Redis-backed — this should work).

5. **Network fallback**: Voice billing requires STT which requires internet. On offline, show "Voice unavailable — use classic billing" and redirect to ClassicBillingScreen. Do not show an error — redirect gracefully.

6. **One-handed use**: The mic button must be a large floating action button (56×56dp minimum) at bottom-right, reachable with thumb. Counter users hold phone in one hand.

---

## 13. Competitive Strategy — Voice-First Moat

### Why Voice-First is Defensible

Voice-first as a moat operates on four compounding levels:

**Level 1 — UX moat:** A form-first competitor cannot retrofit voice without rebuilding their product. Voice requires: (a) a conversation-state system, (b) real-time audio streaming infrastructure, (c) an LLM integration layer with business-domain few-shot training, (d) TTS for responses. This is 6-9 months of work for an established team. Vyapar has 50M users and a large engineering team — but they're optimizing their existing form-based UX, not rebuilding it.

**Level 2 — Language data moat:** Every real voice interaction generates labeled training data: what Indian shopkeepers actually say, in what dialect, with what ambiguities, and what the correct resolution was. After 10,000 real billing sessions, Execora's LLM prompts and fine-tuning data will be significantly better than any competitor starting from scratch.

**Level 3 — Behavioral moat:** A kirana owner who creates bills by voice for 60 days will find it physically uncomfortable to return to typing. The switching cost is behavioral rewiring — the same lock-in dynamic that made people stay on smartphones after leaving feature phones.

**Level 4 — Integration moat:** As Execora connects to WhatsApp (messaging), UPI (payments), and GSTN (compliance), it becomes the connective tissue for the shop's digital life. Each integration deepens the cost of switching.

### Voice Competitor Analysis

#### Pilloo AI (launched February 2026)

**What they have:** Web app, voice billing, 5 Indian languages, government-backed launch (AP CM), positioned as "accounting agent."

**What they lack vs Execora:**

- Single-intent voice — cannot handle "Ramesh ko 500 ka bill karo aur kal wapas yaad dilao"
- No multi-turn conversation memory
- No React Native app
- No 9-gateway webhook system
- No BullMQ async architecture — likely falls over under load
- No inventory or ledger depth
- No production track record (Feb 2026 launch)

**How to beat Pilloo AI:**

1. Multi-turn conversation — Pilloo is single-intent; Execora maintains context across 10 turns
2. 35 intents vs Pilloo's ~5 — RECORD_PAYMENT, CREATE_REMINDER, CHECK_STOCK, EXPORT_GSTR1, etc.
3. Full inventory + ledger depth — Pilloo has neither
4. Production track record — Execora has BullMQ, Prometheus, pg_dump backups
5. WebSocket real-time dashboard — Pilloo likely uses HTTP polling

#### BillNeXX

"India's #1 AI Voice Billing Software." Focused on English/Hindi voice command invoice creation. Works on all devices. Less known publicly, no verified user reviews. Appears to be a simpler point-solution vs Execora's full platform.

### Competitive Position Summary

| Feature                 | Vyapar     | myBillBook | Swipe         | Pilloo AI        | **Execora**                  |
| ----------------------- | ---------- | ---------- | ------------- | ---------------- | ---------------------------- |
| **Voice billing**       | ❌         | ❌         | ❌            | ⚠️ Single-intent | **✅ 35 multi-turn intents** |
| **Multi-turn memory**   | ❌         | ❌         | ❌            | ❌               | **✅ Redis-backed**          |
| **Real-time sync (WS)** | ❌         | ❌         | ❌            | ❌               | **✅ WebSocket**             |
| **3 parallel tasks**    | ❌         | ❌         | ❌            | ❌               | **✅**                       |
| **AI agent mode**       | ❌         | ❌         | ❌            | ⚠️ claims        | **⚠️ Planned Mode 3**        |
| **Hinglish support**    | Partial    | ❌         | ❌            | ✅               | **✅**                       |
| **Dark mode**           | ❌         | ❌         | ❌            | ❌               | **✅**                       |
| **WhatsApp auto-send**  | Manual     | Manual     | Manual        | ❌               | **✅ Auto**                  |
| **GSTR-1 export**       | ✅         | ✅         | ✅            | ❌               | **✅**                       |
| **Multi-user RBAC**     | ✅ paid    | ✅ paid    | ✅            | ❌               | **✅ 22 permissions**        |
| **Customer portal**     | ❌         | ❌         | ✅            | ❌               | **✅**                       |
| **9-gateway webhooks**  | ❌         | ❌         | Razorpay only | ❌               | **✅ All 9**                 |
| **Offline mode**        | ✅ Desktop | ✅ Mobile  | ❌            | ❌               | ❌ (P0 gap)                  |
| **E-invoicing IRN**     | ✅         | ✅         | ✅            | ❌               | ❌ (P2)                      |

**Net competitive position:** Execora is the only product in the Indian market with streaming multi-turn Hindi voice billing + real-time WebSocket dashboard + 35 voice intents + Redis conversation memory. This technical moat is 8+ months ahead of Pilloo AI and entirely unchallenged by Vyapar/myBillBook/Swipe. The risk is shipping too slowly and letting Pilloo AI catch up.

---

_Sources: FEATURES.md (runtime pipeline), PRODUCT_REQUIREMENTS.md (F-06, Section 6, Section 8, Section 13.5), STRATEGY_2026.md (Section 8 Voice Roadmap, Section 10 Competitive Moat), PRODUCT_STRATEGY_2026.md (Voice Mobile UX, Pilloo AI analysis, Section 8 Competitive Matrix)_
