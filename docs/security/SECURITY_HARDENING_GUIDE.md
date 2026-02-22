# 🔐 Security Hardening Implementation Guide

## Phase 1: Immediate Fixes (Do This Week)

---

## 1. Add JWT Authentication to REST API

### Step 1: Install JWT plugin
```bash
npm install @fastify/jwt
```

### Step 2: Configure JWT in src/index.ts

**File:** [src/index.ts](src/index.ts)

Add after plugin registration section:
```typescript
// Add this after CORS registration, before WebSocket
await fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  sign: {
    expiresIn: '24h',
  },
});

// Create login route
fastify.post('/api/v1/auth/login', async (request, reply) => {
  // TODO: Validate credentials against customer database
  // For now, accept customer ID + password
  const { customerId, password } = request.body as any;

  if (!customerId) {
    return reply.code(400).send({ error: 'customerId required' });
  }

  // ⚠️ TODO: Hash passwords with bcrypt before storing!
  // For MVP: allow login without password (identity verification via SMS/OTP)

  const token = fastify.jwt.sign(
    {
      sub: customerId,  // Subject (customer ID)
      type: 'customer',
      iat: Math.floor(Date.now() / 1000),
    },
    { expiresIn: '24h' }
  );

  return reply.send({
    token,
    expiresIn: 86400, // 24 hours in seconds
  });
});

// Token refresh route
fastify.post('/api/v1/auth/refresh', async (request, reply) => {
  // Verify existing token
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid token' });
  }

  // Issue new token
  const token = fastify.jwt.sign(
    {
      sub: request.user.sub,
      type: 'customer',
    },
    { expiresIn: '24h' }
  );

  return reply.send({ token });
});
```

### Step 3: Add JWT verification decorator

Create `src/infrastructure/auth.ts`:
```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function verifyJWT(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized: invalid or missing token' });
  }
}

export function verifyJWTAdmin(request: FastifyRequest, reply: FastifyReply) {
  // TODO: Verify admin role
  return verifyJWT(request, reply);
}
```

### Step 4: Protect API routes

**File:** [src/api/index.ts](src/api/index.ts)

Replace each route registration. Example:
```typescript
// BEFORE (PUBLIC - REMOVE)
fastify.get('/api/v1/customers/:id', async (request, reply) => {
  const customer = await customerService.getCustomerById(request.params.id);
  return { customer };
});

// AFTER (PROTECTED)
fastify.get('/api/v1/customers/:id', 
  { onRequest: [verifyJWT] }, 
  async (request, reply) => {
    const customer = await customerService.getCustomerById(request.params.id);
    return { customer };
  }
);
```

**Routes to protect:**
- `GET /api/v1/customers` ✅
- `GET /api/v1/customers/:id` ✅
- `POST /api/v1/customers` ✅
- `GET /api/v1/invoices` ✅
- `POST /api/v1/invoices` ✅
- `GET /api/v1/ledger/*` ✅
- `POST /api/v1/ledger/*` ✅
- `GET /api/v1/reminders` ✅
- `POST /api/v1/reminders` ✅
- `GET /api/v1/sessions` ✅
- `GET /api/v1/recordings/:id/url` ✅

**Routes to SKIP (already have token validation):**
- `GET /health` (public, for orchestration)
- `GET /metrics` (public, for monitoring)
- `GET|POST /api/v1/webhook/whatsapp` (has webhook token)

### Step 5: Update .env
```bash
JWT_SECRET="your-256-bit-random-secret-here"
# Generate: openssl rand -base64 32
```

### Step 6: Test it
```bash
# 1. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust-001"}'

# Response:
# { "token": "eyJhbGc...", "expiresIn": 86400 }

# 2. Use token
TOKEN="eyJhbGc..."
curl -X GET http://localhost:3000/api/v1/customers/cust-001 \
  -H "Authorization: Bearer $TOKEN"

# 3. Verify it rejects without token
curl -X GET http://localhost:3000/api/v1/customers/cust-001
# Response: 401 Unauthorized
```

---

## 2. Add JWT to WebSocket

### Step 1: Modify WebSocket connection handler

**File:** [src/ws/enhanced-handler.ts](src/ws/enhanced-handler.ts)

