# GitHub Actions CI/CD Setup Guide

Complete production-level CI/CD pipeline for Execora using GitHub Actions.

---

## 📋 Overview

This setup provides:
- ✅ Automated testing on every PR
- ✅ Continuous deployment to production
- ✅ Staging environment deployments
- ✅ Daily database backups
- ✅ Weekly performance testing
- ✅ Security scanning
- ✅ Automated notifications

---

## 🚀 Workflows Created

### 1. **CI - Test & Lint** (`.github/workflows/ci.yml`)
**Triggers:** Pull requests, pushes to `develop`

**What it does:**
- Runs tests with PostgreSQL + Redis
- Checks TypeScript compilation
- Runs linter
- Security audit
- Uploads test coverage

### 2. **CD - Deploy to Production** (`.github/workflows/deploy.yml`)
**Triggers:** Pushes to `main`, version tags, manual dispatch

**What it does:**
- Builds application
- Runs database migrations
- Deploys to production (Railway/VPS/DigitalOcean/Docker)
- Health checks
- Smoke tests
- Notifications

### 3. **Staging Deployment** (`.github/workflows/staging.yml`)
**Triggers:** Pushes to `develop`, manual dispatch

**What it does:**
- Deploys to staging environment
- Runs integration tests
- Notifies team via Slack

### 4. **Database Backup** (`.github/workflows/backup.yml`)
**Triggers:** Daily at 2 AM UTC, manual dispatch

**What it does:**
- Creates PostgreSQL backup
- Uploads to S3/MinIO
- Keeps last 30 days
- Alerts on failure

### 5. **Performance Testing** (`.github/workflows/load-test.yml`)
**Triggers:** Weekly on Sundays, manual dispatch

**What it does:**
- Runs K6 load tests
- Analyzes performance metrics
- Reports results

---

## ⚙️ Setup Instructions

### Step 1: Configure GitHub Secrets

Go to **Settings → Secrets and variables → Actions**

#### Required Secrets:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/execora_production
STAGING_DATABASE_URL=postgresql://user:pass@host:5432/execora_staging

# Production Server (VPS option)
VPS_HOST=your-server-ip-or-domain
VPS_USERNAME=deploy-user
VPS_SSH_KEY=<private-ssh-key>
VPS_PORT=22

# Railway (if using Railway)
RAILWAY_TOKEN=<your-railway-token>

# DigitalOcean (if using DO)
DIGITALOCEAN_ACCESS_TOKEN=<your-do-token>

# Docker Registry (if using Docker)
DOCKER_REGISTRY=registry.example.com/execora
DOCKER_USERNAME=your-username
DOCKER_PASSWORD=your-password

# API Keys
OPENAI_API_KEY_TEST=sk-test-key
OPENAI_API_KEY=sk-production-key

# Notifications
TELEGRAM_BOT_TOKEN=<bot-token>
TELEGRAM_CHAT_ID=<chat-id>
SLACK_WEBHOOK=<slack-webhook-url>

# Monitoring
PRODUCTION_URL=https://api.execora.com
STAGING_URL=https://staging.execora.com

# Backup
BACKUP_ACCESS_KEY=<s3-access-key>
BACKUP_SECRET_KEY=<s3-secret-key>
BACKUP_BUCKET=execora-backups
BACKUP_ENDPOINT=https://s3.amazonaws.com

# Database Backup
DB_HOST=production-db-host
DB_USER=postgres
DB_PASSWORD=<db-password>
DB_NAME=execora_production

# Security
SNYK_TOKEN=<snyk-token>
```

#### Repository Variables:

```bash
# Configure in Settings → Secrets and variables → Actions → Variables
DEPLOY_TARGET=vps  # Options: vps, railway, digitalocean, docker
```

---

### Step 2: Setup Branch Protection

Go to **Settings → Branches → Add rule**

**For `main` branch:**
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - CI - Test & Lint
  - Build Application
- ✅ Require branches to be up to date
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings

**For `develop` branch:**
- ✅ Require status checks to pass before merging
  - CI - Test & Lint

---

### Step 3: Setup Environments

Go to **Settings → Environments**

#### Create `production` environment:
- **Required reviewers:** Add team members
- **Wait timer:** 5 minutes (optional safety delay)
- **Deployment branches:** Only `main`
- Add all production secrets

#### Create `staging` environment:
- **Deployment branches:** Only `develop`
- Add all staging secrets

---

### Step 4: Prepare Your Server (VPS Option)

If deploying to VPS, run this on your server:

```bash
# 1. Create deploy user
sudo adduser deploy
sudo usermod -aG sudo deploy

