import { expect, test } from "@playwright/test";

test("place a component, run a load test, and see the failure report", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "scalelab:v1",
      JSON.stringify({
        state: {
          settings: {
            theme: "midnight",
            simSpeed: 10,
            reducedMotion: "on",
            particles: false,
            onboardingComplete: true,
          },
        },
        version: 1,
      }),
    );
  });

  await page.goto("/challenge/personal-blog");

  await expect(page.getByRole("heading", { name: "Personal Blog / Portfolio" })).toBeVisible();

  const nodes = page.locator(".react-flow__node");
  await expect(nodes).toHaveCount(5);

  const firstNode = nodes.first();
  const before = await firstNode.boundingBox();
  if (!before) {
    throw new Error("Expected the first node to be visible");
  }

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 3, before.y + before.height / 2 + 3);
  await page.mouse.up();

  const after = await firstNode.boundingBox();
  expect(after?.x).toBeCloseTo(before.x, 0);
  expect(after?.y).toBeCloseTo(before.y, 0);

  await page.getByRole("button", { name: "Add Cache" }).click();
  await expect(nodes).toHaveCount(6);

  await page.keyboard.press("Control+z");
  await expect(nodes).toHaveCount(5);

  await page.getByRole("button", { name: "Run load test" }).click();

  await expect(page.getByText("Run failed")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Your system fell over at .* users\./)).toBeVisible();
  await expect(page.getByText("PRIMARY BOTTLENECK")).toBeVisible();
});
