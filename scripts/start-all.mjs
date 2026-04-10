#!/usr/bin/env node

/**
 * Execora — Single-command launcher
 * Starts: infra (Docker) → API → Worker → Web → Mobile
 * Works on: macOS · Linux · Windows
 *
 * Usage:
 *   node scripts/start-all.mjs          # all services
 *   node scripts/start-all.mjs --no-mobile   # skip mobile (Expo)
 *   node scripts/start-all.mjs --no-docker   # skip Docker infra check
 *   node scripts/start-all.mjs --no-infra    # skip Docker start (infra already running)
 *   pnpm start:all
 */

import {
    spawn,
    spawnSync
} from "node:child_process";
import {
    existsSync
} from "node:fs";
import {
    resolve
} from "node:path";
import {
    fileURLToPath
} from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".",
    import.meta.url)), "..");
const IS_WIN = process.platform === "win32";
const ARGS = process.argv.slice(2);
const NO_MOBILE = ARGS.includes("--no-mobile");
const NO_DOCKER = ARGS.includes("--no-docker");
const NO_INFRA = ARGS.includes("--no-infra") || NO_DOCKER;

// ── ANSI colours (auto-disabled on Windows without colour support) ─────────────
const HAS_COLOR = !IS_WIN || process.env.TERM_PROGRAM || process.env.WT_SESSION || process.env.COLORTERM;
const R = HAS_COLOR ? "\x1b[0m" : "";
const BOLD = HAS_COLOR ? "\x1b[1m" : "";
const DIM = HAS_COLOR ? "\x1b[2m" : "";
const COLORS = [
    HAS_COLOR ? "\x1b[36m" : "", // cyan   — API
    HAS_COLOR ? "\x1b[35m" : "", // magenta — Worker
    HAS_COLOR ? "\x1b[34m" : "", // blue  — Web
    HAS_COLOR ? "\x1b[33m" : "", // yellow — Mobile
    HAS_COLOR ? "\x1b[32m" : "", // green — Docker
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function silentRun(cmd, args) {
    return spawnSync(cmd, args, {
        stdio: "ignore",
        shell: IS_WIN
    }).status === 0;
}

function hasCommand(cmd) {
    return silentRun(IS_WIN ? "where" : "which", [cmd]);
}

function log(label, color, msg) {
    const prefix = `${color}${BOLD}[${label}]${R}`;
    console.log(`${prefix} ${msg}`);
}

function banner() {
    const line = "═".repeat(52);
    console.log(`\n${BOLD}${COLORS[0]}${line}${R}`);
    console.log(`${BOLD}${COLORS[0]}  EXECORA — Starting all services${R}`);
    console.log(`${BOLD}${COLORS[0]}${line}${R}`);
    console.log(`${DIM}  Platform : ${process.platform}`);
    console.log(`  Node     : ${process.version}`);
    console.log(`  Root     : ${ROOT}`);
    console.log(`  Mobile   : ${NO_MOBILE ? "skipped (--no-mobile)" : "enabled"}${R}\n`);
}

// ── Process registry for clean shutdown ──────────────────────────────────────
const procs = [];
let shuttingDown = false;

function shutdown(sig) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${BOLD}${COLORS[4]}[execora]${R} ${sig} received — stopping all services...`);
    for (const {
            proc,
            label
        } of procs) {
        if (proc && !proc.killed) {
            try {
                if (IS_WIN) {
                    spawnSync("taskkill", ["/pid", String(proc.pid), "/f", "/t"], {
                        stdio: "ignore",
                        shell: true
                    });
                } else {
                    process.kill(-proc.pid, "SIGTERM");
                }
                console.log(`${DIM}  ↳ stopped ${label}${R}`);
            } catch {
                // process may have already exited
            }
        }
    }
    setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGHUP", () => shutdown("SIGHUP"));
if (IS_WIN) {
    // Windows emits this instead
    process.on("SIGBREAK", () => shutdown("SIGBREAK"));
}

// ── Spawn a service ───────────────────────────────────────────────────────────
function startService({
    label,
    color,
    cmd,
    args,
    env = {}
}) {
    log(label, color, `Starting: ${cmd} ${args.join(" ")}`);

    const child = spawn(cmd, args, {
        cwd: ROOT,
        shell: IS_WIN,
        detached: !IS_WIN, // allows killing process group on Unix
        stdio: ["ignore", "pipe", "pipe"],
        env: {
            ...process.env,
            FORCE_COLOR: "1",
            ...env
        },
    });

    procs.push({
        proc: child,
        label
    });

    child.stdout ?.on("data", (d) => {
        d.toString().split("\n").filter(Boolean).forEach((line) => {
            process.stdout.write(`${color}${BOLD}[${label}]${R} ${line}\n`);
        });
    });
    child.stderr ?.on("data", (d) => {
        d.toString().split("\n").filter(Boolean).forEach((line) => {
            process.stderr.write(`${color}${BOLD}[${label}]${R} ${DIM}${line}${R}\n`);
        });
    });

    child.on("exit", (code, signal) => {
        if (!shuttingDown) {
            log(label, color, `exited (code=${code ?? signal})`);
        }
    });

    return child;
}

// ── Docker infra ──────────────────────────────────────────────────────────────
async function ensureInfra() {
    if (NO_INFRA) {
        log("docker", COLORS[4], "Skipping Docker start (--no-infra)");
        return;
    }
    if (!hasCommand("docker")) {
        log("docker", COLORS[4], "Docker not found — skipping. Make sure postgres/redis/minio are running.");
        return;
    }
    if (!silentRun("docker", ["info"])) {
        log("docker", COLORS[4], "Docker is not running — skipping infra. Start Docker Desktop first.");
        return;
    }

    log("docker", COLORS[4], "Starting infrastructure (postgres, redis, minio)...");
    const result = spawnSync(
        "node",
        ["scripts/docker/compose.mjs", "up", "-d", "postgres", "redis", "minio"], {
            cwd: ROOT,
            stdio: "inherit",
            shell: IS_WIN
        }
    );
    if (result.status !== 0) {
        log("docker", COLORS[4], "Warning: some infra services may have failed to start.");
    } else {
        log("docker", COLORS[4], "Infrastructure ready ✓");
    }

    // Brief pause to let Postgres accept connections before API tries to connect
    await new Promise((r) => setTimeout(r, 2500));
}

// ── Main ──────────────────────────────────────────────────────────────────────
banner();

// 1. Verify .env exists
if (!existsSync(resolve(ROOT, ".env"))) {
    console.error(`\n${BOLD}ERROR:${R} .env not found. Run: ${BOLD}pnpm setup${R} first.\n`);
    process.exit(1);
}

// 2. Start infra (waits)
await ensureInfra();

console.log("");

// 3. Start backend services
startService({
    label: "  api  ",
    color: COLORS[0],
    cmd: IS_WIN ? "pnpm.cmd" : "pnpm",
    args: ["--filter", "@execora/api", "dev"],
});

// Small stagger so API gets a head start
await new Promise((r) => setTimeout(r, 1500));

startService({
    label: "worker",
    color: COLORS[1],
    cmd: IS_WIN ? "pnpm.cmd" : "pnpm",
    args: ["--filter", "@execora/worker", "dev"],
});

// 4. Start frontend web
startService({
    label: "  web  ",
    color: COLORS[2],
    cmd: IS_WIN ? "pnpm.cmd" : "pnpm",
    args: ["--filter", "@execora/web", "dev"],
});

// 5. Start mobile (Expo)
if (!NO_MOBILE) {
    await new Promise((r) => setTimeout(r, 1000));
    startService({
        label: "mobile",
        color: COLORS[3],
        cmd: IS_WIN ? "pnpm.cmd" : "pnpm",
        args: ["--filter", "@execora/mobile", "start"],
    });
}

console.log(`
${BOLD}${COLORS[0]}  Services starting...${R}

  ${BOLD}API   ${R}  →  http://localhost:3006
  ${BOLD}Web   ${R}  →  http://localhost:5173
  ${BOLD}Mobile${R}  →  http://localhost:8084  ${DIM}(Expo — scan QR for device)${R}

  ${DIM}Press Ctrl+C to stop all services.${R}
`);

// Keep process alive
process.stdin.resume();