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

test("a Quest source: answer it, read what the guide noticed, and a blank answer can't be sent", async ({ page }) => {
  await page.goto("/quests");
  await expect(page.getByRole("button", { name: "Send answer" })).toBeDisabled();
  await page.locator("#qs-answer").fill("   ");
  await expect(page.getByRole("button", { name: "Send answer" })).toBeDisabled();
  await page.locator("#qs-answer").fill("To reach families still in the South.");
  await page.getByRole("button", { name: "Send answer" }).click();
  await expect(page.getByText("What the guide noticed")).toBeVisible();
  await page.getByRole("button", { name: /Next source/ }).click();
  await expect(page.locator(".qs-slug")).toContainText("Source 2");
  await page.reload();
  await expect(page.locator(".qs-slug")).toContainText("Source 2");
});
