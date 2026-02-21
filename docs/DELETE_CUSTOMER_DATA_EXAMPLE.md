# DELETE_CUSTOMER_DATA Intent - Testing Examples

## Overview
The DELETE_CUSTOMER_DATA intent provides a secure, three-step voice-driven workflow to delete a customer and all their related data with **email-based OTP confirmation**.

---

## How It Works: Email-Based OTP Flow

### Traditional Approach (Previous)
- System generates 6-digit OTP → User speaks OTP → System validates

### Email-Based Approach (Current) ✅
- System generates 6-digit OTP → **Sends OTP via email** → User receives email → User speaks OTP from email → System validates

**Why Email-Based?**
- ✅ More secure - OTP not exposed in voice stream
- ✅ Audit trail - Email delivery confirmation
- ✅ User verification - Confirms customer has access to registered email
- ✅ Professional - Looks like legitimate service request
- ✅ Recoverable - User can refer to email if they didn't hear OTP clearly

---

## Example 1: Basic Hindi Command

### User Voice Input
```
"Bharat ka data delete karo"
```

### Step 1 - System Response (OTP sent via Email)
```
Message: "Mujhe pata chal gaya aap Bharat ke sare data delete karna chahte hain. 
Ye ek bahut important decision hai kyunki data permanent delete ho jayega 
aur isse recover nahi kar sakte.

Aapke email address par ek OTP code bhej diya gaya. 

Agar aap surely delete karna chahte hain, to kahiye: 'Delete mere data, 
OTP hai [aapka email par mila 6 digit code]'"

📧 Email Sent to: bharat@example.com
Subject: "⚠️ Confirm Data Deletion - OTP: 547392"

Email Content:
- OTP in large, bold letters: 547392
- Warning about permanent deletion
- Instructions for next step
- Account details being deleted
- Time limit: 15 minutes

Data Response:
{
  success: false,
  error: 'CONFIRMATION_NEEDED',
  data: {
    customerId: 'clp1a2b3c4d5e6f7g8h9i0j1k',
    customerName: 'Bharat',
    otp: '547392',  // For testing; user gets from email
    step: 'confirmation',
    sent_via: 'email'
  }
}
```

### Step 2 - User Confirmation with OTP
```
User Voice Input: "Delete mere data, OTP hai 547392"
```

### Step 3 - System Executes Deletion
```
Message: "Bharat ke sare data permanently delete ho gaye hain.

Deleted records:
- Invoices: 5
- Ledger Entries: 12
- Reminders: 3
- WhatsApp Messages: 8
- Conversation Records: 0

Confirmation message aapke email par bhi bhej diya gaya. Ye action permanent hai."

📧 Confirmation Email Sent to: bharat@example.com
Subject: "✅ Your data has been successfully deleted"

Email Content:
- Deletion confirmation with timestamp
- List of deleted records with counts
- Total records deleted: 28
- Support contact information
- Permanent notice

Data Response:
{
  success: true,
  message: "...[deletion message]...",
  data: {
    customerId: 'clp1a2b3c4d5e6f7g8h9i0j1k',
    customerName: 'Bharat',
    deletedRecords: {
      invoices: 5,
      ledgerEntries: 12,
      reminders: 3,
      whatsappMessages: 8,
      conversationRecords: 0
    },
    timestamp: '2026-02-20T14:15:30.000Z'
  }
}
```

---

## Example 2: English Command

### User Voice Input
```
"Remove all data for Priya"
```

### System Response (Same flow as above)
```
Message: "I understand you want to remove all data for Priya. 
This is a permanent action and cannot be undone.

If you're sure, please say: 'Delete my data, OTP is 823456'"

Data Response:
{
  success: false,
  error: 'CONFIRMATION_NEEDED',
  data: {
    customerId: 'clp2x3y4z5a6b7c8d9e0f1g2',
    customerName: 'Priya',
    otp: '823456',
    step: 'confirmation'
  }
}
```

---

## Example 3: Hindi-English Mix

### User Voice Input
```
"Raj ke sare records completely remove kar do"
```

### System Response
```
Message: "Raj ke sare data delete ho jayenge. Ye permanent hai.

Confirm karne ke liye boliye: 'Delete mere data, OTP hai 195723'"

Data Response:
{
  success: false,
  error: 'CONFIRMATION_NEEDED',
  data: {
    customerId: 'clp3m4n5o6p7q8r9s0t1u2v3',
    customerName: 'Raj',
    otp: '195723',
    step: 'confirmation'
  }
}
```

---

## Example 4: Failed OTP Verification (Wrong OTP)

### User Voice Input (After Step 1)
```
"Delete mere data, OTP hai 000000"  [WRONG OTP]
```

### System Response
```
Message: "OTP confirm kijiye please. 6 ank ka correct code boliye."

Data Response:
{
  success: false,
  error: 'OTP_MISMATCH',
  data: {
    customerId: 'clp1a2b3c4d5e6f7g8h9i0j1k',
    step: 'otp_verification'
  }
}
```

### User Re-attempt with Correct OTP
```
User Voice Input: "OTP hai 547392"  [CORRECT OTP]
```

Then proceeds to Step 3 deletion as shown in Example 1.

---

## Example 5: Missing OTP

### User Voice Input
```
"Yes, delete the data"  [No OTP provided]
```

### System Response
```
Message: "OTP confirm kijiye please. 6 ank ka code boliye."

Data Response:
{
  success: false,
  error: 'OTP_MISSING',
  data: {
    customerId: 'clp1a2b3c4d5e6f7g8h9i0j1k',
    step: 'otp_verification'
  }
}
```

---

## Testing Scenarios