# 2. Setup SSH key
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy touch /home/deploy/.ssh/authorized_keys
# Add your GitHub Actions public key to authorized_keys

# 3. Setup application directory
sudo mkdir -p /var/www/execora
sudo chown deploy:deploy /var/www/execora

# 4. Clone repository
cd /var/www/execora
git clone <your-repo-url> .

# 5. Install dependencies
npm ci --production

# 6. Setup PM2
npm install -g pm2
pm2 startup
# Run the command it outputs

# 7. Configure environment
cp .env.example .env
nano .env  # Add your secrets

# 8. Initial deployment
npm run build
npx prisma migrate deploy
pm2 start ecosystem.config.js
pm2 save
```

---

### Step 5: Create PM2 Ecosystem Config

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'execora-api',
      script: './dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/execora/api-error.log',
      out_file: '/var/log/execora/api-out.log',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: '500M'
    },
    {
      name: 'execora-worker',
      script: './dist/worker/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/execora/worker-error.log',
      out_file: '/var/log/execora/worker-out.log',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '300M'
    }
  ]
};
```

---

## 🔄 Git Workflow

### Branch Strategy

```
main (production)
├── develop (staging)
    ├── feature/add-jwt-auth
    ├── feature/improve-caching
    └── fix/payment-bug
```

### Development Workflow

#### 1. Create Feature Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/new-feature
```

#### 2. Make Changes & Test Locally
```bash
# Make your changes
npm run build
npm test

# Commit
git add .
git commit -m "feat: add new feature"
```

#### 3. Push & Create PR
```bash
git push origin feature/new-feature
```

Then create PR to `develop` on GitHub. CI will automatically run.

#### 4. Merge to Develop (Auto-deploy to Staging)
After PR approval, merge to `develop`. This triggers:
- ✅ CI tests again
- ✅ Automatic deployment to staging
- ✅ Slack notification

#### 5. Promote to Production
When staging is verified:
```bash
git checkout main
git merge develop
git push origin main
```

This triggers:
- ✅ Production deployment
- ✅ Health checks
- ✅ Telegram notification

---

## 📊 Deployment Options

### Option 1: Railway (Easiest)

**Setup:**
1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Get token: `railway whoami --token`
4. Add token to GitHub secrets: `RAILWAY_TOKEN`
5. Set variable: `DEPLOY_TARGET=railway`

**Deployment:**
- Automatic on push to `main`
- Uses Railway's infrastructure
- Auto-scales, includes database

---

### Option 2: VPS (Full Control)

**Setup:**
1. Follow "Step 4: Prepare Your Server" above
2. Add SSH key to GitHub secrets
3. Set variable: `DEPLOY_TARGET=vps`

**Deployment:**
- SSH into server
- Git pull + NPM install + PM2 reload
- Manual control over everything

---

### Option 3: DigitalOcean App Platform

**Setup:**
1. Create DO App via dashboard (connect GitHub repo)
2. Get API token from DO dashboard
3. Add to GitHub secrets: `DIGITALOCEAN_ACCESS_TOKEN`
4. Set variable: `DEPLOY_TARGET=digitalocean`

**Deployment:**
- Automatic via DO API
- Managed infrastructure
- Auto-scaling available

---

### Option 4: Docker + Container Registry

**Setup:**
1. Setup Docker registry (Docker Hub, GitHub Container Registry, etc.)
2. Add credentials to GitHub secrets
3. Create Dockerfile (if not exists)
4. Set variable: `DEPLOY_TARGET=docker`

**Deployment:**
- Builds Docker image
- Pushes to registry
- Requires separate orchestration (Kubernetes, Docker Swarm, etc.)

---

## 🧪 Testing the Setup

### Test CI Pipeline
```bash
# Create test branch
git checkout -b test/ci-pipeline

# Make a small change
echo "# Test" >> README.md

