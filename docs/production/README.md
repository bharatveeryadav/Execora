# Production Deployment & Operations

Make Execora production-ready with monitoring, alerting, SLA tracking, and operational excellence.

## 📚 Quick Navigation

### Getting Started
- **[PRODUCTION_STRATEGY.md](PRODUCTION_STRATEGY.md)** - Overall production readiness strategy
- **[PRODUCTION_DASHBOARD_GUIDE.md](PRODUCTION_DASHBOARD_GUIDE.md)** - Comprehensive monitoring dashboard setup

### Setup & Configuration  
- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - Pre-production verification (create)
- **[ALERTS_SETUP.md](ALERTS_SETUP.md)** - Configure alerting rules (create)
- **[SLA_TRACKING.md](SLA_TRACKING.md)** - Setup SLA monitoring (create)

---

## 🎯 Production Readiness

### ✅ Currently Implemented
- ✅ Centralized error handling (all errors logged)
- ✅ Structured logging (JSON format)
- ✅ Real-time monitoring dashboard (11 panels)
- ✅ Log aggregation (Loki)
- ✅ Metrics collection (Prometheus)
- ✅ Visualization (Grafana)
- ✅ Regression testing suite

### 🚧 In Progress
- 🚧 Alerting rules setup
- 🚧 SLA tracking implementation
- 🚧 Dependency health monitoring
- 🚧 Error categorization by service

### ⏳ Recommended Future
- Distributed request tracing
- Capacity forecasting
- Anomaly detection (ML)
- Business metrics tracking
- Compliance auditing

---

## 📊 Critical Metrics to Monitor

### System Health
- 🚨 Error rate (target: < 1%)
- ⏱️ Response time p95 (target: < 500ms)
- ⚡ Request throughput (validate against capacity)
- 🔗 Dependency health (all services up)

### Dependencies
- **Database:** Response time < 200ms
- **Redis Cache:** Response time < 5ms
- **OpenAI API:** Response time < 1.5s
- **Deepgram STT:** Response time < 2s
- **ElevenLabs TTS:** Response time < 500ms
- **WhatsApp API:** Response time < 1s

### Business Metrics
- Daily transaction count
- Orders processed
- Users affected by errors
- Revenue impact

---

## 🚨 Alert Configuration Example

```yaml
# Critical Alerts (Immediate)
- error_rate > 1% for 5 min
- api_response_time_p95 > 1000ms
- database_response_time > 500ms
- service_down for 1 min

# High Priority (Within 30 min)
- error_rate > 0.5% for 10 min
- cache_hit_rate < 70%
- disk_space < 20%
- memory > 80%

# Medium Priority (Within 2 hours)
- slow_query detected
- dependency_latency trending up
- queue_depth building
- cpu > 70%
```

---

## 📈 SLA Targets

Suggested SLA thresholds:

```
Availability:        99.9% (43 min downtime/month)
Response Time (p95): 500ms
Error Rate:          < 1%
Error Budget:        ~43 min of errors/month
Recovery Time:       < 15 min (RTO)
Data Loss:           Zero (RPO)
```

---

## 🔄 Deployment Checklist

Before deploying to production:

- [ ] All tests passing (npm run test)
- [ ] Build completes successfully (npm run build)
- [ ] Error handler configured
- [ ] Monitoring stack running
- [ ] Grafana dashboard created
- [ ] Alert rules configured
- [ ] Database backups enabled
- [ ] Secrets properly configured
- [ ] Load testing completed
- [ ] Rollback plan documented
- [ ] On-call rotation setup
- [ ] Runbooks created

---

## 📊 Monitoring Stack Status

**Components Running:**
- ✅ Application (Port 3000)
- ✅ Grafana (Port 3001)
- ✅ Prometheus (Port 9090)
- ✅ Loki (Port 3100)
- ✅ Promtail (Collecting logs)

**Dashboards:**
- ✅ Error Monitoring Dashboard
- ✅ Real-time Activity  
- ✅ User Flow Tracking
- ✅ System Overview

---

## 🔗 Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3001 | admin / admin |
| **Prometheus** | http://localhost:9090 | None |
| **Loki** | http://localhost:3100 | None |
| **Application** | http://localhost:3000 | API |

---

## 📈 Recommended Improvements (Priority Order)

1. **Phase 1 (This Week):**
   - [ ] Setup alerting with Slack notifications
   - [ ] Create SLA tracking dashboard
   - [ ] Document runbooks for common issues

2. **Phase 2 (Next Week):**
   - [ ] Implement distributed tracing
   - [ ] Add dependency health checks
   - [ ] Setup capacity monitoring

3. **Phase 3 (This Month):**
   - [ ] Setup ML-based anomaly detection
   - [ ] Implement cost tracking
   - [ ] Compliance audit setup

---

## 🆘 Troubleshooting

### Services not running?
```bash
docker-compose ps
docker-compose up -d
```

### Metrics not showing?
- Check Prometheus scrape targets: http://localhost:9090/targets
- Verify app exposes /metrics: `curl http://localhost:3000/metrics`

### Logs not in Grafana?
- Check Loki is receiving logs: `curl http://localhost:3100/loki/api/v1/labels`
- Verify Promtail config: `docker logs execora-promtail`

---

## 📖 Related Documentation

- **Error Handling:** [../implementation/error-handling/](../implementation/error-handling/)
- **Monitoring:** [../monitoring/](../monitoring/)
- **Testing:** [../testing/](../testing/)
- **Production Audit:** [../audit/PRODUCTION_READINESS_AUDIT.md](../audit/PRODUCTION_READINESS_AUDIT.md)

---

## 🎓 Learning Resources

- [SRE Book - Google](https://sre.google/books/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [Grafana Best Practices](https://grafana.com/docs/grafana/latest/dashboards/best-practices/)
- [Observability Engineering](https://www.oreilly.com/library/view/observability-engineering/9781492076438/)

---

**Last Updated:** Feb 20, 2026  
**Environment:** Production  
**Maintained By:** DevOps & SRE Team
