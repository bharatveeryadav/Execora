import { Page } from "@playwright/test";

const TOKEN_KEY = "execora_token";
const REFRESH_KEY = "execora_refresh";
const USER_KEY = "execora_user";

const DEFAULT_USER = {
  id: "test-user",
  tenantId: "test-tenant",
  email: "test@execora.app",
  name: "Test User",
  role: "admin",
  permissions: ["*"],
};

/**
 * If your app uses JWT stored in localStorage, load it here.
 * If you have a real test account, fill in TEST_EMAIL / TEST_PASSWORD.
 *
 * For layout-only responsive tests we bypass auth by injecting a fake token
 * so ProtectedRoute doesn't redirect to /login.
 */
export async function loginAsTestUser(page: Page) {
  await page.goto("/login");

  // Try env-based credentials, fall back to demo login if they exist
  const email = process.env.TEST_EMAIL ?? "demo@execora.app";
  const password = process.env.TEST_PASSWORD ?? "demo1234";

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /log in|sign in/i }).click();

  // Wait until we land on the dashboard
  await page.waitForURL("/", { timeout: 15_000 });
}

/**
 * Inject a fake auth token directly into localStorage so we skip the login page
 * and all protectedRoute checks pass. Only use this for visual / layout tests.
 */
export async function injectFakeAuth(page: Page) {
  const APP_ORIGIN = process.env.E2E_BASE_URL ?? "http://localhost:4174";
  await page.goto(`${APP_ORIGIN}/`);
  await page.evaluate(() => {
    localStorage.setItem("execora_token", "test-token-playwright");
    localStorage.setItem("execora_refresh", "test-refresh-playwright");
    localStorage.setItem(
      "execora_user",
      JSON.stringify({
        id: "test-user",
        tenantId: "test-tenant",
        email: "test@execora.app",
        name: "Test User",
        role: "admin",
        permissions: ["*"],
      }),
    );
  });
  await page.reload();
}

/**
 * Intercept all /api/** requests and return empty-success responses.
 * This prevents the real backend from receiving an invalid test JWT (which
 * would return 401 → clearAuthStorage() → redirect to /login).
 *
 * Must be called before page.goto() so the route handler is registered first.
 */
export async function mockApiRoutes(page: Page) {
  await page.route("/api/**", async (route) => {
    const url = route.request().url();
    const path = new URL(url).pathname;
    const method = route.request().method();
    let body = "{}";

    if (method === "GET") {
      if (path.includes("/summary/daily") || path.includes("/summary/range")) {
        body = JSON.stringify({ summary: {} });
      } else if (path.includes("/cashbook")) {
        body = JSON.stringify({
          entries: [],
          totalIn: 0,
          totalOut: 0,
          balance: 0,
        });
      } else if (path.includes("/expenses")) {
        body = JSON.stringify({ expenses: [], total: 0, count: 0 });
      } else if (path.includes("/purchases")) {
        body = JSON.stringify({ purchases: [], total: 0, count: 0 });
      } else if (path.includes("/customers")) {
        body = JSON.stringify({ customers: [] });
      } else if (path.includes("/invoices")) {
        body = JSON.stringify({ invoices: [] });
      } else if (path.includes("/products")) {
        body = JSON.stringify({ products: [] });
      } else {
        body = JSON.stringify({});
      }
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body,
    });
  });
  // Also intercept WebSocket upgrade attempts so wsClient doesn't spam errors
  await page.route("/ws**", (route) => route.abort());
}

export async function seedAuthState(page: Page) {
  // addInitScript fires before the page's own JS on every navigation —
  // this guarantees localStorage is populated before React's AuthContext
  // mounts and reads it, eliminating any race conditions.
  await page.addInitScript(
    ({ tokenKey, refreshKey, userKey, token, refresh, user }) => {
      localStorage.setItem(tokenKey, token);
      localStorage.setItem(refreshKey, refresh);
      localStorage.setItem(userKey, user);
    },
    {
      tokenKey: TOKEN_KEY,
      refreshKey: REFRESH_KEY,
      userKey: USER_KEY,
      token: "test-token-playwright",
      refresh: "test-refresh-playwright",
      user: JSON.stringify(DEFAULT_USER),
    },
  );

  // Prevent the real backend from receiving the fake JWT and returning 401
  // (which would clear localStorage and trigger /login redirect).
  await mockApiRoutes(page);
}
