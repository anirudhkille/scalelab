import type { Page } from "@playwright/test";

export async function seedApp(page: Page): Promise<void> {
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
}
