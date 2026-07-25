import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const screenshots = path.resolve("docs/screenshots");

async function finishTravelEvent(page: Page, eventTitle: string, choiceId: string): Promise<void> {
  await expect(page.getByRole("heading", { name: eventTitle })).toBeVisible({ timeout: 8_000 });
  const pausedAt = await page.locator(".travel-timer").textContent();
  await page.waitForTimeout(1_100);
  await expect(page.locator(".travel-timer")).toHaveText(pausedAt ?? "");
  await page.locator(`[data-choice-id="${choiceId}"]`).click();
  await expect(page.getByText("EREIGNIS GELÖST")).toBeVisible();
  await page.getByRole("button", { name: "Rest der Fahrt überspringen" }).click();
}

async function completeMission(
  page: Page,
  run: {
    location: string;
    pickup: string;
    route: string;
    eventTitle: string;
    eventChoice: string;
    encounter: string;
    reply: string;
  },
): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`Lola am ${run.location} treffen`) }).click();
  await page.locator(`[data-choice-id="${run.pickup}"]`).click();
  await expect(page.getByRole("heading", { name: "Welche Route passt zum Auftrag?" })).toBeVisible();
  await page.getByTestId(`route-${run.route}`).click();
  await finishTravelEvent(page, run.eventTitle, run.eventChoice);
  await page.locator(`[data-choice-id="${run.encounter}"]`).click();
  await expect(page.getByText("AUFTRAG ABGESCHLOSSEN")).toBeVisible();
  await page.getByRole("button", { name: "Lolas Nachricht lesen" }).click();
  await page.locator(`[data-reply-id="${run.reply}"]`).click();
  await page.locator(".chat-continue").click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { name: "wh0re" })).toBeVisible();
});

test("hub fits every supported viewport without overflow and uses accessible touch targets", async ({ page }) => {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    minimumTarget: Math.min(
      ...[...document.querySelectorAll("button")].map((control) =>
        Math.min(control.getBoundingClientRect().width, control.getBoundingClientRect().height),
      ),
    ),
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight);
  expect(metrics.minimumTarget).toBeGreaterThanOrEqual(44);
});

test("smartphone is a dismissible overlay over the live island, not the game shell", async ({ page }) => {
  const canvas = page.locator(".world-canvas");
  await expect(canvas).toBeVisible();
  await page.locator(".phone-cta").click();

  const phone = page.getByRole("dialog", { name: "Smartphone" });
  await expect(phone).toBeVisible();
  await expect(canvas).toBeVisible();
  await expect(page.getByRole("heading", { name: "wh0re" })).toBeVisible();
  await expect(page.locator(".bottom-nav")).toHaveCount(0);

  const dimensions = await phone.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, viewportHeight: window.innerHeight };
  });
  expect(dimensions.height).toBeLessThan(dimensions.viewportHeight * 0.9);

  await page.getByRole("button", { name: "Smartphone schließen" }).click();
  await expect(phone).toBeHidden();
  await expect(page.locator(".world-canvas")).toBeVisible();
});

test("onboarding, paused travel event, outcome and message reply form one causal loop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "Canonical screenshot flow runs at 390 × 844.");
  test.setTimeout(60_000);

  await expect(page.locator('.world-host[data-ready="true"]')).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, "01-onboarding-hub.png") });

  await page.locator(".phone-cta").click();
  await expect(page.getByText("Du bist doch der neue Runner, oder?")).toBeVisible();
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(screenshots, "02-phone-onboarding.png") });

  await page.locator('[data-reply-id="intro-reliable"]').click();
  await expect(page.getByText("Pool. Pinke Lichter, schwer zu übersehen.")).toBeVisible();
  await expect(page.getByText("◆ Vertrauen +3")).toBeVisible();
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(screenshots, "03-phone-reply.png") });

  await page.getByRole("button", { name: /Smartphone schließen · Pool/ }).click();
  await expect(page.getByRole("heading", { name: "Cocktail-Kurier" })).toBeVisible();
  await page.waitForTimeout(2_900);
  await page.screenshot({ path: path.join(screenshots, "04-world-objective.png") });

  await page.getByRole("button", { name: "Lola am Pool treffen" }).click();
  await expect(page.getByText("Da bist du ja. Was hast du für mich?")).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, "05-pickup.png") });
  await page.locator('[data-choice-id="cocktail-ready"]').click();

  await expect(page.getByRole("heading", { name: "Welche Route passt zum Auftrag?" })).toBeVisible();
  await expect(page.getByText("Heat −5 · Lola genießt die Aussicht")).toBeVisible();
  await expect(page.getByText("$ +300 · Fans +120 · nur 6 Sekunden")).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, "06-route-tradeoff.png") });
  await page.getByTestId("route-pool-yacht-coast").click();

  await expect(page.getByRole("heading", { name: "Kontrolle voraus" })).toBeVisible({ timeout: 8_000 });
  const timer = await page.locator(".travel-timer").textContent();
  await page.waitForTimeout(1_200);
  await expect(page.locator(".travel-timer")).toHaveText(timer ?? "");
  await expect(page.getByRole("button", { name: "Rest der Fahrt überspringen" })).toBeHidden();
  await page.screenshot({ path: path.join(screenshots, "07-paused-travel-event.png") });
  await page.locator('[data-choice-id="show-pass"]').click();
  await expect(page.getByText("EREIGNIS GELÖST")).toBeVisible();
  await page.getByRole("button", { name: "Rest der Fahrt überspringen" }).click();

  await expect(page.getByText("Die Aussicht war die Extra-Minute wert. Was nun?")).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, "08-arrival.png") });
  await page.locator('[data-choice-id="direct-return"]').click();
  await expect(page.getByText("AUFTRAG ABGESCHLOSSEN")).toBeVisible();
  await expect(page.getByText("Runner-Stil · Verlässlich")).toBeVisible();
  await expect(page.locator(".hud-metric.cash .hud-metric__value")).toHaveText("2.500");
  await page.screenshot({ path: path.join(screenshots, "09-causal-outcome.png") });

  await page.getByRole("button", { name: "Lolas Nachricht lesen" }).click();
  await expect(page.locator('[data-reply-id="ice-careful"]')).toBeVisible();
  await page.locator('[data-reply-id="ice-careful"]').click();
  await expect(page.getByText("Yacht-Dock, sobald du bereit bist.")).toBeVisible();
  await page.waitForTimeout(2_900);
  await page.screenshot({ path: path.join(screenshots, "10-consequential-message.png") });
  await page.getByRole("button", { name: /Smartphone schließen · Yacht-Dock/ }).click();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Mitternachts-Eis" })).toBeVisible();
  await expect(page.locator(".hud-metric.cash .hud-metric__value")).toHaveText("2.500");
});

