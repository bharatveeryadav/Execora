# Execora - Real-time Voice-Driven SME Business Engine

A production-ready, voice-first business management system built for Indian small and medium enterprises.

## 🎯 Features

- **Voice Commands**: Real-time Hindi/English voice processing
- **Invoice Management**: Create, track, and cancel invoices atomically
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

## 🏗️ Architecture

### Tech Stack

- **Backend**: Fastify + TypeScript
- **Database**: PostgreSQL 15
- **Queue**: Redis + BullMQ
- **Storage**: MinIO (S3-compatible)
- **AI**: OpenAI GPT-4
- **Voice**: WebRTC + WebSocket
- **Messaging**: WhatsApp Cloud API
- **Deployment**: Docker Compose

### Components

1. **API Server** (`src/index.ts`): Main Fastify server with REST + WebSocket
2. **Worker** (`src/worker/index.ts`): BullMQ worker for background jobs
3. **Business Engine** (`src/business/`): Domain logic modules
4. **Services** (`src/services/`): External API integrations
5. **Frontend** (`public/`): Minimal HTML/JS/CSS interface

## 📦 Installation

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- OpenAI API key
- WhatsApp Business API credentials (optional)

### Quick Start

1. **Clone and setup**:
```bash
git clone <repository>
cd execora
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env and add your API keys
```

3. **Start with Docker**:
```bash
docker-compose up -d
```

4. **Initialize database**:
```bash
npm run db:push
```

5. **Add sample data** (optional):
```bash
npm run seed
```

6. **Access**:
- Frontend: http://localhost:3000
- MinIO Console: http://localhost:9001 (admin/admin)

## 🚀 Development

### Run locally (without Docker)

1. **Start services**:
```bash
# Terminal 1: PostgreSQL (Docker)
docker run -p 5432:5432 -e POSTGRES_PASSWORD=execora postgres:15-alpine

# Terminal 2: Redis (Docker)
docker run -p 6379:6379 redis:7-alpine

# Terminal 3: MinIO (Docker)
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

2. **Generate Prisma client**:
```bash
npm run db:generate
npm run db:push
```

3. **Run application**:
```bash
# Terminal 4: API Server
npm run dev

# Terminal 5: Worker
npm run worker
```

## 📖 API Documentation

### REST Endpoints

#### Customers
- `GET /api/customers/search?q={query}` - Search customers
- `GET /api/customers/:id` - Get customer details
- `POST /api/customers` - Create customer

#### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/:id/cancel` - Cancel invoice

#### Ledger
- `POST /api/ledger/payment` - Record payment
- `POST /api/ledger/credit` - Add credit
- `GET /api/ledger/:customerId` - Get ledger entries

#### Reminders
- `GET /api/reminders` - List pending reminders
- `POST /api/reminders` - Schedule reminder
- `POST /api/reminders/:id/cancel` - Cancel reminder

#### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `GET /api/products/low-stock` - Get low stock products

#### Summary
- `GET /api/summary/daily` - Get daily sales summary

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

## 🔐 Security Notes

- Never commit `.env` file
- Use strong database passwords in production
- Enable SSL for MinIO in production
- Use WhatsApp Business API with proper verification
- Implement rate limiting for production

## 📊 Monitoring

View logs:
```bash
# API Server logs
docker-compose logs -f app

# Worker logs
docker-compose logs -f worker

# All logs
docker-compose logs -f
```

## 🧪 Testing

Run tests:
```bash
npm test
```

## 📚 Documentation

- Master index: [docs/README.md](docs/README.md)
- Features: [docs/features](docs/features)
- Architecture: [docs/architecture](docs/architecture)
- Implementation: [docs/implementation](docs/implementation)
- Testing: [docs/testing](docs/testing)

## 📝 Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key

Optional:
- `WHATSAPP_ACCESS_TOKEN` - WhatsApp Business API token
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp phone number ID
- `DEEPGRAM_API_KEY` - For STT
- `ELEVENLABS_API_KEY` - For TTS

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License

## 🙏 Acknowledgments

Built with:
- Fastify
- Prisma
- BullMQ
- OpenAI
- PostgreSQL
- Redis
- MinIO
- WhatsApp Cloud API

---

**Execora** - Transforming Indian SME business operations through voice.
