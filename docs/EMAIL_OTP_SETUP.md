# Email OTP Setup Guide - Step by Step

## 📋 Quick Setup (5 minutes)

### Step 1: Prepare Your Email Credentials

#### Option A: Gmail (Recommended for Testing)

1. Go to: `myaccount.google.com/apppasswords`
2. Select:
   - App: **Mail**
   - Device: **Windows Computer** (or your device)
3. Google generates a 16-character password
4. Copy it (you'll use this as `EMAIL_PASSWORD`)

**Example:**
```
Google gives you: xxxx xxxx xxxx xxxx
(spaces are just for display, remove them)
```

#### Option B: Gmail Alternative Method

If App Passwords not available:
1. Enable "Less secure app access" in Google Account
2. Use your regular Gmail password
3. Less secure but simpler

#### Option C: Other Email Providers

- **SendGrid**: Get API key from app.sendgrid.com
- **Brevo**: Get from account settings
- **Custom SMTP**: Get from your email host

---

## 🚀 Setup Steps

### Step 1: Edit `.env` File

```bash
# Open .env in your project root
nano .env
# or use VS Code
```

### Step 2: Add These Lines to `.env`

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-password
EMAIL_FROM="Execora <your-email@gmail.com>"
```

### Step 3: Replace With Your Actual Values

```env
# Example with real Gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=workemailrecord@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM="Execora Support <workemailrecord@gmail.com>"
```

**Note:** Remove spaces from the 16-char password: `abcdefghijklmnop`

### Step 4: Rebuild and Deploy

```bash
# Build TypeScript
npm run build

# Rebuild Docker image
docker compose build app --no-cache

# Start the app
docker compose up app -d

# Check logs for email service
docker compose logs app | grep -i email
```

### Step 5: Add Email to Customers

```bash
# Option A: Use Prisma Studio (easiest)
npx prisma studio

# Then click on "customers" table
# Edit each customer and add their email address
```

Or **Option B: SQL Command**

```bash
# Connect to database
docker compose exec postgres psql -U postgres -d execora

# Update customer email
UPDATE customers 
SET email='bharat@example.com' 
WHERE name='Bharat';

# Verify
SELECT id, name, email FROM customers;
```

### Step 6: Test the Email OTP Flow

```bash
# Connect to WebSocket
wscat -c ws://localhost:3000/ws

# Send deletion command
{"type": "voice_message", "text": "Bharat ka data delete karo"}

# You should see:
# - Response saying "Email par OTP bhej diya gaya"
# - Check workemailrecord@gmail.com for OTP email
# - Email should have large OTP code displayed
```

---

## 📧 Expected Email Format

### Email 1: OTP Notification

**Subject:** `⚠️ Confirm Data Deletion - OTP: 547392`

**Contains:**
- Large OTP code: **5 4 7 3 9 2**
- Warning about permanent deletion
- List of records to be deleted
- Instructions to say OTP in voice conversation
- 15-minute expiration notice

### Email 2: Deletion Confirmation

**Subject:** `✅ Your data has been successfully deleted`

**Contains:**
- Confirmation timestamp
- Deleted records breakdown
- Total records deleted: X
- Permanent deletion notice

---

## 🔧 Configuration Options

### Gmail (Free, Easiest)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-password-from-google
EMAIL_FROM="Execora <your-email@gmail.com>"
```

### SendGrid (Reliable, Paid)
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.xxxxxxxxxxxxxxx
EMAIL_FROM="Execora <support@your-domain.com>"
```

### Brevo (Affordable)
```env
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-brevo-password
EMAIL_FROM="Execora <support@your-domain.com>"
```

### Custom SMTP
```env
EMAIL_HOST=your.mail.server
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
EMAIL_FROM="Execora <noreply@your-domain.com>"
```

---

## ✅ Verify Setup is Working

### Check 1: Build Success
```bash
npm run build
# Should complete with NO errors
```

### Check 2: Docker Build Success
```bash
docker compose build app --no-cache
# Should end with "Image execora-app Built ✓"
```

### Check 3: App Started
```bash
curl -s http://localhost:3000/health
# Should return: {"status":"ok","checks":{"database":"ok","redis":"ok"},...}
```

### Check 4: Email Service Initialized
```bash
docker compose logs app | grep -i email
# Should see: "✉️ Email service initialized successfully"
```

### Check 5: Email Actually Sends
```bash
# Send deletion request via WebSocket
# Should see in logs: "📧 Deletion OTP sent via email"
# Should receive email at configured address
```

---

## 🐛 Troubleshooting

### Problem: "Email service not enabled"
**Solution:** Check `.env` file has EMAIL_* variables

### Problem: Build fails with email errors
**Solution:** Run `npm install` first
```bash
npm install
npm run build
```

### Problem: Email not sending
**Solution:** Check credentials
```bash
# Test with Node.js
node -e "
const nm = require('nodemailer');
const t = nm.createTransport({
  host: 'smtp.gmail.com', port: 587, secure: false,
  auth: { user: 'your-email@gmail.com', pass: 'app-password' }
});
t.verify((e, ok) => console.log(e || 'Email config OK'));
"
```

### Problem: Gmail says "Less secure app"
**Solution:** 
1. Use App Password instead (recommended)
2. Or enable Less Secure Apps in account settings
3. Or switch to SendGrid/Brevo

### Problem: 16-character password has spaces
**Solution:** Remove the spaces
```
Given:  xxxx xxxx xxxx xxxx
Use:    xxxxxxxxxxxxxxxx
```

### Problem: "Email address already exists"
**Solution:** Check if `email` field in database has UNIQUE constraint
```bash
# If needed, remove the constraint
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_key;
```

---

## 📝 Complete Example Workflow

```
1. User calls: "Bharat ka data delete karo"

2. System responds:
   "Aapke email par OTP code bhej diya gaya"

3. Email arrives (within 1-2 seconds):
   From: Execora <workemailrecord@gmail.com>
   Subject: ⚠️ Confirm Data Deletion - OTP: 547392
   
   Large text: 547392
   Message: "Confirm in voice conversation"

4. User says: "Delete mere data, OTP hai 5 4 7 3 9 2"

5. System validates OTP, deletes all data

6. Second email arrives:
   Subject: ✅ Your data has been successfully deleted
   
   Shows:
   - Invoices deleted: 5
   - Ledger entries deleted: 12
   - Reminders deleted: 3
   - Messages deleted: 8
   - Total: 28 records

Done! ✅
```

---

## 🚀 Quick Verification Checklist

- [ ] Gmail App Password generated from `myaccount.google.com/apppasswords`
- [ ] `.env` file has all 6 EMAIL_* variables
- [ ] No spaces in 16-character password
- [ ] Email address is correct (not typo like `.cm` instead of `.com`)
- [ ] `npm run build` completes without errors
- [ ] `docker compose build app` completes successfully
- [ ] App is running: `curl http://localhost:3000/health` returns OK
- [ ] Email service initialized: logs show "✉️ Email service initialized successfully"
- [ ] At least one customer has email address in database
- [ ] Test OTP flow and receive email

---

## 📞 Support

If email still not sending:
1. Check `.env` file syntax (no quotes around values)
2. Verify Gmail App Password has no spaces
3. Check if email account has 2-factor enabled (required for App Password)
4. Try with SendGrid instead for different SMTP server
5. Check Docker logs: `docker compose logs app -f`

**Logs Location:**
- Container logs: `docker compose logs app`
- Look for: "Email service", "OTP sent", "error"
