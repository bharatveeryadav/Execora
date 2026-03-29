# Centralized Error Handling Guide

## Overview

All errors in the application are now managed through a **single centralized error handler** at `/src/infrastructure/error-handler.ts`. This ensures:

✅ **Consistency** - All errors logged with same structure  
✅ **Traceability** - Full context captured for debugging  
✅ **Monitoring** - Easy to filter and alert on errors  
✅ **Organization** - Errors categorized and severity-leveled  
✅ **Single Place** - All logs visible in `logs/app.log` + Loki dashboard  

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│     Application Code (Routes, Services, etc)    │
│  Throws: throw new ValidationError(msg)         │
└──────────────┬──────────────────────────────────┘
               │
               ▼
   ┌───────────────────────────────┐
   │   Error Classes Hierarchy      │
   ├───────────────────────────────┤
   │  AppError (base)              │  ← Catch & wrap unknown errors
   │  - ValidationError            │
   │  - AuthenticationError        │
   │  - AuthorizationError         │
   │  - NotFoundError              │
   │  - ConflictError              │
   │  - RateLimitError             │
   │  - DatabaseError              │
   │  - ExternalServiceError       │
   │  - BusinessLogicError         │
   │  - WebSocketError             │
   └───────────────────┬───────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │  ErrorHandler (Central)  │
        ├──────────────────────────┤
        │ logError()               │
        │ formatErrorResponse()    │
        │ formatWebSocketError()   │
        │ handle() - wrapper       │
        │ tryCatch() - wrapper     │
        └──────────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    logger.error  logger.warn    logger.info
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
  logs/app.log                  Loki (Grafana)
  (Local backup)                (Centralized)
```

---

## Error Classes & HTTP Status Codes

| Error Class | Status | Use Case |
|---|---|---|
| `ValidationError` | 400 | Invalid input, constraints violated |
| `AuthenticationError` | 401 | Missing/invalid credentials |
| `AuthorizationError` | 403 | User lacks permission |
| `NotFoundError` | 404 | Resource doesn't exist |
| `ConflictError` | 409 | Business rule violated (duplicate, etc.) |
| `RateLimitError` | 429 | Too many requests |
| `DatabaseError` | 500 | DB connection/query failed |
| `ExternalServiceError` | 502 | OpenAI, WhatsApp, Deepgram failed |
| `BusinessLogicError` | 422 | Business rule violation |
| `WebSocketError` | 500 | WebSocket connection issue |

---

## Usage Examples

### ❌ OLD WAY (Don't do this)
```typescript
catch (error) {
  console.log('Error:', error.message);
  logger.error({ error }, 'Something failed');
}
```

### ✅ NEW WAY (Centralized)

#### 1. Throw Specific Error Types
```typescript
// In routes/services
if (!customer) {
  throw new NotFoundError('Customer', customerId);
}

if (customer.balance < amount) {
  throw new BusinessLogicError('Insufficient balance', {
    required: amount,
    available: customer.balance,
  });
}

if (!isValidPhone(phone)) {
  throw new ValidationError('Invalid phone number', { phone });
}

if (databaseConnection failed) {
  throw new DatabaseError('Connection pooling error', error, {
    retries: 3,
    timeout: '5000ms',
  });
}

try {
  await openaiService.chat(...);
} catch (err) {
  throw new ExternalServiceError(
    'OpenAI',
    'Failed to generate response',
    err,
    { model: 'gpt-4', tokens: 500 }
  );
}
```

#### 2. Use ErrorHandler.handle() Wrapper
```typescript
// Automatically catches and logs errors
const result = await ErrorHandler.handle(
  async () => {
    return await database.query('...');
  },
  { operation: 'fetchCustomer', customerId: 123 }
);

// Result: { data: value } or throws AppError
```

#### 3. Use ErrorHandler.tryCatch() for Safe Operations
```typescript
// Returns { success, data, error } - never throws
const { success, data, error } = await ErrorHandler.tryCatch(
  async () => {
    return await emailService.send({...});
  },
  { to: 'user@example.com' }
);

