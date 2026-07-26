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
    character?: string;
  },
): Promise<void> {
  const character = run.character ?? "Lola";
  await page
    .getByRole("button", { name: new RegExp(`${character} am ${run.location} treffen`) })
    .click();
  await page.locator(`[data-choice-id="${run.pickup}"]`).click();
  await expect(page.getByRole("heading", { name: "Welche Route passt zum Auftrag?" })).toBeVisible();
  await page.getByTestId(`route-${run.route}`).click();
  await finishTravelEvent(page, run.eventTitle, run.eventChoice);
  await page.locator(`[data-choice-id="${run.encounter}"]`).click();
  await expect(page.getByText("AUFTRAG ABGESCHLOSSEN")).toBeVisible();
  await page.getByRole("button", { name: `${character}s Nachricht lesen` }).click();
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

test("smartphone is a near-fullscreen dismissible overlay over the live island", async ({ page }, testInfo) => {
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
  if (testInfo.project.name === "desktop") {
    expect(dimensions.height).toBeLessThan(dimensions.viewportHeight * 0.9);
  } else {
    expect(dimensions.height).toBeGreaterThan(dimensions.viewportHeight * 0.9);
    expect(dimensions.height).toBeLessThanOrEqual(dimensions.viewportHeight);
  }

  await page.getByRole("button", { name: "Smartphone schließen" }).click();
  await expect(phone).toBeHidden();
  await expect(page.locator(".world-canvas")).toBeVisible();
});

test("mobile fullscreen control calls the native fullscreen surface", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "Canonical fullscreen control runs once.");
  await page.evaluate(() => {
    Object.defineProperty(document, "fullscreenEnabled", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: async () => {
        document.documentElement.dataset.fullscreenRequested = "true";
      },
    });
  });

  await page.getByRole("button", { name: "Vollbild starten" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-fullscreen-requested", "true");
});

test("island landmarks open local exploration and persist discoveries", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "Canonical exploration flow runs once.");
  await expect(page.locator('.world-host[data-ready="true"]')).toBeVisible();

  await page.getByRole("button", { name: "Pool erkunden" }).click();
  await expect(page.getByRole("dialog", { name: "Pool" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Blick dich um · 1 Spur" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Das Gespräch am Beckenrand untersuchen" }),
  ).toBeVisible();
  const locationLayout = await page.evaluate(() => {
    const image = document.querySelector(".local-location-background")?.getBoundingClientRect();
    const panel = document.querySelector(".local-location-panel")?.getBoundingClientRect();
    return {
      imageHeight: image?.height ?? 0,
      panelTop: panel?.top ?? 0,
      viewportHeight: window.innerHeight,
    };
  });
  expect(locationLayout.imageHeight).toBeGreaterThan(locationLayout.viewportHeight * 0.9);
  expect(locationLayout.panelTop).toBeGreaterThan(locationLayout.viewportHeight * 0.8);
  await page
    .getByRole("button", { name: "Das Gespräch am Beckenrand untersuchen" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Das Gespräch am Beckenrand" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Unauffällig zuhören/ }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Pool" })
      .getByText("Du kennst jetzt das ruhige Zeitfenster"),
  ).toBeVisible();
  await expect(
    page.getByText("Im Gedächtnis des Runners gespeichert"),
  ).toBeVisible();
  await expect(page.locator(".hud-metric.fans .hud-metric__value")).toHaveText("40");

  await page.getByRole("button", { name: "‹ Inselkarte" }).click();
  await page.reload();
  await expect(page.locator('.world-host[data-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Pool erkunden" }).click();
  await expect(
    page.getByRole("button", {
      name: "Das Gespräch am Beckenrand erneut ansehen",
    }),
  ).toBeVisible();
});

