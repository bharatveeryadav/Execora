# Environment Management Quick Reference

## 🎯 Overview

Your Linux machine now supports TWO separate environments:
- **Production** (Port 3000) - Real users, production data
- **Development** (Port 3001) - Testing, development work

---

## 📋 Environment Separation

| Component | Production | Development |
|-----------|-----------|-------------|
| **Port** | 3000 | 3001 |
| **Database** | execora_production | execora_development |
| **Redis DB** | 0 | 1 |
| **Logs** | /var/log/execora/ | ./logs/ |
| **MinIO Bucket** | execora-production | execora-development |
| **PM2 Apps** | execora-prod-* | execora-dev-* |
| **API Keys** | Production keys | Test keys |
| **Log Level** | info | debug |

---

## 🚀 Quick Start

### Setup (One-time)
```bash
# Run the setup script
chmod +x setup-environments.sh
./setup-environments.sh

# Configure API keys
nano .env.production
nano .env.development
```

### Start Production Only
```bash
pm2 start ecosystem.config.js --only execora-prod-api,execora-prod-worker
pm2 save
```

### Start Development Only
```bash
pm2 start ecosystem.config.js --only execora-dev-api,execora-dev-worker
```

### Start Both Environments
```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## 📊 Management Commands

### Status & Monitoring
```bash
# View all apps
pm2 status

# View logs (all)
pm2 logs

# View production logs only
pm2 logs execora-prod-api
pm2 logs execora-prod-worker

# View development logs only
pm2 logs execora-dev-api
pm2 logs execora-dev-worker

# Monitor in real-time
pm2 monit
```

### Control Apps
```bash
# Restart production
pm2 restart execora-prod-api
pm2 restart execora-prod-worker

# Restart development
pm2 restart execora-dev-api
pm2 restart execora-dev-worker

# Stop production (keep development)
pm2 stop execora-prod-api execora-prod-worker

# Stop development (keep production)
pm2 stop execora-dev-api execora-dev-worker

# Stop everything
pm2 stop all

# Delete app (removes from PM2)
pm2 delete execora-dev-api
```

### Resource Management
```bash
# Check CPU/Memory usage
pm2 status

# Scale production API (add more instances)
pm2 scale execora-prod-api 4

# Reload (zero-downtime restart)
pm2 reload execora-prod-api
```

---

## 🗄️ Database Management

### Access Databases
```bash
# Production database
psql -U execora_prod -d execora_production

# Development database
psql -U execora_dev -d execora_development
```

### Backup & Restore
```bash
# Backup production
pg_dump -U execora_prod execora_production > backup-prod-$(date +%Y%m%d).sql

# Backup development
pg_dump -U execora_dev execora_development > backup-dev-$(date +%Y%m%d).sql

# Restore production
psql -U execora_prod execora_production < backup-prod-20260221.sql
```

### Run Migrations
```bash
# Production migrations
DATABASE_URL="postgresql://execora_prod:password@localhost:5432/execora_production" \
npx prisma migrate deploy

# Development migrations
DATABASE_URL="postgresql://execora_dev:password@localhost:5432/execora_development" \
npx prisma migrate deploy
```

---

## 🔴 Redis Management

### Access Redis
```bash
# Production (DB 0)
redis-cli
SELECT 0
KEYS *

# Development (DB 1)
redis-cli
SELECT 1
KEYS *
```

### Clear Cache
```bash
# Clear production cache
redis-cli -n 0 FLUSHDB

# Clear development cache
redis-cli -n 1 FLUSHDB
```

---

## 📝 Log Management

### View Logs
```bash
# Production logs
tail -f /var/log/execora/prod-api-out.log
tail -f /var/log/execora/prod-api-error.log

# Development logs
tail -f logs/dev-api-out.log
tail -f logs/dev-api-error.log
```

### Rotate Logs
```bash
# PM2 log rotation (already installed by setup script)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🔧 Deployment Workflow

### Deploy New Code
```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Run migrations (production)
DATABASE_URL="postgresql://execora_prod:password@localhost:5432/execora_production" \
npx prisma migrate deploy

# 5. Reload production (zero downtime)
pm2 reload execora-prod-api
pm2 reload execora-prod-worker

# 6. Check status
pm2 status
pm2 logs execora-prod-api --lines 50
```

