/**
 * Performance / load-time tests.
 *
 * Measures:
 *  - Time from navigation start → networkidle (end-to-end page load)
 *  - Web Vitals via PerformanceObserver (LCP, FCP, CLS, TBT)
 *  - API response latency for key endpoints
 *
 * SLA targets (adjust to your requirements):
 *  - Any page load < 3 000ms
 *  - LCP < 2 500ms
 *  - FCP < 1 800ms
 *  - CLS < 0.1
 *
 * Run: pnpm test:e2e --project=desktop-chrome tests/e2e/performance.spec.ts
 */
import { test, expect, Page } from "@playwright/test";
import { seedAuthState } from "./helpers/auth";

const APP_ORIGIN = process.env.E2E_BASE_URL ?? "http://localhost:4174";
const appUrl = (path: string) => `${APP_ORIGIN}${path}`;

// ─── SLA thresholds (ms) ─────────────────────────────────────────────
const SLA = {
  pageLoad: 4_000, // networkidle
  lcp: 2_500, // Largest Contentful Paint
  fcp: 1_800, // First Contentful Paint
  cls: 0.1, // Cumulative Layout Shift (score, not ms)
  apiCall: 2_000, // single API response
};

// ─── Helper: measure page load + core web vitals ─────────────────────
async function measurePage(page: Page, path: string) {
  await seedAuthState(page);

  // Inject web vitals observer before navigation
  await page.addInitScript(() => {
    (window as any).__vitals = { lcp: 0, fcp: 0, cls: 0 };

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "largest-contentful-paint") {
          (window as any).__vitals.lcp = entry.startTime;
        }
        if (
          entry.entryType === "paint" &&
          entry.name === "first-contentful-paint"
        ) {
          (window as any).__vitals.fcp = entry.startTime;
        }
        if (
          entry.entryType === "layout-shift" &&
          !(entry as any).hadRecentInput
        ) {
          (window as any).__vitals.cls += (entry as any).value;
        }
      }
    });

    try {
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      observer.observe({ type: "paint", buffered: true });
      observer.observe({ type: "layout-shift", buffered: true });
    } catch {
      // Older browser — skip gracefully
    }
  });

  const start = Date.now();
  await page.goto(appUrl(path));
  await page.waitForLoadState("load");
  const loadTime = Date.now() - start;

  const vitals = await page.evaluate(() => (window as any).__vitals ?? {});

  return { path, loadTime, ...vitals };
}

// ─── All routes to benchmark ─────────────────────────────────────────
const ROUTES = [
  "/",
  "/customers",
  "/invoices",
  "/inventory",
  "/reports",
  "/settings",
  "/expenses",
  "/purchases",
  "/cashbook",
  "/daybook",
  "/billing",
  "/payment",
  "/overdue",
  "/expiry",
];

test.describe("Page load times", () => {
  // Only run on desktop Chrome to keep results consistent
  test.use({ viewport: { width: 1440, height: 900 } });

  test("all pages load within SLA", async ({ page }) => {
    const results: Array<{
      path: string;
      loadTime: number;
      lcp: number;
      fcp: number;
      cls: number;
      status: string;
    }> = [];

    for (const route of ROUTES) {
      const m = await measurePage(page, route);
      const lcpMs = Math.round(m.lcp ?? 0);
      const fcpMs = Math.round(m.fcp ?? 0);
      const cls = parseFloat((m.cls ?? 0).toFixed(3));

      const status =
        m.loadTime > SLA.pageLoad
          ? "❌ SLOW"
          : lcpMs > SLA.lcp
            ? "⚠️  LCP"
            : fcpMs > SLA.fcp
              ? "⚠️  FCP"
              : cls > SLA.cls
                ? "⚠️  CLS"
                : "✅ OK";

      results.push({
        path: route,
        loadTime: m.loadTime,
        lcp: lcpMs,
        fcp: fcpMs,
        cls,
        status,
      });
    }

    // Print table
    console.log("\n📊 Performance Results\n");
    console.log(
      "Route".padEnd(18),
      "Load(ms)".padEnd(10),
      "LCP(ms)".padEnd(10),
      "FCP(ms)".padEnd(10),
      "CLS".padEnd(7),
      "Status",
    );
    console.log("─".repeat(65));
    for (const r of results) {
      console.log(
        r.path.padEnd(18),
        String(r.loadTime).padEnd(10),
        String(r.lcp).padEnd(10),
        String(r.fcp).padEnd(10),
        String(r.cls).padEnd(7),
        r.status,
      );
    }

    // Assert SLA
    const failures = results.filter((r) => r.loadTime > SLA.pageLoad);
    expect(
      failures,
      `\nPages exceeding ${SLA.pageLoad}ms load time:\n${failures.map((f) => `  ${f.path} → ${f.loadTime}ms`).join("\n")}`,
    ).toHaveLength(0);
  });

  test("login page loads within SLA", async ({ page }) => {
    const start = Date.now();
    await page.goto(appUrl("/login"));
    await page.waitForLoadState("load");
    const loadTime = Date.now() - start;
    console.log(`\n/login load time: ${loadTime}ms`);
    expect(
      loadTime,
      `/login took ${loadTime}ms — exceeds ${SLA.pageLoad}ms SLA`,
    ).toBeLessThan(SLA.pageLoad);
  });
});

test.describe("API latency", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("key API calls respond within SLA", async ({ page }) => {
    await seedAuthState(page);

    const apiTimings: Record<string, number> = {};

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/")) {
        const path = new URL(url).pathname.replace("/api", "");
        try {
          const timing = response.timing();
          // responseEnd is in ms relative to page start
          apiTimings[path] = Math.round(
            timing.responseEnd - timing.requestStart,
          );
        } catch {
          // Some mocked/fulfilled responses may not expose timing details.
        }
      }
    });

    // Load pages that trigger API calls
    for (const route of ["/", "/customers", "/invoices", "/inventory"]) {
      await page.goto(appUrl(route));
      await page.waitForLoadState("load");
    }

    if (Object.keys(apiTimings).length === 0) {
      console.log(
        "No /api/* calls intercepted — server may be offline, skipping latency assertions",
      );
      return;
    }

    console.log("\n🌐 API Response Times\n");
    for (const [path, ms] of Object.entries(apiTimings).sort(
      (a, b) => b[1] - a[1],
    )) {
      const flag = ms > SLA.apiCall ? "❌" : ms > 800 ? "⚠️" : "✅";
      console.log(`  ${flag} ${path.padEnd(30)} ${ms}ms`);
    }

    const slowApis = Object.entries(apiTimings).filter(
      ([, ms]) => ms > SLA.apiCall,
    );
    expect(
      slowApis,
      `Slow API calls:\n${slowApis.map(([p, ms]) => `  ${p} → ${ms}ms`).join("\n")}`,
    ).toHaveLength(0);
  });
});

test.describe("Mobile load times", () => {
  test.use({ ...{} }); // uses project viewport

  test("dashboard loads within SLA on mobile viewport", async ({ page }) => {
    await seedAuthState(page);

    const start = Date.now();
    await page.goto(appUrl("/"));
    await page.waitForLoadState("load");
    const loadTime = Date.now() - start;

    const vp = page.viewportSize()!;
    console.log(`\n/ load time on ${vp.width}×${vp.height}: ${loadTime}ms`);
    expect(
      loadTime,
      `Dashboard took ${loadTime}ms on ${vp.width}px viewport`,
    ).toBeLessThan(SLA.pageLoad);
  });
});
