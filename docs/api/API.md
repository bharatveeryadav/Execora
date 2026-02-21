# Execora REST API Reference

> Machine-readable spec: [`openapi.yaml`](openapi.yaml) (OpenAPI 3.0.3)
> Import into Postman, Insomnia, or Swagger UI to get a live playground.

---

## Base URL

| Environment | URL |
|---|---|
| Local | `http://localhost:3000` |
| Production | `https://your-domain.com` |

---

## Response format

All responses follow a consistent envelope pattern:

```json
// Success — resource wrapped in a named key
{ "customer": { ... } }
{ "customers": [ ... ] }
{ "invoice": { ... } }

// Error
{ "error": "Human-readable message", "statusCode": 404 }
```

Amounts are returned as **decimal strings** (`"1500.00"`) from Prisma to avoid floating-point errors.
Dates are **ISO 8601 UTC** strings.

---

## Endpoints

### Health

#### `GET /health`

```
→ { status: "ok", timestamp: "2026-02-20T10:30:00.000Z" }
```

Use for Docker healthchecks and uptime monitors.

---

### Customers

#### `GET /api/v1/customers/search?q={query}`

Fuzzy search across name, nickname, landmark, phone, and notes.

| Query param | Required | Description |
|---|---|---|
| `q` | Yes | Name, phone, nickname, or landmark |

The engine handles Hinglish transliteration variants and landmark-based disambiguation:

```bash
# Simple name
GET /api/v1/customers/search?q=Rahul

# Phone number — exact match takes priority
GET /api/v1/customers/search?q=9876543210

# Landmark disambiguation
GET /api/v1/customers/search?q=Rahul+atm+wala
```

```json
{
  "customers": [
    {
      "id": "clx1abc123",
      "name": "Rahul Gupta",
      "phone": "9876543210",
      "nickname": "Rahul bhai",
      "landmark": "ATM ke paas",
      "balance": 1500.00,
      "matchScore": 0.92
    }
  ]
}
```

`matchScore` is 0–1. Only results ≥ 0.3 are returned, sorted descending.

---

#### `GET /api/v1/customers/:id`

Returns full customer profile with last 5 invoices and all SCHEDULED reminders.

```json
{
  "customer": {
    "id": "clx1abc123",
    "name": "Rahul Gupta",
    "phone": "9876543210",
    "balance": "1500.00",
    "invoices": [ /* last 5 */ ],
    "reminders": [ /* all SCHEDULED */ ]
  }
}
```

**404** if customer not found.

---

#### `POST /api/v1/customers`

```json
// Request
{
  "name": "Suresh Kumar",        // required
  "phone": "9988776655",         // optional
  "nickname": "Suresh bhai",     // optional
  "landmark": "Main bazaar"      // optional
}

// Response
{ "customer": { "id": "...", "name": "Suresh Kumar", "balance": "0.00", ... } }
```

**Throws** if a customer with the same name already exists (case-insensitive).

---

### Products

#### `GET /api/v1/products`

Returns all products with current stock.

```json
{
  "products": [
    { "id": "...", "name": "Milk", "price": "28.00", "stock": 150, "unit": "packet" }
  ]
}
```

---

#### `POST /api/v1/products`

```json
// Request
{
  "name": "Bread",             // required
  "price": 45,                 // required — INR
  "stock": 80,                 // required — initial quantity
  "description": "400g white", // optional
  "unit": "loaf"               // optional, default: "piece"
}
```

---

#### `GET /api/v1/products/low-stock`

Returns products where stock ≤ low-stock threshold (default 10 units). Use for reorder alerts.

---

### Invoices

#### `GET /api/v1/invoices?limit=20`

Returns recent invoices across all customers, newest first.

| Query param | Default | Description |
|---|---|---|
| `limit` | `20` | Max invoices to return (1–500) |

---

#### `POST /api/v1/invoices`

**Single ACID transaction** — all-or-nothing.

```json
// Request
{
  "customerId": "clx1abc123",
  "items": [
    { "productName": "Milk", "quantity": 2 },
    { "productName": "Bread", "quantity": 1 }
  ],
  "notes": "Delivered to door"   // optional
}
```

What happens atomically:
1. Resolves products by name (case-insensitive, partial match)
2. Checks stock availability
3. Creates invoice + line items
4. Creates a DEBIT ledger entry
5. Decrements stock for each product
6. Increments customer balance

**Throws** if:
- Product not found: `"Product not found: Butter"`
- Insufficient stock: `"Insufficient stock for Milk. Available: 1, Requested: 5"`

---

#### `POST /api/v1/invoices/:id/cancel`

**Single ACID transaction** — reverses all invoice effects.

