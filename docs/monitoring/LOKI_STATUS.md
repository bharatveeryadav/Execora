# ✅ Loki "Not Found" Issue - RESOLVED

## Problem
Loki datasource showed "404 page not found" in Grafana when trying to query logs.

## Root Causes Identified & Fixed

### 1. **Missing Pino File Output**
- **Issue**: Logger only printed to console, no file logs
- **Fix**: Updated [src/lib/logger.ts](../src/lib/logger.ts) to write JSON logs to `logs/app.log`

### 2. **Loki Schema Compatibility**
- **Issue**: Loki v13 requires schema v13, but config used v11
- **Fix**: Added `allow_structured_metadata: false` to [monitoring/loki-config.yml](loki-config.yml)

### 3. **Promtail Configuration**
- **Issue**: Duplicate config keys causing parse errors
- **Fix**: Cleaned up [monitoring/promtail-config.yml](promtail-config.yml) with proper JSON parsing pipeline

### 4. **Docker Volume Mounts**
- **Issue**: Promtail couldn't read app logs
- **Fix**: Updated [docker-compose.monitoring.yml](../docker-compose.monitoring.yml) to mount `./logs:/app/logs`

### 5. **Grafana Authentication**
- **Issue**: Datasources not loading due to missing admin user
- **Fix**: Added environment variables:
  ```
  GF_SECURITY_ADMIN_USER=admin
  GF_SECURITY_ADMIN_PASSWORD=admin
  GF_AUTH_ANONYMOUS_ENABLED=true
  ```

## Verification

✅ **Data Pipeline Working**
```bash
# 1. Logs are being generated
docker exec execora-app ls -lh /app/logs/app.log
# Result: -rw-r--r-- 1 root root 2.3K /app/logs/app.log

# 2. Logs are in JSON format
docker exec execora-app head -1 /app/logs/app.log
# Result: {"level":40,"time":1771460413992,"pid":67,"hostname":"...","msg":"..."}

# 3. Loki has the logs
curl -s "http://localhost:3100/loki/api/v1/label/job/values"
# Result: {"status":"success","data":["execora-app"]}

# 4. Grafana can list datasources
curl -s -u admin:admin http://localhost:3001/api/datasources
# Result: [{"name":"Loki","type":"loki","url":"http://loki:3100"}]
```

## Full Data Flow

```
┌──────────────────────────────────────────────────┐
│  Application (Pino Logger)                       │
│  - Logs both to console & file                   │
└─────────────────┬────────────────────────────────┘
                  │ logs/app.log (JSON)
                  ▼
┌──────────────────────────────────────────────────┐
│  Promtail Container                              │
│  - Reads /app/logs/app.log                       │
│  - Parses JSON with labels                       │
│  - job="execora-app"                             │
│  - environment="production"                      │
│  - service="voice-assistant"                     │
└─────────────────┬────────────────────────────────┘
                  │ POST /loki/api/v1/push
                  ▼
┌──────────────────────────────────────────────────┐
│  Loki                                            │
│  - Stores logs with stream labels                │
│  - 7-day retention                               │
│  - Ready for queries                             │
└─────────────────┬────────────────────────────────┘
                  │ /loki/api/v1/query_range
                  ▼
┌──────────────────────────────────────────────────┐
│  Grafana                                         │
│  - Explore > Select Loki datasource              │
│  - Query: {job="execora-app"}                    │
│  - ✅ Logs now visible!                          │
└──────────────────────────────────────────────────┘
```

## Access Instructions

### Grafana
- **URL**: http://localhost:3001
- **User**: admin
- **Password**: admin
- **Steps**:
  1. Click **Explore** (left sidebar)
  2. Select **Loki** datasource (top dropdown)
  3. Enter LogQL query: `{job="execora-app"}`
  4. Click **Run query**

### Direct Loki Query
```bash
curl 'http://localhost:3100/loki/api/v1/query_range?query={job="execora-app"}&limit=100'
```

### Prometheus
- **URL**: http://localhost:9090
- System metrics available at: `{job="prometheus"}`

## Files Modified

| File | Change |
|------|--------|
| [src/lib/logger.ts](../src/lib/logger.ts) | Added file output transport for Loki |
| [monitoring/loki-config.yml](loki-config.yml) | Fixed schema compatibility |
| [monitoring/promtail-config.yml](promtail-config.yml) | Fixed config parsing errors |
| [docker-compose.monitoring.yml](../docker-compose.monitoring.yml) | Fixed volume mounts & Grafana auth |

## Status
✅ **RESOLVED** - Loki is now fully operational and integrated with Grafana