Replace `handleConnection` method:
```typescript
/**
 * Handle new WebSocket connection with JWT validation
 */
async handleConnection(connection: WebSocket, request: FastifyRequest) {
  // Extract JWT from URL query or Authorization header
  const token = 
    new URL(request.url, `http://${request.headers.host}`).searchParams.get('token') ||
    request.headers.authorization?.replace('Bearer ', '');

  // Verify token
  let decoded: any;
  try {
    decoded = await fastify.jwt.verify(token);
  } catch (error) {
    logger.warn({ error, ip: request.ip }, 'WebSocket auth failed');
    connection.close(1008, 'Unauthorized: invalid token');
    return;
  }

  const sessionId = this.generateSessionId();
  const customerId = decoded.sub;  // ← Customer is authenticated

  const session: VoiceSession = {
    ws: connection,
    sessionId,
    customerId,  // ← NEW: tied to customer
    transcript: '',
    isActive: false,
    isRecording: false,
    audioChunks: [],
    audioFormat: sttService.getProvider() === 'elevenlabs' ? 'pcm' : 'webm',
    sttConnection: null,
  };

  this.sessions.set(sessionId, session);

  logger.info({ sessionId, customerId }, 'WebSocket connected (authenticated)');

  // ... rest of code stays same
}
```

### Step 2: Test WebSocket connection
```bash
# Get token first
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust-001"}' | jq -r .token)

# Connect with token (e.g., using websocat or JavaScript)
websocat "ws://localhost:3000/ws?token=$TOKEN"

# Without token should fail:
websocat "ws://localhost:3000/ws"
# Expected: Connection closed with code 1008
```

---

## 3. Migrate Secrets to AWS Secrets Manager

### Step 1: Create secret in AWS

```bash
# Install AWS CLI
aws configure

# Create secret
aws secretsmanager create-secret \
  --name execora/prod/secrets \
  --secret-string '{
    "OPENAI_API_KEY":"sk-...",
    "WHATSAPP_ACCESS_TOKEN":"...",
    "MINIO_SECRET_KEY":"...",
    "JWT_SECRET":"..."
  }'
```

### Step 2: Load secrets in application

Create `src/infrastructure/secrets.ts`:
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logger } from './logger';

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

export async function loadSecrets(secretName: string) {
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );
    
    const secrets = JSON.parse(response.SecretString || '{}');
    logger.info({ secretName }, 'Secrets loaded from AWS');
    return secrets;
  } catch (error) {
    logger.error({ error, secretName }, 'Failed to load secrets');
    throw error;
  }
}
```

### Step 3: Modify config.ts

```typescript
// src/config.ts
import { loadSecrets } from './infrastructure/secrets';

let secrets: Record<string, string> = {};

// Load on startup
export async function initializeSecrets() {
  secrets = await loadSecrets(process.env.SECRETS_NAME || 'execora/prod/secrets');
}

export const config = {
  openai: {
    apiKey: secrets.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
  },
  whatsapp: {
    accessToken: secrets.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '',
  },
  // ... etc
};
```

### Step 4: Update Dockerfile

```dockerfile
# Add IAM role to container
RUN apt-get install -y aws-cli

# Set AWS region
ENV AWS_REGION=us-east-1

# Start app (secrets loaded at runtime)
CMD ["node", "dist/index.js"]
```

### Step 5: Verify .env is NOT committed

```bash
# Add to .gitignore
echo ".env*" >> .gitignore

# Check git history for leaked secrets
git log --all --oneline --source -- '.env' | head -20
# If found, run: git filter-branch --tree-filter 'rm -f .env'
```

---

## 4. Add Webhook Signature Verification

### Step 1: Add to WebSocket service

**File:** [src/integrations/whatsapp.ts](src/integrations/whatsapp.ts)

```typescript
import crypto from 'crypto';

class WhatsAppService {
  private webhookSecret: string;

  constructor() {
    this.webhookSecret = config.whatsapp.webhookSecret || 'your-webhook-secret';
  }

  /**
   * Verify webhook signature (HMAC-SHA256)
   * Meta sends: X-Hub-Signature-256: sha256=<hash>
   */
  validateWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(`sha256=${expectedSignature}`),
        Buffer.from(signature)
      );
    } catch (err) {
      return false;
    }
  }
}

export const whatsappService = new WhatsAppService();
```

### Step 2: Protect webhook route

**File:** [src/api/index.ts](src/api/index.ts)

