# Error Handling - Quick Reference Card

## 🎯 Three Ways to Handle Errors

### 1️⃣ **Throw Specific Error** (For Route/Service Errors)
```typescript
// ❌ DON'T:
throw new Error('Customer not found');

// ✅ DO:
throw new NotFoundError('Customer', customerId);

// Usage:
if (!customer) {
  throw new NotFoundError('Customer', 123);
}
```

**Error Classes Available:**
```typescript
import {
  ValidationError,              // 400 - Invalid input
  AuthenticationError,          // 401 - Missing/invalid auth
  AuthorizationError,           // 403 - Permission denied
  NotFoundError,                // 404 - Resource not found
  ConflictError,                // 409 - Duplicate/conflict
  RateLimitError,               // 429 - Too many requests
  DatabaseError,                // 500 - DB failed
  ExternalServiceError,         // 502 - OpenAI/WhatsApp failed
  BusinessLogicError,           // 422 - Business rule violation
  WebSocketError,               // 500 - WebSocket failed
} from './infrastructure/error-handler';
```

---

### 2️⃣ **Wrap with ErrorHandler.handle()** (For Critical Operations)
```typescript
// ✅ Automatically logs errors AND auto-wraps them
const customer = await ErrorHandler.handle(
  async () => {
    return await database.query('SELECT * FROM customers');
  },
  { operation: 'fetchCustomer', customerId: 123 }
);

// If error: ErrorHandler logs it + re-throws as AppError
// If success: Returns data directly
```

---

### 3️⃣ **Use ErrorHandler.tryCatch()** (For Non-Critical Ops)
```typescript
// ✅ Never throws - returns { success, data, error }
const { success, data, error } = await ErrorHandler.tryCatch(
  async () => {
    return await emailService.send({ to: 'user@example.com' });
  },
  { email: 'user@example.com' }
);

if (success) {
  console.log('Email sent!');
} else {
  console.log('Email failed (non-critical):', error?.message);
  // Continue execution
}
```

---

## 📍 WHERE TO CATCH (By Location)

### In Fastify Routes
```typescript
router.post('/api/customers/:id', async (request, reply) => {
  // throw error → Fastify error handler catches
  // Already logs + formats response automatically
  throw new ValidationError('Invalid name');
});
```

### In Services/Database
```typescript
export class CustomerService {
  async getById(id: string) {
    return ErrorHandler.handle(
      async () => {
        const customer = await db.customer.findUnique({ where: { id } });
        if (!customer) throw new NotFoundError('Customer', id);
        return customer;
      },
      { customerId: id }
    );
  }
}
```

### In WebSocket Handlers
```typescript
connection.on('message', async (data) => {
  try {
    const msg = JSON.parse(data);
    await handleMessage(msg);
  } catch (error) {
    const wsError = new WebSocketError('Parse failed');
    ErrorHandler.logError(wsError);
    this.sendError(connection, wsError); // ← Send to browser
  }
});
```

### In External Service Calls
```typescript
try {
  const response = await openaiService.complete(prompt);
} catch (error) {
  throw new ExternalServiceError('OpenAI', 'API failed', error, {
    model: 'gpt-4',
    tokens: 500
  });
}
```

---

## 🔍 WHERE TO VIEW ERRORS

### 1. **Server Console** (Development)
```bash
npm start
# Outputs:
# ❌ ERROR: Customer not found
# 🚨 CRITICAL: Database connection lost
```

### 2. **Log File** (Local Backup)
```bash
tail -f logs/app.log

# Or filter by error type:
grep "ValidationError" logs/app.log
grep "category.*database" logs/app.log
```

### 3. **Grafana Dashboard** (Monitoring)
```
http://localhost:3001/d/grafana
Select: Execora Error Dashboard
Filter: severity=critical or category=database
```

### 4. **In Browser** (For WebSocket Errors)
```json
{
  "type": "error",
  "data": {
    "message": "Connection lost",
    "timestamp": "2026-02-20T..."
  }
}
```

---

## 📋 ERROR STRUCTURE

All errors logged as:
```json
{
  "name": "NotFoundError",
  "message": "Customer with ID 999 not found",
  "category": "notfound",
  "severity": "low",
  "statusCode": 404,
  "timestamp": "2026-02-20T10:30:45.123Z",
  "context": {
    "operation": "fetchCustomer",
    "customerId": 999,
    "userId": "user-123"
  }
}
```

**Good context includes:**
- ✅ What operation failed
- ✅ What data was involved (sanitized!)
- ✅ User/request info
- ✅ System state

**Don't include:**
- ❌ Passwords, API keys, tokens
- ❌ Full database dumps
- ❌ Sensitive PII

---

## 🚀 Quick Commands

```bash
# View recent errors
tail -20 logs/app.log

# Count errors by type
grep "ERROR\|CRITICAL" logs/app.log | wc -l

# Find specific error
grep "ValidationError" logs/app.log | head -5

# Live tail (like tail -f)
tail -f logs/app.log | grep --line-buffered "ERROR"

# For Docker
docker logs execora-app | grep ERROR
```

---

## ✅ Checklist Before Deploy

- [ ] All routes use specific error classes (not generic Error)
- [ ] Critical operations wrapped with ErrorHandler.handle()
- [ ] Non-critical ops use ErrorHandler.tryCatch()
- [ ] No console.log() for errors (use ErrorHandler)
- [ ] Context includes useful debugging info
- [ ] Sensitive data not logged
- [ ] Global error handlers active (setupGlobalErrorHandlers())
- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm test`

---

## 🎨 Example: Complete Flow

```typescript
// 1. ROUTE receives request
fastify.post('/api/customers', async (request, reply) => {
  // 2. VALIDATE input
  if (!request.body.name) {
    throw new ValidationError('Name is required'); // ← Specific error!
  }

  // 3. CALL service (wrapped)
  const customer = await ErrorHandler.handle(
    async () => {
      return await customerService.create({
        name: request.body.name,
        phone: request.body.phone,
      });
    },
    { operation: 'createCustomer' } // ← Context
  );

  // 4. SUCCESS - return to browser
  reply.code(201).send({
    success: true,
    data: customer,
  });
});

// What happens if error occurs?
// 1. Error thrown (specific class)
// 2. ErrorHandler.logError() called (logs to file + Loki)
// 3. Fastify error handler catches (formats response)
// 4. Browser receives: { error: { message, statusCode, ... } }
// 5. Available in log file + Grafana for monitoring
```

---

## 📞 Need Help?

Read: `/docs/implementation/ERROR_HANDLING_GUIDE.md`
View: `http://localhost:3001/d/grafana` (Errors dashboard)
Check: `logs/app.log` (Recent errors)
