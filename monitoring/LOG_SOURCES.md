# 📍 All Log Sources - Complete Reference

## Your Logging Stack

```
APPLICATION (Pino Logger)
├── Console Output → Docker logs
├── File Output → logs/app.log
└── Structured JSON → All events

                ↓

COLLECTION
├── Docker → docker logs execora-app
├── File System → ./logs/app.log  
└── JSON → cat logs/app.log | jq

                ↓

AGGREGATION (Promtail)
└── Reads logs/app.log
    └── Sends to Loki

                ↓

STORAGE (Loki)
└── Stores with labels
    └── Ready for queries

                ↓

VISUALIZATION
├── Grafana (Web UI)
├── Loki API (Programmatic)
└── Direct File (Analysis)
```

---

## Complete Log Source Guide

### 1️⃣ Docker Container Output
**Real-time logs from running container**

```bash
# View all output
docker logs execora-app

# Follow live
docker logs execora-app -f

# Last 50 lines
docker logs execora-app --tail 50

# Last 5 minutes
docker logs execora-app --since 5m

# With timestamps
docker logs execora-app -t
```

**Content:** Raw output from stdout/stderr
**Storage:** Container logs (deleted when container removed)
**Access:** ✅ Immediate, ❌ Limited history

---

### 2️⃣ Local Log File
**Persistent JSON logs on disk**

**Host path:** `./logs/app.log`
**Container path:** `/app/logs/app.log`

```bash
# View entire file
cat logs/app.log

# Live tail
tail -f logs/app.log

# Last 50 lines
tail -50 logs/app.log

# Search
grep "error" logs/app.log
grep "2026-02-19" logs/app.log
grep "invoice" logs/app.log

# Count lines
wc -l logs/app.log

# File size
du -h logs/app.log
```

**Content:** One JSON object per line
**Storage:** Host machine, persistent
**Access:** ✅ Searchable, ✅ Historical, ✅ Backupable

---

### 3️⃣ Promtail (Log Shipper)
**Reads local logs and ships to Loki**

```bash
# Check if running
docker ps | grep promtail

# View Promtail logs
docker logs execora-promtail

# Check config
docker exec execora-promtail cat /etc/promtail/config.yml

# Verify it's reading app logs
docker logs execora-promtail | grep "Adding target"
```

**Status:** ✅ Running
**Config:** `monitoring/promtail-config.yml`
**Destination:** Loki (loki:3100)

---

### 4️⃣ Loki (Log Aggregation)
**Centralized log storage**

#### Check Loki Health
```bash
# Is it running?
docker ps | grep loki

# Health check
curl http://localhost:3100/ready

# Available jobs
curl http://localhost:3100/loki/api/v1/label/job/values | jq
```

#### Query Loki API
```bash
# Get last 100 logs
curl -s 'http://localhost:3100/loki/api/v1/query_range?query={job="execora-app"}&limit=100'

# Query with time range
NOW=$(date +%s%N)
START=$((NOW - 3600000000000))
curl "http://localhost:3100/loki/api/v1/query_range?query={job=\"execora-app\"}&start=$START&end=$NOW"

# Parse and display
curl -s 'http://localhost:3100/loki/api/v1/query_range?query={job="execora-app"}&limit=10' | \
  jq '.data.result[].values[]'
```

**Storage:** Loki data volume
**Retention:** 7 days
**Access:** ✅ API queries, ✅ Grafana integration

---

### 5️⃣ Grafana (Visualization)
**Web interface for log exploration**

#### Access
- **URL:** http://localhost:3001
- **User:** admin
- **Password:** admin

#### View Logs
1. Click **Explore** (sidebar)
2. Select **Loki** datasource
3. Click **Code** button for LogQL
4. Enter query: `{job="execora-app"}`
5. Click **Run query**

#### Example LogQL Queries

**All logs:**
```logql
{job="execora-app"}
```

**Errors only:**
```logql
{job="execora-app"} | json | level="50"
```

**Search for text:**
```logql
{job="execora-app"} | pattern "invoice"
```

**By level:**
```logql
{job="execora-app"} | json | level="30"
```

**Stats:**
```logql
{job="execora-app"} | json | stats count() by level
```

**Features:** ✅ Search, ✅ Filter, ✅ Dashboard, ✅ Alerts

---

## Quick Status Check

```bash
#!/bin/bash

echo "=== LOGGER CONFIGURATION ==="
docker logs execora-app | head -5
echo ""

echo "=== LOCAL LOG FILE ==="
ls -lh logs/app.log
echo ""

echo "=== RECENT LOGS ==="
tail -3 logs/app.log | jq '.msg'
echo ""

echo "=== PROMTAIL STATUS ==="
docker ps | grep promtail
echo ""

echo "=== LOKI STATUS ==="
curl -s http://localhost:3100/ready
echo ""

echo "=== LOGS IN LOKI ==="
curl -s http://localhost:3100/loki/api/v1/label/job/values | jq '.data'
```

---

## Choosing the Right Source

| Need | Use | Command |
|------|-----|---------|
| Quick check | Docker logs | `docker logs execora-app \| tail -20` |
| Search logs | Local file | `grep "error" logs/app.log` |
| Real-time monitoring | Docker follow | `docker logs execora-app -f` |
| Advanced queries | Loki API | `curl http://localhost:3100/...` |
| Visual dashboard | Grafana | http://localhost:3001 |
| Analyze patterns | jq + file | `cat logs/app.log \| jq ...` |

---

## Troubleshooting Log Issues

### No logs in container?
```bash
# Check if app is running
docker ps | grep execora-app

# Check app logs for errors
docker logs execora-app

# Check if app crashed
docker ps -a | grep execora-app
```

### No logs in file?
```bash
# Check file exists
ls -la logs/app.log

# Check file has content
wc -l logs/app.log

# Check container can write
docker exec execora-app test -w /app/logs && echo "writable" || echo "not writable"
```

### Promtail not shipping?
```bash
# Is Promtail running?
docker ps | grep promtail

# Check Promtail logs for errors
docker logs execora-promtail

# Verify config
docker exec execora-promtail cat /etc/promtail/config.yml | grep -i "/app/logs"
```

### Loki not receiving?
```bash
# Is Loki running?
docker ps | grep loki

# Check Loki health
curl http://localhost:3100/ready

# Check for jobs
curl http://localhost:3100/loki/api/v1/label/job/values

# If no execora-app, wait for Promtail to push
sleep 30
curl http://localhost:3100/loki/api/v1/label/job/values
```

### Can't access Grafana?
```bash
# Is Grafana running?
docker ps | grep grafana

# Is port accessible?
curl http://localhost:3001/api/health

# Check logs
docker logs execora-grafana | tail -20
```

---

## Log Files Summary

| File | Location | Purpose | Format | Retention |
|------|----------|---------|--------|-----------|
| app.log | `./logs/app.log` | All events | JSON | On disk |
| Docker | Container | Stdout/stderr | Text | Container lifecycle |
| Loki | `execora_loki_data/` | Aggregated | Indexed | 7 days |
| Prometheus | `prometheus_data/` | Metrics | TSDB | Auto-managed |

---

## Recommended Monitoring

**Daily:**
- Check error rate: `grep "error" logs/app.log | wc -l`
- Monitor WebSocket activity
- Track payment transactions

**Weekly:**
- Review performance metrics
- Analyze slow endpoints
- Check system health

**Real-time:**
- Use Grafana dashboards
- Set up alerts in Loki
- Monitor critical operations

