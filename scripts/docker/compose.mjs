#!/usr/bin/env node

import {
    spawnSync
} from "node:child_process";

const userArgs = process.argv.slice(2);
const hasComposeFileFlag = userArgs.includes("-f") || userArgs.includes("--file");
const normalizedArgs = hasComposeFileFlag ?
    userArgs :
    ["-f", "infra/docker/docker-compose.yml", ...userArgs];

function run(command, args, options = {}) {
    return spawnSync(command, args, {
        stdio: "inherit",
        shell: process.platform === "win32",
        ...options,
    });
}

function hasDockerComposePlugin() {
    const result = spawnSync("docker", ["compose", "version"], {
        stdio: "ignore",
        shell: process.platform === "win32",
    });
    return result.status === 0;
}

function hasDockerComposeBinary() {
    const result = spawnSync("docker-compose", ["--version"], {
        stdio: "ignore",
        shell: process.platform === "win32",
    });
    return result.status === 0;
}

let cmd = null;
let args = [];

if (hasDockerComposePlugin()) {
    cmd = "docker";
    args = ["compose", ...normalizedArgs];
} else if (hasDockerComposeBinary()) {
    cmd = "docker-compose";
    args = normalizedArgs;
} else {
    console.error(
        "Docker Compose was not found. Install Docker Desktop or docker-compose before running this command.",
    );
    process.exit(1);
}

const result = run(cmd, args);
process.exit(result.status ? ? 1);