#!/usr/bin/env node

import {
    readdir,
    readFile
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const routesDir = path.join(repoRoot, "apps/api/src/api/routes");
const ownershipFile = path.join(
    repoRoot,
    "docs/backend/architecture/route-ownership.json",
);

const VALID_DOMAINS = new Set([
    "sales",
    "inventory",
    "finance",
    "purchases",
    "crm",
    "compliance",
    "reporting",
    "platform",
    "admin",
    "integrations",
    "system",
    "ai",
]);

function fail(message) {
    console.error(`\n[route-ownership] ERROR: ${message}`);
    process.exitCode = 1;
}

async function main() {
    const files = await readdir(routesDir, {
        withFileTypes: true
    });
    const routeFiles = files
        .filter((entry) => entry.isFile() && entry.name.endsWith(".routes.ts"))
        .map((entry) => entry.name)
        .sort();

    const raw = await readFile(ownershipFile, "utf8");
    const manifest = JSON.parse(raw);
    const mapped = manifest ? .routes ? ? {};
    const mappedFiles = Object.keys(mapped).sort();

    const missing = routeFiles.filter((name) => !(name in mapped));
    const stale = mappedFiles.filter((name) => !routeFiles.includes(name));

    for (const routeFile of mappedFiles) {
        const owner = mapped[routeFile];
        if (!owner || typeof owner !== "object") {
            fail(`Entry for ${routeFile} must be an object`);
            continue;
        }

        const {
            domain,
            feature,
            owner: ownerSquad
        } = owner;

        if (!VALID_DOMAINS.has(domain)) {
            fail(
                `Entry for ${routeFile} has invalid domain '${domain}'. Allowed: ${Array.from(VALID_DOMAINS).join(", ")}`,
            );
        }

        if (typeof feature !== "string" || !feature.includes("/")) {
            fail(
                `Entry for ${routeFile} must define feature as 'area/feature' (got '${feature ?? ""}')`,
            );
        }

        if (typeof ownerSquad !== "string" || ownerSquad.trim().length === 0) {
            fail(`Entry for ${routeFile} must define a non-empty owner squad`);
        }
    }

    if (missing.length > 0) {
        fail(`Missing route ownership entries: ${missing.join(", ")}`);
    }

    if (stale.length > 0) {
        fail(`Manifest contains stale entries with no route file: ${stale.join(", ")}`);
    }

    if (process.exitCode === 1) {
        process.exit(1);
    }

    console.log(
        `[route-ownership] OK: ${routeFiles.length} route files mapped in docs/backend/architecture/route-ownership.json`,
    );
}

main().catch((error) => {
    console.error("\n[route-ownership] ERROR: Unexpected failure");
    console.error(error);
    process.exit(1);
});