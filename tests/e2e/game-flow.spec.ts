import { expect, test } from "@playwright/test";
import path from "node:path";

const screenshots = path.resolve("docs/screenshots");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { name: "wh0re" })).toBeVisible();
});

test("hub fits every supported viewport without overflow", async ({ page }) => {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    minimumTarget: Math.min(
      ...[...document.querySelectorAll("button")].map((button) =>
        Math.min(button.getBoundingClientRect().width, button.getBoundingClientRect().height),
      ),
    ),
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight);
  expect(metrics.minimumTarget).toBeGreaterThanOrEqual(44);
});

test("complete Lola mission survives reload and unlocks a message", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "The canonical screenshot flow runs at 390 × 844.");

  await expect(page.locator('.world-host[data-ready="true"]')).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, "01-hub.png") });
  await page.getByRole("button", { name: "Auftrag ansehen" }).click();
  await expect(page.getByRole("heading", { name: "Cocktail-Kurier" })).toBeVisible();
  await page.locator(".job-card .avatar").evaluate(async (element) => {
    await (element as HTMLImageElement).decode();
  });
  await page.screenshot({ path: path.join(screenshots, "02-missions.png") });

  await page.getByTestId("start-lola-cocktail-01").click();
  const character = page.locator(".character-art");
  await expect(character).toHaveAttribute("data-reaction", "neutral");
  await page.screenshot({ path: path.join(screenshots, "03-pickup-neutral.png") });

  await page.locator('[data-choice-id="cocktail-ready"]').click();
  await expect(character).toHaveAttribute("data-reaction", "positive");
  await page.screenshot({ path: path.join(screenshots, "04-positive-reaction.png") });

  await expect(page.getByRole("heading", { name: "Route wählen" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Route wählen" })).toBeVisible();
  await page.getByTestId("route-pool-yacht-coast").click();

  await expect(page.getByRole("button", { name: "Fahrt überspringen" })).toBeEnabled();
  await page.screenshot({ path: path.join(screenshots, "05-travel.png") });
  await page.locator('[data-choice-id="viewpoint"]').click();
  await page.getByRole("button", { name: "Fahrt überspringen" }).click();

  await expect(page.getByText("Du bist wirklich schnell. Gefällt mir. Was nun?")).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, "06-arrival.png") });
  await page.locator('[data-choice-id="direct-return"]').click();
  await expect(page.getByText("AUFTRAG ABGESCHLOSSEN")).toBeVisible();
  await expect(page.locator(".hud-metric.cash .hud-metric__value")).toHaveText("2.500");
  await expect(page.locator(".hud-metric.fans .hud-metric__value")).toHaveText("330");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Mitternachts-Eis" })).toBeVisible();
  await expect(page.locator(".hud-metric.cash .hud-metric__value")).toHaveText("2.500");

  await page.getByRole("button", { name: "✉ Nachrichten" }).click();
  await expect(page.getByText("Okay, das war besser als erwartet.")).toBeVisible();
  await page.getByText("Okay, das war besser als erwartet.").click();
  await expect(page.getByText("Ich brauche später Eis am Pool. Kein Drama, nur gutes Timing.")).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, "08-smartphone-message.png") });
});

test("all three Lola missions are playable without a softlock", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "The complete progression flow runs once.");
  test.setTimeout(90_000);
  const runs = [
    {
      mission: "lola-cocktail-01",
      pickup: "cocktail-ready",
      route: "pool-yacht-coast",
      travel: "viewpoint",
      encounter: "direct-return",
    },
    {
      mission: "lola-ice-02",
      pickup: "cooler-ready",
      route: "yacht-pool-coast",
      travel: "her-playlist",
      encounter: "check-cooler",
    },
    {
      mission: "lola-playlist-03",
      pickup: "sealed-pouch",
      route: "pool-yacht-coast",
      travel: "eyes-road",
      encounter: "trust-matters",
    },
  ];

  for (const run of runs) {
    await page.getByRole("button", { name: "Auftrag ansehen" }).click();
    await page.getByTestId(`start-${run.mission}`).click();
    await page.locator(`[data-choice-id="${run.pickup}"]`).click();
    await expect(page.getByRole("heading", { name: "Route wählen" })).toBeVisible();
    await page.getByTestId(`route-${run.route}`).click();
    await expect(page.getByRole("button", { name: "Fahrt überspringen" })).toBeEnabled();
    await page.locator(`[data-choice-id="${run.travel}"]`).click();
    await page.getByRole("button", { name: "Fahrt überspringen" }).click();
    await page.locator(`[data-choice-id="${run.encounter}"]`).click();
    await expect(page.getByText("AUFTRAG ABGESCHLOSSEN")).toBeVisible();
    await page.getByRole("button", { name: "Zur Inselkarte" }).click();
  }

  await expect(page.getByRole("heading", { name: "Du bist jetzt Insider." })).toBeVisible();
  await expect(page.getByText("Alle drei Lola-Aufträge sind abgeschlossen.")).toBeVisible();
});

test("reload restores a genuinely different negative reaction", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "The reaction screenshot runs once.");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "island-runner-save",
      JSON.stringify({
        version: 1,
        resources: { cash: 4_300, fans: 510, heat: 8 },
        relationships: { lola: { attraction: 28, trust: 34, mood: 43 } },
        flags: ["lola_cocktail_complete", "lola_ice_complete"],
        completedMissions: ["lola-cocktail-01", "lola-ice-02"],
        messages: [
          { id: "lola-intro", read: true, unlockedAt: 1 },
          { id: "lola-after-cocktail", read: true, unlockedAt: 2 },
          { id: "lola-after-ice", read: false, unlockedAt: 3 },
        ],
        activeMission: {
          missionId: "lola-playlist-03",
          phase: "encounter",
          selectedPickupChoice: "sealed-pouch",
          selectedRoute: "pool-yacht-service",
          selectedTravelChoice: "tease-secret",
          pendingEffects: {
            cash: 0,
            fans: 25,
            heat: 8,
            attraction: 4,
            trust: 2,
            mood: 0,
          },
          currentReaction: "annoyed",
          startedAt: 4,
        },
        lastDecision: "Erst prüfen, dann feiern.",
      }),
    );
  });
  await page.reload();

  const annoyed = page.locator('.character-art[data-reaction="annoyed"]');
  await expect(annoyed).toBeVisible();
  await expect(annoyed).toHaveAttribute("src", /lola-annoyed\.png$/);
  await page.screenshot({ path: path.join(screenshots, "07-negative-reaction.png") });
});
