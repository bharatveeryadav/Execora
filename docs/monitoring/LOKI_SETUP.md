# Loki Log Aggregation Setup

## Problem Resolved
Fixed the **"404 page not found"** error for Loki logs in Grafana by implementing complete log ingestion pipeline.

## Solution Implemented

### 1. **Pino Logger File Output** (src/lib/logger.ts)
- Modified Pino to write logs to `logs/app.log` alongside console output
- JSON format compatible with Loki ingestion
- Automatic directory creation if `logs/` doesn't exist

### 2. **Promtail Configuration** (monitoring/promtail-config.yml)
- Configured to read from `/app/logs/app.log` inside container
- Pipeline stages:
  - **JSON parsing**: Extract level, timestamp, message, error from Pino logs
  - **Label extraction**: Apply job, environment, service labels
  - **Timestamp parsing**: Convert Pino millisecond timestamps to UTC

### 3. **Docker Compose Volumes** (docker-compose.monitoring.yml)
- Mount `./logs` → `/app/logs` in Promtail container
- Allows Promtail to read application logs from host

### 4. **Loki Configuration** (monitoring/loki-config.yml)
- Disabled structured metadata requirement (`allow_structured_metadata: false`)
- Fixed schema v11 → v13 compatibility issue that caused startup failures
- 7-day retention period for logs

## How It Works

```
Application (Pino logger)
         ↓
    logs/app.log (JSON)
         ↓
    Promtail (reads + parses)
         ↓
    Loki (aggregates)
         ↓
    Grafana (visualizes)
```

## Verification

✅ All monitoring containers running:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001
- Loki: http://localhost:3100
- Promtail: Running (no web UI, logs to Loki)
- Node Exporter: http://localhost:9100

✅ Loki responding to queries:
```bash
curl http://localhost:3100/loki/api/v1/label
# Returns: {"status":"success"}
```

## How to View Logs in Grafana

1. Open **Grafana**: http://localhost:3001
   - User: `admin`
   - Password: `admin`

2. Click **Explore** (sidebar icon)

3. Select **Loki** datasource (dropdown at top)

4. Try this LogQL query to see all app logs:
   ```
   {job="execora-app"}
   ```

5. Or filter by level:
   ```
   {job="execora-app", level="error"}
   ```

## Log Format

Pino logs are sent as JSON:
```json
{
  "level": 30,
  "time": 1676688903310,
  "pid": 1234,
  "hostname": "container-id",
  "msg": "Server listening",
  "host": "0.0.0.0",
  "port": 3000
}
```

Promtail extracts:
- `level`: Log level
- `time`: Timestamp (converted to UTC)
- `msg`: Log message

## Troubleshooting

### No logs appearing in Grafana?
1. Check application is running: `docker ps | grep execora-app`
2. Check logs exist: `ls -la logs/app.log`
3. Check Promtail is reading them: `docker logs execora-promtail | grep "Adding target"`
4. Wait 30 seconds for log ingest delay

### Loki shows "error initializing..."?
- This is a Grafana UI delay when Loki is just started
- Wait 2-3 minutes for Loki to stabilize
- Or restart Grafana: `docker compose -f docker-compose.monitoring.yml restart grafana`

### Promtail not finding logs?
1. Verify logs directory exists: `mkdir -p logs`
2. Verify path in docker-compose.yml: `./logs:/app/logs`
3. Verify path in promtail-config.yml: `__path__: /app/logs/app.log`
4. Restart Promtail: `docker compose -f docker-compose.monitoring.yml restart promtail`
