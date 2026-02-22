# ⚙️ Operations & Monitoring

This directory contains operations guides, environment management, infrastructure documentation, and command references.

## 📚 Quick Start by Role

### 👨‍💻 Developer (Daily Use)
- Start here: [QUICK_CHEAT_SHEET.md](QUICK_CHEAT_SHEET.md) - Copy-paste commands
- Reference: [COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md) - Full command guide
- Problem? Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Fix issues fast

### 👨‍💼 DevOps / Operations
- [ENVIRONMENT_MANAGEMENT.md](ENVIRONMENT_MANAGEMENT.md) - Setup prod/staging/dev
- [PRODUCTION_QUICK_REFERENCE.md](PRODUCTION_QUICK_REFERENCE.md) - Operations checklists
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Production debugging

### 🆘 Emergency / On-Call
- [QUICK_CHEAT_SHEET.md](QUICK_CHEAT_SHEET.md) - Emergency procedures
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues & fixes
- [COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md) - Health checks

---

## 📖 Documentation

### Commands & Troubleshooting (NEW!)

**[QUICK_CHEAT_SHEET.md](QUICK_CHEAT_SHEET.md)** - Print & Post on Wall ⭐
- Common workflows (5 lines each)
- Emergency procedures
- Copy-paste command reference
- Quick fixes for common issues
- **Use this during development!**

**[COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md)** - Complete Command Guide
- Every command used in project
- What it does & why to use it
- When NOT to use it
- Examples and output
- Common issues & solutions
- Organized by category:
  - Development Commands
  - Database Commands
  - Docker & Infrastructure
  - Testing Commands
  - Deployment Commands
  - Monitoring & Logging
  - Git Commands

**[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Fix Issues Fast
- Database issues (locks, migrations, conflicts)
- API & Server issues (crashes, errors, slow)
- WebSocket issues (connections, messages)
- Background job issues (stuck, failed)
- Email & communication issues
- Authentication issues
- Performance issues (memory, CPU)
- Docker issues (won't start)
- Deployment issues (crashes, migrations)
- Quick diagnostic checklist
- Emergency procedures

### Infrastructure & Environment Management

**[ENVIRONMENT_MANAGEMENT.md](ENVIRONMENT_MANAGEMENT.md)**
- Multi-environment setup (dev, staging, production)
- Environment variable configuration
- Database provisioning
- PM2 process management
- Dual-environment deployment strategies

**[PRODUCTION_QUICK_REFERENCE.md](PRODUCTION_QUICK_REFERENCE.md)**
- Quick lookup reference for operational tasks
- Component health scores
- Common troubleshooting
- Performance tuning
- Monitoring endpoints

---

## Key Topics by Category

### Commands & Reference
- [QUICK_CHEAT_SHEET.md](QUICK_CHEAT_SHEET.md) - Quick commands (print this!)
- [COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md) - All commands explained
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Fix issues

### Environment Setup
- [ENVIRONMENT_MANAGEMENT.md](ENVIRONMENT_MANAGEMENT.md) - Dev/staging/prod setup
- Docker Compose configuration
- Database migrations
- Service orchestration

### Operations
- Health checks
- Monitoring endpoints
- Performance tuning
- Backup procedures
- Scaling considerations

### Monitoring & Observability
- Prometheus metrics collection
- Grafana dashboards
- Structured logging (Pino)
- Health check endpoints
- Performance monitoring

---

## Most Used Commands (Copy-Paste Ready)

```bash
# 🚀 Start development
npm run dev                               # API with hot reload

# 🧪 Test
npm test                                  # Run tests
bash scripts/testing/regression-test.sh  # Full test suite

# 🐳 Docker
docker compose up -d                      # Start all services
docker compose logs -f                    # View logs
docker compose ps                         # Check status
docker compose down                       # Stop services

# 📦 Database
npm run db:push                           # Sync schema (dev)
npm run db:migrate                        # Create migration
npm run seed                              # Add test data

# 📊 Monitor
curl http://localhost:3000/health        # Health check
http://localhost:3001                     # Grafana dashboard
```

---

## Workflows

### 🧑‍💻 Daily Development
1. `git pull` - Get latest
2. `docker compose up -d` - Start services
3. `npm run dev` - Start API
4. `npm run worker` - Start background jobs
5. Make changes...
6. `npm test` - Test changes
7. `git push` - Push code

### 🧪 Before Deploying
1. `npm run build` - Check TypeScript
2. `npm test` - Run tests
3. `bash scripts/testing/regression-test.sh` - Full test suite
4. `git push` - Push to repository
5. CI/CD runs automatically
6. Manual approval for production

### 🚀 Production Deployment
1. Code merged to main branch
2. CI/CD pipeline runs tests and builds
3. Deploy to staging (automated)
4. Test on staging (manual)
5. Deploy to production (manual)
6. `npm run migrate:prod` - Update database
7. `npm start` - Start service
8. `curl https://api.example.com/health` - Verify

---

## Quick Reference Tables

### Commands by Purpose

| Purpose | Command | Why |
|---------|---------|-----|
| **Development** | `npm run dev` | Hot reload for fast iteration |
| **Testing** | `npm test` | Find bugs before deploy |
| **Deploy Prep** | `npm run build` | Verify TypeScript compiles |
| **Database** | `npm run db:push` | Sync schema to database |
| **Health Check** | `curl http://localhost:3000/health` | Verify app is running |
| **View Metrics** | `curl http://localhost:3000/metrics` | See performance data |
| **Dashboard** | `http://localhost:3001` | Grafana monitoring UI |
| **Logs** | `docker compose logs -f api` | Debug issues |

### Port Reference

| Service | Port | Access |
|---------|------|--------|
| API | 3000 | http://localhost:3000 |
| Grafana | 3001 | http://localhost:3001 |
| pgAdmin | 5050 | http://localhost:5050 |
| PostgreSQL | 5432 | PostgreSQL client |
| Redis | 6379 | redis-cli |
| MinIO | 9000 | S3 API |
| MinIO UI | 9001 | http://localhost:9001 |

---

## When to Use Each Documentation

| Situation | Use This | Links |
|-----------|----------|-------|
| **Need a quick command** | [QUICK_CHEAT_SHEET.md](QUICK_CHEAT_SHEET.md) | Print it! |
| **Want full details** | [COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md) | All commands explained |
| **Something broken** | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Fix it fast |
| **Setting up new env** | [ENVIRONMENT_MANAGEMENT.md](ENVIRONMENT_MANAGEMENT.md) | Prod setup |
| **Production checklist** | [PRODUCTION_QUICK_REFERENCE.md](PRODUCTION_QUICK_REFERENCE.md) | Pre-launch |

---

## Navigation

- **For New Developers:** [QUICK_CHEAT_SHEET.md](QUICK_CHEAT_SHEET.md)
- **For Architects:** [../audit/PRODUCTION_READINESS_AUDIT.md](../audit/PRODUCTION_READINESS_AUDIT.md)
- **For Security:** [../security/SECURITY_HARDENING_GUIDE.md](../security/SECURITY_HARDENING_GUIDE.md)
- **For Testing:** [../testing/TESTING_GUIDE.md](../testing/TESTING_GUIDE.md)
- **For CI/CD:** [../cicd/CICD_QUICK_START.md](../cicd/CICD_QUICK_START.md)

---

**Print [QUICK_CHEAT_SHEET.md](QUICK_CHEAT_SHEET.md) and keep on your desk!**

Generated: February 2026
