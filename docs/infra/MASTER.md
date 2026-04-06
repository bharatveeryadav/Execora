# Infrastructure Master

**Owner:** DevOps / Platform team  
**Last updated:** March 2026  
**Key source files:**
- `docker-compose.yml` · `docker-compose.prod.yml`
- `packages/api/Dockerfile` · `apps/worker/Dockerfile`
- `monitoring/prometheus.yml` · `monitoring/loki-config.yml`
- `monitoring/promtail-config.yml`

---

## Stack Overview

| Component | Technology | Port |
|-----------|-----------|------|
| API | Fastify (Node.js) | 3006 |
| Worker | BullMQ + Redis | — |
| Database | PostgreSQL (Prisma) | 5432 |
| Queue | Redis | 6379 |
| Storage | MinIO | 9000 / 9001 |
| Metrics | Prometheus | 9090 |
| Logs | Loki + Promtail | 3100 |
| Dashboards | Grafana | 3000 |
| Network | Tailscale (prod) | — |

---

## Quick Start by Role

### Developer (daily)
→ [ops/QUICK_CHEAT_SHEET.md](ops/QUICK_CHEAT_SHEET.md) — copy-paste commands  
→ [ops/TROUBLESHOOTING.md](ops/TROUBLESHOOTING.md) — fix issues fast  
→ [ops/COMMANDS_REFERENCE.md](ops/COMMANDS_REFERENCE.md) — full command reference  

### DevOps / On-call
→ [ops/ENVIRONMENT_MANAGEMENT.md](ops/ENVIRONMENT_MANAGEMENT.md) — prod/staging/dev setup  
→ [production/PRODUCTION_READINESS_SOP.md](production/PRODUCTION_READINESS_SOP.md) — deployment runbook  
→ [production/LAUNCH_CHECKLIST.md](production/LAUNCH_CHECKLIST.md) — pre-launch gate  

---

## Deployment

### Docker Compose (production)
```bash
# Production stack
docker compose -f docker-compose.prod.yml up -d

# Build context is workspace root (not packages/api)
# Dockerfiles: packages/api/Dockerfile, apps/worker/Dockerfile
```

### Key Compose Files
| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local development |
| `docker-compose.prod.yml` | Production overlay |
| `docker-compose.monitoring.yml` | Prometheus + Loki + Grafana |
| `docker-compose.tailscale.yml` | Tailscale network |

### Environment Variables
See [ops/ENVIRONMENT_MANAGEMENT.md](ops/ENVIRONMENT_MANAGEMENT.md) for full `.env` reference.  
Key vars: `DATABASE_URL`, `REDIS_URL`, `MINIO_ENDPOINT`, `JWT_SECRET`, `ADMIN_API_KEY`

---

## Monitoring & Observability

Stack: **Prometheus → Grafana** (metrics) + **Loki + Promtail** (logs)

| Guide | Content |
|-------|---------|
| [monitoring/METRICS_SETUP.md](monitoring/METRICS_SETUP.md) | Prometheus scrape config, custom metrics |
| [monitoring/LOGGING_GUIDE.md](monitoring/LOGGING_GUIDE.md) | Structured JSON logging, log levels |
| [monitoring/OBSERVABILITY_ACCESS.md](monitoring/OBSERVABILITY_ACCESS.md) | URLs, credentials, dashboards |
| [monitoring/MONITORING_DASHBOARD_PLAN.md](monitoring/MONITORING_DASHBOARD_PLAN.md) | Grafana panel plan |

**Access points (local):**
- Grafana: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- Loki: `http://localhost:3100`

---

## CI/CD

→ [cicd/README.md](cicd/README.md) — pipeline overview  
→ [cicd/GITHUB_ACTIONS_SETUP.md](cicd/GITHUB_ACTIONS_SETUP.md) — GitHub Actions workflow config  

Pipeline: push → lint + typecheck → build Docker images → push to registry → deploy via Compose.

---

## Security

→ [security/README.md](security/README.md) — security overview  
→ [security/SECURITY_HARDENING_GUIDE.md](security/SECURITY_HARDENING_GUIDE.md) — hardening checklist  

Auth: Platform admin uses `x-admin-api-key` header. Business users use JWT (Bearer token).  
All secrets in env vars — never committed to repo.

---

## Production

| Doc | Purpose |
|-----|---------|
| [production/PRODUCTION_READINESS_SOP.md](production/PRODUCTION_READINESS_SOP.md) | Step-by-step deployment SOP |
| [production/LAUNCH_CHECKLIST.md](production/LAUNCH_CHECKLIST.md) | Pre-launch verification gate |
| [production/PRODUCTION_STRATEGY.md](production/PRODUCTION_STRATEGY.md) | Long-term production strategy |
| [production/PRODUCTION_DASHBOARD_GUIDE.md](production/PRODUCTION_DASHBOARD_GUIDE.md) | Ops dashboard walkthrough |
| [ops/TAILSCALE_PUBLIC_ACCESS.md](ops/TAILSCALE_PUBLIC_ACCESS.md) | Tailscale + public exposure setup |

---

## Key pnpm Commands

```bash
pnpm dev           # API in watch mode (port 3006)
pnpm worker        # Worker in watch mode
pnpm build         # Turbo build all packages
pnpm db:generate   # Prisma generate
pnpm db:push       # Prisma db push (apply schema)
```
