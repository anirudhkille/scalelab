import { expect, test } from "@playwright/test";

import { seedApp } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedApp(page);
});

test("progress page shows an empty state, exports, and resets with confirmation", async ({
  page,
}) => {
  await page.goto("/progress");

  await expect(page.getByRole("heading", { name: "Progress & attempts" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No runs yet" })).toBeVisible();
  await expect(page.getByText("0 attempts")).toBeVisible();
  await expect(page.getByText("0/36 stars")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^scalelab-progress-\d{4}-\d{2}-\d{2}\.json$/);

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByRole("heading", { name: "Reset local data?" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Reset local data?" })).toBeHidden();

  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByRole("button", { name: "Reset everything" }).click();
  await expect(page.getByRole("heading", { name: "No runs yet" })).toBeVisible();
});
