> Backend Truth: Active runtime behavior is defined by apps/api/src/index.ts, apps/api/src/api/index.ts, and apps/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Execora System Architecture

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Browser    │  │   Mobile     │  │  Voice API   │      │
│  │  (WebSocket) │  │  (WebSocket) │  │   (REST)     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                    FASTIFY SERVER                             │
│                                                               │
│  ┌──────────────┐        ┌──────────────┐                   │
│  │  WebSocket   │        │  REST API    │                   │
│  │   Handler    │        │   Routes     │                   │
│  └──────┬───────┘        └──────┬───────┘                   │
│         │                       │                            │
│         └───────────┬───────────┘                            │
│                     │                                        │
│         ┌───────────▼──────────────┐                        │
│         │  Voice Engine            │                        │
│         │  (modules/voice/engine)  │                        │
│         │  - Intent Processing     │                        │
│         │  - Command Execution     │                        │
│         └───────────┬──────────────┘                        │
│                     │                                        │
│         ┌───────────▼──────────────┐                        │
│         │  Domain Modules          │                        │
│         │  (src/modules/)          │                        │
│         │  - customer/             │                        │
│         │  - invoice/              │                        │
│         │  - ledger/               │                        │
│         │  - reminder/             │                        │
│         │  - product/              │                        │
│         │  - voice/                │                        │
│         └───────────┬──────────────┘                        │
└─────────────────────┼───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌────────────┐  ┌──────────┐  ┌──────────┐
│ PostgreSQL │  │  Redis   │  │  MinIO   │
│  (ACID DB) │  │ (Queue)  │  │ (Files)  │
└────────────┘  └────┬─────┘  └──────────┘
                     │
                     ▼
            ┌────────────────┐
            │  BullMQ Worker │
            │  - Reminder    │
            │  - WhatsApp    │
            └────────┬───────┘
                     │
                     ▼
            ┌────────────────┐
            │ WhatsApp API   │
            └────────────────┘
```

## 🔄 Request Flow

### Voice Command Flow

```
User Speech
    │
    ▼
Wake Word Detection (Browser)
    │
    ▼
Audio Stream (WebRTC → WebSocket)
    │
    ▼
STT Service (Deepgram/ElevenLabs)
    │
    ▼
Transcript → OpenAI (Intent Extraction)
    │
    ▼
Business Engine → Execute Command
    │
    ├─→ Customer Service (Search/Create)
    ├─→ Invoice Service (ACID Transaction)
    ├─→ Ledger Service (Financial Record)
    ├─→ Reminder Service (Schedule Job)
    └─→ Product Service (Stock Update)
    │
    ▼
OpenAI (Natural Response Generation)
    │
    ▼
TTS Service (Audio Generation)
    │
    ▼
WebSocket → Browser (Audio Playback)
```

### Reminder Execution Flow

```
Scheduled Time Reached
    │
    ▼
BullMQ Worker (Polls Job)
    │
    ▼
Fetch Reminder from PostgreSQL
    │
    ▼
WhatsApp Cloud API (Send Message)
    │
    ▼
Update Reminder Status
    │
    ▼
Create WhatsApp Message Record
    │
    ▼
Webhook Receives Delivery Status
    │
    ▼
Update Message Status (delivered/read/failed)
```

## 🗄️ Data Flow

### Invoice Creation (ACID Transaction)

```
BEGIN TRANSACTION
    │
    ├─→ 1. Create Invoice Record
    │
    ├─→ 2. Create Invoice Items
    │
    ├─→ 3. Create Ledger Entry (DEBIT)
    │
    ├─→ 4. Update Product Stock (DECREMENT)
    │
    └─→ 5. Update Customer Balance
    │
COMMIT (or ROLLBACK on error)
```

### Payment Recording

```
BEGIN TRANSACTION
    │
    ├─→ 1. Create Ledger Entry (CREDIT)
    │
    └─→ 2. Update Customer Balance (DECREMENT)
    │
