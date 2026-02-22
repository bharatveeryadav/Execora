# 🔧 Troubleshooting Guide - Execora

**Purpose:** Real issues faced during Execora development & production - ONLY actual issues encountered.

**Status:** Battle-Tested & Project-Specific  
**Last Updated:** February 2026  
**Scope:** ONLY issues debugged in actual project work

---

## Table of Contents

1. [Admin Detection Failures](#admin-detection-failures)
2. [Customer Deletion Not Working](#customer-deletion-not-working)
3. [Email OTP Not Sent or Verified](#email-otp-not-sent-or-verified)
4. [Deletion Race Conditions](#deletion-race-conditions)
5. [WebSocket Disconnections During Voice](#websocket-disconnections-during-voice)
6. [BullMQ Reminder Jobs Failing](#bullmq-reminder-jobs-failing)
7. [Invoice Creation Failed](#invoice-creation-failed)
8. [Voice Command Not Recognized](#voice-command-not-recognized)
9. [Message Processing Errors](#message-processing-errors)
10. [Database Connection Issues](#database-connection-issues)
11. [Docker Deployment Issues](#docker-deployment-issues)
12. [Quick Diagnostic Tool](#quick-diagnostic-tool)

---

## Admin Detection Failures

**Real Issue:** System incorrectly detects or fails to detect admin users, allowing unauthorized deletions or blocking admin operations.

### Symptom: "UNAUTHORIZED_DELETE_OPERATION - Not admin"

**What happens:**
- User tries `DELETE_CUSTOMER_DATA` command as admin
- System blocks it with error: `UNAUTHORIZED_DELETE_OPERATION`
- Error message: "Only admins can delete customer data"

**Why this happened:**
Admin detection checks TWO fields (see [ADMIN_DETECTION_FLOW.md](../ADMIN_DETECTION_FLOW.md)):
1. `entities.operatorRole === 'admin'`
2. `entities.adminEmail` is present

If EITHER is missing, deletion is blocked.

**Root causes:**
```
❌ operatorRole not set to 'admin' (set to 'user' instead)
❌ adminEmail field completely missing
❌ adminEmail is null or empty string
❌ Intent parser not extracting operatorRole correctly
❌ Voice command not understood to include admin role
```

**Diagnosis - Check What We Received:**

```bash
# 1. Enable debug logging
LOG_LEVEL=debug npm run dev

# 2. Make voice command
# "Bharat ka data delete karo" (as non-admin)

# 3. Look in logs for intent detection:
# Should see JSON like:
# {intent: 'DELETE_CUSTOMER_DATA', entities: {operatorRole: 'user', adminEmail: null}}

# 4. Check database for admin detection:
docker compose exec postgres psql -U execora -d execora << 'EOF'
SELECT id, name, email, role, is_admin FROM users LIMIT 5;
EOF

# 5. Check if operatorRole is being set in voice processor:
grep -n "operatorRole" src/modules/voice/*.ts
grep -n "adminEmail" src/modules/voice/*.ts
```

**Solution 1: Admin Not Detected In Voice Command**

Problem: Voice command is "Bharat ka data delete karo" but system doesn't know user is admin.

Fix: Include admin indicator in voice:
```
❌ "Bharat का data delete karo"
✅ "Admin access - Bharat का data delete karo"
✅ "As admin, delete Bharat के सभी data"
```

Or in test, explicitly set:
```javascript
const intent = {
  intent: 'DELETE_CUSTOMER_DATA',
  entities: {
    name: 'Bharat',
    operatorRole: 'admin',
    adminEmail: 'admin@company.com'
  }
}
```

**Solution 2: Create Admin User If Missing**

```bash
# 1. Check if any admin exists
docker compose exec postgres psql -U execora -d execora << 'EOF'
SELECT COUNT(*) FROM users WHERE is_admin = true;
EOF

# 2. If count is 0, create admin:
docker compose exec postgres psql -U execora -d execora << 'EOF'
INSERT INTO users (email, name, phone, is_admin, role)
VALUES ('admin@company.com', 'Admin User', '919876543210', true, 'admin')
ON CONFLICT (email) DO UPDATE SET is_admin = true;
EOF
```

**Test to Verify Fix:**

```bash
node scripts/manual-tests/test-admin-deletion.js
# Should see: ✅ Admin deletion allowed, ✅ OTP sent to admin email
```

---

## Customer Deletion Not Working

**Real Issue:** Customer deletion command partially works or fails at specific step.

### Symptom: "Deletion blocked / transaction rolled back"

**What happens:**
- Voice command: "Delete customer data"
- System responds with message about OTP
- But then nothing happens
- Or: Customer not actually deleted from database

**Why this happened:**
Customer deletion is a 3-step process (see [DELETE_CUSTOMER_DATA_EXAMPLE.md](../DELETE_CUSTOMER_DATA_EXAMPLE.md)):
1. ✅ Intent recognized, OTP generated
2. ❌ OTP not sent (email issue)
3. ❓ Verification step never happens

**Root causes:**
```
❌ Email service not configured (OTP can't send)
❌ OTP verification times out (>15 minutes)
❌ Database transaction fails mid-deletion
❌ Related records prevent deletion (foreign keys)
❌ User doesn't exist for deletion attempt
```

**Diagnosis:**

```bash
# 1. Check if deletion initiated:
docker compose logs api | grep -i "DELETE_CUSTOMER" | tail -20

# 2. Check OTP was generated:
docker compose logs api | grep -i "OTP" | tail -20

# 3. Check database for incomplete deletion:
docker compose exec postgres psql -U execora -d execora << 'EOF'
SELECT id, name, email, created_at FROM customers WHERE name = 'Bharat';
SELECT 'invoices' as table_name, COUNT(*) FROM invoices WHERE customer_id = <ID>
UNION ALL SELECT 'reminders', COUNT(*) FROM reminders WHERE customer_id = <ID>;
EOF
```

**Solution 1: Email/OTP Not Working**

See [Email OTP Not Sent](#email-otp-not-sent-or-verified) section.

**Solution 2: Deletion Blocked by Foreign Keys**

The system should delete related records first (CASCADE). Delete related invoices/reminders before customer.

**Solution 3: OTP Verification Timeout**

If OTP times out (user takes >15 minutes), request new OTP.

**Test to Verify Fix:**

```bash
node scripts/manual-tests/test-delete-flow.js
node scripts/manual-tests/test-delete-step1.js  
node scripts/manual-tests/test-delete-step2.js
```

---

## Email OTP Not Sent or Verified

**Real Issue:** Email OTP service fails to send emails or verify codes.

### Symptom 1: "OTP Email Not Received"

**What happens:**
- System says "OTP sent to your email"
- User doesn't receive email
- Email never arrives (checked spam folder)

**Root causes:**
```
❌ Email service not configured in .env
❌ SMTP credentials wrong (EMAIL_USER, EMAIL_PASSWORD wrong)
❌ Email service down/unreachable
❌ Email rate limited (too many attempts)
❌ Recipient email not valid
```

**Diagnosis:**

```bash
# 1. Check email configuration exists:
cat .env | grep EMAIL_
# Should have: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM

# 2. Test SMTP connection:
npm test -- email.test.ts

# 3. Check app logs for email errors:
docker compose logs api | grep -i email

# 4. Test connection manually:
bash setup-email-otp.sh  # Interactive setup
```

**Solution 1: Setup Email Using Script**

```bash
# Interactive setup:
bash setup-email-otp.sh

# This will:
# 1. Ask for email provider (Gmail, SendGrid, etc.)
# 2. Ask for credentials  
# 3. Update .env with configuration
# 4. Test connection
```

**Solution 2: Manual Configuration**

For Gmail:
```bash
# 1. Enable 2-Step Verification: https://myaccount.google.com/security
# 2. Create App Password: https://myaccount.google.com/apppasswords
# 3. Update .env:
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=your-email@gmail.com

# 4. Restart app
npm run dev
```

### Symptom 2: "OTP Verification Failed"

**What happens:**
- User receives OTP in email: `547392`
- User says: "Delete my data, OTP is 547392"
- System says: "Incorrect OTP" or "OTP not found"

**Root causes:**
```
❌ OTP already used (can only use once)
❌ OTP expired (>15 minutes old)
❌ User entered wrong code
❌ Code extraction from speech failed
```

**Diagnosis:**

```bash
# 1. Check OTP in database:
docker compose exec postgres psql -U execora -d execora << 'EOF'
SELECT id, user_id, code, status, created_at, expires_at 
FROM otp_codes 
ORDER BY created_at DESC 
LIMIT 5;
EOF

# 2. Check verification attempts:
docker compose logs api | grep -i "verify\|otp" | tail -30
```

**Solution 1: Clear Old OTP Attempts**

```bash
# If user tried too many times:
docker compose exec postgres psql -U execora -d execora << 'EOF'
DELETE FROM otp_codes 
WHERE user_id = <USER_ID> AND created_at < NOW() - interval '1 hour';
EOF
```

**Solution 2: Voice Recognition Issue**

If user speaks OTP but system doesn't extract correctly, ensure OTP pattern matching in voice processor.

**Test to Verify:**

```bash
node scripts/manual-tests/test-email-otp.js
# Should see: ✅ Email service initialized, ✅ OTP sent to email, ✅ Verification successful
```

---

## Deletion Race Conditions

**Real Issue:** Multiple deletion attempts happening simultaneously cause crashes or data corruption.

### Symptom: "Transaction rolled back / Duplicate deletion"

**What happens:**
- Multiple users try to delete same customer
- System errors: "Transaction conflict" or "Row locked"
- Database shows partial deletion

**Solution: Use Row-Level Locks**

```typescript
async function deleteCustomerData(customerId) {
  return await db.$transaction(async (tx) => {
    const customer = await tx.$queryRaw`
      SELECT * FROM customers WHERE id = ${customerId} FOR UPDATE`
    await tx.invoices.deleteMany({ where: { customerId } })
    await tx.customers.delete({ where: { id: customerId } })
  })
}
```

---

## WebSocket Disconnections During Voice

**Real Issue:** Voice conversation gets interrupted when WebSocket disconnects.

### Symptom: "Connection dropped mid-sentence"

**Solution 1: Add Heartbeat**

```typescript
socket.on('open', () => {
  const heartbeat = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) socket.ping()
    else clearInterval(heartbeat)
  }, 30000)
})
```

**Solution 2: Auto-Reconnect**

```typescript
function connectWebSocket() {
  ws = new WebSocket('ws://localhost:3000/ws')
  ws.onclose = () => setTimeout(() => connectWebSocket(), 5000)
}
```

**Solution 3: Graceful Error Handling**

```typescript
socket.on('message', async (data) => {
  try {
    const message = JSON.parse(data)
    const response = await processMessage(message)
    socket.send(JSON.stringify(response))
  } catch (error) {
    socket.send(JSON.stringify({ status: 'error', message: error.message }))
  }
})
```

---

## BullMQ Reminder Jobs Failing

**Real Issue:** Scheduled reminders don't send due to job queue failures.

### Symptom: "Reminders stuck in queue"

**Diagnosis:**

```bash
# Check worker
docker compose ps worker

# Check Redis
redis-cli ping

# Check queue state
redis-cli LLEN bull:reminders:wait
redis-cli LLEN bull:reminders:failed
```

**Solution 1: Start Missing Services**

```bash
docker compose up -d redis
npm run worker  # or docker compose up -d worker
```

**Solution 2: Clear Failed Jobs and Retry**

```bash
redis-cli DEL bull:reminders:failed
docker compose restart worker
```

**Solution 3: Fix Job Handler**

```typescript
async function handleReminderJob(job) {
  try {
    const { customerId, reminderId } = job.data
    const reminder = await db.reminders.findUnique({ where: { id: reminderId } })
    if (!reminder) throw new Error('REMINDER_NOT_FOUND')
    await sendReminderToCustomer(customerId, reminder)
    await db.reminders.update({ 
      where: { id: reminderId }, 
      data: { status: 'SENT', sentAt: new Date() } 
    })
  } catch (error) {
    console.error('Reminder job failed:', error.message)
    throw error
  }
}
```

---

## Invoice Creation Failed

**Real Issue:** Invoice creation partially succeeds or fails silently.

### Symptom: "Invoice shows 0 amount or not visible"

**Root causes:**
```
❌ Default values wrong (amount = 0)
❌ Voice extraction misunderstood amount
❌ Ledger entry creation fails
```

**Solution 1: Fix Voice Amount Extraction**

```typescript
const amountPattern = /(\d+(?:\.\d{2})?)\s*(?:rupees?|रुपये?|rs\.?)?/i
const matches = input.match(amountPattern)
if (matches) {
  const amount = parseFloat(matches[1])
} else {
  throw new Error('Could not extract amount')
}
```

**Solution 2: Make Creation Atomic**

```typescript
async function createInvoice(customerId, amount, description) {
  return await db.$transaction(async (tx) => {
    const invoice = await tx.invoices.create({
      data: { customerId, amount, description, status: 'PENDING' }
    })
    await tx.ledgerEntries.create({
      data: { customerId, invoiceId: invoice.id, amount, type: 'DEBIT' }
    })
    await tx.customers.update({
      where: { id: customerId },
      data: { balance: { increment: amount } }
    })
    return invoice
  })
}
```

**Solution 3: Validate Before Creating**

```typescript
function validateInvoiceData(customerId, amount) {
  const customer = db.customers.findUnique({ where: { id: customerId } })
  if (!customer) throw new Error('Customer not found')
  if (amount <= 0) throw new Error('Amount must be > 0')
  if (amount > 1000000) throw new Error('Amount too large')
  return true
}
```

---

## Voice Command Not Recognized

**Real Issue:** Voice commands not understood or misinterpreted.

### Symptom: "Command not understood / Wrong intent"

**Root causes:**
```
❌ Audio quality too poor
❌ Hindi pronunciation not recognized
❌ Mixed language (Hinglish) not handled
❌ Intent pattern doesn't match
```

**Solution 1: Improve Intent Matching**

```typescript
const intents = {
  CREATE_INVOICE: [
    /invoice.*rupee/i,
    /बनाओ.*invoice/i,
    /(?:नया|नई).*invoice/i,
  ],
  DELETE_CUSTOMER_DATA: [
    /delete.*data/i,
    /डेटा.*delete/i,
  ]
}

function findIntent(transcription) {
  for (const [intentName, patterns] of Object.entries(intents)) {
    for (const pattern of patterns) {
      if (pattern.test(transcription)) return intentName
    }
  }
  return null
}
```

**Solution 2: Log Unrecognized Commands**

```typescript
if (!intent) {
  await db.unrecognizedCommands.create({
    data: { transcription, userId, timestamp: new Date() }
  })
  
  throw new Error(
    `Could not understand: "${transcription}"\n` +
    `Try: "Create invoice", "Delete customer data"`
  )
}
```

---

## Message Processing Errors

**Real Issue:** Messages through WhatsApp/SMS stuck or not processed.

### Symptom: "Message stuck / No response"

**Diagnosis:**

```bash
# Check queue
redis-cli LLEN bull:whatsapp:wait

# Check worker
docker compose ps worker

# Check logs
docker compose logs worker | grep -i whatsapp
```

**Solution:** Same as [BullMQ Reminder Jobs Failing](#bullmq-reminder-jobs-failing) - start worker, check Redis, restart queue.

---

## Database Connection Issues

**Real Issue:** Application can't connect to PostgreSQL.

### Symptom: "Connection refused"

**Diagnosis:**

```bash
docker compose ps postgres
echo $DATABASE_URL
psql $DATABASE_URL -c "SELECT 1"
```

**Solution:**

```bash
# Start PostgreSQL
docker compose up -d postgres

# Verify DATABASE_URL
grep DATABASE_URL .env
# Should be: postgresql://execora:execora@postgres:5432/execora

# If max connections exceeded:
# In docker-compose.yml add:
# postgres:
#   environment:
#     POSTGRES_INITDB_ARGS: "-c max_connections=200"
```

---

## Docker Deployment Issues

**Real Issue:** Docker containers fail to start or crash.

### Symptom: "Container exited or restarting"

**Diagnosis:**

```bash
docker compose logs api
docker compose config
docker compose ps
```

**Solution:**

```bash
# View full logs
docker compose logs -f api --tail 100

# Common fixes:
# 1. Port in use
lsof -ti:3000 | xargs kill -9

# 2. Out of disk
df -h
docker system prune -a

# 3. Rebuild
docker compose build --no-cache
docker compose down -v
docker compose up -d
```

---

## Quick Diagnostic Tool

**Basic Checks:**
```bash
docker compose ps              # Services running?
curl http://localhost:3000/health  # API healthy?
psql $DATABASE_URL -c "SELECT 1"   # Database OK?
redis-cli ping                 # Redis OK?
ps aux | grep worker           # Worker running?
```

**Full Diagnostic:**

```bash
# 1. Check all services
docker compose ps

# 2. Test API
curl http://localhost:3000/health

# 3. Test database
docker compose exec postgres psql -U execora -d execora -c "SELECT COUNT(*) FROM customers;"

# 4. Check Redis
redis-cli KEYS bull:*

# 5. Check logs
docker compose logs -f api --tail 50  # API errors
docker compose logs -f worker --tail 50  # Worker errors
```

**Emergency Restart:**

```bash
# Full restart (dev - loses some data)
docker compose down
docker compose up -d
npm run seed
npm run dev

# Check health
curl http://localhost:3000/health
```

---

**Related Documentation:**
- [COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md) - Full command guide
- [DELETE_CUSTOMER_DATA_EXAMPLE.md](../DELETE_CUSTOMER_DATA_EXAMPLE.md) - Deletion flow details
- [ADMIN_DETECTION_FLOW.md](../ADMIN_DETECTION_FLOW.md) - Admin detection logic
- [QUICK_CHEAT_SHEET.md](QUICK_CHEAT_SHEET.md) - Daily quick reference

