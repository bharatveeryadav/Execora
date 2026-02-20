# ✅ Application Metrics Setup - Complete

## What's Been Configured

### 1. **Metrics Plugin Integration** (src/lib/metrics-plugin.ts)
- ✅ Registers `/metrics` endpoint on Fastify app
- ✅ Exposes all Prometheus metrics on port 3000
- ✅ Tracks HTTP request duration and count automatically via hooks

### 2. **Custom Application Metrics** (src/lib/metrics.ts)
Registered in Prometheus:
- **HTTP Metrics**
  - `http_request_duration_seconds`: Request latency histogram
  - ` http_requests_total`: Total request counter
  
- **WebSocket Metrics**
  - `websocket_connections_active`: Active connection gauge
  
- **Business Metrics**
  - `voice_commands_total`: Voice command counter (status, provider)
  - `invoice_operations_total`: Invoice operations counter (operation, status)
  - `payments_processed_total`: Payment counter (status)
  - `payment_amount_inr`: Payment amount histogram
  
- **Database & System**
  - `db_query_duration_seconds`: Query latency
  - `redis_operations_total`: Redis operation counter
  - Plus default system metrics (CPU, memory, event loop)

### 3. **Service Integrations Added**

#### WebSocket Handler (src/websocket/enhanced-handler.ts)
```typescript
// Track active connections
websocketConnections.inc()  // On connect
websocketConnections.dec()  // On disconnect

// Track voice commands
voiceCommandsProcessed.inc({ status: 'success', provider: 'elevenlabs' })
```

#### Invoice Service (src/business/invoice.service.ts)
```typescript
// Track create operations
invoiceOperations.inc({ operation: 'create', status: 'success' })
invoiceOperations.inc({ operation: 'create', status: 'error' })
```

#### Payment Service (src/business/ledger.service.ts)
```typescript
// Track payment processing
paymentProcessing.inc({ status: 'success' })
paymentAmount.observe({ customer_id }, amount)
```

## Verification

### ✅ Metrics Endpoint Working
```bash
curl http://localhost:3000/metrics | head -20
# Returns Prometheus-formatted metrics
```

### ✅ Current Metrics Values
- WebSocket connections active: **2**
- HTTP requests tracked: ✓
- Request latencies: ✓
- Invoice operations: ✓
- Payment transactions: ✓

### ✅ Prometheus Scraping
```
Target: execora-app
URL: app:3000/metrics
Health: UP ✓
Last Scrape: < 15s ago
```

## Access

### Prometheus
- **URL**: http://localhost:9090
- **Query**: Search for any metric name
- **Example Queries**:
  ```promql
  # Active WebSocket connections
  websocket_connections_active
  
  # HTTP request rate (per second)
  rate(http_requests_total[5m])
  
  # 95th percentile response time
  histogram_quantile(0.95, http_request_duration_seconds)
  
  # Payment amounts by customer
  payment_amount_inr_bucket
  ```

### Grafana
- **URL**: http://localhost:3001 (admin/admin)
- **Datasource**: Prometheus (auto-configured)
- **Dashboard**: Can create custom dashboards using metrics

## Complete Data Flow

```
Application
    ↓
Metrics Plugin
    ├── HTTP Hook: Track requests
    ├── WebSocket: Track connections
    ├── Services: Track business ops
    └── System: Default metrics
    ↓
/metrics Endpoint (port 3000)
    ↓
Prometheus Scraper
    (15s interval)
    ↓
Prometheus DB
    (TSDB storage)
    ↓
Grafana / Prometheus UI
    (Query & Visualize)
```

## Files Modified

| File | Change |
|------|--------|
| src/index.ts | Register metricsPlugin |
| src/lib/metrics-plugin.ts | HTTP hooks for request tracking |
| src/websocket/enhanced-handler.ts | WebSocket connection metrics |
| src/business/invoice.service.ts | Invoice operation metrics |
| src/business/ledger.service.ts | Payment processing metrics |
| monitoring/prometheus.yml | Configure app target |
| docker-compose.monitoring.yml | Connect Prometheus to app network |

## Key Metrics to Monitor

1. **Performance**: `http_request_duration_seconds` - Response times
2. **Traffic**: `http_requests_total` - Request volume
3. **Users**: `websocket_connections_active` - Active sessions
4. **Business**: `invoice_operations_total` - Transaction success rate
5. **Payments**: `payments_processed_total` - Payment success rate
6. **System**: `process_resident_memory_bytes` - Memory usage

## Next: Create Dashboards

Use Prometheus metrics to create Grafana dashboards for:
- Real-time request metrics
- Customer activity
- Business transaction success rates
- System health
- Voice command analytics

## Troubleshooting

### Metrics endpoint not available?
```bash
curl http://localhost:3000/metrics
# Should return Prometheus format text
```

### Prometheus not scraping?
```bash
curl http://localhost:9090/api/v1/targets
# Check health: UP or DOWN
```

### Custom metrics not appearing?
- Need to trigger the action (e.g., make HTTP request for HTTP metrics)
- Metrics with no activity show only definition, not values
- Check application logs for errors