test("runner home and Midnight Wing support a gated guest story lifecycle", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "Canonical Midnight Wing flow runs once.");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "island-runner-save",
      JSON.stringify({
        version: 5,
        resources: { cash: 20_000, fans: 1_200, heat: 4 },
        relationships: {
          lola: { attraction: 42, trust: 45, mood: 58 },
          mia: { attraction: 18, trust: 30, mood: 54 },
        },
        property: { tier: "bungalow", tutorialSeen: true },
        social: {
          lolaMia: { friendship: 45, tension: 10 },
          memories: [],
        },
        exploration: {
          visitedLocations: ["villa"],
          discoveries: ["hidden_foundation_plan"],
          completedActions: ["villa-foundation-plan"],
        },
        secretWing: {
          level: 0,
          tutorialSeen: false,
          guests: {
            lola: { status: "none", completedScenes: [] },
            mia: { status: "none", completedScenes: [] },
          },
        },
        flags: [
          "onboarding_complete",
          "lola_cocktail_complete",
          "lola_ice_complete",
          "lola_playlist_complete",
          "lola_slice_finished",
          "midnight_foundation_known",
        ],
        completedMissions: ["lola-cocktail-01", "lola-ice-02", "lola-playlist-03"],
        missionStyles: {},
        messages: [
          { id: "lola-intro", read: true, unlockedAt: 1, replyId: "intro-reliable" },
          { id: "lola-after-cocktail", read: true, unlockedAt: 2, replyId: "ice-careful" },
          { id: "lola-after-ice", read: true, unlockedAt: 3, replyId: "playlist-discreet" },
          { id: "lola-after-playlist", read: true, unlockedAt: 4, replyId: "ending-loyal" },
        ],
        activeMission: null,
        lastDecision: "Fundamentplan gefunden.",
        settings: { sound: false, haptics: false },
      }),
    );
  });
  await page.reload();
  await expect(page.locator('.world-host[data-ready="true"]')).toBeVisible();

  await page
    .getByRole("button", { name: "Runner-Home auf Inselkarte öffnen: Runner-Bungalow" })
    .click();
  await expect(page.getByRole("dialog", { name: "Runner-Bungalow" })).toBeVisible();
  const homeLayout = await page.evaluate(() => {
    const visual = document.querySelector(".home-hub-visual")?.getBoundingClientRect();
    const panel = document.querySelector(".home-hub-panel")?.getBoundingClientRect();
    return {
      visualWidth: visual?.width ?? 0,
      visualHeight: visual?.height ?? 0,
      panelTop: panel?.top ?? 0,
      viewportHeight: window.innerHeight,
    };
  });
  expect(homeLayout.visualHeight).toBeGreaterThan(homeLayout.visualWidth * 0.95);
  expect(homeLayout.panelTop).toBeGreaterThan(homeLayout.viewportHeight * 0.38);
  await page.getByRole("button", { name: "Geheimen Bereich prüfen" }).click();
  await expect(page.getByRole("dialog", { name: "Versiegelter Hohlraum" })).toBeVisible();
  await expect(page.getByText("Hinter der Felswand liegt mehr als nur Fundament")).toBeVisible();
  await expect(page.locator(".consent-notice")).toHaveCount(0);

  await page.getByRole("button", { name: "Hidden Lounge ausbauen" }).click();
  await expect(page.getByRole("dialog", { name: "Hidden Lounge" })).toBeVisible();
  await expect(page.locator(".hud-metric.cash .hud-metric__value")).toHaveText("15.500");
  const lolaGuest = page.locator(".secret-guest-card").filter({ hasText: "Lola" });
  await lolaGuest.getByRole("button", { name: "Privat einladen" }).click();
  await expect(page.getByText("Hat die Einladung angenommen")).toBeVisible();
  await page.getByRole("button", { name: "Grenzen besprechen" }).click();
  await expect(page.getByRole("button", { name: "✓ Grenzen besprechen" })).toBeDisabled();
  await page.getByRole("button", { name: "Aufenthalt abschließen" }).click();
  await expect(page.getByText("Vertrauen 52%")).toBeVisible();

  await page.reload();
  await expect(page.locator('.world-host[data-ready="true"]')).toBeVisible();
  await page
    .getByRole("button", { name: "Runner-Home auf Inselkarte öffnen: Runner-Bungalow" })
    .click();
  await page.getByRole("button", { name: "Midnight Wing betreten" }).click();
  await expect(page.getByRole("dialog", { name: "Hidden Lounge" })).toBeVisible();
  await expect(
    page
      .locator(".secret-guest-card")
      .filter({ hasText: "Lola" })
      .getByRole("button", { name: "Privat einladen" }),
  ).toBeVisible();
});