# Push and create PR to develop
git commit -am "test: CI pipeline"
git push origin test/ci-pipeline
```

Watch the Actions tab - CI should run automatically.

### Test Deployment
```bash
# Test staging deployment
git checkout develop
echo "# Staging test" >> README.md
git commit -am "test: staging deployment"
git push origin develop
```

Check Actions tab - staging deployment should trigger.

### Manual Deployment Test
1. Go to **Actions** tab
2. Select "CD - Deploy to Production"
3. Click "Run workflow"
4. Select environment
5. Click "Run"

---

## 📈 Monitoring Deployments

### GitHub Actions Dashboard
- Go to **Actions** tab
- See all workflow runs
- Click on run to see detailed logs

### Deployment Status
- Check ✅/❌ status in Actions tab
- Receive notifications (Telegram/Slack)
- View deployment logs

### Health Monitoring
After deployment, workflow automatically checks:
- `/health` endpoint returns 200
- Critical API endpoints work
- Smoke tests pass

---

## 🔔 Notifications Setup

### Telegram Notifications

1. Create bot with @BotFather
2. Get bot token
3. Add bot to group/channel
4. Get chat ID: send message and check https://api.telegram.org/bot<TOKEN>/getUpdates
5. Add to secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

### Slack Notifications

1. Create Slack app
2. Enable Incoming Webhooks
3. Add webhook to workspace
4. Copy webhook URL
5. Add to secret: `SLACK_WEBHOOK`

---

## 🛠️ Troubleshooting

### Deployment Fails

**Check logs:**
```bash
# Go to Actions tab → Failed run → View logs
```

**Common issues:**
- Missing secrets → Add in Settings
- SSH key wrong → Regenerate and update
- Database migration fails → Check DATABASE_URL
- Health check fails → Check PRODUCTION_URL

### Tests Fail in CI

**Debug locally:**
```bash
# Run same services as CI
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15-alpine
docker run -d -p 6379:6379 redis:7-alpine

# Run tests
npm test
```

### Manual Rollback

**VPS:**
```bash
ssh deploy@your-server
cd /var/www/execora
git log --oneline -5
git checkout <previous-commit>
npm ci --production
npm run build
pm2 reload all
```

**Railway:**
```bash
railway rollback
```

---

## 📋 Checklist for First Deployment

Before running your first production deployment:

- [ ] All secrets configured in GitHub
- [ ] Branch protection rules set
- [ ] Production environment created
- [ ] Server prepared (if VPS)
- [ ] Database migrations tested
- [ ] .env.example updated with all variables
- [ ] Health check endpoint works
- [ ] Monitoring configured
- [ ] Backup workflow tested
- [ ] Rollback plan documented
- [ ] Team notified of deployment process
- [ ] DNS/domain configured
- [ ] SSL certificates setup
- [ ] Firewall rules configured
- [ ] Postgres backups working
- [ ] Redis persistence enabled

---

## 🎯 Best Practices

1. **Never commit secrets** - Use GitHub Secrets
2. **Test in staging first** - Always deploy to staging before production
3. **Small, frequent deployments** - Deploy often, deploy small changes
4. **Monitor after deployment** - Watch logs for 10 minutes post-deploy
5. **Keep develop stable** - Only merge tested features
6. **Tag releases** - Use semantic versioning (v1.0.0, v1.1.0, etc.)
7. **Document changes** - Update CHANGELOG.md
8. **Have rollback plan** - Know how to revert quickly
9. **Backup before deploy** - Run manual backup before major changes
10. **Communicate** - Let team know about deployments

---

## 🆘 Emergency Procedures

### Roll Back Production
```bash
# Method 1: Revert commit
git revert <bad-commit-sha>
git push origin main  # Triggers new deployment

# Method 2: Reset to previous commit
git checkout main
git reset --hard <good-commit-sha>
git push --force origin main  # ⚠️ Use with caution
```

### Stop Deployments
```bash
# Cancel running workflow
# Go to Actions → Click running workflow → Cancel workflow
```

### Manual Deployment
```bash
# SSH into server
ssh deploy@your-server

# Manual fix
cd /var/www/execora
git pull
npm ci --production
npm run build
pm2 reload all
```

---

**Created:** February 22, 2026  
**Status:** Production-Ready  
**Maintenance:** Review quarterly, update dependencies monthly