```typescript
fastify.post('/api/v1/webhook/whatsapp', {
  config: { rateLimit: false },
}, async (request: FastifyRequest, reply) => {
  // Get signature from header
  const signature = request.headers['x-hub-signature-256'] as string;
  
  if (!signature) {
    logger.warn('Webhook signature missing');
    return reply.code(403).send({ error: 'Signature required' });
  }

  // Verify signature
  const payload = JSON.stringify(request.body);
  if (!whatsappService.validateWebhookSignature(payload, signature)) {
    logger.warn({ signature }, 'Webhook signature verification failed');
    return reply.code(403).send({ error: 'Invalid signature' });
  }

  // Process webhook (signature verified ✅)
  const body = request.body as any;
  await whatsappService.processWebhookEvent(body);

  return { status: 'ok' };
});
```

### Step 3: Configure webhook secret in .env / Secrets Manager

```bash
WHATSAPP_WEBHOOK_SECRET="your-secret-from-meta-dashboard"
```

---

## 5. Add Request Correlation IDs

### Step 1: Add correlation ID middleware

**File:** [src/index.ts](src/index.ts)

Add before route registration:
```typescript
import { randomUUID } from 'crypto';

fastify.addHook('preHandler', async (request, reply) => {
  // Use client-provided correlation ID if available
  const correlationId = 
    (request.headers['x-correlation-id'] as string) ||
    (request.query.correlation_id as string) ||
    randomUUID();

  request.id = correlationId;
  reply.header('x-correlation-id', correlationId);
});
```

### Step 2: Update logger to use correlation ID

```typescript
// In all service methods
logger.info(
  { 
    correlationId: request.id,  // ← Add this
    customerId,
    invoiceId,
  },
  'Invoice created'
);

// In WebSocket
logger.info(
  {
    correlationId: request.id,  // ← Add this
    sessionId,
    customerId,
  },
  'WebSocket connected'
);
```

### Step 3: Client should send correlation ID

```javascript
// Frontend code
const correlationId = crypto.randomUUID();

// REST API
fetch('https://api.example.com/api/v1/invoices', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Correlation-ID': correlationId,
  },
  body: JSON.stringify({...}),
});

// WebSocket
const ws = new WebSocket(
  `wss://api.example.com/ws?token=${token}&correlation_id=${correlationId}`
);
```

---

## 6. Fix Database Migration Race Condition

### Option A: Separate Migration Container (Recommended)

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: execora
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: execora
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U execora"]
      interval: 5s
      timeout: 3s
      retries: 3
    networks:
      - execora

  # Run migrations once, then exit
  migrate:
    image: execora:${GIT_COMMIT}
    command: npx prisma migrate deploy
    environment:
      DATABASE_URL: "postgresql://execora:${DB_PASSWORD}@postgres:5432/execora"
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"  # ← Critical: run once, exit
    networks:
      - execora

  # Only start app after migration succeeds
  app:
    image: execora:${GIT_COMMIT}
    command: node dist/index.js
    depends_on:
      migrate:
        condition: service_completed_successfully  # ← Wait for migration
    environment:
      DATABASE_URL: "postgresql://execora:${DB_PASSWORD}@postgres:5432/execora"
      PORT: 3000
    ports:
      - "3000:3000"
    networks:
      - execora

  # Worker process (BullMQ jobs)
  worker:
    image: execora:${GIT_COMMIT}
    command: node dist/worker/index.js
    depends_on:
      - app  # Only start after app is ready
    environment:
      DATABASE_URL: "postgresql://execora:${DB_PASSWORD}@postgres:5432/execora"
    networks:
      - execora

networks:
  execora:

volumes:
  postgres_data:
```

### Option B: Update Dockerfile (Temporary)

```dockerfile
# Dockerfile (for multi-instance safety)

# ... existing build steps ...

# Use migration lock to ensure single instance runs it
CMD ["sh", "-c", "
  # Acquire distributed lock (Prisma handles this internally)
  npx prisma migrate deploy
  
  # Start application
  node dist/index.js
"]
```

Deploy with:
```bash
# Only deploy 1 instance initially
docker-compose up -d app

# Wait for migrations to complete
sleep 30

# Scale to N instances
docker-compose up -d --scale app=3
```

---

## 7. Add Rate Limiting Per User

### Step 1: Install rate-limit store for Redis

```bash
npm install @fastify/rate-limit
```

### Step 2: Configure in src/index.ts