test("pool social scene places characters in the world and persists a direct interaction", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "Canonical pool social scene runs once.");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "island-runner-save",
      JSON.stringify({
        version: 5,
        resources: { cash: 1_200, fans: 1_050, heat: 6 },
        relationships: {
          lola: { attraction: 35, trust: 46, mood: 54 },
          mia: { attraction: 12, trust: 24, mood: 52 },
        },
        property: { tier: "bungalow", tutorialSeen: true },
        social: {
          lolaMia: { friendship: 45, tension: 10 },
          memories: [],
        },
        exploration: {
          visitedLocations: [],
          discoveries: [],
          completedActions: [],
        },
        secretWing: {
          level: 0,
          tutorialSeen: false,
          guests: {
            lola: { status: "none", completedScenes: [] },
            mia: { status: "none", completedScenes: [] },
          },
        },
        flags: [
          "onboarding_complete",
          "lola_cocktail_complete",
          "lola_ice_complete",
          "lola_playlist_complete",
          "lola_slice_finished",
          "mia_documents_complete",
        ],
        completedMissions: [
          "lola-cocktail-01",
          "lola-ice-02",
          "lola-playlist-03",
          "mia-documents-01",
        ],
        missionStyles: {},
        messages: [
          { id: "lola-intro", read: true, unlockedAt: 1, replyId: "intro-reliable" },
          { id: "lola-after-cocktail", read: true, unlockedAt: 2, replyId: "ice-careful" },
          { id: "lola-after-ice", read: true, unlockedAt: 3, replyId: "playlist-discreet" },
          { id: "lola-after-playlist", read: true, unlockedAt: 4, replyId: "ending-loyal" },
          { id: "mia-intro", read: true, unlockedAt: 5, replyId: "mia-intro-careful" },
          { id: "mia-after-documents", read: false, unlockedAt: 6 },
        ],
        activeMission: null,
        lastDecision: "Mias Dokumente wurden übergeben.",
        settings: { sound: false, haptics: false },
      }),
    );
  });
  await page.reload();

  await page.getByRole("button", { name: "Pool erkunden" }).click();
  await expect(page.getByRole("dialog", { name: "POOL · SOCIAL SCENE" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lola am Pool ansprechen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mia am Pool ansprechen" })).toBeVisible();
  const poolLolaImage = page.locator(
    '[data-character-id="lola"] .pool-scene-character__image',
  );
  await expect(poolLolaImage).toHaveAttribute(
    "src",
    /lola-pool-neutral\.png$/,
  );
  await page.screenshot({ path: path.join(screenshots, "14-pool-social-scene.png") });

  await page.getByRole("button", { name: "Lola am Pool ansprechen" }).click();
  await page.locator('[data-pool-interaction-id="pool-lola-breathe"]').click();
  await expect(page.getByText("Ihr lasst das Geschäft für einen Moment ruhen")).toBeVisible();
  await expect(poolLolaImage).toHaveAttribute(
    "src",
    /lola-pool-positive\.png$/,
  );
  await expect(page.locator(".hud-metric.fans .hud-metric__value")).toHaveText("1.050");

  await page.getByRole("button", { name: "‹ Inselkarte" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Pool erkunden" }).click();
  await page.getByRole("button", { name: "Lola am Pool ansprechen" }).click();
  await expect(page.locator('[data-pool-interaction-id="pool-lola-breathe"]')).toHaveCount(0);
});

test("all message stages of one contact form a single continuous chat", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "Canonical grouped-chat check runs once.");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "island-runner-save",
      JSON.stringify({
        version: 4,
        resources: { cash: 7_400, fans: 990, heat: 3 },
        relationships: {
          lola: { attraction: 38, trust: 52, mood: 56 },
          mia: { attraction: 4, trust: 8, mood: 50 },
        },
        property: { tier: "bungalow", tutorialSeen: true },
        social: {
          lolaMia: { friendship: 45, tension: 10 },
          memories: [],
        },
        flags: [
          "onboarding_complete",
          "lola_cocktail_complete",
          "lola_ice_complete",
          "lola_playlist_complete",
          "lola_slice_finished",
        ],
        completedMissions: ["lola-cocktail-01", "lola-ice-02", "lola-playlist-03"],
        missionStyles: {},
        messages: [
          { id: "lola-intro", read: true, unlockedAt: 1, replyId: "intro-reliable" },
          { id: "lola-after-cocktail", read: true, unlockedAt: 2, replyId: "ice-careful" },
          { id: "lola-after-ice", read: true, unlockedAt: 3, replyId: "playlist-discreet" },
          { id: "lola-after-playlist", read: true, unlockedAt: 4, replyId: "ending-loyal" },
          { id: "mia-intro", read: false, unlockedAt: 5 },
        ],
        activeMission: null,
        lastDecision: "Dann bleibe ich dein Runner.",
        settings: { sound: false, haptics: false },
      }),
    );
  });
  await page.reload();
  await page.locator(".phone-button").click();

  const phone = page.getByTestId("phone-overlay");
  await expect(phone.locator(".message-row")).toHaveCount(2);
  await expect(phone.locator('[data-character-id="lola"]')).toHaveCount(1);
  await expect(phone.locator('[data-character-id="mia"]')).toHaveCount(1);

  await phone.locator('[data-character-id="lola"]').click();
  await expect(phone.locator(".chat-header strong")).toHaveText("Lola");
  const thread = phone.locator(".chat-thread");
  await expect(thread).toContainText("Du bist doch der neue Runner, oder?");
  await expect(thread).toContainText("Okay, das war besser als erwartet.");
  await expect(thread).toContainText("Das Timing war fast verdächtig gut.");
  await expect(thread).toContainText("Du bist jetzt offiziell mein Lieblings-Runner.");
  await expect(thread.locator(".chat-bubble--player")).toHaveCount(4);
  await expect(phone.locator(".chat-header").getByText("4 Nachrichtenetappen")).toBeVisible();
  await expect(thread.locator(".chat-stage")).toHaveCount(4);
  await expect(thread.locator(".chat-stage.is-complete")).toHaveCount(3);
  const currentStage = thread.locator('[data-chat-current="true"]');
  await expect(currentStage).toHaveCount(1);
  await expect(currentStage).toBeVisible();
  await expect(currentStage.getByText("AKTUELL · ABGESCHLOSSEN")).toBeVisible();
  await expect(currentStage.getByText("4/4")).toBeVisible();
});