What happens atomically:
1. Creates a CREDIT ledger entry (reversal)
2. Restores stock for all products
3. Decrements customer balance
4. Marks invoice as `CANCELLED`

**Throws** if invoice not found or already cancelled.

---

### Ledger

The ledger is **immutable** — entries are never deleted, only reversed via new entries.

#### Ledger entry types

| Type | Effect on balance | When created |
|---|---|---|
| `DEBIT` | Balance ↑ (customer owes more) | Invoice created |
| `CREDIT` | Balance ↓ (customer paid or refunded) | Payment recorded, credit added, invoice cancelled |
| `OPENING_BALANCE` | Sets initial balance | Manual entry |

---

#### `POST /api/v1/ledger/payment`

Records a payment received from a customer.

```json
// Request
{
  "customerId": "clx1abc123",
  "amount": 500,
  "paymentMode": "upi",   // cash | upi | card | other
  "notes": "GPay received" // optional
}

// Response
{
  "entry": {
    "id": "...",
    "customerId": "clx1abc123",
    "type": "CREDIT",
    "amount": "500.00",
    "description": "Payment received (upi)",
    "paymentMode": "upi",
    "createdAt": "2026-02-20T11:00:00.000Z"
  }
}
```

---

#### `POST /api/v1/ledger/credit`

Adds a credit adjustment (return, discount, opening balance).

```json
// Request
{
  "customerId": "clx1abc123",
  "amount": 100,
  "description": "Return — 2 milk packets"
}
```

---

#### `GET /api/v1/ledger/:customerId?limit=50`

Returns customer ledger, newest first.

| Query param | Default | Description |
|---|---|---|
| `limit` | `50` | Max entries (1–1000) |

---

### Reminders

#### `GET /api/v1/reminders?customerId={id}`

Returns all SCHEDULED reminders. Filter by `customerId` to get a specific customer's pending reminders.

---

#### `POST /api/v1/reminders`

Schedules a WhatsApp payment reminder via BullMQ.

```json
// Request
{
  "customerId": "clx1abc123",
  "amount": 1500,
  "datetime": "kal 7 baje",        // natural language OR ISO 8601
  "message": "Custom message..."   // optional — default Hinglish message if omitted
}
```

**datetime parsing:**

| Input | Parsed as |
|---|---|
| `"kal 7 baje"` | Tomorrow 7:00 PM IST |
| `"kal 10 baje"` | Tomorrow 10:00 PM IST |
| `"aaj 5 baje"` | Today 5:00 PM IST |
| `"tomorrow"` | Tomorrow 7:00 PM IST |
| ISO 8601 string | Exact datetime |
| Anything else | 1 hour from now |

**Default message (if omitted):**
```
Namaste {name} ji,

₹{amount} payment pending hai. Kripya payment kar dein. 🙏

Dhanyavad
```

**Throws** if:
- Customer not found
- Customer has no phone number registered

**Consistency guarantee:** If BullMQ queue add fails after the DB record is created, the reminder is immediately marked `FAILED` — never stuck in `SCHEDULED`.

---

#### `POST /api/v1/reminders/:id/cancel`

Cancels a scheduled reminder and removes its BullMQ job if not yet fired.

---

### Sessions & Recordings

#### `GET /api/v1/sessions?limit=20`

Returns recent voice conversation sessions.

```json
{
  "sessions": [
    {
      "id": "clxsession1",
      "startedAt": "2026-02-20T09:00:00.000Z",
      "endedAt": "2026-02-20T09:05:00.000Z",
      "duration": 300,
      "recordings": [
        {
          "id": "clxrec1",
          "fileName": "recording-1708420800000.webm",
          "duration": 45,
          "size": 180000,
          "mimeType": "audio/webm"
        }
      ]
    }
  ]
}
```

---

#### `GET /api/v1/recordings/:id/url`

Generates a pre-signed MinIO download URL (expires in 1 hour).

```json
{
  "url": "http://localhost:9000/execora/recordings/session-123/recording-1708420800000.webm?X-Amz-..."
}
```

---

### Summary

#### `GET /api/v1/summary/daily`

Today's business snapshot (midnight to now, IST).

```json
{
  "summary": {
    "date": "2026-02-20T00:00:00.000Z",
    "invoiceCount": 12,
    "totalSales": 4850.00,
    "totalPayments": 3200.00,
    "cashPayments": 2000.00,
    "upiPayments": 1200.00,
    "pendingAmount": 1650.00
  }
}
```

| Field | Description |
|---|---|
| `invoiceCount` | Confirmed invoices created today |
| `totalSales` | Sum of all confirmed invoice totals |
| `totalPayments` | Sum of all CREDIT entries with a payment mode |
| `cashPayments` | Subset paid in cash |
| `upiPayments` | Subset paid via UPI |
| `pendingAmount` | `totalSales − totalPayments` |

