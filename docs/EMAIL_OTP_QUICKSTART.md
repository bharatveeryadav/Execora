# Email OTP - Visual Setup Guide 🎯

## Step 1: Get Email Credentials (Gmail Example)

```
1. Go to: https://myaccount.google.com/apppasswords
   └─ You need 2-Factor Authentication enabled first

2. Select Mail > Windows Computer
   ┌─────────────────────────┐
   │ Step 1: Select the app  │
   │ [Apps dropdown ▼]       │
   │ Choose: Mail            │
   └─────────────────────────┘
   
3. Google generates 16-character password:
   ┌─────────────────────────────┐
   │ Your password:              │
   │ abcd efgh ijkl mnop         │
   │ (Remove spaces for .env)    │
   └─────────────────────────────┘

4. Copy: abcdefghijklmnop
          (without spaces)
```

---

## Step 2: Edit `.env` File

### Before (empty or no email config)
```bash
# Your .env file
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
# No EMAIL settings
```

### After (with email)
```bash
# Your .env file  
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# EMAIL CONFIGURATION
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
EMAIL_FROM="Execora <your-email@gmail.com>"
```

---

## Step 3: Build & Deploy

```bash
# Step A: Install dependencies (if needed)
npm install

# Step B: Build TypeScript
npm run build
# ✅ Should complete with no errors

# Step C: Rebuild Docker
docker compose build app --no-cache
# ✅ Should end with "Image execora-app Built"

# Step D: Start app
docker compose up app -d

# Step E: Verify email service started
docker compose logs app | grep -i email
# ✅ Should show: "✉️ Email service initialized successfully"
```

---

## Step 4: Add Customer Email

### Using Prisma Studio (Easy - GUI)

```bash
# Open database editor
npx prisma studio

# 1. Click "customers" table
# 2. Click a customer row
# 3. Find "email" field
# 4. Type: bharat@example.com
# 5. Save (Ctrl+S)
```

### Using SQL (Command Line)

```bash
# Connect to database
docker compose exec postgres psql -U postgres -d execora

# Update customer (in SQL terminal):
UPDATE customers 
SET email='bharat@example.com' 
WHERE name='Bharat';

# Verify:
SELECT id, name, email FROM customers WHERE name='Bharat';
# Should show: bharat@example.com

# Exit:
\q
```

---

## Step 5: Test the OTP Flow

### Test via WebSocket

```bash
# Terminal 1: Install wscat if needed
npm install -g wscat

# Terminal 2: Connect to WebSocket
wscat -c ws://localhost:3000/ws

# Send deletion request:
{"type": "voice_message", "text": "Bharat ka data delete karo"}

# You should see response:
{
  "success": false,
  "error": "CONFIRMATION_NEEDED",
  "message": "Aapke email par OTP code bhej diya gaya...",
  "data": {
    "otp": "547392",
    "sent_via": "email"
  }
}
```

### Check Email

```
✉️ You should receive email within 1-2 seconds:

From: Execora <your-email@gmail.com>
Subject: ⚠️ Confirm Data Deletion - OTP: 547392

Inside email:
┌──────────────────────────┐
│      ⚠️ DELETE DATA       │
├──────────────────────────┤
│                          │
│    5 4 7 3 9 2           │
│  (Your OTP code)         │
│                          │
├──────────────────────────┤
│ This will delete:         │
│ • Invoices                │
│ • Ledger entries          │
│ • Reminders               │
│ • Messages                │
│                          │
│ Say in voice:             │
│ "Delete mere data,        │
│  OTP hai 547392"          │
│                          │
│ Expires in 15 min         │
└──────────────────────────┘
```

### Confirm Deletion in Voice

```bash
# In WebSocket, send:
{"type": "voice_message", "text": "Delete mere data, OTP hai 5 4 7 3 9 2"}

# System validates OTP
# All data deleted
# Confirmation email sent

# You should receive second email:
┌──────────────────────────┐
│      ✅ DATA DELETED      │
├──────────────────────────┤
│ Deleted successfully at:   │
│ 2026-02-20 15:30:00      │
│                          │
│ Records deleted:         │
│ • Invoices: 5            │
│ • Ledger: 12             │
│ • Reminders: 3           │
│ • Messages: 8            │
│                          │
│ Total: 28 records        │
│ PERMANENT ACTION         │
└──────────────────────────┘
```

