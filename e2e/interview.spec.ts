import { expect, test } from "@playwright/test";

import { seedApp } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedApp(page);
});

test("interview drill accepts an answer, reveals notes, and finishes", async ({ page }) => {
  await page.goto("/interview");

  await expect(
    page.getByRole("heading", { name: "Practice saying why, not just what." }),
  ).toBeVisible();
  await expect(page.getByText("12 drills")).toBeVisible();

  await page.getByText("Start drill", { exact: true }).first().click();
  await expect(page).toHaveURL(/\/interview\/personal-blog/);
  await expect(page.getByRole("heading", { name: "Personal Blog / Portfolio" })).toBeVisible();
  await expect(page).toHaveTitle("Personal Blog / Portfolio interview — ScaleLab");

  const answer = page
    .getByPlaceholder("Type the answer you would give in the interview...")
    .first();
  await answer.fill("I would add a CDN for static assets and more app instances for CPU headroom.");

  await page.getByRole("button", { name: "Compare with notes" }).first().click();
  await expect(page.getByText("Notes revealed")).toBeVisible();
  await expect(page.getByText("Model answer notes")).toBeVisible();

  const finish = page.getByRole("button", { name: "Finish attempt" });
  await expect(finish).toBeEnabled();
  await finish.click();

  await expect(page.getByText("Attempt finished")).toBeVisible();
  await expect(page.getByRole("button", { name: "New attempt" })).toBeVisible();
});