---

## 🧪 Testing Workflow

### Test in Development
```bash
# 1. Make code changes
nano src/modules/customer/service.ts

# 2. Build
npm run build

# 3. Restart development (watch mode auto-restarts)
# Or manually: pm2 restart execora-dev-api

# 4. Test
curl http://localhost:3001/health

# 5. Check logs
pm2 logs execora-dev-api
```

---

## 🔍 Troubleshooting

### App Won't Start
```bash
# Check logs
pm2 logs execora-prod-api --err --lines 100

# Check environment variables
pm2 env 0  # Replace 0 with app ID from pm2 status

# Restart with verbose logging
pm2 delete execora-prod-api
NODE_ENV=production pm2 start dist/index.js --name execora-prod-api
```

### Database Connection Issues
```bash
# Test connection
psql -U execora_prod -d execora_production -c "SELECT 1"

# Check DATABASE_URL
cat .env.production | grep DATABASE_URL

# Verify PostgreSQL is running
sudo systemctl status postgresql
```

### Port Already in Use
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>

# Or use different port in .env.production
```

### High Memory Usage
```bash
# Check resource usage
pm2 status

# Restart app
pm2 restart execora-prod-api

# Scale down instances
pm2 scale execora-prod-api 1
```

---

## 🔒 Security Checklist

- [ ] Different JWT secrets for prod/dev (.env files)
- [ ] Strong database passwords (change defaults!)
- [ ] Firewall configured (ports 3000, 3001, 22)
- [ ] Production logs in /var/log/ (not accessible via web)
- [ ] .env files in .gitignore
- [ ] Regular backups scheduled
- [ ] fail2ban installed for SSH protection
- [ ] Production uses real SMTP (not development Gmail)

---

## 📊 Monitoring

### System Resources
```bash
# CPU, Memory, Disk
htop

# Disk usage
df -h

# Check PM2 metrics
pm2 status
pm2 monit
```

### Application Health
```bash
# Production health
curl http://localhost:3000/health

# Development health
curl http://localhost:3001/health

# Metrics (if enabled)
curl http://localhost:9090/metrics  # Production
curl http://localhost:9091/metrics  # Development
```

---

## 🎯 Common Tasks

### Switch Between Environments
```bash
# Stop development, start production
pm2 stop execora-dev-api execora-dev-worker
pm2 start execora-prod-api execora-prod-worker

# Or vice versa
pm2 stop execora-prod-api execora-prod-worker
pm2 start execora-dev-api execora-dev-worker
```

### Update Environment Variables
```bash
# 1. Edit file
nano .env.production

# 2. Restart app
pm2 restart execora-prod-api

# Or reload (zero downtime)
pm2 reload execora-prod-api
```

### Seed Test Data
```bash
# Development only!
DATABASE_URL="postgresql://execora_dev:password@localhost:5432/execora_development" \
npm run seed
```

---

## 📞 Quick Reference URLs

| Environment | API | Metrics | Database |
|-------------|-----|---------|----------|
| **Production** | http://localhost:3000 | http://localhost:9090/metrics | Port 5432 (execora_production) |
| **Development** | http://localhost:3001 | http://localhost:9091/metrics | Port 5432 (execora_development) |

---

## 🆘 Emergency Commands

### Production Down
```bash
pm2 logs execora-prod-api --err --lines 100
pm2 restart execora-prod-api
sudo systemctl status postgresql redis-server
```

### Rollback
```bash
git log --oneline -5
git checkout <previous-commit>
npm install && npm run build
pm2 reload all
```

### Complete Reset (Development Only!)
```bash
pm2 delete execora-dev-api execora-dev-worker
psql -U postgres -c "DROP DATABASE execora_development"
psql -U postgres -c "CREATE DATABASE execora_development"
DATABASE_URL="postgresql://execora_dev:password@localhost:5432/execora_development" \
npx prisma migrate deploy
```

---

**Created:** February 21, 2026  
**For:** Execora Production/Development Environments  
**OS:** Linux (Ubuntu/Debian)
