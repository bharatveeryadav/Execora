#!/usr/bin/env node

/**
 * Personal env sync for fast local development.
 * Source of truth: .env.personal (gitignored)
 * Generated files:
 *   - .env
 *   - apps/web/.env
 *   - apps/mobile/.env
 */

import {
    copyFileSync,
    existsSync,
    readFileSync,
    writeFileSync
} from "node:fs";
import {
    networkInterfaces
} from "node:os";
import {
    dirname,
    resolve
} from "node:path";
import {
    fileURLToPath
} from "node:url";

const ROOT = resolve(dirname(fileURLToPath(
    import.meta.url)), "..");
const QUIET = process.argv.includes("--quiet");

const paths = {
    personal: resolve(ROOT, ".env.personal"),
    rootEnv: resolve(ROOT, ".env"),
    rootExample: resolve(ROOT, ".env.example"),
    webEnv: resolve(ROOT, "apps/web/.env"),
    mobileEnv: resolve(ROOT, "apps/mobile/.env"),
};

function log(msg) {
    if (!QUIET) console.log(msg);
}

function parseEnv(text) {
    const map = new Map();
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const idx = line.indexOf("=");
        if (idx <= 0) continue;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (key) map.set(key, value);
    }
    return map;
}

function firstNonInternalIPv4() {
    const nets = networkInterfaces();
    for (const iface of Object.values(nets)) {
        if (!iface) continue;
        for (const details of iface) {
            if (details.family === "IPv4" && !details.internal) {
                return details.address;
            }
        }
    }
    return null;
}

function ensurePersonalEnv() {
    if (existsSync(paths.personal)) return;

    if (existsSync(paths.rootEnv)) {
        copyFileSync(paths.rootEnv, paths.personal);
        log("Created .env.personal from existing .env");
        return;
    }

    if (!existsSync(paths.rootExample)) {
        console.error("ERROR: .env.example not found.");
        process.exit(1);
    }

    copyFileSync(paths.rootExample, paths.personal);
    log("Created .env.personal from .env.example");
    log("Update .env.personal once with your keys. This file is now your single local source of truth.");
}

function writeRootEnv(personalText) {
    writeFileSync(paths.rootEnv, `${personalText.trimEnd()}\n`, "utf8");
    log("Synced .env from .env.personal");
}

function writeWebEnv(env) {
    const port = env.get("PORT") || "3006";
    const systemTenant = env.get("SYSTEM_TENANT_ID") || "system-tenant-001";
    const businessName = env.get("BUSINESS_NAME") || "Execora";
    const lanIp = firstNonInternalIPv4();
    const defaultWebApi = lanIp ? `http://${lanIp}:${port}` : `http://localhost:${port}`;

    const viteApiBase = env.get("VITE_API_BASE_URL") || env.get("WEB_API_URL") || defaultWebApi;
    const loginEmail = env.get("DEV_LOGIN_EMAIL") || env.get("ADMIN_EMAIL") || "owner@example.com";
    const loginPassword = env.get("DEV_LOGIN_PASSWORD") || "change-me";

    const content = [
        `VITE_API_BASE_URL=${viteApiBase}`,
        `VITE_APP_NAME=${businessName}`,
        `VITE_LOGIN_EMAIL=${loginEmail}`,
        `VITE_LOGIN_PASSWORD=${loginPassword}`,
        `VITE_LOGIN_TENANT_ID=${systemTenant}`,
        "",
    ].join("\n");

    writeFileSync(paths.webEnv, content, "utf8");
    log("Generated apps/web/.env");
}

function writeMobileEnv(env) {
    const port = env.get("PORT") || "3006";
    const lanIp = firstNonInternalIPv4();
    const defaultMobileApi = lanIp ? `http://${lanIp}:${port}` : `http://localhost:${port}`;

    const expoApi = env.get("EXPO_PUBLIC_API_URL") || env.get("MOBILE_API_URL") || defaultMobileApi;
    const loginEmail = env.get("DEV_LOGIN_EMAIL") || env.get("ADMIN_EMAIL") || "owner@example.com";
    const loginPassword = env.get("DEV_LOGIN_PASSWORD") || "change-me";

    const content = [
        `EXPO_PUBLIC_API_URL=${expoApi}`,
        `EXPO_PUBLIC_LOGIN_EMAIL=${loginEmail}`,
        `EXPO_PUBLIC_LOGIN_PASSWORD=${loginPassword}`,
        "",
    ].join("\n");

    writeFileSync(paths.mobileEnv, content, "utf8");
    log("Generated apps/mobile/.env");
}

ensurePersonalEnv();
const personalText = readFileSync(paths.personal, "utf8");
const env = parseEnv(personalText);

writeRootEnv(personalText);
writeWebEnv(env);
writeMobileEnv(env);

if (!QUIET) {
    const lanIp = firstNonInternalIPv4();
    if (lanIp) {
        console.log(`Detected local IP: ${lanIp}`);
    }
    console.log("Personal env sync complete.");
}