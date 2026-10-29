import { expect, test } from "@playwright/test";

test("a front page round: reveal a clue, guess, and only then see the answer", async ({ page }) => {
  const answers: string[] = [];
  page.on("websocket", (ws) => ws.on("framereceived", (f) => answers.push(String(f.payload))));
  await page.goto("/front-page/1");
  await expect(page.locator(".fp-board")).toBeVisible();
  await expect(page.locator(".fp-slot.is-shown")).toHaveCount(1);
  await expect(page.locator(".dateline")).toContainText("1,000 pts");

  // Before the guess, nothing the browser received names the page.
  const before = answers.join("\n");
  expect(before).not.toContain("tile.loc.gov");
  expect(before).not.toContain("citeThis");

  await page.getByRole("button", { name: /Reveal next clue/ }).click();
  await expect(page.locator(".fp-slot.is-shown")).toHaveCount(2);
  await expect(page.locator(".dateline")).toContainText("850 pts");
  await expect(page.locator(".fp-reader")).toContainText("Clue 2");

  await page.getByRole("radio", { name: "Midwest" }).check();
  await page.getByRole("button", { name: "Lock in guess" }).click();
  await expect(page.locator(".fp-answer")).toBeVisible();
  await expect(page.locator(".fp-known li")).toHaveCount(6);
  await expect(page.locator(".fp-score")).toContainText("2 of 6");

  // A reload keeps the locked guess.
  await page.reload();
  await expect(page.locator(".fp-answer")).toBeVisible();
});
