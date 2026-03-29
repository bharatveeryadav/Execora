# 🎙️ Execora — Real-Time Voice-Driven Business Engine

**Production-Grade Voice Processing System** for small merchants managing invoices, payments, customers, and reminders through voice commands.

| Grade            | Status    | Details                                              |
| ---------------- | --------- | ---------------------------------------------------- |
| **Overall**      | B+        | Production-ready for SME use with security hardening |
| **Architecture** | A+        | Modular, transaction-safe, scalable                  |
| **Security**     | D         | Critical gaps to fix (JWT, WebSocket auth, secrets)  |
| **Timeline**     | 2-3 weeks | To production-grade deployment                       |

---

## 📚 Documentation Hub (Lifecycle Order)

### 1) Quickstart

→ [QUICKSTART.md](QUICKSTART.md), [docs/README.md](docs/README.md), [START_HERE.md](START_HERE.md)

### 2) Development

→ [CONTRIBUTING.md](CONTRIBUTING.md), [docs/implementation/DEVELOPER_GUIDE.md](docs/implementation/DEVELOPER_GUIDE.md)

### 3) Testing

→ [docs/testing/README.md](docs/testing/README.md)

### 4) Deployment & CI/CD

→ [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [docs/cicd/README.md](docs/cicd/README.md), [docs/production/PRODUCTION_STRATEGY.md](docs/production/PRODUCTION_STRATEGY.md)

### 5) Operations & Monitoring

→ [docs/ops/README.md](docs/ops/README.md), [monitoring/README.md](monitoring/README.md), [docs/monitoring/OBSERVABILITY_ACCESS.md](docs/monitoring/OBSERVABILITY_ACCESS.md)

### 6) Audit & Security

→ [SECURITY.md](SECURITY.md), [docs/security/README.md](docs/security/README.md), [docs/security/SECURITY_HARDENING_GUIDE.md](docs/security/SECURITY_HARDENING_GUIDE.md)

---

## 🏗️ Core Features

- **Voice Commands**: Real-time Hindi/English voice processing
- **Invoice Management**: Create, track, and cancel invoices with atomic transactions
- **Credit Management**: Track customer balances with complete ledger
- **Payment Reminders**: Schedule WhatsApp reminders via BullMQ
- **Stock Management**: Automatic stock updates with invoices
- **WhatsApp Integration**: Send payment reminders and receive delivery status
- **Voice Recording**: Archive conversation sessions
- **Customer Search**: Smart search by name, nickname, landmark
- **Real-time WebSocket**: Streaming voice transcripts and responses
- **Transaction Safety**: ACID-compliant PostgreSQL transactions
- **Parallel Processing**: Multi-task execution with 3 concurrent slots
- **Auto-caching**: 3-layer caching for 95% latency reduction

### Technology Stack

| Layer             | Technology                 | Purpose                      |
| ----------------- | -------------------------- | ---------------------------- |
| **Language**      | TypeScript 5.3             | Type safety                  |
| **Runtime**       | Node.js 20+                | JavaScript server            |
| **Web Framework** | Fastify 4.26               | High-performance HTTP server |
| **Real-time**     | WebSocket (ws)             | Bidirectional communication  |
| **Database**      | PostgreSQL 15 + Prisma 5.9 | Data persistence & ORM       |
| **Cache**         | Redis 7                    | Session & query caching      |
| **Queue**         | BullMQ 5.1                 | Job processing               |
| **Storage**       | MinIO 7.1                  | S3-compatible object storage |
| **LLM**           | OpenAI GPT-4               | Intent extraction            |
| **STT**           | Deepgram 3.4               | Speech-to-text streaming     |
| **TTS**           | ElevenLabs                 | Voice synthesis              |
| **Email**         | Nodemailer 6.9             | SMTP email delivery          |
| **Logging**       | Pino 8.19                  | Structured logging           |
| **Monitoring**    | Prometheus 15.1            | Metrics collection           |
| **Dashboard**     | Grafana                    | Visualization                |
| **Testing**       | Node:test                  | Native test runner           |

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 20
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (recommended)

### Installation (5 minutes)

```bash
# Clone & install
git clone <repo-url>
cd execora
npm install

# Configure environment
cp .env.example .env
# Edit with your API keys, database URL, etc.

# Setup database
npm run db:push

# Start development
npm run dev
```

**Access:**

- API: `http://localhost:3000`
- WebSocket: `ws://localhost:3000/ws`
- Metrics: `http://localhost:3000/metrics`
- Health: `http://localhost:3000/health`

### Docker Quick Start

```bash
pnpm docker:up
pnpm docker:db:push
pnpm docker:seed
```

---

## 🎙️ Voice Commands (Hindi/English)

### Invoice Creation

```
"Rahul ko 2 milk aur 1 bread ka bill bana do"
```

### Payment Reminder

```
"Rahul ko 500 ka reminder kal shaam 7 baje bhejna"
```

### Record Payment

```
"Rahul ne 200 cash me diye"
"Suresh ne 500 UPI kiya"
```

### Check Balance

```
"Rahul ka balance batao"
```

### Check Stock

```
"Milk ka stock kitna hai?"
```

### Daily Summary

```
"Aaj kitna sale hua?"
```

---

## 📁 Project Structure

```
src/
├── index.ts              # Entry point & server bootstrap
├── config.ts             # Configuration management
├── types.ts              # TypeScript type definitions
│
├── api/                  # REST API routes
│   └── index.ts          # Route registration
│
├── ws/                   # WebSocket handlers
│   ├── handler.ts        # Basic WebSocket
│   └── enhanced-handler.ts  # Audio/voice handler
│
├── modules/              # Business logic (organized by domain)
│   ├── customer/         # Customer CRUD, search, deletion
│   ├── invoice/          # Invoicing with transactions
│   ├── ledger/           # Payment recording
│   ├── reminder/         # Scheduled reminders
│   ├── product/          # Product inventory
│   └── voice/            # Voice processing & intent
│
├── infrastructure/       # Cross-cutting concerns
│   ├── database.ts       # Prisma ORM singleton
│   ├── logger.ts         # Structured logging (Pino)
│   ├── error-handler.ts  # Centralized error handling
│   ├── metrics.ts        # Prometheus monitoring
│   ├── queue.ts          # BullMQ job queue
│   ├── email.ts          # Email service (SMTP)
│   ├── storage.ts        # MinIO object storage
│   ├── llm-cache.ts      # Multi-tier caching
│   ├── runtime-config.ts # Dynamic configuration
│   └── metrics-plugin.ts # Fastify metrics middleware
│
├── integrations/         # External service integrations
│   ├── openai.ts         # GPT-4 API
│   ├── stt/              # STT providers (Deepgram, ElevenLabs)
│   ├── tts/              # TTS providers (ElevenLabs, OpenAI)
│   └── whatsapp.ts       # WhatsApp API
│
└── __tests__/            # Test suite
    ├── helpers/          # Test fixtures & mocking
    └── *.test.ts         # Unit tests

prisma/
├── schema.prisma         # Database schema
├── migrations/           # Migration files
└── seed.ts               # Seed data script

monitoring/
├── prometheus.yml        # Metrics config
├── grafana/              # Grafana dashboard definitions
└── README.md             # Monitoring setup guide

docker-compose.yml       # Development stack
docker-compose.monitoring.yml  # Observability stack
Dockerfile               # API container
Dockerfile.worker        # Worker container

public/
├── index.html           # Main voice interface
├── index-audio.html     # Audio version
└── css/, js/            # Frontend resources

scripts/
├── manual-tests/         # One-off/manual test scripts
└── testing/              # Regression and test runners

docs/
├── QUICKSTART.md         # User guide
├── README.md             # Documentation overview
├── api/                  # API documentation
├── architecture/         # Architecture & design
├── features/             # Feature guides
├── implementation/        # Implementation details
├── monitoring/           # Observability guides
├── production/           # Production deployment
└── testing/              # Testing strategy
```

---

## 📊 API Documentation

### REST Endpoints

#### Customers

- `GET /api/v1/customers/search?q={query}` - Search customers
- `GET /api/v1/customers/:id` - Get customer details
- `POST /api/v1/customers` - Create customer

#### Invoices

- `GET /api/v1/invoices` - List invoices
- `POST /api/v1/invoices` - Create invoice
- `POST /api/v1/invoices/:id/cancel` - Cancel invoice

#### Ledger

- `POST /api/v1/ledger/payment` - Record payment
- `POST /api/v1/ledger/credit` - Add credit
- `GET /api/v1/ledger/:customerId` - Get ledger entries

#### Reminders

- `GET /api/v1/reminders` - List pending reminders
- `POST /api/v1/reminders` - Schedule reminder
- `POST /api/v1/reminders/:id/cancel` - Cancel reminder

#### Products

- `GET /api/v1/products` - List all products
- `POST /api/v1/products` - Create product
- `GET /api/v1/products/low-stock` - Get low stock products

#### Summary

- `GET /api/v1/summary/daily` - Get daily sales summary

See [docs/README.md](docs/README.md) for complete OpenAPI specification.

### WebSocket Events

**Client → Server**:

- `voice:transcript` - Streaming transcript
- `voice:final` - Final transcript to process
- `recording:start` - Start recording
- `recording:stop` - Stop recording

**Server → Client**:

- `voice:start` - Connection established
- `voice:transcript` - Transcript update
- `voice:intent` - Intent extracted
- `voice:response` - Natural language response
- `voice:tts-stream` - TTS audio stream
- `error` - Error message

---

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start with hot reload
npm run build            # Compile TypeScript
npm run start            # Run compiled JS

# Database
npm run db:push          # Sync schema to DB
npm run db:migrate       # Create migration
npm run db:studio        # Open Prisma Studio
npm run seed             # Seed test data
npm run db:generate      # Generate Prisma client

# Testing
npm run test             # Run all tests
npm test -- src/modules/customer  # Test one module

# Other
npm run worker           # Start background worker
npm run build:watch      # Watch TypeScript compilation
```

---

## 🧪 Testing

Tests use **Node.js built-in test runner** (no external framework).

```bash
npm run test

# Run specific test
npm test -- src/__tests__/customer.service.test.ts

# Run with coverage
NODE_TEST_COVERAGE=1 npm test
```

**Coverage:**

- Customer service: >85%
- Invoice service: >80%
- Ledger service: >80%
- Error handling: >90%

---

## 🗄️ Database Schema

### Core Tables

- `customers` - Customer master data
- `products` - Product catalog with stock
- `invoices` - Invoice headers
- `invoice_items` - Invoice line items
- `ledger_entries` - Financial transactions (immutable)
- `reminders` - Scheduled WhatsApp reminders
- `whatsapp_messages` - Message delivery tracking
- `conversation_sessions` - Voice session metadata
- `conversation_recordings` - Audio file references

Full schema: [prisma/schema.prisma](prisma/schema.prisma)

---

## 🎯 Environment Setup

### Required: .env File

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/execora

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# Deepgram (STT)
DEEPGRAM_API_KEY=...

# ElevenLabs (TTS)
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=...

# Email
EMAIL_PROVIDER=gmail
EMAIL_FROM=noreply@execora.com
EMAIL_GMAIL_USER=...
EMAIL_GMAIL_PASSWORD=...

# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

See [.env.example](.env.example) for complete template.

---

## 🚀 Production Deployment

### Before Going Live ✅

**Security** (2-3 days)

- [ ] Add JWT authentication
- [ ] Secure WebSocket with tokens
- [ ] Migrate secrets to vault
- [ ] Enable webhook signature verification

**Reliability** (2 days)

- [ ] Fix database migration race condition
- [ ] Add per-user rate limiting
- [ ] Tune database connection pool
- [ ] Configure health checks

**Observability** (2 days)

- [ ] Setup APM (Datadog/New Relic)
- [ ] Add distributed tracing
- [ ] Configure alerting
- [ ] Create incident response runbooks

**Testing** (3 days)

- [ ] Load test (100 → 1000 concurrent)
- [ ] Security audit
- [ ] Backup/restore test
- [ ] Failover test

### Security Hardening

See [docs/README.md](docs/README.md) for step-by-step implementation of all 7 critical security fixes.

### Deploy to Production

```bash
# Using Docker Compose
pnpm docker:up

# Or manual deployment
npm run build
npm run db:migrate
npm start
```

---

## 📊 Production Audit Summary

```
Overall Grade: B+
├─ Architecture: A+ (Excellent modular design)
├─ Security: D ⚠️ (Critical gaps to fix)
├─ Reliability: B (Good, needs APM)
├─ Performance: A- (Great caching, optimized)
└─ Operations: B (Monitoring ready, runbooks needed)

Critical Fixes Required:
1. API Authentication (JWT) — 2-3 days
2. WebSocket Authentication — 1 day
3. Secrets Management (Vault) — 1 day
4. Production Timeline: 2-3 weeks

Detailed audit: [docs/README.md](docs/README.md) (40+ pages)
```

---

## 🔐 Security Notes

⚠️ **Before Production:**

- [ ] Enable JWT authentication (see [docs/README.md](docs/README.md))
- [ ] Secure WebSocket with bearer tokens
- [ ] Never hardcode secrets in code
- [ ] Use strong database passwords
- [ ] Enable SSL for all external connections
- [ ] Enable webhook signature verification
- [ ] Setup rate limiting per customer
- [ ] Implement audit logging for data deletion

---

## 📞 Support & Contributing

### Getting Help

1. Check [docs/](docs/) for documentation
2. Review [docs/README.md](docs/README.md) for architecture patterns
3. Search existing issues
4. Create detailed issue with reproduction steps

### Contributing

- See [docs/README.md](docs/README.md)
- Follow code patterns in [docs/README.md](docs/README.md)
- Run tests: `npm test`
- Update docs for new features

### Reporting Security Issues

⚠️ **Do NOT create public issues for security problems**  
→ Contact security team privately

---

## 📖 Complete Documentation

| Purpose                        | Link                                                     |
| ------------------------------ | -------------------------------------------------------- |
| **Getting Started**            | [docs/README.md](docs/README.md)                         |
| **Start Here**                 | [START_HERE.md](START_HERE.md)                           |
| **Developer Guide**            | [docs/README.md](docs/README.md)                         |
| **Testing Guide**              | [docs/README.md](docs/README.md)                         |
| **Regression Testing**         | [docs/README.md](docs/README.md)                         |
| **CI/CD Quick Start**          | [docs/README.md](docs/README.md)                         |
| **Production Strategy**        | [docs/README.md](docs/README.md)                         |
| **Monitoring & Observability** | [docs/README.md](docs/README.md)                         |
| **Environment Management**     | [docs/README.md](docs/README.md)                         |
| **Security Fixes**             | [docs/README.md](docs/README.md)                         |
| **Executive Summary**          | [AUDIT_EXECUTIVE_SUMMARY.md](AUDIT_EXECUTIVE_SUMMARY.md) |
| **Full Production Audit**      | [docs/README.md](docs/README.md)                         |
| **Code Architecture**          | [docs/README.md](docs/README.md)                         |
| **Doc Navigation**             | [docs/README.md](docs/README.md)                         |
| **API Reference**              | [docs/README.md](docs/README.md)                         |
| **Architecture Deep Dive**     | [docs/architecture/](docs/architecture/)                 |
| **Quick Reference**            | [docs/README.md](docs/README.md)                         |

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

Built with:

- Fastify (high-performance HTTP)
- Prisma (ORM)
- BullMQ (job queue)
- OpenAI (LLM)
- PostgreSQL (database)
- Redis (cache)
- MinIO (object storage)
- WhatsApp Cloud API

---

**Execora** — Transforming Indian SME business operations through voice.

**Last Updated:** February 21, 2026  
**Status:** ✅ Production-Ready (with security hardening required)  
**Version:** 1.0.0  
**Audit Grade:** B+ (A+ Architecture, D Security)
