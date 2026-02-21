# ERROR HANDLING PATTERNS - Visual Comparison

## Pattern 1: Throw Specific Error ✅ (Most Common)

```
┌─────────────────────────────────────────┐
│  Route / Service / WebSocket Handler    │
├─────────────────────────────────────────┤
│                                         │
│  const customer = await db.get(id);     │
│                                         │
│  if (!customer) {                       │
│    throw new NotFoundError(             │ ← Exception
│      'Customer',                        │
│      id                                 │
│    );                                   │
│  }                                      │
│                                         │
│  // Somewhere up the stack...           │
│  // (if HTTP): Fastify error handler    │
│  // (if WS): WebSocket catch block      │
│  // Catches it, logs it, sends response │
│                                         │
└─────────────────────────────────────────┘

✅ WHEN TO USE:
   - Route handlers
   - Service methods
   - Database operations
   - Any sync/async function

❌ RETURN FORMAT:
   - Never returns - always throws
   - Exception stops execution

📊 FLOW:
   throw error
     ↓
   Caught by handler
     ↓
   ErrorHandler.logError()
     ↓
   Format response
     ↓
   Send to client
```

---

## Pattern 2: ErrorHandler.handle() ✅ (For Critical Operations)

```
┌──────────────────────────────────────────────────────┐
│  Service / Business Logic Layer                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  const userData = await ErrorHandler.handle(         │
│    async () => {                                     │ ← Wraps in
│      const user = await db.user.get(id);            │   try-catch
│      if (!user) {                                    │
│        throw new NotFoundError('User', id);         │
│      }                                               │
│      return user;   ← Returns on success             │
│    },                                                │
│    {                                                 │
│      operation: 'fetchUser',   ← Context             │
│      userId: id                                      │
│    }                                                 │
│  );                                                  │
│                                                      │
│  // If no error thrown:                              │
│  // Returns: user data directly                      │
│                                                      │
│  // If error thrown:                                 │
│  // 1. ErrorHandler.logError() called                │
│  // 2. Error re-thrown as AppError                   │
│                                                      │
└──────────────────────────────────────────────────────┘

✅ WHEN TO USE:
   - Database operations
   - API calls  
   - File operations
   - Any critical operation

📤 RETURN FORMAT:
   Success: Returns data
   Error: Throws AppError

📊 FLOW:
   Call ErrorHandler.handle()
     ↓
   Execute async function
     ↓
   No error?
     ├─ YES: Return data directly
     │
     └─ NO: Log error + re-throw
           (Caught by outer handler)
```

---

## Pattern 3: ErrorHandler.tryCatch() ✅ (Non-Critical Operations)

```
┌──────────────────────────────────────────────────────┐
│  Service / Non-Critical Operation                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  const { success, data, error } =                    │ ← Destructure
│    await ErrorHandler.tryCatch(                      │   result
│      async () => {                                   │
│        return await emailService.send({              │ ← Wrapped
│          to: 'user@example.com',                     │
│          subject: 'Reminder'                         │
│        });                                           │
│      },                                              │
│      { email: 'user@example.com' }   ← Context       │
│    );                                                │
│                                                      │
│  if (success) {                                      │ ← Check flag
│    console.log('Email sent!', data);                 │
│  } else {                                            │
│    console.log('Email failed:', error?.message);     │
│    // Continue execution (non-critical)              │
│  }                                                   │
│                                                      │
│  // Function NEVER throws                            │
│  // Always returns { success, data?, error? }        │
│                                                      │
└──────────────────────────────────────────────────────┘

✅ WHEN TO USE:
   - Email sending
   - Notifications
   - Optional features
   - Non-blocking operations

📤 RETURN FORMAT:
   Always: { success: bool, data?: T, error?: AppError }

📊 FLOW:
   Call ErrorHandler.tryCatch()
     ↓
   Execute async function
     ↓
   Return { success: true, data }
   OR
   Return { success: false, error }
   (Never throws)
```

---

## Side-by-Side Comparison

|  | Pattern 1: throw | Pattern 2: .handle() | Pattern 3: .tryCatch() |
|---|---|---|---|
| **When** | Route/service | Critical ops | Non-critical |
| **Error Handling** | Outer handler | Auto-wrapped | Never throws |
| **Return** | Data or throws | Data or throws | Always { success, data, error } |
| **Code Style** | Simple throw | Wrapped call | Destructa result |
| **Stop Execution** | YES (throws) | YES (throws) | NO (continues) |
| **Error Logging** | Outer handler | Auto-logged | Auto-logged |
| **Example** | Validation error | DB fetch | Email send |

