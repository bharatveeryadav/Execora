# CI/CD Quick Start Guide

Get your production GitHub Actions pipeline running in 15 minutes.

---

## ✅ What You Get

- Automated testing on every PR
- Auto-deployment to production (main branch)
- Auto-deployment to staging (develop branch)
- Daily database backups
- Weekly performance tests
- Slack/Telegram notifications

---

## 🚀 15-Minute Setup

### 1. Configure GitHub Secrets (5 min)

Go to: **Settings → Secrets and variables → Actions → New repository secret**

**Minimum required:**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/execora_production
VPS_HOST=your-server-ip
VPS_USERNAME=deploy
VPS_SSH_KEY=<paste-private-key>
OPENAI_API_KEY=sk-your-production-key
PRODUCTION_URL=https://api.execora.com
```

**Optional (notifications):**
```bash
TELEGRAM_BOT_TOKEN=<bot-token>
TELEGRAM_CHAT_ID=<chat-id>
```

### 2. Configure Repository Variable (1 min)

Go to: **Settings → Secrets and variables → Actions → Variables**

```bash
DEPLOY_TARGET=vps
```

Options: `vps`, `railway`, `digitalocean`, or `docker`

### 3. Setup Branch Protection (2 min)

Go to: **Settings → Branches → Add rule**

For `main`:
- Branch name pattern: `main`
- ☑ Require pull request before merging
- ☑ Require status checks to pass

### 4. Setup GitHub Environments (2 min)

Go to: **Settings → Environments**

Create two environments:
- `production` (deployment branch: main only)
- `staging` (deployment branch: develop only)

### 5. Prepare Server (5 min)

SSH into your VPS:

```bash
# Create deploy user
sudo adduser deploy
sudo usermod -aG sudo deploy

# Setup SSH key
sudo -u deploy mkdir -p /home/deploy/.ssh
echo "YOUR_PUBLIC_KEY" | sudo -u deploy tee -a /home/deploy/.ssh/authorized_keys

# Create app directory
sudo mkdir -p /var/www/execora
sudo chown deploy:deploy /var/www/execora

# Clone repo
sudo -u deploy git clone YOUR_REPO_URL /var/www/execora
cd /var/www/execora

# Setup
npm ci --production
npm run build
npm install -g pm2
pm2 startup
# Run the command it outputs
```

### 6. Test It (1 min)

```bash
# Make a change
git checkout -b test/cicd
echo "# Test" >> README.md
git commit -am "test: CI/CD pipeline"
git push origin test/cicd
```

Create PR on GitHub → Watch CI run in Actions tab!

---

## 📊 Deployment Flow

```
feature/new-feature → PR to develop
   ↓
develop branch (auto-deploy to staging)
   ↓
PR to main (manual review)
   ↓
main branch (auto-deploy to production)
```

---

## 🎯 Daily Usage

### Deploy to Staging
```bash
git checkout develop
git pull origin develop
git merge feature/my-feature
git push origin develop
```
→ Auto-deploys to staging

### Deploy to Production
```bash
git checkout main
git merge develop
git push origin main
```
→ Auto-deploys to production

### Manual Deployment
Go to **Actions → Deploy to Production → Run workflow**

---

## 🔧 Workflows Included

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** | Every PR | Tests, lint, build check |
| **Deploy** | Push to main | Production deployment |
| **Staging** | Push to develop | Staging deployment |
| **Backup** | Daily 2 AM | Database backup |
| **Load Test** | Weekly Sunday | Performance check |

---

## 📞 Get Notifications

### Telegram Bot Setup
1. Talk to @BotFather: `/newbot`
2. Get token
3. Add bot to channel
4. Get chat ID: https://api.telegram.org/bot<TOKEN>/getUpdates
5. Add to GitHub secrets

### Slack Webhook Setup
1. Create Slack app
2. Enable Incoming Webhooks
3. Add to workspace
4. Copy webhook URL
5. Add to GitHub secrets: `SLACK_WEBHOOK`

---

## 🆘 Troubleshooting

**CI fails?**
→ Check Actions tab → View logs

**Deployment fails?**
→ SSH into server: `ssh deploy@your-server`
→ Check PM2: `pm2 logs`

**Secrets not working?**
→ Settings → Secrets → Verify spelling

**Health check fails?**
→ Verify `PRODUCTION_URL` in secrets
→ Check `/health` endpoint works

---

## 📚 Full Documentation

See `GITHUB_ACTIONS_SETUP.md` for complete guide with:
- All deployment options (Railway, DigitalOcean, Docker)
- Environment configuration details
- Emergency procedures
- Best practices

---

**Created:** February 22, 2026
**Time to setup:** ~15 minutes
**Status:** Production-ready
