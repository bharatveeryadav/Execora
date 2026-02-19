# Execora Observability Stack

Complete monitoring and observability setup for Execora voice-based business assistant.

## 📊 Stack Components

- **Prometheus** - Metrics collection and storage
- **Grafana** - Unified dashboard and visualization
- **Loki** - Log aggregation
- **Promtail** - Log shipper
- **Node Exporter** - System metrics

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install prom-client
```

### 2. Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Check status
docker-compose -f docker-compose.monitoring.yml ps
```

### 3. Start Your Application

```bash
npm run dev
```

### 4. Access Dashboards

- **Grafana**: http://localhost:3001
  - Username: `admin`
  - Password: `admin`
  
- **Prometheus**: http://localhost:9090

- **Loki**: http://localhost:3100

## 📈 Available Metrics

### Application Metrics (`:9091/metrics`)

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | Request latency |
| `websocket_connections_active` | Gauge | Active WS connections |
| `voice_commands_total` | Counter | Voice commands processed |
| `invoice_operations_total` | Counter | Invoice operations |
| `payments_processed_total` | Counter | Payments processed |
| `payment_amount_inr` | Histogram | Payment amounts |
| `db_query_duration_seconds` | Histogram | Database query time |
| `stt_processing_duration_seconds` | Histogram | STT processing time |
| `tts_processing_duration_seconds` | Histogram | TTS processing time |
| `task_queue_pending` | Gauge | Pending tasks |
| `errors_total` | Counter | Total errors |

### System Metrics (Node Exporter)

- CPU usage
- Memory usage
- Disk I/O
- Network traffic
- Process statistics

## 🔍 Example Queries

### Prometheus Queries

```promql
# Request rate (requests/second)
rate(http_requests_total[5m])

# Average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m])

# Active WebSocket connections
websocket_connections_active

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Payment volume by hour
sum(rate(payment_amount_inr_sum[1h]))
```

### Loki Queries (LogQL)

```logql
# All error logs
{job="execora-app"} |= "error"

# Invoice operations
{job="execora-app"} | json | msg =~ "Invoice.*"

# Payments over 10,000 INR
{job="execora-app"} | json | amount > 10000

# WebSocket errors
{job="execora-app"} | json | msg =~ "WebSocket.*error"
```

## 📊 Pre-built Dashboards

### Main Dashboard
Shows:
- Request rate and latency
- Error rate
- Active connections
- System resources (CPU, memory)
- Database performance

### Business Metrics Dashboard
Shows:
- Invoice creation rate
- Payment processing
- Customer operations
- Voice command success rate

### Performance Dashboard
Shows:
- API response times (p50, p95, p99)
- Database query durations
- STT/TTS processing times
- Task queue metrics

## 🔔 Setting Up Alerts

### Example Alert Rules

Create `monitoring/alerts.yml`:

```yaml
groups:
  - name: execora_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} per second"
          
      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile latency is {{ $value }}s"
          
      # WebSocket disconnections
      - alert: WebSocketDisconnections
        expr: rate(websocket_connections_active[5m]) < -1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Multiple WebSocket disconnections"
```

## 🛠️ Configuration

### Environment Variables

Add to your `.env`:

```bash
# Metrics
METRICS_ENABLED=true
METRICS_PORT=9091

# Log file path for Promtail
LOG_FILE_PATH=./logs/app.log
```

## 📝 Logging Best Practices

### Update Logger Configuration

```typescript
// src/lib/logger.ts
import pino from 'pino';
import fs from 'fs';

const logFilePath = './logs/app.log';

// Ensure logs directory exists
fs.mkdirSync('./logs', { recursive: true });

export const logger = pino({
  level: 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
}, pino.multistream([
  { stream: process.stdout }, // Console
  { stream: pino.destination(logFilePath) }, // File for Loki
]));
```

## 🎯 Monitoring Checklist

- [ ] Prometheus scraping application metrics
- [ ] Grafana displaying dashboards
- [ ] Loki receiving logs from Promtail
- [ ] Alerts configured and tested
- [ ] Dashboards customized for your use case
- [ ] Retention periods set appropriately
- [ ] Backup strategy for metrics/logs

## 🐛 Troubleshooting

### Prometheus not scraping metrics

```bash
# Check if metrics endpoint is accessible
curl http://localhost:9091/metrics

# Check Prometheus targets
# Visit: http://localhost:9090/targets
```

### Loki not receiving logs

```bash
# Check if logs are being written
ls -lh logs/

# Check Promtail status
docker logs execora-promtail

# Test Loki endpoint
curl http://localhost:3100/ready
```

### Grafana datasource issues

```bash
# Restart Grafana
docker restart execora-grafana

# Check datasource connectivity in Grafana UI
# Settings > Data Sources > Test
```

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Prom-client (Node.js)](https://github.com/siimon/prom-client)

## 🔐 Production Recommendations

1. **Authentication**: Enable authentication for Grafana, Prometheus
2. **HTTPS**: Use reverse proxy (nginx) with SSL certificates
3. **Backups**: Regular backups of Grafana dashboards and alert rules
4. **Retention**: Configure appropriate retention periods for your use case
5. **Scalability**: Consider Cortex/Thanos for multi-cluster Prometheus
6. **External Storage**: Use S3/GCS for long-term log storage

## 📊 Example Dashboard Panels

### Request Rate Panel
```promql
sum(rate(http_requests_total[5m])) by (method)
```

### Error Rate Panel
```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
```

### Memory Usage Panel
```promql
process_resident_memory_bytes
```

---

**Need help?** Check the logs in `./logs/` or visit the Grafana dashboard at http://localhost:3001
