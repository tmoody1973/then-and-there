// When the database is switched off (as on 2026-11-01, when the Convex team hit its spending
// limit), every query fails. The modes that ship their data with the site must keep working.
import { expect, type Page, test } from "@playwright/test";

const DISABLED = "You have exceeded your spending limits, so your deployments have been disabled.";
const u64 = (n: number) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b.toString("base64");
};

// A stand-in for the Convex sync socket that fails every query and mutation the way prod did.
async function databaseDown(page: Page) {
  await page.routeWebSocket(/\/api\/[\d.]+\/sync/, (ws) => {
    let ts = 0;
    ws.onMessage((raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "ModifyQuerySet") {
        const start = ts;
        ts += 1;
        const modifications = msg.modifications
          .filter((m: { type: string }) => m.type === "Add")
          .map((m: { queryId: number }) => ({ type: "QueryFailed", queryId: m.queryId, errorMessage: DISABLED, logLines: [], journal: null }));
        ws.send(JSON.stringify({
          type: "Transition",
          startVersion: { querySet: msg.baseVersion, identity: 0, ts: u64(start) },
          endVersion: { querySet: msg.newVersion, identity: 0, ts: u64(ts) },
          modifications,
        }));
      } else if (msg.type === "Mutation" || msg.type === "Action") {
        ws.send(JSON.stringify({ type: msg.type === "Mutation" ? "MutationResponse" : "ActionResponse", requestId: msg.requestId, success: false, result: DISABLED, logLines: [] }));
      }
    });
  });
}

const crashed = (page: Page) => page.getByText(/couldn.t load/i);

test("with the database down, the modes that ship their own data still play", async ({ page }) => {
  await databaseDown(page);
  for (const [path, heading] of [
    ["/forgery", /never printed/],
    ["/quests", /Great Migration/],
    ["/one-day/1906-04-18", /April 18, 1906/],
    ["/play", /race around the world/],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(crashed(page)).toHaveCount(0);
  }
});

test("with the database down, Today still offers the games", async ({ page }) => {
  await databaseDown(page);
  await page.goto("/");
  await page.waitForTimeout(1500);
  await expect(crashed(page)).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Play today's page/ })).toBeVisible();
});

test("with the database down, a screen that needs it says so plainly", async ({ page }) => {
  await databaseDown(page);
  await page.goto("/front-page");
  await expect(page.getByText(/archive desk is closed/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Spot the Forgery/ })).toBeVisible();
});