if (success) {
  console.log('Email sent:', data);
} else {
  console.log('Email failed:', error.message);
  // Continue execution (non-critical operation)
}
```

#### 4. Manual Error Logging
```typescript
catch (error) {
  const wsError = new WebSocketError('Connection dropped', {
    sessionId: '123',
    userId: '456'
  });
  ErrorHandler.logError(wsError);
}
```

---

##Error Response Format

### API Response (HTTP)
```json
{
  "error": {
    "message": "Customer with ID 999 not found",
    "category": "notfound",
    "statusCode": 404,
    "timestamp": "2026-02-20T10:30:45.123Z",
    "stack": "..." // Only in development
  }
}
```

### WebSocket Response
```json
{
  "type": "error",
  "data": {
    "message": "Message processing failed",
    "category": "websocket",
    "timestamp": "2026-02-20T10:30:45.123Z"
  }
}
```

### Log Output
```
❌ ERROR: Customer with ID 999 not found
{
  "name": "NotFoundError",
  "message": "Customer with ID 999 not found",
  "category": "notfound",
  "severity": "low",
  "statusCode": 404,
  "timestamp": "2026-02-20T10:30:45.123Z",
  "context": {
    "method": "GET",
    "url": "/api/v1/customers/999",
    "ip": "192.168.1.1"
  }
}
```

---

## Where Errors Are Logged

### 1. Server Console (Development)
```bash
❌ ERROR: Insufficient balance
🚨 CRITICAL ERROR: Database connection lost
⚠️ WARNING: Rate limit approaching
```

### 2. Local Log File
```bash
# /home/bharat/.../execora/logs/app.log
tail -f logs/app.log | grep "ERROR"
```

### 3. Loki + Grafana (Monitoring)
```
http://localhost:3001/d/grafana-dashboard
Query: {service="execora-api", level="error"}
```

### 4. Structured Fields for Filtering
```
- category: "database", "validation", "external", etc.
- severity: "critical", "high", "medium", "low"
- statusCode: 400, 404, 500, etc.
- timestamp: ISO format (searchable)
```

---

## Integration Points

### ✅ Fastify Routes
```typescript
router.post('/customers', async (request, reply) => {
  try {
    if (!request.body.name) {
      throw new ValidationError('Name is required');
    }
    // Global error handler catches and formats response
  } catch (error) {
    // Fastify's setErrorHandler catches it
  }
});
```

### ✅ WebSocket Handlers
```typescript
connection.on('message', async (data) => {
  try {
    const msg = JSON.parse(data);
    // Handle...
  } catch (error) {
    const wsErr = new WebSocketError('Parse failed');
    ErrorHandler.logError(wsErr);
    this.sendError(connection, wsErr);
  }
});
```

### ✅ Service Layer
```typescript
export class CustomerService {
  async getCustomer(id: string) {
    return await ErrorHandler.handle(
      async () => {
        const customer = await db.customer.findUnique({ where: { id } });
        if (!customer) throw new NotFoundError('Customer', id);
        return customer;
      },
      { operation: 'getCustomer', customerId: id }
    );
  }
}
```

### ✅ Database Operations
```typescript
try {
  await db.transaction(async (tx) => {
    // ...
  });
} catch (error) {
  throw new DatabaseError('Transaction failed', error, {
    action: 'createInvoice'
  });
}
```

### ✅ External Services
```typescript
try {
  await openaiService.complete(prompt);
} catch (error) {
  throw new ExternalServiceError('OpenAI', 'Failed', error, {
    model: 'gpt-4',
    timeout: '30s'
  });
}
```

---

## Monitoring & Alerts

### View Errors in Grafana
```
http://localhost:3001/d/grafana-dashboard
1. Select "Execora Error Dashboard"
2. Filter by severity: "high" or "critical"
3. Set alert threshold for errors/minute
```

### Filter Errors by Category
```bash
# Validation errors only
grep -i "validation" logs/app.log | grep "ERROR"

# Database errors
grep -i "database" logs/app.log | tail -20

# External service failures
grep -i "externalservice\|openai\|whatsapp" logs/app.log
```

### View Unhandled Rejections
```bash
# Caught by setupGlobalErrorHandlers()
grep "unhandledRejection\|uncaughtException" logs/app.log
```

---

## Best Practices

### ✅ DO:
1. **Throw specific error types** - Not generic `Error`
2. **Include context** - Pass metadata for debugging
3. **Use ErrorHandler.handle()** - For critical operations
4. **Use ErrorHandler.tryCatch()** - For non-critical operations
5. **Don't catch and re-throw** - Let it bubble to error handler
6. **Include meaningful messages** - Help debugging

### ❌ DON'T:
1. ~~Use `console.log()` for errors~~ - Use ErrorHandler
2. ~~Bare `throw error`~~ - Use specific error types
3. ~~Catch and ignore~~ - At least log the error
4. ~~Log same error twice~~ - ErrorHandler handles it
5. ~~Store secrets in context~~ - Sanitize sensitive data

---

## Testing Error Handling

```typescript
import { ValidationError, ErrorHandler } from './infrastructure/error-handler';

test('should handle validation errors', async () => {
  const error = new ValidationError('Invalid input');
  
  const logged = ErrorHandler.logError(error, { test: true });
  expect(logged.category).toBe('validation');
  expect(logged.severity).toBe('medium');
});

test('should wrap unknown errors', async () => {
  const { success, error } = await ErrorHandler.tryCatch(
    async () => {
      throw new Error('Unknown error');
    }
  );
  
  expect(success).toBe(false);
  expect(error?.message).toBe('Unknown error');
  expect(error?.category).toBe('unknown');
});
```

---

## Summary

| Aspect | Old Way | New Way |
|---|---|---|
| **Error Logging** | `console.log()` scattered | `ErrorHandler.logError()` centralized |
| **Error Types** | Generic `Error` | 9 specific error classes |
| **Context** | Missing or incomplete | Always captured & structured |
| **Response Format** | Inconsistent | Standardized (API/WS) |
| **Monitoring** | Manual log searches | Grafana dashboards with alerts |
| **Debugging** | Hard to trace | Full stack + context |
| **Global Handlers** | Manual process.on | Automatic setupGlobalErrorHandlers() |

**Result**: All errors visible in one place, easy to monitor, debug, and alert! 🎯