---

## Decision Tree: Which Pattern?

```
Got an operation?
│
├─ Is it in a Route/Service?
│  └─ YES: Use Pattern 1 (throw)
│     throw new NotFoundError('...')
│
├─ Is it critical & might fail?
│  └─ YES: Use Pattern 2 (.handle())
│     const data = await ErrorHandler.handle(...)
│
└─ Is it non-critical?
   └─ YES: Use Pattern 3 (.tryCatch())
      const { success, data, error } = await ErrorHandler.tryCatch(...)
```

---

## Code Examples by Scenario

### Scenario 1: API Route (Pattern 1)
```typescript
fastify.get('/customers/:id', async (request, reply) => {
  // Validation - throw specific error
  if (!request.params.id) {
    throw new ValidationError('Customer ID required');
  }
  
  // Service call - lets exception bubble
  try {
    const customer = await customerService.get(request.params.id);
    reply.send(customer);
  }
  // Fastify's global error handler catches & sends response
});
```

### Scenario 2: Database Layer (Pattern 2)
```typescript
export class CustomerService {
  async get(id: string) {
    return ErrorHandler.handle(
      async () => {
        const customer = await db.customer.findUnique({
          where: { id }
        });
        
        if (!customer) {
          throw new NotFoundError('Customer', id);
        }
        
        return customer;
      },
      { operation: 'getCustomer', customerId: id }
    );
  }
}
```

### Scenario 3: Send Notification (Pattern 3)
```typescript
export async function sendReminderToUser(userId: string) {
  // Get email (critical)
  const user = await ErrorHandler.handle(
    async () => {
      const u = await db.user.find(userId);
      if (!u) throw new NotFoundError('User', userId);
      return u;
    },
    { operation: 'getUser', userId }
  );
  
  // Send email (not critical - if it fails, app continues)
  const { success, error } = await ErrorHandler.tryCatch(
    async () => {
      return await emailService.send({
        to: user.email,
        subject: 'Reminder: Your invoice is due'
      });
    },
    { userId, email: user.email }
  );
  
  if (!success) {
    logger.warn('Failed to send reminder email', error?.message);
    // But continue - app doesn't crash
  }
}
```

---

## Error Propagation Examples

### Example 1: Validation Error
```
HTTP POST /api/v1/customers
├─ Route throws ValidationError
├─ Fastify catches
├─ ErrorHandler.logError() logs with category: "validation", severity: "medium"
├─ Format as HTTP 400 response
└─ Browser receives: { error: { message: "...", statusCode: 400 } }
```

### Example 2: Not Found Error
```
HTTP GET /api/v1/customers/999
├─ Route calls service
├─ Service.get() uses ErrorHandler.handle()
├─ DB query returns null
├─ Throws NotFoundError
├─ ErrorHandler.handle() catches + logs
├─ Re-throws AppError
├─ Fastify catches
├─ Format as HTTP 404 response
└─ Browser receives: { error: { message: "...", statusCode: 404 } }
```

### Example 3: Non-Critical Email
```
Send reminder email
├─ Main operation wrapped in ErrorHandler.tryCatch()
├─ Email service fails
├─ Returns { success: false, error }
├─ Code checks success flag
├─ Logs warning
└─ App continues (doesn't crash)
```

---

## Summary Table

```
┌─────────────────────────────────────────────────────────────┐
│ Pattern 1: THROW ERROR                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ throw new NotFoundError('...)                           │ │
│ │ • Simple, direct                                        │ │
│ │ • Errors stop execution                                 │ │
│ │ • Caught by outer handler                               │ │
│ │ • Use in: Routes, validation, API calls                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Pattern 2: HANDLE() WRAPPER                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ const data = await ErrorHandler.handle(async () => ...) │ │
│ │ • Automatic error logging                               │ │
│ │ • Returns data on success                               │ │
│ │ • Re-throws on error                                    │ │
│ │ • Use in: Critical operations, services                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Pattern 3: TRYCATCH() WRAPPER                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ const { success, data, error } = await ErrorHandler...  │ │
│ │ • Never throws                                          │ │
│ │ • Safe operation                                        │ │
│ │ • Check success flag                                    │ │
│ │ • Use in: Non-critical ops, notifications               │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

ALL THREE PATTERNS:
✓ Automatically log errors with context
✓ Use consistent error structure
✓ Work with HTTP, WebSocket, services
✓ Visible in logs/app.log + Loki + Grafana
✓ Production-ready
```
