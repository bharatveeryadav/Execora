# 📋 Complete Logging Setup Guide

## Overview

You have a **3-layer logging system** that captures ALL important logs:

```
┌─────────────────────────────────────────────────────────────┐
│ Application (Pino Logger)                                   │
│ - Development: Colored console output + File                │
│ - Production: File only (JSON format)                       │
└──────────────┬──────────────────────────────────────────────┘
               │
      ┌────────┴─────────┬──────────────┐
      ▼                  ▼              ▼
  ┌────────┐  ┌──────────────┐  ┌─────────┐
  │ STDOUT │  │ logs/app.log │  │ Console │
  │(Docker)│  │  (JSON)      │  │  Output │
  └────────┘  └──────────────┘  └─────────┘
                     │
                     ▼
              ┌────────────────┐
              │  Promtail      │
              │ (reads .log)   │
              └────────┬───────┘
                       │
                       ▼
              ┌────────────────┐
              │  Loki          │
              │ (aggregates)   │
              └────────┬───────┘
                       │
                       ▼
              ┌────────────────┐
              │  Grafana       │
              │ (visualizes)   │
              └────────────────┘
```

## 🎯 Log Levels

Pino logs at these levels:

| Level | Value | Use Case |
|-------|-------|----------|
| **TRACE** | 10 | Detailed tracing (internal function calls) |
| **DEBUG** | 20 | Debugging info (variable values, flows) |
| **INFO** | 30 | Business logic (requests, operations) ✅ START HERE |
| **WARN** | 40 | Warnings (deprecated APIs, unusual conditions) |
| **ERROR** | 50 | Errors (exceptions, failed operations) |
| **FATAL** | 60 | Fatal errors (app must exit) |

**Active Levels:**
- Development: DEBUG and above (captures everything)
- Production: INFO and above

## 👀 5 Ways to View Logs

### 1. **Docker Container Output** ⚡ EASIEST
View logs in real-time from container:

```bash
# View last 30 lines
docker logs execora-app | tail -30

# Follow live logs
docker logs execora-app -f

# View logs since 5 minutes ago
docker logs execora-app --since 5m

# View with timestamps
docker logs execora-app -t
```

**✓ Best for:** Quick debugging, real-time monitoring

---

### 2. **Local Log Files** 📄 PERSISTENT

Log files are stored locally:

```bash
# View all app logs
cat logs/app.log

# Live tail (follow new logs)
tail -f logs/app.log

# Search for errors in logs
grep "error\|Error\|ERROR" logs/app.log

# Get last 50 lines
tail -50 logs/app.log

# Search by date
grep "2026-02-19" logs/app.log

# Get all JSON and parse with jq
cat logs/app.log | jq '.msg' | sort | uniq -c
```

**Format:** Each line is valid JSON
```json
{
  "level": 30,
  "time": 1771461192000,
  "pid": 1,
  "hostname": "container-id",
  "service": "execora-api",
  "environment": "production",
  "msg": "Server listening",
  "port": 3000
}
```

**✓ Best for:** Searching, analyzing, backups

---

### 3. **Grafana + Loki** 🎨 FULL-FEATURED

Query logs in Grafana's Explore interface:

**Access:** http://localhost:3001 (admin/admin)

**Steps:**
1. Click **Explore** (sidebar)
2. Select **Loki** datasource
3. Enter LogQL query

**Common Queries:**

```logql
# All app logs
{job="execora-app"}

# Only errors
{job="execora-app"} | json | level="50"

# Specific service
{job="execora-app"} | json | pattern `payment`

# Last hour of logs
{job="execora-app"} | json | level="30" (last 1h)

# Count logs by level
{job="execora-app"} | json | stats count() by level

# WebSocket logs
{job="execora-app"} pattern `WebSocket`

# Invoice operations
{job="execora-app"} pattern `invoice` | json
```

**✓ Best for:** Complex queries, visualization, dashboards

---

### 4. **Direct Loki API** 🔧 MANUAL QUERIES

Query Loki API directly:

```bash
# Get labels
curl http://localhost:3100/loki/api/v1/label

# Query range (last 100 logs)
curl 'http://localhost:3100/loki/api/v1/query_range?query={job="execora-app"}&limit=100'

# Query instant (current state)
curl 'http://localhost:3100/loki/api/v1/query?query={job="execora-app"}'

# Parse with jq for readability
curl -s 'http://localhost:3100/loki/api/v1/query_range?query={job="execora-app"}&limit=10' | \
  jq '.data.result[].values[][] | @tsv'
```

**✓ Best for:** Automation, scripting, integrations

---

### 5. **Locally During Development** 💻 INSTANT FEEDBACK

When running locally:

```bash
# Development mode with pretty output
npm run dev

# Output shows:
# [INFO] [2026-02-19 14:30:45] - Server listening on 0.0.0.0:3000
# [DEBUG] [2026-02-19 14:30:45] - WebSocket connected: session-123
# [ERROR] [2026-02-19 14:30:50] - Payment failed: Insufficient funds
```

**✓ Best for:** Development, testing, fast feedback

---

## 📊 Important Logs to Watch