---

## Troubleshooting Flowchart

```
❌ Email not working?
│
├─ Check 1: Did you add EMAIL_* to .env?
│  ├─ NO  → Add them and rebuild
│  └─ YES → Continue
│
├─ Check 2: Did you remove spaces from password?
│  ├─ NO  → Remove spaces: "abcd efgh" → "abcdefgh"
│  └─ YES → Continue
│
├─ Check 3: Did you rebuild Docker?
│  ├─ NO  → Run: docker compose build app --no-cache
│  └─ YES → Continue
│
├─ Check 4: Is app running?
│  ├─ NO  → Run: docker compose up app -d
│  └─ YES → Continue
│
├─ Check 5: Email service initialized?
│  ├─ NO  → docker compose logs app | grep -i email
│  └─ YES → Continue
│
├─ Check 6: Customer has email field?
│  ├─ NO  → Add email: npx prisma studio
│  └─ YES → Continue
│
└─ Still not working?
   → Check logs: docker compose logs app -f
   → Look for keywords: "email", "error", "failed"
```

---

## Common Issues & Fixes

### ❌ "Gmail says Less Secure App"
```
FIX 1: Use App Password (Recommended)
→ https://myaccount.google.com/apppasswords

FIX 2: Enable Less Secure Apps
→ https://myaccount.google.com/lesssecureapps
```

### ❌ "16-character password with spaces"
```
Given by Google: abcd efgh ijkl mnop
Use in .env:     abcdefghijklmnop
              (no spaces!)
```

### ❌ "Email address typo: .cm instead of .com"
```
WRONG:  workemailrecord@gmail.cm
FIX:    workemailrecord@gmail.com
```

### ❌ "Docker build failed"
```
FIX: npm install first
→ npm install
→ npm run build
→ docker compose build app --no-cache
```

### ❌ "Email sends but customer doesn't receive"
```
Checklist:
□ Email address is correct
□ Check spam/junk folder
□ Provider email isn't being blocked
□ Try with SendGrid if Gmail fails
```

---

## Quick Command Reference

```bash
# Setup
bash setup-email-otp.sh              # Interactive setup wizard
bash verify-email-setup.sh            # Verify configuration

# Build & Deploy
npm run build                         # Build TypeScript
docker compose build app --no-cache   # Rebuild Docker
docker compose up app -d              # Start application

# Database
npx prisma studio                     # Open database GUI
npx prisma migrate deploy             # Apply migrations

# Logs & Debugging
docker compose logs app | grep -i email    # Email logs
docker compose logs app -f                 # Live logs
curl http://localhost:3000/health         # App health

# Testing
wscat -c ws://localhost:3000/ws           # Connect to WebSocket
```

---

## Checklist: Am I Done? ✅

- [ ] Got Gmail App Password from myaccount.google.com/apppasswords
- [ ] Added 6 EMAIL_* lines to .env (no spaces in password)
- [ ] Ran: npm run build
- [ ] Ran: docker compose build app --no-cache
- [ ] Ran: docker compose up app -d
- [ ] Verified email service started (grep email in logs)
- [ ] Added email to at least one customer (npx prisma studio)
- [ ] Tested WebSocket: sent "Bharat ka data delete karo"
- [ ] Received OTP email to configured address
- [ ] ✅ Ready to use!

---

## Need Help?

📧 **Check logs:**
```bash
docker compose logs app | tail -50
# Look for: email, error, password, host
```

🧪 **Test email config with Node.js:**
```bash
node -e "
const nm = require('nodemailer');
const t = nm.createTransport({
  host: 'smtp.gmail.com', port: 587, secure: false,
  auth: { user: 'your-email@gmail.com', pass: 'your-password' }
});
t.verify((e, ok) => console.log(e || 'Config OK'));
"
```

📖 **Read full documentation:**
- [EMAIL_OTP_IMPLEMENTATION.md](EMAIL_OTP_IMPLEMENTATION.md) - Technical details
- [EMAIL_OTP_SETUP.md](EMAIL_OTP_SETUP.md) - Detailed guide
- [DELETE_CUSTOMER_DATA_EXAMPLE.md](DELETE_CUSTOMER_DATA_EXAMPLE.md) - Usage examples