---

### Webhooks

#### `GET /api/v1/webhook/whatsapp` — Verification

Meta calls this once when you register the webhook URL. Set `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in `.env`
to match the token you entered in the Meta dashboard.

```
?hub.mode=subscribe
&hub.verify_token=your-secret-token
&hub.challenge=CHALLENGE_STRING
→ 200 CHALLENGE_STRING (plain text)
→ 403 Forbidden (token mismatch)
```

---

#### `POST /api/v1/webhook/whatsapp` — Delivery Events

Receives real-time WhatsApp delivery status updates and syncs them to the `whatsapp_messages` table.

| Status | Effect |
|---|---|
| `sent` | Status updated to `SENT` |
| `delivered` | Status → `DELIVERED`, `deliveredAt` set |
| `read` | Status → `READ`, `readAt` set |
| `failed` | Status → `FAILED` |

Always returns `{ "status": "ok" }` immediately (Meta requires 200 within 20 seconds).

---

## WebSocket API

Connect to `ws://localhost:3000/ws` for the full voice pipeline.

### Client → Server messages

```json
// Start voice capture (begins Deepgram STT connection)
{ "type": "voice:start", "timestamp": "..." }

// Stop voice capture
{ "type": "voice:stop", "timestamp": "..." }

// Send text transcript manually (bypasses STT)
{ "type": "voice:final", "data": { "text": "Rahul ka balance batao" }, "timestamp": "..." }

// Start recording audio to MinIO
{ "type": "recording:start" }

// Stop recording
{ "type": "recording:stop" }
```

Binary frames (arraybuffer) are audio chunks sent directly to Deepgram for STT.

### Server → Client messages

```json
// Connection established
{
  "type": "voice:start",
  "data": {
    "sessionId": "ws-abc123",
    "sttAvailable": true,
    "ttsAvailable": true,
    "sttProvider": "deepgram",
    "ttsProvider": "elevenlabs"
  }
}

// Real-time transcript (streaming)
{ "type": "voice:transcript", "data": { "text": "Rahul ka bal...", "isFinal": false } }

// Final transcript
{ "type": "voice:transcript", "data": { "text": "Rahul ka balance batao", "isFinal": true } }

// Extracted intent (for UI display)
{ "type": "voice:intent", "data": { "intent": "CHECK_BALANCE", "entities": { "customerName": "Rahul" }, "confidence": 0.95 } }

// Business execution result (natural language)
{ "type": "voice:response", "data": { "text": "Rahul ka balance 1500 rupees hai", "result": { ... } } }

// TTS audio (base64 MP3)
{ "type": "voice:tts-stream", "data": { "audio": "base64...", "format": "mp3" } }

// Task queue events (for parallel multi-task)
{ "type": "task:queued",    "data": { "taskId": "t1", "intent": "CREATE_INVOICE" } }
{ "type": "task:started",   "data": { "taskId": "t1" } }
{ "type": "task:completed", "data": { "taskId": "t1", "result": { ... } } }
{ "type": "task:failed",    "data": { "taskId": "t1", "error": "..." } }

// Error
{ "type": "error", "data": { "message": "STT service unavailable" } }
```

---

## Using the OpenAPI Spec

### Swagger UI (local)

```bash
# Install swagger-ui globally
npm install -g @apidevtools/swagger-cli

# Or run with npx using swagger-ui-express
npx swagger-ui-serve docs/api/openapi.yaml
```

### Postman

1. Postman → Import → File → select `docs/api/openapi.yaml`
2. All endpoints are auto-imported with example bodies

### Insomnia

1. Insomnia → Import/Export → Import Data → From File → select `docs/api/openapi.yaml`

### Redoc (static HTML)

```bash
npx @redocly/cli build-docs docs/api/openapi.yaml --output docs/api/redoc.html
open docs/api/redoc.html
```

### Validate spec

```bash
npx @apidevtools/swagger-cli validate docs/api/openapi.yaml
```

---

## Metrics

`GET /metrics` returns Prometheus-format text. Scrape with Prometheus at `app:3000/metrics`.

Available metrics:

| Metric | Type | Labels |
|---|---|---|
| `http_requests_total` | Counter | `method`, `route`, `status_code` |
| `http_request_duration_seconds` | Histogram | `method`, `route` |
| `voice_sessions_total` | Counter | — |
| `business_operations_total` | Counter | `operation`, `status` |
| `invoice_operations_total` | Counter | `operation`, `status` |

---

*Last updated: 2026-02-20 — reflects module-based restructure and full error handling audit.*
