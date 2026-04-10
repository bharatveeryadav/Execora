#!/usr/bin/env node

/**
 * Personal fast-start command.
 * One command for daily development:
 *   1) Ensure dependencies
 *   2) Sync env files from .env.personal
 *   3) Start API + Worker + Web + Mobile (and infra if Docker is available)
 */

import {
    existsSync
} from "node:fs";
import {
    resolve
} from "node:path";
import {
    fileURLToPath
} from "node:url";
import {
    spawnSync
} from "node:child_process";

const ROOT = resolve(fileURLToPath(new URL(".",
    import.meta.url)), "..");
const IS_WIN = process.platform === "win32";
const passthrough = process.argv.slice(2);

function run(cmd, args, {
    allowFailure = false
} = {}) {
    const result = spawnSync(cmd, args, {
        cwd: ROOT,
        stdio: "inherit",
        shell: IS_WIN,
    });

    if (!allowFailure && result.status !== 0) {
        process.exit(result.status ?? 1);
    }

    return result.status === 0;
}

function hasNodeModules() {
    return existsSync(resolve(ROOT, "node_modules"));
}

console.log("\n[personal] Fast development startup");

if (!hasNodeModules()) {
    console.log("[personal] Installing dependencies (first run)...");
    run(IS_WIN ? "pnpm.cmd" : "pnpm", ["install"]);
}

console.log("[personal] Syncing env files from .env.personal...");
run("node", ["scripts/sync-personal-env.mjs"]);

console.log("[personal] Starting all services...");
run("node", ["scripts/start-all.mjs", ...passthrough], {
    allowFailure: false
});