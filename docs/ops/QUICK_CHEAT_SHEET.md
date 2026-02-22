# ⚡ Quick Cheat Sheet

**Purpose:** Keep this open during development for quick copy-paste commands.

**Print this page or keep in browser tab!**

---

## 🚀 Common Workflows

### Start Fresh Development Session

```bash
# 1. Start services
docker compose up -d

# 2. Start API
npm run dev

# 3. Start worker (in another terminal)
npm run worker

# 4. Open Grafana
http://localhost:3001

# Now you're ready to develop!
```

### Test Your Changes

```bash
# 1. Run linting/types
npm run build

# 2. Run tests
npm test

# 3. Run regression suite
bash scripts/testing/regression-test.sh

# 4. If all pass, commit
git add .
git commit -m "feat: your feature"
git push
```

### Deploy to Production

```bash
# 1. Build
npm run build

# 2. Migrate database
npm run migrate:prod

# 3. Start app
npm start

# 4. Verify health
curl https://your-domain.com/health

# Done!
```

---

## 🐛 Quick Fixes

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Database Connection Refused
```bash
docker compose up -d postgres
npm run db:push
npm run seed
```

### Code Changes Not Hot-Reloading
```bash
# Stop dev server (Ctrl+C)
# Clear cache
rm -rf dist node_modules/.cache

# Restart
npm run dev
```

### Tests Failing
```bash
npm run build
npm install  # Fresh dependencies
npm test
```

### Redis Connection Refused
```bash
docker compose up -d redis
# Wait 5 seconds
npm run worker  # Should connect now
```

### Docker Container Crashing
```bash
docker compose logs -f api  # See error
# Fix the error
docker compose restart api
```

---

## 📦 Commands by Purpose

### Development
```bash
npm run dev              # Start with hot reload
npm run build            # Check TypeScript
npm test                 # Run tests
npm run worker           # Start background jobs
```

### Database
```bash
npm run db:push          # Sync schema to DB (dev)
npm run db:migrate       # Create migration file
npm run db:generate      # Regenerate types
npm run db:studio        # Open visual database tool
npm run seed             # Add test data
```

### Docker
```bash
docker compose up -d     # Start all services
docker compose logs -f   # View logs
docker compose ps        # Check status
docker compose down      # Stop services
docker compose down -v   # Stop and delete data
```

### Testing
```bash
npm test                              # Run all tests
npm test -- customer.test.ts          # Single file
bash scripts/testing/regression-test.sh  # Full suite
```

### Production
```bash
npm run build            # Compile code
npm run migrate:prod     # Update database
npm start                # Run production server
```

### Monitoring
```bash
curl http://localhost:3000/health    # Health check
curl http://localhost:3000/metrics   # Prometheus metrics
http://localhost:3001                # Grafana dashboard
```

---

## 🔍 Find Things

### Find Running Processes
```bash
ps aux | grep node           # Find node processes
ps aux | grep docker-compose # Find docker
lsof -i :3000               # Use port 3000
```

### Find Configuration
```bash
cat .env                              # View env vars
cat docker-compose.yml | grep postgres # Find postgres config
grep -r "DATABASE_URL" src/          # Search source code
```

### Find Database Data
```bash
docker compose exec postgres psql -U execora -d execora
  # Then:
  SELECT * FROM customers LIMIT 5;
  SELECT COUNT(*) FROM invoices;
  \dt (list tables)
  \quit (exit)
```

### Find Recent Changes
```bash
git log --oneline -10       # Last 10 commits
git diff                    # See your changes
git status                  # What changed
```

---

## 🆘 Emergency Commands

### Everything Works Except One Thing
```bash
# 1. Check logs
npm run dev              # See real-time errors
# OR
docker compose logs -f [service]

# 2. Check if service is running
docker compose ps

# 3. Restart that service
docker compose restart [service]
```

### App Completely Broken
```bash
# Full restart (keeps data)
docker compose down
docker compose up -d
npm run dev

# Full restart (clean slate - loses data!)
docker compose down -v
docker compose up -d
npm run seed
npm run dev
```

### Database Completely Broken (DEV ONLY)
```bash
# This DELETES all data - DEV ONLY!
npx prisma migrate reset
npm run seed
npm run dev
```

### Can't Remember What's Running
```bash
# See all processes
docker compose ps
ps aux | grep node

# See what ports are in use
lsof -i           # All ports
lsof -i :3000     # Specific port

# See Docker containers
docker ps -a      # All containers
docker images     # All images
```

---

## 📊 Health Checks

### Is Everything Running?
```bash
# Check services
docker compose ps
# All should show "Up"

# Check API
curl http://localhost:3000/health
# Should return {"status": "healthy"}

# Check Redis
redis-cli ping
# Should return: PONG

# Check database
docker compose exec postgres psql -U execora -d execora -c "SELECT 1;"
# Should return: 1
```

