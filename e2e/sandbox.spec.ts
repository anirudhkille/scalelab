import { expect, test } from "@playwright/test";

import { seedApp } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedApp(page);
});

test("sandbox is width-constrained and runs a reference design", async ({ page }) => {
  await page.goto("/sandbox");

  await expect(page.getByRole("heading", { name: "Arbitrary load" })).toBeVisible();
  await expect(page.getByText("Adjust the load and run the sandbox.")).toBeVisible();

  const shell = page.locator("main .max-w-6xl").first();
  const box = await shell.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) {
    throw new Error("Expected the sandbox shell and viewport to be measurable");
  }
  expect(box.width).toBeLessThanOrEqual(1152);
  expect(box.width).toBeLessThan(viewport.width);

  await page.getByRole("button", { name: "Run sandbox" }).click();
  await expect(page.getByText(/^(Passed|Failed) at /)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Target (met|missed)/)).toBeVisible();
  await expect(page.getByText(/In budget|Over budget/)).toBeVisible();
  await expect(page.getByRole("img", { name: /of 3 stars/ })).toBeVisible();
});