### 1. Server Startup
```bash
docker logs execora-app | grep -i "listening\|initialized\|ready"
```
**Expected:** "Server listening on 0.0.0.0:3000"

### 2. WebSocket Connections  
```bash
grep "WebSocket" logs/app.log
```
**Expected:** "WebSocket connected" / "WebSocket disconnected"

### 3. Voice Commands
```bash
grep "voice\|command" logs/app.log
```
**Expected:** "Voice command processed: *invoice*"

### 4. Errors
```bash
grep -i "error" logs/app.log
```
**Expected:** Only operational errors, not noise

### 5. Database Queries
```bash
cat logs/app.log | jq 'select(.msg | contains("query"))'
```
**Expected:** Query execution times

### 6. Invoice/Payment Operations
```bash
grep "invoice\|payment\|ledger" logs/app.log
```
**Expected:** "Invoice created" / "Payment recorded"

---

## 🔍 Search Recipes

### Find all errors
```bash
cat logs/app.log | jq 'select(.level >= 50)' | jq '.msg'
```

### Count requests by endpoint
```bash
cat logs/app.log | jq 'select(.method) | .method + " " + .route' | sort | uniq -c
```

### Find slow API requests (>1s)
```bash
cat logs/app.log | jq 'select(.duration > 1)'
```

### Get logs for a specific session
```bash
cat logs/app.log | jq 'select(.sessionId == "session-123")'
```

### Timeline of events
```bash
cat logs/app.log | jq -r '[.time, .level, .msg] | @csv'
```

### Find critical errors
```bash
cat logs/app.log | jq 'select(.level >= 50) | {time, msg, error}'
```

---

## 🎛️ Configuration

### Current Setup (src/lib/logger.ts)

**Development:**
- ✅ Console output (pretty, colored)
- ✅ File output (JSON format)
- ✅ Level: DEBUG (captures everything)

**Production:**
- ✅ File output (JSON format)
- ✅ Level: INFO (normal operations + errors)

**File Locations:**
- App logs: `logs/app.log`
- Ingested by: Promtail
- Stored in: Loki
- Viewed in: Grafana

### To Change Log Level

Edit `.env` or deploy environment:
```bash
# Development - keep everything
LOG_LEVEL=debug

# Production - info only
LOG_LEVEL=info
```

### To Add More Outputs

In `src/lib/logger.ts`, add targets:
```typescript
// Email on error
// Slack webhook on critical
// Database for analytics
```

---

## 📈 Log Usage Tips

### Monitor in Real-Time
```bash
# Terminal 1: Follow logs
tail -f logs/app.log | jq '.msg'

# Terminal 2: Filter by type
tail -f logs/app.log | grep "voice"
```

### Search Time Range
```bash
# Logs from 2:00-3:00 PM
grep "14:0[0-5]:" logs/app.log

# Logs from last 5 minutes
find logs -type f -newmin 5 | xargs tail -f
```

### Aggregate Multiple Days
```bash
# All logs for a service
cat logs/app.log* | jq '.msg' | sort | uniq -c | sort -rn
```

### Extract Metrics from Logs
```bash
# Total requests
cat logs/app.log | jq 'select(.method)' | wc -l

# Average response time
cat logs/app.log | jq '[.duration] | add / length'

# Error rate
cat logs/app.log | jq '[select(.level >= 50)] | length'
```

---

## ⚠️ Troubleshooting

### No logs appearing?

**Check 1: Container is running**
```bash
docker ps | grep execora-app
```

**Check 2: Logs directory exists**
```bash
ls -la logs/
# Should show app.log
```

**Check 3: Can read logs**
```bash
docker exec execora-app tail /app/logs/app.log
```

### Loki not ingesting logs?

**Check 1: Promtail is running**
```bash
docker ps | grep promtail
docker logs execora-promtail
```

**Check 2: Promtail config is correct**
```bash
docker exec execora-promtail cat /etc/promtail/config.yml | grep /app/logs
```

**Check 3: Loki is receiving data**
```bash
curl http://localhost:3100/loki/api/v1/label/job/values
# Should return ["execora-app"]
```

### Too much output / noise?

Lower the log level:
```bash
# In docker-compose.yml
environment:
  LOG_LEVEL: "warn"  # Only warnings and errors
```

---

## 🚀 Next Steps

1. **View logs now:**
   ```bash
   docker logs execora-app -f
   ```

2. **Search logs:**
   ```bash
   grep "error" logs/app.log
   ```

3. **Check Grafana:**
   - http://localhost:3001
   - Explore → Loki → {job="execora-app"}

4. **Create dashboards:**
   - Use Grafana to build custom log dashboards
   - Group by log level, service, message

---

## Summary

| Method | Real-time | Searchable | Persistent | Best For |
|--------|-----------|-----------|-----------|----------|
| Docker logs | ✅ | ✅ | ❌ | Quick checks |
| Local files | ❌ | ✅ | ✅ | Analysis |
| Grafana/Loki | ✅ | ✅ | ✅ | Monitoring |
| API | ✅ | ✅ | ✅ | Automations |
| Dev mode | ✅ | ❌ | ❌ | Development |

**Start here:** `docker logs execora-app -f`
