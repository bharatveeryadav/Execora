#!/usr/bin/env node

/**
 * Execora — Cross-platform setup script
 * Works on: macOS · Linux · Windows (cmd / PowerShell / Git Bash)
 *
 * Usage:  node scripts/setup.mjs
 *   or:   pnpm setup
 */

import {
    spawnSync,
    execSync
} from "node:child_process";
import {
    existsSync,
    copyFileSync,
    readFileSync,
    writeFileSync
} from "node:fs";
import {
    createInterface
} from "node:readline";
import {
    join,
    resolve
} from "node:path";
import {
    fileURLToPath
} from "node:url";

const __dirname = fileURLToPath(new URL(".",
    import.meta.url));
const ROOT = resolve(__dirname, "..");
const IS_WIN = process.platform === "win32";
const SHELL = IS_WIN;

// ── Colours (disabled on Windows unless terminal supports it) ─────────────────
const SUPPORTS_COLOR = !IS_WIN || process.env.TERM_PROGRAM || process.env.WT_SESSION;
const c = {
    reset: SUPPORTS_COLOR ? "\x1b[0m" : "",
    bold: SUPPORTS_COLOR ? "\x1b[1m" : "",
    red: SUPPORTS_COLOR ? "\x1b[31m" : "",
    green: SUPPORTS_COLOR ? "\x1b[32m" : "",
    yellow: SUPPORTS_COLOR ? "\x1b[33m" : "",
    cyan: SUPPORTS_COLOR ? "\x1b[36m" : "",
    blue: SUPPORTS_COLOR ? "\x1b[34m" : "",
};

function info(msg) {
    console.log(`${c.cyan}▸${c.reset} ${msg}`);
}

function ok(msg) {
    console.log(`${c.green}✓${c.reset} ${msg}`);
}

function warn(msg) {
    console.log(`${c.yellow}⚠${c.reset}  ${msg}`);
}

function fail(msg) {
    console.error(`${c.red}✗${c.reset} ${msg}`);
    process.exit(1);
}

function header(msg) {
    console.log(`\n${c.bold}${c.blue}${msg}${c.reset}`);
    console.log("─".repeat(50));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function run(cmd, args = [], opts = {}) {
    const result = spawnSync(cmd, args, {
        stdio: "inherit",
        cwd: ROOT,
        shell: IS_WIN,
        ...opts,
    });
    return result.status === 0;
}

function runSilent(cmd, args = []) {
    const result = spawnSync(cmd, args, {
        stdio: "ignore",
        cwd: ROOT,
        shell: IS_WIN,
    });
    return result.status === 0;
}

function hasCommand(cmd) {
    return runSilent(IS_WIN ? "where" : "which", [cmd]);
}

function ask(rl, question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

// ── Banner ────────────────────────────────────────────────────────────────────
console.log(`\n${c.bold}${c.cyan}`);
console.log("  ███████╗██╗  ██╗███████╗ ██████╗ ██████╗ ██████╗  █████╗");
console.log("  ██╔════╝╚██╗██╔╝██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗");
console.log("  █████╗   ╚███╔╝ █████╗  ██║     ██║   ██║██████╔╝███████║");
console.log("  ██╔══╝   ██╔██╗ ██╔══╝  ██║     ██║   ██║██╔══██╗██╔══██║");
console.log("  ███████╗██╔╝ ██╗███████╗╚██████╗╚██████╔╝██║  ██║██║  ██║");
console.log("  ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝");
console.log(`${c.reset}${c.cyan}  Cross-Platform Setup Wizard — macOS · Linux · Windows`);
console.log(`  ${new Date().getFullYear()}${c.reset}\n`);

// ── Step 1: Prerequisites ─────────────────────────────────────────────────────
header("Step 1 / 5 — Checking prerequisites");

// Node version
const nodeVersion = process.versions.node.split(".").map(Number);
if (nodeVersion[0] < 20) {
    fail(`Node.js 20+ required. You have ${process.version}. Install from https://nodejs.org`);
}
ok(`Node.js ${process.version}`);

// pnpm
if (!hasCommand("pnpm")) {
    warn("pnpm not found. Installing globally via npm...");
    if (!run("npm", ["install", "-g", "pnpm"])) {
        fail("Could not install pnpm. Run: npm install -g pnpm");
    }
}
ok("pnpm found");

// Docker
if (!hasCommand("docker")) {
    warn(`Docker not found.`);
    if (IS_WIN) {
        warn("Install Docker Desktop from https://docs.docker.com/desktop/install/windows-install/");
    } else if (process.platform === "darwin") {
        warn("Install Docker Desktop from https://docs.docker.com/desktop/install/mac-install/");
    } else {
        warn("Install Docker: https://docs.docker.com/engine/install/");
    }
    warn("You can still run the development services manually without Docker.");
} else {
    ok("Docker found");
    // Check Docker is running
    if (!runSilent("docker", ["info"])) {
        warn("Docker is installed but not running. Please start Docker Desktop and re-run setup.");
    } else {
        ok("Docker is running");
    }
}

// ── Step 2: Environment file ──────────────────────────────────────────────────
header("Step 2 / 5 — Environment configuration");

const envPath = join(ROOT, ".env");
const envExamplePath = join(ROOT, ".env.example");
const personalEnvPath = join(ROOT, ".env.personal");
let shouldPromptForKeys = true;

if (!existsSync(envExamplePath)) {
    fail(".env.example not found — is the repository complete?");
}

if (existsSync(personalEnvPath)) {
    copyFileSync(personalEnvPath, envPath);
    ok("Loaded .env from .env.personal (same saved credentials)");
    shouldPromptForKeys = false;
} else if (existsSync(envPath)) {
    ok(".env already exists — seeding .env.personal from current .env");
    copyFileSync(envPath, personalEnvPath);
} else {
    copyFileSync(envExamplePath, envPath);
    copyFileSync(envPath, personalEnvPath);
    ok("Created .env and .env.personal from .env.example");
}

// ── Step 3: API keys prompt ───────────────────────────────────────────────────
header("Step 3 / 5 — API keys prompt (press Enter to skip)");

if (shouldPromptForKeys) {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    let envContent = readFileSync(envPath, "utf8");

    function updateEnv(key, value) {
        if (!value) return;
        const regex = new RegExp(`^(${key}=).*$`, "m");
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `$1${value}`);
        } else {
            envContent += `\n${key}=${value}`;
        }
    }

    const openaiKey = await ask(rl, `  OpenAI API key   [skip]: `);
    updateEnv("OPENAI_API_KEY", openaiKey.trim());

    const groqKey = await ask(rl, `  Groq API key     [skip]: `);
    updateEnv("GROQ_API_KEY", groqKey.trim());

    const elevenKey = await ask(rl, `  ElevenLabs key   [skip]: `);
    updateEnv("ELEVENLABS_API_KEY", elevenKey.trim());

    rl.close();

    writeFileSync(envPath, envContent, "utf8");
    ok(".env saved");
} else {
    ok("Skipped API key prompt (using saved .env.personal credentials)");
}

