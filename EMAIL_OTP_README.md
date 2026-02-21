# 📧 Email OTP Setup - Complete Guide

## 🚀 TL;DR (5 Minutes)

```bash
# 1. Add to .env file:
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM="Execora <your-email@gmail.com>"

# 2. Build & deploy
npm run build
docker compose build app --no-cache
docker compose up app -d

# 3. Add customer email
npx prisma studio  # Click customer, add email

# 4. Test
# WebSocket: {"type": "voice_message", "text": "Bharat ka data delete karo"}
# Check inbox for OTP email ✅
```

---

## 📚 Full Documentation

### Quick Guides (Choose One)
| Guide | Best For | Time |
|-------|----------|------|
| [📱 Email OTP Quick Start](./EMAIL_OTP_QUICKSTART.md) | **Visual learners** - Flowcharts & diagrams | 2 min |
| [🔧 Email OTP Setup Guide](./EMAIL_OTP_SETUP.md) | **Step-by-step instructions** - Detailed | 5 min |
| [💻 Email OTP Implementation](./EMAIL_OTP_IMPLEMENTATION.md) | **Developers** - Technical details | 10 min |
| [📖 DELETE_CUSTOMER_DATA Examples](./DELETE_CUSTOMER_DATA_EXAMPLE.md) | **Testing** - Real examples | 5 min |

### Interactive Tools
```bash
# Automatic setup wizard
bash setup-email-otp.sh

# Verify configuration
bash verify-email-setup.sh
```

---

## ⚡ Quick Start (Choose Your Email Provider)

### Gmail (Recommended)

**Step 1: Get App Password**
```
1. Go: https://myaccount.google.com/apppasswords
2. Select: Mail > Windows Computer
3. Copy: 16-character password (remove spaces)
```

**Step 2: Update `.env`**
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=bharat@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
EMAIL_FROM="Execora <bharat@gmail.com>"
```

**Step 3: Deploy**
```bash
npm run build && docker compose build app --no-cache && docker compose up app -d
```

---

### SendGrid (Alternative)

**Step 1: Get API Key**
```
Go: https://app.sendgrid.com/settings/api_keys
Copy: SG.xxxxxxxxxxxxxxx
```

**Step 2: Update `.env`**
```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.xxxxxxxxxxxxxxx
EMAIL_FROM="Execora <support@your-domain.com>"
```

**Step 3: Deploy**
```bash
npm run build && docker compose build app --no-cache && docker compose up app -d
```

---

### Brevo (Budget-Friendly)

**Step 1: Get Credentials**
```
From: Brevo account settings
Get: SMTP login & password
```

**Step 2: Update `.env`**
```bash
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-login@brevo
EMAIL_PASSWORD=your-password
EMAIL_FROM="Execora <support@your-domain.com>"
```

**Step 3: Deploy**
```bash
npm run build && docker compose build app --no-cache && docker compose up app -d
```

---

## ✅ Verification Steps

### Step 1: TypeScript Build
```bash
npm run build
# Should show: "tsc" with NO errors
```

### Step 2: Docker Build
```bash
docker compose build app --no-cache
# Should end with: "Image execora-app Built ✓"
```

### Step 3: App Health
```bash
docker compose up app -d
sleep 3
curl http://localhost:3000/health
# Should return: {"status":"ok","checks":{"database":"ok","redis":"ok"}}
```

### Step 4: Email Service
```bash
docker compose logs app | grep -i email
# Should show: "✉️ Email service initialized successfully"
```

### Step 5: Customer Email
```bash
# Add email to a customer
npx prisma studio
# Or: UPDATE customers SET email='bharat@example.com' WHERE name='Bharat';
```

### Step 6: Test OTP Flow
```bash
# Connect to WebSocket
wscat -c ws://localhost:3000/ws