### Scenario 1: Complete Happy Path
```
1. User: "Bharat ka data delete karo"
   → System generates OTP and asks for confirmation
   
2. User: "Delete mere data, OTP hai [OTP]"
   → System validates OTP and deletes all data
   
3. Result: ✅ Customer and all related records permanently deleted
```

### Scenario 2: Customer Not Found
```
User: "Delete data for NonExistentCustomer"
→ System Response: "Customer not found"
→ Error: 'CUSTOMER_NOT_FOUND'
```

### Scenario 3: Database Transaction Failure
```
User provides correct OTP → OTP verification passes
→ System attempts deletion
→ Database error occurs (transaction rolls back)

Response:
{
  success: false,
  message: 'Data delete karte waqt error aaya',
  error: '[Database error message]'
}
```

---

## Deleted Data Categories

When a customer is deleted, the following records are cascaded deleted:

| Category | Description | Example Count |
|----------|-------------|---|
| **Invoices** | All invoices issued to customer | 5 |
| **Invoice Items** | Line items in deleted invoices | 15 |
| **Ledger Entries** | All financial transactions (DEBIT/CREDIT) | 12 |
| **Reminders** | All scheduled reminders for customer | 3 |
| **WhatsApp Messages** | Messages linked to reminders | 8 |
| **Conversation Records** | Voice conversation sessions/recordings | 0 |

**Total in Example:** 28 related records deleted atomically

---

## Security Features

✅ **OTP-based Verification**
- 6-digit random OTP generated for each deletion attempt
- OTP must be provided and validated before deletion proceeds
- Prevents accidental deletions from one-off commands

✅ **Atomic Transactions**
- All deletions happen in a single Prisma transaction
- If any delete fails, entire transaction rolls back
- Guarantees data consistency - no partial deletions

✅ **Audit Logging**
- All deletion attempts logged with timestamp and customer ID
- Error messages captured for troubleshooting
- Supports compliance and data governance

✅ **User Confirmation**
- Multi-step process requires explicit confirmation
- Clear messaging in user's language (Hindi/English)
- Warning that action is permanent and cannot be undone

---

## Testing via Postman/cURL

### WebSocket Connection
```bash
# Connect to WebSocket endpoint
wscat -c ws://localhost:3000/ws

# Send voice message (via enhanced-handler)
{
  "type": "voice_message",
  "text": "Bharat ka data delete karo",
  "customerId": "clp1a2b3c4d5e6f7g8h9i0j1k"
}
```

### Expected Response Format
```json
{
  "type": "intent_result",
  "success": false,
  "error": "CONFIRMATION_NEEDED",
  "message": "Mujhe pata chal gaya aap Bharat ke sare data delete...",
  "data": {
    "customerId": "clp1a2b3c4d5e6f7g8h9i0j1k",
    "customerName": "Bharat",
    "otp": "547392",
    "step": "confirmation",
    "sent_via": "email"
  }
}
```

---

## Email Configuration Setup

### Prerequisites
- Node.js SMTP server (Nodemailer configured)
- Email service credentials
- Customer email address in database

### 1. Add Email Credentials to `.env`

```bash
# Copy template
cp .env.email.example .env.email.additions

# Edit .env and add:
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="Execora Support <support@execora.local>"
```

### 2. Gmail Setup (Recommended)
```
1. Go to myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer" (or custom app)
3. Copy 16-character generated password
4. Paste as EMAIL_PASSWORD in .env
```

### 3. SendGrid Setup (Alternative)
```
1. Get API key from https://app.sendgrid.com/settings/api_keys
2. Set EMAIL_HOST=smtp.sendgrid.net
3. Set EMAIL_USER=apikey
4. Set EMAIL_PASSWORD=SG.xxxxx (your API key)
```

### 4. Test Email Service
```bash
# Verify configuration
npm run build
docker compose up app -d

# Check logs
docker compose logs app | grep -i email

# Should see: "✉️ Email service initialized successfully"
```

### 5. Add Email to Customer Records
```bash
# Use Prisma Studio
npx prisma studio

# Or via SQL UPDATE
UPDATE customers SET email='bharat@example.com' WHERE name='Bharat';
```

---

## Testing via Postman/cURL

---

## Monitoring & Observability

### LLM Metrics Tracked
```
llm_requests_total{intent="DELETE_CUSTOMER_DATA"} incremented
llm_tokens_total{intent="DELETE_CUSTOMER_DATA"} tracked
llm_operation_cost{intent="DELETE_CUSTOMER_DATA"} calculated
```

### Logs Generated
```
✅ Successfully recognized DELETE_CUSTOMER_DATA intent
🗑️ Customer data permanently deleted
   customerId: clp1a2b3c4d5e6f7g8h9i0j1k
   customerName: Bharat
   deletedRecords: {invoices: 5, ledgerEntries: 12, ...}
```

---

## Common Edge Cases Handled

| Case | Handling |
|------|----------|
| Customer not found | Return error with CUSTOMER_NOT_FOUND |
| Invalid OTP format | Regex check: must be 6 digits |
| Wrong OTP | Comparison fails, ask user to retry |
| Missing OTP | Error message: OTP_MISSING |
| Network timeout during deletion | Transaction rolls back, error returned |
| Partial data deletion fails | Full transaction rolls back (atomicity) |
| Customer has no related records | Deletion still succeeds, counts = 0 |

---

## Related Code

- **Intent Definition**: [src/types.ts](src/types.ts) - `IntentType.DELETE_CUSTOMER_DATA`
- **Intent Extraction**: [src/integrations/openai.ts](src/integrations/openai.ts) - OpenAI prompt configuration
- **Intent Execution**: [src/modules/voice/engine.ts](src/modules/voice/engine.ts) - `executeDeleteCustomerData()` method
- **Database Cleanup**: [src/modules/customer/customer.service.ts](src/modules/customer/customer.service.ts) - `deleteCustomerAndAllData()` method
