# 📖 Complete Commands Reference Guide

**Purpose:** Quick lookup for all commands used during development, testing, deployment, and production operations.

**Last Updated:** February 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Development Commands](#development-commands)
2. [Database Commands](#database-commands)
3. [Docker & Infrastructure Commands](#docker--infrastructure-commands)
4. [Testing Commands](#testing-commands)
5. [Deployment Commands](#deployment-commands)
6. [Monitoring & Logging Commands](#monitoring--logging-commands)
7. [Git & Version Control](#git--version-control)
8. [Troubleshooting Quick Reference](#troubleshooting-quick-reference)

---

## Development Commands

### Start Development Server

```bash
npm run dev
```

**What it does:**
- Starts Fastify server with hot reload
- Watches TypeScript files for changes
- Auto-compiles and restarts on save
- Perfect for active development

**When to use:**
- Working on features
- Testing API locally
- Debugging code
- Making quick fixes

**Why:**
- Fast iteration without manual restarts
- Immediate feedback on changes
- Better productivity in development

**Example workflow:**
```bash
# Terminal 1: Start dev server
npm run dev
# Output: 🎙️ Execora API listening on http://localhost:3000

# Terminal 2: Make code changes
# Dev server auto-reloads automatically
```

**Common issues & fixes:**
- ❌ Port 3000 already in use: Kill process with `lsof -ti:3000 | xargs kill -9`
- ❌ Module not found: Run `npm install` first
- ❌ Not reloading: Check if file changes are actually saved

---

### Build TypeScript

```bash
npm run build
```

**What it does:**
- Compiles TypeScript to JavaScript
- Outputs to `dist/` directory
- Performs type checking
- Optimizes for production

**When to use:**
- Before running tests
- Before deploying
- Verifying no type errors
- Creating production bundle

**Why:**
- Ensures code is production-ready
- Catches type errors early
- Required before `npm start`
- Validates entire codebase

**Example workflow:**
```bash
# Build once
npm run build

# Output should show no errors
# dist/ folder will contain compiled JavaScript
```

**Common issues & fixes:**
- ❌ TypeScript errors: Run `npm run build` and fix all errors
- ❌ Out of memory: Increase Node memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run build`

---

### Start Production Server

```bash
npm start
```

**What it does:**
- Runs compiled JavaScript from `dist/`
- Does NOT hot reload
- Optimized for production
- Requires `npm run build` first

**When to use:**
- After building for production
- Simulating production environment locally
- Running on production servers
- Performance testing

**Why:**
- Runs pre-compiled code (faster)
- No TypeScript overhead
- More efficient than dev mode
- Production-grade performance

**Example workflow:**
```bash
# Build
npm run build

# Start
npm start

# Output: 🎙️ Execora API listening on http://localhost:3000
```

**Common issues & fixes:**
- ❌ Not starting: Check dist/ folder exists (run `npm run build`)
- ❌ .env not loaded: Verify `.env` file exists at project root

---

### Start Worker Process

```bash
npm run worker
```

**What it does:**
- Starts BullMQ job queue processor
- Handles background jobs in development
- Watches for job changes
- Hot reloads like `npm run dev`

**When to use:**
- Testing job queue functionality
- Debugging background jobs
- During development with async tasks
- Testing reminders, email, etc.

**Why:**
- Processes background job queue
- Handles scheduled reminders
- Manages email sending
- Doesn't block main API server

**Example workflow:**
```bash
# Terminal 1: Start API
npm run dev

# Terminal 2: Start worker
npm run worker

# Now both API and background jobs work
```

**Common issues & fixes:**
- ❌ Redis connection refused: Start Redis first with `docker compose up redis`
- ❌ Bull queue errors: Check Redis is running on port 6379

---

## Database Commands

### Push Schema to Database

```bash
npm run db:push
```

**What it does:**
- Syncs Prisma schema to database
- Creates tables/columns if missing
- Updates existing tables
- No migration file created

**When to use:**
- Initial setup
- Early development before migrations
- Quick schema changes in dev environment
- Setting up test databases

**Why:**
- Fast for development
- Perfect for rapid iteration
- No migration files to track
- Ideal for throwing away databases

**Example workflow:**
```bash
# After creating fresh database
npm run db:push

# Tables are created instantly
```

**Common issues & fixes:**
- ❌ Database doesn't exist: Create it first: `createdb execora`
- ❌ Connection refused: Check DATABASE_URL in .env
- ❌ Permission denied: Check database user permissions

---

### Create Database Migration

```bash
npm run db:migrate
```

**What it does:**
- Creates migration file from schema changes
- Generates migration SQL
- Allows manual editing of migration
- Creates `prisma/migrations/` folder

**When to use:**
- Schema changes in development
- Testing migrations locally
- Creating deployable migrations
- Collaborating on database changes

**Why:**
- Creates trackable migration files
- Safe for production
- Can be reviewed before running
- Enables team collaboration
- Allows rollback if needed

**Example workflow:**
```bash
# Make schema changes in prisma/schema.prisma
# Then create migration
npm run db:migrate

# Prompts you for migration name
# Create migration (yes)
# Migration file created in prisma/migrations/
```

**Common issues & fixes:**
- ❌ Migration failed: Check error message, manually review migration file
- ❌ Schema conflicts: Only one person should run migrations
- ❌ Trying to rollback: Delete migration file and reset state (dev only)

---

### Generate Prisma Client

```bash
npm run db:generate
```

**What it does:**
- Regenerates Prisma Client from schema
- Creates TypeScript types
- Updates auto-generated files
- Required after schema changes

**When to use:**
- After changing `prisma/schema.prisma`
- If Prisma types are outdated
- After `npm install` sometimes
- When schemas become out of sync

**Why:**
- Keeps TypeScript types in sync
- Enables Prisma queries
- Required for new/changed models
- Auto-generates queries

**Example workflow:**
```bash
# Change schema.prisma
npm run db:generate

# Now Prisma Client is updated
```

**Common issues & fixes:**
- ❌ Types not updating: Run `npm run db:generate` again
- ❌ Decorator issues: Make sure decorators are enabled in tsconfig.json

---

### Open Prisma Studio (Visual Editor)

```bash
npm run db:studio
```

**What it does:**
- Opens web-based database GUI
- Browse and edit data directly
- View schema visually
- Query database graphically

**When to use:**
- Inspecting database contents
- Manual data fixes
- Understanding schema
- Quick data entry for testing

**Why:**
- Visual database browser
- No SQL needed
- Easy bulk operations
- Great for debugging

**Example workflow:**
```bash
# Open Studio
npm run db:studio

# Browser opens to http://localhost:5555
# Browse tables, view/edit data
```

**Common issues & fixes:**
- ❌ Port 5555 in use: Change port in command: `prisma studio --browser none`
- ❌ Connection failed: Database must be running

---

### Seed Database with Test Data

```bash
npm run seed
```

**What it does:**
- Runs `prisma/seed.ts`
- Populates database with test data
- Creates sample customers, products, etc.
- Resets data if called multiple times

**When to use:**
- Initial database setup
- Resetting test data
- Preparing for demo/presentation
- Testing with consistent data

**Why:**
- Ensures consistent test data
- Speeds up testing
- Reproduces same scenarios
- Useful for onboarding

**Example workflow:**
```bash
# After creating database
npm run db:push
npm run seed

# Database now has sample data
```

**Common issues & fixes:**
- ❌ Duplicate key errors: Delete data first or use upsert in seed
- ❌ Schema mismatch: Run `npm run db:push` first

---

## Docker & Infrastructure Commands

### Start All Services (Dev Environment)

```bash
docker compose up -d
```

**What it does:**
- Starts all services: PostgreSQL, Redis, MinIO, Grafana
- Runs in background (`-d` flag)
- Creates volumes for persistent data
- Connects services in network

**When to use:**
- Local development setup
- Testing with full stack
- Simulating production locally
- Team collaboration

**Why:**
- All services in one command
- Consistent across team
- Easy cleanup
- Reproduces production environment

**Example workflow:**
```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# Check logs
docker compose logs -f postgres

# Stop all
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

**Common issues & fixes:**
- ❌ Port already in use: Change ports in docker-compose.yml or kill existing service
- ❌ Permission denied: Might need `sudo` or add user to docker group
- ❌ Out of disk space: Clean up: `docker system prune -a`

---

### View Service Logs

```bash
docker compose logs [service-name]
```

**What it does:**
- Shows container logs in real-time
- Add `-f` to follow/tail logs
- Filter by service
- Useful for debugging

**When to use:**
- Debugging service issues
- Checking startup errors
- Monitoring service health
- Finding problems

**Why:**
- See what's happening in containers
- Easier than SSH into containers
- Real-time monitoring
- Helps troubleshoot

**Example:**
```bash
# View postgres logs
docker compose logs -f postgres

# View last 100 lines
docker compose logs --tail=100 postgres

# View specific service
docker compose logs redis

# View all services
docker compose logs -f
```

**Common issues & fixes:**
- ❌ Can't see logs: Check service is running: `docker compose ps`

---

### Rebuild Docker Images

```bash
docker compose build
```

**What it does:**
- Rebuilds Docker images from Dockerfile
- Pulls latest base images
- Applies latest changes
- Prepares images for containers

**When to use:**
- After changing Dockerfile
- After updating dependencies
- Before deploying
- Ensuring fresh environment

**Why:**
- Captures latest changes
- Updates base images
- Required after Dockerfile edits
- Ensures consistency

**Example workflow:**
```bash
# Rebuild and restart
docker compose build
docker compose up -d
```

**Common issues & fixes:**
- ❌ Build fails: Check Dockerfile syntax
- ❌ Slow build: Check internet connection

---

### Execute Command in Container

```bash
docker compose exec [service] [command]
```

**What it does:**
- Runs command inside running container
- Can be shell, npm commands, etc.
- Useful for one-off tasks
- No need to SSH

**When to use:**
- Running commands in containers
- Checking container state
- Debugging issues
- Running database commands

**Example:**
```bash
# Run npm command in api container
docker compose exec api npm run build

# Connect to postgres with psql
docker compose exec postgres psql -U execora -d execora

# View files in container
docker compose exec api ls -la src/

# Run tests in container
docker compose exec api npm test
```

**Common issues & fixes:**
- ❌ Service not running: Start with: `docker compose up -d [service]`

---

### Stop and Remove Services

```bash
docker compose down
```

**What it does:**
- Stops all containers
- Removes containers (not images)
- Keeps volumes by default

**Options:**
- `docker compose down -v` - Also remove volumes (clean slate)
- `docker compose down --rmi all` - Also remove images

**When to use:**
- Finished development session
- Need clean environment
- Troubleshooting persistent issues
- Moving to different branch

**Why:**
- Clean shutdown
- Frees resources
- Prevents lingering services
- Clean state for next session

**Example workflow:**
```bash
# Stop and remove (keep data)
docker compose down

# Stop and remove everything (clean slate)
docker compose down -v

# Later: restart fresh
docker compose up -d
```

---

## Testing Commands

### Run All Tests

```bash
npm test
```

**What it does:**
- Builds TypeScript code
- Sets NODE_TEST environment variable
- Runs all test files matching `**/*.test.js`
- Shows test results and summary

**When to use:**
- Before committing
- Before deploying
- Continuous integration
- Verifying nothing broke

**Why:**
- Catches bugs early
- Ensures code quality
- Prevents regressions
- Required for CI/CD

**Example workflow:**
```bash
# Run all tests
npm test

# Output shows:
# ✓ test: customer service
# ✓ test: invoice creation
# etc.
```

**Common issues & fixes:**
- ❌ Tests fail: Check error messages, fix code
- ❌ Module not found: Check imports are correct
- ❌ Timeout errors: Increase timeout or fix async issues

---

### Run Regression Tests

```bash
bash scripts/testing/regression-test.sh
```

**What it does:**
- Runs comprehensive test suite
- Tests 9 different feature areas
- 21+ test cases
- Checks API, WebSocket, etc.
- Monitors via Grafana dashboard

**When to use:**
- Before production deployment
- Weekly automated testing
- Quality assurance
- Finding regressions
- Production verification

**Why:**
- Comprehensive testing
- Catches breaking changes
- Multiple feature areas tested
- Production-like scenarios

**Example workflow:**
```bash
# Start services first
docker compose up -d

# Run regression tests
bash scripts/testing/regression-test.sh

# Displays results:
# ✓ Customer Creation
# ✓ Invoice Generation
# etc.
```

**Common issues & fixes:**
- ❌ Tests fail: Check services are running
- ❌ Port issues: Ensure 3000 is available

---

### Run Single Test File

```bash
npm test -- [path/to/test.test.ts]
```

**What it does:**
- Builds and runs single test file only
- Faster than running all tests
- Useful for focused testing
- Isolates specific functionality

**When to use:**
- Debugging specific test
- Testing one feature
- Quick verification
- Development iteration

**Example:**
```bash
# Test customer service only
npm test -- src/__tests__/customer.service.test.ts

# Test invoice module
npm test -- src/__tests__/invoice.test.ts
```

---

### Test with Coverage

```bash
NODE_TEST_COVERAGE=1 npm test
```

**What it does:**
- Runs tests with code coverage metrics
- Shows what code is tested
- Identifies untested areas
- Useful for quality assurance

**When to use:**
- Quality assurance
- Before releases
- Finding gaps in testing
- Improving test coverage

**Example:**
```bash
NODE_TEST_COVERAGE=1 npm test

# Output shows:
# Coverage: 85% (lines), 80% (functions)
```

---

### Run Manual Test Scripts

```bash
node scripts/manual-tests/[script-name].js
```

**What it does:**
- Runs standalone test scripts
- Can test specific scenarios
- Often requires running services
- Creates test data

**When to use:**
- Testing specific flows
- Manual verification
- Creating test scenarios
- Development/QA

**Example:**
```bash
# Test admin detection flow
node scripts/manual-tests/test-admin-detection-fix.js

# Test email OTP
node scripts/manual-tests/test-email-otp.js

# Test customer deletion
node scripts/manual-tests/test-delete-flow.js
```

**Common issues & fixes:**
- ❌ Services not running: Start with `docker compose up -d`
- ❌ .env not loaded: Check .env file exists

---

## Deployment Commands

### Production Migration

```bash
npm run migrate:prod
```

**What it does:**
- Applies pending migrations to production database
- Uses already-created migration files
- Does NOT create new migrations
- Safe for production

**When to use:**
- Production deployments
- After merging migration PRs
- Database schema updates in production
- Automated deployment pipelines

**Why:**
- Safe production database updates
- Applies pre-tested migrations
- Can be scheduled
- Supports automated deployment

**Example workflow:**
```bash
# In production environment
npm run migrate:prod

# Checks for pending migrations
# Applies them in order
# Verifies success
```

**Common issues & fixes:**
- ❌ Emergency rollback: Contact database team
- ❌ Migration failed: Check logs, fix issues

---

### Build for Production

```bash
npm run build
```

**What it does:**
- Compiles TypeScript to JavaScript
- Optimizes for production
- Creates `dist/` folder
- Type-checks entire codebase

**When to use:**
- Before `npm start` in production
- Creating Docker images
- Production deployments
- Final verification

**Why:**
- Ensures no runtime errors
- TypeScript verification
- Optimized output
- Required before running

**Example workflow:**
```bash
# Build TypeScript
npm run build

# Verify no errors
# dist/ folder created

# Start production
npm start
```

---

## Monitoring & Logging Commands

### View Application Logs

```bash
docker compose logs -f api
```

**What it does:**
- Shows API container logs in real-time
- Follows output as it happens
- Useful for debugging
- Can filter by service

**When to use:**
- Debugging issues
- Monitoring production
- Checking error messages
- Understanding behavior

**Example:**
```bash
# Follow API logs
docker compose logs -f api

# Follow specific service
docker compose logs -f postgres

# Follow all services
docker compose logs -f

# View last 100 lines
docker compose logs --tail=100 api
```

---

### Access Grafana Dashboards

```bash
# Open browser to:
http://localhost:3001
```

**What it does:**
- Web interface for monitoring
- Real-time metrics visualization
- Performance dashboards
- Alert management

**When to use:**
- Monitoring production
- Performance analysis
- Alert checking
- System health verification

**Credentials:**
- Username: `admin`
- Password: `admin` (change in production!)

**Example workflow:**
```bash
# Services running with monitoring
# Open http://localhost:3001

# Dashboards available:
# - Execora API Performance
# - PostgreSQL Metrics
# - Redis Usage
# - Error Tracking
```

---

### Access Prometheus Metrics

```bash
# API metrics:
http://localhost:3000/metrics

# Prometheus UI:
http://localhost:9090
```

**What it does:**
- Raw Prometheus metrics endpoint
- Real-time system metrics
- Scrape-able by monitoring tools
- Machine-readable format

**When to use:**
- Integration with external monitoring
- Debugging metrics
- Verifying metrics collection
- Alert configuration

**Example:**
```bash
# Get metrics in Prometheus format
curl http://localhost:3000/metrics

# Output shows:
# http_requests_total{path="/api/customers"}
# database_query_duration_seconds{method="SELECT"}
# etc.
```

---

### Access Health Check Endpoint

```bash
curl http://localhost:3000/health
```

**What it does:**
- Returns health status of app
- Checks database, Redis, etc.
- Used by load balancers
- Returns JSON response

**When to use:**
- Verifying app is running
- Load balancer checks
- Kubernetes health probes
- Debugging startup issues

**Example:**
```bash
curl http://localhost:3000/health

# Response:
# {
#   "status": "healthy",
#   "database": "ok",
#   "redis": "ok",
#   "uptime": 3600
# }
```

---

## Git & Version Control

### Check Git Status

```bash
git status
```

**What it does:**
- Shows changed files
- Indicates staged/unstaged
- Shows branch name
- Lists untracked files

**When to use:**
- Before committing
- Verifying changes
- Checking what changed
- Organizing commits

**Example:**
```bash
git status

# Shows:
# On branch main
# Changes not staged:
#   modified: src/modules/invoice.ts
#   new file: docs/test.md
```

---

### Stage Changes

```bash
git add [file or .]
```

**What it does:**
- Stages files for commit
- Prepares changes
- `git add .` stages all changes
- Can stage specific files

**When to use:**
- Before every commit
- Organizing commits
- Choosing what to commit
- Splitting changes

**Example:**
```bash
# Stage all changes
git add .

# Stage specific file
git add src/modules/invoice.ts

# Stage directory
git add docs/
```

---

### Commit Changes

```bash
git commit -m "commit message"
```

**What it does:**
- Creates commit with staged changes
- Records changes in repository
- Creates point in history
- Requires meaningful message

**When to use:**
- After making changes
- Before pushing
- Logical grouping of changes
- Documentation of work

**Message format:**
```
feat: add JWT authentication
fix: resolve customer deletion race condition
docs: update API documentation
test: add regression test suite
chore: upgrade dependencies
```

**Example:**
```bash
git commit -m "feat: add customer fuzzy search"

# Output:
# [main 3d4e2f1] feat: add customer fuzzy search
# 1 file changed, 50 insertions(+)
```

---

### Push to Remote

```bash
git push
```

**What it does:**
- Uploads commits to GitHub/remote
- Pushes current branch
- Updates remote tracking
- Fails if conflicts exist

**When to use:**
- After committing
- Sharing changes with team
- Backup to remote
- Triggering CI/CD

**Example:**
```bash
# Push current branch
git push

# Output:
# To github.com:org/execora.git
# abc123..def456 main -> main
```

---

### Pull Latest Changes

```bash
git pull
```

**What it does:**
- Fetches latest from remote
- Merges into current branch
- Updates local repository
- May require conflict resolution

**When to use:**
- Starting work session
- Before pushing
- After teammates push
- Staying in sync

**Example:**
```bash
git pull

# Output:
# From github.com:org/execora.git
# * branch main -> FETCH_HEAD
# Already up to date.
```

---

## Troubleshooting Quick Reference

### Common Issues and Solutions

#### Issue: "Port 3000 already in use"

**Cause:** Another process is using port 3000

**Solution:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill it
lsof -ti:3000 | xargs kill -9

# Or specify different port
PORT=3001 npm run dev
```

---

#### Issue: "Database connection refused"

**Cause:** PostgreSQL service not running or wrong URL

**Solution:**
```bash
# Check if postgres is running
docker compose ps postgres

# If not running, start it
docker compose up -d postgres

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Verify connection
docker compose exec postgres psql -U execora -d execora -c "SELECT 1;"
```

---

#### Issue: "Redis connection refused"

**Cause:** Redis not running

**Solution:**
```bash
# Check Redis
docker compose ps redis

# Start Redis
docker compose up -d redis

# Verify connection
redis-cli ping
# Should respond: PONG
```

---

#### Issue: "npm test fails with module not found"

**Cause:** Dependencies not installed or build failed

**Solution:**
```bash
# Install dependencies
npm install

# Rebuild
npm run build

# Run tests again
npm test
```

---

#### Issue: ".env file not found"

**Cause:** Using wrong path or file doesn't exist

**Solution:**
```bash
# Create from template
cp .env.example .env

# Or manually create
touch .env

# Add required variables
echo "DATABASE_URL=postgresql://user:pass@localhost/execora" >> .env
echo "REDIS_URL=redis://localhost:6379" >> .env
```

---

#### Issue: "Prisma schema out of sync"

**Cause:** Schema changed but client not regenerated

**Solution:**
```bash
# Regenerate Prisma client
npm run db:generate

# Or clear cache and rebuild
rm -rf node_modules/.prisma
npm run db:generate
```

---

#### Issue: "Docker compose fails with permission denied"

**Cause:** User not in docker group or sudo needed

**Solution:**
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
# Log out and back in for group to apply

# Or use sudo
sudo docker compose up -d
```

---

#### Issue: Tests timeout or hang

**Cause:** Missing await, database connection issue, or long operations

**Solution:**
```bash
# Increase timeout
timeout=30000 npm test

# Or check for missing awaits
# Ensure all async operations await

# Check database is running
docker compose ps postgres

# Check for hung processes
ps aux | grep node
```

---

#### Issue: "Migrations not applying"

**Cause:** Migration files missing, database state incorrect, or conflicts

**Solution:**
```bash
# Check migration status
npx prisma migrate status

# Resolve conflicts
npm run db:migrate

# Force clear migrations (dev only!)
npx prisma migrate reset
# OR
npx prisma db push --force-reset
```

---

#### Issue: "API not responding"

**Cause:** Service crashed, port wrong, or dependency issue

**Solution:**
```bash
# Check if running
docker compose ps api

# View logs
docker compose logs api

# Restart
docker compose restart api

# Or rebuild and restart
docker compose build api
docker compose up -d api
```

---

#### Issue: "Memory issues / Out of memory"

**Cause:** Node process using too much memory

**Solution:**
```bash
# Increase Node memory for build
NODE_OPTIONS=--max-old-space-size=4096 npm run build

# For running app
NODE_OPTIONS=--max-old-space-size=2048 npm start

# Check memory usage
node -e "console.log(require('os').totalmem() / 1024 / 1024 + ' MB')"
```

---

#### Issue: "WebSocket connection refused"

**Cause:** WebSocket service not running or wrong URL

**Solution:**
```bash
# Ensure app is running
npm run dev

# Or check production
docker compose up -d api

# Connect to correct URL
# ws://localhost:3000/ws (local)
# wss://example.com/ws (production)

# Check WebSocket enabled in API
# Port 3000 handles ws://
```

---

#### Issue: "Email not sending"

**Cause:** SMTP credentials wrong, service not configured, or rate limited

**Solution:**
```bash
# Check email config in .env
cat .env | grep EMAIL_

# Test connection
npm run test -- email.test.ts

# Or run setup script
bash setup-email-otp.sh

# Check rate limiting
# Most providers rate limit: ~200/hour
```

---

#### Issue: "Deepgram/OpenAI API errors"

**Cause:** API key invalid, quota exceeded, or service down

**Solution:**
```bash
# Verify API keys in .env
cat .env | grep -E "OPENAI_|DEEPGRAM_"

# Test key is valid
# Visit: https://platform.openai.com/account/api-keys

# Check quota
# Login to provider dashboard

# Use fallback if available
# Check code for fallback providers
```

---

#### Issue: "Git push rejected"

**Cause:** Remote ahead, need to pull first, or permission issue

**Solution:**
```bash
# Pull first
git pull

# Then push
git push

# If rejected (branch protected)
# Create PR instead, not direct push

# Resolve conflicts
git pull --no-ff
# Fix conflicts in files
git add .
git commit -m "merge: resolve conflicts"
git push
```

---

### Debug Mode

Enable debug logging to troubleshoot:

```bash
# Development with debug output
LOG_LEVEL=debug npm run dev

# Tests with debug
LOG_LEVEL=debug npm test

# Docker logs with timestamps
docker compose logs -f --timestamps api
```

---

### Health Check

Quick health verification:

```bash
# Check all services
docker compose ps

# Check API
curl http://localhost:3000/health

# Check database
docker compose exec postgres psql -U execora -d execora -c "SELECT 1;"

# Check Redis
redis-cli ping

# Check metrics
curl http://localhost:3000/metrics | head -20
```

---

## Quick Command Categories

### 🚀 Just Getting Started?
```bash
npm install
docker compose up -d
npm run db:push
npm run seed
npm run dev
```

### 🧪 Running Tests?
```bash
npm test
bash scripts/testing/regression-test.sh
```

### 🚢 Deploying?
```bash
npm run build
npm run migrate:prod
npm start
```

### 🐛 Debugging?
```bash
LOG_LEVEL=debug npm run dev
docker compose logs -f api
curl http://localhost:3000/health
```

### 📊 Monitoring?
```bash
curl http://localhost:3000/metrics
http://localhost:3001/  # Grafana
```

---

**Need more help?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed guides.