### Quick Verification
```bash
# Everything working?
bash << 'EOF'
echo "🔍 Checking Execora Health..."
echo ""

echo "✓ Docker services:"
docker compose ps | grep -c " Up " && echo "  All running"

echo "✓ API health:"
curl -s http://localhost:3000/health | grep -q "healthy" && echo "  Healthy"

echo "✓ Redis:"
redis-cli ping | grep -q "PONG" && echo "  Connected"

echo "✓ Database:"
docker compose exec postgres psql -U execora -d execora -c "SELECT 1;" 2>/dev/null | grep -q "1" && echo "  Connected"

echo ""
echo "✓ All systems operational!"
EOF
```

---

## 🧠 Remember These

### When to Use Each Command

| Task | Command | Why |
|------|---------|-----|
| Daily dev | `npm run dev` | Hot reload, see errors |
| Before test | `npm run build` | Find type errors |
| Run tests | `npm test` | Find bugs |
| First setup | `npm run db:push` | Quick for dev |
| Team work | `npm run db:migrate` | Trackable migrations |
| Debug | `docker compose logs -f` | See what's happening |
| Deploy | `npm run migrate:prod` | Safe schema updates |
| Monitor | `http://localhost:3001` | See metrics |

### Common Error Fixes

| Error | Fix | Command |
|-------|-----|---------|
| Port in use | Kill process | `lsof -ti:3000 \| xargs kill -9` |
| Can't connect DB | Start postgres | `docker compose up -d postgres` |
| Tests fail | Rebuild | `npm run build && npm test` |
| WebSocket error | Check worker | `npm run worker` |
| Memory issue | Increase limit | `NODE_OPTIONS=--max-old-space-size=2048 npm start` |
| Docker won't start | Clean up | `docker compose down -v && docker compose up -d` |

---

## 🎯 By Situation

### "Everything looks broken"
```bash
docker compose down
docker compose up -d
npm run dev
# Check: http://localhost:3000/health
```

### "I made changes but nothing changed"
```bash
# Kill dev server (Ctrl+C)
npm run build
npm run dev
```

### "Tests are failing"
```bash
npm run build
npm install
npm test
```

### "Can't connect to database"
```bash
docker compose ps postgres
# If not running:
docker compose up -d postgres
npm run db:push
```

### "WebSocket not working"
```bash
docker compose ps worker
# If not running:
npm run worker
# Or check logs:
docker compose logs worker
```

### "Something wrong in production"
```bash
# SSH to server
# Check health:
curl http://localhost:3000/health

# View logs:
pm2 logs execora

# Restart:
pm2 restart execora

# Or restart everything:
docker compose restart
```

---

## 📋 Copy-Paste Commands

### Setup New Developer Machine
```bash
git clone https://github.com/org/execora.git
cd execora
npm install
cp .env.example .env
docker compose up -d
npm run db:push
npm run seed
npm run dev
```

### Run Full Test Suite Before Committing
```bash
npm run build && npm test && bash scripts/testing/regression-test.sh
```

### Deploy to Production
```bash
npm run build
npm run migrate:prod
pm2 restart execora
curl https://example.com/health
```

### Check System Health
```bash
echo "Services:" && docker compose ps
echo "Health:" && curl -s http://localhost:3000/health | jq .
echo "Metrics:" && curl -s http://localhost:3000/metrics | head -5
```

---

## 🚨 DON'T DO THIS

❌ **Don't commit build artifacts**
```bash
git add dist/  # ❌ NO!
# Instead:
echo "dist/" >> .gitignore
git add .gitignore
```

❌ **Don't commit .env with real secrets**
```bash
git add .env  # ❌ NO!
# Use:
cp .env .env.example
git add .env.example
```

❌ **Don't run db:reset in production**
```bash
npx prisma migrate reset  # ❌ WILL DELETE ALL DATA!
```

❌ **Don't use sudo for Docker** (usually)
```bash
sudo docker compose up  # ❌ Usually not needed
# Instead run:
docker compose up      # ✅ After fixing permissions
# Or:
sudo usermod -aG docker $USER
```

---

## ✅ DO THIS

✅ **Always build before testing**
```bash
npm run build && npm test
```

✅ **Always pull before pushing**
```bash
git pull
git push
```

✅ **Always migrate before production deploy**
```bash
npm run migrate:prod
npm start
```

✅ **Always check health after deploy**
```bash
curl https://example.com/health
```

✅ **Keep logs running during debugging**
```bash
# Terminal 1:
npm run dev

# Terminal 2:
docker compose logs -f

# Terminal 3:
npm run worker
```

---

**Printed and hanging on your wall? Good! Bookmark this page!**

For more details, see:
- [COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md) - Full command guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Detailed troubleshooting

