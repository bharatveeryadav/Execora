#!/usr/bin/env node

/**
 * Copy .env.example → .env  (cross-platform, no bash needed)
 * Usage: node scripts/copy-env.mjs
 *   or:  pnpm copy-env
 */
import {
    existsSync,
    copyFileSync
} from "node:fs";
import {
    resolve
} from "node:path";
import {
    fileURLToPath
} from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".",
    import.meta.url)), "..");
const src = resolve(ROOT, ".env.example");
const dst = resolve(ROOT, ".env");

if (!existsSync(src)) {
    console.error("ERROR: .env.example not found.");
    process.exit(1);
}
if (existsSync(dst)) {
    console.log(".env already exists — skipping. Delete it first to reset.");
} else {
    copyFileSync(src, dst);
    console.log("Created .env from .env.example");
    console.log("Edit .env and add your API keys before starting.");
}