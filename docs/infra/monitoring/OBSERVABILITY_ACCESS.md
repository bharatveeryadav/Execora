> Backend Truth: Active runtime behavior is defined by apps/api/src/index.ts, apps/api/src/api/index.ts, and apps/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# 🔍 Your Observability Stack - Complete Access Guide

## 🎯 Quick Access (Copy-Paste These URLs)

Open in your browser RIGHT NOW:

| Tool | URL | User | Password | What You See |
|------|-----|------|----------|--------------|
| **Grafana** | http://localhost:3001 | admin | admin | Dashboards + Logs + Metrics |
| **Prometheus** | http://localhost:9090 | - | - | Metrics & Queries |
| **Loki** | http://localhost:3100 | - | - | Log API (developer) |
| **App** | http://localhost:3000 | - | - | Your application |

---

## 🎨 GRAFANA (Main Dashboard) - START HERE!

### Step 1: Open Grafana
```
http://localhost:3001
```
Login: `admin` / `admin`

### Step 2: What's Available?

**Left Sidebar Options:**

🏠 **Home** - Overview of your system
- Shows system status
- Quick links to dashboards

📊 **Dashboards** - View all dashboards
- Application metrics
- System performance
- User activity

🔍 **Explore** - Search & analyze logs/metrics
- *This is the most useful!*
- Real-time log search
- Metric queries

⚙️ **Configuration** - Settings & datasources
- Prometheus connected ✅
- Loki connected ✅

---

## 📋 GRAFANA: Explore (Most Useful!)

### See User Activity Live
1. Click **Explore** (sidebar)
2. At top, select **Loki** datasource
3. In the query box, type:
   ```logql
   {job="execora-app"}
   ```
4. Press **Enter** or **Run query**
5. See all logs live!

### Filter to User Activity Only
```logql
{job="execora-app"} | json | user_id != ""
```

### See Only Errors
```logql
{job="execora-app"} | json | level="50"
```

### See Invoice Activity
```logql
{job="execora-app"} | pattern "invoice"
```

### See Payment Activity
```logql
{job="execora-app"} | pattern "payment"
```

### Real-time Live Stream
1. Run any query above
2. Click **Live** button (top right)
3. Logs will scroll as they happen ⚡

---

## 📈 PROMETHEUS (Metrics Database)

### Step 1: Open Prometheus
```
http://localhost:9090
```

### Step 2: Run Metric Queries

In the **Search** box, try:

**See Active WebSocket Connections:**
```
websocket_connections_active
```

**See HTTP Request Rate:**
```
rate(http_requests_total[5m])
```

**See Invoice Operations:**
```
invoice_operations_total
```

**See Payment Processing:**
```
payments_processed_total
```

**See All Metrics:**
```
{job="execora-app"}
```

### Step 3: Visualize
- Click **Graph** tab to see charts
- Adjust time range (top right)
- Export data if needed

---

## 🎯 YOUR OBSERVABILITY STACK AT A GLANCE

```
┌─────────────────────────────────────────────────────────────┐
│                   YOUR APPLICATION                          │
│              (http://localhost:3000)                        │
│                                                             │
│  • Pino Logger (3-layer output)                           │
│  • Prometheus Metrics (/metrics endpoint)                 │
│  • WebSocket tracking                                      │
│  • Business operations tracking                            │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┴──────────┬──────────────┐
    │                   │              │
    ▼                   ▼              ▼
┌────────────┐   ┌────────────┐   ┌──────────┐
│   Docker   │   │  Log File  │   │Prometheus│
│    Logs    │   │  (app.log) │   │ /metrics │
└────────────┘   └────────────┘   └──────────┘
    │                   │              │
    │                   ▼              │
    │            ┌─────────────┐       │
    │            │   Promtail  │       │
    │            │ (Log Shipper)       │
    │            └──────┬──────┘       │
    │                   │              │
    └───────────────────┼──────────────┘
                        │
                        ▼
                ┌────────────────┐
                │      LOKI      │
                │   (Aggregates) │
                └────────────────┘
                        │
                        ▼
         ┌──────────────────────────┐
         │      GRAFANA             │
         │ (http://localhost:3001)  │
         │                          │
         │ • Logs (via Loki)       │
         │ • Metrics (via Prom)    │
         │ • Dashboards           │
         │ • Alerts               │
         └──────────────────────────┘
```

---

## 🚀 QUICK WALKTHROUGH (5 Minutes)

### 1️⃣ Open Grafana
```
http://localhost:3001 → Login (admin/admin)
```

### 2️⃣ Click "Explore"
- Top of left sidebar

### 3️⃣ Select "Loki" 
- Dropdown at top

### 4️⃣ Paste this query:
```logql
{job="execora-app"}
```

### 5️⃣ Click "Run query"
- See all your logs!

### 6️⃣ Click "Live"
- Watch real-time activity 🔴

---

## 📊 COOL THINGS YOU CAN DO

