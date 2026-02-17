# 🚀 Execora Quick Start Guide

Get Execora running in under 5 minutes!

## ⚡ Fastest Start (Docker)

```bash
# 1. Clone and enter directory
git clone <repository>
cd execora

# 2. Create environment file
cp .env.example .env

# 3. Add your OpenAI API key to .env
# OPENAI_API_KEY=sk-your-key-here

# 4. Start everything with Docker
docker-compose up -d

# 5. Wait 30 seconds for services to start, then initialize database
docker-compose exec app npx prisma db push

# 6. Load sample data (optional)
docker-compose exec app npx prisma db seed

# 7. Open browser
open http://localhost:3000
```

Done! Execora is running.

## 🧪 Test the System

### Via Web Interface

1. Open http://localhost:3000
2. Wait for "Connected" status
3. Type in text input: "Rahul ka balance batao"
4. Click "Send"
5. See response!

### Via API

```bash
# Search customer
curl http://localhost:3000/api/customers/search?q=Rahul

# Create invoice
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "<customer-id>",
    "items": [
      {"productName": "Milk", "quantity": 2}
    ]
  }'

# Check daily summary
curl http://localhost:3000/api/summary/daily
```

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
docker-compose restart app worker
```

## 🔍 View Logs

```bash
# All logs
docker-compose logs -f

# Just app
docker-compose logs -f app

# Just worker
docker-compose logs -f worker
```

## 🛠️ Useful Commands

```bash
# Stop everything
docker-compose down

# Restart after code changes
docker-compose up -d --build

# Access database
docker-compose exec postgres psql -U execora -d execora

# View MinIO files
open http://localhost:9001  # admin / minioadmin

# Database UI
npm run db:studio
```

## 🎙️ Voice Commands to Try

1. **Create Invoice**:
   - "Rahul ko 2 milk ka bill bana do"
   
2. **Check Balance**:
   - "Rahul ka balance batao"
   
3. **Record Payment**:
   - "Rahul ne 200 de diye"
   
4. **Schedule Reminder**:
   - "Suresh ko 1500 ka reminder kal 7 baje bhejna"
   
5. **Check Stock**:
   - "Milk ka stock kitna hai"

## 🐛 Troubleshooting

### Connection Failed?
```bash
# Check services are running
docker-compose ps

# Restart everything
docker-compose restart
```

### Database Error?
```bash
# Reset database
docker-compose down -v
docker-compose up -d
docker-compose exec app npx prisma db push
docker-compose exec app npx prisma db seed
```

### Port Already in Use?
Edit `docker-compose.yml` and change port mappings:
```yaml
ports:
  - "3001:3000"  # Changed from 3000:3000
```

## 📖 Next Steps

1. Read [README.md](README.md) for full documentation
2. Explore API at http://localhost:3000/api/
3. Check database schema in `prisma/schema.prisma`
4. Customize prompts in `src/services/openai.service.ts`

## 🎉 You're Ready!

Execora is now processing voice commands in real-time!

Try speaking or typing commands to see the AI in action.

For production deployment, see [README.md](README.md) security notes.
