/**
 * Feature smoke tests — verify key interactive features work across viewports.
 *
 * These are lightweight "does it not crash" tests, not deep integration tests.
 * They run on all Playwright projects (desktop, tablet, mobile).
 *
 * Run: pnpm test:e2e tests/e2e/features.spec.ts
 */
import { test, expect } from "@playwright/test";
import { seedAuthState } from "./helpers/auth";

const APP_ORIGIN = process.env.E2E_BASE_URL ?? "http://localhost:4174";
const appUrl = (path: string) => `${APP_ORIGIN}${path}`;

test.beforeEach(async ({ page }) => {
  await seedAuthState(page);
});

test.describe("Dashboard", () => {
  test("renders summary cards", async ({ page }) => {
    await page.goto(appUrl("/"));
    await page.waitForLoadState("networkidle");
    // At least one card/stat block should be present
    const cards = page.locator(
      '[class*="card"], [class*="Card"], [data-testid*="stat"]',
    );
    await expect(cards.first()).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Customers", () => {
  test("customer list loads", async ({ page }) => {
    await page.goto(appUrl("/customers"));
    await page.waitForLoadState("load");
    // The page heading confirms we're on the right authenticated page
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 8_000 });
    expect(page.url()).not.toContain("/login");
  });

  test("search input is focusable", async ({ page }) => {
    await page.goto(appUrl("/customers"));
    await page.waitForLoadState("load");
    const searchInput = page
      .locator(
        'input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]',
      )
      .first();
    if ((await searchInput.count()) > 0) {
      await searchInput.click();
      await searchInput.fill("test");
      await expect(searchInput).toHaveValue("test");
    }
  });
});

test.describe("Invoices", () => {
  test("invoices page loads", async ({ page }) => {
    await page.goto(appUrl("/invoices"));
    await page.waitForLoadState("load");
    expect(page.url()).not.toContain("/login");
    await expect(page.locator("h1, h2").first()).toBeVisible({
      timeout: 8_000,
    });
  });
});

test.describe("Inventory", () => {
  test("inventory page loads", async ({ page }) => {
    await page.goto(appUrl("/inventory"));
    await page.waitForLoadState("load");
    expect(page.url()).not.toContain("/login");
    await expect(page.locator("h1, main").first()).toBeVisible({
      timeout: 8_000,
    });
  });
});

test.describe("Classic Billing", () => {
  test("billing page renders", async ({ page }) => {
    await page.goto(appUrl("/billing"));
    await page.waitForLoadState("load");
    expect(page.url()).not.toContain("/login");
    await expect(page.locator("h1, main").first()).toBeVisible({
      timeout: 8_000,
    });
  });
});

test.describe("Settings", () => {
  test("settings page renders", async ({ page }) => {
    await page.goto(appUrl("/settings"));
    await page.waitForLoadState("load");
    expect(page.url()).not.toContain("/login");
    await expect(
      page.locator('form, [class*="setting"], h1, h2').first(),
    ).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Reports", () => {
  test("reports page renders charts or data", async ({ page }) => {
    await page.goto(appUrl("/reports"));
    await page.waitForLoadState("load");
    expect(page.url()).not.toContain("/login");
    await expect(page.locator("h1, main").first()).toBeVisible({
      timeout: 8_000,
    });
  });
});

test.describe("Login", () => {
  // Login tests need to view the login form unauthenticated.
  // The beforeEach addInitScript sets tokens, so we override it here.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("execora_token");
      localStorage.removeItem("execora_refresh");
      localStorage.removeItem("execora_user");
    });
  });

  test("login form has email/phone and password fields", async ({ page }) => {
    await page.goto(appUrl("/login"));
    await page.waitForLoadState("load");
    const emailOrPhone = page
      .locator(
        'input[type="email"], input[type="tel"], input[name="email"], input[name="phone"]',
      )
      .first();
    const password = page.locator('input[type="password"]').first();
    await expect(emailOrPhone).toBeVisible();
    await expect(password).toBeVisible();
  });

  test("shows error on wrong credentials", async ({ page }) => {
    // Override the global 200 mock: login endpoint must return 401 for wrong creds
    await page.route("**/api/v1/auth/login", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Invalid credentials" }),
      }),
    );
    await page.goto(appUrl("/login"));
    await page.waitForLoadState("domcontentloaded");

    const emailOrPhone = page
      .locator(
        'input[type="email"], input[type="tel"], input[name="email"], input[name="phone"]',
      )
      .first();
    const password = page.locator('input[type="password"]').first();
    const submit = page.locator('button[type="submit"]').first();

    await emailOrPhone.fill("wrong@test.com");
    await password.fill("wrongpassword");
    await submit.click();

    // Should show some error — toast, alert, or inline message
    await expect(
      page
        .locator(
          'p.text-destructive, [role="alert"], [class*="toast"], [data-sonner-toast]',
        )
        .first(),
    ).toBeVisible({ timeout: 8_000 });
  });
});