test("all three Lola missions and reply gates are playable without a softlock", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "Complete progression flow runs once.");
  test.setTimeout(90_000);

  await page.locator(".phone-cta").click();
  await page.locator('[data-reply-id="intro-reliable"]').click();
  await page.getByRole("button", { name: /Smartphone schließen · Pool/ }).click();

  await completeMission(page, {
    location: "Pool",
    pickup: "cocktail-ready",
    route: "pool-yacht-coast",
    eventTitle: "Kontrolle voraus",
    eventChoice: "show-pass",
    encounter: "direct-return",
    reply: "ice-careful",
  });
  await completeMission(page, {
    location: "Yacht-Dock",
    pickup: "cooler-ready",
    route: "yacht-pool-service",
    eventTitle: "Kühlkette",
    eventChoice: "max-cooling",
    encounter: "check-cooler",
    reply: "playlist-discreet",
  });
  await completeMission(page, {
    location: "Pool",
    pickup: "sealed-pouch",
    route: "pool-yacht-coast",
    eventTitle: "Privatsphäre",
    eventChoice: "eyes-road",
    encounter: "trust-matters",
    reply: "ending-loyal",
  });

  await expect(page.getByRole("heading", { name: "Du bist jetzt Insider." })).toBeVisible();
  await expect(page.getByText(/Runner-Status:/)).toBeVisible();
});

test("reload restores a genuinely different negative reaction", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "Reaction screenshot runs once.");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "island-runner-save",
      JSON.stringify({
        version: 2,
        resources: { cash: 4_300, fans: 510, heat: 38 },
        relationships: { lola: { attraction: 28, trust: 34, mood: 43 } },
        flags: [
          "onboarding_complete",
          "lola_cocktail_complete",
          "lola_ice_confirmed",
          "lola_ice_complete",
          "lola_playlist_confirmed",
        ],
        completedMissions: ["lola-cocktail-01", "lola-ice-02"],
        missionStyles: {
          "lola-cocktail-01": "Verlässlich",
          "lola-ice-02": "Riskant",
        },
        messages: [
          { id: "lola-intro", read: true, unlockedAt: 1, replyId: "intro-reliable" },
          { id: "lola-after-cocktail", read: true, unlockedAt: 2, replyId: "ice-careful" },
          { id: "lola-after-ice", read: true, unlockedAt: 3, replyId: "playlist-discreet" },
        ],
        activeMission: {
          missionId: "lola-playlist-03",
          phase: "encounter",
          selectedPickupChoice: "sealed-pouch",
          selectedRoute: "pool-yacht-service",
          selectedTravelChoice: "tease-secret",
          pendingEffects: {
            cash: 300,
            fans: 120,
            heat: 11,
            attraction: 2,
            trust: 1,
            mood: 4,
          },
          effectLog: [
            { source: "pickup", label: "Es bleibt versiegelt bis zur Übergabe.", effects: { trust: 7, mood: 2 } },
            { source: "route", label: "Serviceweg", effects: { cash: 300, fans: 120, heat: 8, mood: 2, trust: -2 } },
            { source: "travel", label: "Dein Geheimnis klingt nach guter Musik.", effects: { trust: -4, attraction: 2, heat: 3 } },
          ],
          currentReaction: "annoyed",
          startedAt: 4,
        },
        lastDecision: "Erst prüfen, dann feiern.",
        settings: { sound: false, haptics: false },
      }),
    );
  });
  await page.reload();

  const annoyed = page.locator('.character-art[data-reaction="annoyed"]');
  await expect(annoyed).toBeVisible();
  await expect(annoyed).toHaveAttribute("src", /lola-annoyed\.png$/);
  await page.screenshot({ path: path.join(screenshots, "11-negative-reaction.png") });
});