COMMIT
```

## 🔌 External Integrations

### OpenAI Integration

**Purpose**: Intent extraction & response generation

**Stage 1 - Intent Extraction**:
```
Input: Raw transcript
Model: GPT-4-turbo
Mode: JSON mode
Output: { intent, entities, confidence }
```

**Stage 2 - Response Generation**:
```
Input: Execution result
Model: GPT-4-turbo
Mode: Natural language
Output: Hindi/English response
```

### WhatsApp Cloud API

**Endpoints**:
- `POST /{phone-number-id}/messages` - Send message
- `POST /webhook` - Receive status updates

**Message Types**:
- Text messages
- Template messages
- Media messages

**Status Webhook**:
- sent
- delivered
- read
- failed

## 📦 Component Responsibilities

### Frontend (Browser)
- Wake word detection (Porcupine)
- Audio capture (WebRTC)
- WebSocket connection
- UI updates
- TTS playback

### Fastify Server
- WebSocket management
- REST API routing
- Request validation
- Session management
- Static file serving

### Voice Engine (`src/modules/voice/engine.ts`)
- Intent interpretation
- Command orchestration
- Module coordination
- Response formatting

### Domain Modules (`src/modules/`)
- **customer/**: Search, create, balance calculation
- **invoice/**: ACID transactions, stock updates
- **ledger/**: Financial records, payment tracking
- **reminder/**: Scheduling, cancellation, modification
- **product/**: Stock management, product catalog
- **voice/**: Session lifecycle, conversation memory, recording

### Worker Process
- Job polling from Redis
- Reminder execution
- WhatsApp message sending
- Retry logic
- Status updates

### PostgreSQL
- ACID transactions
- Financial data
- Customer records
- Invoice history
- Ledger entries

### Redis + BullMQ
- Job queue
- Delayed jobs
- Retry mechanism
- Job prioritization

### MinIO
- Voice recordings
- Audio files
- Document storage
- Pre-signed URLs

## 🔒 Security Layers

### 1. API Layer
- CORS configuration
- Request validation (Zod)
- Rate limiting (to be added)

### 2. Database Layer
- Parameterized queries (Prisma)
- Transaction isolation
- Connection pooling

### 3. Integration Layer
- API key management (env vars)
- Webhook verification (WhatsApp)
- Secure file storage (MinIO)

## 📊 Monitoring & Observability

### Logging
- **Pino** structured logging
- Request/response logs
- Error tracking
- Performance metrics

### Tracing (Future)
- OpenTelemetry SDK
- Distributed tracing
- Service dependencies
- Performance bottlenecks

## 🚀 Deployment Architecture

### Docker Compose (Single Server)

```
┌─────────────────────────────────────┐
│           VPS / Cloud Server         │
│                                      │
│  ┌──────────────────────────────┐   │
│  │     Docker Compose           │   │
│  │                              │   │
│  │  ┌─────────┐  ┌──────────┐  │   │
│  │  │   App   │  │  Worker  │  │   │
│  │  └────┬────┘  └────┬─────┘  │   │
│  │       │            │         │   │
│  │  ┌────┴────────────┴─────┐  │   │
│  │  │  PostgreSQL • Redis   │  │   │
│  │  │       • MinIO         │  │   │
│  │  └──────────────────────┘  │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Scaling Strategy (Future)

```
Load Balancer
    │
    ├─→ App Instance 1 ──┐
    ├─→ App Instance 2 ──┼─→ PostgreSQL (Master)
    └─→ App Instance 3 ──┘       │
                                 ├─→ PostgreSQL (Replica)
    Worker Pool                  │
    ├─→ Worker 1 ────────────────┘
    ├─→ Worker 2 ────────────────→ Redis Cluster
    └─→ Worker 3 ────────────────→ MinIO Cluster
```

## 🎯 Key Design Decisions

### 1. Monolith over Microservices
- **Why**: Simpler deployment, lower latency
- **Trade-off**: Scaling requires full instance replication

### 2. WebSocket for Voice
- **Why**: Real-time streaming, low latency
- **Trade-off**: Stateful connections

### 3. BullMQ for Jobs
- **Why**: Reliable retry, delayed execution
- **Trade-off**: Redis dependency

### 4. Two-Stage LLM
- **Why**: Safety (JSON extraction), flexibility (natural responses)
- **Trade-off**: Higher API costs

### 5. PostgreSQL Transactions
- **Why**: ACID guarantees for financial data
- **Trade-off**: Write throughput limitations

## 📈 Performance Characteristics

### Latency Targets
- Voice → Transcript: < 800ms
- Intent Extraction: < 900ms
- DB Operations: < 100ms
- Response Generation: < 700ms
- **Total**: ~2-3 seconds (perceived)

### Throughput
- Concurrent WebSocket connections: 1000+
- REST API requests: 5000+ req/min
- Worker jobs: 100+ jobs/min

### Storage
- PostgreSQL: 1GB - 100GB (typical SME)
- MinIO: 10GB - 1TB (voice recordings)
- Redis: < 1GB (queue data)

---

**Last Updated**: February 2026
**Version**: 1.0.0
