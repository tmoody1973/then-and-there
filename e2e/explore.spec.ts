import { expect, test } from "@playwright/test";

test("searching \"Bly\" shows stories with a scan, a text label and a Cite button", async ({ page }) => {
  await page.goto("/explore");
  await page.getByLabel("Search the processed pages").fill("Bly");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.locator(".wire-count")).toContainText("for “Bly”");
  await page.locator(".wire-row").first().click();
  const pulled = page.locator(".pulled");
  await expect(pulled.locator(".scan")).toBeVisible();
  await expect(pulled.locator(".labels")).toContainText(/Machine-repaired text|Archive OCR text/);
  await pulled.getByRole("button", { name: "Cite" }).click();
  await expect(pulled.locator(".cite-list")).toContainText("MLA");
});

test("the first screen shows story shelves before any search", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.locator(".shelf h2").first()).toBeVisible();
  expect(await page.locator(".shelf").count()).toBeGreaterThanOrEqual(3);
});

test("following a place from a story lists it on Your Desk, and Forget everything empties it", async ({ page }) => {
  await page.goto("/explore");
  await page.locator(".shelf").first().locator(".wire-row").first().click();
  const follow = page.locator(".pulled").getByRole("button", { name: /^Follow (Milwaukee|Detroit|Wisconsin|Michigan)/ }).first();
  const label = (await follow.innerText()).replace(/^Follow /, "");
  await follow.click();
  await expect(page.locator(".pulled")).toContainText(`Following ${label}`);
  await page.goto("/desk");
  await expect(page.locator(".follow-list")).toContainText(label);
  await page.getByRole("button", { name: "Forget everything" }).click();
  await page.getByRole("button", { name: "Delete everything" }).click();
  await expect(page.locator(".follow-list")).toHaveCount(0);
});

test("a saved story appears on Your Desk and can be removed", async ({ page }) => {
  await page.goto("/explore");
  await page.locator(".shelf").first().locator(".wire-row").first().click();
  await page.locator(".pulled").getByRole("button", { name: "Save to your desk" }).click();
  await page.goto("/desk");
  const saved = page.locator('section[aria-labelledby="saved-h"] .desk-clip');
  await expect(saved).toHaveCount(1);
  await page.getByRole("button", { name: "Remove from your desk" }).click();
  await expect(saved).toHaveCount(0);
});

test("when the image server is down, a story still shows its text and citation", async ({ page }) => {
  await page.route("https://tile.loc.gov/**", (route) => route.abort());
  await page.goto("/explore");
  await page.locator(".wire-row").first().click();
  await expect(page.locator(".pulled .transcript")).not.toBeEmpty();
  await expect(page.locator(".pulled").getByRole("link", { name: "Open this page at loc.gov" })).toBeVisible();
});