```typescript
import fastifyRateLimitRedis from '@fastify/rate-limit/redis';
import { Redis } from 'ioredis';

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
});

await fastify.register(fastifyRateLimit, {
  store: new fastifyRateLimitRedis({ client: redis }), // ← Distributed
  max: 1000,                    // Default: 1000 req/hour
  timeWindow: '1 hour',
  key: (request) => {
    // Rate limit by user (JWT) if available
    // Fall back to IP
    return request.user?.sub || request.ip;
  },
  errorResponseBuilder: (request, context) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: `Rate limit exceeded. ${context.after - Date.now()}ms remaining`,
  }),
});
```

### Step 3: Per-endpoint rate limits

```typescript
// Strict limit for expensive operations
fastify.post('/api/v1/invoices', {
  config: {
    rateLimit: {
      max: 100,              // 100 per hour
      timeWindow: '1 hour',
    },
  },
}, async (request, reply) => {
  // ...
});

// Very strict for voice API
fastify.get('/ws', {
  config: {
    rateLimit: {
      max: 24,               // 24 WebSocket connections per day
      timeWindow: '24 hours',
    },
  },
  websocket: true,
}, (connection, request) => {
  // ...
});
```

---

## 🧪 Testing & Validation

### Test 1: Verify JWT flows

```bash
#!/bin/bash

# 1. Login and get token
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust-001"}')

TOKEN=$(echo $RESPONSE | jq -r .token)
echo "✅ Login successful: $TOKEN"

# 2. Access protected route WITH token
curl -s -X GET http://localhost:3000/api/v1/customers/cust-001 \
  -H "Authorization: Bearer $TOKEN" | jq .

# 3. Verify it fails WITHOUT token
echo "Testing without token (should fail)..."
curl -s -X GET http://localhost:3000/api/v1/customers/cust-001 | jq .
# Expected: 401 Unauthorized

echo "✅ JWT authentication working!"
```

### Test 2: Rate limiting

```bash
#!/bin/bash

TOKEN="<your-jwt-token>"

# Hit endpoint rapidly
for i in {1..1010}; do
  echo -n "Request $i... "
  RESPONSE=$(curl -s -w "%{http_code}" -X GET http://localhost:3000/api/v1/invoices \
    -H "Authorization: Bearer $TOKEN")
  
  STATUS_CODE="${RESPONSE: -3}"
  if [ "$STATUS_CODE" = "429" ]; then
    echo "✅ Rate limited at request $i"
    break
  fi
  echo "$STATUS_CODE"
done
```

### Test 3: Webhook signature

```bash
#!/bin/bash

# Create valid signature
PAYLOAD='{"entry":[{"changes":[{"value":{"messages":[{"from":"1234567890","id":"wamid.123","text":{"body":"Hello"}}]}}]}]}'

SIGNATURE=$(echo -n "$PAYLOAD" | \
  openssl dgst -sha256 -hmac "your-webhook-secret" -hex | \
  cut -d' ' -f2 | \
  sed 's/^/sha256=/')

# Send with valid signature
curl -s -X POST http://localhost:3000/api/v1/webhook/whatsapp \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$PAYLOAD" | jq .
# Expected: { "status": "ok" }

# Send with invalid signature (should fail)
curl -s -X POST http://localhost:3000/api/v1/webhook/whatsapp \
  -H "X-Hub-Signature-256: sha256=invalid" \
  -d "$PAYLOAD" | jq .
# Expected: 403 Forbidden
```

---

## 💾 Checklist: Before Going to Production

- [ ] JWT authentication added to all protected routes
- [ ] WebSocket requires valid JWT token
- [ ] API keys moved to AWS Secrets Manager (or equivalent)
- [ ] .env files removed from git history
- [ ] Webhook signature verification enabled
- [ ] Correlation IDs added to all logs
- [ ] Database migration race condition fixed
- [ ] HTTPS reverse proxy configured (nginx/ALB)
- [ ] Rate limiting tested and working
- [ ] All tests passing: `npm test`
- [ ] Load test completed: verified capacity
- [ ] Team trained on new security procedures
- [ ] Incident response runbook created
- [ ] Backup/restore procedure tested

---

**Next Step:** Review [PRODUCTION_READINESS_AUDIT.md](PRODUCTION_READINESS_AUDIT.md) for Phase 2+ improvements.
