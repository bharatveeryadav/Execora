import { defineConfig, devices } from "@playwright/test";

const PLAYWRIGHT_PORT = 4174;
const SKIP_WEBSERVER = process.env.PW_SKIP_WEBSERVER === "1";

/**
 * Execora Web — Playwright config
 * Runs responsive + performance tests across desktop, tablet, and mobile viewports.
 *
 * Usage:
 *   pnpm test:e2e            → run all tests headlessly
 *   pnpm test:e2e:ui         → interactive UI mode
 *   pnpm test:e2e:report     → view last HTML report
 *
 * Make sure `pnpm dev` (port 8080) is running, or the webServer block will start it.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./tests/results",
  snapshotDir: "./tests/snapshots",

  /* How long each test can run */
  timeout: 30_000,
  expect: {
    /* Fail if a screenshot differs by more than 0.2% of pixels */
    toHaveScreenshot: { maxDiffPixelRatio: 0.002 },
    timeout: 8_000,
  },

  /* Run tests in parallel */
  workers: process.env.CI ? 2 : 4,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ["html", { outputFolder: "tests/html-report", open: "never" }],
    ["list"],
  ],

  use: {
    baseURL: `http://localhost:${PLAYWRIGHT_PORT}`,
    /* Capture evidence on failure */
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    /* ── Desktop ──────────────────────────────────── */
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "desktop-firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 900 },
      },
    },

    /* ── Laptop ───────────────────────────────────── */
    {
      name: "laptop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 768 },
      },
    },

    /* ── Tablet ───────────────────────────────────── */
    {
      name: "tablet-landscape",
      use: {
        ...devices["iPad Pro 11"],
        viewport: { width: 1194, height: 834 },
      },
    },
    {
      name: "tablet-portrait",
      use: {
        ...devices["iPad Pro 11"],
        viewport: { width: 834, height: 1194 },
      },
    },

    /* ── Mobile ───────────────────────────────────── */
    {
      name: "mobile-android",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "mobile-ios",
      use: { ...devices["iPhone 15 Pro"] },
    },
    {
      name: "mobile-s",
      use: {
        ...devices["Galaxy S5"],
        viewport: { width: 360, height: 640 },
      },
    },
  ],

  /* Auto-start dev server if not already running */
  webServer: SKIP_WEBSERVER
    ? undefined
    : {
        command: `pnpm --filter @execora/web dev -- --port ${PLAYWRIGHT_PORT}`,
        port: PLAYWRIGHT_PORT,
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