test("property upgrade is visible, consequential and survives reload", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "Canonical property flow runs at 390 × 844.");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "island-runner-save",
      JSON.stringify({
        version: 3,
        resources: { cash: 2_500, fans: 250, heat: 5 },
        relationships: { lola: { attraction: 20, trust: 24, mood: 56 } },
        property: { tier: "shack", tutorialSeen: false },
        flags: ["onboarding_complete", "lola_cocktail_complete"],
        completedMissions: ["lola-cocktail-01"],
        missionStyles: { "lola-cocktail-01": "Verlässlich" },
        messages: [
          { id: "lola-intro", read: true, unlockedAt: 1, replyId: "intro-reliable" },
          { id: "lola-after-cocktail", read: true, unlockedAt: 2, replyId: "ice-careful" },
        ],
        activeMission: null,
        lastDecision: "Ich fahre zuverlässig.",
        settings: { sound: false, haptics: false },
      }),
    );
  });
  await page.reload();

  await page.getByRole("button", { name: "Zuhause öffnen: Strandhütte" }).click();
  await expect(page.getByRole("dialog", { name: "Strandhütte" })).toBeVisible();
  await expect(page.getByText("Vertrauen bleibt eine Frage deiner Entscheidungen.")).toBeVisible();

  await page.getByRole("button", { name: "Runner-Bungalow für $ 2.000 bauen" }).click();
  await expect(page.getByText("AUSBAU ABGESCHLOSSEN")).toBeVisible();
  await expect(page.getByText("Das Anwesen macht Eindruck. Vertrauen verdienst du weiterhin")).toBeVisible();
  await expect(page.locator(".hud-metric.cash .hud-metric__value")).toHaveText("500");
  await page.screenshot({ path: path.join(screenshots, "12-property-bungalow.png") });

  await page.getByRole("button", { name: "Neues Anwesen ansehen" }).click();
  await expect(page.getByRole("dialog", { name: "Runner-Bungalow" })).toBeVisible();
  await page.getByRole("button", { name: "Anwesen schließen" }).click();
  await page.reload();

  await expect(page.getByRole("button", { name: "Zuhause öffnen: Runner-Bungalow" })).toBeVisible();
  await expect(page.locator(".hud-metric.cash .hud-metric__value")).toHaveText("500");
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

  await expect(page.getByRole("heading", { name: "Mia wartet auf dich." })).toBeVisible();
  await expect(page.getByText("Lola sagt, du kannst diskret sein.")).toBeVisible();
  await expect(page.locator('.world-host[data-renderer="shared"][data-ready="true"]')).toBeVisible();
  await expect(page.locator(".world-canvas")).not.toHaveAttribute("data-context-lost", "true");
});

