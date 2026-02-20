# 🎯 Quick Log Viewing Examples

## Verify Logs Are Working

All log methods working:

✅ **Docker Logs:**
```bash
docker logs execora-app
```

✅ **Local File (JSON):**
```bash
docker exec execora-app tail -5 /app/logs/app.log
```

✅ **Loki Ingestion:**
```bash
curl http://localhost:3100/loki/api/v1/label/job/values
# Returns: ["execora-app"]
```

✅ **Grafana:**
- http://localhost:3001
- Explore → Loki → {job="execora-app"}

---

## Real-Time Log Monitoring

### Option 1: Follow Docker Logs (Easiest)
```bash
docker logs execora-app -f
```
**Use when:** You want to see container output in real-time

### Option 2: Follow Local Log File  
```bash
docker exec execora-app tail -f /app/logs/app.log
```
**Output:**
```json
{"level":30,"time":1771462036681,"pid":67,"msg":"request completed","responseTime":2.086}
{"level":30,"time":1771462051680,"req":{"method":"GET","url":"/metrics"},"msg":"incoming request"}
```

### Option 3: Pretty Print with jq
```bash
docker exec execora-app tail -f /app/logs/app.log | jq '{level, time, msg}'
```
**Output:**
```json
{
  "level": 30,
  "time": 1771462051680,
  "msg": "incoming request"
}
```

---

## Search Logs for Problems

### Find All Errors
```bash
docker exec execora-app grep -i error /app/logs/app.log
```

### Find Specific Issues
```bash
# Voice command errors
docker exec execora-app grep -i "voice" /app/logs/app.log | grep -i error

# Payment failures  
docker exec execora-app grep -i "payment" /app/logs/app.log | grep -i error

# Database errors
docker exec execora-app grep -i "database\|prisma" /app/logs/app.log | grep -i error
```

### Count Log Levels
```bash
docker exec execora-app cat /app/logs/app.log | \
  jq '.level' | sort | uniq -c
  
# Output:
#      45 30  (INFO)
#      3  40  (WARN)
#      1  50  (ERROR)
```

### Extract Just Messages
```bash
docker exec execora-app cat /app/logs/app.log | jq -r '.msg'

# Output:
# incoming request
# request completed
# WebSocket connected
# Invoice created successfully
```

---

## Monitor Key Operations

### Track WebSocket Activity
```bash
docker exec execora-app grep -i websocket /app/logs/app.log

# Example:
# {"msg":"WebSocket connected","sessionId":"session-123"}
# {"msg":"WebSocket disconnected","sessionId":"session-123"}
```

### Track Invoice Operations
```bash
docker exec execora-app grep -i invoice /app/logs/app.log

# Example:
# {"msg":"Invoice created successfully","invoiceId":"inv-456"}
# {"msg":"Invoice creation failed","error":"..."}
```

### Track Payments
```bash
docker exec execora-app grep -i payment /app/logs/app.log

# Example:
# {"msg":"Payment recorded","amount":1000,"customerId":"cust-123"}
```

### Track Voice Commands
```bash
docker exec execora-app grep -i "voice\|command" /app/logs/app.log

# Example:
# {"msg":"Voice command processed","intent":"invoice"}
```

---

## Analyze Performance

### Slowest Requests
```bash
docker exec execora-app cat /app/logs/app.log | \
  jq 'select(.responseTime) | {url: .req.url, time: .responseTime}' | \
  sort -k 2 -rn | head -10
```

### Request Count by Endpoint
```bash
docker exec execora-app cat /app/logs/app.log | \
  jq -r 'select(.req.url) | .req.url' | \
  sort | uniq -c | sort -rn
```

### Average Response Time
```bash
docker exec execora-app cat /app/logs/app.log | \
  jq '[.responseTime] | add / length'
```

---

## View via Grafana (Best for Dashboards)

### Access
- **URL:** http://localhost:3001
- **User:** admin
- **Password:** admin

### Find Logs
1. Click **Explore** (left sidebar)
2. Select **Loki** datasource (top)
3. Enter query: `{job="execora-app"}`
4. Click **Run query**

### Filter by Type
```logql
# Errors only
{job="execora-app"} | json | level="50"

# Info logs only
{job="execora-app"} | json | level="30"

# Payment logs
{job="execora-app"} | pattern "payment"

# WebSocket logs
{job="execora-app"} | pattern "websocket"
```

---

## Common Log Files Reference

Location in container: `/app/logs/app.log`

Location on host: `./logs/app.log`

**Single file format:**
- One JSON object per line
- Collected by Promtail → Stored in Loki

**Fields:**
```json
{
  "level": 30,              // Log level (10-60)
  "time": 1771462036681,    // Unix milliseconds
  "pid": 67,                // Process ID
  "hostname": "container",  // Container ID
  "service": "execora-api", // Service name
  "environment": "prod",    // Environment
  "msg": "...",             // Log message
  "responseTime": 2.086,    // Optional: response time
  "req": {...},             // Optional: request details
  "error": {...}            // Optional: error details
}
```

---

## One-Liners to Copy

```bash
# View last 20 logs
docker logs execora-app | tail -20

# Follow logs in real-time
docker logs execora-app -f

# Search for errors
grep "error" logs/app.log

# Search for invoice operations
grep "invoice" logs/app.log

# Count all INFO logs
cat logs/app.log | jq 'select(.level==30)' | wc -l

# Get unique messages
cat logs/app.log | jq -r '.msg' | sort | uniq

# View last 100 logs in Loki
curl -s 'http://localhost:3100/loki/api/v1/query_range?query={job="execora-app"}&limit=100' | jq '.data.result[].values[]'
```

---

## 🎯 Start Here

**Immediate:**
```bash
docker logs execora-app -f
```

**Analysis:**
```bash
cat logs/app.log | jq '.msg'
```

**Dashboard:**
- http://localhost:3001 → Explore → Loki → {job="execora-app"}

