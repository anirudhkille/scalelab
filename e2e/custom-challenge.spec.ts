import { expect, test } from "@playwright/test";

import { seedApp } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedApp(page);
});

test("custom challenge can be created, opened, and deleted", async ({ page }) => {
  await page.goto("/custom");

  await expect(page.getByRole("heading", { name: "Build a custom challenge" })).toBeVisible();
  await page.locator("#custom-title").fill("E2E Custom Service");
  await page.getByRole("button", { name: "Save and open" }).click();

  await expect(page).toHaveURL(/\/challenge\/custom-[0-9a-f-]+/);
  await expect(page.getByRole("heading", { name: "E2E Custom Service" })).toBeVisible();
  await expect(page).toHaveTitle("E2E Custom Service — ScaleLab");
  await expect(page.locator(".react-flow__node")).toHaveCount(5);

  await page.goto("/custom");
  await expect(page.getByRole("heading", { name: "Saved challenges" })).toBeVisible();
  await expect(page.getByText("E2E Custom Service", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Delete E2E Custom Service" }).click();
  await expect(page.getByText("Nothing saved yet. Build one above or import JSON.")).toBeVisible();
});
