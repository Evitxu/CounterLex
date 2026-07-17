import { defineConfig, devices } from "@playwright/test";

// E2E config. The tests drive the real UI in a browser (a modern, less-flaky
// alternative to Selenium — auto-waiting, no manual sleeps).
//
// The frontend is started by Playwright (webServer below). The BACKEND API must
// already be running at http://localhost:8000:
//   - Locally: start it first (see the backend branch / launch skill), then
//     `npm run e2e`.
//   - CI: the workflow (.github/workflows/e2e.yml) checks out the backend branch,
//     starts uvicorn, and sets NEXT_PUBLIC_API_BASE before running the tests.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_API_BASE: API_BASE },
  },
});