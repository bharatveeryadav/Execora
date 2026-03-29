# 🚀 Execora Quick Start Guide

Get Execora running in under 5 minutes!

**Features**: Real-time voice commands in Hindi/English, multi-command conversations with memory, parallel task execution (3 concurrent), instant 2ms responses, and 95% latency reduction through smart caching.

## 🆕 What's New

Recent updates include:

- ✅ **Per-conversation memory**: Say "Check balance" after mentioning a customer → system remembers!
- ✅ **Parallel task execution**: Execute 3 commands simultaneously (was sequential before)
- ✅ **Response templates**: 2ms responses for 99% of commands (was 1200ms with LLM)
- ✅ **3-layer caching**: Customer search, balance queries, conversation context
- ✅ **Database validation**: Fails fast with clear errors if schema is incomplete

See [docs/README.md](docs/README.md) for the complete technical breakdown.

## ⚡ Fastest Start (Docker)

```bash
# 1. Clone and enter directory
git clone <repository>
cd execora

# 2. Create environment file
cp .env.example .env

# 3. Add your OpenAI API key to .env
# OPENAI_API_KEY=sk-your-key-here

# 4. Start everything with Docker (cross-platform)
pnpm docker:up

# 5. Wait 30 seconds for services to start, then initialize database
pnpm docker:db:push

# 6. Load sample data (optional)
pnpm docker:seed

# 7. Open in your browser
# http://localhost:3000
```

Done! Execora is running.

## 🧪 Test the System

### Via Web Interface

1. Open http://localhost:3000
2. Wait for "Connected" status
3. Type: "Rahul ka balance batao"
4. Click "Send" → See instant response (2ms template response!)
5. Try second command without repeating customer name → Memory works!

### Via API

```bash
# Search customer (instant with cache)
curl http://localhost:3000/api/v1/customers/search?q=Rahul

# Create invoice (runs in parallel with other tasks)
curl -X POST http://localhost:3000/api/v1/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "<customer-id>",
    "items": [
      {"productName": "Milk", "quantity": 2}
    ]
  }'

# Check daily summary
curl http://localhost:3000/api/v1/summary/daily
```

### Performance Improvements (New!)

- ✅ 2ms response time for common commands (templates)
- ✅ Multi-command conversations with 5min memory
- ✅ 3 parallel task execution per conversation
- ✅ Smart caching with 95% latency reduction
- ✅ 65% reduction in API costs

## 📱 Add WhatsApp (Optional)

To enable WhatsApp reminders:

1. Get WhatsApp Business API credentials
2. Add to `.env`:

```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=any_random_string
```

3. Restart:

```bash
pnpm docker:restart
```

## 🔍 View Logs

```bash
# All logs
pnpm docker:logs

# Just app
pnpm docker:logs:app

# Just worker
pnpm docker:logs:worker
```

## 🛠️ Useful Commands

```bash
# Stop everything
pnpm docker:down

# Restart after code changes
pnpm docker:up

# Access database
node scripts/docker/compose.mjs exec postgres psql -U execora -d execora

# View MinIO files
# http://localhost:9001  # admin / minioadmin

# Database UI
npm run db:studio
```

## 🎙️ Voice Commands to Try

### Single Commands

1. **Check Balance**: "Rahul ka balance batao"
2. **Create Invoice**: "Rahul ko 2 milk aur 1 bread ka bill bana do"
3. **Record Payment**: "Rahul ne 200 cash me diye"
4. **Schedule Reminder**: "Suresh ko 1500 ka reminder kal 7 baje bhejna"
5. **Check Stock**: "Milk ka stock kitna hai"

### Multi-Command Conversations (New!)

Try these back-to-back to see **conversation memory** in action:

```
1. Say: "Rahul ka balance check karo"
   Get: "Rahul ka balance 500 rupees hai"

2. Say: "Ab invoice bana de" (without saying Rahul again!)
   System remembers: You meant Rahul!
   Get: Bill created for Rahul

3. Say: "Stock check karo"
   Get: Stock information (still remembers Rahul in context)
```

**Note**: The system remembers customer context for 5 minutes!

## 🐛 Troubleshooting

### Connection Failed?

```bash
# Check services are running
pnpm docker:ps

# Restart everything
pnpm docker:restart
```

### Database Error?

```bash
# Reset database
node scripts/docker/compose.mjs down -v
pnpm docker:up
pnpm docker:db:push
pnpm docker:seed
```

### Port Already in Use?

Edit `docker-compose.yml` and change port mappings:

```yaml
ports:
  - "3001:3000" # Changed from 3000:3000
```

## 📖 Next Steps

### For Users

1. Read [README.md](README.md) for full feature list
2. Explore API at http://localhost:3000/api/
3. Try multi-command conversations
4. Enable WhatsApp integration (optional)

### For Developers

1. Review [docs/README.md](docs/README.md) for technical details
2. Check [docs/README.md](docs/README.md) for recent changes
3. Study `prisma/schema.prisma` for database schema
4. Explore `src/integrations/openai.ts` for LLM customization
5. See [docs/README.md](docs/README.md) for system design

## 🎉 You're Ready!

Execora is now processing voice commands in real-time with:

- ✨ **Instant responses** (2ms for common commands)
- 🧠 **Conversation memory** (remembers customer context)
- ⚡ **Parallel execution** (up to 3 tasks simultaneously)
- 💰 **Cost-optimized** (95% latency reduction, 65% cheaper)

Try speaking or typing commands to see the AI in action.

For production deployment, see [README.md](README.md) security notes.
For developers, see [docs/README.md](docs/README.md).
