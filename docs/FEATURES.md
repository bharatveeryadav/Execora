# Execora — Production Feature Reference

**Version:** 1.0
**Stack:** Node.js · TypeScript · Fastify · Prisma · PostgreSQL · Redis · BullMQ · OpenAI · PDFKit · MinIO · Nodemailer

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Voice Assistant Pipeline](#2-voice-assistant-pipeline)
3. [Intent Recognition Engine](#3-intent-recognition-engine)
4. [Invoice Flow (Multi-Turn)](#4-invoice-flow-multi-turn)
5. [GST Calculation Engine](#5-gst-calculation-engine)
6. [PDF Invoice Generation](#6-pdf-invoice-generation)
7. [MinIO Object Storage](#7-minio-object-storage)
8. [Email Delivery with PDF Attachment](#8-email-delivery-with-pdf-attachment)
9. [Redis Conversation Memory](#9-redis-conversation-memory)
10. [Shop-Level Draft Persistence](#10-shop-level-draft-persistence)
11. [Customer Management](#11-customer-management)
12. [Ledger & Payment Recording](#12-ledger--payment-recording)
13. [Product Catalog & Auto-Creation](#13-product-catalog--auto-creation)
14. [Reminder Scheduling](#14-reminder-scheduling)
15. [Multi-Language Support](#15-multi-language-support)
16. [Admin-Gated Customer Deletion](#16-admin-gated-customer-deletion)
17. [Daily Summary](#17-daily-summary)
18. [Background Job Queues (BullMQ)](#18-background-job-queues-bullmq)
19. [REST API Endpoints](#19-rest-api-endpoints)
20. [Configuration Reference](#20-configuration-reference)
21. [Database Schema Overview](#21-database-schema-overview)
22. [Key File Reference](#22-key-file-reference)

---

## 1. System Architecture

```
Client (WebSocket)
       │
       ▼
 src/ws/handler.ts          ← WebSocket message routing
       │
       ├─► src/integrations/openai.ts      ← Transcript normalize + Intent extraction
       │                                      + Response generation (GPT-4o-mini)
       │
       ├─► src/modules/voice/engine.ts     ← Business logic execution
       │       │
       │       ├─► invoice.service.ts      ← Invoice + GST math
       │       ├─► customer.service.ts     ← Customer CRUD + fuzzy search
       │       ├─► ledger.service.ts       ← Payment ledger
       │       ├─► reminder.service.ts     ← Reminders
       │       └─► product.service.ts      ← Product catalog
       │
       ├─► src/modules/voice/conversation.ts  ← Redis-backed session memory
       │
       ├─► src/infrastructure/pdf.ts       ← PDFKit invoice generation
       ├─► src/infrastructure/storage.ts   ← MinIO upload + presigned URLs
       ├─► src/infrastructure/email.ts     ← Nodemailer invoice delivery
       └─► src/infrastructure/queue.ts     ← BullMQ (reminders, WhatsApp)

External Services:
  OpenAI API   ─ Intent extraction, response generation, TTS
  Deepgram     ─ Speech-to-text (or ElevenLabs)
  ElevenLabs   ─ TTS voice synthesis (or OpenAI TTS)
  PostgreSQL   ─ Persistent data (Prisma ORM)
  Redis        ─ Conversation state, BullMQ queues
  MinIO        ─ PDF invoice storage
  WhatsApp API ─ Reminder & message delivery
  SMTP         ─ Invoice email delivery
```

---

## 2. Voice Assistant Pipeline

### How It Works

Every voice interaction follows this exact pipeline end-to-end:

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

| Direction | Type | Payload |
|---|---|---|
| Server → Client | `voice:start` | `{ sessionId }` |
| Client → Server | `voice:transcript` | `{ text }` (partial) |
| Server → Client | `voice:transcript` | `{ text }` (echo) |
| Server → Client | `voice:intent` | `{ intent, entities, confidence }` |
| Server → Client | `voice:response` | `{ message, data }` |
| Server → Client | `voice:tts-stream` | Audio buffer |
| Client → Server | `recording:start` | — |
| Server → Client | `recording:started` | — |

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

| Intent | Trigger Examples | Key Entities |
|---|---|---|
| `CREATE_INVOICE` | "Rahul ka bill banao 2 chawal 1 cheeni" | `customer`, `items[]`, `withGst` |
| `CONFIRM_INVOICE` | "haan", "confirm", "theek hai", "bhej do" | — |
| `CANCEL_INVOICE` | "invoice cancel karo", "bill mat banao" | — |
| `SHOW_PENDING_INVOICE` | "pending invoice dikhao", "draft bill batao" | — |
| `TOGGLE_GST` | "GST add karo", "GST hatao", "bina GST ke" | `withGst: boolean` |
| `RECORD_PAYMENT` | "Rahul ne 500 diya", "payment liya" | `customer`, `amount` |
| `ADD_CREDIT` | "Rahul ka 200 add karo", "likh do" | `customer`, `amount` |
| `CHECK_BALANCE` | "Rahul ka balance", "kitna baaki hai" | `customer` |
| `CHECK_STOCK` | "chawal kitna bacha hai", "stock check" | `product` |
| `CREATE_CUSTOMER` | "naya customer Priya add karo" | `name`, `phone`, `amount` |
| `UPDATE_CUSTOMER_PHONE` | "Rahul ka number change karo" | `customer`, `phone` |
| `GET_CUSTOMER_INFO` | "Rahul ki details batao" | `customer` |
| `DELETE_CUSTOMER_DATA` | "Rahul ka data delete karo" | `customer` |
| `CREATE_REMINDER` | "kal Rahul ko 500 ka reminder bhejo" | `customer`, `amount`, `datetime` |
| `MODIFY_REMINDER` | "reminder change karo 2 bajkar" | `customer`, `datetime` |
| `CANCEL_REMINDER` | "reminder cancel karo" | `customer` |
| `LIST_REMINDERS` | "reminders dikhao", "aaj ke reminders" | — |
| `PROVIDE_EMAIL` | "rahul at gmail dot com" | `email` |
| `LIST_CUSTOMER_BALANCES` | "sabka balance dikhao" | — |
| `TOTAL_PENDING_AMOUNT` | "total pending kitna hai" | — |
| `DAILY_SUMMARY` | "aaj ka summary", "daily report" | — |
| `SWITCH_LANGUAGE` | "Hindi mein bolo", "English mode" | `language` (BCP-47) |
| `START_RECORDING` | "recording start karo" | — |
| `STOP_RECORDING` | "recording band karo" | — |
| `UNKNOWN` | Fallback when intent is unclear | — |

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

## 4. Invoice Flow (Multi-Turn)

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
  subtotal:      number;           // sum of unitPrice × qty
  totalCgst:     number;
  totalSgst:     number;
  totalIgst:     number;
  totalCess:     number;
  totalTax:      number;
  grandTotal:    number;           // subtotal + totalTax
  withGst:       boolean;          // opt-in flag
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

## 5. GST Calculation Engine

### Indian GST Rules Implemented

| Condition | Tax Type | Rate |
|---|---|---|
| Intra-state supply | CGST + SGST | gstRate / 2 each |
| Inter-state supply | IGST | gstRate (full) |
| GST-exempt product | None | 0 |
| `isGstExempt = true` | None | 0 (overrides any rate) |
| CESS | Added on top | cessRate (separate %) |

### Supply Type Detection

```typescript
// src/modules/gst/gst.service.ts
determineSupplyType(tenantState, customerState): SupplyType {
  if (!tenantState || !customerState) return 'INTRASTATE'; // safe default
  return tenantState === customerState ? 'INTRASTATE' : 'INTERSTATE';
}
```

### GST Slabs Supported

`0% · 5% · 12% · 18% · 28%`

### GST Is Opt-In (Default: Off)

```typescript
// src/modules/invoice/invoice.service.ts
async previewInvoice(customerId, items, withGst = false, supplyType = 'INTRASTATE') {
  // ...
  if (withGst) {
    const gstLine = gstService.calculateLineItem({ ... }, supplyType);
    cgst = gstLine.cgst; sgst = gstLine.sgst; igst = gstLine.igst;
  }
  // If withGst=false: cgst=sgst=igst=cess=totalTax=0, total=subtotal
}
```

### 88 Kirana Products Seeded with HSN Codes

All products in the default catalog have correct HSN codes and GST rates as per GST Council schedules:

| Category | Examples | GST Rate |
|---|---|---|
| Grains, dal, salt, eggs | Chawal (1006), Atta (1102), Namak (2501) | 0% (Exempt) |
| Sugar, oils, spices, tea | Cheeni (1701), Sarson Tel (1514), Chai (0902) | 5% |
| Ghee, namkeen, agarbatti | Ghee (0405), Bhujia (2106), Agarbatti (3307) | 12% |
| Soap, shampoo, biscuits, Maggi | Soap (3401), Shampoo (3305), Biscuit (1905) | 18% |
| Cold drinks | Coldrink (2202) | 28% |

### Key Files
- `src/modules/gst/gst.service.ts` — `GstService` class, `KIRANA_GST_RATES`, `GST_SLABS`
- `prisma/seed.ts` — 88 products with HSN + GST data
- `src/modules/invoice/invoice.service.ts` — integration point

---

## 6. PDF Invoice Generation

### What Gets Generated

Every confirmed invoice generates an A4 PDF with:

**Without GST (default):**
```
┌─────────────────────────────────────────────┐
│  [GREEN HEADER]  Shop Name        Invoice#  │
│                  Invoice          DD Mon YY  │
├─────────────────────────────────────────────┤
│  Bill To: Customer Name                      │
├──────────┬─────┬──────┬────────┬──────┬─────┤
│ Product  │ HSN │ Qty  │ Rate   │Taxable│Total│
├──────────┼─────┼──────┼────────┼───────┼────┤
│ Chawal   │1006 │  2   │ Rs.60  │Rs.120 │Rs.120│
│ Cheeni   │1701 │  1   │ Rs.50  │Rs.50  │Rs.50 │
├──────────┴─────┴──────┴────────┴───────┴────┤
│                          Grand Total  Rs.170 │
└─────────────────────────────────────────────┘
```

**With GST:**
```
┌─────────────────────────────────────────────┐
│  [GREEN HEADER]  Shop Name        Invoice#  │
│                  GST Tax Invoice  DD Mon YY  │
│                    Intra-State (CGST+SGST)   │
├──────────┬─────┬─────┬──────┬───────┬────┬──┬──────┤
│ Product  │ HSN │ Qty │ Rate │Taxable│GST%│Tax│Total │
├──────────┼─────┼─────┼──────┼───────┼────┼──┼──────┤
│ Cheeni   │1701 │  1  │ Rs.50│ Rs.50 │ 5% │2.5│Rs.52.5│
├──────────┴─────┴─────┴──────┴───────┴────┴──┴──────┤
│         Taxable Amount          Rs.50               │
│         CGST                    Rs.1.25             │
│         SGST                    Rs.1.25             │
│         Total Tax               Rs.2.50             │
│         [GREEN] Grand Total     Rs.52.50            │
└─────────────────────────────────────────────────────┘
```

### Interface

```typescript
// src/infrastructure/pdf.ts
interface InvoicePdfData {
  invoiceNo, invoiceId, invoiceDate, customerName, shopName;
  supplyType?: 'INTRASTATE' | 'INTERSTATE';
  items: Array<{
    productName, hsnCode?, quantity, unit,
    unitPrice, subtotal,    // unitPrice × qty (pre-tax)
    gstRate?, cgst?, sgst?, igst?, cess?, totalTax?,
    total                   // subtotal + tax
  }>;
  subtotal, totalCgst?, totalSgst?, totalIgst?, totalCess?, totalTax?, grandTotal?;
  notes?;
}
```

### Key Files
- `src/infrastructure/pdf.ts` — `generateInvoicePdf(data): Promise<Buffer>`

---

## 7. MinIO Object Storage

### How PDFs Are Stored

After PDF generation, the buffer is uploaded to MinIO:

```typescript
// Object key pattern:
const objectKey = `invoices/{customerId}/{invoiceId}.pdf`;

// Upload
await minioClient.uploadFile(objectKey, pdfBuffer, { contentType: 'application/pdf' });

// Generate presigned URL (7-day expiry)
const pdfUrl = await minioClient.getPresignedUrl(objectKey, 7 * 24 * 3600);

// Persist URL to DB (fire-and-forget)
await invoiceService.savePdfUrl(invoice.id, objectKey, pdfUrl);
```

### Stored On Invoice Record

```prisma
model Invoice {
  pdfObjectKey  String?  @map("pdf_object_key")
  pdfUrl        String?  @map("pdf_url")
}
```

### Configuration

```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=execora
MINIO_USE_SSL=false
```

### Key Files
- `src/infrastructure/storage.ts` — `MinioClient` wrapper with `uploadFile()`, `getPresignedUrl()`
- `src/modules/invoice/invoice.service.ts` — `savePdfUrl()`

---

## 8. Email Delivery with PDF Attachment

### Trigger

Email is sent automatically after invoice confirmation if `pending.customerEmail` is set.

### What the Email Contains

- Invoice summary (items, quantities, total)
- Green "Download Invoice PDF" button (7-day presigned URL)
- PDF attached to email as `Invoice-{shortId}.pdf`
- Shop branding

### Code Path

```typescript
// src/modules/voice/engine.ts — executeConfirmInvoice()
if (pending.customerEmail) {
  emailService.sendInvoiceEmail(
    pending.customerEmail,
    pending.customerName,
    invoice.id,
    invoiceItems,
    grandTotal,
    shopName,
    pdfBuffer,         // Buffer attached to email
    pdfPresignedUrl    // Download button in email body
  ).catch(err => logger.error({ err }, 'Email send failed'));
}
```

### Email Service Interface

```typescript
// src/infrastructure/email.ts
async sendInvoiceEmail(
  to: string,
  customerName: string,
  invoiceId: string,
  items: InvoiceEmailItem[],
  grandTotal: number,
  shopName?: string,
  pdfBuffer?: Buffer,       // optional — attaches PDF to email
  pdfUrl?: string           // optional — "Download" button in body
): Promise<boolean>
```

### Configuration

```env
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your@email.com
EMAIL_PASSWORD=password
EMAIL_FROM="Shop Name <noreply@shop.com>"
```

---

## 9. Redis Conversation Memory

### Architecture

All conversation state is stored in Redis so it survives:
- Process restarts
- WebSocket reconnects
- Multi-instance deployments

### Key Structure

```
conv:{conversationId}:mem   → JSON blob (ConversationMemoryData)
```

### What's Stored Per Session

```typescript
interface ConversationMemoryData {
  conversationId:  string;
  messages:        ConversationMessage[];  // last 20 turns (user + assistant)
  context:         Record<string, any>;   // arbitrary key-value (pendingInvoice, etc.)
  lastActivity:    string;                // ISO timestamp
  activeCustomer?: { id: string; name: string };
  customerHistory: CustomerContext[];     // oldest → newest mentioned customers
  recentCustomers: Record<string, CustomerContext>;  // keyed by name.toLowerCase()
  turnCount:       number;
}
```

### TTL

Default: **4 hours** (refreshed on every write).
Override via `CONV_TTL_HOURS` env variable.

### Key Operations

| Method | Description |
|---|---|
| `addUserMessage(id, text, intent, entities)` | Append user turn, trim to 20 messages |
| `addAssistantMessage(id, text)` | Append assistant turn |
| `setContext(id, key, value)` | Store arbitrary context (e.g. pendingInvoice) |
| `getContext(id, key)` | Read context value |
| `setActiveCustomer(id, customer)` | Mark customer as active |
| `getActiveCustomer(id)` | Read active customer |
| `getContextSummary(id)` | Build LLM prompt string from memory |
| `clearMemory(id)` | Delete key from Redis |

### Key Files
- `src/modules/voice/conversation.ts` — `ConversationMemoryService` class
- `src/infrastructure/redis-client.ts` — `redisClient` singleton, `CONV_TTL_SECONDS`

---

## 10. Shop-Level Draft Persistence

### Problem Solved

Without this, a pending invoice draft is lost if:
- WebSocket connection drops mid-conversation
- Server restarts between "bill banao" and "haan"
- User switches devices

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
- `getContextSummary()` reads shop-level draft to inject into every LLM prompt, so "haan" always works even after reconnect

### Key Files
- `src/modules/voice/conversation.ts` — `setShopPendingInvoice()`, `getShopPendingInvoice()`

---

## 11. Customer Management

### Customer Search & Resolution

Every intent that requires a customer goes through `resolveCustomer()`:

```
1. Check Redis context for active customer (most recent mention)
2. Fuzzy name match (Levenshtein distance + token overlap)
3. If single result → use it
4. If multiple close matches → ask user to disambiguate
5. If not found → return CUSTOMER_NOT_FOUND error
```

### Fuzzy Matching Rules

- Levenshtein distance ≤ 2 → high confidence match
- Token overlap (multi-word names) → partial match
- Indian honorifics stripped ("ji", "bhai", "bhaiya") before matching
- Nickname aliases stored in `CustomerAlias` table

### Supported Operations

| Operation | Intent | Description |
|---|---|---|
| Create | `CREATE_CUSTOMER` | With duplicate detection |
| Search | All intents | Via fuzzy match + Redis context |
| Balance check | `CHECK_BALANCE` | From DB or 30s cache |
| Update phone | `UPDATE_CUSTOMER_PHONE` | With validation |
| Get info | `GET_CUSTOMER_INFO` | Full profile |
| Delete | `DELETE_CUSTOMER_DATA` | Admin-gated (see §16) |
| List balances | `LIST_CUSTOMER_BALANCES` | Ordered by balance DESC |
| Total pending | `TOTAL_PENDING_AMOUNT` | Sum of all balances > 0 |

### Customer Balance Tracking

- `customer.balance` — running total updated atomically on every invoice/payment
- `Ledger` table — full transaction history
- `Payment` table — individual payment records
- Balance recalculation: `syncBalance()` recomputes from ledger if needed

### Key Files
- `src/modules/customer/customer.service.ts` — all customer operations
- `src/infrastructure/fuzzy-match.ts` — name similarity engine

---

## 12. Ledger & Payment Recording

### How Balance Changes

| Event | Balance Change |
|---|---|
| Invoice confirmed | `+= grandTotal` (tax-inclusive) |
| Payment recorded | `-= amount` |
| Credit added | `+= amount` |
| Invoice cancelled | `-= grandTotal` |

### Ledger Entry Creation

Every financial event creates a `Ledger` entry:

```typescript
// src/modules/ledger/ledger.service.ts
await prisma.ledger.create({
  data: {
    customerId, tenantId,
    type: 'DEBIT' | 'CREDIT',
    amount, description,
    invoiceId?,   // linked invoice
    paymentId?,   // linked payment
  }
});
```

### Intents That Modify Balance

- `CREATE_INVOICE` + `CONFIRM_INVOICE` → creates Ledger DEBIT (customer owes)
- `RECORD_PAYMENT` → creates Ledger CREDIT (customer paid)
- `ADD_CREDIT` → creates Ledger CREDIT (manual credit)

---

## 13. Product Catalog & Auto-Creation

### Product Resolution in Invoice Preview

```typescript
// src/modules/invoice/invoice.service.ts — findOrCreateProduct()
1. Exact match by name (case-insensitive)
2. Fuzzy match (token overlap, Levenshtein ≤ 2)
3. If not found → auto-create at price ₹0 with autoCreated=true
```

Auto-created products are flagged in the voice response:
> "⚠️ Maggi naya product hai (price ₹0) — baad mein catalog mein update karo."

### Product Fields

```prisma
model Product {
  name         String
  price        Decimal
  unit         String       // kg, liter, packet, piece, etc.
  stock        Int
  hsnCode      String?      // GST HSN code
  gstRate      Decimal?     // GST slab (0, 5, 12, 18, 28)
  cess         Decimal?     // Additional CESS %
  isGstExempt  Boolean      // Override — zero tax regardless of rate
}
```

### Default Catalog

88 kirana products seeded via `prisma/seed.ts` with:
- Correct HSN codes (from GST Council rate schedule 2025)
- GST rates (0% / 5% / 12% / 18% / 28%)
- Exempt flag for grains, dal, fresh milk, salt, eggs

**Re-run seed anytime** — it upserts (updates existing, creates missing):
```bash
npx ts-node prisma/seed.ts
```

---

## 14. Reminder Scheduling

### Create a Reminder

```
"Rahul ko kal 500 rupaye ka reminder bhejo"
  │
  ├─ DATETIME parsed ("kal" → tomorrow)
  ├─ Creates Reminder record in DB
  ├─ Enqueues BullMQ job with delay
  └─ Worker fires at scheduled time → WhatsApp/SMS message
```

### Reminder Types

`payment_due · payment_overdue · invoice_reminder · low_stock · expiry_alert · follow_up · custom`

### Retry Logic

- 3 attempts per reminder
- Exponential backoff (base 60s)
- Failed reminders retained for 7 days

### Key Files
- `src/modules/reminder/reminder.service.ts`
- `src/infrastructure/queue.ts` — `remindersQueue`
- `src/infrastructure/workers.ts` — worker registration

---

## 15. Multi-Language Support

### TTS Languages

The voice response can be delivered in any language the TTS provider supports.

```
"Hindi mein bolo"    → SWITCH_LANGUAGE, entities.language = "hi"
"English mode"       → SWITCH_LANGUAGE, entities.language = "en"
"தமிழில் பேசு"      → SWITCH_LANGUAGE, entities.language = "ta"
```

### Intent Extraction

OpenAI handles Hinglish (Hindi + English mixed) natively. All entity values in the JSON response are always in Roman/English characters — Hindi Devanagari is transliterated automatically.

Example:
- "चीनी" → `"cheeni"` in `entities.items[].product`
- "भारत" → `"Bharat"` in `entities.customer`

---

## 16. Admin-Gated Customer Deletion

### Flow

```
User: "Rahul ka data delete karo"
  │
  ├─ Intent: DELETE_CUSTOMER_DATA
  ├─ Engine requests OTP to admin email
  ├─ Admin approves → OTP sent
  ├─ User provides OTP
  └─ Full cascade delete:
      ├─ CustomerAlias records
      ├─ CustomerCommunicationPrefs
      ├─ Invoices + InvoiceItems
      ├─ Payments + Ledger entries
      ├─ Reminders
      └─ Customer record
```

Deletion is irreversible and requires explicit admin OTP confirmation.

### Key Files
- `src/modules/voice/engine.ts` — `executeDeleteCustomerData()`
- `src/modules/customer/customer.service.ts` — `deleteCustomerAndAllData()`

---

## 17. Daily Summary

### Trigger

```
"aaj ka summary batao"  →  DAILY_SUMMARY intent
```

### What's Included

- Total invoices created today
- Total revenue (sum of invoice totals)
- Total payments received
- New customers added
- Outstanding balance (total pending)
- Top products sold

### Key Files
- `src/modules/voice/engine.ts` — `executeDailySummary()`
- `src/modules/invoice/invoice.service.ts` — `getDailySummary()`

---

## 18. Background Job Queues (BullMQ)

### Queues

| Queue | Purpose | Concurrency | Retry |
|---|---|---|---|
| `reminders` | Payment reminders via WhatsApp/SMS | 5 | 3× exponential (60s base) |
| `whatsapp` | WhatsApp message delivery | 10 | 3× exponential (30s base) |
| `media` | Audio/video processing | 3 | 2× no backoff |

### Architecture

```
src/infrastructure/queue.ts   ← Queue definitions + connection
src/infrastructure/workers.ts ← Worker processor registration
src/worker/index.ts           ← Separate worker process entry point
```

Workers run in a **separate process** from the API server, enabling independent scaling.

### Graceful Shutdown

```typescript
// queue.ts
export async function closeQueues(): Promise<void> {
  await remindersQueue.close();
  await whatsappQueue.close();
  await mediaQueue.close();
}
```

---

## 19. REST API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check (DB + Redis) |
| `GET` | `/metrics` | Application metrics |
| `GET` | `/api/customers/balances` | All customers with pending balance |
| `GET` | `/api/customers/total-pending` | Sum of all pending balances |
| `WS` | `/ws` | WebSocket voice channel |
| `POST` | `/webhooks/whatsapp` | WhatsApp incoming webhook |
| `GET` | `/webhooks/whatsapp` | Webhook verification |

### WebSocket Connection

```
ws://localhost:3000/ws
```

On connection, server immediately sends:
```json
{ "type": "voice:start", "data": { "sessionId": "ws-1706789012345-abc123" }, "timestamp": "..." }
```

---

## 20. Configuration Reference

### Required Environment Variables

```env
# Database (required)
DATABASE_URL=postgresql://user:pass@localhost:5432/execora

# OpenAI (required)
OPENAI_API_KEY=sk-...

# WhatsApp (required for reminders)
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=...

# STT (one required)
DEEPGRAM_API_KEY=...
# OR
ELEVENLABS_API_KEY=...
```

### Optional but Recommended

```env
# Redis (defaults to localhost:6379)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# MinIO (defaults to localhost:9000)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=execora

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=you@gmail.com
EMAIL_PASSWORD=app-password
EMAIL_FROM="My Shop <noreply@myshop.com>"

# Shop Identity
SHOP_NAME=My Kirana Store
SYSTEM_TENANT_ID=system-tenant-001
SYSTEM_USER_ID=system-user-001

# Conversation TTL
CONV_TTL_HOURS=4

# TTS/STT provider selection
TTS_PROVIDER=elevenlabs
STT_PROVIDER=deepgram
```

---

## 21. Database Schema Overview

### Core Models

```
Tenant ──< User ──< Session
       ──< Customer ──< Invoice ──< InvoiceItem
                    ──< Payment
                    ──< Ledger
                    ──< Reminder
                    ──< CustomerAlias
       ──< Product ──< StockMovement
       ──< ConversationSession ──< ConversationTurn
```

### Invoice Model (Key Fields)

```prisma
model Invoice {
  id          String
  invoiceNo   String         // human-readable, e.g. INV-2025-001
  status      InvoiceStatus  // draft | pending | paid | partial | cancelled
  subtotal    Decimal        // sum of line item prices (pre-tax)
  tax         Decimal        // total GST + CESS
  cgst        Decimal        // Central GST
  sgst        Decimal        // State GST
  igst        Decimal        // Integrated GST (inter-state)
  cess        Decimal        // CESS
  total       Decimal        // subtotal + tax = grand total
  pdfObjectKey String?       // MinIO object key
  pdfUrl      String?        // presigned download URL
}
```

### InvoiceItem Model (Key Fields)

```prisma
model InvoiceItem {
  productName String
  hsnCode     String?   // GST HSN code
  quantity    Decimal
  unitPrice   Decimal
  gstRate     Decimal   // slab %
  cgst        Decimal
  sgst        Decimal
  igst        Decimal
  cess        Decimal
  total       Decimal
}
```

---

## 22. Key File Reference

| File | Responsibility |
|---|---|
| `src/ws/handler.ts` | WebSocket lifecycle, session management, pipeline orchestration |
| `src/modules/voice/engine.ts` | All 23 intent handlers, business logic |
| `src/modules/voice/conversation.ts` | Redis-backed conversation memory, context summary |
| `src/integrations/openai.ts` | Intent extraction (20 rules), response generation, TTS |
| `src/modules/invoice/invoice.service.ts` | `previewInvoice()`, `confirmInvoice()`, GST integration |
| `src/modules/gst/gst.service.ts` | GST calculation, `KIRANA_GST_RATES`, supply type detection |
| `src/infrastructure/pdf.ts` | A4 PDF invoice generation (PDFKit), GST breakdown layout |
| `src/infrastructure/storage.ts` | MinIO client, `uploadFile()`, `getPresignedUrl()` |
| `src/infrastructure/email.ts` | `sendInvoiceEmail()` with PDF attachment |
| `src/infrastructure/queue.ts` | BullMQ queue definitions, graceful shutdown |
| `src/infrastructure/redis-client.ts` | Redis singleton, `CONV_TTL_SECONDS` |
| `src/modules/customer/customer.service.ts` | Customer CRUD, fuzzy search, balance |
| `src/types.ts` | `IntentType` enum, `IntentExtraction`, `ExecutionResult` interfaces |
| `prisma/schema.prisma` | Full database schema (36 models, 18 enums) |
| `prisma/seed.ts` | 88 kirana products with HSN codes and GST rates |
| `src/config.ts` | All environment variable definitions and defaults |

---

*End of Feature Reference — Execora v1.0*
