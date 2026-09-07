import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const runFirefox = process.env.CI === "true" || process.env.PLAYWRIGHT_FIREFOX === "1";
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 4,
  // The PWA has a dedicated production suite. Keep general E2E contexts free
  // from persistent workers so browser teardown is deterministic.
  use: { baseURL: externalBaseUrl ?? `http://127.0.0.1:${port}`, trace: "on-first-retry", serviceWorkers: "block" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    ...(runFirefox ? [{ name: "desktop-firefox", use: { ...devices["Desktop Firefox"] } }] : []),
    { name: "desktop-webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
  // tests/e2e/run.mjs owns the local production server on Windows and always
  // supplies PLAYWRIGHT_BASE_URL. Direct `playwright test` remains available
  // for an explicitly supplied external environment.
  webServer: undefined,
});