### Monitor Specific User
```logql
{job="execora-app"} | json | user_id="USER_123"
```

### Find All Errors
```logql
{job="execora-app"} | json | level="50"
```

### Search for Keywords
```logql
{job="execora-app"} | pattern "error\|fail\|timeout"
```

### See Activity by Hour
Select time range → Run query → See graph

### Export Logs
- Select logs
- Copy to clipboard
- Paste into Excel/Notes

---

## 🔧 PROMETHEUS QUERIES (Advanced)

### How many requests per second?
```
rate(http_requests_total[1m])
```

### Average response time?
```
avg(http_request_duration_seconds_bucket)
```

### Current active WebSocket connections?
```
websocket_connections_active
```

### Total payments processed?
```
increase(payments_processed_total[1h])
```

### Error rate in last hour?
```
rate(http_requests_total{status=~"5.."}[1h])
```

---

## 🎮 GRAFANA: Create Your Own Dashboard

### Step 1: Create Dashboard
1. Click **Dashboards** → **New Dashboard**
2. Click **Add Panel**

### Step 2: Add Logs Panel
1. Select **Loki** datasource
2. Enter query: `{job="execora-app"}`
3. Click **Apply**

### Step 3: Add Metrics Panel
1. Click **Add Panel** again
2. Select **Prometheus** datasource
3. Enter query: `websocket_connections_active`
4. Choose visualization (Graph/Gauge/Stat)
5. Click **Apply**

### Step 4: Save Dashboard
1. Click **Save** (top right)
2. Name it: "My Dashboard"
3. Check it out! 🎉

---

## ✅ VERIFY EVERYTHING IS WORKING

### Check All Services Running
```bash
docker ps | grep -E "grafana|prometheus|loki|promtail|execora-app"
```

Output should show:
- ✅ execora-app (port 3000)
- ✅ execora-grafana (port 3001)
- ✅ execora-prometheus (port 9090)
- ✅ execora-loki (port 3100)
- ✅ execora-promtail

### Check Prometheus Scraping
```
http://localhost:9090/targets
```
Should show: execora-app → **UP** ✅

### Check Loki Receiving Logs
```
http://localhost:3100/loki/api/v1/label/job/values
```
Should show: `["execora-app"]`

### Check Latest Logs in Grafana
1. Go http://localhost:3001/explore
2. Select Loki
3. Run: `{job="execora-app"} | limit 10`
4. Should see logs

---

## 🎯 WHAT EACH TOOL DOES

| Tool | Purpose | Best For | Access |
|------|---------|----------|--------|
| **Grafana** | Visual dashboards | User activity, trends, alerts | http://localhost:3001 |
| **Prometheus** | Metrics storage | Performance, uptime, rates | http://localhost:9090 |
| **Loki** | Log storage | Searching logs, debugging | API only / via Grafana |
| **Promtail** | Log shipper | Collecting logs | No UI (background) |
| **Docker Logs** | Real-time output | Quick checks, debugging | `docker logs app -f` |

---

## 🚨 TROUBLESHOOTING

### Grafana not loading?
```bash
docker ps | grep grafana
# If not running: docker compose -f docker-compose.monitoring.yml up grafana
```

### Prometheus shows no data?
```bash
curl http://localhost:9090/targets
# Check if execora-app shows as UP
```

### No logs in Loki?
```bash
curl http://localhost:3100/loki/api/v1/label/job/values
# Wait 30 seconds, then try again
```

### Can't connect to localhost:3001?
```bash
# Check if monitoring stack is running
docker compose -f docker-compose.monitoring.yml ps
# If not: docker compose -f docker-compose.monitoring.yml up -d
```

---

## 📱 RECOMMENDED WORKFLOW

**Right Now:**
1. Open http://localhost:3001
2. Click Explore
3. Select Loki
4. Run: `{job="execora-app"}`
5. Click "Live" to watch activity

**Daily:**
- Check error logs
- Monitor user activity
- Review metrics trends

**Weekly:**
- Review dashboards
- Analyze performance
- Check system health

---

## 🎓 NEXT STEPS

### Want to see metrics trends?
- Go to Prometheus
- Run: `rate(http_requests_total[5m])`
- Add a dashboard in Grafana

### Want to monitor errors?
- Go to Grafana Explore
- Run: `{job="execora-app"} | json | level="50"`
- Click "Live" to watch errors as they occur

### Want user activity timeline?
- Go to Grafana Explore
- Run: `{job="execora-app"} | json | user_id != ""`
- Adjust time range (top right)

---

## 💡 PRO TIPS

✅ **Bookmark these URLs:**
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090
- App: http://localhost:3000

✅ **Use Grafana Explore:**
- Most powerful tool for debugging
- Search logs + metrics together
- Real-time monitoring

✅ **Set Refresh Rate:**
- In Grafana, top right
- Set to "1s" for real-time updates

✅ **Create Shortcuts:**
- Save favorite queries
- Create panels
- Share dashboards

