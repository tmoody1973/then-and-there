import { defineConfig, devices } from "@playwright/test";

// E2E runs against the local app + local Convex with published days (not in CI: needs live data).
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { ...devices["iPhone 13"], browserName: "chromium", baseURL: "http://localhost:3000" },
  webServer: { command: "bun run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
