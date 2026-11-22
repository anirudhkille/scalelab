import { expect, test } from "@playwright/test";

import { seedApp } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedApp(page);
});

test("hub, requirements sheet, learn, and not-found pages work", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Design it\. Break it\. Understand exactly why\./ }),
  ).toBeVisible();
  await expect(page.getByText("12 challenges")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Personal Blog / Portfolio" })).toBeVisible();
  await expect(page).toHaveTitle(/ScaleLab/);

  await page.getByText("Open the warm-up", { exact: true }).click();
  await expect(page).toHaveURL(/\/challenge\/personal-blog/);
  await expect(page.getByRole("heading", { name: "Personal Blog / Portfolio" })).toBeVisible();

  await page.getByRole("button", { name: "Requirements" }).click();
  const requirements = page.getByRole("dialog");
  await expect(requirements).toBeVisible();
  await expect(requirements.getByText("Target users")).toBeVisible();
  await expect(requirements.getByText("Monthly budget")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(requirements).toBeHidden();

  await page.getByRole("link", { name: "Learn", exact: true }).click();
  await expect(page).toHaveURL(/\/learn/);
  await expect(
    page.getByRole("heading", { name: "The ideas behind every failure report" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Caching", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "CDN", exact: true })).toBeVisible();

  await page.goto("/does-not-exist");
  await expect(page.getByRole("heading", { name: "Nothing routes here" })).toBeVisible();
  await expect(page).toHaveTitle("Page Not Found — ScaleLab");
  await page.getByText("Back to challenges", { exact: true }).click();
  await expect(page).toHaveURL("/");
});
