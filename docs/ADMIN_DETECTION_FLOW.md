# 🔐 How System Detects Admin - Intent Analysis

## Detection Logic

The system checks **2 fields** to identify admin:

```javascript
// In engine.ts line 753:
const isAdmin = entities?.adminEmail || entities?.operatorRole === 'admin';
```

### Check 1: `operatorRole === 'admin'`
```javascript
✅ ADMIN: entities.operatorRole = 'admin'
❌ NOT ADMIN: entities.operatorRole = 'user'
❌ NOT ADMIN: (no operatorRole field)
```

### Check 2: `adminEmail` Present
```javascript
✅ ADMIN: entities.adminEmail = 'admin@company.com'
❌ NOT ADMIN: (no adminEmail field)
```

---

## How Intent is Processed

### Step 1️⃣: Intent Received
```javascript
{
  intent: 'DELETE_CUSTOMER_DATA',
  entities: {
    name: 'Raj Kumar',
    operatorRole: 'admin',        // ← Check this
    adminEmail: 'admin@corp.com'  // ← Check this
  }
}
```

### Step 2️⃣: Admin Detection
```
System checks:
├─ Is operatorRole === 'admin'?  → YES ✅
├─ Is adminEmail provided?       → YES ✅
└─ Result: ADMIN VERIFIED ✅
```

### Step 3️⃣: Process as Admin
```
✅ Allow deletion flow
📧 Send OTP to admin email
🔐 Require OTP verification
✅ Execute deletion
```

---

## Detection Examples

### Example 1: Admin ✅
```javascript
{
  intent: 'DELETE_CUSTOMER_DATA',
  entities: {
    name: 'Raj Kumar',
    operatorRole: 'admin',
    adminEmail: 'support@company.com'
  }
}

Result: ✅ ADMIN DETECTED
Action: Send OTP to admin email
```

### Example 2: Regular User ❌
```javascript
{
  intent: 'DELETE_CUSTOMER_DATA',
  entities: {
    name: 'Raj Kumar',
    operatorRole: 'user'  // ← NOT admin
  }
}

Result: ❌ NOT ADMIN
Error: UNAUTHORIZED_DELETE_OPERATION
Action: BLOCKED
```

### Example 3: Missing Admin Email ❌
```javascript
{
  intent: 'DELETE_CUSTOMER_DATA',
  entities: {
    name: 'Raj Kumar',
    operatorRole: 'admin'
    // ← Missing adminEmail
  }
}

Result: ❌ NO EMAIL
Error: ADMIN_EMAIL_MISSING
Action: BLOCKED
```

### Example 4: No Role Specified ❌
```javascript
{
  intent: 'DELETE_CUSTOMER_DATA',
  entities: {
    name: 'Raj Kumar'
    // ← No operatorRole
  }
}

Result: ❌ NOT ADMIN
Error: UNAUTHORIZED_DELETE_OPERATION
Action: BLOCKED
```

---

## Detection Flow Chart

```
Intent Received: DELETE_CUSTOMER_DATA
        ↓
Check: operatorRole === 'admin'?
        ├─ YES → Check adminEmail?
        │        ├─ YES → ✅ ADMIN VERIFIED
        │        └─ NO → ❌ ADMIN_EMAIL_MISSING
        └─ NO → Check adminEmail present?
                 ├─ YES → ✅ ADMIN VERIFIED
                 └─ NO → ❌ UNAUTHORIZED_DELETE_OPERATION
```

---

## Security Checks (Order)

```
1️⃣ Admin Role Check
   ├─ operatorRole === 'admin' OR
   └─ adminEmail provided?
   
   If NO → Return UNAUTHORIZED_DELETE_OPERATION
   
2️⃣ Admin Email Check
   ├─ adminEmail must exist?
   
   If NO → Return ADMIN_EMAIL_MISSING
   
3️⃣ Customer Exists Check
   ├─ Customer name found in DB?
   
   If NO → Return CUSTOMER_NOT_FOUND
   
4️⃣ OTP Verification Check
   ├─ OTP matches?
   
   If NO → Return OTP verification failed
   
5️⃣ Execute Deletion
   └─ If ALL checks pass → DELETE DATA ✅
```

---

## Required vs Optional

| Field | Required | Purpose |
|-------|----------|---------|
| `operatorRole` | One of two | Identifies as admin |
| `adminEmail` | One of two | Where OTP is sent |
| Both together | Best practice | Maximum security |

---

## Code Snippet (Detection)

```typescript
// From engine.ts line 753-761
const isAdmin = entities?.adminEmail || entities?.operatorRole === 'admin';

if (!isAdmin) {
  return {
    success: false,
    message: 'This operation is only available for admins',
    error: 'UNAUTHORIZED_DELETE_OPERATION',
  };
}

const adminEmail = entities?.adminEmail;
if (!adminEmail) {
  return {
    success: false,
    message: 'Admin email is required',
    error: 'ADMIN_EMAIL_MISSING',
  };
}
```

---

## Quick Reference

| Check | What System Looks For | Example |
|-------|----------------------|---------|
| Admin Detection | `operatorRole === 'admin'` OR `adminEmail` | operatorRole: 'admin' |
| Email Detection | `adminEmail` field present | adminEmail: 'admin@corp.com' |
| Both Missing | Neither field present | Returns UNAUTHORIZED |
| Email Only | adminEmail without role | Still works ✅ |
| Role Only | operatorRole: 'admin' without email | Works but needs email later |

---

**Status:** ✅ Admin Detection Working  