test("Mia mission creates private social memory and a playable bungalow scene", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "Canonical Mia slice runs once.");
  test.setTimeout(60_000);
  await page.evaluate(() => {
    window.localStorage.setItem(
      "island-runner-save",
      JSON.stringify({
        version: 4,
        resources: { cash: 1_000, fans: 900, heat: 8 },
        relationships: {
          lola: { attraction: 35, trust: 46, mood: 54 },
          mia: { attraction: 4, trust: 8, mood: 50 },
        },
        property: { tier: "bungalow", tutorialSeen: true },
        social: {
          lolaMia: { friendship: 45, tension: 10 },
          memories: [],
        },
        flags: [
          "onboarding_complete",
          "lola_cocktail_complete",
          "lola_ice_confirmed",
          "lola_ice_complete",
          "lola_playlist_confirmed",
          "lola_playlist_complete",
          "lola_slice_finished",
          "ending_loyal",
        ],
        completedMissions: ["lola-cocktail-01", "lola-ice-02", "lola-playlist-03"],
        missionStyles: {
          "lola-cocktail-01": "Verlässlich",
          "lola-ice-02": "Verlässlich",
          "lola-playlist-03": "Verlässlich",
        },
        messages: [
          { id: "lola-intro", read: true, unlockedAt: 1, replyId: "intro-reliable" },
          { id: "lola-after-cocktail", read: true, unlockedAt: 2, replyId: "ice-careful" },
          { id: "lola-after-ice", read: true, unlockedAt: 3, replyId: "playlist-discreet" },
          { id: "lola-after-playlist", read: true, unlockedAt: 4, replyId: "ending-loyal" },
          { id: "mia-intro", read: false, unlockedAt: 5 },
        ],
        activeMission: null,
        lastDecision: "Dann bleibe ich dein Runner.",
        settings: { sound: false, haptics: false },
      }),
    );
  });
  await page.reload();

  await page.getByRole("button", { name: "Smartphone öffnen", exact: true }).click();
  await expect(
    page.getByTestId("phone-overlay").getByText("Lola sagt, du kannst diskret sein."),
  ).toBeVisible();
  await page.locator('[data-reply-id="mia-intro-careful"]').click();
  await page.getByRole("button", { name: /Smartphone schließen · Villa/ }).click();

  await completeMission(page, {
    character: "Mia",
    location: "Villa",
    pickup: "mia-sealed-case",
    route: "villa-club-terraces",
    eventTitle: "Lolas Anruf",
    eventChoice: "mia-call-boundary",
    encounter: "mia-offer-home",
    reply: "mia-home-private",
  });

  await expect(page.getByRole("heading", { name: "Mia ist unterwegs." })).toBeVisible();
  await page.getByRole("button", { name: "Mia im Anwesen treffen" }).click();
  await expect(page.getByRole("heading", { name: "Mia im Runner-Bungalow" })).toBeVisible();
  await page.locator('[data-choice-id="mia-home-closer"]').click();
  await expect(page.getByText("Ein privater Abend")).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, "13-mia-private-memory.png") });
  await page.getByRole("button", { name: "Soziales Gedächtnis ansehen" }).click();

  const phone = page.getByTestId("phone-overlay");
  await expect(phone.getByRole("heading", { name: "Mia", exact: true })).toBeVisible();
  await expect(
    phone.getByText("Mia und du seid euch im Bungalow nähergekommen."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lola" }).click();
  await expect(
    phone.getByText("Mia und du seid euch im Bungalow nähergekommen."),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Smartphone schließen" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Die Insel wird persönlich." })).toBeVisible();
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
