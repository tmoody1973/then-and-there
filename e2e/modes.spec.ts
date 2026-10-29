import { expect, test } from "@playwright/test";

test("One Day shows three papers, and switching to 'only what changed' quiets the wire copy", async ({ page }) => {
  await page.goto("/one-day");
  await expect(page.locator(".od-paper")).toHaveCount(3);
  await page.getByRole("button", { name: "Only what changed" }).click();
  await expect(page.getByRole("button", { name: "Only what changed" })).toHaveAttribute("aria-pressed", "true");
  const wire = page.locator(".od-mark.is-wire");
  if (await wire.count()) await expect(wire.first()).toHaveClass(/is-quiet/);
});

test("when the Library's image server is down, One Day still links every page", async ({ page }) => {
  await page.route("https://tile.loc.gov/**", (route) => route.abort());
  await page.goto("/one-day");
  const fallbacks = page.locator(".od-paper > a .od-fallback");
  await expect(fallbacks).toHaveCount(3);
  await expect(page.locator(".od-paper > a[href*='loc.gov']")).toHaveCount(3);
});

test("a Forgery round: pick, lock in, see the real ad, and a reload keeps the answer", async ({ page }) => {
  await page.goto("/forgery");
  await expect(page.getByRole("button", { name: "Pick a part first" })).toBeDisabled();
  await page.locator(".fg-pick").nth(1).click();
  await page.getByRole("button", { name: /Lock in part 2/ }).click();
  await expect(page.locator(".fg-result h2")).toBeVisible();
  await expect(page.getByAltText("The advertisement as the paper really printed it")).toBeVisible();
  await page.reload();
  await expect(page.locator(".fg-result h2")).toBeVisible();
  await expect(page.locator(".fg-pick").first()).toBeDisabled();
});
