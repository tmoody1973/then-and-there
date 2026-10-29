import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

type Day = { day: number; status: string; question: { kind: string; options?: string[] } };
const days = JSON.parse(readFileSync("data/game/days.json", "utf8")) as Day[];
const published = days.filter((d) => d.status === "published");
const first = published[0];

test("plays the first stop of the case, and a reload can't re-answer", async ({ page }) => {
  await page.goto("/play");
  await expect(page.locator(".clue-summary")).toBeVisible();
  await page.locator(".case-option").first().click();
  await expect(page.locator(".case-verdict")).toBeVisible();
  await expect(page.locator(".dateline")).toContainText(/(80|77) days left/);
  await page.reload();
  await expect(page.locator(".case-verdict")).toBeVisible();
  await expect(page.locator(".case-option").first()).toBeDisabled();
  await page.getByRole("button", { name: /Follow her to/ }).click();
  await expect(page.locator(".trail-dots .is-here")).toHaveCount(1);
});

test("asking the City Editor costs a day and shows the nudge", async ({ page }) => {
  await page.goto("/play");
  await page.getByRole("button", { name: /Ask the City Editor/ }).click();
  await expect(page.locator(".editor-text")).toBeVisible();
});

test("a locked day never sends its answer to the browser", async ({ page }) => {
  // Watch the live database connection, not just the HTML: a leak would arrive here.
  const frames: string[] = [];
  page.on("websocket", (ws) => ws.on("framereceived", (f) => frames.push(String(f.payload))));
  await page.clock.setFixedTime(new Date("2026-10-30T12:00:00"));
  await page.goto(`/play/${first.day}`);
  await expect(page.getByText("hasn't come over the wire yet")).toBeVisible();
  await page.waitForTimeout(1500);
  const seen = (await page.content()) + frames.join("\n");
  for (const option of first.question.options ?? []) expect(seen).not.toContain(option);
});

test("when the Library's image server is down, the clue still reads", async ({ page }) => {
  await page.route("https://tile.loc.gov/**", (route) => route.abort());
  await page.goto("/play");
  await expect(page.locator(".clue-summary")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open this page at loc.gov" }).first()).toBeVisible();
});