# Send: {"type": "voice_message", "text": "Bharat ka data delete karo"}
# Check email for OTP within 1-2 seconds ✅
```

---

## 🔍 Troubleshooting

### Issue: Build fails
```bash
# Solution: Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: "Invalid email credentials"
```bash
# Check 1: No spaces in password
WRONG: abcd efgh ijkl mnop
RIGHT: abcdefghijklmnop

# Check 2: Correct email domain
WRONG: workemailrecord@gmail.cm
RIGHT: workemailrecord@gmail.com

# Check 3: Gmail App Password (not regular password)
Gmail requires: 2-factor enabled + App Password
```

### Issue: Email not sending
```bash
# Check logs
docker compose logs app | grep -i email

# Test configuration
docker compose exec app node -e "
const nm = require('nodemailer');
const t = nm.createTransport({
  host: 'smtp.gmail.com', port: 587, secure: false,
  auth: { user: 'your-email@gmail.com', pass: 'app-password' }
});
t.verify((e, ok) => console.log(e || 'Config OK'));
"

# If still failing: Try SendGrid instead (different SMTP server)
```

### Issue: Docker build fails
```bash
# Clean rebuild
docker compose down
docker system prune -f
docker compose build app --no-cache
docker compose up app -d
```

---

## 🎯 Usage Example

### Voice Command
```
User: "Bharat ka data delete karo"
```

### System Flow
```
1. ✅ Recognizes DELETE_CUSTOMER_DATA intent
2. 📧 Generates 6-digit OTP → Sends email
   Subject: ⚠️ Confirm Data Deletion - OTP: 547392
3. 🎤 Waits for user confirmation with OTP
   User: "Delete mere data, OTP hai 547392"
4. 🔄 Validates OTP → Deletes all data atomically
5. 📧 Sends confirmation email
   Subject: ✅ Your data has been successfully deleted
   Shows: 28 records deleted
```

---

## 📞 Summary

| Step | Command | Time |
|------|---------|------|
| 1️⃣ Get credentials | App-specific (Gmail/SendGrid) | 2 min |
| 2️⃣ Edit .env | Add 6 EMAIL_* variables | 1 min |
| 3️⃣ Build | `npm run build` | 10 sec |
| 4️⃣ Docker | `docker compose build app --no-cache` | 30 sec |
| 5️⃣ Deploy | `docker compose up app -d` | 5 sec |
| 6️⃣ Customer email | `npx prisma studio` | 30 sec |
| 7️⃣ Verify | Send test command | 10 sec |
| **Total** | | **~5 min** |

---

## 📖 Documentation Files

- **📱 [EMAIL_OTP_QUICKSTART.md](./EMAIL_OTP_QUICKSTART.md)** - Visual guide with flowcharts
- **🔧 [EMAIL_OTP_SETUP.md](./EMAIL_OTP_SETUP.md)** - Detailed step-by-step setup
- **💻 [EMAIL_OTP_IMPLEMENTATION.md](./EMAIL_OTP_IMPLEMENTATION.md)** - Technical implementation details
- **📚 [DELETE_CUSTOMER_DATA_EXAMPLE.md](./DELETE_CUSTOMER_DATA_EXAMPLE.md)** - Usage examples

## 🛠️ Helper Scripts

- **setup-email-otp.sh** - Interactive setup wizard
- **verify-email-setup.sh** - Configuration verification

---

## ❓ FAQ

**Q: Do I need to change any code?**
A: No! Just add environment variables to `.env` and rebuild Docker.

**Q: What if I use a different email provider?**
A: Update `EMAIL_HOST`, `EMAIL_USER`, and `EMAIL_PASSWORD` according to the provider.

**Q: Can I test without sending real emails?**
A: Yes, the system logs OTP. Check logs: `docker compose logs app | grep OTP`

**Q: Is password stored securely?**
A: Yes, only in `.env` (environment variable), never in code.

**Q: What if email sending fails?**
A: System logs the error. Check: `docker compose logs app | grep email`

**Q: Can customers opt out of emails?**
A: Currently sends automatically. Optional: Add email preference setting.

---

## ✨ You're Done!

Once complete, customers can delete their data securely with:
```
User: "Mera data delete kar do"
System: 📧 Sends OTP email
User: "Delete mere data, OTP hai 547392"
System: ✅ Data deleted + Confirmation email sent
```

**Questions?** Check the detailed guides above! 🚀
