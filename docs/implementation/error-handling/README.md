# Error Handling Implementation

Complete error handling system for Execora with centralized error management, categorization, and structured logging.

## 📚 Table of Contents

### Overview & Guides
- **[ERROR_HANDLING_GUIDE.md](ERROR_HANDLING_GUIDE.md)** - Complete implementation guide with all use cases
- **[ERROR_HANDLING_QUICK_REF.md](ERROR_HANDLING_QUICK_REF.md)** - Developer cheat sheet with quick patterns

### Architecture & Design
- **[ERROR_HANDLING_ARCHITECTURE.md](ERROR_HANDLING_ARCHITECTURE.md)** - Visual diagrams and data flow
- **[ERROR_HANDLING_PATTERNS.md](ERROR_HANDLING_PATTERNS.md)** - Comparison of error handling patterns

### Implementation
- **[ERROR_HANDLING_IMPLEMENTATION.md](ERROR_HANDLING_IMPLEMENTATION.md)** - Executive summary and current status

---

## 🎯 Error Categories

Our system categorizes errors into these types:

```
✓ VALIDATION       - Invalid input data
✓ AUTHENTICATION   - Auth failures
✓ AUTHORIZATION    - Permission denied
✓ NOT_FOUND        - Resource not found
✓ CONFLICT         - Resource conflict
✓ RATE_LIMIT       - Rate limit exceeded
✓ DATABASE         - Database errors
✓ EXTERNAL_SERVICE - 3rd party failures
✓ WEBSOCKET        - WS errors
✓ BUSINESS_LOGIC   - Custom business errors
```

---

## 🔴 Severity Levels

```
CRITICAL (50) - System-threatening errors
HIGH     (40) - Major failures affecting functionality
MEDIUM   (30) - Recoverable errors
LOW      (20) - Warnings and non-critical issues
```

---

## 🚀 Quick Start

### Basic Usage

```typescript
// In your route handler
import { ErrorHandler, ValidationError } from '@/infrastructure/error-handler';

try {
  if (!data.name) {
    throw new ValidationError('Name is required');
  }
  // ... rest of logic
} catch (error) {
  ErrorHandler.handle(error, { method: 'POST', url: '/api/v1/customers' });
}
```

### Async Handling

```typescript
// Using async wrapper
const createCustomer = ErrorHandler.tryCatch(async (req: FastifyRequest) => {
  // Your async code here
  // Errors are automatically logged and caught
});
```

---

## 📊 Error Response Format

All errors return consistent JSON structure:

```json
{
  "error": {
    "message": "Customer not found",
    "category": "notfound",
    "status Code": 404,
    "timestamp": "2026-02-20T05:30:00Z",
    "context": {
      "method": "GET",
      "url": "/api/v1/customers/999",
      "ip": "192.168.1.1"
    },
    "severity": "medium"
  }
}
```

---

## 🔗 HTTP Status Codes

| Error Type | Status | Use When |
|---|---|---|
| ValidationError | 400 | Request data invalid |
| AuthenticationError | 401 | No/invalid credentials |
| AuthorizationError | 403 | Insufficient permissions |
| NotFoundError | 404 | Resource doesn't exist |
| ConflictError | 409 | Resource conflict |
| RateLimitError | 429 | Rate limit exceeded |
| DatabaseError | 500 | Database failure |
| ExternalServiceError | 503 | 3rd party unavailable |
| AppError (generic) | 500 | Other errors |

---

## 📝 Creating Custom Errors

Extend the base `AppError` class:

```typescript
export class MyCustomError extends AppError {
  constructor(message: string) {
    super(message, 400, 'custom_error', 'MEDIUM');
  }
}
```

---

## 📂 File Locations

```
src/
  ├── infrastructure/
  │   └── error-handler.ts  (Main implementation)
  ├── index.ts             (Global error handler setup)
  └── ws/
      └── handler.ts       (WebSocket error handling)
```

---

## ✅ Best Practices

1. **Always provide context** - Include request details for debugging
2. **Use appropriate severity** - Help with prioritization
3. **Categorize errors** - Use predefined categories
4. **Catch early** - Handle errors as close to source as possible
5. **Log with context** - Include flow info for tracing
6. **Use HTTP status codes** - Correct codes for different error types
7. **Don't expose internals** - Keep error messages safe for clients

---

## 🔍 Debugging

View errors in real-time:

1. **Local logs:** `logs/app.log` (JSON format)
2. **Loki logs:** http://localhost:3100
3. **Grafana dashboard:** http://localhost:3001/d/execora-errors-prod
4. **Browser console:** API responses show error details

---

## 🆘 Troubleshooting

### Errors not being logged?
- Check [ERROR_HANDLING_GUIDE.md](ERROR_HANDLING_GUIDE.md) setup section
- Verify error handler is registered in src/index.ts
- Check logs/ folder has write permissions

### Wrong status codes?
- Review error class definitions
- Check error categorization in ERROR_HANDLING_ARCHITECTURE.md

### Missing context?
- Pass context object to ErrorHandler.logError()
- See ERROR_HANDLING_PATTERNS.md for examples

---

## 📖 Related Documentation

- **Monitoring:** [../monitoring/](../monitoring/)
- **Production:** [../production/](../production/)
- **Testing:** [../testing/](../testing/)
- **Regression Tests:** [../testing/REGRESSION_TESTING.md](../testing/REGRESSION_TESTING.md)

---

**Last Updated:** Feb 20, 2026  
**Version:** 1.0.0  
**Maintained By:** Engineering Team
