import { defineConfig, devices } from "@playwright/test";

// E2E runs against the local app + local Convex with published days (not in CI: needs live data).
// BASE_URL=https://… runs the same tests against a deployed site instead.
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { ...devices["iPhone 13"], browserName: "chromium", baseURL },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "bun run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