info("Auto-generating apps/web/.env and apps/mobile/.env (with local IP + login defaults)...");
if (!run("node", ["scripts/sync-personal-env.mjs", "--quiet"])) {
    warn("Env sync failed. You can run it manually: pnpm env:sync:personal");
} else {
    ok("App env files generated");
}

// ── Step 4: Install dependencies ─────────────────────────────────────────────
header("Step 4 / 5 — Installing dependencies");

info("Running pnpm install...");
if (!run("pnpm", ["install"])) {
    fail("pnpm install failed. Check the output above.");
}
ok("Dependencies installed");

// ── Step 5: Docker services ───────────────────────────────────────────────────
header("Step 5 / 5 — Starting infrastructure services");

if (!hasCommand("docker") || !runSilent("docker", ["info"])) {
    warn("Docker is not available. Skipping service startup.");
    warn("Start services manually: PostgreSQL 5432, Redis 6379, MinIO 9000");
    printManualInstructions();
} else {
    info("Starting Docker services (postgres, redis, minio)...");
    if (!run("node", ["scripts/docker/compose.mjs", "up", "-d", "postgres", "redis", "minio"])) {
        warn("Some services failed to start. Check: pnpm docker:ps");
    } else {
        ok("Infrastructure services started");

        info("Waiting for postgres to be ready (10s)...");
        await new Promise((r) => setTimeout(r, 10000));

        info("Pushing database schema...");
        if (!run("pnpm", ["db:push"])) {
            warn("db:push failed — try again after services are ready: pnpm db:push");
        } else {
            ok("Database schema applied");
        }
    }
}

// ── Done ──────────────────────────────────────────────────────────────────────
console.log(`\n${c.bold}${c.green}═══════════════════════════════════════════════════`);
console.log(`  Setup complete! 🎉`);
console.log(`═══════════════════════════════════════════════════${c.reset}\n`);
console.log(`  ${c.bold}Start everything with ONE command:${c.reset}`);
console.log(`  ${c.cyan}pnpm start:all${c.reset}   — API + Worker + Web + Mobile\n`);
console.log(`  ${c.bold}Personal fastest command:${c.reset}`);
console.log(`  ${c.cyan}pnpm dev:personal${c.reset} — auto-sync env + start all\n`);
console.log(`  ${c.bold}Or start individually:${c.reset}`);
console.log(`  ${c.cyan}pnpm dev${c.reset}         — API server      (port 3006)`);
console.log(`  ${c.cyan}pnpm dev:web${c.reset}     — Web frontend    (port 5173)`);
console.log(`  ${c.cyan}pnpm worker${c.reset}      — BullMQ worker`);
console.log(`  ${c.cyan}pnpm mobile${c.reset}      — Expo mobile app (port 8084)`);
console.log(`\n  ${c.bold}Useful commands:${c.reset}`);
console.log(`  ${c.cyan}pnpm docker:up${c.reset}   — start all Docker services`);
console.log(`  ${c.cyan}pnpm docker:down${c.reset} — stop  all Docker services`);
console.log(`  ${c.cyan}pnpm docker:ps${c.reset}   — list  running containers`);
console.log(`  ${c.cyan}pnpm seed${c.reset}        — load  sample data\n`);

function printManualInstructions() {
    console.log(`\n  ${c.yellow}Manual service startup:${c.reset}`);
    if (IS_WIN) {
        console.log("  Install PostgreSQL: https://www.postgresql.org/download/windows/");
        console.log("  Install Redis:      https://github.com/tporadowski/redis/releases");
        console.log("  Install MinIO:      https://min.io/download#/windows");
    } else if (process.platform === "darwin") {
        console.log("  brew install postgresql@15 redis");
        console.log("  brew services start postgresql@15 redis");
        console.log("  curl -O https://dl.min.io/server/minio/release/darwin-amd64/minio");
    } else {
        console.log("  sudo apt-get install -y postgresql redis-server");
        console.log("  # MinIO: https://min.io/download#/linux");
    }
}